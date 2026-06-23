// ============================================================
// DocRx — New / Edit Patient Registration Page
// ============================================================
import { queryAll, queryOne, run, runGetId } from '../db/index.js';
import { navigate } from '../router.js';
import { toast } from '../components/Toast.js';

export function renderPatientForm(container, params = {}) {
  const { id } = params;
  const isEdit = !!id;
  const existing = isEdit ? queryOne('SELECT * FROM patients WHERE id=? AND deleted=0', [id]) : null;

  if (isEdit && !existing) {
    container.innerHTML = `<div class="empty-state"><h3>Patient not found</h3></div>`;
    return;
  }

  // Next patient code
  let nextCode = 'PAT-0001';
  if (!isEdit) {
    const last = queryOne("SELECT patient_code FROM patients ORDER BY patient_code DESC LIMIT 1");
    if (last?.patient_code) {
      let prefix = 'PAT-';
      let n = 1;
      const match = last.patient_code.match(/^([A-Za-z\-]+)(\d+)$/);
      if (match) {
        prefix = match[1];
        n = parseInt(match[2], 10) + 1;
      } else {
        const digitsMatch = last.patient_code.match(/\d+/);
        if (digitsMatch) {
          n = parseInt(digitsMatch[0], 10) + 1;
        }
      }
      nextCode = prefix + String(isNaN(n) ? 1 : n).padStart(4, '0');
    }
  }

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">${isEdit ? 'Edit Patient' : 'New Patient'}</h1>
        <p class="page-subtitle">${isEdit ? `Editing ${existing.full_name}` : `Patient ID will be: ${nextCode}`}</p>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="history.back()">
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
        Back
      </button>
    </div>

    <div class="page-content slide-up">
      <form id="patient-form" novalidate style="max-width:760px">

        <!-- Duplicate phone warning -->
        <div id="dup-warning" class="alert alert-warning mb-4 hidden">
          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          <span id="dup-text">A patient with this phone number already exists. <a id="dup-link" href="#">View record →</a></span>
        </div>

        <!-- Personal Info -->
        <div class="card card-p mb-4">
          <div class="section-title mb-4">Personal Information</div>
          <div class="form-grid form-grid-2" style="gap:16px">
            <div class="form-group">
              <label class="form-label">Full Name <span class="req">*</span></label>
              <input class="input" id="full_name" type="text" placeholder="Patient's full name" value="${e(existing?.full_name)}" required />
            </div>
            <div class="form-group">
              <label class="form-label">Phone <span class="req">*</span></label>
              <input class="input" id="phone" type="text" placeholder="Mobile or landline number" value="${e(existing?.phone)}" required />
            </div>
            <div class="form-group">
              <label class="form-label">Date of Birth</label>
              <input class="input" id="dob" type="date" value="${e(existing?.dob)}" max="${new Date().toISOString().slice(0,10)}" />
            </div>
            <div class="form-group">
              <label class="form-label">Age <span class="req">*</span></label>
              <input class="input" id="age" type="number" placeholder="Age in years" min="0" max="120" value="${e(existing?.age)}" required />
              <span class="form-hint">Auto-filled from DOB, or enter directly</span>
            </div>
            <div class="form-group">
              <label class="form-label">Gender <span class="req">*</span></label>
              <select class="select" id="gender">
                <option value="">Select gender</option>
                <option value="M" ${existing?.gender === 'M' ? 'selected' : ''}>Male</option>
                <option value="F" ${existing?.gender === 'F' ? 'selected' : ''}>Female</option>
                <option value="Other" ${existing?.gender === 'Other' ? 'selected' : ''}>Other</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Blood Group</label>
              <select class="select" id="blood_group">
                <option value="">Unknown</option>
                ${['A+','A-','B+','B-','O+','O-','AB+','AB-'].map(bg =>
                  `<option value="${bg}" ${existing?.blood_group === bg ? 'selected' : ''}>${bg}</option>`
                ).join('')}
              </select>
            </div>
          </div>
          <div class="form-group mt-4">
            <label class="form-label">Address</label>
            <textarea class="textarea" id="address" placeholder="Residential address (optional)" rows="2">${e(existing?.address)}</textarea>
          </div>
        </div>

        <!-- Medical Info -->
        <div class="card card-p mb-4">
          <div class="section-title mb-4">Medical Information</div>
          <div class="form-grid form-grid-2" style="gap:16px">
            <div class="form-group">
              <label class="form-label">Known Allergies</label>
              <input class="input" id="allergies" type="text" placeholder="e.g., Penicillin, Sulfa drugs" value="${e(existing?.allergies)}" />
              <span class="form-hint">Comma-separated list</span>
            </div>
            <div class="form-group">
              <label class="form-label">Chronic Conditions</label>
              <input class="input" id="chronic_conditions" type="text" placeholder="e.g., Diabetes, Hypertension" value="${e(existing?.chronic_conditions)}" />
              <span class="form-hint">Comma-separated list</span>
            </div>
          </div>
          <div class="form-group mt-4">
            <label class="form-label">General Notes</label>
            <textarea class="textarea" id="notes" placeholder="Persistent medical comments or notes…" rows="3">${e(existing?.notes)}</textarea>
          </div>
        </div>

        <!-- Emergency Contact -->
        <div class="card card-p mb-6">
          <div class="section-title mb-4">Emergency Contact</div>
          <div class="form-grid form-grid-2" style="gap:16px">
            <div class="form-group">
              <label class="form-label">Contact Name</label>
              <input class="input" id="emergency_contact_name" type="text" placeholder="Name of emergency contact" value="${e(existing?.emergency_contact_name)}" />
            </div>
            <div class="form-group">
              <label class="form-label">Contact Phone</label>
              <input class="input" id="emergency_contact_phone" type="tel" placeholder="Phone number" maxlength="15" value="${e(existing?.emergency_contact_phone)}" />
            </div>
          </div>
        </div>

        <div class="flex gap-3">
          <button type="submit" class="btn btn-primary btn-lg" id="save-btn">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            ${isEdit ? 'Save Changes' : 'Register Patient'}
          </button>
          <button type="button" class="btn btn-secondary btn-lg" onclick="history.back()">Cancel</button>
          ${isEdit ? `
          <button type="button" class="btn btn-lg" style="background:#ef4444;color:white;margin-left:auto" onclick="window.__deletePatient('${id}')" title="Delete Patient">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
          ` : ''}
        </div>
      </form>
    </div>
  `;

  // DOB → Age auto-fill
  container.querySelector('#dob').addEventListener('change', (e) => {
    const dob = new Date(e.target.value);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    const ageInput = container.querySelector('#age');
    if (ageInput) ageInput.value = isNaN(age) ? '' : age;
  });

  // --- Delete Patient ---
  window.__deletePatient = async (pId) => {
    if (!confirm('WARNING: Are you sure you want to completely delete this patient and ALL their visits, prescriptions, tests, and financial data? This CANNOT be undone!')) return;
    const { run } = await import('../db/index.js');
    const now = new Date().toISOString();
    run('UPDATE prescriptions SET deleted=1, deleted_at=?, updated_at=? WHERE visit_id IN (SELECT id FROM visits WHERE patient_id=?)', [now, now, pId]);
    run('UPDATE diagnostic_tests SET deleted=1, deleted_at=?, updated_at=? WHERE visit_id IN (SELECT id FROM visits WHERE patient_id=?)', [now, now, pId]);
    run('UPDATE visits SET deleted=1, deleted_at=?, updated_at=? WHERE patient_id=?', [now, now, pId]);
    run('UPDATE patients SET deleted=1, deleted_at=?, updated_at=? WHERE id=?', [now, now, pId]);
    window.__navigate('/patients');
  };

  // Duplicate phone check
  let dupCheckTimeout = null;
  container.querySelector('#phone').addEventListener('input', (e) => {
    clearTimeout(dupCheckTimeout);
    const ph = e.target.value.trim();
    if (ph.length !== 10) { hideDup(); return; }
    dupCheckTimeout = setTimeout(() => {
      const dups = queryAll(
        'SELECT id, full_name, patient_code FROM patients WHERE phone=? AND id!=? AND deleted=0',
        [ph, id || '']
      );
      if (dups.length > 0) {
        showDup(dups, ph);
      } else {
        hideDup();
      }
    }, 300);
  });

  function showDup(dups, phone) {
    const warn = container.querySelector('#dup-warning');
    const text = container.querySelector('#dup-text');
    warn.classList.remove('hidden');
    text.innerHTML = `<strong>${dups.length}</strong> patient(s) already exist with this phone number. <br/><a href="#/patients?q=${phone}" class="text-blue-400 hover:underline" style="display:inline-block;margin-top:4px;font-weight:bold">View all linked patients →</a>`;
  }
  function hideDup() { container.querySelector('#dup-warning').classList.add('hidden'); }

  // Form submit
  container.querySelector('#patient-form').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const getValue = (sel) => container.querySelector(sel)?.value?.trim() || '';

    const full_name = getValue('#full_name');
    const phone     = getValue('#phone');
    const age       = parseInt(getValue('#age'), 10);
    const gender    = getValue('#gender');

    if (!full_name) { toast.error('Full name is required.'); return; }
    if (!phone) { toast.error('Phone number is required.'); return; }
    if (!age || age < 0 || age > 120) { toast.error('Please enter a valid age.'); return; }
    if (!gender) { toast.error('Please select a gender.'); return; }

    // Check dup again
    const dups = queryAll('SELECT id FROM patients WHERE phone=? AND id!=? AND deleted=0', [phone, id || '']);
    if (dups.length > 0 && !isEdit) {
      if (!confirm(`Warning: ${dups.length} patient(s) already exist with the phone number ${phone}.\n\nDo you still want to register this new patient?`)) {
        return;
      }
    }

    const btn = container.querySelector('#save-btn');
    btn.disabled = true;

    try {
      if (isEdit) {
        run(`UPDATE patients SET full_name=?,phone=?,age=?,gender=?,dob=?,blood_group=?,
             address=?,allergies=?,chronic_conditions=?,emergency_contact_name=?,
             emergency_contact_phone=?,notes=?,updated_at=datetime('now','localtime') WHERE id=?`,
          [full_name, phone, age, gender,
           getValue('#dob') || null, getValue('#blood_group') || null,
           getValue('#address') || null, getValue('#allergies') || null,
           getValue('#chronic_conditions') || null,
           getValue('#emergency_contact_name') || null,
           getValue('#emergency_contact_phone') || null,
           getValue('#notes') || null, id]);
        toast.success('Patient record updated.');
        navigate(`/patients/${id}`);
      } else {
        const newId = crypto.randomUUID();
        run(
          `INSERT INTO patients (id, patient_code, full_name, phone, age, gender, dob, blood_group,
           address, allergies, chronic_conditions, emergency_contact_name,
           emergency_contact_phone, notes, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now','localtime'))`,
          [newId, nextCode, full_name, phone, age, gender,
           getValue('#dob') || null, getValue('#blood_group') || null,
           getValue('#address') || null, getValue('#allergies') || null,
           getValue('#chronic_conditions') || null,
           getValue('#emergency_contact_name') || null,
           getValue('#emergency_contact_phone') || null,
           getValue('#notes') || null]);
        toast.success(`Patient registered as ${nextCode}`);
        navigate(`/patients/${newId}`);
      }
    } catch (err) {
      toast.error('Save failed: ' + err.message);
      btn.disabled = false;
    }
  });
}

function e(val) { return val != null ? String(val).replace(/"/g, '&quot;') : ''; }
