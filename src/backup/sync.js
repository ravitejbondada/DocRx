// ============================================================
// DocRx — Local & Google Drive DB Merge Coordinator
// ============================================================
import { getDB, persistDB } from '../db/index.js';
import { findBackupFile, downloadBackupFile, uploadBackupFile, getSavedToken } from './drive.js';

const SYNC_TABLES = [
  'patients',
  'visits',
  'prescriptions',
  'diagnostic_tests',
  'pharmacies',
  'diagnostic_centers'
];

// Load sqlModule dynamically for merge DB setup
async function loadSQL() {
  const sqlModule = await import('sql.js');
  const initSqlJs = sqlModule.default ?? sqlModule;
  return await initSqlJs({
    locateFile: () => `${import.meta.env.BASE_URL}sql-wasm.wasm`,
  });
}

function getTableRows(db, tableName) {
  try {
    const res = db.exec(`SELECT * FROM ${tableName}`);
    if (!res.length) return [];
    const columns = res[0].columns;
    return res[0].values.map(row => {
      const obj = {};
      columns.forEach((col, i) => { obj[col] = row[i]; });
      return obj;
    });
  } catch (e) {
    console.warn(`Table check error for ${tableName}:`, e);
    return [];
  }
}

/**
 * Perform sync cycle:
 * 1. Locate backup on Google Drive.
 * 2. If none exists, upload local DB.
 * 3. If exists, download cloud DB, merge, persist local, and upload merged DB.
 */
