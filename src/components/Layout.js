// ============================================================
// DocRx — App Layout (Sidebar + Bottom Nav)
// ============================================================
import { navigate, getCurrentRoute } from '../router.js';
import { clearSession } from '../auth/crypto.js';
import { queryOne, queryAll, run } from '../db/index.js';
import { showModal } from './Modal.js';
import { toast } from './Toast.js';

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
          <div style="flex:1">
            <div class="flex items-center gap-2">
              <div class="sidebar-brand">DocRx</div>
              <div id="sidebar-sync-indicator" class="sync-indicator offline" title="Sync Status" onclick="window.__triggerManualSync(event)"></div>
            </div>
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

      <!-- Mobile Top App Bar -->
      <header class="mobile-top-bar">
        <div class="flex items-center gap-2">
          <div class="brand-logo">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>
          </div>
          <div>
            <div class="font-bold text-sm" style="color:var(--text-primary);line-height:1.2">${settings.doctor_name || 'Doctor Profile'}</div>
            <div class="text-xs text-tertiary" style="line-height:1">${settings.clinic_name || 'DocRx'}</div>
          </div>
        </div>
        <div id="mobile-sync-indicator-container">
          <div class="sync-indicator offline" title="Sync Status" onclick="window.__triggerManualSync(event)"></div>
        </div>
      </header>

      <!-- Main Content Area -->
      <main class="main-content" id="page-root"></main>

      <!-- Mobile Bottom Nav -->
      <nav class="bottom-nav" id="bottom-nav" style="display:none">
        ${NAV_ITEMS.slice(0, 2).map(item => `
          <button class="bottom-nav-item ${getCurrentRoute() === item.route ? 'active' : ''}"
                  data-route="${item.route}"
                  onclick="window.__navigate('${item.route}')">
            ${item.icon}
            <span>${item.label}</span>
          </button>
        `).join('')}

        <div class="bottom-nav-fab-container">
          <button class="fab-centered" onclick="window.__openQuickVisitModal(event)" title="Add Menu">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
          </button>
        </div>

        ${NAV_ITEMS.slice(3, 5).map(item => `
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

  // Sync Indicator Rendering & Control
  const STATUS_ICONS = {
    syncing: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18" /></svg>`,
    success: `<svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>`,
    offline: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>`,
    error: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>`
  };

  window.__updateSyncStatus = (status) => {
    const type = status?.type || 'offline'; // 'syncing', 'success', 'error', 'offline'
    const msg = status?.message || 'Sync status';
    
    document.querySelectorAll('.sync-indicator').forEach(el => {
      el.className = `sync-indicator ${type === 'success' ? 'online' : type}`;
      el.title = msg;
      el.innerHTML = STATUS_ICONS[type] || STATUS_ICONS.offline;
    });
  };

  window.__triggerManualSync = async (event) => {
    event.stopPropagation();
    const { getSavedToken } = await import('../backup/drive.js');
    if (!getSavedToken()) {
      toast.info('Please connect Google Drive in Settings first.');
      navigate('/settings?tab=backup');
      return;
    }
    const { syncWithGoogleDrive } = await import('../backup/sync.js');
    await syncWithGoogleDrive();
  };

  // Quick Start New Visit Search Modal
  window.__openQuickVisitModal = (event) => {
    if (event) event.stopPropagation();

    const bodyHtml = `
      <div class="form-group" style="margin-bottom:0">
        <label class="form-label" style="font-weight:600; font-size:0.9rem; margin-bottom:6px; display:block;">Search Patient</label>
        <input type="text" class="input" id="quick-visit-search" placeholder="Type name, phone, or code..." style="width: 100%" autocomplete="off" autofocus />
        <div id="quick-visit-results" class="search-results-list hidden"></div>
      </div>
    `;

    const overlay = showModal({
      title: 'New Patient or Visit',
      bodyHtml,
      confirmText: '', // Selection/Click will perform the confirm/navigation
      cancelText: 'Close'
    });

    const confirmBtn = overlay.querySelector('#modal-confirm-btn');
    if (confirmBtn) confirmBtn.style.display = 'none';

    const input = overlay.querySelector('#quick-visit-search');
    const resultsEl = overlay.querySelector('#quick-visit-results');
    
    let matches = [];
    let selectedIdx = -1;

    const renderMatches = (q) => {
      resultsEl.innerHTML = '';
      if (!q) {
        resultsEl.classList.add('hidden');
        return;
      }

      if (matches.length === 0) {
        resultsEl.innerHTML = `
          <div class="search-result-item" id="quick-register-option" style="color:var(--sky-400); font-weight:600;">
            <div class="patient-details">
              <span class="patient-name">+ Register "${q}"</span>
              <span class="patient-meta">Create new patient profile</span>
            </div>
          </div>
        `;
      } else {
        let html = matches.map((p, idx) => `
          <div class="search-result-item ${idx === selectedIdx ? 'selected' : ''}" data-id="${p.id}" data-idx="${idx}">
            <div class="patient-details">
              <span class="patient-name">${p.full_name}</span>
              <span class="patient-meta">${p.patient_code} · ${p.age}y · ${p.phone}</span>
            </div>
            ${p.blood_group ? `<span class="badge badge-teal" style="font-size:0.7rem;padding:2px 6px;">${p.blood_group}</span>` : ''}
          </div>
        `).join('');

        // Append Register option at the bottom
        html += `
          <div class="search-result-item" id="quick-register-option" style="color:var(--sky-400); font-weight:600; border-top:1px dashed var(--glass-border)">
            <div class="patient-details">
              <span class="patient-name">+ Register "${q}" as new patient</span>
              <span class="patient-meta">Create new patient profile</span>
            </div>
          </div>
        `;
        resultsEl.innerHTML = html;
      }

      resultsEl.classList.remove('hidden');

      // Bind click listeners
      resultsEl.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
          overlay.classList.remove('open');
          setTimeout(() => overlay.remove(), 250);
          if (item.id === 'quick-register-option') {
            window.__openQuickRegisterModal(q);
          } else {
            navigate(`/patients/${item.dataset.id}/visit/new`);
          }
        });
      });
    };

    input.addEventListener('input', () => {
      const q = input.value.trim();
      if (!q) {
        resultsEl.classList.add('hidden');
        resultsEl.innerHTML = '';
        matches = [];
        return;
      }

      const like = `%${q}%`;
      matches = queryAll(`
        SELECT id, patient_code, full_name, age, phone, blood_group
        FROM patients
        WHERE deleted = 0
          AND (full_name LIKE ? COLLATE NOCASE OR phone LIKE ? OR patient_code LIKE ?)
        ORDER BY full_name COLLATE NOCASE ASC LIMIT 5
      `, [like, like, like]);
      
      selectedIdx = -1;
      renderMatches(q);
    });

    // Key navigation (up, down, enter)
    input.addEventListener('keydown', (e) => {
      const items = resultsEl.querySelectorAll('.search-result-item');
      if (!items.length) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIdx = (selectedIdx + 1) % items.length;
        renderMatches(input.value.trim());
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIdx = (selectedIdx - 1 + items.length) % items.length;
        renderMatches(input.value.trim());
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const target = items[selectedIdx === -1 ? 0 : selectedIdx];
        if (target) target.click();
      }
    });

    setTimeout(() => input.focus(), 150);
  };

  // Quick Register Patient Modal Dialog
  window.__openQuickRegisterModal = (prefilledName = '') => {
    const today = new Date().toISOString().slice(0, 10);
    const bodyHtml = `
      <form id="quick-register-form" novalidate style="display:flex; flex-direction:column; gap:12px; text-align:left;">
        <div class="form-group">
          <label class="form-label" style="font-weight:600; font-size:0.9rem; margin-bottom:6px; display:block;">Full Name <span class="req">*</span></label>
          <input class="input" id="qr-name" type="text" value="${prefilledName.replace(/"/g, '&quot;')}" style="width:100%" required />
        </div>
        <div class="form-grid form-grid-2" style="gap:12px">
          <div class="form-group">
            <label class="form-label" style="font-weight:600; font-size:0.9rem; margin-bottom:6px; display:block;">Age <span class="req">*</span></label>
            <input class="input" id="qr-age" type="number" min="0" placeholder="Years" style="width:100%" required />
          </div>
          <div class="form-group">
            <label class="form-label" style="font-weight:600; font-size:0.9rem; margin-bottom:6px; display:block;">Gender <span class="req">*</span></label>
            <select class="select" id="qr-gender" style="width:100%" required>
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" style="font-weight:600; font-size:0.9rem; margin-bottom:6px; display:block;">Phone Number <span class="req">*</span></label>
          <input class="input" id="qr-phone" type="text" placeholder="10-digit mobile number" style="width:100%" required />
        </div>
        <div class="form-grid form-grid-2" style="gap:12px">
          <div class="form-group">
            <label class="form-label" style="font-weight:600; font-size:0.9rem; margin-bottom:6px; display:block;">Blood Group</label>
            <select class="select" id="qr-blood" style="width:100%">
              <option value="">-- Select --</option>
              ${['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(b => `<option value="${b}">${b}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" style="font-weight:600; font-size:0.9rem; margin-bottom:6px; display:block;">DOB (Optional)</label>
            <input class="input" id="qr-dob" type="date" max="${today}" style="width:100%" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" style="font-weight:600; font-size:0.9rem; margin-bottom:6px; display:block;">Address / Location <span class="req">*</span></label>
          <input class="input" id="qr-address" type="text" placeholder="e.g. Village Name / Town" style="width:100%" required />
        </div>
      </form>
    `;

    showModal({
      title: 'Register New Patient',
      bodyHtml,
      confirmText: 'Register & Start Visit',
      cancelText: 'Cancel',
      onConfirm: (overlay) => {
        const nameEl = overlay.querySelector('#qr-name');
        const ageEl = overlay.querySelector('#qr-age');
        const genderEl = overlay.querySelector('#qr-gender');
        const phoneEl = overlay.querySelector('#qr-phone');
        const bloodEl = overlay.querySelector('#qr-blood');
        const dobEl = overlay.querySelector('#qr-dob');
        const addrEl = overlay.querySelector('#qr-address');

        const name = nameEl.value.trim();
        const age = parseInt(ageEl.value.trim(), 10);
        const gender = genderEl.value;
        const phone = phoneEl.value.trim();
        const blood = bloodEl.value;
        const dob = dobEl.value || null;
        const address = addrEl.value.trim();

        if (!name || isNaN(age) || !phone || !address) {
          toast.error('Please fill all required fields.');
          return false;
        }

        try {
          const count = queryOne("SELECT COUNT(*) as c FROM patients").c;
          const code = `PX${String(count + 1).padStart(4, '0')}`;
          const pId = crypto.randomUUID();

          run(`
            INSERT INTO patients (id, patient_code, full_name, dob, age, gender, phone, address, blood_group, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now','localtime'), datetime('now','localtime'))
          `, [pId, code, name, dob, age, gender, phone, address, blood]);

          toast.success('Patient registered successfully!');
          navigate(`/patients/${pId}/visit/new`);
          return true; // Closes modal
        } catch (err) {
          toast.error('Registration failed: ' + err.message);
          return false; // Keep modal open
        }
      }
    });
  };

  // Initialize status indicator state
  import('../backup/drive.js').then(({ getSavedToken }) => {
    const hasToken = !!getSavedToken();
    const isOnline = navigator.onLine;
    if (!hasToken) {
      window.__updateSyncStatus({ type: 'offline', message: 'Google Drive disconnected' });
    } else if (!isOnline) {
      window.__updateSyncStatus({ type: 'offline', message: 'Offline' });
    } else {
      window.__updateSyncStatus({ type: 'success', message: 'Connected & ready' });
    }
  }).catch(() => {});

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
