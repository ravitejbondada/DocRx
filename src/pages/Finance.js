// ============================================================
// DocRx — Finance Dashboard
// ============================================================
import { queryAll } from '../db/index.js';

export function renderFinance(container) {
  let currentFilter = 'month'; // default filter

  // Helper to format currency
  const fRev = (val) => val ? '₹' + parseInt(val).toLocaleString('en-IN') : '₹0';

  // Generate month options (Past 12 months)
  const monthOptions = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = d.toISOString().slice(0, 7); // YYYY-MM
    const label = d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    monthOptions.push({ value: val, label });
  }

  function renderInner() {
    let dateCondition = '';
    let params = [];
    
    // Get current date string in local timezone (YYYY-MM-DD)
    const todayObj = new Date();
    // adjust for timezone offset
    const todayStr = new Date(todayObj.getTime() - (todayObj.getTimezoneOffset() * 60000)).toISOString().slice(0, 10);
    
    if (currentFilter === 'today') {
      dateCondition = 'v.visit_date = ?';
      params.push(todayStr);
    } else if (currentFilter === 'week') {
      const startOfWeek = new Date(todayObj);
      startOfWeek.setDate(todayObj.getDate() - todayObj.getDay());
      const startStr = new Date(startOfWeek.getTime() - (startOfWeek.getTimezoneOffset() * 60000)).toISOString().slice(0, 10);
      dateCondition = 'v.visit_date >= ? AND v.visit_date <= ?';
      params.push(startStr, todayStr);
    } else if (currentFilter === 'month') {
      const monthStr = todayStr.slice(0, 7);
      dateCondition = 'v.visit_date LIKE ?';
      params.push(monthStr + '%');
    } else {
      // Specific month (e.g. 2026-05)
      dateCondition = 'v.visit_date LIKE ?';
      params.push(currentFilter + '%');
    }

    const rows = queryAll(`
      SELECT v.id, v.visit_date, v.visit_type, v.fee, p.patient_code, p.full_name 
      FROM visits v 
      JOIN patients p ON v.patient_id = p.id AND p.deleted = 0
      WHERE ${dateCondition} AND v.deleted = 0
      ORDER BY v.visit_date DESC, v.created_at DESC
    `, params);

    let totalRev = 0;
    const uniquePatientCodes = new Set();
    const newPatients = new Set();

    // Group by date
    const dailyMap = {}; // { 'YYYY-MM-DD': { rev: 0, patients: [] } }
    
    rows.forEach(r => {
      const fee = r.fee || 0;
      totalRev += fee;
      
      uniquePatientCodes.add(r.patient_code);
      if (r.visit_type === 'New') {
        newPatients.add(r.patient_code);
      }

      if (!dailyMap[r.visit_date]) {
        dailyMap[r.visit_date] = { rev: 0, patients: [] };
      }
      dailyMap[r.visit_date].rev += fee;
      dailyMap[r.visit_date].patients.push(r);
    });

    const totalCount = uniquePatientCodes.size;
    const newCount = newPatients.size;
    const existCount = totalCount - newCount;
    const sortedDates = Object.keys(dailyMap).sort((a, b) => b.localeCompare(a));

    container.innerHTML = `
      <style>
        .finance-day-details summary::-webkit-details-marker { display: none; }
        .finance-day-details[open] summary { border-bottom: 1px solid var(--glass-border); margin-bottom: 12px; }
        .finance-day-details summary:hover { background: rgba(255,255,255,0.04); }
      </style>
      
      <div class="page-header page-header-finance">
        <div>
          <h1 class="page-title">Financial Overview</h1>
          <p class="page-subtitle">Track your practice revenue and patient footfall.</p>
        </div>
        <div class="finance-period-selector">
          <label class="form-label mb-1">Filter Period</label>
          <select class="select" id="finance-filter">
            <option value="today" ${currentFilter === 'today' ? 'selected' : ''}>Today</option>
            <option value="week" ${currentFilter === 'week' ? 'selected' : ''}>This Week</option>
            <option value="month" ${currentFilter === 'month' ? 'selected' : ''}>This Month</option>
            <optgroup label="Calendar Months">
              ${monthOptions.map(m => `<option value="${m.value}" ${currentFilter === m.value ? 'selected' : ''}>${m.label}</option>`).join('')}
            </optgroup>
          </select>
        </div>
      </div>

      <div class="page-content slide-up">
        <!-- High Level Stats -->
        <div class="form-grid form-grid-4 mb-6">
          <div class="stat-card" style="border-top: 4px solid var(--emerald-500)">
            <div class="stat-value" style="color:var(--emerald-400)">${fRev(totalRev)}</div>
            <div class="stat-label">Total Revenue</div>
          </div>
          <div class="stat-card" style="border-top: 4px solid var(--sky-500)">
            <div class="stat-value" style="color:var(--sky-400)">${totalCount}</div>
            <div class="stat-label">Total Patients</div>
          </div>
          <div class="stat-card" style="border-top: 4px solid var(--teal-500)">
            <div class="stat-value" style="color:var(--teal-400)">${newCount}</div>
            <div class="stat-label">New Patients</div>
          </div>
          <div class="stat-card" style="border-top: 4px solid var(--indigo-500)">
            <div class="stat-value" style="color:var(--indigo-400)">${existCount}</div>
            <div class="stat-label">Existing Patients</div>
          </div>
        </div>

        <!-- Daily Breakdown -->
        <div class="card card-p mb-6">
          <div class="section-title mb-4">Daily Breakdown</div>
          ${sortedDates.length ? `
            <div style="display:flex; flex-direction:column; gap:12px;">
              ${sortedDates.map(date => {
                const dayData = dailyMap[date];
                const dateLabel = new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
                return `
                  <details class="finance-day-details" style="background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); border-radius: var(--radius-md);">
                    <summary style="display:flex; justify-content:space-between; align-items:center; padding: 14px 16px; cursor: pointer; outline: none; list-style: none; transition: background 0.2s;">
                      <div style="display:flex; gap:16px; align-items:center;">
                        <svg width="18" height="18" fill="none" stroke="var(--text-tertiary)" viewBox="0 0 24 24" style="transition:transform 0.2s" class="details-chevron"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                        <span style="font-weight: 700; color: var(--text-primary); font-size: 1rem;">${dateLabel}</span>
                        <span class="badge badge-neutral">${dayData.patients.length} patient${dayData.patients.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div style="font-family:monospace; font-size:1.15em; color:var(--emerald-400); font-weight: 700;">
                        ${fRev(dayData.rev)}
                      </div>
                    </summary>
                    <div style="padding: 0 16px 16px;">
                      <div class="table-responsive">
                        <table class="table" style="background: rgba(0,0,0,0.15); border-radius: var(--radius-sm); overflow: hidden;">
                          <thead>
                            <tr>
                              <th>Patient ID</th>
                              <th>Name</th>
                              <th>Type</th>
                              <th style="text-align:right">Fee</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${dayData.patients.map(p => `
                              <tr>
                                <td style="font-family:monospace; color:var(--teal-400)">${p.patient_code}</td>
                                <td>${p.full_name}</td>
                                <td><span class="badge ${p.visit_type === 'New' ? 'badge-new' : 'badge-followup'}">${p.visit_type || 'Follow-up'}</span></td>
                                <td style="text-align:right; font-family:monospace; color:var(--emerald-400)">${fRev(p.fee)}</td>
                              </tr>
                            `).join('')}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </details>
                `;
              }).join('')}
            </div>
            <style>
              .finance-day-details[open] .details-chevron { transform: rotate(90deg); }
            </style>
          ` : `
            <div class="text-center text-muted" style="padding: 30px; border: 1px dashed var(--glass-border); border-radius: var(--radius-md);">
              <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="margin: 0 auto 10px; opacity: 0.5;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              No visits found for the selected period.
            </div>
          `}
        </div>
      </div>
    `;

    // Attach listener
    container.querySelector('#finance-filter')?.addEventListener('change', (e) => {
      currentFilter = e.target.value;
      renderInner();
    });
  }

  renderInner();
}
