// ============================================================
// DocRx — Patient List / Search Page
// ============================================================
import { queryAll } from '../db/index.js';
import { navigate } from '../router.js';

export function renderPatientList(container) {
  let searchTimeout = null;
  let currentQuery = '';

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Patients</h1>
        <p class="page-subtitle">Search and manage patient records</p>
      </div>
      <button class="btn btn-primary btn-sm" onclick="window.__navigate('/patients/new')">
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        New Patient
      </button>
    </div>

    <div class="page-content slide-up">
      <!-- Search Bar -->
      <div class="search-bar mb-6" style="max-width:600px">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        <input type="text" id="search-input" placeholder="Search by name, phone, or patient code…" autocomplete="off" />
        <div id="search-spinner" class="hidden">
          <div class="splash-spinner" style="width:18px;height:18px;border-width:2px"></div>
        </div>
      </div>


      <!-- Results -->
      <div id="results-area"></div>
    </div>
  `;

  const searchInput = container.querySelector('#search-input');
  const resultsArea = container.querySelector('#results-area');
  const spinner     = container.querySelector('#search-spinner');


  function doSearch(query) {
    currentQuery = query;
    const q = query.trim();
    let results;

    if (!q) {
      results = queryAll(`
        SELECT p.id, p.patient_code, p.full_name, p.age, p.gender, p.phone, p.blood_group,
               MAX(v.visit_date) as last_visit
        FROM patients p LEFT JOIN visits v ON v.patient_id = p.id AND v.deleted = 0
        WHERE p.deleted = 0
        GROUP BY p.id ORDER BY p.created_at DESC LIMIT 50
      `);
    } else {
      const like = `%${q}%`;
      results = queryAll(`
        SELECT p.id, p.patient_code, p.full_name, p.age, p.gender, p.phone, p.blood_group,
               MAX(v.visit_date) as last_visit
        FROM patients p LEFT JOIN visits v ON v.patient_id = p.id AND v.deleted = 0
        WHERE p.deleted = 0
          AND (p.full_name LIKE ? COLLATE NOCASE
            OR p.phone LIKE ?
            OR p.patient_code LIKE ?)
        GROUP BY p.id ORDER BY p.full_name COLLATE NOCASE ASC LIMIT 50
      `, [like, like, like]);
    }

    renderResults(results, q);
  }

  function renderResults(patients, query) {
    if (!patients.length) {
      resultsArea.innerHTML = `
        <div class="empty-state">
          <svg class="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <h3>${query ? 'No patients found' : 'No patients registered'}</h3>
          <p>${query ? `No results for "${query}"` : 'Start by registering your first patient'}</p>
          ${!query ? `<button class="btn btn-primary btn-sm mt-3" onclick="window.__navigate('/patients/new')">+ New Patient</button>` : ''}
        </div>`;
      return;
    }

    resultsArea.innerHTML = `
      <!-- Desktop Table -->
      <div class="table-wrap fade-in hide-on-mobile">
        <table>
          <thead>
            <tr>
              <th>Patient</th>
              <th>Code</th>
              <th>Age / Gender</th>
              <th>Phone</th>
              <th>Blood Group</th>
              <th>Last Visit</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${patients.map(p => `
              <tr style="cursor:pointer" onclick="window.__navigate('/patients/${p.id}')">
                <td>
                  <div class="flex items-center gap-2">
                    <div class="recent-patient-avatar" style="width:32px;height:32px;font-size:0.78rem;flex-shrink:0">${getInitials(p.full_name)}</div>
                    <span class="font-semibold">${highlight(p.full_name, query)}</span>
                  </div>
                </td>
                <td><span class="patient-code">${highlight(p.patient_code, query)}</span></td>
                <td>${p.age}y <span class="sep">·</span> ${genderLabel(p.gender)}</td>
                <td class="font-mono text-sm">${highlight(p.phone, query)}</td>
                <td>${p.blood_group ? `<span class="badge badge-teal">${p.blood_group}</span>` : '<span class="text-tertiary">—</span>'}</td>
                <td>${p.last_visit ? formatDate(p.last_visit) : '<span class="text-tertiary">No visits</span>'}</td>
                <td>
                  <div class="flex gap-1">
                    <button class="btn btn-ghost btn-icon btn-sm" title="Open Profile"
                            onclick="event.stopPropagation();window.__navigate('/patients/${p.id}')">
                      <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    </button>
                    <button class="btn btn-ghost btn-icon btn-sm" title="New Visit"
                            onclick="event.stopPropagation();window.__navigate('/patients/${p.id}/visit/new')">
                      <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Mobile List Cards -->
      <div class="mobile-patient-list fade-in hide-on-desktop">
        ${patients.map(p => `
          <div class="patient-mobile-card" onclick="window.__navigate('/patients/${p.id}')">
            <div class="flex items-center gap-3">
              <div class="recent-patient-avatar" style="width:36px;height:36px;font-size:0.85rem;flex-shrink:0">${getInitials(p.full_name)}</div>
              <div style="flex:1; min-width:0;">
                <div class="font-semibold text-sm truncate" style="color:var(--text-primary)">${highlight(p.full_name, query)}</div>
                <div class="text-xs text-muted font-mono mt-0.5">${highlight(p.patient_code, query)}</div>
              </div>
              ${p.blood_group ? `<span class="badge badge-teal" style="font-size:0.7rem;padding:2px 6px;">${p.blood_group}</span>` : ''}
            </div>
            <div class="patient-card-body mt-3 pt-3" style="border-top: 1px solid var(--glass-border); display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div class="text-xs text-tertiary">Phone: <span class="font-mono" style="color:var(--text-secondary)">${highlight(p.phone, query)}</span></div>
                <div class="text-xs text-tertiary mt-1">Age/Gen: <span style="color:var(--text-secondary)">${p.age}y · ${genderLabel(p.gender).slice(0, 1)}</span></div>
              </div>
              <div style="text-align: right">
                <div class="text-xs text-tertiary">Last Visit</div>
                <div class="text-xs font-semibold mt-1" style="color:var(--text-secondary)">${p.last_visit ? formatDate(p.last_visit) : 'None'}</div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
      <p class="text-xs text-tertiary mt-3" style="text-align:right">${patients.length} result${patients.length !== 1 ? 's' : ''}</p>
    `;
  }

  // Debounced search
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => doSearch(searchInput.value), 150);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { searchInput.value = ''; doSearch(''); }
  });

  // Initial load
  const hashQ = new URLSearchParams(window.location.hash.split('?')[1] || '').get('q');
  if (hashQ) {
    searchInput.value = hashQ;
    doSearch(hashQ);
  } else {
    doSearch('');
  }
  setTimeout(() => searchInput.focus(), 100);
}

function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}
function genderLabel(g) { return g === 'M' ? 'Male' : g === 'F' ? 'Female' : 'Other'; }
function formatDate(d) {
  if (!d) return '';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function highlight(text, query) {
  if (!query || !text) return text || '';
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return String(text).replace(new RegExp(`(${escaped})`, 'gi'), '<mark style="background:rgba(14,165,233,0.25);color:inherit;border-radius:2px">$1</mark>');
}
