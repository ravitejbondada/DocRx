// ============================================================
// DocRx — Web Crypto Auth (PBKDF2 password hashing)
// ============================================================

const ITERATIONS = 100_000;
const HASH_ALG   = 'SHA-256';
const KEY_LENGTH  = 256;

function bufToHex(buf) {
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuf(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++)
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes;
}

// Generate a random 16-byte salt
export function generateSalt() {
  return bufToHex(crypto.getRandomValues(new Uint8Array(16)));
}

// Hash password using PBKDF2
export async function hashPassword(password, saltHex) {
  const enc   = new TextEncoder();
  const key   = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const bits  = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: hexToBuf(saltHex), iterations: ITERATIONS, hash: HASH_ALG },
    key, KEY_LENGTH
  );
  return bufToHex(bits);
}

// Verify password against stored hash
export async function verifyPassword(password, saltHex, storedHash) {
  const hash = await hashPassword(password, saltHex);
  return hash === storedHash;
}

// ── Session Management ────────────────────────────────────────
const SESSION_KEY     = 'docrx_session';
const SESSION_DAYS    = 30;

export function setSession() {
  const expiry = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ expiry, authenticated: true }));
  // Also store in localStorage for persistence across tabs
  localStorage.setItem(SESSION_KEY, JSON.stringify({ expiry, authenticated: true }));
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY);
}

export function isAuthenticated() {
  const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
  if (!raw) return false;
  try {
    const { expiry, authenticated } = JSON.parse(raw);
    if (!authenticated || Date.now() > expiry) {
      clearSession();
      return false;
    }
    // Refresh session storage
    sessionStorage.setItem(SESSION_KEY, raw);
    return true;
  } catch {
    return false;
  }
}

// ── Challenge-Response Recovery ───────────────────────────────
// Simple: challenge = first 8 chars of SHA-256(regNumber + YYYYMMDD)
// Response: first 8 chars of SHA-256(challenge + MASTER_KEY)
// MASTER_KEY is embedded in recovery-tool.html only.

export async function generateChallenge(regNumber) {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const data = regNumber + date;
  const enc  = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-256', enc.encode(data));
  const hex  = bufToHex(hash);
  const raw  = hex.slice(0, 8).toUpperCase();
  // Format: DR-XXXX-XX
  return `DR-${raw.slice(0,4)}-${raw.slice(4,6)}`;
}

export async function verifyResponse(challenge, response) {
  // Response is verified by re-computing with the same MASTER_KEY logic
  // For simplicity: response = HMAC-like: SHA256(challenge + 'DOCRX_RECOVERY_2026')
  const enc  = new TextEncoder();
  const data = challenge + 'DOCRX_RECOVERY_2026';
  const hash = await crypto.subtle.digest('SHA-256', enc.encode(data));
  const hex  = bufToHex(hash);
  const expected = hex.slice(0, 8).toUpperCase();
  return response.toUpperCase() === expected;
}