export async function syncWithGoogleDrive(onStatusCallback) {
  const status = (msg) => {
    onStatusCallback?.(msg);
    if (window.__updateSyncStatus) window.__updateSyncStatus(msg);
  };
  const token = getSavedToken();
  if (!token) {
    status({ type: 'error', message: 'Google authentication required.' });
    return false;
  }

  status({ type: 'syncing', message: 'Connecting to Google Drive...' });
  const localDb = getDB();
  let reportsIngested = 0;

  try {
    // Ingest any reports first, which might update the database
    reportsIngested = await ingestIncomingReports(token, localDb);

    const cloudFile = await findBackupFile(token);

    if (!cloudFile) {
      status({ type: 'syncing', message: 'Creating new backup on Google Drive...' });
      
      // Sync local attachments to cloud first
      await syncAttachments(token, localDb, status);
      
      const localBinary = localDb.export();
      await uploadBackupFile(token, localBinary, null);
      
      const now = new Date().toLocaleString('en-IN');
      await uploadPendingTestsQueue(token, localDb);
      localDb.run("UPDATE settings SET last_sync_timestamp=? WHERE id=1", [now]);
      persistDB();
      
      status({ type: 'success', message: `Sync complete. Backed up to Google Drive.`, lastSync: now });
      return true;
    }

    status({ type: 'syncing', message: 'Downloading backup from cloud...' });
    const cloudBuffer = await downloadBackupFile(token, cloudFile.id);
    
    status({ type: 'syncing', message: 'Merging database records...' });
    const SQL = await loadSQL();
    const cloudDb = new SQL.Database(new Uint8Array(cloudBuffer));

    // Disable constraints during merging
    localDb.run("PRAGMA foreign_keys = OFF");
    cloudDb.run("PRAGMA foreign_keys = OFF");

    let isLocalModified = false;
    let isCloudModified = false;

    for (const tableName of SYNC_TABLES) {
      const localRows = getTableRows(localDb, tableName);
      const cloudRows = getTableRows(cloudDb, tableName);

      const localMap = new Map(localRows.map(r => [r.id, r]));
      const cloudMap = new Map(cloudRows.map(r => [r.id, r]));

      const allIds = new Set([...localMap.keys(), ...cloudMap.keys()]);
      
      // Get column names info
      const colsResult = localDb.exec(`PRAGMA table_info(${tableName})`);
      if (!colsResult.length) continue;
      const columns = colsResult[0].values.map(r => r[1]).filter(c => c !== 'id');

      for (const id of allIds) {
        const local = localMap.get(id);
        const cloud = cloudMap.get(id);

        if (local && cloud) {
          const localTime = new Date(local.updated_at || 0).getTime();
          const cloudTime = new Date(cloud.updated_at || 0).getTime();

          if (cloudTime > localTime) {
            // Cloud wins: Update local
            const setClause = columns.map(c => `${c} = ?`).join(', ');
            const params = columns.map(c => cloud[c]);
            params.push(id);
            localDb.run(`UPDATE ${tableName} SET ${setClause} WHERE id = ?`, params);
            isLocalModified = true;
          } else if (localTime > cloudTime) {
            // Local wins: Update cloud database copy
            const setClause = columns.map(c => `${c} = ?`).join(', ');
            const params = columns.map(c => local[c]);
            params.push(id);
            cloudDb.run(`UPDATE ${tableName} SET ${setClause} WHERE id = ?`, params);
            isCloudModified = true;
          }
        } else if (cloud) {
          // Cloud only: Insert locally
          const allCols = ['id', ...columns];
          const placeholders = allCols.map(() => '?').join(', ');
          const params = allCols.map(c => cloud[c]);
          localDb.run(`INSERT INTO ${tableName} (${allCols.join(', ')}) VALUES (${placeholders})`, params);
          isLocalModified = true;
        } else if (local) {
          // Local only: Insert into cloud database copy
          const allCols = ['id', ...columns];
          const placeholders = allCols.map(() => '?').join(', ');
          const params = allCols.map(c => local[c]);
          cloudDb.run(`INSERT INTO ${tableName} (${allCols.join(', ')}) VALUES (${placeholders})`, params);
          isCloudModified = true;
        }
      }
    }

    // Re-enable constraints
    localDb.run("PRAGMA foreign_keys = ON");
    cloudDb.run("PRAGMA foreign_keys = ON");

    // Sync attachments
    await syncAttachments(token, localDb, status);

    const now = new Date().toLocaleString('en-IN');
    
    if (isLocalModified || isCloudModified) {
      status({ type: 'syncing', message: 'Saving and uploading consolidated database...' });
      
      const mergedBinary = isCloudModified ? cloudDb.export() : localDb.export();
      
      // If cloud got local changes, we upload the merged cloud DB.
      // If local only got cloud changes, we upload the local DB.
      await uploadBackupFile(token, mergedBinary, cloudFile);
      
      // If local database was modified, write those changes to the IndexedDB loader file.
      if (isLocalModified) {
        // Also import the updated database instance to local memory
        const currentBuf = cloudDb.export();
        // Overwrite active local DB binary configuration
        await import('../db/index.js').then(({ importDBBinary }) => importDBBinary(currentBuf));
        import('../components/Toast.js').then(({ toast }) => {
          toast.success('Sync complete. Page refreshed with new data.');
          setTimeout(() => window.location.reload(), 1500);
        });
      }
    }

    // Update settings timestamp
    await uploadPendingTestsQueue(token, localDb);
    localDb.run("UPDATE settings SET last_sync_timestamp=? WHERE id=1", [now]);
    persistDB();

    if (reportsIngested > 0 && !isLocalModified) {
      import('../components/Toast.js').then(({ toast }) => {
        toast.success('Sync complete. Ingested lab reports loaded.');
        setTimeout(() => window.location.reload(), 1500);
      });
    } else if (!isLocalModified) {
      status({ type: 'success', message: 'Consolidated synchronization complete!', lastSync: now });
    }
    return true;
  } catch (err) {
    console.error('DocRx Sync Error:', err);
    if (err.message === 'VERSION_CONFLICT') {
      status({ type: 'syncing', message: 'Mid-sync conflict detected. Re-evaluating merge...' });
      return await syncWithGoogleDrive(onStatusCallback); // Retry
    }
    status({ type: 'error', message: `Sync failed: ${err.message}` });
    return false;
  }
}

let syncTimeout = null;

export function triggerBackgroundSyncDebounced() {
  let settings = null;
  try {
    const db = getDB();
    const res = db.exec("SELECT google_sync_enabled FROM settings WHERE id=1");
    if (res.length && res[0].values.length) {
      settings = { google_sync_enabled: res[0].values[0][0] };
    }
  } catch (e) {
    return;
  }

  if (!settings?.google_sync_enabled) return;

  const path = window.location.hash || '';
  if (path.includes('/visit/new') || (path.includes('/visit/') && path.includes('/edit')) || path.includes('/patients/new')) {
    return;
  }

  clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    console.log('DocRx: Auto-triggering background sync...');
    await syncWithGoogleDrive();
  }, 8000);
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('DocRx: Internet connection regained. Scheduling sync...');
    triggerBackgroundSyncDebounced();
  });
}

