// ============================================================
// DocRx — Visit Form (New & Edit)
// ============================================================
import { queryAll, queryOne, run, runGetId } from '../db/index.js';
import { navigate } from '../router.js';
import { toast } from '../components/Toast.js';
import { createAutocomplete } from '../components/Autocomplete.js';
import { showModal } from '../components/Modal.js';

export function renderVisitForm(container, params) {
  const { patientId, visitId } = params;
  const isEdit = !!visitId;
  const patient = queryOne('SELECT * FROM patients WHERE id=? AND deleted=0', [patientId]);

  if (!patient) {
    container.innerHTML = `<div class="page-content"><div class="empty-state"><h3>Patient not found</h3></div></div>`;
    return;
  }

  const existing = isEdit ? queryOne('SELECT * FROM visits WHERE id=? AND patient_id=? AND deleted=0', [visitId, patientId]) : null;
  const today    = new Date().toISOString().slice(0, 10);
  // Default to locked if editing a past visit, unless we are explicitly unlocking it
  let isLocked = isEdit && existing && existing.visit_date < today && !window.__visitUnlocked;

  // Function to re-render when unlocked
  function renderInner() {
    // Medicine rows state
    let rxRows = [];
    if (isEdit) {
      const rawRx = queryAll('SELECT * FROM prescriptions WHERE visit_id=? AND deleted=0 ORDER BY sort_order ASC', [visitId]);
      const rxMap = new Map();
      rawRx.forEach(r => { if (!rxMap.has(r.medicine_name)) rxMap.set(r.medicine_name, r); });
      rxRows = Array.from(rxMap.values());
    }

  // Last visit for "Copy Prescription" feature
  const lastVisits = queryAll(`
    SELECT v.id, v.visit_date, v.diagnosis FROM visits v
    WHERE v.patient_id=? AND v.id != ? AND v.deleted=0
    ORDER BY v.visit_date DESC LIMIT 5
  `, [patientId, visitId || '']);

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">${isEdit ? 'Edit Visit' : 'New Visit'}</h1>
        <p class="page-subtitle">${patient.full_name} · <span class="patient-code">${patient.patient_code}</span></p>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="window.__navigate('/patients/${patientId}')">
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
        Patient Profile
      </button>
    </div>

    <div class="page-content slide-up">
      ${isLocked ? `` : ''}

      <form id="visit-form" novalidate>
        <!-- Mobile Clinical Alerts & Quick Links (visible only on mobile) -->
        <div class="hide-on-desktop mb-4 no-print" style="display:flex; flex-direction:column; gap:12px;">
          <div class="card card-p" style="border:1px solid #f87171; background:rgba(239, 68, 68, 0.05)">
            <div class="section-title mb-2" style="color:#ef4444; display:flex; justify-content:space-between; align-items:center;">
              <div style="display:flex; align-items:center; gap:6px;">
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                Clinical Alerts
              </div>
              <button type="button" class="btn btn-ghost btn-sm" style="color:#ef4444;padding:2px 6px;height:auto" onclick="window.__quickEditAlerts('${patientId}')">Edit</button>
            </div>
            ${patient.allergies ? `<div style="margin-bottom:8px"><span class="text-xs font-bold" style="color:#f87171">ALLERGIES:</span> <span class="text-sm font-semibold">${e(patient.allergies)}</span></div>` : ''}
            ${patient.chronic_conditions ? `<div><span class="text-xs font-bold" style="color:#fb923c">CONDITIONS:</span> <span class="text-sm font-semibold">${e(patient.chronic_conditions)}</span></div>` : ''}
            ${!patient.allergies && !patient.chronic_conditions ? `<div class="text-xs" style="color:#fca5a5">No known allergies or conditions recorded.</div>` : ''}
          </div>

          <button type="button" class="btn btn-secondary btn-block btn-lg" onclick="window.__toggleMobilePrevRx(true)" style="display:flex; align-items:center; justify-content:center; gap:8px;">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
            View Previous Visit Records
          </button>
        </div>

        <div class="visit-form-layout">
          <!-- Left Column -->
          <div>

            <!-- Visit Info -->
            <div class="card card-p mb-4">
              <div class="section-title mb-4">Visit Information</div>
              <div class="flex gap-2 mb-3" style="flex-direction: row !important; flex-wrap: nowrap !important;">
                <div class="form-group" style="flex:1;">
                  <label class="form-label" for="visit_date">Visit Date <span class="req">*</span></label>
                  <input type="date" id="visit_date" class="input" value="${existing?.visit_date || new Date().toISOString().split('T')[0]}" ${isLocked ? 'disabled' : ''} />
                </div>
                <div class="form-group" style="flex:1;">
                  <label class="form-label" for="follow_up_date">Follow-up Date</label>
                  <input type="date" id="follow_up_date" class="input" value="${existing?.follow_up_date || ''}" min="${today}" ${isLocked ? 'disabled' : ''} />
                </div>
              </div>
              <div class="form-group mt-3">
                <label class="form-label">Visit Type</label>
                <div class="flex gap-2" style="flex-direction: row !important; flex-wrap: nowrap !important;">
                  <button type="button" style="flex:1;justify-content:center" class="btn btn-sm ${(existing?.visit_type || 'New') === 'New' ? 'btn-success' : 'btn-secondary'}" id="type-new" onclick="setVisitType('New')">New</button>
                  <button type="button" style="flex:1;justify-content:center" class="btn btn-sm ${existing?.visit_type === 'Follow-up' ? 'btn-primary' : 'btn-secondary'}" id="type-fu" onclick="setVisitType('Follow-up')">Follow-up</button>
                </div>
                <input type="hidden" id="visit_type" value="${existing?.visit_type || 'New'}" />
              </div>
              <div class="form-group mt-3">
                <label class="form-label">Chief Complaint <span class="req">*</span></label>
                <input class="input" id="chief_complaint" type="text" placeholder="Primary presenting issue" value="${e(existing?.chief_complaint)}" ${isLocked ? 'disabled' : ''} />
              </div>
              <div class="form-group mt-3">
                <label class="form-label">Diagnosis</label>
                <div class="autocomplete-wrap">
                  <input class="input" id="diagnosis" type="text" placeholder="Start typing diagnosis..." value="${e(existing?.diagnosis)}" autocomplete="off" ${isLocked ? 'disabled' : ''} />
                </div>
              </div>
              <div class="form-group mt-3">
                <label class="form-label">Clinical Notes</label>
                <textarea class="textarea" id="clinical_notes" placeholder="Observations, examination findings, history..." rows="3" ${isLocked ? 'disabled' : ''}>${e(existing?.clinical_notes)}</textarea>
              </div>
            </div>

            <!-- Vitals -->
            <div class="card card-p mb-4">
              <div class="section-title mb-4">Vitals</div>
              <div class="vitals-grid">
                <div class="vital-card">
                  <div class="vital-label">Blood Pressure</div>
                  <input class="input" id="bp" type="text" placeholder="120/80" value="${e(existing?.bp)}" style="font-family:var(--font-mono)" ${isLocked ? 'disabled' : ''} />
                  <div class="vital-unit">mmHg</div>
                </div>
                <div class="vital-card">
                  <div class="vital-label">Temperature</div>
                  <input class="input" id="temperature" type="number" step="0.1" placeholder="98.6" value="${e(existing?.temperature)}" style="font-family:var(--font-mono)" ${isLocked ? 'disabled' : ''} />
                  <div class="vital-unit">°F</div>
                </div>
                <div class="vital-card">
                  <div class="vital-label">Weight</div>
                  <input class="input" id="weight" type="number" step="0.1" placeholder="70.0" value="${e(existing?.weight)}" style="font-family:var(--font-mono)" ${isLocked ? 'disabled' : ''} />
                  <div class="vital-unit">kg</div>
                </div>
                <div class="vital-card">
                  <div class="vital-label">Height</div>
                  <input class="input" id="height" type="number" step="0.1" placeholder="170" value="${e(existing?.height)}" style="font-family:var(--font-mono)" ${isLocked ? 'disabled' : ''} />
                  <div class="vital-unit">cm</div>
                </div>
                <div class="vital-card" id="bmi-card">
                  <div class="vital-label">BMI</div>
                  <div class="vital-value" id="bmi-display" style="font-size:1.6rem">
                    ${existing?.bmi ? existing.bmi.toFixed(1) : '—'}
                  </div>
                  <div id="bmi-category" class="badge mt-1" style="align-self:flex-start">
                    ${existing?.bmi ? bmiCategory(existing.bmi) : ''}
                  </div>
                </div>
                <div class="vital-card">
                  <div class="vital-label">SpO₂</div>
                  <input class="input" id="spo2" type="number" min="0" max="100" placeholder="99" value="${e(existing?.spo2)}" style="font-family:var(--font-mono)" ${isLocked ? 'disabled' : ''} />
                  <div class="vital-unit">%</div>
                </div>
                <div class="vital-card">
                  <div class="vital-label">Pulse</div>
                  <input class="input" id="pulse" type="number" min="0" placeholder="72" value="${e(existing?.pulse)}" style="font-family:var(--font-mono)" ${isLocked ? 'disabled' : ''} />
                  <div class="vital-unit">bpm</div>
                </div>
              </div>
            </div>

            <!-- Prescriptions -->
            <div class="card card-p mb-4">
              <div class="section-header">
                <div class="section-title">Prescriptions</div>
                <div class="flex gap-2">

                  <button type="button" class="btn btn-primary btn-sm" id="add-rx-btn" ${isLocked ? 'disabled' : ''}>
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                    Add Medicine
                  </button>
                </div>
              </div>

              <datalist id="freq-options">
                <option value="OD (1-0-0)"></option>
                <option value="OD (0-0-1)"></option>
                <option value="BD (1-0-1)"></option>
                <option value="TDS (1-1-1)"></option>
                <option value="QID (1-1-1-1)"></option>
                <option value="SOS (As needed)"></option>
              </datalist>

              <datalist id="instr-options">
                <option value="Before Food"></option>
                <option value="After Food"></option>
                <option value="With Food"></option>
                <option value="Empty Stomach"></option>
                <option value="Local Application"></option>
                <option value="Take with warm water"></option>
                <option value="Take with milk"></option>
                <option value="Chew well"></option>
                <option value="Apply twice a day"></option>
                <option value="Swallow whole"></option>
              </datalist>

              <div id="rx-table-header" class="hidden" style="display:grid;grid-template-columns:2fr 1fr 1.2fr 0.8fr 1fr 1.2fr 34px;gap:8px;padding:0 12px;margin-bottom:4px">
                ${['Medicine', 'Dosage', 'Frequency', 'Route', 'Duration', 'Instructions', ''].map(h =>
                  `<div class="text-xs font-bold text-tertiary">${h}</div>`
                ).join('')}
              </div>

              <div id="rx-rows"></div>

              <div id="rx-empty" class="text-sm text-tertiary" style="padding:16px;text-align:center">
                No medicines added yet. Click "Add Medicine" to start.
              </div>
            </div>

            <!-- Diagnostic Tests -->
            <div class="card card-p mb-6">
              <div class="section-header">
                <div class="section-title">Investigations</div>
                <button type="button" class="btn btn-primary btn-sm" id="add-test-btn" ${isLocked ? 'disabled' : ''}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                  Add Test
                </button>
              </div>
              <div id="test-rows"></div>
              <div id="test-empty" class="text-sm text-tertiary" style="padding:16px;text-align:center">
                No investigations ordered.
              </div>
            </div>

            <!-- Fee -->
            <div class="card card-p mb-6" style="display:flex; justify-content:space-between; align-items:center;">
              <div class="section-title mb-0">Consultation Fee (₹)</div>
              <input class="input" id="fee" type="number" placeholder="e.g. 500" value="${existing?.fee || ''}" style="max-width:120px; text-align:right;" ${isLocked ? 'disabled' : ''} />
            </div>

            ${!isLocked ? `
            <div class="flex gap-3 visit-form-actions">
              <button type="submit" class="btn btn-primary btn-lg" id="save-visit-btn">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                ${isEdit ? 'Update Visit' : 'Save Visit'}
              </button>
              <button type="button" class="btn btn-primary btn-lg" id="save-print-visit-btn" style="background:var(--sky-500)">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                Save & Print
              </button>
              <button type="button" class="btn btn-secondary btn-lg" onclick="if(confirm('Save and send to WhatsApp?')) { document.getElementById('save-visit-btn').click(); setTimeout(() => window.__sendWhatsApp(${visitId}), 500); }">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                WhatsApp
              </button>
              <button type="button" class="btn btn-secondary btn-lg" onclick="window.__navigate('/patients/${patientId}')">Cancel</button>
              ${isEdit ? `
              <button type="button" class="btn btn-lg" style="background:#ef4444;color:white;margin-left:auto" onclick="window.__deleteVisit(${visitId}, ${patientId})">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
              ` : ''}
            </div>
            ` : `
            <div class="flex gap-3 visit-form-actions">
              <button type="button" class="btn btn-primary btn-lg" onclick="window.__printVisit(${visitId})">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                Print Prescription
              </button>
              <button type="button" class="btn btn-secondary btn-lg" onclick="window.__sendWhatsApp(${visitId})">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                WhatsApp
              </button>
            </div>
            `}
          </div>

          <!-- Right Sidebar: Clinical Alerts & Last Prescription -->
          <div class="no-print right-sidebar-wrap" style="display:flex;flex-direction:column;gap:16px">
            
            <!-- Alerts: desktop only (hidden on mobile) -->
            <div class="card card-p hide-on-mobile" style="border:1px solid #f87171; background:rgba(239, 68, 68, 0.05)">
              <div class="section-title mb-2" style="color:#ef4444; display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; align-items:center; gap:6px;">
                  <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                  Clinical Alerts
                </div>
                <button type="button" class="btn btn-ghost btn-sm" style="color:#ef4444;padding:2px 6px;height:auto" onclick="window.__quickEditAlerts(${patientId})">Edit</button>
              </div>
              ${patient.allergies ? `<div style="margin-bottom:8px"><span class="text-xs font-bold" style="color:#f87171">ALLERGIES:</span> <span class="text-sm font-semibold">${e(patient.allergies)}</span></div>` : ''}
              ${patient.chronic_conditions ? `<div><span class="text-xs font-bold" style="color:#fb923c">CONDITIONS:</span> <span class="text-sm font-semibold">${e(patient.chronic_conditions)}</span></div>` : ''}
              ${!patient.allergies && !patient.chronic_conditions ? `<div class="text-xs" style="color:#fca5a5">No known allergies or conditions recorded.</div>` : ''}
            </div>

            <!-- Previous Prescriptions Card (drawer on mobile) -->
            <div id="prev-rx-container" class="card card-p prev-rx-sidebar-container" style="position:sticky;top:20px">
              <!-- Mobile Back Header -->
              <div class="prev-rx-mobile-header mb-4">
                <button type="button" class="btn btn-ghost btn-sm" onclick="window.__toggleMobilePrevRx(false)" style="padding-left:0; font-size:0.95rem;">
                  <span class="hide-on-mobile">← Back to Visit Form</span>
                  <span class="hide-on-desktop">← Back</span>
                </button>
                <div class="font-bold text-base" style="margin-left:auto; color:var(--text-primary);">Previous Visit Details</div>
              </div>

              <div class="section-title mb-3 hide-on-mobile">Previous Prescriptions</div>
              <div style="max-height:600px;overflow-y:auto;padding-right:8px" id="prev-rx-scroll-content">
                ${renderLastRxSidebar(patientId, visitId)}
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  `;

  // Mobile Previous Records Drawer Toggle
  window.__toggleMobilePrevRx = (open) => {
    const el = container.querySelector('#prev-rx-container');
    if (el) {
      if (open) {
        el.classList.add('open');
      } else {
        el.classList.remove('open');
      }
    }
  };

  // --- Quick Edit Alerts & Delete Visit ---
  window.__quickEditAlerts = async (pId) => {
    const { queryOne, run } = await import('../db/index.js');
    const { showModal } = await import('../components/Modal.js');
    const p = queryOne('SELECT allergies, chronic_conditions FROM patients WHERE id=? AND deleted=0', [pId]);
    
    showModal({
      title: 'Edit Alerts',
      bodyHtml: `
        <div class="form-group mb-3">
          <label class="form-label" style="font-size:0.85rem">Allergies (leave empty if none)</label>
          <input type="text" class="input" id="edit-allergies-input" value="${e(p.allergies || '')}" style="width:100%" />
        </div>
        <div class="form-group">
          <label class="form-label" style="font-size:0.85rem">Chronic Conditions (leave empty if none)</label>
          <input type="text" class="input" id="edit-chronic-input" value="${e(p.chronic_conditions || '')}" style="width:100%" />
        </div>
      `,
      confirmText: 'Save Alerts',
      onConfirm: (overlay) => {
        const a = overlay.querySelector('#edit-allergies-input').value;
        const c = overlay.querySelector('#edit-chronic-input').value;
        run('UPDATE patients SET allergies=?, chronic_conditions=?, updated_at=datetime(\'now\',\'localtime\') WHERE id=?', [a.trim()||null, c.trim()||null, pId]);
        window.location.reload();
      }
    });
  };

  window.__deleteVisit = async (vId, pId) => {
    if (!confirm('Are you sure you want to delete this visit completely? This cannot be undone.')) return;
    const { run } = await import('../db/index.js');
    const now = new Date().toISOString();
    run('UPDATE visits SET deleted=1, deleted_at=?, updated_at=? WHERE id=?', [now, now, vId]);
    run('UPDATE prescriptions SET deleted=1, deleted_at=?, updated_at=? WHERE visit_id=?', [now, now, vId]);
    run('UPDATE diagnostic_tests SET deleted=1, deleted_at=?, updated_at=? WHERE visit_id=?', [now, now, vId]);
    window.__navigate('/patients/' + pId);
  };

  // --- Visit type toggle ---
  window.setVisitType = (type) => {
    container.querySelector('#visit_type').value = type;
    container.querySelector('#type-new').className = `btn btn-sm ${type === 'New' ? 'btn-success' : 'btn-secondary'}`;
    container.querySelector('#type-fu').className  = `btn btn-sm ${type === 'Follow-up' ? 'btn-primary' : 'btn-secondary'}`;
  };

  // --- BMI real-time calculation ---
  function updateBMI() {
    const w = parseFloat(container.querySelector('#weight')?.value);
    const h = parseFloat(container.querySelector('#height')?.value);
    const bmiDisplay  = container.querySelector('#bmi-display');
    const bmiCatEl   = container.querySelector('#bmi-category');
    if (w > 0 && h > 0) {
      const bmi = (w / Math.pow(h / 100, 2)).toFixed(1);
      bmiDisplay.textContent = bmi;
      bmiDisplay.className = `vital-value bmi-${bmiClass(parseFloat(bmi))}`;
      bmiCatEl.textContent  = bmiCategory(parseFloat(bmi));
      bmiCatEl.className    = `badge badge-${bmiClass(parseFloat(bmi))} mt-1`;
    } else {
      bmiDisplay.textContent = '—';
      bmiDisplay.className   = 'vital-value';
      bmiCatEl.textContent   = '';
    }
  }
  container.querySelector('#weight')?.addEventListener('input', updateBMI);
  container.querySelector('#height')?.addEventListener('input', updateBMI);

  container.querySelector('#weight')?.addEventListener('input', updateBMI);
  container.querySelector('#height')?.addEventListener('input', updateBMI);

  // --- Unlock Logic ---
  window.__unlockVisit = () => {
    const bodyHtml = `
      <div style="margin-bottom: 16px; color: var(--warning-text); font-size: 0.9rem; line-height: 1.4; background: var(--warning-soft); padding: 12px; border-radius: 8px; border: 1px solid rgba(245,158,11,0.2);">
        <div style="display:flex; align-items:center; gap:8px;">
          <svg style="min-width:20px;width:20px;height:20px;color:var(--warning)" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
          <span>This visit was recorded on ${formatDate(existing?.visit_date)}. Editing requires password verification.</span>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" style="font-weight:600; font-size:0.9rem; margin-bottom:6px; display:block;">Admin Password</label>
        <input type="password" class="input" id="unlock-password-input" placeholder="Enter password to unlock" style="width:100%" />
      </div>
    `;

    showModal({
      title: 'Unlock Visit',
      bodyHtml,
      confirmText: 'Unlock',
      cancelText: 'Cancel',
      onCancel: () => {
        window.history.back();
      },
      onConfirm: async (overlay) => {
        const pwd = overlay.querySelector('#unlock-password-input').value;
        if (!pwd) {
          toast.error('Password is required.');
          return false;
        }
        
        try {
          const settings = queryOne('SELECT password_hash, password_salt FROM settings WHERE id=1');
          const { verifyPassword } = await import('../auth/crypto.js');
          const isValid = await verifyPassword(pwd, settings.password_salt, settings.password_hash);
          
          if (isValid) {
            isLocked = false;
            renderInner();
            toast.success('Visit unlocked for editing.');
          } else {
            toast.error('Incorrect password.');
          }
        } catch (err) {
          console.error(err);
          toast.error('Error unlocking visit.');
        }
      }
    });
  };

  // --- Diagnosis autocomplete ---
  const diagInput = container.querySelector('#diagnosis');
  if (diagInput && !isLocked) {
    createAutocomplete({
      input: diagInput,
      fetchFn: async (val) => {
        const parts = val.split(',');
        const lastPart = parts[parts.length - 1].trim();
        if (lastPart.length < 2) return [];
        const rows = queryAll(
          `SELECT name FROM diagnosis_suggestions WHERE name LIKE ? ORDER BY use_count DESC LIMIT 8`,
          [`%${lastPart}%`]
        );
        return rows.map(r => ({ label: r.name, data: r }));
      },
      onSelect: (item, originalValue) => {
        const parts = originalValue.split(',');
        parts[parts.length - 1] = (parts.length > 1 ? ' ' : '') + item.label;
        return parts.join(',') + ', ';
      },
    });
  }

  // --- Prescription rows ---
  let rxRowData = rxRows.map(r => ({ ...r }));

  function refreshRxTable() {
    const rowsEl = container.querySelector('#rx-rows');
    const hdrEl  = container.querySelector('#rx-table-header');
    const emptyEl = container.querySelector('#rx-empty');

    if (!rxRowData.length) {
      rowsEl.innerHTML = '';
      hdrEl.style.display = 'none';
      emptyEl.style.display = 'block';
      return;
    }
    emptyEl.style.display = 'none';
    hdrEl.style.display = 'grid';

    rowsEl.innerHTML = rxRowData.map((r, i) => `
      <div class="rx-row" data-idx="${i}">
        <div class="autocomplete-wrap">
          <input class="input rx-med" type="text" placeholder="Medicine name" value="${e(r.medicine_name)}" data-idx="${i}" autocomplete="off" ${isLocked ? 'disabled' : ''} />
        </div>
        <input class="input" type="text" placeholder="500mg" value="${e(r.dosage)}" data-field="dosage" data-idx="${i}" ${isLocked ? 'disabled' : ''} />
        <input class="input" type="text" list="freq-options" placeholder="1-0-1 / OD" value="${e(r.frequency)}" data-field="frequency" data-idx="${i}" ${isLocked ? 'disabled' : ''} />
        <select class="select" data-field="route" data-idx="${i}" ${isLocked ? 'disabled' : ''}>
          ${['Oral','Topical','Injection','Drops','Inhalation','IV','IM'].map(rt =>
            `<option value="${rt}" ${r.route === rt ? 'selected' : ''}>${rt}</option>`
          ).join('')}
        </select>
        <input class="input" type="text" placeholder="5 days" value="${e(r.duration)}" data-field="duration" data-idx="${i}" ${isLocked ? 'disabled' : ''} />
        <input class="input" type="text" list="instr-options" placeholder="After Food" value="${e(r.instructions)}" data-field="instructions" data-idx="${i}" ${isLocked ? 'disabled' : ''} />
        ${!isLocked ? `
        <button type="button" class="btn btn-ghost btn-icon btn-sm rx-delete" data-idx="${i}" title="Remove">
          <svg width="14" height="14" fill="none" stroke="#f87171" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>` : '<div></div>'}
      </div>
    `).join('');

    // Wire autocomplete for each medicine input
    rowsEl.querySelectorAll('.rx-med').forEach((inp) => {
      const idx = parseInt(inp.dataset.idx, 10);
      createAutocomplete({
        input: inp,
        fetchFn: async (q) => {
          const rows = queryAll(
            `SELECT name, default_dosage, default_frequency, default_instructions, default_route
             FROM medicines WHERE name LIKE ? AND is_active=1 ORDER BY use_count DESC LIMIT 8`,
            [`%${q}%`]
          );
          return rows.map(r => ({ label: r.name, sublabel: r.default_dosage || '', data: r }));
        },
        onSelect: (item) => {
          rxRowData[idx].medicine_name = item.label;
          // Only auto-fill dosage and instructions if the user hasn't typed anything yet
          if (!rxRowData[idx].dosage) rxRowData[idx].dosage = item.data.default_dosage || '';
          if (!rxRowData[idx].instructions) rxRowData[idx].instructions = item.data.default_instructions || '';
          // Explicitly do NOT auto-fill frequency per user request (decoupled from medicine)
          rxRowData[idx].route = item.data.default_route || rxRowData[idx].route;
          refreshRxTable();
        },
        minChars: 2,
      });
    });

    // Wire field changes
    rowsEl.querySelectorAll('[data-field]').forEach(inp => {
      inp.addEventListener('input', () => {
        const idx = parseInt(inp.dataset.idx, 10);
        rxRowData[idx][inp.dataset.field] = inp.value;
      });
    });
    rowsEl.querySelectorAll('.rx-med').forEach(inp => {
      inp.addEventListener('input', () => {
        const idx = parseInt(inp.dataset.idx, 10);
        rxRowData[idx].medicine_name = inp.value;
      });
    });

    // Delete row
    rowsEl.querySelectorAll('.rx-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx, 10);
        rxRowData.splice(idx, 1);
        refreshRxTable();
      });
    });
  }

  refreshRxTable();

  container.querySelector('#add-rx-btn')?.addEventListener('click', () => {
    rxRowData.push({ medicine_name: '', dosage: '', frequency: '', route: 'Oral', duration: '', instructions: '' });
    refreshRxTable();
    // Focus last medicine input
    const inputs = container.querySelectorAll('.rx-med');
    inputs[inputs.length - 1]?.focus();
  });

  // --- Copy prescription ---
  const copyBtn = container.querySelector('#copy-rx-btn');
  const copyDropdown = container.querySelector('#copy-rx-dropdown');

  copyBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    copyDropdown?.classList.toggle('open');
  });
  document.addEventListener('click', () => copyDropdown?.classList.remove('open'));

  window.__copyRx = (fromVisitId) => {
    const meds = queryAll('SELECT * FROM prescriptions WHERE visit_id=? AND deleted=0 ORDER BY sort_order ASC', [fromVisitId]);
    rxRowData = meds.map(m => ({ ...m, id: undefined }));
    refreshRxTable();
    copyDropdown?.classList.remove('open');
    toast.info('Prescription copied from previous visit.');
  };

  // --- Diagnostic test rows ---
  let testRowData = [];
  if (isEdit) {
    const rawTests = queryAll('SELECT * FROM diagnostic_tests WHERE visit_id=? AND deleted=0', [visitId]);
    const testMap = new Map();
    rawTests.forEach(t => { if (!testMap.has(t.test_name)) testMap.set(t.test_name, t); });
    testRowData = Array.from(testMap.values());
  }
  function refreshTestTable() {
    const rowsEl  = container.querySelector('#test-rows');
    const emptyEl = container.querySelector('#test-empty');
    if (!testRowData.length) { rowsEl.innerHTML = ''; emptyEl.style.display = 'block'; return; }
    emptyEl.style.display = 'none';
    rowsEl.innerHTML = testRowData.map((t, i) => `
      <div class="test-row" data-idx="${i}">
        <div class="autocomplete-wrap">
          <input class="input test-name" type="text" placeholder="Test name" value="${e(t.test_name)}" data-idx="${i}" autocomplete="off" ${isLocked ? 'disabled' : ''} />
        </div>
        <input class="input" type="text" placeholder="Instructions" value="${e(t.instructions)}" data-field="instructions" data-idx="${i}" ${isLocked ? 'disabled' : ''} />
        <select class="select" data-field="urgency" data-idx="${i}" ${isLocked ? 'disabled' : ''}>
          <option value="Routine" ${(t.urgency||'Routine')==='Routine'?'selected':''}>Routine</option>
          <option value="Urgent" ${t.urgency==='Urgent'?'selected':''}>Urgent</option>
        </select>
        ${!isLocked ? `
        <button type="button" class="btn btn-ghost btn-icon btn-sm test-delete" data-idx="${i}">
          <svg width="14" height="14" fill="none" stroke="#f87171" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
        ` : '<div></div>'}
      </div>
    `).join('');

    rowsEl.querySelectorAll('.test-name').forEach(inp => {
      const idx = parseInt(inp.dataset.idx, 10);
      createAutocomplete({
        input: inp,
        fetchFn: async (q) => {
          const rows = queryAll(`SELECT name, default_instructions FROM test_catalog WHERE name LIKE ? ORDER BY use_count DESC LIMIT 8`, [`%${q}%`]);
          return rows.map(r => ({ label: r.name, sublabel: r.default_instructions || '', data: r }));
        },
        onSelect: (item) => {
          testRowData[idx].test_name    = item.label;
          testRowData[idx].instructions = item.data.default_instructions || '';
          refreshTestTable();
        },
      });
      inp.addEventListener('input', () => { testRowData[idx].test_name = inp.value; });
    });
    rowsEl.querySelectorAll('[data-field]').forEach(inp => {
      inp.addEventListener('change', () => { testRowData[parseInt(inp.dataset.idx,10)][inp.dataset.field] = inp.value; });
    });
    rowsEl.querySelectorAll('.test-delete').forEach(btn => {
      btn.addEventListener('click', () => { testRowData.splice(parseInt(btn.dataset.idx,10),1); refreshTestTable(); });
    });
  }

  refreshTestTable();

  container.querySelector('#add-test-btn')?.addEventListener('click', () => {
    testRowData.push({ test_name: '', instructions: '', urgency: 'Routine' });
    refreshTestTable();
    container.querySelectorAll('.test-name').at(-1)?.focus();
  });

  // --- Form save ---
  let printAfterSave = false;
  container.querySelector('#save-print-visit-btn')?.addEventListener('click', () => {
    printAfterSave = true;
    container.querySelector('#visit-form').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  });

  container.querySelector('#visit-form')?.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const getValue = (sel) => container.querySelector(sel)?.value?.trim() || '';
    const chief = getValue('#chief_complaint');
    if (!chief) { toast.error('Chief complaint is required.'); return; }

    const rawDx = getValue('#diagnosis') || '';
    const cleanedDx = rawDx.split(',').map(d => d.trim()).filter(Boolean).join(', ') || null;

    const w = parseFloat(getValue('#weight')) || null;
    const h = parseFloat(getValue('#height')) || null;
    const bmi = w && h ? parseFloat((w / Math.pow(h/100, 2)).toFixed(2)) : null;

    const btn = container.querySelector('#save-visit-btn');
    btn.disabled = true;

    try {
      const vId = isEdit ? visitId : crypto.randomUUID();
      if (isEdit) {
        run(`UPDATE visits SET visit_date=?,chief_complaint=?,diagnosis=?,clinical_notes=?,
             bp=?,temperature=?,weight=?,height=?,bmi=?,spo2=?,pulse=?,visit_type=?,
             follow_up_date=?,fee=?,updated_at=datetime('now','localtime') WHERE id=?`,
          [getValue('#visit_date'), chief, cleanedDx, getValue('#clinical_notes')||null,
           getValue('#bp')||null, getValue('#temperature')||null, w, h, bmi,
           getValue('#spo2')||null, getValue('#pulse')||null, getValue('#visit_type'),
           getValue('#follow_up_date')||null, getValue('#fee') || 0, vId]);

        // Soft delete prescriptions & tests
        const now = new Date().toISOString();
        run("UPDATE prescriptions SET deleted=1, deleted_at=?, updated_at=? WHERE visit_id=?", [now, now, vId]);
        run("UPDATE diagnostic_tests SET deleted=1, deleted_at=?, updated_at=? WHERE visit_id=?", [now, now, vId]);
      } else {
        run(
          `INSERT INTO visits (id,patient_id,visit_date,chief_complaint,diagnosis,clinical_notes,
           bp,temperature,weight,height,bmi,spo2,pulse,visit_type,follow_up_date,fee,updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now','localtime'))`,
          [vId, patientId, getValue('#visit_date'), chief, cleanedDx,
           getValue('#clinical_notes')||null, getValue('#bp')||null,
           getValue('#temperature')||null, w, h, bmi,
           getValue('#spo2')||null, getValue('#pulse')||null, getValue('#visit_type'),
           getValue('#follow_up_date')||null, getValue('#fee') || 0]);
      }

      // Save prescriptions
      rxRowData.forEach((r, i) => {
        if (!r.medicine_name) return;
        run(`INSERT INTO prescriptions (id,visit_id,medicine_name,dosage,frequency,route,duration,instructions,sort_order,updated_at)
             VALUES (?,?,?,?,?,?,?,?,?,datetime('now','localtime'))`,
          [crypto.randomUUID(), vId, r.medicine_name, r.dosage||null, r.frequency||null, r.route||'Oral',
           r.duration||null, r.instructions||null, i]);
        // Update medicine use_count
        run(`UPDATE medicines SET use_count=use_count+1, last_used_at=datetime('now','localtime') WHERE name=?`, [r.medicine_name]);
        // Add to medicines if new
        run(`INSERT OR IGNORE INTO medicines (name, default_route) VALUES (?, 'Oral')`, [r.medicine_name]);
      });

      // Save tests
      testRowData.forEach(t => {
        if (!t.test_name) return;
        run(`INSERT INTO diagnostic_tests (id, visit_id, test_name, instructions, urgency, updated_at)
             VALUES (?,?,?,?,?,datetime('now','localtime'))`,
          [crypto.randomUUID(), vId, t.test_name, t.instructions||null, t.urgency||'Routine']);
        run(`UPDATE test_catalog SET use_count=use_count+1 WHERE name=?`, [t.test_name]);
        run(`INSERT OR IGNORE INTO test_catalog (name) VALUES (?)`, [t.test_name]);
      });

      // Update diagnosis suggestions
      if (cleanedDx) {
        const diagnoses = cleanedDx.split(',').map(d => d.trim()).filter(Boolean);
        diagnoses.forEach(d => {
          run(`INSERT OR IGNORE INTO diagnosis_suggestions (name) VALUES (?)`, [d]);
          run(`UPDATE diagnosis_suggestions SET use_count=use_count+1 WHERE name=?`, [d]);
        });
      }

      toast.success(isEdit ? 'Visit updated successfully.' : 'Visit saved successfully.');
      if (printAfterSave) window.__printVisit(vId);
      setTimeout(() => navigate(`/patients/${patientId}`), printAfterSave ? 500 : 0);
    } catch (err) {
      console.error(err);
      btn.disabled = false;
      toast.error('Failed to save visit.');
    }
  });
} // end renderInner

