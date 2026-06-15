// ============================================================
// DocRx — Settings Page
// ============================================================
import { queryOne, queryAll, run } from '../db/index.js';
import { toast } from '../components/Toast.js';
import { navigate, getParams } from '../router.js';
import { showModal } from '../components/Modal.js';

export function renderSettings(container) {
  const s = queryOne('SELECT * FROM settings WHERE id=1') || {};
  const pharmacies = queryAll('SELECT * FROM pharmacies ORDER BY id ASC');
  const diagCenters = queryAll('SELECT * FROM diagnostic_centers ORDER BY id ASC');
  const params = getParams();
  const activeTab = params.tab || 'clinic';

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
      <div class="flex gap-1 mb-6" style="background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:var(--radius-lg);padding:4px;width:fit-content">
        ${[
          { id: 'clinic',   label: 'Clinic Info' },
          { id: 'partners', label: 'Partners & Print' },
          { id: 'security', label: 'Security' },
          { id: 'backup',   label: 'Backup & Restore' },
          { id: 'storage',  label: 'Storage' },
        ].map(tab => `
          <button class="btn ${activeTab === tab.id ? 'btn-primary' : 'btn-ghost'} btn-sm"
                  onclick="window.__switchTab('${tab.id}')" id="tab-${tab.id}">
            ${tab.label}
          </button>
        `).join('')}
      </div>

      <!-- Clinic Info Tab -->
      <div id="panel-clinic" class="${activeTab !== 'clinic' ? 'hidden' : ''}">
        <div class="card card-p">
          <div class="section-title mb-4">Doctor & Clinic Information</div>
          <form id="clinic-form" novalidate>
            <div class="form-grid form-grid-2" style="gap:16px;margin-bottom:16px">
              <div class="form-group">
                <label class="form-label">Doctor First Name <span class="req">*</span></label>
                <input class="input" id="s-doctor_first_name" type="text" value="${e(s.doctor_first_name)}" placeholder="e.g. Rajesh" />
              </div>
              <div class="form-group">
                <label class="form-label">Doctor Last Name <span class="req">*</span></label>
                <input class="input" id="s-doctor_last_name" type="text" value="${e(s.doctor_last_name)}" placeholder="e.g. Kumar" />
              </div>
              <div class="form-group">
                <label class="form-label">Qualifications</label>
                <input class="input" id="s-doctor_qualification" type="text" value="${e(s.doctor_qualification)}" placeholder="MBBS, MD" />
              </div>
              <div class="form-group">
                <label class="form-label">Registration Number <span class="req">*</span></label>
                <input class="input" id="s-doctor_reg_number" type="text" value="${e(s.doctor_reg_number)}" placeholder="AP-MED-12345" />
              </div>
              <div class="form-group">
                <label class="form-label">Clinic Name</label>
                <input class="input" id="s-clinic_name" type="text" value="${e(s.clinic_name)}" placeholder="City Health Clinic" />
              </div>
            </div>
            <div class="form-group mb-4">
              <label class="form-label">Clinic Address <span class="req">*</span></label>
              <textarea class="textarea" id="s-clinic_address" rows="3" placeholder="Full address for prescription letterhead">${e(s.clinic_address)}</textarea>
            </div>
            <div class="form-group mb-4">
              <label class="form-label">Contact Phone <span class="req">*</span></label>
              <input class="input" id="s-clinic_phone" type="tel" value="${e(s.clinic_phone)}" placeholder="9876543210" maxlength="15" />
            </div>
            <div class="form-group mb-4">
              <label class="form-label">Print Footer Message</label>
              <input class="input" id="s-print_footer_message" type="text" value="${e(s.print_footer_message)}" placeholder="Wishing you a swift and complete recovery." />
            </div>
            <button type="submit" class="btn btn-primary">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
              Save Changes
            </button>
          </form>
        </div>
      </div>

      <!-- Partners Tab -->
      <div id="panel-partners" class="${activeTab !== 'partners' ? 'hidden' : ''}">
        
        <!-- Pharmacies -->
        <div class="card card-p mb-4">
          <div class="flex justify-between items-center mb-4">
            <div class="section-title">Medical Shops (Pharmacies)</div>
            <button class="btn btn-secondary btn-sm" onclick="window.__addPartner('pharmacies')">Add Pharmacy</button>
          </div>
          ${pharmacies.length ? `
          <table class="table w-full">
            <thead><tr><th>Name</th><th>Location / Phone</th><th>Default</th><th>Action</th></tr></thead>
            <tbody>
              ${pharmacies.map(p => `
                <tr>
                  <td class="font-semibold">${e(p.name)}</td>
                  <td class="text-sm text-muted">${e(p.address)} <br/> ${e(p.phone)}</td>
                  <td>
                    <input type="radio" name="default_pharmacy" value="${p.id}" ${p.is_default ? 'checked' : ''} onchange="window.__setDefaultPartner('pharmacies', ${p.id})">
                  </td>
                  <td><button class="btn btn-danger btn-sm" onclick="window.__deletePartner('pharmacies', ${p.id})">Delete</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ` : '<p class="text-sm text-muted">No pharmacies added yet.</p>'}
        </div>

        <!-- Diagnostic Centers -->
        <div class="card card-p">
          <div class="flex justify-between items-center mb-4">
            <div class="section-title">Diagnostic Centers</div>
            <button class="btn btn-secondary btn-sm" onclick="window.__addPartner('diagnostic_centers')">Add Center</button>
          </div>
          ${diagCenters.length ? `
          <table class="table w-full">
            <thead><tr><th>Name</th><th>Location / Phone</th><th>Default</th><th>Action</th></tr></thead>
            <tbody>
              ${diagCenters.map(p => `
                <tr>
                  <td class="font-semibold">${e(p.name)}</td>
                  <td class="text-sm text-muted">${e(p.address)} <br/> ${e(p.phone)}</td>
                  <td>
                    <input type="radio" name="default_diag" value="${p.id}" ${p.is_default ? 'checked' : ''} onchange="window.__setDefaultPartner('diagnostic_centers', ${p.id})">
                  </td>
                  <td><button class="btn btn-danger btn-sm" onclick="window.__deletePartner('diagnostic_centers', ${p.id})">Delete</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ` : '<p class="text-sm text-muted">No diagnostic centers added yet.</p>'}
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

    </div>
  `;

  // Tab switching
  window.__switchTab = (tabId) => {
    ['clinic','partners','security','backup','storage'].forEach(t => {
      container.querySelector(`#panel-${t}`)?.classList.toggle('hidden', t !== tabId);
      const btn = container.querySelector(`#tab-${t}`);
      if (btn) btn.className = `btn ${t === tabId ? 'btn-primary' : 'btn-ghost'} btn-sm`;
    });
  };

  // Clinic form save
  container.querySelector('#clinic-form')?.addEventListener('submit', (e) => {
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

  // Partner Management
  window.__addPartner = (table) => {
    const isPharm = table === 'pharmacies';
    const typeLabel = isPharm ? 'Medical Shop (Pharmacy)' : 'Diagnostic Center';
    const bodyHtml = `
      <div style="display: flex; flex-direction: column; gap: 14px;">
        <div class="form-group">
          <label class="form-label" style="font-weight:600; font-size:0.9rem; margin-bottom:6px; display:block;">Name <span style="color:var(--danger)">*</span></label>
          <input type="text" class="input" id="partner-name-input" placeholder="e.g. Care Pharmacy" style="width:100%" required />
        </div>
        <div class="form-group">
          <label class="form-label" style="font-weight:600; font-size:0.9rem; margin-bottom:6px; display:block;">Address / Location (Optional)</label>
          <input type="text" class="input" id="partner-address-input" placeholder="e.g. Hyderabad, TS" style="width:100%" />
        </div>
        <div class="form-group">
          <label class="form-label" style="font-weight:600; font-size:0.9rem; margin-bottom:6px; display:block;">Phone (Optional)</label>
          <input type="text" class="input" id="partner-phone-input" placeholder="e.g. 9876543210" style="width:100%" />
        </div>
      </div>
    `;

    showModal({
      title: `Add ${isPharm ? 'Pharmacy' : 'Diagnostic Center'}`,
      bodyHtml,
      confirmText: 'Add Partner',
      cancelText: 'Cancel',
      onConfirm: (overlay) => {
        const name = overlay.querySelector('#partner-name-input').value.trim();
        if (!name) {
          toast.error('Name is required.');
          return false;
        }
        const address = overlay.querySelector('#partner-address-input').value.trim();
        const phone = overlay.querySelector('#partner-phone-input').value.trim();

        // If it's the first one, make it default
        const count = queryOne(`SELECT COUNT(*) as c FROM ${table}`).c;
        const isDefault = count === 0 ? 1 : 0;
        
        run(`INSERT INTO ${table} (name, address, phone, is_default) VALUES (?, ?, ?, ?)`, [name, address, phone, isDefault]);
        toast.success(`${typeLabel} added.`);
        navigate('/settings?tab=partners');
      }
    });
  };

  window.__deletePartner = (table, id) => {
    if (!confirm('Are you sure you want to delete this partner?')) return;
    run(`DELETE FROM ${table} WHERE id=?`, [id]);
    navigate('/settings?tab=partners');
  };

  window.__setDefaultPartner = (table, id) => {
    run(`UPDATE ${table} SET is_default=0`);
    run(`UPDATE ${table} SET is_default=1 WHERE id=?`, [id]);
    toast.success('Default updated.');
  };
}

function e(val) { return val != null ? String(val).replace(/"/g, '&quot;').replace(/</g, '&lt;') : ''; }