// ── Ingestion & Sync Helpers for Attachments ──────────────────

async function ingestIncomingReports(token, db) {
  try {
    const { listIncomingReports, downloadBackupFile, deleteReportFile } = await import('./drive.js');
    const { get, set } = await import('idb-keyval');
    const { PDFDocument } = await import('pdf-lib');
    
    const files = await listIncomingReports(token);
    if (!files.length) return 0;
    
    let processedCount = 0;
    
    for (const file of files) {
      // Filename format: 
      // Old: incoming_report_[PatientCode]_[Phone]_[Timestamp].pdf
      // New: incoming_report_[PatientCode]_[Phone]_[VisitId]_[TestIds]_[Timestamp].pdf
      const nameWithoutExt = file.name.substring(0, file.name.length - 4); // Remove .pdf
      const parts = nameWithoutExt.split('_');
      if (parts.length < 5) continue;
      
      const patientCode = parts[2];
      const phone = parts[3];
      
      let visitId = null;
      let testIdsStr = '';
      if (parts.length === 6) {
        visitId = parts[4];
      } else if (parts.length >= 7) {
        visitId = parts[4];
        testIdsStr = parts[5];
      }
      
      // Look up patient in local DB
      const patientResult = db.exec(`SELECT id, phone, full_name FROM patients WHERE patient_code = ? AND deleted = 0`, [patientCode]);
      if (!patientResult.length || !patientResult[0].values.length) {
        console.warn(`DocRx Ingest: Patient code ${patientCode} not found or deleted.`);
        continue;
      }
      
      const [patientId, dbPhone, fullName] = patientResult[0].values[0];
      
      // Verify phone number matching (digit-only comparison, matching last 10 digits for country-code resilience)
      const cleanDbPhone = String(dbPhone).replace(/\D/g, '');
      const cleanFilePhone = String(phone).replace(/\D/g, '');
      const matchDb = cleanDbPhone.length >= 10 ? cleanDbPhone.slice(-10) : cleanDbPhone;
      const matchFile = cleanFilePhone.length >= 10 ? cleanFilePhone.slice(-10) : cleanFilePhone;
      if (matchDb !== matchFile) {
        console.warn(`DocRx Ingest: Phone mismatch for ${patientCode}. DB: ${cleanDbPhone}, File: ${cleanFilePhone}`);
        continue;
      }
      
      // Download file as arrayBuffer
      const cloudBuffer = await downloadBackupFile(token, file.id);
      
      // Find matching visit
      let visitResult = null;
      if (visitId && visitId !== 'manual') {
        visitResult = db.exec(`SELECT id, attachment_idb_key FROM visits WHERE id = ? AND deleted = 0`, [visitId]);
      }
      if (!visitResult || !visitResult.length || !visitResult[0].values.length) {
        visitResult = db.exec(`SELECT id, attachment_idb_key FROM visits WHERE patient_id = ? AND deleted = 0 ORDER BY visit_date DESC, created_at DESC LIMIT 1`, [patientId]);
      }
      
      let matchedVisitId = null;
      let existingKey = null;
      if (visitResult.length && visitResult[0].values.length) {
        [matchedVisitId, existingKey] = visitResult[0].values[0];
      }
      
      let finalFile;
      let shouldCreateNewVisit = false;
      if (existingKey) {
        const existingFile = await get(existingKey);
        if (existingFile && existingFile.type === 'application/pdf') {
          try {
            const existingArrayBuffer = await existingFile.arrayBuffer();
            const pdfDoc = await PDFDocument.load(existingArrayBuffer);
            const newPdfDoc = await PDFDocument.load(cloudBuffer);
            const copiedPages = await pdfDoc.copyPages(newPdfDoc, newPdfDoc.getPageIndices());
            copiedPages.forEach((page) => pdfDoc.addPage(page));
            
            const pdfBytes = await pdfDoc.save();
            finalFile = new File([pdfBytes], 'Combined_Report.pdf', { type: 'application/pdf' });
          } catch (e) {
            console.error("DocRx Ingest: PDF merge error, creating new visit instead", e);
            finalFile = new File([cloudBuffer], 'Combined_Report.pdf', { type: 'application/pdf' });
            shouldCreateNewVisit = true;
          }
        } else {
          // Keep existing non-PDF attachment by forcing a new visit shell
          finalFile = new File([cloudBuffer], 'Combined_Report.pdf', { type: 'application/pdf' });
          shouldCreateNewVisit = true;
        }
      } else {
        finalFile = new File([cloudBuffer], 'Combined_Report.pdf', { type: 'application/pdf' });
      }
      
      const fileKey = 'visit_' + Date.now() + '_' + Math.random().toString(36).substring(7) + '_Combined_Report.pdf';
      await set(fileKey, finalFile);
      
      if (matchedVisitId && !shouldCreateNewVisit) {
        db.run(`UPDATE visits SET attachment_idb_key = ?, updated_at = datetime('now','localtime') WHERE id = ?`, [fileKey, matchedVisitId]);
        visitId = matchedVisitId;
      } else {
        visitId = crypto.randomUUID();
        db.run(`
          INSERT INTO visits (id, patient_id, visit_date, chief_complaint, diagnosis, clinical_notes, visit_type, fee, attachment_idb_key, created_at, updated_at, deleted)
          VALUES (?, ?, date('now','localtime'), ?, ?, ?, 'New', 0, ?, datetime('now','localtime'), datetime('now','localtime'), 0)
        `, [visitId, patientId, 'Diagnostic Lab Report', 'Diagnostic Lab Report', 'Uploaded from Diagnostic Center Lab Portal', fileKey]);
      }
      
      // Update tests uploaded status
      if (visitId) {
        if (testIdsStr && testIdsStr !== 'all') {
          const testIds = testIdsStr.split('+').filter(Boolean);
          for (const tid of testIds) {
            db.run(`UPDATE diagnostic_tests SET uploaded = 1, result_date = date('now','localtime'), updated_at = datetime('now','localtime') WHERE id = ?`, [tid]);
          }
        } else {
          db.run(`UPDATE diagnostic_tests SET uploaded = 1, result_date = date('now','localtime'), updated_at = datetime('now','localtime') WHERE visit_id = ? AND deleted = 0`, [visitId]);
        }
      }
      
      // Delete the file from Google Drive
      await deleteReportFile(token, file.id);
      processedCount++;
      
      import('../components/Toast.js').then(({ toast }) => {
        toast.success(`Imported lab report for ${fullName} (${patientCode}).`);
      });
    }
    
    return processedCount;
  } catch (error) {
    console.error("DocRx Ingest: Error in ingestIncomingReports:", error);
    return 0;
  }
}

