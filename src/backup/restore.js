// ============================================================
// DocRx — ZIP Restore Engine
// ============================================================
import JSZip from 'jszip';
import { importDBBinary } from '../db/index.js';
import { set } from 'idb-keyval';

export async function runRestore(file) {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  // 1. Restore SQLite database
  const dbFile = zip.file('docrx_database.db');
  if (!dbFile) throw new Error('Invalid backup: docrx_database.db not found in ZIP');
  const dbBuf = await dbFile.async('arraybuffer');
  await importDBBinary(dbBuf);

  // 2. Restore IndexedDB attachments
  const attachments = zip.folder('attachments');
  if (attachments) {
    const promises = [];
    attachments.forEach((relPath, file) => {
      promises.push((async () => {
        const buf  = await file.async('arraybuffer');
        const blob = new Blob([buf]);
        await set(relPath, blob);
      })());
    });
    await Promise.all(promises);
  }
}
