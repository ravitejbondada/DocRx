// ============================================================
// DocRx — ZIP Backup Engine
// ============================================================
import JSZip from 'jszip';
import { exportDBBinary, run } from '../db/index.js';
import { get, keys } from 'idb-keyval';

const GDRIVE_CLIENT_ID   = 'YOUR_GOOGLE_OAUTH_CLIENT_ID.apps.googleusercontent.com';
const GDRIVE_SCOPE       = 'https://www.googleapis.com/auth/drive.file';
const BACKUP_FOLDER_NAME = 'DocRx Backups';

function getTimestamp() {
  const now = new Date();
  return now.toISOString().slice(0,10).replace(/-/g,'') + '_' +
    String(now.getHours()).padStart(2,'0') + String(now.getMinutes()).padStart(2,'0');
}

export async function buildZip(onProgress = () => {}) {
  const zip = new JSZip();

  onProgress(10, 'Exporting database...');
  const dbBinary = exportDBBinary();
  zip.file('docrx_database.db', dbBinary);

  onProgress(30, 'Reading diagnostic files...');
  const idbKeys = await keys();
  let done = 0;
  for (const key of idbKeys) {
    const blob = await get(key);
    if (blob) {
      const buf = await blob.arrayBuffer();
      zip.folder('attachments').file(String(key), buf);
    }
    done++;
    onProgress(30 + Math.floor((done / (idbKeys.length || 1)) * 40), `Packing file ${done}/${idbKeys.length}...`);
  }

  onProgress(75, 'Compressing...');
  const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  onProgress(95, 'Done compressing.');

  return { zipBlob, filename: `docrx_backup_${getTimestamp()}.zip` };
}

// ── Google Drive Upload ───────────────────────────────────────
async function getAccessToken() {
  return new Promise((resolve, reject) => {
    if (!window.google) { reject(new Error('Google API not loaded')); return; }
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GDRIVE_CLIENT_ID,
      scope: GDRIVE_SCOPE,
      callback: (resp) => {
        if (resp.error) reject(new Error(resp.error));
        else resolve(resp.access_token);
      },
    });
    client.requestAccessToken({ prompt: 'consent' });
  });
}

async function getOrCreateFolder(token, folderName) {
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await searchRes.json();
  if (data.files?.length) return data.files[0].id;

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: folderName, mimeType: 'application/vnd.google-apps.folder' }),
  });
  const folder = await createRes.json();
  return folder.id;
}

async function uploadToDrive(token, folderId, blob, filename) {
  const meta = JSON.stringify({ name: filename, parents: [folderId] });
  const form  = new FormData();
  form.append('metadata', new Blob([meta], { type: 'application/json' }));
  form.append('file', blob);

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form }
  );
  if (!res.ok) throw new Error(`Drive upload failed: ${res.statusText}`);
  return res.json();
}

export async function runBackup(onProgress = () => {}, mode = 'drive') {
  const { zipBlob, filename } = await buildZip(onProgress);

  if (mode === 'download') {
    const url = URL.createObjectURL(zipBlob);
    const a   = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onProgress(100, 'Downloaded.');
    return;
  }

  // Google Drive
  onProgress(96, 'Authenticating with Google...');
  // Load Google Identity Services if not loaded
  if (!window.google) {
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  const token    = await getAccessToken();
  onProgress(97, 'Finding backup folder...');
  const folderId = await getOrCreateFolder(token, BACKUP_FOLDER_NAME);
  onProgress(98, 'Uploading...');
  await uploadToDrive(token, folderId, zipBlob, filename);

  // Update last_backup_at
  run("UPDATE settings SET last_backup_at=datetime('now','localtime') WHERE id=1");
  onProgress(100, 'Backup complete!');
}
