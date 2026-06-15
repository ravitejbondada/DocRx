// ============================================================
// DocRx — App Layout (Sidebar + Bottom Nav)
// ============================================================
import { navigate, getCurrentRoute } from '../router.js';
import { clearSession } from '../auth/crypto.js';
import { queryOne } from '../db/index.js';

const NAV_ITEMS = [
  {
    route: '/dashboard',
    label: 'Dashboard',
    icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>`,
  },
  {
    route: '/patients',
    label: 'Patients',
    icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>`,
  },
  {
    route: '/patients/new',
    label: 'New Patient',
    icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>`,
  },
  {
    route: '/finance',
    label: 'Finance',
    icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
  },
  {
    route: '/settings',
    label: 'Settings',
    icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>`,
  },
];

export function renderLayout(container) {
  const settings = queryOne('SELECT doctor_name, clinic_name FROM settings WHERE id=1') || {};
  const initials = (settings.doctor_name || 'DR')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  container.innerHTML = `
    <div class="app-layout">
      <!-- Sidebar -->
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-header">
          <div class="sidebar-logo-icon">
            <svg fill="none" stroke="white" viewBox="0 0 24 24" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
            </svg>
          </div>
          <div>
            <div class="sidebar-brand">DocRx</div>
            <div class="sidebar-subtitle">Patient Records</div>
          </div>
        </div>

        <nav class="sidebar-nav">
          <div class="nav-section-label">Main</div>
          ${NAV_ITEMS.slice(0, 2).map(item => `
            <button class="nav-item ${getCurrentRoute() === item.route ? 'active' : ''}"
                    data-route="${item.route}"
                    onclick="window.__navigate('${item.route}')">
              ${item.icon} <span>${item.label}</span>
            </button>
          `).join('')}

          <div class="nav-section-label" style="margin-top:8px">Actions</div>
          <button class="nav-item ${getCurrentRoute() === '/patients/new' ? 'active' : ''}"
                  data-route="/patients/new"
                  onclick="window.__navigate('/patients/new')">
            ${NAV_ITEMS[2].icon} <span>New Patient</span>
          </button>

          <div class="nav-section-label" style="margin-top:8px">System</div>
          <button class="nav-item ${getCurrentRoute() === '/finance' ? 'active' : ''}"
                  data-route="/finance"
                  onclick="window.__navigate('/finance')">
            ${NAV_ITEMS[3].icon} <span>Finance</span>
          </button>
          <button class="nav-item ${getCurrentRoute() === '/settings' ? 'active' : ''}"
                  data-route="/settings"
                  onclick="window.__navigate('/settings')">
            ${NAV_ITEMS[4].icon} <span>Settings</span>
          </button>
        </nav>

        <div class="sidebar-footer">
          <div class="sidebar-user" onclick="window.__handleLogout()">
            <div class="user-avatar">${initials}</div>
            <div>
              <div class="user-name">${settings.doctor_name || 'Doctor'}</div>
              <div class="user-role">${settings.clinic_name || 'DocRx Clinic'}</div>
            </div>
            <svg style="margin-left:auto;width:16px;height:16px;color:var(--text-tertiary)" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
          </div>
        </div>
      </aside>

      <!-- Main Content Area -->
      <main class="main-content" id="page-root"></main>

      <!-- Mobile Bottom Nav -->
      <nav class="bottom-nav" id="bottom-nav" style="display:none">
        ${NAV_ITEMS.map(item => `
          <button class="bottom-nav-item ${getCurrentRoute() === item.route ? 'active' : ''}"
                  data-route="${item.route}"
                  onclick="window.__navigate('${item.route}')">
            ${item.icon}
            <span>${item.label}</span>
          </button>
        `).join('')}
      </nav>
    </div>
  `;

  // Expose navigation globally for onclick handlers
  window.__navigate = (path) => navigate(path);
  window.__handleLogout = () => {
    if (confirm('Log out of DocRx?')) {
      clearSession();
      navigate('/login', true);
    }
  };

  // Mobile: show bottom nav
  function checkMobile() {
    const isMobile = window.innerWidth <= 768;
    document.getElementById('bottom-nav').style.display = isMobile ? 'flex' : 'none';
  }
  checkMobile();
  window.addEventListener('resize', checkMobile);

  // Mobile sidebar overlay toggle
  const sidebar = document.getElementById('sidebar');
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768) {
      if (!sidebar.contains(e.target)) sidebar.classList.remove('open');
    }
  });

  return document.getElementById('page-root');
}

// Update nav active states after navigation
export function updateNavActive(route) {
  document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.route === route);
  });
}