async function syncAttachments(token, db, status) {
  try {
    status?.({ type: 'syncing', message: 'Synchronizing attachment files...' });
    const { listAppDataFiles, uploadFileToAppData, downloadBackupFile, deleteFileFromAppData } = await import('./drive.js');
    const { keys, get, set, del } = await import('idb-keyval');
    
    // 1. Get all referenced attachment keys from database
    const visitsRes = db.exec("SELECT DISTINCT attachment_idb_key FROM visits WHERE attachment_idb_key IS NOT NULL AND deleted = 0");
    const referencedKeys = new Set();
    if (visitsRes.length && visitsRes[0].values.length) {
      visitsRes[0].values.forEach(row => {
        if (row[0]) referencedKeys.add(row[0]);
      });
    }
    
    // 2. Get local IndexedDB keys starting with 'visit_'
    const localKeys = (await keys()).filter(k => typeof k === 'string' && k.startsWith('visit_'));
    const localKeySet = new Set(localKeys);
    
    // 3. Get all files in Google Drive AppData folder
    const driveFiles = await listAppDataFiles(token);
    const driveFileMap = new Map(driveFiles.map(f => [f.name, f.id]));
    
    let hasChanges = false;
    
    // A. Upload missing local files to Google Drive
    for (const key of referencedKeys) {
      if (localKeySet.has(key) && !driveFileMap.has(key)) {
        console.log(`DocRx Sync: Uploading attachment ${key} to Drive...`);
        const blob = await get(key);
        if (blob) {
          await uploadFileToAppData(token, blob, key);
        }
      }
    }
    
    // B. Download missing cloud files from Google Drive
    for (const key of referencedKeys) {
      if (!localKeySet.has(key) && driveFileMap.has(key)) {
        console.log(`DocRx Sync: Downloading attachment ${key} from Drive...`);
        const fileId = driveFileMap.get(key);
        const buffer = await downloadBackupFile(token, fileId);
        const blob = new File([buffer], key.split('_').slice(2).join('_') || 'Report.pdf', { type: 'application/pdf' });
        await set(key, blob);
        hasChanges = true;
      }
    }
    
    // C. Garbage collection: Delete orphaned attachments from Drive
    for (const [name, id] of driveFileMap.entries()) {
      if (name.startsWith('visit_') && !referencedKeys.has(name)) {
        console.log(`DocRx Sync: Deleting orphaned attachment ${name} from Drive...`);
        await deleteFileFromAppData(token, id);
      }
    }
    
    // D. Garbage collection: Delete orphaned attachments from local IndexedDB
    for (const key of localKeys) {
      if (!referencedKeys.has(key)) {
        console.log(`DocRx Sync: Deleting orphaned attachment ${key} from local IndexedDB...`);
        await del(key);
        hasChanges = true;
      }
    }
    
    if (hasChanges) {
      import('../components/Toast.js').then(({ toast }) => {
        toast.info('Attachments updated from Google Drive. Refreshing...');
      });
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }
  } catch (err) {
    console.warn('DocRx Sync: Attachment sync failed', err);
  }
}

