// ============================================================
// DocRx — Google Drive REST API & OAuth Client
// ============================================================

const DRIVE_FILENAME = 'DocRx_backup.sqlite';

function loadGisScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve();
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = (e) => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
}

let tokenClient = null;

export function initAuth(clientId, onTokenCallback) {
  return loadGisScript().then(() => {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive.appdata',
      callback: (response) => {
        if (response.error) {
          console.error('Google Sign-In failed', response);
          return;
        }
        const expiry = Date.now() + (response.expires_in * 1000);
        const tokenData = {
          accessToken: response.access_token,
          expiresAt: expiry,
          clientId: clientId
        };
        localStorage.setItem('docrx_gdrive_token', JSON.stringify(tokenData));
        if (onTokenCallback) onTokenCallback(tokenData);
      }
    });
    return tokenClient;
  });
}

export function getSavedToken() {
  const raw = localStorage.getItem('docrx_gdrive_token');
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (Date.now() > data.expiresAt - 60000) { // Expired or expiring within 1 minute
      return null; // Return null so caller triggers refresh, but keep metadata for clientId
    }
    return data.accessToken;
  } catch (e) {
    return null;
  }
}

export async function refreshTokenSilently() {
  const raw = localStorage.getItem('docrx_gdrive_token');
  if (!raw) return Promise.reject(new Error('No Google token details available in storage.'));
  
  try {
    const data = JSON.parse(raw);
    let clientId = data.clientId;
    
    if (!clientId) {
      // Fallback to query settings table if clientId not in token data
      try {
        const { getDB } = await import('../db/index.js');
        const db = getDB();
        const settingsRes = db.exec("SELECT google_client_id FROM settings WHERE id = 1");
        if (settingsRes.length && settingsRes[0].values.length) {
          clientId = settingsRes[0].values[0][0];
        }
      } catch (dbErr) {
        console.warn("Could not fetch Client ID from settings database", dbErr);
      }
    }
    
    if (!clientId) {
      return Promise.reject(new Error('No Google Client ID configured.'));
    }

    return new Promise((resolve, reject) => {
      initAuth(clientId, (tokenData) => {
        resolve(tokenData.accessToken);
      }).then((client) => {
        client.requestAccessToken({ prompt: '' });
      }).catch(reject);
    });
  } catch (e) {
    return Promise.reject(e);
  }
}

export function clearSavedToken() {
  localStorage.removeItem('docrx_gdrive_token');
}

// ── Google Drive REST Requests ───────────────────────────────

export async function findBackupFile(token) {
  const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${DRIVE_FILENAME}' and trashed=false&fields=files(id,version,size,modifiedTime)`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to check Google Drive files');
  const data = await res.json();
  return data.files?.[0] || null;
}

export async function downloadBackupFile(token, fileId) {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to download database from Google Drive');
  return await res.arrayBuffer();
}

/**
 * Uploads database to Drive.
 * Uses atomic multipart upload for new files, and PATCH request with ETag matching for existing.
 */
export async function uploadBackupFile(token, dbBinary, existingFile = null) {
  const blob = new Blob([dbBinary], { type: 'application/x-sqlite3' });
  
  if (!existingFile) {
    // Create new file (Multipart upload: metadata + media content)
    const metadata = {
      name: DRIVE_FILENAME,
      parents: ['appDataFolder']
    };
    
    const boundary = 'foo_bar_baz_docrx_boundary';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;
    
    const reader = new FileReader();
    const binaryPromise = new Promise((resolve) => {
      reader.onload = () => resolve(reader.result);
      reader.readAsBinaryString(blob);
    });
    
    const fileContent = await binaryPromise;
    const multipartBody = 
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/x-sqlite3\r\n' +
      'Content-Transfer-Encoding: base64\r\n\r\n' +
      btoa(fileContent) +
      closeDelimiter;

    const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartBody
    });
    
    if (!res.ok) throw new Error('Failed to create backup on Google Drive');
    return await res.json();
  } else {
    // Update existing file content with optimistic locking
    const fileId = existingFile.id;
    const url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
    
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-sqlite3'
    };
    
    const res = await fetch(url, {
      method: 'PATCH',
      headers,
      body: blob
    });
    
    if (res.status === 412) {
      throw new Error('VERSION_CONFLICT');
    }
    if (!res.ok) throw new Error('Failed to update Google Drive backup');
    return await res.json();
  }
}

export async function listAppDataFiles(token) {
  const url = 'https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=trashed=false&fields=files(id,name,size,createdTime)';
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to list files in Google Drive AppData folder');
  const data = await res.json();
  return data.files || [];
}

export async function uploadFileToAppData(token, blob, filename) {
  const metadata = {
    name: filename,
    parents: ['appDataFolder']
  };
  
  const boundary = 'docrx_multipart_boundary';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;
  
  const reader = new FileReader();
  const binaryPromise = new Promise((resolve) => {
    reader.onload = () => resolve(reader.result);
    reader.readAsBinaryString(blob);
  });
  
  const fileContent = await binaryPromise;
  const multipartBody = 
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: ' + (blob.type || 'application/octet-stream') + '\r\n' +
    'Content-Transfer-Encoding: base64\r\n\r\n' +
    btoa(fileContent) +
    closeDelimiter;

  const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: multipartBody
  });
  
  if (!res.ok) throw new Error(`Failed to upload ${filename} to Google Drive`);
  return await res.json();
}

export async function deleteFileFromAppData(token, fileId) {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to delete file from Google Drive');
  return true;
}

export async function listIncomingReports(token) {
  const files = await listAppDataFiles(token);
  return files.filter(f => f.name && f.name.startsWith('incoming_report_') && f.name.endsWith('.pdf'));
}

export const deleteReportFile = deleteFileFromAppData;

export async function findFileByName(token, filename) {
  const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${filename}' and trashed=false&fields=files(id)`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`Failed to find file ${filename}`);
  const data = await res.json();
  return data.files?.[0] || null;
}

export async function updateFileInAppData(token, blob, fileId) {
  const url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': blob.type
    },
    body: blob
  });
  if (!res.ok) throw new Error('Failed to update file in Google Drive AppData');
  return await res.json();
}

