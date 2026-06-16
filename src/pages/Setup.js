// ============================================================
// DocRx — Setup / Onboarding Page (first run + password reset)
// ============================================================
import { hashPassword, generateSalt, setSession } from '../auth/crypto.js';
import { run, queryOne, importDBBinary } from '../db/index.js';
import { navigate, getParams } from '../router.js';
import { toast } from '../components/Toast.js';
import { initAuth, findBackupFile, downloadBackupFile } from '../backup/drive.js';

export async function renderSetup(container) {
  const params = getParams();
  const isReset = params.mode === 'reset';
  const existing = queryOne('SELECT * FROM settings WHERE id=1');

  // 1. Welcome Onboarding Landing (on fresh load/new devices)
  if (!existing && !isReset && params.step !== 'form') {
    container.innerHTML = `
      <div class="auth-screen">
        <div class="auth-card fade-in" style="max-width:480px; text-align:center;">
          <div class="auth-logo" style="justify-content:center; margin-bottom: 24px;">
            <div class="auth-logo-icon">
              <svg fill="none" stroke="white" viewBox="0 0 24 24" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
              </svg>
            </div>
            <div style="text-align:left">
              <div class="auth-brand">DocRx</div>
              <div class="auth-subtitle-text">Onboarding</div>
            </div>
          </div>

          <h2 style="font-size:1.4rem;margin-bottom:8px;font-weight:700">Welcome to DocRx</h2>
          <p class="text-sm text-muted" style="margin-bottom:32px;line-height:1.6">
            Please sign in with Google to check for existing practice database backups and initialize your system.
          </p>

          <div style="display:flex; flex-direction:column; gap:12px;">
            <button type="button" class="btn btn-primary btn-block btn-lg" id="restore-gdrive-btn" style="background:linear-gradient(135deg, var(--sky-500), var(--teal-600))">
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24" style="margin-right:8px"><path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.488 0-6.322-2.834-6.322-6.322s2.834-6.322 6.322-6.322c1.602 0 3.036.598 4.135 1.583l3.053-3.053C19.262 2.502 15.993 1 12.24 1 6.033 1 12.24s5.033 11.24 11.24 11.24c6.262 0 11.362-5.1 11.362-11.24 0-.765-.09-1.503-.255-2.228H12.24z"/></svg>
              Sign In with Google
            </button>
          </div>
          
          <div id="restore-progress" class="hidden mt-4" style="background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:var(--radius-lg);padding:16px;">
            <div class="splash-spinner" style="margin: 10px auto; width: 24px; height: 24px; border-width: 2.5px;"></div>
            <div class="text-xs text-muted" id="restore-status-text">Preparing Google authentication...</div>
          </div>
        </div>
      </div>
    </div>
    `;

    const restoreBtn = container.querySelector('#restore-gdrive-btn');
    const progressEl = container.querySelector('#restore-progress');
    const statusText = container.querySelector('#restore-status-text');

    restoreBtn?.addEventListener('click', async () => {
      restoreBtn.disabled = true;
      progressEl.classList.remove('hidden');
      statusText.textContent = 'Initializing Google OAuth...';

      const defaultClientId = '219866394954-pg9187uvcq3gu0c4l51728m1u1hojt0c.apps.googleusercontent.com';

      try {
        const client = await initAuth(defaultClientId, async (tokenData) => {
          statusText.textContent = 'Searching for backup on Google Drive...';
          try {
            const cloudFile = await findBackupFile(tokenData.accessToken);
            if (!cloudFile) {
              toast.info('No backup database found. Launching first-time setup...');
              statusText.textContent = 'Redirecting to new practice setup...';
              setTimeout(() => navigate('/setup?step=form'), 2000);
              return;
            }

            statusText.textContent = 'Downloading database backup...';
            const cloudBuffer = await downloadBackupFile(tokenData.accessToken, cloudFile.id);
            
            statusText.textContent = 'Restoring records...';
            await importDBBinary(cloudBuffer);
            
            // Turn on auto-sync automatically for the restored settings
            run("UPDATE settings SET google_sync_enabled=1 WHERE id=1");
            
            toast.success('Database restored successfully from Google Drive!');
            statusText.textContent = 'Redirecting to Login...';
            setTimeout(() => navigate('/login', true), 1500);
          } catch (err) {
            console.error(err);
            toast.error('Restore failed: ' + err.message);
            restoreBtn.disabled = false;
            progressEl.classList.add('hidden');
          }
        });
        client.requestAccessToken({ prompt: 'consent' });
      } catch (err) {
        toast.error('Google authorization failed: ' + err.message);
        restoreBtn.disabled = false;
        progressEl.classList.add('hidden');
      }
    });
    return;
  }

  // 2. Standard Practice Setup / Password Reset Form
  container.innerHTML = `
    <div class="auth-screen">
      <div class="auth-card fade-in" style="max-width:520px">
        <div class="auth-logo">
          <div class="auth-logo-icon">
            <svg fill="none" stroke="white" viewBox="0 0 24 24" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
            </svg>
          </div>
          <div>
            <div class="auth-brand">DocRx</div>
            <div class="auth-subtitle-text">${isReset ? 'Password Reset' : 'First-time Setup'}</div>
          </div>
        </div>

        <h2 style="font-size:1.1rem;margin-bottom:6px">${isReset ? 'Create New Password' : 'Welcome! Set Up Your Practice'}</h2>
        <p class="text-sm text-muted" style="margin-bottom:24px;line-height:1.6">
          ${isReset
            ? 'Enter a new password to restore access.'
            : 'Let\'s configure DocRx with your clinic details. This takes less than 2 minutes.'}
        </p>

        <form id="setup-form" novalidate>
          ${!isReset ? `
          <div style="background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:var(--radius-lg);padding:20px;margin-bottom:20px">
            <div class="section-title" style="margin-bottom:16px">Doctor Information</div>
            <div class="form-grid form-grid-2" style="gap:14px">
              <div class="form-group">
                <label class="form-label">First Name <span class="req">*</span></label>
                <input class="input" id="doctor_first_name" type="text" placeholder="e.g. Rajesh" value="${existing?.doctor_first_name || ''}" required />
              </div>
              <div class="form-group">
                <label class="form-label">Last Name <span class="req">*</span></label>
                <input class="input" id="doctor_last_name" type="text" placeholder="e.g. Kumar" value="${existing?.doctor_last_name || ''}" required />
              </div>
              <div class="form-group">
                <label class="form-label">Qualifications</label>
                <input class="input" id="doctor_qualification" type="text" placeholder="MBBS, MD" value="${existing?.doctor_qualification || ''}" />
              </div>
            </div>
            <div class="form-group mt-3">
              <label class="form-label">Registration Number <span class="req">*</span></label>
              <input class="input" id="doctor_reg_number" type="text" placeholder="AP-MED-12345" value="${existing?.doctor_reg_number || ''}" required />
              <span class="form-hint">Your NMC/State Medical Council registration ID (used for recovery)</span>
            </div>
          </div>

          <div style="background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:var(--radius-lg);padding:20px;margin-bottom:20px">
            <div class="section-title" style="margin-bottom:16px">Clinic Details</div>
            <div class="form-group" style="margin-bottom:14px">
              <label class="form-label">Clinic Name</label>
              <input class="input" id="clinic_name" type="text" placeholder="City Health Clinic" value="${existing?.clinic_name || ''}" />
            </div>
            <div class="form-group" style="margin-bottom:14px">
              <label class="form-label">Address <span class="req">*</span></label>
              <textarea class="textarea" id="clinic_address" placeholder="Flat 2A, Banjara Hills, Hyderabad - 500034" rows="2">${existing?.clinic_address || ''}</textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Phone <span class="req">*</span></label>
              <input class="input" id="clinic_phone" type="text" placeholder="Clinic phone number" value="${existing?.clinic_phone || ''}" />
            </div>
          </div>
          ` : ''}

          <div style="background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:var(--radius-lg);padding:20px;margin-bottom:24px">
            <div class="section-title" style="margin-bottom:16px">${isReset ? 'New Password' : 'Security'}</div>
            <div class="form-group" style="margin-bottom:14px">
              <label class="form-label">${isReset ? 'New Password' : 'Master Password'} <span class="req">*</span></label>
              <div class="input-icon-wrap">
                <svg class="input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                <input class="input" id="new-password" type="password" placeholder="Minimum 8 characters" autocomplete="new-password" />
                <button class="input-icon-right" type="button" id="toggle-np">
                  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                </button>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Confirm Password <span class="req">*</span></label>
              <div class="input-icon-wrap">
                <svg class="input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                <input class="input" id="confirm-password" type="password" placeholder="Repeat password" autocomplete="new-password" />
              </div>
              <div id="pw-match-error" class="form-error hidden">
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                Passwords do not match
              </div>
            </div>

            <!-- Password strength indicator -->
            <div style="margin-top:12px">
              <div class="storage-bar-wrap">
                <div class="storage-bar" id="pw-strength-bar" style="width:0%"></div>
              </div>
              <div class="text-xs text-tertiary mt-1" id="pw-strength-label"></div>
            </div>
          </div>

          <button type="submit" class="btn btn-primary btn-block btn-lg" id="setup-btn">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            ${isReset ? 'Reset Password & Login' : 'Save & Get Started'}
          </button>
        </form>
      </div>
    </div>
  `;

  const newPw = container.querySelector('#new-password');
  const confPw = container.querySelector('#confirm-password');
  const matchErr = container.querySelector('#pw-match-error');
  const strengthBar = container.querySelector('#pw-strength-bar');
  const strengthLabel = container.querySelector('#pw-strength-label');

  // Toggle visibility
  container.querySelector('#toggle-np')?.addEventListener('click', () => {
    newPw.type = newPw.type === 'password' ? 'text' : 'password';
  });

  // Password strength
  function getStrength(pw) {
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  }

  newPw.addEventListener('input', () => {
    const pw = newPw.value;
    const score = getStrength(pw);
    const pct = (score / 5) * 100;
    const colors = ['', '#ef4444', '#f59e0b', '#f59e0b', '#10b981', '#10b981'];
    const labels = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
    if (strengthBar) {
      strengthBar.style.width = pw ? `${pct}%` : '0%';
      strengthBar.style.background = colors[score] || '';
    }
    if (strengthLabel) strengthLabel.textContent = pw ? labels[score] : '';
  });

  // Form submit
  container.querySelector('#setup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pw   = newPw.value;
    const conf = confPw.value;

    if (pw.length < 8) { toast.error('Password must be at least 8 characters.'); return; }
    if (pw !== conf) { matchErr.classList.remove('hidden'); return; }
    matchErr.classList.add('hidden');

    const btn = container.querySelector('#setup-btn');
    btn.disabled = true;
    btn.textContent = 'Setting up...';

    try {
      const salt = generateSalt();
      const hash = await hashPassword(pw, salt);

      if (isReset) {
        run('UPDATE settings SET password_hash=?, password_salt=? WHERE id=1', [hash, salt]);
      } else {
        const docFirst = container.querySelector('#doctor_first_name')?.value?.trim() || '';
        const docLast  = container.querySelector('#doctor_last_name')?.value?.trim() || '';
        const docName  = `Dr. ${docFirst} ${docLast}`.trim();
        const docQual  = container.querySelector('#doctor_qualification')?.value?.trim() || '';
        const docReg   = container.querySelector('#doctor_reg_number')?.value?.trim() || '';
        const cliName  = container.querySelector('#clinic_name')?.value?.trim() || '';
        const cliAddr  = container.querySelector('#clinic_address')?.value?.trim() || '';
        const cliPhone = container.querySelector('#clinic_phone')?.value?.trim() || '';

        if (!docFirst || !docLast || !docReg || !cliAddr || !cliPhone) {
          toast.error('Please fill all required fields.');
          btn.disabled = false;
          btn.innerHTML = `<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> Save & Get Started`;
          return;
        }

        if (existing) {
          run(`UPDATE settings SET doctor_first_name=?, doctor_last_name=?, doctor_name=?, doctor_qualification=?, doctor_reg_number=?,
               clinic_name=?, clinic_address=?, clinic_phone=?, password_hash=?, password_salt=? WHERE id=1`,
            [docFirst, docLast, docName, docQual, docReg, cliName, cliAddr, cliPhone, hash, salt]);
        } else {
          run(`INSERT INTO settings (id, doctor_first_name, doctor_last_name, doctor_name, doctor_qualification, doctor_reg_number,
               clinic_name, clinic_address, clinic_phone, password_hash, password_salt, schema_version, google_client_id)
               VALUES (1,?,?,?,?,?,?,?,?,?,?,4,'219866394954-pg9187uvcq3gu0c4l51728m1u1hojt0c.apps.googleusercontent.com')`,
            [docFirst, docLast, docName, docQual, docReg, cliName, cliAddr, cliPhone, hash, salt]);
        }
      }

      setSession();
      toast.success('Setup complete! Welcome to DocRx.');
      navigate('/dashboard', true);
    } catch (err) {
      toast.error('Setup failed: ' + err.message);
      btn.disabled = false;
    }
  });
}