renderInner();

if (isLocked) {
  setTimeout(() => {
    window.__unlockVisit();
  }, 100);
}
}

// --- Helper Functions ---
function renderLastRxSidebar(patientId, currentVisitId) {
  const { queryAll: qa, queryOne: qo } = { queryAll, queryOne };
  const lastVisits = qa(`
    SELECT id, visit_date, diagnosis, attachment_idb_key FROM visits
    WHERE patient_id=? AND id!=? AND deleted=0
    ORDER BY visit_date DESC LIMIT 3
  `, [patientId, currentVisitId || '']);

  if (!lastVisits.length) return `<p class="text-sm text-muted">No previous prescriptions.</p>`;

  let html = '';
  lastVisits.forEach(v => {
    const meds = qa('SELECT * FROM prescriptions WHERE visit_id=? AND deleted=0 ORDER BY sort_order ASC', [v.id]);
    html += `
      <div style="margin-bottom:16px">
        <div class="flex justify-between items-center mb-2">
          <div class="text-xs text-tertiary font-bold">${formatDate(v.visit_date)} ${v.diagnosis ? `· ${v.diagnosis}` : ''}</div>
          ${v.attachment_idb_key ? `<button type="button" class="btn btn-ghost btn-icon" style="padding:12px;" onclick="window.__viewFile('${v.attachment_idb_key}')" title="View attached report"><svg style="width:24px;height:24px;" fill="none" stroke="var(--teal-400)" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg></button>` : ''}
        </div>
        ${meds.length ? meds.map((m, i) => `
          <div style="margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid var(--glass-border)">
            <div class="text-sm font-semibold">${i+1}. ${m.medicine_name}</div>
            <div class="text-xs text-muted mt-1">${[m.dosage, m.frequency, m.duration].filter(Boolean).join(' · ')}</div>
            ${m.instructions ? `<div class="text-xs text-tertiary">${m.instructions}</div>` : ''}
          </div>
        `).join('') : '<p class="text-xs text-muted">No medicines prescribed.</p>'}
      </div>
    `;
  });
  
  return html;
}

function bmiCategory(bmi) {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25)   return 'Normal';
  if (bmi < 30)   return 'Overweight';
  return 'Obese';
}
function bmiClass(bmi) {
  if (bmi < 18.5) return 'underweight';
  if (bmi < 25)   return 'normal';
  if (bmi < 30)   return 'overweight';
  return 'obese';
}
function formatDate(d) {
  if (!d) return '';
  return new Date((d+'T00:00:00')).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
}
function e(val) { return val != null ? String(val).replace(/"/g, '&quot;') : ''; }