async function uploadPendingTestsQueue(token, db) {
  try {
    // Select all patients who have diagnostic tests ordered, where at least one test is not uploaded yet
    const res = db.exec(`
      SELECT p.patient_code, p.phone, v.id as visit_id, v.auth_code,
             group_concat(t.id || ':' || t.test_name || ':' || t.uploaded, ';') as test_details,
             p.full_name
      FROM diagnostic_tests t
      JOIN visits v ON t.visit_id = v.id
      JOIN patients p ON v.patient_id = p.id
      WHERE v.deleted = 0 AND t.deleted = 0
      GROUP BY v.id
      HAVING SUM(CASE WHEN t.uploaded = 0 THEN 1 ELSE 0 END) > 0
    `);
    
    let dbUpdated = false;
    const queue = [];
    if (res.length && res[0].values.length) {
      for (const row of res[0].values) {
        const visitId = row[2];
        let authCode = row[3];
        
        // Generate auth code if it doesn't exist yet (for older visits)
        if (!authCode) {
          authCode = Math.floor(1000 + Math.random() * 9000).toString();
          db.run('UPDATE visits SET auth_code = ? WHERE id = ?', [authCode, visitId]);
          dbUpdated = true;
        }
        
        const testDetailsStr = row[4] || '';
        const tests = testDetailsStr.split(';').map(item => {
          const parts = item.split(':');
          return {
            id: parts[0],
            name: parts[1],
            uploaded: parseInt(parts[2], 10) || 0
          };
        });
        
        queue.push({
          patientCode: row[0],
          phone: row[1],
          visitId: visitId,
          authCode: authCode,
          tests: tests,
          patientName: row[5]
        });
      }
    }
    
    const { uploadFileToAppData, findFileByName, updateFileInAppData } = await import('./drive.js');
    const jsonBlob = new Blob([JSON.stringify(queue, null, 2)], { type: 'application/json' });
    const filename = 'pending_tests_queue.json';
    
    const existingFile = await findFileByName(token, filename);
    if (existingFile) {
      await updateFileInAppData(token, jsonBlob, existingFile.id);
    } else {
      await uploadFileToAppData(token, jsonBlob, filename);
    }
    console.log("DocRx Sync: Uploaded pending tests queue successfully.");
    if (dbUpdated) {
      return true;
    }
  } catch (err) {
    console.warn("DocRx Sync: Failed to upload pending tests queue:", err);
  }
  return false;
}

