// ============================================================
// DocRx — Dashboard Page
// ============================================================
import { queryAll, queryOne } from '../db/index.js';
import { navigate } from '../router.js';

export function renderDashboard(container) {
  const today = new Date().toISOString().slice(0, 10);
  const thisMonthStart = today.slice(0, 7) + '-01';

  // Analytics
  const totalPatients = queryOne('SELECT COUNT(*) as c FROM patients')?.c || 0;
  const visitsThisMonth = queryOne(
    "SELECT COUNT(*) as c FROM visits WHERE visit_date >= ?", [thisMonthStart])?.c || 0;
  const visitsToday = queryOne(
    "SELECT COUNT(*) as c FROM visits WHERE visit_date = ?", [today])?.c || 0;

  // Recent patients (last 10 by most recent visit)
  const recentPatients = queryAll(`
    SELECT p.id, p.patient_code, p.full_name, p.age, p.gender, p.phone,
           MAX(v.visit_date) as last_visit
    FROM patients p
    LEFT JOIN visits v ON v.patient_id = p.id
    GROUP BY p.id
    ORDER BY last_visit DESC, p.created_at DESC
    LIMIT 10
  `);

  // Follow-up tracker (today or overdue, not yet visited)
  const followUps = queryAll(`
    SELECT v.follow_up_date, v.id as visit_id, v.diagnosis,
           p.id as patient_id, p.full_name, p.patient_code, p.phone
    FROM visits v
    JOIN patients p ON p.id = v.patient_id
    WHERE v.follow_up_date IS NOT NULL
      AND v.follow_up_date <= ?
      AND NOT EXISTS (
        SELECT 1 FROM visits v2
        WHERE v2.patient_id = v.patient_id
          AND v2.visit_date > v.visit_date
      )
    ORDER BY v.follow_up_date ASC
    LIMIT 8
  `, [today]);

  const settings = queryOne('SELECT doctor_first_name, doctor_name FROM settings WHERE id=1') || {};
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = settings.doctor_first_name || (settings.doctor_name || 'Doctor').replace(/^dr\.?\s+/i, '').split(' ')[0] || 'Doctor';

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">${greeting}, Dr. ${firstName} 👋</h1>
        <p class="page-subtitle">${formatDate(today)} — Here's your practice overview</p>
      </div>
      <div class="flex gap-2">
        <button class="btn btn-secondary btn-sm" onclick="window.__navigate('/patients')">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          Search
        </button>
        <button class="btn btn-primary btn-sm" onclick="window.__navigate('/patients/new')">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          New Patient
        </button>
      </div>
    </div>

    <div class="page-content slide-up">

      <!-- Stats -->
      <div class="form-grid form-grid-3 mb-6">
        <div class="stat-card">
          <div class="stat-icon" style="background:rgba(14,165,233,0.15)">
            <svg fill="none" stroke="var(--sky-400)" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          </div>
          <div class="stat-value">${totalPatients.toLocaleString()}</div>
          <div class="stat-label">Total Patients</div>
          <div class="stat-change neutral">Registered in clinic</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:rgba(6,182,212,0.15)">
            <svg fill="none" stroke="var(--teal-400)" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
          </div>
          <div class="stat-value">${visitsThisMonth.toLocaleString()}</div>
          <div class="stat-label">Visits This Month</div>
          <div class="stat-change neutral">${new Date().toLocaleString('default', { month: 'long' })}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:rgba(16,185,129,0.15)">
            <svg fill="none" stroke="var(--success)" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <div class="stat-value">${visitsToday}</div>
          <div class="stat-label">Visits Today</div>
          <div class="stat-change ${visitsToday > 0 ? 'up' : 'neutral'}">${visitsToday > 0 ? 'Active day' : 'No visits yet'}</div>
        </div>
      </div>

      <div class="form-grid" style="grid-template-columns:1fr 340px;gap:24px">
        <!-- Left: Recent Patients -->
        <div>
          <div class="section-header">
            <div class="section-title">Recent Patients</div>
            <button class="btn btn-ghost btn-sm" onclick="window.__navigate('/patients')">View All →</button>
          </div>
          ${recentPatients.length ? `
            <div class="recent-grid">
              ${recentPatients.map(p => `
                <a class="recent-patient-card" onclick="window.__navigate('/patients/${p.id}')">
                  <div class="recent-patient-avatar">${getInitials(p.full_name)}</div>
                  <div class="recent-patient-name truncate">${p.full_name}</div>
                  <div class="patient-code">${p.patient_code}</div>
                  <div class="recent-patient-meta">${p.age}y · ${genderLabel(p.gender)}</div>
                  ${p.last_visit ? `<div class="recent-patient-meta">${formatDate(p.last_visit)}</div>` : '<div class="recent-patient-meta text-tertiary">No visits</div>'}
                </a>
              `).join('')}
            </div>
          ` : `
            <div class="empty-state" style="padding:40px 20px">
              <svg class="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              <h3>No patients yet</h3>
              <p>Register your first patient to get started</p>
              <button class="btn btn-primary btn-sm mt-3" onclick="window.__navigate('/patients/new')">+ New Patient</button>
            </div>
          `}
        </div>

        <!-- Right: Follow-up Tracker -->
        <div>
          <div class="section-header">
            <div class="section-title">Follow-ups Due</div>
            <span class="badge ${followUps.length ? 'badge-warning' : 'badge-neutral'}">${followUps.length}</span>
          </div>
          ${followUps.length ? `
            <div style="display:flex;flex-direction:column;gap:8px">
              ${followUps.map(f => {
                const isOverdue = f.follow_up_date < today;
                return `
                  <a class="followup-card ${isOverdue ? 'followup-overdue' : ''}"
                     onclick="window.__navigate('/patients/${f.patient_id}')">
                    <div style="flex-shrink:0">
                      <svg width="18" height="18" fill="none" stroke="${isOverdue ? '#f87171' : 'var(--teal-400)'}" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                      </svg>
                    </div>
                    <div style="flex:1;min-width:0">
                      <div class="font-semibold text-sm truncate">${f.full_name}</div>
                      <div class="text-xs text-muted mt-1">${f.diagnosis || 'Follow-up'}</div>
                      <div class="text-xs mt-1" style="color:${isOverdue ? '#f87171' : 'var(--teal-400)'}">
                        ${isOverdue ? '⚠ Overdue: ' : '📅 '}${formatDate(f.follow_up_date)}
                      </div>
                    </div>
                    <span class="patient-code">${f.patient_code}</span>
                  </a>
                `;
              }).join('')}
            </div>
          ` : `
            <div class="card card-p" style="text-align:center;padding:30px">
              <svg width="40" height="40" fill="none" stroke="var(--text-tertiary)" viewBox="0 0 24 24" style="margin:0 auto 10px;opacity:0.4"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <p class="text-sm text-muted">No pending follow-ups today</p>
            </div>
          `}

          <!-- Quick Actions -->
          <div style="margin-top:20px">
            <div class="section-title" style="margin-bottom:12px">Quick Actions</div>
            <div style="display:flex;flex-direction:column;gap:8px">
              <button class="btn btn-secondary btn-block" onclick="window.__navigate('/patients/new')">
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>
                Register New Patient
              </button>
              <button class="btn btn-secondary btn-block" onclick="window.__navigate('/patients')">
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                Search Patient Files
              </button>
              <button class="btn btn-secondary btn-block" onclick="window.__navigate('/settings?tab=backup')">
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"/></svg>
                Backup to Drive
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}
function genderLabel(g) {
  return g === 'M' ? 'Male' : g === 'F' ? 'Female' : 'Other';
}
function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
