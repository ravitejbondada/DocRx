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
              <svg fill="none" stroke="white" viewBox="0 0 1024 1024" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M 459.646 211.196 C 454.795 212.223, 450.999 214.903, 447.911 219.481 C 445.898 222.465, 444.344 223.392, 438.500 225.097 C 408.166 233.943, 394.821 248.129, 392.496 274 C 391.185 288.593, 397.727 321.212, 410.832 365.432 C 414.351 377.306, 414.549 378.597, 413.248 381.204 C 408.229 391.266, 426.130 430.686, 444.428 449.864 C 463.461 469.813, 494.779 481.459, 520.500 478.153 C 526.770 477.347, 529.141 477.398, 527.917 478.311 C 520.999 483.473, 503.684 499.234, 486.245 516.241 C 459.175 542.641, 451.945 548.895, 436.662 559.130 C 417.249 572.131, 397.658 580.549, 376 585.196 C 360.838 588.449, 308.607 589.046, 296.847 586.101 C 250.088 574.389, 227.887 521.829, 252.240 480.500 C 259.793 467.683, 272.931 456.151, 285.728 451.107 C 297.857 446.326, 302.541 446, 359.030 446 L 412.145 446 407.336 437 L 402.527 428 351.513 428.017 C 311.948 428.031, 299.036 428.345, 293.976 429.418 C 230.272 442.923, 202.594 519.955, 242.757 571.964 C 253.630 586.044, 272.672 598.972, 289.500 603.698 C 297.240 605.872, 351.982 606.779, 367.500 604.991 C 388.160 602.610, 411.099 595.341, 430.750 584.949 C 435.837 582.258, 440 580.172, 440 580.313 C 440 580.454, 437.719 586.836, 434.930 594.495 C 424.061 624.348, 422.034 638.083, 421.501 685.500 C 421.040 726.526, 421.750 736.465, 426.067 749.382 C 435.930 778.895, 455.405 798.753, 484.471 808.931 C 494.404 812.410, 494.663 812.444, 511.500 812.472 C 530.972 812.504, 536.219 811.476, 549.928 804.939 C 572.792 794.038, 590.236 774.606, 597.897 751.500 C 602.545 737.484, 603.258 724.587, 602.697 664.638 C 602.435 636.664, 602.453 612.042, 602.737 609.923 L 603.254 606.071 665.877 605.761 C 722.338 605.481, 729.088 605.276, 734.480 603.678 C 789.298 587.430, 816.043 526.437, 790.468 476 C 779.224 453.827, 760.320 438.206, 735.826 430.849 C 725.839 427.849, 665.001 426.899, 642.372 429.390 C 627.703 431.004, 605.268 436.250, 594.749 440.524 C 591.402 441.884, 588.554 442.885, 588.420 442.748 C 588.287 442.612, 590.832 438.225, 594.077 433 C 606.707 412.660, 614.867 387.225, 611.051 380.095 C 610.375 378.832, 610.969 375.467, 613.113 368.410 C 617.870 352.759, 626.719 317.405, 629.008 304.906 C 637.355 259.331, 627.329 238.429, 591.576 226.869 C 579.987 223.122, 579.154 222.673, 576.311 218.639 C 572.580 213.346, 567.811 210.995, 560.849 211.016 C 549.446 211.052, 542.541 218.782, 543.233 230.739 C 543.826 241, 549.032 246.153, 559.478 246.818 C 566.808 247.284, 574.103 244.063, 576.216 239.425 C 577.644 236.290, 580.113 236.317, 589.824 239.575 C 607.068 245.360, 614.716 252.940, 618.609 268.105 C 621.874 280.823, 617.541 306.299, 603.915 354.500 C 598.885 372.295, 598.370 373.525, 594.066 378.056 C 591.328 380.938, 589.743 384.214, 587.240 392.159 C 576.816 425.253, 559.755 444.592, 533 453.640 C 523.832 456.741, 500.974 456.255, 490.500 452.738 C 464.475 443.998, 447.217 423.542, 436.656 388.920 C 434.443 381.663, 433.466 379.906, 430.178 377.263 C 427.040 374.742, 425.981 372.952, 424.590 367.826 C 423.647 364.347, 422.038 358.800, 421.015 355.500 C 417.405 343.857, 409.067 310.358, 406.952 299 C 400.637 265.091, 408.902 248.495, 436.902 238.862 C 444.548 236.231, 446.409 236.460, 449.684 240.433 C 460.447 253.490, 481.926 246.399, 481.984 229.770 C 482.028 216.930, 471.991 208.584, 459.646 211.196 M 644 447.572 C 592.676 454.155, 551.941 476.888, 502.500 526.541 C 465.644 563.554, 448.368 596.993, 441.484 644.642 C 440.167 653.761, 439.932 663.022, 440.192 695.642 L 440.510 735.500 443.323 743.474 C 456.255 780.128, 492.521 801.454, 527.614 793.041 C 552.814 786.999, 571.654 769.922, 580.831 744.806 L 583.500 737.500 583.786 662.782 L 584.072 588.064 654.786 587.773 L 725.500 587.482 732.964 584.728 C 770.519 570.870, 789.620 533.986, 778.723 496.364 C 771.737 472.246, 750.483 452.478, 726.185 447.499 C 716.538 445.522, 659.585 445.573, 644 447.572" fill="currentColor" stroke="none" />
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
            <svg fill="none" stroke="white" viewBox="0 0 1024 1024" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M 459.646 211.196 C 454.795 212.223, 450.999 214.903, 447.911 219.481 C 445.898 222.465, 444.344 223.392, 438.500 225.097 C 408.166 233.943, 394.821 248.129, 392.496 274 C 391.185 288.593, 397.727 321.212, 410.832 365.432 C 414.351 377.306, 414.549 378.597, 413.248 381.204 C 408.229 391.266, 426.130 430.686, 444.428 449.864 C 463.461 469.813, 494.779 481.459, 520.500 478.153 C 526.770 477.347, 529.141 477.398, 527.917 478.311 C 520.999 483.473, 503.684 499.234, 486.245 516.241 C 459.175 542.641, 451.945 548.895, 436.662 559.130 C 417.249 572.131, 397.658 580.549, 376 585.196 C 360.838 588.449, 308.607 589.046, 296.847 586.101 C 250.088 574.389, 227.887 521.829, 252.240 480.500 C 259.793 467.683, 272.931 456.151, 285.728 451.107 C 297.857 446.326, 302.541 446, 359.030 446 L 412.145 446 407.336 437 L 402.527 428 351.513 428.017 C 311.948 428.031, 299.036 428.345, 293.976 429.418 C 230.272 442.923, 202.594 519.955, 242.757 571.964 C 253.630 586.044, 272.672 598.972, 289.500 603.698 C 297.240 605.872, 351.982 606.779, 367.500 604.991 C 388.160 602.610, 411.099 595.341, 430.750 584.949 C 435.837 582.258, 440 580.172, 440 580.313 C 440 580.454, 437.719 586.836, 434.930 594.495 C 424.061 624.348, 422.034 638.083, 421.501 685.500 C 421.040 726.526, 421.750 736.465, 426.067 749.382 C 435.930 778.895, 455.405 798.753, 484.471 808.931 C 494.404 812.410, 494.663 812.444, 511.500 812.472 C 530.972 812.504, 536.219 811.476, 549.928 804.939 C 572.792 794.038, 590.236 774.606, 597.897 751.500 C 602.545 737.484, 603.258 724.587, 602.697 664.638 C 602.435 636.664, 602.453 612.042, 602.737 609.923 L 603.254 606.071 665.877 605.761 C 722.338 605.481, 729.088 605.276, 734.480 603.678 C 789.298 587.430, 816.043 526.437, 790.468 476 C 779.224 453.827, 760.320 438.206, 735.826 430.849 C 725.839 427.849, 665.001 426.899, 642.372 429.390 C 627.703 431.004, 605.268 436.250, 594.749 440.524 C 591.402 441.884, 588.554 442.885, 588.420 442.748 C 588.287 442.612, 590.832 438.225, 594.077 433 C 606.707 412.660, 614.867 387.225, 611.051 380.095 C 610.375 378.832, 610.969 375.467, 613.113 368.410 C 617.870 352.759, 626.719 317.405, 629.008 304.906 C 637.355 259.331, 627.329 238.429, 591.576 226.869 C 579.987 223.122, 579.154 222.673, 576.311 218.639 C 572.580 213.346, 567.811 210.995, 560.849 211.016 C 549.446 211.052, 542.541 218.782, 543.233 230.739 C 543.826 241, 549.032 246.153, 559.478 246.818 C 566.808 247.284, 574.103 244.063, 576.216 239.425 C 577.644 236.290, 580.113 236.317, 589.824 239.575 C 607.068 245.360, 614.716 252.940, 618.609 268.105 C 621.874 280.823, 617.541 306.299, 603.915 354.500 C 598.885 372.295, 598.370 373.525, 594.066 378.056 C 591.328 380.938, 589.743 384.214, 587.240 392.159 C 576.816 425.253, 559.755 444.592, 533 453.640 C 523.832 456.741, 500.974 456.255, 490.500 452.738 C 464.475 443.998, 447.217 423.542, 436.656 388.920 C 434.443 381.663, 433.466 379.906, 430.178 377.263 C 427.040 374.742, 425.981 372.952, 424.590 367.826 C 423.647 364.347, 422.038 358.800, 421.015 355.500 C 417.405 343.857, 409.067 310.358, 406.952 299 C 400.637 265.091, 408.902 248.495, 436.902 238.862 C 444.548 236.231, 446.409 236.460, 449.684 240.433 C 460.447 253.490, 481.926 246.399, 481.984 229.770 C 482.028 216.930, 471.991 208.584, 459.646 211.196 M 644 447.572 C 592.676 454.155, 551.941 476.888, 502.500 526.541 C 465.644 563.554, 448.368 596.993, 441.484 644.642 C 440.167 653.761, 439.932 663.022, 440.192 695.642 L 440.510 735.500 443.323 743.474 C 456.255 780.128, 492.521 801.454, 527.614 793.041 C 552.814 786.999, 571.654 769.922, 580.831 744.806 L 583.500 737.500 583.786 662.782 L 584.072 588.064 654.786 587.773 L 725.500 587.482 732.964 584.728 C 770.519 570.870, 789.620 533.986, 778.723 496.364 C 771.737 472.246, 750.483 452.478, 726.185 447.499 C 716.538 445.522, 659.585 445.573, 644 447.572" fill="currentColor" stroke="none" />
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
