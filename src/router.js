// ============================================================
// DocRx — Client-Side Router
// ============================================================
import { isAuthenticated } from './auth/crypto.js';
import { queryOne } from './db/index.js';

const routes = {};
let currentRoute = null;
let _container = null;

// Register a route
export function route(path, handler) {
  routes[path] = handler;
}

// Navigate to a path
export function navigate(path, replace = false) {
  if (replace) {
    history.replaceState(null, '', `#${path}`);
  } else {
    history.pushState(null, '', `#${path}`);
  }
  dispatch(path);
}

// Get current hash path
function getPath() {
  const hash = window.location.hash.slice(1) || '/';
  // Strip query params for route matching
  return hash.split('?')[0];
}

// Get query params from hash
export function getParams() {
  const hash = window.location.hash.slice(1) || '/';
  const qIdx = hash.indexOf('?');
  if (qIdx === -1) return {};
  const q = new URLSearchParams(hash.slice(qIdx + 1));
  const obj = {};
  q.forEach((v, k) => { obj[k] = v; });
  return obj;
}

// Dispatch a route
function dispatch(path) {
  const basePath = path.split('?')[0];

  // Auth guard
  const publicRoutes = ['/login', '/setup', '/recovery'];
  if (!publicRoutes.includes(basePath) && !isAuthenticated()) {
    return dispatch('/login');
  }

  // Check if setup needed
  if (!publicRoutes.includes(basePath) && isAuthenticated()) {
    const settings = queryOne('SELECT doctor_name FROM settings WHERE id=1');
    if (!settings || !settings.doctor_name) {
      return dispatch('/setup');
    }
  }

  // Match dynamic routes
  let handler = routes[basePath];

  // Try pattern matching for /patients/:id, /visits/:id etc
  if (!handler) {
    for (const [pattern, fn] of Object.entries(routes)) {
      if (pattern.includes(':')) {
        const regex = new RegExp('^' + pattern.replace(/:[^/]+/g, '([^/]+)') + '$');
        const match = basePath.match(regex);
        if (match) {
          const keys = [...pattern.matchAll(/:([^/]+)/g)].map(m => m[1]);
          const params = {};
          keys.forEach((k, i) => { params[k] = match[i + 1]; });
          handler = (container) => fn(container, params);
          break;
        }
      }
    }
  }

  if (!handler) {
    handler = routes['/404'] || (() => {
      _container.innerHTML = `<div class="empty-state" style="margin:40px auto">
        <svg class="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        <h3>Page Not Found</h3>
        <p>The page you're looking for doesn't exist.</p>
      </div>`;
    });
  }

  currentRoute = basePath;
  if (_container) {
    _container.innerHTML = '';
    handler(_container);
  }

  // Update sidebar active state
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.route === currentRoute);
  });
}

// Initialize router
export function initRouter(container) {
  _container = container;
  window.addEventListener('popstate', () => dispatch(getPath()));
  dispatch(getPath());
}

export function getCurrentRoute() { return currentRoute; }
