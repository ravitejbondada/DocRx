// ============================================================
// DocRx — Setup / Onboarding Page (guided wizard + password reset)
// ============================================================
import { hashPassword, generateSalt, setSession } from '../auth/crypto.js';
import { run, queryOne, importDBBinary } from '../db/index.js';
import { navigate, getParams } from '../router.js';
import { toast } from '../components/Toast.js';
import { initAuth, findBackupFile, downloadBackupFile, getSavedToken } from '../backup/drive.js';
import { MANIFEST_CODE, GS_CODE, HTML_CODE } from './Settings.js';

export async function renderSetup(container) {
  const params = getParams();
  const isReset = params.mode === 'reset';
  const existing = queryOne('SELECT * FROM settings WHERE id=1');

  // --- PASSWORD RESET MODE ---
  if (isReset) {
    container.innerHTML = `
      <div class="auth-screen">
        <div class="auth-card fade-in" style="max-width:520px">
          <div class="auth-logo">
            <div class="auth-logo-icon">
              <svg fill="none" stroke="white" viewBox="0 0 1024 1024" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M 459.646 211.196 C 454.795 212.223, 450.999 214.903, 447.911 219.481 C 445.898 222.465, 444.344 223.392, 438.500 225.097 C 408.166 233.943, 394.821 248.129, 392.496 274 C 391.185 288.593, 397.727 321.212, 410.832 365.432 C 414.351 377.306, 414.549 378.597, 413.248 381.204 C 408.229 391.266, 426.130 430.686, 444.428 449.864 C 463.461 469.813, 494.779 481.459, 520.500 478.153 C 526.770 477.347, 529.141 477.398, 527.917 478.311 C 520.999 483.473, 503.684 499.234, 486.245 516.241 C 459.175 542.641, 451.945 548.895, 436.662 559.130 C 417.249 572.131, 397.658 580.549, 376 585.196 C 360.838 588.449, 308.607 589.046, 296.847 586.101 C 250.088 574.389, 227.887 521.829, 252.240 480.500 C 259.793 467.683, 272.931 456.151, 285.728 451.107 C 297.857 446.326, 302.541 446, 359.030 446 L 412.145 446 407.336 437 L 402.527 428 351.513 428.017 C 311.948 428.031, 299.036 428.345, 293.976 429.418 C 230.272 442.923, 202.594 519.955, 242.757 571.964 C 253.630 586.044, 272.672 598.972, 289.500 603.698 C 297.240 605.872, 351.982 606.779, 367.500 604.991 C 388.160 602.610, 411.099 595.341, 430.750 584.949 C 435.837 582.258, 440 580.172, 440 580.313 C 440 580.454, 437.719 586.836, 434.930 594.495 C 424.061 624.348, 422.034 638.083, 421.501 685.500 C 421.040 726.526, 421.750 736.465, 426.067 749.382 C 435.930 778.895, 455.405 798.753, 484.471 808.931 C 494.404 812.410, 494.663 812.444, 511.500 812.472 C 530.972 812.504, 536.219 811.476, 549.928 804.939 C 572.792 794.038, 590.236 774.606, 597.897 751.500 C 602.545 737.484, 603.258 724.587, 602.697 664.638 C 602.435 636.664, 602.453 612.042, 602.737 609.923 L 603.254 606.071 665.877 605.761 C 722.338 605.481, 729.088 605.276, 734.480 603.678 C 789.298 587.430, 816.043 526.437, 790.468 476 C 779.224 453.827, 760.320 438.206, 735.826 430.849 C 725.839 427.849, 665.001 426.899, 642.372 429.390 C 627.703 431.004, 605.268 436.250, 594.749 440.524 C 591.402 441.884, 588.554 442.885, 588.420 442.748 C 588.287 442.612, 590.832 438.225, 594.077 433 C 606.707 412.660, 614.867 387.225, 611.051 380.095 C 610.375 378.832, 610.969 375.467, 613.113 368.410 C 617.870 352.759, 626.719 317.405, 629.008 304.906 C 637.355 259.331, 627.329 238.429, 591.576 226.869 C 579.987 223.122, 579.154 222.673, 576.311 218.639 C 572.580 213.346, 567.811 210.995, 560.849 211.016 C 549.446 211.052, 542.541 218.782, 543.233 230.739 C 543.826 241, 549.032 246.153, 559.478 246.818 C 566.808 247.284, 574.103 244.063, 576.216 239.425 C 577.644 236.290, 580.113 236.317, 589.824 239.575 C 607.068 245.360, 614.716 252.940, 618.609 268.105 C 621.874 280.823, 617.541 306.299, 603.915 354.500 C 598.885 372.295, 598.370 373.525, 594.066 378.056 C 591.328 380.938, 589.743 384.214, 587.240 392.159 C 576.816 425.253, 559.755 444.592, 533 453.640 C 523.832 456.741, 500.974 456.255, 490.500 452.738 C 464.475 443.998, 447.217 423.542, 436.656 388.920 C 434.443 381.663, 433.466 379.906, 430.178 377.263 C 427.040 374.742, 425.981 372.952, 424.590 367.826 C 423.647 364.347, 422.038 358.800, 421.015 355.500 C 417.405 343.857, 409.067 310.358, 406.952 299 C 400.637 265.091, 408.902 248.495, 436.902 238.862 C 444.548 236.231, 446.409 236.460, 449.684 240.433 C 460.447 253.490, 481.926 246.399, 481.984 229.770 C 482.028 216.930, 471.991 208.584, 459.646 211.196 M 644 447.572 C 592.676 454.155, 551.941 476.888, 502.500 526.541 C 465.644 563.554, 448.368 596.993, 441.484 644.642 C 440.167 653.761, 439.932 663.022, 440.192 695.642 L 440.510 735.500 443.323 743.474 C 456.255 780.128, 492.521 801.454, 527.614 793.041 C 552.814 786.999, 571.654 769.922, 580.831 744.806 L 583.500 737.500 583.786 662.782 L 583.786 662.782" fill="none" stroke="white" />
              </svg>
            </div>
            <div>
              <div class="auth-brand">DocRx</div>
              <div class="auth-subtitle-text">Password Reset</div>
            </div>
          </div>

          <h2 style="font-size:1.1rem;margin-bottom:6px">Create New Password</h2>
          <p class="text-sm text-muted" style="margin-bottom:24px;line-height:1.6">
            Enter a new password to restore access.
          </p>

          <form id="setup-form" novalidate>
            <div style="background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:var(--radius-lg);padding:20px;margin-bottom:24px">
              <div class="form-group" style="margin-bottom:14px">
                <label class="form-label">New Password <span class="req">*</span></label>
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
                  Passwords do not match
                </div>
              </div>
              <div style="margin-top:12px">
                <div class="storage-bar-wrap" style="height:4px">
                  <div class="storage-bar" id="pw-strength-bar" style="width:0%"></div>
                </div>
                <div class="text-xs text-tertiary mt-1" id="pw-strength-label"></div>
              </div>
            </div>

            <button type="submit" class="btn btn-primary btn-block btn-lg" id="setup-btn">
              Reset Password & Login
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

    container.querySelector('#toggle-np')?.addEventListener('click', () => {
      newPw.type = newPw.type === 'password' ? 'text' : 'password';
    });

    newPw.addEventListener('input', () => {
      const score = getStrength(newPw.value);
      const pct = (score / 5) * 100;
      const colors = ['', '#ef4444', '#f59e0b', '#f59e0b', '#10b981', '#10b981'];
      const labels = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
      if (strengthBar) {
        strengthBar.style.width = newPw.value ? `${pct}%` : '0%';
        strengthBar.style.background = colors[score] || '';
      }
      if (strengthLabel) strengthLabel.textContent = newPw.value ? labels[score] : '';
    });

    container.querySelector('#setup-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      if (newPw.value.length < 8) { toast.error('Password must be at least 8 characters.'); return; }
      if (newPw.value !== confPw.value) { matchErr.classList.remove('hidden'); return; }
      matchErr.classList.add('hidden');

      const btn = container.querySelector('#setup-btn');
      btn.disabled = true;
      btn.textContent = 'Resetting...';

      try {
        const salt = generateSalt();
        const hash = await hashPassword(newPw.value, salt);
        run('UPDATE settings SET password_hash=?, password_salt=? WHERE id=1', [hash, salt]);
        setSession();
        toast.success('Password updated successfully!');
        navigate('/dashboard', true);
      } catch (err) {
        toast.error('Reset failed: ' + err.message);
        btn.disabled = false;
        btn.textContent = 'Reset Password & Login';
      }
    });

    return;
  }

  // --- MULTI-STEP GUIDED SETUP WIZARD ---
  let currentStep = 0;

  // Local state to store wizard values
  let docFirst = '';
  let docLast = '';
  let docQual = '';
  let docReg = '';
  let cliName = '';
  let cliAddr = '';
  let cliPhone = '';
  let masterPw = '';
  let confirmPw = '';
  let pharmName = '';
  let pharmAddr = '';
  let pharmPhone = '';
  let diagName = '';
  let diagAddr = '';
  let diagPhone = '';
  let portalUrl = '';
  let googleClientId = (existing && existing.google_client_id) || '219866394954-pg9187uvcq3gu0c4l51728m1u1hojt0c.apps.googleusercontent.com';
  let googleConnected = !!getSavedToken();

  if (existing) {
    docFirst = existing.doctor_first_name || '';
    docLast = existing.doctor_last_name || '';
    docQual = existing.doctor_qualification || '';
    docReg = existing.doctor_reg_number || '';
    cliName = existing.clinic_name || '';
    cliAddr = existing.clinic_address || '';
    cliPhone = existing.clinic_phone || '';
  }

  function getStepTitle(step) {
    const titles = [
      'Welcome & Backup Check',
      'Practice Information',
      'Security Settings',
      'Preferred Partners',
      'Google Drive Sync',
      'Lab Portal Setup',
      'Setup Summary'
    ];
    return titles[step] || '';
  }

  function renderWizard() {
    container.innerHTML = `
      <div class="auth-screen">
        <div class="auth-card fade-in" style="max-width:580px; width:100%;">
          <div class="auth-logo" style="justify-content:center; margin-bottom: 20px;">
            <div class="auth-logo-icon">
              <svg fill="none" stroke="white" viewBox="0 0 1024 1024" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" style="width: 28px; height: 28px;">
                <path d="M 459.646 211.196 C 454.795 212.223, 450.999 214.903, 447.911 219.481 C 445.898 222.465, 444.344 223.392, 438.500 225.097 C 408.166 233.943, 394.821 248.129, 392.496 274 C 391.185 288.593, 397.727 321.212, 410.832 365.432 C 414.351 377.306, 414.549 378.597, 413.248 381.204 C 408.229 391.266, 426.130 430.686, 444.428 449.864 C 463.461 469.813, 494.779 481.459, 520.500 478.153 C 526.770 477.347, 529.141 477.398, 527.917 478.311 C 520.999 483.473, 503.684 499.234, 486.245 516.241 C 459.175 542.641, 451.945 548.895, 436.662 559.130 C 417.249 572.131, 397.658 580.549, 376 585.196 C 360.838 588.449, 308.607 589.046, 296.847 586.101 C 250.088 574.389, 227.887 521.829, 252.240 480.500 C 259.793 467.683, 272.931 456.151, 285.728 451.107 C 297.857 446.326, 302.541 446, 359.030 446 L 412.145 446 407.336 437 L 402.527 428 351.513 428.017 C 311.948 428.031, 299.036 428.345, 293.976 429.418 C 230.272 442.923, 202.594 519.955, 242.757 571.964 C 253.630 586.044, 272.672 598.972, 289.500 603.698 C 297.240 605.872, 351.982 606.779, 367.500 604.991 C 388.160 602.610, 411.099 595.341, 430.750 584.949 C 435.837 582.258, 440 580.172, 440 580.313 C 440 580.454, 437.719 586.836, 434.930 594.495 C 424.061 624.348, 422.034 638.083, 421.501 685.500 C 421.040 726.526, 421.750 736.465, 426.067 749.382 C 435.930 778.895, 455.405 798.753, 484.471 808.931 C 494.404 812.410, 494.663 812.444, 511.500 812.472 C 530.972 812.504, 536.219 811.476, 549.928 804.939 C 572.792 794.038, 590.236 774.606, 597.897 751.500 C 602.545 737.484, 603.258 724.587, 602.697 664.638 C 602.435 636.664, 602.453 612.042, 602.737 609.923 L 603.254 606.071 665.877 605.761 C 722.338 605.481, 729.088 605.276, 734.480 603.678 C 789.298 587.430, 816.043 526.437, 790.468 476 C 779.224 453.827, 760.320 438.206, 735.826 430.849 C 725.839 427.849, 665.001 426.899, 642.372 429.390 C 627.703 431.004, 605.268 436.250, 594.749 440.524 C 591.402 441.884, 588.554 442.885, 588.420 442.748 C 588.287 442.612, 590.832 438.225, 594.077 433 C 606.707 412.660, 614.867 387.225, 611.051 380.095 C 610.375 378.832, 610.969 375.467, 613.113 368.410 C 617.870 352.759, 626.719 317.405, 629.008 304.906 C 637.355 259.331, 627.329 238.429, 591.576 226.869 C 579.987 223.122, 579.154 222.673, 576.311 218.639 C 572.580 213.346, 567.811 210.995, 560.849 211.016 C 549.446 211.052, 542.541 218.782, 543.233 230.739 C 543.826 241, 549.032 246.153, 559.478 246.818 C 566.808 247.284, 574.103 244.063, 576.216 239.425 C 577.644 236.290, 580.113 236.317, 589.824 239.575 C 607.068 245.360, 614.716 252.940, 618.609 268.105 C 621.874 280.823, 617.541 306.299, 603.915 354.500 C 598.885 372.295, 598.370 373.525, 594.066 378.056 C 591.328 380.938, 589.743 384.214, 587.240 392.159 C 576.816 425.253, 559.755 444.592, 533 453.640 C 523.832 456.741, 500.974 456.255, 490.500 452.738 C 464.475 443.998, 447.217 423.542, 436.656 388.920 C 434.443 381.663, 433.466 379.906, 430.178 377.263 C 427.040 374.742, 425.981 372.952, 424.590 367.826 C 423.647 364.347, 422.038 358.800, 421.015 355.500 C 417.405 343.857, 409.067 310.358, 406.952 299 C 400.637 265.091, 408.902 248.495, 436.902 238.862 C 444.548 236.231, 446.409 236.460, 449.684 240.433 C 460.447 253.490, 481.926 246.399, 481.984 229.770 C 482.028 216.930, 471.991 208.584, 459.646 211.196 M 644 447.572 C 592.676 454.155, 551.941 476.888, 502.500 526.541 C 465.644 563.554, 448.368 596.993, 441.484 644.642 C 440.167 653.761, 439.932 663.022, 440.192 695.642 L 440.510 735.500 443.323 743.474 C 456.255 780.128, 492.521 801.454, 527.614 793.041 C 552.814 786.999, 571.654 769.922, 580.831 744.806 L 583.500 737.500 583.786 662.782 L 583.786 662.782" fill="none" stroke="white" />
              </svg>
            </div>
            <div style="text-align:left">
              <div class="auth-brand">DocRx</div>
              <div class="auth-subtitle-text">Practice Setup</div>
            </div>
          </div>

          <!-- Progress Bar -->
          <div style="margin-bottom: 24px;">
            <div style="display:flex; justify-content:space-between; font-size: 0.75rem; color: var(--text-tertiary); margin-bottom: 4px;">
              <span>Step ${currentStep} of 6: ${getStepTitle(currentStep)}</span>
              <span>${Math.round((currentStep / 6) * 100)}%</span>
            </div>
            <div class="storage-bar-wrap" style="height: 6px;">
              <div class="storage-bar" style="width: ${(currentStep / 6) * 100}%; background: linear-gradient(90deg, var(--sky-500), var(--teal-600));"></div>
            </div>
          </div>

          <div id="step-content-container"></div>
        </div>
      </div>
    `;

    renderStepContent();
  }

  function renderStepContent() {
    const stepContainer = container.querySelector('#step-content-container');
    if (!stepContainer) return;

    if (currentStep === 0) {
      // Step 0: Welcome & Google Backup check
      stepContainer.innerHTML = `
        <h2 style="font-size:1.3rem;margin-bottom:8px;font-weight:700">Welcome to DocRx</h2>
        <p class="text-sm text-muted" style="margin-bottom:24px;line-height:1.6">
          DocRx stores all records securely on your local device. Sign in with Google to check for existing practice database backups and restore them, or start fresh.
        </p>

        <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:24px;">
          <button type="button" class="btn btn-primary btn-block btn-lg" id="restore-gdrive-btn" style="background:linear-gradient(135deg, var(--sky-500), var(--teal-600))">
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24" style="margin-right:8px"><path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.488 0-6.322-2.834-6.322-6.322s2.834-6.322 6.322-6.322c1.602 0 3.036.598 4.135 1.583l3.053-3.053C19.262 2.502 15.993 1 12.24 1 6.033 1 12.24s5.033 11.24 11.24 11.24c6.262 0 11.362-5.1 11.362-11.24 0-.765-.09-1.503-.255-2.228H12.24z"/></svg>
            Sign In with Google
          </button>
        </div>

        <div id="restore-progress" class="hidden mt-4 mb-4" style="background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:var(--radius-lg);padding:16px;">
          <div class="splash-spinner" style="margin: 10px auto; width: 24px; height: 24px; border-width: 2.5px;"></div>
          <div class="text-xs text-muted" id="restore-status-text">Preparing Google authentication...</div>
        </div>

        <button type="button" class="btn btn-primary btn-block btn-lg" id="next-btn">Start Fresh Clinic Setup &rarr;</button>
      `;

      const restoreBtn = stepContainer.querySelector('#restore-gdrive-btn');
      const progressEl = stepContainer.querySelector('#restore-progress');
      const statusText = stepContainer.querySelector('#restore-status-text');

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
                setTimeout(() => {
                  currentStep = 1;
                  renderWizard();
                }, 1500);
                return;
              }

              statusText.textContent = 'Downloading database backup...';
              const cloudBuffer = await downloadBackupFile(tokenData.accessToken, cloudFile.id);
              
              statusText.textContent = 'Restoring records...';
              await importDBBinary(cloudBuffer);
              
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

      stepContainer.querySelector('#next-btn')?.addEventListener('click', () => {
        currentStep = 1;
        renderWizard();
      });

    } else if (currentStep === 1) {
      // Step 1: Doctor & Clinic Info
      stepContainer.innerHTML = `
        <h2 style="font-size:1.2rem;margin-bottom:8px;font-weight:700">Practice Details</h2>
        <p class="text-xs text-muted mb-4">Please specify your credentials and contact details for the prescription letterhead.</p>

        <div style="background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:var(--radius-lg);padding:16px;margin-bottom:16px">
          <div class="section-title text-sm font-semibold mb-3" style="margin-bottom:10px">Doctor Information</div>
          <div class="form-grid form-grid-2" style="gap:12px">
            <div class="form-group">
              <label class="form-label">First Name <span class="req">*</span></label>
              <input class="input" id="doctor_first_name" type="text" placeholder="e.g. Rajesh" value="${docFirst}" required />
            </div>
            <div class="form-group">
              <label class="form-label">Last Name <span class="req">*</span></label>
              <input class="input" id="doctor_last_name" type="text" placeholder="e.g. Kumar" value="${docLast}" required />
            </div>
            <div class="form-group">
              <label class="form-label">Qualifications</label>
              <input class="input" id="doctor_qualification" type="text" placeholder="MBBS, MD" value="${docQual}" />
            </div>
            <div class="form-group">
              <label class="form-label">Registration No. <span class="req">*</span></label>
              <input class="input" id="doctor_reg_number" type="text" placeholder="AP-MED-12345" value="${docReg}" required />
            </div>
          </div>
        </div>

        <div style="background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:var(--radius-lg);padding:16px;margin-bottom:20px">
          <div class="section-title text-sm font-semibold mb-3" style="margin-bottom:10px">Clinic Information</div>
          <div class="form-group mb-3">
            <label class="form-label">Clinic Name</label>
            <input class="input" id="clinic_name" type="text" placeholder="City Health Clinic" value="${cliName}" />
          </div>
          <div class="form-group mb-3">
            <label class="form-label">Address <span class="req">*</span></label>
            <textarea class="textarea" id="clinic_address" placeholder="Banjara Hills, Hyderabad" rows="2" required>${cliAddr}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Phone <span class="req">*</span></label>
            <input class="input" id="clinic_phone" type="text" placeholder="Contact number" value="${cliPhone}" required />
          </div>
        </div>

        <div class="flex gap-2">
          <button type="button" class="btn btn-secondary" id="back-btn">&larr; Back</button>
          <button type="button" class="btn btn-primary" style="flex:1" id="next-btn">Continue &rarr;</button>
        </div>
      `;

      stepContainer.querySelector('#back-btn')?.addEventListener('click', () => {
        currentStep = 0;
        renderWizard();
      });

      stepContainer.querySelector('#next-btn')?.addEventListener('click', () => {
        docFirst = stepContainer.querySelector('#doctor_first_name').value.trim();
        docLast = stepContainer.querySelector('#doctor_last_name').value.trim();
        docQual = stepContainer.querySelector('#doctor_qualification').value.trim();
        docReg = stepContainer.querySelector('#doctor_reg_number').value.trim();
        cliName = stepContainer.querySelector('#clinic_name').value.trim();
        cliAddr = stepContainer.querySelector('#clinic_address').value.trim();
        cliPhone = stepContainer.querySelector('#clinic_phone').value.trim();

        if (!docFirst || !docLast || !docReg || !cliAddr || !cliPhone) {
          toast.error('Please fill in all required fields.');
          return;
        }

        currentStep = 2;
        renderWizard();
      });

    } else if (currentStep === 2) {
      // Step 2: Password Security
      stepContainer.innerHTML = `
        <h2 style="font-size:1.2rem;margin-bottom:8px;font-weight:700">Security Credentials</h2>
        <p class="text-xs text-muted mb-4">Set up a master password to secure your local database records.</p>

        <div style="background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:var(--radius-lg);padding:16px;margin-bottom:20px">
          <div class="form-group mb-3">
            <label class="form-label">Master Password <span class="req">*</span></label>
            <input class="input" id="new-password" type="password" placeholder="Minimum 8 characters" value="${masterPw}" />
          </div>
          <div class="form-group mb-3">
            <label class="form-label">Confirm Password <span class="req">*</span></label>
            <input class="input" id="confirm-password" type="password" placeholder="Repeat password" value="${confirmPw}" />
          </div>
          <div id="pw-match-error" class="form-error hidden mb-2">
            Passwords do not match
          </div>
          <div>
            <div class="storage-bar-wrap" style="height:4px">
              <div class="storage-bar" id="pw-strength-bar" style="width:0%"></div>
            </div>
            <div class="text-xs text-tertiary mt-1" id="pw-strength-label"></div>
          </div>
        </div>

        <div class="flex gap-2">
          <button type="button" class="btn btn-secondary" id="back-btn">&larr; Back</button>
          <button type="button" class="btn btn-primary" style="flex:1" id="next-btn">Continue &rarr;</button>
        </div>
      `;

      const newPw = stepContainer.querySelector('#new-password');
      const confPw = stepContainer.querySelector('#confirm-password');
      const strengthBar = stepContainer.querySelector('#pw-strength-bar');
      const strengthLabel = stepContainer.querySelector('#pw-strength-label');
      const matchErr = stepContainer.querySelector('#pw-match-error');

      const triggerStrength = (val) => {
        const score = getStrength(val);
        const pct = (score / 5) * 100;
        const colors = ['', '#ef4444', '#f59e0b', '#f59e0b', '#10b981', '#10b981'];
        const labels = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
        if (strengthBar) {
          strengthBar.style.width = val ? `${pct}%` : '0%';
          strengthBar.style.background = colors[score] || '';
        }
        if (strengthLabel) strengthLabel.textContent = val ? labels[score] : '';
      };

      triggerStrength(masterPw);

      newPw.addEventListener('input', (e) => {
        triggerStrength(e.target.value);
      });

      stepContainer.querySelector('#back-btn')?.addEventListener('click', () => {
        currentStep = 1;
        renderWizard();
      });

      stepContainer.querySelector('#next-btn')?.addEventListener('click', () => {
        masterPw = newPw.value;
        confirmPw = confPw.value;

        if (masterPw.length < 8) {
          toast.error('Password must be at least 8 characters.');
          return;
        }
        if (masterPw !== confirmPw) {
          matchErr.classList.remove('hidden');
          return;
        }
        matchErr.classList.add('hidden');

        currentStep = 3;
        renderWizard();
      });

    } else if (currentStep === 3) {
      // Step 3: Preferred Partners
      stepContainer.innerHTML = `
        <h2 style="font-size:1.2rem;margin-bottom:8px;font-weight:700">Preferred Partners</h2>
        <p class="text-xs text-muted mb-4">You can pre-configure your primary medical shop and diagnostic center (optional, can skip).</p>

        <div style="background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:var(--radius-lg);padding:16px;margin-bottom:16px">
          <div class="section-title text-sm font-semibold mb-3" style="margin-bottom:10px">Primary Medical Shop (Pharmacy)</div>
          <div class="form-grid form-grid-2" style="gap:12px">
            <div class="form-group" style="grid-column: span 2">
              <label class="form-label">Pharmacy Name</label>
              <input class="input" id="pharmacy_name" type="text" placeholder="e.g. Apollo Pharmacy" value="${pharmName}" />
            </div>
            <div class="form-group">
              <label class="form-label">Location/Address</label>
              <input class="input" id="pharmacy_address" type="text" placeholder="e.g. Hyderabad" value="${pharmAddr}" />
            </div>
            <div class="form-group">
              <label class="form-label">Phone</label>
              <input class="input" id="pharmacy_phone" type="text" placeholder="e.g. 9876543210" value="${pharmPhone}" />
            </div>
          </div>
        </div>

        <div style="background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:var(--radius-lg);padding:16px;margin-bottom:20px">
          <div class="section-title text-sm font-semibold mb-3" style="margin-bottom:10px">Primary Diagnostic Lab</div>
          <div class="form-grid form-grid-2" style="gap:12px">
            <div class="form-group" style="grid-column: span 2">
              <label class="form-label">Lab Center Name</label>
              <input class="input" id="diag_name" type="text" placeholder="e.g. Vijaya Diagnostics" value="${diagName}" />
            </div>
            <div class="form-group">
              <label class="form-label">Location/Address</label>
              <input class="input" id="diag_address" type="text" placeholder="e.g. Hyderabad" value="${diagAddr}" />
            </div>
            <div class="form-group">
              <label class="form-label">Phone</label>
              <input class="input" id="diag_phone" type="text" placeholder="e.g. 9876543210" value="${diagPhone}" />
            </div>
          </div>
        </div>

        <div class="flex gap-2">
          <button type="button" class="btn btn-secondary" id="back-btn">&larr; Back</button>
          <button type="button" class="btn btn-primary" style="flex:1" id="next-btn">Continue &rarr;</button>
        </div>
      `;

      stepContainer.querySelector('#back-btn')?.addEventListener('click', () => {
        currentStep = 2;
        renderWizard();
      });

      stepContainer.querySelector('#next-btn')?.addEventListener('click', () => {
        pharmName = stepContainer.querySelector('#pharmacy_name').value.trim();
        pharmAddr = stepContainer.querySelector('#pharmacy_address').value.trim();
        pharmPhone = stepContainer.querySelector('#pharmacy_phone').value.trim();
        diagName = stepContainer.querySelector('#diag_name').value.trim();
        diagAddr = stepContainer.querySelector('#diag_address').value.trim();
        diagPhone = stepContainer.querySelector('#diag_phone').value.trim();

        currentStep = 4;
        renderWizard();
      });

    } else if (currentStep === 4) {
      // Step 4: Google Drive Sync Connection
      stepContainer.innerHTML = `
        <h2 style="font-size:1.2rem;margin-bottom:8px;font-weight:700">Google Drive Backup & Sync</h2>
        <p class="text-xs text-muted mb-4">
          Connect your personal Google Drive to enable real-time cloud backup, multi-device synchronization, and diagnostic lab portal integrations.
        </p>

        <div style="background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:var(--radius-lg);padding:16px;margin-bottom:20px">
          <div class="form-group mb-4">
            <label class="form-label">Google OAuth Client ID</label>
            <input type="text" class="input" id="wizard-client-id" placeholder="Paste your Google OAuth Client ID..." value="${googleClientId}" style="width:100%" />
            <p class="text-xs text-muted mt-1" style="font-size:0.7rem;">Default ID is provided. You can change this later in Settings.</p>
          </div>

          <div style="display:flex; flex-direction:column; gap:12px; margin-top:16px;">
            <button type="button" class="btn ${googleConnected ? 'btn-secondary' : 'btn-primary'} btn-block" id="wizard-connect-btn">
              ${googleConnected ? '✅ Google Drive Connected' : '🔑 Connect Google Drive'}
            </button>
          </div>

          <div id="wizard-sync-status" class="hidden mt-3 alert alert-info" style="font-size:0.8rem; padding:8px 12px; margin-bottom:0;">
            Ready to connect.
          </div>
        </div>

        <div class="flex gap-2">
          <button type="button" class="btn btn-secondary" id="back-btn">&larr; Back</button>
          <button type="button" class="btn btn-primary" style="flex:1" id="next-btn">Continue &rarr;</button>
          <button type="button" class="btn btn-ghost" id="skip-btn">Skip Setup</button>
        </div>
      `;

      const connectBtn = stepContainer.querySelector('#wizard-connect-btn');
      const statusBox = stepContainer.querySelector('#wizard-sync-status');
      const clientIdInput = stepContainer.querySelector('#wizard-client-id');

      connectBtn?.addEventListener('click', async () => {
        const cid = clientIdInput.value.trim();
        if (!cid) {
          toast.error('Please enter a Google OAuth Client ID.');
          return;
        }

        googleClientId = cid;
        connectBtn.disabled = true;
        connectBtn.textContent = 'Connecting...';
        statusBox.classList.remove('hidden');
        statusBox.textContent = 'Initializing Google Auth popup...';

        try {
          const client = await initAuth(cid, (tokenData) => {
            googleConnected = true;
            connectBtn.disabled = false;
            connectBtn.className = 'btn btn-secondary btn-block';
            connectBtn.textContent = '✅ Google Drive Connected';
            statusBox.className = 'mt-3 alert alert-success';
            statusBox.textContent = 'Successfully authorized Google Drive Sync!';
            toast.success('Google Drive authorized successfully!');
          });
          client.requestAccessToken({ prompt: 'consent' });
        } catch (err) {
          googleConnected = false;
          connectBtn.disabled = false;
          connectBtn.textContent = '🔑 Connect Google Drive';
          statusBox.className = 'mt-3 alert alert-danger';
          statusBox.textContent = 'Connection failed: ' + err.message;
          toast.error('Authorization failed: ' + err.message);
        }
      });

      stepContainer.querySelector('#back-btn')?.addEventListener('click', () => {
        currentStep = 3;
        renderWizard();
      });

      const handleAdvance = () => {
        googleClientId = clientIdInput.value.trim();
        currentStep = 5;
        renderWizard();
      };

      stepContainer.querySelector('#next-btn')?.addEventListener('click', () => {
        if (!googleConnected) {
          if (confirm('⚠ Google Drive is not connected. Real-time sync and Lab Portal report uploads will be disabled until connected. Proceed?')) {
            handleAdvance();
          }
        } else {
          handleAdvance();
        }
      });

      stepContainer.querySelector('#skip-btn')?.addEventListener('click', () => {
        handleAdvance();
      });

    } else if (currentStep === 5) {
      // Step 5: Complete Apps Script Lab Portal Setup Guide
      stepContainer.innerHTML = `
        <h2 style="font-size:1.2rem;margin-bottom:8px;font-weight:700">Lab Portal Integration</h2>
        <p class="text-xs text-muted mb-3">Set up a secure portal for diagnostic labs to upload patient reports directly to your Google Drive.</p>

        <div style="background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:var(--radius-lg);padding:16px;margin-bottom:16px; font-size:0.85rem; line-height:1.5;">
          <div style="font-weight:700; margin-bottom:8px; color:var(--text-primary);">Google Apps Script Deployment Steps:</div>
          <ol style="padding-left:16px; display:flex; flex-direction:column; gap:12px; margin:0;">
            <li>Open <a href="https://script.google.com" target="_blank" style="color:var(--teal-400); text-decoration:underline;">Google Apps Script</a> and click <strong>New Project</strong>.</li>
            <li>Rename project to <code>DocRx Lab Portal</code>.</li>
            <li>
              Replace manifest (<strong>appsscript.json</strong>):
              <button class="btn btn-ghost btn-xs" id="w-copy-manifest" style="margin-left:8px; background:rgba(255,255,255,0.05);">Copy Manifest</button>
            </li>
            <li>
              Replace code (<strong>Code.gs</strong>):
              <button class="btn btn-ghost btn-xs" id="w-copy-code" style="margin-left:8px; background:rgba(255,255,255,0.05);">Copy Code</button>
            </li>
            <li>
              Create HTML file named exactly <strong>Upload</strong> and paste:
              <button class="btn btn-ghost btn-xs" id="w-copy-html" style="margin-left:8px; background:rgba(255,255,255,0.05);">Copy HTML</button>
            </li>
            <li>Click <strong>Deploy</strong> -> <strong>New deployment</strong>. Select type <strong>Web app</strong>. Execute as: <strong>Me</strong>, Access: <strong>Anyone</strong>.</li>
            <li>Copy the <strong>Web App URL</strong> and paste it below.</li>
          </ol>
        </div>

        <div class="form-group mb-4">
          <label class="form-label">Apps Script Web App URL</label>
          <input type="text" class="input" id="portal_url" placeholder="https://script.google.com/macros/s/.../exec" value="${portalUrl}" style="width:100%" />
        </div>

        <div class="flex gap-2">
          <button type="button" class="btn btn-secondary" id="back-btn">&larr; Back</button>
          <button type="button" class="btn btn-primary" style="flex:1" id="next-btn">Continue &rarr;</button>
          <button type="button" class="btn btn-ghost" id="skip-btn">Skip Portal</button>
        </div>
      `;

      stepContainer.querySelector('#w-copy-manifest')?.addEventListener('click', () => {
        navigator.clipboard.writeText(MANIFEST_CODE).then(() => toast.success('appsscript.json copied!'));
      });
      stepContainer.querySelector('#w-copy-code')?.addEventListener('click', () => {
        navigator.clipboard.writeText(GS_CODE).then(() => toast.success('Code.gs copied!'));
      });
      stepContainer.querySelector('#w-copy-html')?.addEventListener('click', () => {
        navigator.clipboard.writeText(HTML_CODE).then(() => toast.success('Upload.html copied!'));
      });

      stepContainer.querySelector('#back-btn')?.addEventListener('click', () => {
        currentStep = 4;
        renderWizard();
      });

      const handleAdvance = () => {
        portalUrl = stepContainer.querySelector('#portal_url').value.trim();
        currentStep = 6;
        renderWizard();
      };

      stepContainer.querySelector('#next-btn')?.addEventListener('click', handleAdvance);
      stepContainer.querySelector('#skip-btn')?.addEventListener('click', () => {
        stepContainer.querySelector('#portal_url').value = '';
        handleAdvance();
      });

    } else if (currentStep === 6) {
      // Step 6: Setup Summary & Complete
      stepContainer.innerHTML = `
        <h2 style="font-size:1.2rem;margin-bottom:8px;font-weight:700">Setup Summary</h2>
        <p class="text-xs text-muted mb-4">Review your practice credentials. Click "Save & Get Started" to launch the DocRx dashboard.</p>

        <div style="background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:var(--radius-lg);padding:16px;margin-bottom:24px; font-size:0.85rem; line-height:1.6; max-height: 240px; overflow-y: auto;">
          <div style="margin-bottom:8px"><strong>Doctor Name:</strong> Dr. ${docFirst} ${docLast} ${docQual ? `(${docQual})` : ''}</div>
          <div style="margin-bottom:8px"><strong>Reg Number:</strong> ${docReg}</div>
          <div style="margin-bottom:8px"><strong>Clinic Name:</strong> ${cliName || 'Not configured'}</div>
          <div style="margin-bottom:8px"><strong>Clinic Address:</strong> ${cliAddr}</div>
          <div style="margin-bottom:8px"><strong>Clinic Phone:</strong> ${cliPhone}</div>
          <div class="print-footer-divider" style="margin: 10px 0;"></div>
          <div style="margin-bottom:8px"><strong>Default Pharmacy:</strong> ${pharmName ? `${pharmName} (${pharmAddr || 'No Address'}, ${pharmPhone || 'No Phone'})` : 'None'}</div>
          <div style="margin-bottom:8px"><strong>Default Lab:</strong> ${diagName ? `${diagName} (${diagAddr || 'No Address'}, ${diagPhone || 'No Phone'})` : 'None'}</div>
          <div style="margin-bottom:8px"><strong>Google Sync Connected:</strong> ${googleConnected ? 'Yes' : 'No'}</div>
          <div style="margin-bottom:8px; word-break:break-all;"><strong>Lab Portal URL:</strong> ${portalUrl || 'None'}</div>
        </div>

        <div class="flex gap-2">
          <button type="button" class="btn btn-secondary" id="back-btn">&larr; Back</button>
          <button type="button" class="btn btn-primary" style="flex:1" id="setup-btn">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="margin-right:4px"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            Save & Get Started
          </button>
        </div>
      `;

      stepContainer.querySelector('#back-btn')?.addEventListener('click', () => {
        currentStep = 5;
        renderWizard();
      });

      stepContainer.querySelector('#setup-btn')?.addEventListener('click', async () => {
        const btn = stepContainer.querySelector('#setup-btn');
        btn.disabled = true;
        btn.textContent = 'Saving details...';

        try {
          const salt = generateSalt();
          const hash = await hashPassword(masterPw, salt);
          const docName = `Dr. ${docFirst} ${docLast}`.trim();

          // 1. Save Settings
          if (existing) {
            run(`UPDATE settings SET doctor_first_name=?, doctor_last_name=?, doctor_name=?, doctor_qualification=?, doctor_reg_number=?,
                 clinic_name=?, clinic_address=?, clinic_phone=?, password_hash=?, password_salt=?, google_client_id=?, google_sync_enabled=? WHERE id=1`,
              [docFirst, docLast, docName, docQual, docReg, cliName, cliAddr, cliPhone, hash, salt, googleClientId, googleConnected ? 1 : 0]);
          } else {
            run(`INSERT INTO settings (id, doctor_first_name, doctor_last_name, doctor_name, doctor_qualification, doctor_reg_number,
                 clinic_name, clinic_address, clinic_phone, password_hash, password_salt, schema_version, google_client_id, google_sync_enabled)
                 VALUES (1,?,?,?,?,?,?,?,?,?,?,4,?,?)`,
              [docFirst, docLast, docName, docQual, docReg, cliName, cliAddr, cliPhone, hash, salt, googleClientId, googleConnected ? 1 : 0]);
          }

          // 2. Save Partners
          if (pharmName) {
            const pharmId = crypto.randomUUID();
            run(`INSERT INTO pharmacies (id, name, address, phone, is_default, updated_at, deleted)
                 VALUES (?, ?, ?, ?, 1, datetime('now','localtime'), 0)`,
              [pharmId, pharmName, pharmAddr || null, pharmPhone || null]);
          }
          if (diagName) {
            const diagId = crypto.randomUUID();
            run(`INSERT INTO diagnostic_centers (id, name, address, phone, is_default, updated_at, deleted)
                 VALUES (?, ?, ?, ?, 1, datetime('now','localtime'), 0)`,
              [diagId, diagName, diagAddr || null, diagPhone || null]);
          }

          // 3. Save Lab Portal URL and Shorten
          if (portalUrl) {
            localStorage.setItem('docrx_portal_url', portalUrl);
            // Trigger background short URL generation
            try {
              fetch(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(portalUrl)}`)
                .then(res => res.ok ? res.text() : Promise.reject())
                .then(text => {
                  if (text.startsWith('http')) localStorage.setItem('docrx_portal_short_url', text.trim());
                })
                .catch(() => {
                  fetch(`https://da.gd/s?url=${encodeURIComponent(portalUrl)}`)
                    .then(res => res.ok ? res.text() : Promise.reject())
                    .then(text => {
                      if (text.trim().startsWith('http')) localStorage.setItem('docrx_portal_short_url', text.trim());
                    })
                    .catch(() => {});
                });
            } catch (urlErr) {
              console.warn("Failed to shorten portal URL during setup:", urlErr);
            }
          }

          setSession();
          toast.success('Setup completed! Welcome to DocRx.');
          navigate('/dashboard', true);
        } catch (err) {
          toast.error('Setup failed: ' + err.message);
          btn.disabled = false;
          btn.innerHTML = `<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="margin-right:4px"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> Save & Get Started`;
        }
      });
    }
  }

  // Start the wizard flow
  renderWizard();
}

function getStrength(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}
