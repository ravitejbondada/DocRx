// ============================================================
// DocRx — Login Page
// ============================================================
import { verifyPassword, setSession, generateChallenge, verifyResponse } from '../auth/crypto.js';
import { queryOne } from '../db/index.js';
import { navigate } from '../router.js';
import { toast } from '../components/Toast.js';

const MAX_ATTEMPTS = 3;
const LOCKOUT_MS   = 30_000;

export async function renderLogin(container) {
  let attempts  = 0;
  let lockedUntil = 0;
  let showChallenge = false;
  let challengeCode = '';

  const settings = queryOne('SELECT doctor_name, clinic_name, doctor_reg_number, password_hash, password_salt FROM settings WHERE id=1');

  // ── First-run: no settings or no password set → go to setup ──
  if (!settings || !settings.password_hash) {
    navigate('/setup', true);
    return;
  }

  container.innerHTML = `
    <div class="auth-screen">
      <div class="auth-card fade-in">
        <div class="auth-logo">
          <div class="auth-logo-icon">
            <svg fill="none" stroke="white" viewBox="0 0 1024 1024" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M 459.646 211.196 C 454.795 212.223, 450.999 214.903, 447.911 219.481 C 445.898 222.465, 444.344 223.392, 438.500 225.097 C 408.166 233.943, 394.821 248.129, 392.496 274 C 391.185 288.593, 397.727 321.212, 410.832 365.432 C 414.351 377.306, 414.549 378.597, 413.248 381.204 C 408.229 391.266, 426.130 430.686, 444.428 449.864 C 463.461 469.813, 494.779 481.459, 520.500 478.153 C 526.770 477.347, 529.141 477.398, 527.917 478.311 C 520.999 483.473, 503.684 499.234, 486.245 516.241 C 459.175 542.641, 451.945 548.895, 436.662 559.130 C 417.249 572.131, 397.658 580.549, 376 585.196 C 360.838 588.449, 308.607 589.046, 296.847 586.101 C 250.088 574.389, 227.887 521.829, 252.240 480.500 C 259.793 467.683, 272.931 456.151, 285.728 451.107 C 297.857 446.326, 302.541 446, 359.030 446 L 412.145 446 407.336 437 L 402.527 428 351.513 428.017 C 311.948 428.031, 299.036 428.345, 293.976 429.418 C 230.272 442.923, 202.594 519.955, 242.757 571.964 C 253.630 586.044, 272.672 598.972, 289.500 603.698 C 297.240 605.872, 351.982 606.779, 367.500 604.991 C 388.160 602.610, 411.099 595.341, 430.750 584.949 C 435.837 582.258, 440 580.172, 440 580.313 C 440 580.454, 437.719 586.836, 434.930 594.495 C 424.061 624.348, 422.034 638.083, 421.501 685.500 C 421.040 726.526, 421.750 736.465, 426.067 749.382 C 435.930 778.895, 455.405 798.753, 484.471 808.931 C 494.404 812.410, 494.663 812.444, 511.500 812.472 C 530.972 812.504, 536.219 811.476, 549.928 804.939 C 572.792 794.038, 590.236 774.606, 597.897 751.500 C 602.545 737.484, 603.258 724.587, 602.697 664.638 C 602.435 636.664, 602.453 612.042, 602.737 609.923 L 603.254 606.071 665.877 605.761 C 722.338 605.481, 729.088 605.276, 734.480 603.678 C 789.298 587.430, 816.043 526.437, 790.468 476 C 779.224 453.827, 760.320 438.206, 735.826 430.849 C 725.839 427.849, 665.001 426.899, 642.372 429.390 C 627.703 431.004, 605.268 436.250, 594.749 440.524 C 591.402 441.884, 588.554 442.885, 588.420 442.748 C 588.287 442.612, 590.832 438.225, 594.077 433 C 606.707 412.660, 614.867 387.225, 611.051 380.095 C 610.375 378.832, 610.969 375.467, 613.113 368.410 C 617.870 352.759, 626.719 317.405, 629.008 304.906 C 637.355 259.331, 627.329 238.429, 591.576 226.869 C 579.987 223.122, 579.154 222.673, 576.311 218.639 C 572.580 213.346, 567.811 210.995, 560.849 211.016 C 549.446 211.052, 542.541 218.782, 543.233 230.739 C 543.826 241, 549.032 246.153, 559.478 246.818 C 566.808 247.284, 574.103 244.063, 576.216 239.425 C 577.644 236.290, 580.113 236.317, 589.824 239.575 C 607.068 245.360, 614.716 252.940, 618.609 268.105 C 621.874 280.823, 617.541 306.299, 603.915 354.500 C 598.885 372.295, 598.370 373.525, 594.066 378.056 C 591.328 380.938, 589.743 384.214, 587.240 392.159 C 576.816 425.253, 559.755 444.592, 533 453.640 C 523.832 456.741, 500.974 456.255, 490.500 452.738 C 464.475 443.998, 447.217 423.542, 436.656 388.920 C 434.443 381.663, 433.466 379.906, 430.178 377.263 C 427.040 374.742, 425.981 372.952, 424.590 367.826 C 423.647 364.347, 422.038 358.800, 421.015 355.500 C 417.405 343.857, 409.067 310.358, 406.952 299 C 400.637 265.091, 408.902 248.495, 436.902 238.862 C 444.548 236.231, 446.409 236.460, 449.684 240.433 C 460.447 253.490, 481.926 246.399, 481.984 229.770 C 482.028 216.930, 471.991 208.584, 459.646 211.196 M 644 447.572 C 592.676 454.155, 551.941 476.888, 502.500 526.541 C 465.644 563.554, 448.368 596.993, 441.484 644.642 C 440.167 653.761, 439.932 663.022, 440.192 695.642 L 440.510 735.500 443.323 743.474 C 456.255 780.128, 492.521 801.454, 527.614 793.041 C 552.814 786.999, 571.654 769.922, 580.831 744.806 L 583.500 737.500 583.786 662.782 L 584.072 588.064 654.786 587.773 L 725.500 587.482 732.964 584.728 C 770.519 570.870, 789.620 533.986, 778.723 496.364 C 771.737 472.246, 750.483 452.478, 726.185 447.499 C 716.538 445.522, 659.585 445.573, 644 447.572" fill="currentColor" stroke="none" />
            </svg>
          </div>
          <div>
            <div class="auth-brand">DocRx</div>
            <div class="auth-subtitle-text">Patient Records System</div>
          </div>
        </div>

        ${settings?.doctor_name ? `
          <div style="margin-bottom:24px">
            <h2 style="font-size:1.2rem">Welcome back</h2>
            <p class="text-muted text-sm mt-1">${settings.doctor_name}</p>
          </div>
        ` : ''}

        <div id="lockout-banner" class="lockout-banner hidden">
          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
          <span>Too many attempts. Wait <strong id="lockout-countdown">30s</strong></span>
        </div>

        <div id="login-form">
          <div class="form-group" style="margin-bottom:20px">
            <label class="form-label">Password</label>
            <div class="input-icon-wrap">
              <svg class="input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
              <input class="input" id="password-input" type="password" placeholder="Enter your password" autocomplete="current-password" autofocus />
              <button class="input-icon-right" id="toggle-pw" type="button" title="Show/hide password">
                <svg id="eye-icon" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
              </button>
            </div>
            <div id="pw-error" class="form-error hidden">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <span id="pw-error-text">Incorrect password</span>
            </div>
          </div>
          <button class="btn btn-primary btn-block btn-lg" id="login-btn">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/></svg>
            Sign In
          </button>
          <div style="text-align:center;margin-top:16px">
            <button class="btn btn-ghost btn-sm" id="recovery-btn">Need Assistance?</button>
          </div>
        </div>

        <!-- Challenge-Response Panel -->
        <div id="recovery-panel" class="hidden">
          <div class="divider"></div>
          <h3 style="font-size:1rem;margin-bottom:8px">Emergency Recovery</h3>
          <p class="text-sm text-muted" style="margin-bottom:16px;line-height:1.6">
            Share this challenge code. You'll receive a response code to enter below.
          </p>
          <div style="background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:var(--radius-lg);padding:16px;text-align:center;margin-bottom:16px">
            <div class="text-tertiary" style="font-size:0.72rem;font-weight:600;letter-spacing:0.1em;margin-bottom:6px">CHALLENGE CODE</div>
            <div id="challenge-display" class="font-mono" style="font-size:1.6rem;font-weight:800;letter-spacing:0.1em;color:var(--teal-400)">••••••••</div>
          </div>
          <div class="form-group" style="margin-bottom:14px">
            <label class="form-label">Response Code</label>
            <input class="input font-mono" id="response-input" type="text" placeholder="Enter response code" style="letter-spacing:0.1em;text-transform:uppercase" maxlength="8" />
          </div>
          <button class="btn btn-primary btn-block" id="verify-recovery-btn">Verify & Reset Password</button>
          <div style="margin-top:10px;text-align:center">
            <button class="btn btn-ghost btn-sm" id="cancel-recovery-btn">Back to Login</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const pwInput     = container.querySelector('#password-input');
  const loginBtn    = container.querySelector('#login-btn');
  const togglePw    = container.querySelector('#toggle-pw');
  const pwError     = container.querySelector('#pw-error');
  const pwErrorText = container.querySelector('#pw-error-text');
  const lockBanner  = container.querySelector('#lockout-banner');
  const countdown   = container.querySelector('#lockout-countdown');
  const loginForm   = container.querySelector('#login-form');
  const recoveryPanel = container.querySelector('#recovery-panel');
  const challengeDisplay = container.querySelector('#challenge-display');
  const responseInput = container.querySelector('#response-input');

  // Toggle password visibility
  togglePw.addEventListener('click', () => {
    const isText = pwInput.type === 'text';
    pwInput.type = isText ? 'password' : 'text';
    togglePw.querySelector('svg').innerHTML = isText
      ? `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>`
      : `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>`;
  });

  // Lockout countdown
  function startLockout() {
    lockBanner.classList.remove('hidden');
    loginBtn.disabled = true;
    pwInput.disabled  = true;

    const tick = setInterval(() => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        clearInterval(tick);
        lockBanner.classList.add('hidden');
        loginBtn.disabled = false;
        pwInput.disabled  = false;
        pwInput.focus();
        attempts = 0;
      } else {
        countdown.textContent = `${remaining}s`;
      }
    }, 250);
  }

  // Login handler
  async function handleLogin() {
    if (Date.now() < lockedUntil) return;
    const pw = pwInput.value.trim();
    if (!pw) { pwInput.classList.add('error'); return; }

    loginBtn.disabled = true;
    loginBtn.textContent = 'Verifying...';
    pwError.classList.add('hidden');
    pwInput.classList.remove('error');

    try {
      const ok = await verifyPassword(pw, settings.password_salt, settings.password_hash);
      if (ok) {
        setSession();
        toast.success('Welcome back, ' + (settings.doctor_name || ''));
        navigate('/dashboard', true);
      } else {
        attempts++;
        pwInput.classList.add('error');
        if (attempts >= MAX_ATTEMPTS) {
          lockedUntil = Date.now() + LOCKOUT_MS;
          startLockout();
        } else {
          pwErrorText.textContent = `Incorrect password. ${MAX_ATTEMPTS - attempts} attempt(s) remaining.`;
          pwError.classList.remove('hidden');
          pwInput.value = '';
          pwInput.focus();
        }
      }
    } catch (e) {
      toast.error('Authentication error. Please try again.');
    } finally {
      loginBtn.disabled = false;
      loginBtn.innerHTML = `<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/></svg> Sign In`;
    }
  }

  loginBtn.addEventListener('click', handleLogin);
  pwInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleLogin(); });

  // Recovery
  container.querySelector('#recovery-btn').addEventListener('click', async () => {
    loginForm.classList.add('hidden');
    recoveryPanel.classList.remove('hidden');
    if (settings?.doctor_reg_number) {
      challengeCode = await generateChallenge(settings.doctor_reg_number);
      challengeDisplay.textContent = challengeCode;
    } else {
      challengeDisplay.textContent = 'No reg. number set';
    }
  });

  container.querySelector('#cancel-recovery-btn').addEventListener('click', () => {
    recoveryPanel.classList.add('hidden');
    loginForm.classList.remove('hidden');
  });

  container.querySelector('#verify-recovery-btn').addEventListener('click', async () => {
    const resp = responseInput.value.trim().toUpperCase();
    if (!resp) return;
    const ok = await verifyResponse(challengeCode, resp);
    if (ok) {
      navigate('/setup?mode=reset');
    } else {
      toast.error('Invalid response code. Please check and try again.');
      responseInput.value = '';
      responseInput.focus();
    }
  });

  responseInput.addEventListener('input', () => {
    responseInput.value = responseInput.value.toUpperCase();
  });
}
