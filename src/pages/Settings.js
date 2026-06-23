// ============================================================
// DocRx — Settings Page
// ============================================================
import { queryOne, queryAll, run } from '../db/index.js';
import { toast } from '../components/Toast.js';
import { navigate, getParams } from '../router.js';
import { showModal } from '../components/Modal.js';
import { initAuth, getSavedToken, clearSavedToken } from '../backup/drive.js';
import { syncWithGoogleDrive } from '../backup/sync.js';

export function renderSettings(container) {
  const s = queryOne('SELECT * FROM settings WHERE id=1') || {};
  const params = getParams();
  const activeTab = params.tab || 'clinic';
  const portalUrl = localStorage.getItem('docrx_portal_url') || '';

  const storageRaw = localStorage.getItem('docrx_db_v1') || '';
  let storageMB  = ((storageRaw.length * 0.75) / 1024 / 1024).toFixed(2);
  let storagePct = '0.0';
  let isWarn = false;
  let limitMB = 'Unlimited';
  
  if (navigator.storage && navigator.storage.estimate) {
    navigator.storage.estimate().then(est => {
      if (est.quota) {
        const used = (est.usage || 0) / 1024 / 1024;
        const quota = est.quota / 1024 / 1024;
        storageMB = used.toFixed(2);
        limitMB = quota > 1000 ? (quota / 1024).toFixed(1) + ' GB' : quota.toFixed(0) + ' MB';
        storagePct = Math.min(100, (used / quota) * 100).toFixed(1);
        isWarn = (used / quota) > 0.8;
        
        const elUsed = container.querySelector('#storage-used');
        const elLimit = container.querySelector('#storage-limit');
        const elBar = container.querySelector('#storage-bar');
        if (elUsed) elUsed.textContent = `${storageMB} MB used`;
        if (elLimit) elLimit.textContent = `${limitMB} limit`;
        if (elBar) {
          elBar.style.width = `${storagePct}%`;
          if (isWarn) elBar.classList.add('warn');
        }
      }
    });
  }

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Settings</h1>
        <p class="page-subtitle">Manage clinic details, security, and backups</p>
      </div>
    </div>

    <div class="page-content slide-up" style="max-width:760px">

      <!-- Tab Nav -->
      <div class="settings-tabs-wrap">
        <div class="flex gap-1 mb-6 settings-tabs" style="background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:var(--radius-lg);padding:4px;width:fit-content">
          ${[
            { id: 'clinic',   label: 'Clinic Info' },
            { id: 'security', label: 'Security' },
            { id: 'backup',   label: 'Backup & Restore' },
            { id: 'portal',   label: 'Lab Portal' },
            { id: 'storage',  label: 'Storage' },
          ].map(tab => `
            <button class="btn ${activeTab === tab.id ? 'btn-primary' : 'btn-ghost'} btn-sm" style="flex-shrink:0"
                    onclick="window.__switchTab('${tab.id}')" id="tab-${tab.id}">
              ${tab.label}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Clinic Info Tab -->
      <div id="panel-clinic" class="${activeTab !== 'clinic' ? 'hidden' : ''}">
        <div class="card card-p">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <div class="section-title mb-0">Doctor & Clinic Information</div>
            <button type="button" class="btn btn-secondary btn-sm" id="edit-clinic-btn">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              Edit Info
            </button>
          </div>
          <form id="clinic-form" novalidate>
            <div class="form-grid form-grid-2" style="gap:16px;margin-bottom:16px">
              <div class="form-group">
                <label class="form-label">Doctor First Name <span class="req">*</span></label>
                <input class="input" id="s-doctor_first_name" type="text" value="${e(s.doctor_first_name)}" placeholder="e.g. Rajesh" disabled />
              </div>
              <div class="form-group">
                <label class="form-label">Doctor Last Name <span class="req">*</span></label>
                <input class="input" id="s-doctor_last_name" type="text" value="${e(s.doctor_last_name)}" placeholder="e.g. Kumar" disabled />
              </div>
              <div class="form-group">
                <label class="form-label">Qualifications</label>
                <input class="input" id="s-doctor_qualification" type="text" value="${e(s.doctor_qualification)}" placeholder="MBBS, MD" disabled />
              </div>
              <div class="form-group">
                <label class="form-label">Registration Number <span class="req">*</span></label>
                <input class="input" id="s-doctor_reg_number" type="text" value="${e(s.doctor_reg_number)}" placeholder="AP-MED-12345" disabled />
              </div>
              <div class="form-group">
                <label class="form-label">Clinic Name</label>
                <input class="input" id="s-clinic_name" type="text" value="${e(s.clinic_name)}" placeholder="City Health Clinic" disabled />
              </div>
            </div>
            <div class="form-group mb-4">
              <label class="form-label">Clinic Address <span class="req">*</span></label>
              <textarea class="textarea" id="s-clinic_address" rows="3" placeholder="Full address for prescription letterhead" disabled>${e(s.clinic_address)}</textarea>
            </div>
            <div class="form-group mb-4">
              <label class="form-label">Contact Phone <span class="req">*</span></label>
              <input class="input" id="s-clinic_phone" type="text" value="${e(s.clinic_phone)}" placeholder="Clinic phone number" disabled />
            </div>
            <div class="form-group mb-4">
              <label class="form-label">Print Footer Message</label>
              <input class="input" id="s-print_footer_message" type="text" value="${e(s.print_footer_message)}" placeholder="Wishing you a swift and complete recovery." disabled />
            </div>
            <div id="clinic-form-actions" class="hidden flex gap-2">
              <button type="submit" class="btn btn-primary">
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                Save Changes
              </button>
              <button type="button" class="btn btn-secondary" id="cancel-clinic-btn">Cancel</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Security Tab -->
      <div id="panel-security" class="${activeTab !== 'security' ? 'hidden' : ''}">
        <div class="card card-p">
          <div class="section-title mb-4">Change Password</div>
          <p class="text-sm text-muted mb-4">To change your password, you'll be taken to the secure password setup screen.</p>
          <button class="btn btn-primary" onclick="window.__navigate('/setup?mode=reset')">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
            Change Password
          </button>
        </div>
        <div class="card card-p mt-4">
          <div class="section-title mb-2">Emergency Recovery</div>
          <p class="text-sm text-muted mb-4">If you forget your password, use the challenge-response recovery system on the login screen. Your registration number <strong class="font-mono" style="color:var(--teal-400)">${e(s.doctor_reg_number) || 'not set'}</strong> is used to generate the challenge code.</p>
          <div class="alert alert-info">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            Keep <code>recovery-tool.html</code> safe — it contains the private key to compute response codes.
          </div>
        </div>
        <div class="card card-p mt-4">
          <div class="section-title mb-2">Session</div>
          <p class="text-sm text-muted mb-4">Sessions expire after 30 days of inactivity.</p>
          <button class="btn btn-danger btn-sm" onclick="window.__handleLogout()">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            Log Out
          </button>
        </div>
      </div>

      <!-- Backup & Restore Tab -->
      <div id="panel-backup" class="${activeTab !== 'backup' ? 'hidden' : ''}">
        <div class="card card-p mb-4">
          <div class="section-title mb-2">Google Drive Backup</div>
          <p class="text-sm text-muted mb-4" style="line-height:1.6">
            Backup all patient records and attachments into a single encrypted ZIP file, uploaded directly to your personal Google Drive under <strong>DocRx Backups</strong> folder.
          </p>
          ${s.last_backup_at ? `<div class="text-xs text-muted mb-4">Last backup: ${new Date(s.last_backup_at).toLocaleString('en-IN')}</div>` : ''}
          <div class="flex gap-3">
            <button class="btn btn-primary" id="backup-btn">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"/></svg>
              Backup to Google Drive
            </button>
            <button class="btn btn-secondary" id="download-btn">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              Download ZIP Locally
            </button>
          </div>
          <div id="backup-progress" class="hidden mt-4">
            <div class="storage-bar-wrap mb-2">
              <div class="storage-bar" id="backup-bar" style="width:0%;transition:width 0.5s"></div>
            </div>
            <div class="text-xs text-muted" id="backup-status">Preparing backup...</div>
          </div>
        </div>

        <div class="card card-p mb-4">
          <div class="section-title mb-2">Google Drive Real-time Sync</div>
          <p class="text-sm text-muted mb-4" style="line-height:1.6">
            Keep your database synced in real-time across devices. Uses a conflict-free merge engine so changes on desktop and mobile are merged safely.
          </p>
          
          <div class="form-group mb-4">
            <label class="form-label">Google OAuth Client ID</label>
            <div class="flex gap-2">
              <input type="text" class="input" id="google-client-id" placeholder="Paste your Google OAuth Client ID here..." value="${s.google_client_id || '219866394954-pg9187uvcq3gu0c4l51728m1u1hojt0c.apps.googleusercontent.com'}" style="flex:1" />
              <button class="btn btn-secondary" id="save-client-id-btn">Save ID</button>
            </div>
            <p class="text-xs text-muted mt-1">Configure this client ID in Google Cloud Console. Enable Javascript Origins: <code>${window.location.origin}</code></p>
          </div>

          <div class="flex gap-3 items-center flex-wrap">
            <button class="btn ${getSavedToken() ? 'btn-secondary' : 'btn-primary'}" id="gdrive-connect-btn">
              ${getSavedToken() ? 'Disconnect Drive' : 'Connect Google Drive'}
            </button>
            <button class="btn btn-primary ${getSavedToken() ? '' : 'hidden'}" id="gdrive-sync-btn">
              Sync Now
            </button>
            <label class="flex items-center gap-2 text-sm ${getSavedToken() ? '' : 'hidden'}" style="cursor:pointer">
              <input type="checkbox" id="gdrive-auto-sync" ${s.google_sync_enabled ? 'checked' : ''} />
              Auto-Sync in Background
            </label>
          </div>

          <div id="sync-status-box" class="hidden mt-4 alert alert-info" style="margin-bottom:0">
            <div class="text-sm" id="sync-status-text">Ready to sync.</div>
          </div>
          
          ${s.last_sync_timestamp ? `<div class="text-xs text-muted mt-3" id="sync-time-display">Last synchronized: ${s.last_sync_timestamp}</div>` : ''}
        </div>

        <div class="card card-p">
          <div class="section-title mb-2">Restore from Backup</div>
          <p class="text-sm text-muted mb-4" style="line-height:1.6">
            Select a <strong>.zip</strong> backup file to fully restore all records and attachments.
            <span style="color:#f87171">This will replace all current data.</span>
          </p>
          <label class="btn btn-secondary" style="cursor:pointer">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
            Select Backup ZIP
            <input type="file" accept=".zip" id="restore-file" class="hidden" />
          </label>
          <div id="restore-status" class="mt-3 text-sm text-muted"></div>
        </div>
      </div>

      <!-- Storage Tab -->
      <div id="panel-storage" class="${activeTab !== 'storage' ? 'hidden' : ''}">
        <div class="card card-p">
          <div class="section-title mb-4">Local Storage Usage</div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-semibold" id="storage-used">Calculating...</span>
            <span class="text-xs text-muted" id="storage-limit">Calculating...</span>
          </div>
          <div class="storage-bar-wrap mb-4" style="height:8px">
            <div class="storage-bar" id="storage-bar" style="width:0%"></div>
          </div>
          <div class="text-sm text-muted">
            All your patient records, prescriptions, and diagnostic reports are securely stored in your browser's IndexedDB. Your storage capacity is limited only by your device's free disk space.
          </div>
          <div style="margin-top:16px">
            <div class="section-title mb-2">Schema Version</div>
            <span class="badge badge-neutral font-mono">v${s.schema_version || 1}</span>
          </div>
        </div>
      </div>

      <!-- Lab Portal Tab -->
      <div id="panel-portal" class="${activeTab !== 'portal' ? 'hidden' : ''}">
        ${!getSavedToken() ? `
        <div class="alert alert-warning mb-4">
          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          <div>
            <strong>Google Drive Sync is Disconnected!</strong><br/>
            DocRx requires Google Drive to be connected under the <strong>Backup & Restore</strong> tab in order to poll and download incoming lab reports.
          </div>
        </div>
        ` : ''}

        <div class="card card-p mb-4">
          <div class="section-title mb-2">Configure Diagnostic Lab Portal</div>
          <p class="text-sm text-muted mb-4" style="line-height:1.6">
            Enter your Google Apps Script Web App URL below. External diagnostic labs will use this URL to upload PDF reports directly into your secure Google Drive.
          </p>
          <div class="form-group mb-4">
            <label class="form-label">Apps Script Web App URL</label>
            <div class="flex gap-2">
              <input type="text" class="input" id="portal-url" placeholder="https://script.google.com/macros/s/.../exec" value="${portalUrl}" style="flex:1" />
              <button class="btn btn-primary" id="save-portal-url-btn">Save URL</button>
            </div>
          </div>

          ${portalUrl ? `
          <div class="print-footer-divider" style="margin: 16px 0;"></div>
          <div class="section-title mb-2" style="font-size:0.95rem">Shareable Portal Link</div>
          <p class="text-xs text-muted mb-3">Copy this link or share it directly with your diagnostic lab partners via WhatsApp.</p>
          <div class="flex gap-2 items-center">
            <input type="text" class="input" id="share-portal-url" value="${portalUrl}" readonly style="flex:1; background:var(--glass-bg); font-family:monospace; font-size:0.85rem;" />
            <button class="btn btn-secondary btn-sm" id="copy-share-btn">Copy</button>
            <button class="btn btn-primary btn-sm" id="share-wa-btn">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
              Share Link
            </button>
          </div>
          ` : ''}
        </div>

        <div class="card card-p">
          <div class="section-title mb-4">Step-by-Step Setup Guide</div>
          <ol class="text-sm text-muted" style="padding-left: 20px; display:flex; flex-direction:column; gap:16px;">
            <li>Open <a href="https://script.google.com" target="_blank" style="color:var(--teal-400); text-decoration:underline;">Google Apps Script</a> and click <strong>New Project</strong>.</li>
            <li>Rename the project to <code>DocRx Lab Portal</code>.</li>
            <li>
              Enable and edit the <strong>appsscript.json</strong> manifest file:
              <ul style="padding-left: 20px; margin-top: 8px; list-style-type: disc; display:flex; flex-direction:column; gap:6px;">
                <li>Click the gear icon (<strong>Project Settings</strong>) on the left sidebar.</li>
                <li>Check the box for <strong>"Show 'appsscript.json' manifest file in editor"</strong>.</li>
                <li>Go back to the editor (pencil icon on the left), select <strong>appsscript.json</strong> in the file list, and replace its entire contents with the configuration below:</li>
              </ul>
              <div class="mt-2" style="position:relative;">
                <button class="btn btn-ghost btn-sm" id="copy-manifest-btn" style="position:absolute; right:8px; top:8px; background:rgba(255,255,255,0.05); font-size:0.75rem;">Copy Manifest</button>
                <pre id="manifest-json-text" style="background:#0f172a; color:#f8fafc; padding:16px; border-radius:8px; font-family:monospace; font-size:0.8rem; overflow-x:auto; max-height:220px; border:1px solid rgba(255,255,255,0.08);">${e(MANIFEST_CODE)}</pre>
              </div>
            </li>
            <li>
              Select <strong>Code.gs</strong> in the file list and replace all its contents with the code below:
              <div class="mt-2" style="position:relative;">
                <button class="btn btn-ghost btn-sm" id="copy-code-btn" style="position:absolute; right:8px; top:8px; background:rgba(255,255,255,0.05); font-size:0.75rem;">Copy Code</button>
                <pre id="code-gs-text" style="background:#0f172a; color:#f8fafc; padding:16px; border-radius:8px; font-family:monospace; font-size:0.8rem; overflow-x:auto; max-height:220px; border:1px solid rgba(255,255,255,0.08);">${e(GS_CODE)}</pre>
              </div>
            </li>
            <li>Click the <strong>+</strong> icon next to Files, select <strong>HTML</strong>, and name it exactly <code>Upload</code>.</li>
            <li>
              Replace all contents of <strong>Upload.html</strong> with the code below:
              <div class="mt-2" style="position:relative;">
                <button class="btn btn-ghost btn-sm" id="copy-html-btn" style="position:absolute; right:8px; top:8px; background:rgba(255,255,255,0.05); font-size:0.75rem;">Copy HTML</button>
                <pre id="upload-html-text" style="background:#0f172a; color:#f8fafc; padding:16px; border-radius:8px; font-family:monospace; font-size:0.8rem; overflow-x:auto; max-height:220px; border:1px solid rgba(255,255,255,0.08);">${e(HTML_CODE)}</pre>
              </div>
            </li>
            <li>Click <strong>Deploy</strong> (top right) -> <strong>New deployment</strong>.</li>
            <li>Click the gear icon next to "Select type", choose <strong>Web app</strong>, and enter a description (e.g. <code>DocRx Lab Upload Portal</code>).</li>
            <li>Ensure <strong>Execute as:</strong> is set to <strong>Me (your-email@gmail.com)</strong>.</li>
            <li>Ensure <strong>Who has access:</strong> is set to <strong>Anyone</strong>.</li>
            <li>Click <strong>Deploy</strong>, authorize the permissions, copy the <strong>Web app URL</strong>, and paste it into the field at the top of this tab!</li>
          </ol>
        </div>
      </div>

    </div>
  `;

  // Tab switching
  window.__switchTab = (tabId) => {
    ['clinic','security','backup','portal','storage'].forEach(t => {
      container.querySelector(`#panel-${t}`)?.classList.toggle('hidden', t !== tabId);
      const btn = container.querySelector(`#tab-${t}`);
      if (btn) btn.className = `btn ${t === tabId ? 'btn-primary' : 'btn-ghost'} btn-sm`;
    });
  };

  // Clinic Form Edit/Cancel/Submit toggles
  const editBtn = container.querySelector('#edit-clinic-btn');
  const cancelBtn = container.querySelector('#cancel-clinic-btn');
  const clinicForm = container.querySelector('#clinic-form');
  const actionContainer = container.querySelector('#clinic-form-actions');
  const inputs = clinicForm?.querySelectorAll('input, textarea');

  editBtn?.addEventListener('click', () => {
    inputs.forEach(i => i.disabled = false);
    editBtn.classList.add('hidden');
    actionContainer.classList.remove('hidden');
  });

  const resetForm = () => {
    inputs.forEach(i => i.disabled = true);
    editBtn.classList.remove('hidden');
    actionContainer.classList.add('hidden');
  };

  cancelBtn?.addEventListener('click', () => {
    window.location.reload();
  });

  // Clinic form save
  clinicForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const g = (sel) => container.querySelector(sel)?.value?.trim() || '';
    const docFirst = g('#s-doctor_first_name');
    const docLast  = g('#s-doctor_last_name');
    const docName  = `Dr. ${docFirst} ${docLast}`.trim();
    run(`UPDATE settings SET doctor_first_name=?, doctor_last_name=?, doctor_name=?, doctor_qualification=?,doctor_reg_number=?,
         clinic_name=?,clinic_address=?,clinic_phone=?,print_footer_message=? WHERE id=1`,
      [docFirst, docLast, docName, g('#s-doctor_qualification'), g('#s-doctor_reg_number'),
       g('#s-clinic_name'), g('#s-clinic_address'), g('#s-clinic_phone'), g('#s-print_footer_message')]);
    toast.success('Settings saved.');
    resetForm();
  });

  // Backup
  container.querySelector('#backup-btn')?.addEventListener('click', async () => {
    const { runBackup } = await import('../backup/zip.js');
    const prog = container.querySelector('#backup-progress');
    const bar  = container.querySelector('#backup-bar');
    const stat = container.querySelector('#backup-status');
    prog.classList.remove('hidden');

    try {
      await runBackup((pct, msg) => {
        bar.style.width = pct + '%';
        stat.textContent = msg;
      }, 'drive');
      toast.success('Backup uploaded to Google Drive!');
    } catch (err) {
      toast.error('Backup failed: ' + err.message);
    }
    prog.classList.add('hidden');
  });

  container.querySelector('#download-btn')?.addEventListener('click', async () => {
    const { runBackup } = await import('../backup/zip.js');
    try {
      await runBackup(() => {}, 'download');
      toast.success('Backup downloaded.');
    } catch (err) {
      toast.error('Download failed: ' + err.message);
    }
  });

  // Save Google Client ID
  container.querySelector('#save-client-id-btn')?.addEventListener('click', () => {
    const val = container.querySelector('#google-client-id')?.value?.trim() || '';
    run("UPDATE settings SET google_client_id=? WHERE id=1", [val]);
    toast.success('Google Client ID saved.');
    navigate('/settings?tab=backup');
  });

  // Connect Google Drive
  container.querySelector('#gdrive-connect-btn')?.addEventListener('click', async () => {
    const clientId = container.querySelector('#google-client-id')?.value?.trim();
    if (!clientId) {
      toast.error('Please enter and save a Client ID first.');
      return;
    }

    if (getSavedToken()) {
      clearSavedToken();
      run("UPDATE settings SET google_sync_enabled=0 WHERE id=1");
      toast.info('Google Drive disconnected.');
      navigate('/settings?tab=backup');
    } else {
      try {
        const client = await initAuth(clientId, (tokenData) => {
          toast.success('Google Drive authorized successfully!');
          navigate('/settings?tab=backup');
        });
        client.requestAccessToken({ prompt: 'consent' });
      } catch (err) {
        toast.error('Auth initialization failed: ' + err.message);
      }
    }
  });

  // Sync Now
  container.querySelector('#gdrive-sync-btn')?.addEventListener('click', async () => {
    const statusBox = container.querySelector('#sync-status-box');
    const statusText = container.querySelector('#sync-status-text');
    statusBox.classList.remove('hidden');
    
    await syncWithGoogleDrive((status) => {
      statusText.textContent = status.message;
      if (status.type === 'success') {
        statusBox.className = 'mt-4 alert alert-success';
        toast.success('Synchronization complete!');
        setTimeout(() => navigate('/settings?tab=backup'), 1000);
      } else if (status.type === 'error') {
        statusBox.className = 'mt-4 alert alert-danger';
        toast.error(status.message);
      } else {
        statusBox.className = 'mt-4 alert alert-info';
      }
    });
  });

  // Auto Sync toggle
  container.querySelector('#gdrive-auto-sync')?.addEventListener('change', (e) => {
    const enabled = e.target.checked ? 1 : 0;
    run("UPDATE settings SET google_sync_enabled=? WHERE id=1", [enabled]);
    toast.success(enabled ? 'Background auto-sync enabled.' : 'Background auto-sync disabled.');
  });

  // Restore
  container.querySelector('#restore-file')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!confirm('⚠ This will replace ALL current data with the backup. Continue?')) return;

    const { runRestore } = await import('../backup/restore.js');
    container.querySelector('#restore-status').textContent = 'Restoring...';
    try {
      await runRestore(file);
      toast.success('Restore complete! Reloading...');
      setTimeout(() => location.reload(), 1500);
    } catch (err) {
      toast.error('Restore failed: ' + err.message);
      container.querySelector('#restore-status').textContent = '';
    }
  });

  // Save Portal URL
  container.querySelector('#save-portal-url-btn')?.addEventListener('click', () => {
    const val = container.querySelector('#portal-url')?.value?.trim() || '';
    localStorage.setItem('docrx_portal_url', val);
    toast.success('Lab Portal URL saved.');
    navigate('/settings?tab=portal');
  });

  // Copy share URL
  container.querySelector('#copy-share-btn')?.addEventListener('click', () => {
    const el = container.querySelector('#share-portal-url');
    if (el) {
      el.select();
      document.execCommand('copy');
      toast.success('Link copied to clipboard!');
    }
  });

  // Share via WhatsApp
  container.querySelector('#share-wa-btn')?.addEventListener('click', () => {
    const url = localStorage.getItem('docrx_portal_url') || '';
    if (!url) return;
    const msg = `Dear Partner, please use this link to upload patient lab reports directly into our system: ${url}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
  });

  // Copy code blocks
  container.querySelector('#copy-manifest-btn')?.addEventListener('click', () => {
    const manifest = container.querySelector('#manifest-json-text')?.textContent || '';
    navigator.clipboard.writeText(manifest).then(() => {
      toast.success('appsscript.json copied!');
    });
  });

  container.querySelector('#copy-code-btn')?.addEventListener('click', () => {
    const code = container.querySelector('#code-gs-text')?.textContent || '';
    navigator.clipboard.writeText(code).then(() => {
      toast.success('Code.gs copied!');
    });
  });

  container.querySelector('#copy-html-btn')?.addEventListener('click', () => {
    const htmlCode = container.querySelector('#upload-html-text')?.textContent || '';
    navigator.clipboard.writeText(htmlCode).then(() => {
      toast.success('Upload.html copied!');
    });
  });
}

function e(val) { return val != null ? String(val).replace(/"/g, '&quot;').replace(/</g, '&lt;') : ''; }

const MANIFEST_CODE = `{
  "timeZone": "Asia/Kolkata",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE"
  },
  "oauthScopes": [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/script.external_request"
  ]
}`;

const GS_CODE = `function doGet(e) {
  var template = HtmlService.createTemplateFromFile('Upload');
  template.queueData = JSON.stringify(getPendingTestsQueue());
  return template.evaluate()
      .setTitle('DocRx Lab Report Portal')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function getPendingTestsQueue() {
  try {
    var token = ScriptApp.getOAuthToken();
    var findUrl = 'https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name=%27pending_tests_queue.json%27%20and%20trashed=false&fields=files(id)';
    var findResponse = UrlFetchApp.fetch(findUrl, {
      method: 'get',
      headers: { Authorization: 'Bearer ' + token },
      muteHttpExceptions: true
    });
    
    if (findResponse.getResponseCode() !== 200) return [];
    var findInfo = JSON.parse(findResponse.getContentText());
    var files = findInfo.files;
    if (!files || !files.length) return [];
    
    var downloadUrl = 'https://www.googleapis.com/drive/v3/files/' + files[0].id + '?alt=media';
    var downloadResponse = UrlFetchApp.fetch(downloadUrl, {
      method: 'get',
      headers: { Authorization: 'Bearer ' + token },
      muteHttpExceptions: true
    });
    
    if (downloadResponse.getResponseCode() !== 200) return [];
    return JSON.parse(downloadResponse.getContentText());
  } catch (error) {
    return [];
  }
}

function uploadReport(base64Data, fileName, patientCode, phone) {
  try {
    patientCode = patientCode.toUpperCase().trim();
    phone = phone.replace(/[\\s\\-\\(\\)]/g, '').trim();
    
    if (!patientCode || !phone) {
      return { success: false, error: 'Patient Code and Phone Number are required.' };
    }
    
    var timestamp = new Date().getTime();
    var driveFileName = 'incoming_report_' + patientCode + '_' + phone + '_' + timestamp + '.pdf';
    var mediaBody = Utilities.base64Decode(base64Data);
    
    var metadata = {
      name: driveFileName,
      parents: ['appDataFolder']
    };
    
    var token = ScriptApp.getOAuthToken();
    
    // Step 1: Create metadata in appDataFolder
    var createResponse = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + token },
      payload: JSON.stringify(metadata),
      muteHttpExceptions: true
    });
    
    if (createResponse.getResponseCode() !== 200) {
      throw new Error("Metadata creation failed: " + createResponse.getContentText());
    }
    
    var fileInfo = JSON.parse(createResponse.getContentText());
    var fileId = fileInfo.id;
    
    // Step 2: Upload actual PDF content
    var uploadResponse = UrlFetchApp.fetch('https://www.googleapis.com/upload/drive/v3/files/' + fileId + '?uploadType=media', {
      method: 'patch',
      contentType: 'application/pdf',
      headers: { Authorization: 'Bearer ' + token },
      payload: mediaBody,
      muteHttpExceptions: true
    });
    
    if (uploadResponse.getResponseCode() !== 200) {
      throw new Error("Content upload failed: " + uploadResponse.getContentText());
    }
    
    return { success: true, fileId: fileId };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}`;

const HTML_CODE = `<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-gradient: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #311042 100%);
      --card-bg: rgba(30, 41, 59, 0.7);
      --card-border: rgba(255, 255, 255, 0.08);
      --primary: #06b6d4;
      --primary-hover: #0891b2;
      --text: #f8fafc;
      --text-muted: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Outfit', sans-serif;
      background: var(--bg-gradient);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: var(--card-bg);
      backdrop-filter: blur(16px);
      border: 1px solid var(--card-border);
      border-radius: 20px;
      width: 100%;
      max-width: 900px;
      padding: 36px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      display: grid;
      grid-template-columns: 1.1fr 0.9fr;
      gap: 36px;
    }
    @media (max-width: 768px) {
      .card {
        grid-template-columns: 1fr;
        max-width: 480px;
        padding: 24px;
        gap: 24px;
      }
    }
    .panel-header { margin-bottom: 24px; }
    .logo { font-size: 24px; font-weight: 700; background: linear-gradient(to right, #22d3ee, #818cf8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 6px; }
    .subtitle { color: var(--text-muted); font-size: 13px; line-height: 1.5; }
    
    /* Queue List Styles */
    .queue-search {
      width: 100%;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      padding: 10px 14px;
      color: var(--text);
      font-family: inherit;
      font-size: 14px;
      outline: none;
      margin-bottom: 16px;
      transition: all 0.3s;
    }
    .queue-search:focus { border-color: var(--primary); }
    .queue-container {
      max-height: 380px;
      overflow-y: auto;
      padding-right: 6px;
    }
    .queue-container::-webkit-scrollbar { width: 5px; }
    .queue-container::-webkit-scrollbar-track { background: transparent; }
    .queue-container::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
    .queue-item {
      background: rgba(15, 23, 42, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 14px 16px;
      margin-bottom: 10px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .queue-item:hover {
      border-color: rgba(6, 182, 212, 0.5);
      background: rgba(6, 182, 212, 0.03);
    }
    .queue-item.active {
      border-color: var(--primary);
      background: rgba(6, 182, 212, 0.08);
      box-shadow: 0 0 12px rgba(6, 182, 212, 0.15);
    }
    .queue-item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .queue-code { font-weight: 600; color: #22d3ee; font-size: 14px; }
    .queue-badge { background: rgba(6, 182, 212, 0.2); color: #22d3ee; font-size: 10px; padding: 2px 8px; border-radius: 20px; font-weight: 500; text-transform: uppercase; }
    .queue-tests { font-size: 12px; color: var(--text-muted); line-height: 1.4; }
    .empty-queue { text-align: center; padding: 40px 20px; color: var(--text-muted); font-size: 14px; background: rgba(15, 23, 42, 0.3); border: 1px dashed rgba(255, 255, 255, 0.08); border-radius: 12px; }
    
    /* Upload Panel Styles */
    .form-group { margin-bottom: 16px; }
    .label { display: block; font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 6px; }
    .input {
      width: 100%;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      padding: 10px 14px;
      color: var(--text);
      font-family: inherit;
      font-size: 14px;
      outline: none;
      transition: all 0.3s;
    }
    .input:focus { border-color: var(--primary); box-shadow: 0 0 0 2px rgba(6, 182, 212, 0.2); }
    .input:read-only { background: rgba(15, 23, 42, 0.8); border-color: rgba(255, 255, 255, 0.05); color: var(--text-muted); cursor: not-allowed; }
    
    .selected-banner {
      background: rgba(6, 182, 212, 0.1);
      border: 1px solid rgba(6, 182, 212, 0.3);
      border-radius: 10px;
      padding: 10px 14px;
      margin-bottom: 16px;
      font-size: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .selected-banner-text { font-weight: 500; color: #22d3ee; }
    .clear-selection-btn { background: transparent; border: none; color: #ef4444; cursor: pointer; font-size: 11px; font-weight: 600; text-transform: uppercase; outline: none; }
    .clear-selection-btn:hover { color: #f87171; }
    
    .dropzone {
      border: 2px dashed rgba(255, 255, 255, 0.15);
      border-radius: 12px;
      padding: 24px 20px;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s;
      background: rgba(15, 23, 42, 0.3);
    }
    .dropzone:hover, .dropzone.dragover { border-color: var(--primary); background: rgba(6, 182, 212, 0.05); }
    .dropzone-icon { font-size: 28px; margin-bottom: 8px; color: var(--primary); }
    .dropzone-text { font-size: 13px; margin-bottom: 4px; }
    .dropzone-subtext { font-size: 11px; color: var(--text-muted); }
    .file-preview { display: flex; align-items: center; gap: 12px; background: rgba(15, 23, 42, 0.8); padding: 10px; border-radius: 10px; margin-top: 12px; }
    .file-icon { font-size: 20px; color: #ef4444; }
    .file-info { flex: 1; min-width: 0; }
    .file-name { font-size: 13px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .file-size { font-size: 11px; color: var(--text-muted); }
    .btn {
      width: 100%;
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 10px;
      padding: 12px;
      font-size: 15px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: all 0.3s;
      margin-top: 8px;
    }
    .btn:hover { background: var(--primary-hover); transform: translateY(-1px); }
    .btn:active { transform: translateY(0); }
    .btn:disabled { background: rgba(255, 255, 255, 0.1); color: var(--text-muted); cursor: not-allowed; }
    .error { color: #f87171; font-size: 12px; margin-top: 6px; }
    
    .loading-state, .success-state { display: none; text-align: center; width: 100%; grid-column: span 2; }
    @media (max-width: 768px) { .loading-state, .success-state { grid-column: span 1; } }
    .spinner { border: 4px solid rgba(255,255,255,0.1); border-top-color: var(--primary); border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 20px auto; }
    @keyframes spin { 100% { transform: rotate(360deg); } }
    .progress-text { font-size: 16px; font-weight: 500; margin-bottom: 8px; }
    .checkmark { width: 80px; height: 80px; border-radius: 50%; display: block; stroke-width: 2; stroke: #10b981; stroke-miterlimit: 10; margin: 10% auto; box-shadow: inset 0px 0px 0px #10b981; animation: fill .4s ease-in-out .4s forwards, scale .3s ease-in-out .9s forwards; }
    .checkmark__circle { stroke-dasharray: 166; stroke-dashoffset: 166; stroke-width: 2; stroke-miterlimit: 10; stroke: #10b981; fill: none; animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards; }
    .checkmark__check { transform-origin: 50% 50%; stroke-dasharray: 48; stroke-dashoffset: 48; animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.6s forwards; }
    @keyframes stroke { 100% { stroke-dashoffset: 0; } }
    @keyframes scale { 0%, 100% { transform: none; } 50% { transform: scale3d(1.1, 1.1, 1); } }
    @keyframes fill { 100% { box-shadow: inset 0px 0px 0px 40px rgba(16, 185, 129, 0.1); } }
  </style>
</head>
<body>
  <div class="card" id="main-card">
    <div id="queue-panel">
      <div class="panel-header">
        <div class="logo">Pending Orders</div>
        <div class="subtitle">Select a patient order below to auto-fill the upload form</div>
      </div>
      <input type="text" id="queue-search" class="queue-search" placeholder="Filter by ID or test name...">
      <div class="queue-container" id="queue-list"></div>
    </div>

    <div id="form-container">
      <div class="panel-header">
        <div class="logo" id="form-title">Upload Report</div>
        <div class="subtitle" id="form-subtitle">Choose from the left queue or enter manually</div>
      </div>
      <div id="selection-banner" class="selected-banner" style="display:none">
        <div class="selected-banner-text" id="selected-text"></div>
        <button type="button" class="clear-selection-btn" onclick="clearSelection()">Manual Input</button>
      </div>

      <form id="upload-form">
        <div class="form-group">
          <label class="label">Patient Code / ID</label>
          <input type="text" id="patientCode" class="input" placeholder="e.g. PX0001" required autocomplete="off">
        </div>
        <div class="form-group">
          <label class="label">Registered Phone Number</label>
          <input type="tel" id="phone" class="input" placeholder="e.g. 9848055331" required autocomplete="off">
        </div>
        <div class="form-group">
          <label class="label">PDF Report</label>
          <div id="dropzone" class="dropzone">
            <div class="dropzone-icon">📄</div>
            <div class="dropzone-text">Click to choose or drag PDF here</div>
            <div class="dropzone-subtext">PDF only, max size 15MB</div>
            <input type="file" id="fileInput" accept=".pdf" style="display: none">
          </div>
          <div id="file-preview" style="display: none">
            <div class="file-preview">
              <div class="file-icon">📕</div>
              <div class="file-info">
                <div class="file-name" id="preview-name"></div>
                <div class="file-size" id="preview-size"></div>
              </div>
            </div>
          </div>
          <div id="file-error" class="error"></div>
        </div>
        <div id="error-message" class="error" style="text-align: center; margin-bottom: 12px;"></div>
        <button type="submit" id="submitBtn" class="btn" disabled>Upload Lab Report</button>
      </form>
    </div>
    
    <div id="loading-container" class="loading-state">
      <div class="spinner"></div>
      <div class="progress-text">Uploading to secure vault...</div>
      <div class="subtitle">Please do not close this window.</div>
    </div>
    
    <div id="success-container" class="success-state">
      <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
        <circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
        <path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
      </svg>
      <div class="logo" style="background: #10b981; -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 12px;">Upload Complete!</div>
      <div class="subtitle" style="margin-top: 8px; line-height: 1.5;">The report has been securely saved. It will sync automatically to the doctor's system.</div>
      <button onclick="resetForm()" class="btn" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: var(--text); margin-top: 30px; max-width: 240px;">Upload Another File</button>
    </div>
  </div>

  <script>
    const queue = <?!= queueData || '[]' ?>;
    const mainCard = document.getElementById('main-card');
    const queuePanel = document.getElementById('queue-panel');
    const formContainer = document.getElementById('form-container');
    const loadingContainer = document.getElementById('loading-container');
    const successContainer = document.getElementById('success-container');
    
    const form = document.getElementById('upload-form');
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    const filePreview = document.getElementById('file-preview');
    const previewName = document.getElementById('preview-name');
    const previewSize = document.getElementById('preview-size');
    const fileError = document.getElementById('file-error');
    const errorMessage = document.getElementById('error-message');
    const submitBtn = document.getElementById('submitBtn');
    
    const patientCodeInput = document.getElementById('patientCode');
    const phoneInput = document.getElementById('phone');
    const selectionBanner = document.getElementById('selection-banner');
    const selectedText = document.getElementById('selected-text');
    const queueList = document.getElementById('queue-list');
    const queueSearch = document.getElementById('queue-search');
    
    let selectedFile = null;
    let selectedQueueItem = null;
    
    function renderQueue(filterText = '') {
      queueList.innerHTML = '';
      const filtered = queue.filter(item => 
        item.patientCode.toLowerCase().includes(filterText.toLowerCase()) || 
        item.tests.toLowerCase().includes(filterText.toLowerCase())
      );
      
      if (!filtered.length) {
        queueList.innerHTML = '<div class="empty-queue">No pending test orders found.</div>';
        return;
      }
      
      filtered.forEach(item => {
        const div = document.createElement('div');
        div.className = 'queue-item' + (selectedQueueItem && selectedQueueItem.patientCode === item.patientCode ? ' active' : '');
        div.innerHTML = \`
          <div class="queue-item-header">
            <span class="queue-code">\${item.patientCode}</span>
            <span class="queue-badge">Pending</span>
          </div>
          <div class="queue-tests">\${item.tests}</div>
        \`;
        div.addEventListener('click', () => selectQueueItem(item));
        queueList.appendChild(div);
      });
    }
    
    function selectQueueItem(item) {
      selectedQueueItem = item;
      patientCodeInput.value = item.patientCode;
      patientCodeInput.readOnly = true;
      phoneInput.value = item.phone;
      phoneInput.readOnly = true;
      selectedText.textContent = \`Uploading for \${item.patientCode} (\${item.tests.split(',')[0]}...)\`;
      selectionBanner.style.display = 'flex';
      renderQueue(queueSearch.value);
    }
    
    function clearSelection() {
      selectedQueueItem = null;
      patientCodeInput.value = '';
      patientCodeInput.readOnly = false;
      phoneInput.value = '';
      phoneInput.readOnly = false;
      selectionBanner.style.display = 'none';
      renderQueue(queueSearch.value);
    }
    window.clearSelection = clearSelection;
    queueSearch.addEventListener('input', (e) => renderQueue(e.target.value));
    renderQueue();
    
    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });
    
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length) handleFile(e.target.files[0]);
    });
    
    function handleFile(file) {
      fileError.textContent = '';
      if (file.type !== 'application/pdf') {
        fileError.textContent = 'Only PDF documents are allowed.';
        selectedFile = null;
        filePreview.style.display = 'none';
        submitBtn.disabled = true;
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        fileError.textContent = 'Maximum file size is 15MB.';
        selectedFile = null;
        filePreview.style.display = 'none';
        submitBtn.disabled = true;
        return;
      }
      selectedFile = file;
      previewName.textContent = file.name;
      previewSize.textContent = (file.size / 1024 / 1024).toFixed(2) + ' MB';
      filePreview.style.display = 'block';
      submitBtn.disabled = false;
    }
    
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!selectedFile) return;
      const patientCode = patientCodeInput.value.trim();
      const phone = phoneInput.value.trim();
      errorMessage.textContent = '';
      queuePanel.style.display = 'none';
      formContainer.style.display = 'none';
      loadingContainer.style.display = 'block';
      mainCard.style.gridTemplateColumns = '1fr';
      
      const reader = new FileReader();
      reader.onload = function(evt) {
        const base64Data = evt.target.result.split(',')[1];
        google.script.run
          .withSuccessHandler((response) => {
            if (response && response.success) {
              loadingContainer.style.display = 'none';
              successContainer.style.display = 'block';
            } else {
              showError(response ? response.error : 'Unknown upload error');
            }
          })
          .withFailureHandler((err) => {
            showError(err.toString());
          })
          .uploadReport(base64Data, selectedFile.name, patientCode, phone);
      };
      reader.readAsDataURL(selectedFile);
    });
    
    function showError(msg) {
      loadingContainer.style.display = 'none';
      queuePanel.style.display = 'block';
      formContainer.style.display = 'block';
      mainCard.style.gridTemplateColumns = window.innerWidth > 768 ? '1.1fr 0.9fr' : '1fr';
      errorMessage.textContent = 'Upload failed: ' + msg;
    }
    
    function resetForm() {
      form.reset();
      selectedFile = null;
      filePreview.style.display = 'none';
      submitBtn.disabled = true;
      successContainer.style.display = 'none';
      queuePanel.style.display = 'block';
      formContainer.style.display = 'block';
      mainCard.style.gridTemplateColumns = window.innerWidth > 768 ? '1.1fr 0.9fr' : '1fr';
      clearSelection();
      errorMessage.textContent = '';
      google.script.run.withSuccessHandler(html => { window.location.reload(); });
    }
    
    window.addEventListener('resize', () => {
      if (loadingContainer.style.display !== 'block' && successContainer.style.display !== 'block') {
        mainCard.style.gridTemplateColumns = window.innerWidth > 768 ? '1.1fr 0.9fr' : '1fr';
      }
    });
  </script>
</body>
</html>`;
