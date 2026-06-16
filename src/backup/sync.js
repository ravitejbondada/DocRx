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

  try {
    const cloudFile = await findBackupFile(token);

    if (!cloudFile) {
      status({ type: 'syncing', message: 'Creating new backup on Google Drive...' });
      const localBinary = localDb.export();
      await uploadBackupFile(token, localBinary, null);
      
      const now = new Date().toLocaleString('en-IN');
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
      }
    }

    // Update settings timestamp
    localDb.run("UPDATE settings SET last_sync_timestamp=? WHERE id=1", [now]);
    persistDB();

    status({ type: 'success', message: 'Consolidated synchronization complete!', lastSync: now });
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
