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
            <svg fill="none" stroke="white" viewBox="0 0 24 24" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
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
