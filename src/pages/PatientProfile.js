// ============================================================
// DocRx — Patient Profile Page
// ============================================================
import { queryAll, queryOne } from '../db/index.js';
import { navigate } from '../router.js';

export function renderPatientProfile(container, params) {
  const { id } = params;
  const patient = queryOne('SELECT * FROM patients WHERE id=? AND deleted=0', [id]);

  if (!patient) {
    container.innerHTML = `
      <div class="page-content">
        <div class="empty-state">
          <h3>Patient not found</h3>
          <button class="btn btn-primary btn-sm mt-3" onclick="window.__navigate('/patients')">Back to Patients</button>
        </div>
      </div>`;
    return;
  }

  const visits = queryAll(`
    SELECT v.*,
           COUNT(DISTINCT rx.medicine_name) as rx_count,
           COUNT(DISTINCT dt.test_name) as test_count
    FROM visits v
    LEFT JOIN prescriptions rx ON rx.visit_id = v.id AND rx.deleted = 0
    LEFT JOIN diagnostic_tests dt ON dt.visit_id = v.id AND dt.deleted = 0
    WHERE v.patient_id = ? AND v.deleted = 0
    GROUP BY v.id
    ORDER BY v.visit_date DESC, v.created_at DESC
  `, [id]);

  const totalVisits = visits.length;
  const firstVisit  = visits.length ? visits[visits.length - 1].visit_date : null;
  const lastVisit   = visits.length ? visits[0].visit_date : null;

  const hasAlert = !!(patient.allergies || patient.chronic_conditions);
  const age = patient.dob ? calcAge(patient.dob) : patient.age;

  container.innerHTML = `
    <div class="page-header">
      <div class="flex items-center gap-3">
        <button class="btn btn-ghost btn-icon" onclick="window.__navigate('/patients')" title="Back">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <div>
          <h1 class="page-title">${patient.full_name}</h1>
          <p class="page-subtitle"><span class="patient-code">${patient.patient_code}</span><span class="hide-on-mobile"> · Registered ${formatDate(patient.created_at?.slice(0,10))}</span></p>
        </div>
      </div>
      <div class="flex gap-2">
        <button class="btn btn-secondary btn-sm" onclick="window.__navigate('/patients/${id}/edit')">
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          Edit
        </button>
        <button class="btn btn-primary btn-sm" onclick="window.__navigate('/patients/${id}/visit/new')">
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          New Visit
        </button>
      </div>
    </div>

    <div class="page-content slide-up">

      <!-- Profile Strip -->
      <div class="profile-strip mb-4">
        <div class="profile-header-main">
          <div class="profile-avatar">${getInitials(patient.full_name)}</div>
          <div class="profile-info">
            <div class="profile-name">${patient.full_name}</div>
            <div class="profile-meta">
              <span class="profile-meta-item">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                ${age} years${patient.dob ? ` (${patient.dob})` : ''}
              </span>
              <span class="profile-meta-item">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                ${genderLabel(patient.gender)}
              </span>
              <span class="profile-meta-item">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                ${patient.phone}
              </span>
              ${patient.blood_group ? `
              <span class="profile-meta-item">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
                <span class="badge badge-danger" style="padding:1px 6px">${patient.blood_group}</span>
              </span>` : ''}
            </div>
          </div>
        </div>

        <!-- Analytics -->
        <div class="profile-analytics flex gap-4" style="margin-left:auto">
          <div style="text-align:center">
            <div style="font-size:1.6rem;font-weight:800;color:var(--teal-400)">${totalVisits}</div>
            <div class="text-xs text-tertiary">Total Visits</div>
          </div>
          ${firstVisit ? `
          <div style="text-align:center">
            <div style="font-size:0.8rem;font-weight:600">${formatDate(firstVisit)}</div>
            <div class="text-xs text-tertiary">First Visit</div>
          </div>
          <div style="text-align:center">
            <div style="font-size:0.8rem;font-weight:600">${formatDate(lastVisit)}</div>
            <div class="text-xs text-tertiary">Last Visit</div>
          </div>` : ''}
        </div>
      </div>

      <!-- Clinical Alert Banner -->
      ${hasAlert ? `
      <div class="clinical-alert-strip mb-4">
        <svg class="alert-icon" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
        <div class="clinical-alert-content">
          ${patient.allergies ? `
          <div class="clinical-alert-title">⚠ Known Allergies</div>
          <div class="clinical-alert-text">${patient.allergies}</div>` : ''}
          ${patient.chronic_conditions ? `
          <div class="clinical-alert-title" style="margin-top:${patient.allergies ? 8 : 0}px">🩺 Chronic Conditions</div>
          <div class="clinical-alert-text">${patient.chronic_conditions}</div>` : ''}
        </div>
      </div>` : ''}

      ${patient.notes ? `
      <div class="alert alert-info mb-4">
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        <div><strong>Notes:</strong> ${patient.notes}</div>
      </div>` : ''}

      <!-- Timeline -->
      <div class="section-header">
        <div class="section-title">Clinical Timeline</div>
        <button class="btn btn-primary btn-sm" onclick="window.__navigate('/patients/${id}/visit/new')">
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          Add Visit
        </button>
      </div>

      ${visits.length ? `
      <div class="timeline" id="timeline">
        ${visits.map((v, i) => renderTimelineCard(v, id, i)).join('')}
      </div>
      ` : `
      <div class="empty-state" style="padding:50px 20px">
        <svg class="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
        <h3>No visits yet</h3>
        <p>Record the first visit for this patient</p>
        <button class="btn btn-primary btn-sm mt-3" onclick="window.__navigate('/patients/${id}/visit/new')">+ New Visit</button>
      </div>
      `}
    </div>
  `;

  // Expand/collapse timeline cards
  container.querySelectorAll('.timeline-header').forEach(header => {
    header.addEventListener('click', () => {
      const item = header.closest('.timeline-item');
      item.classList.toggle('expanded');
      const chevron = header.querySelector('.timeline-chevron');
      if (chevron) chevron.style.transform = item.classList.contains('expanded') ? 'rotate(180deg)' : '';
    });
  });

  // Handle visit file attachments
  container.querySelectorAll('.visit-file-upload').forEach(inp => {
    inp.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files);
      if (!files.length) return;
      const vId = inp.dataset.vid;
      
      try {
        const { set, get } = await import('idb-keyval');
        const { run, queryOne } = await import('../db/index.js');
        const { toast } = await import('../components/Toast.js');
        
        toast.info('Processing and stitching reports...');
        const { PDFDocument } = await import('pdf-lib');
        
        let pdfDoc;
        const visitRow = queryOne('SELECT attachment_idb_key FROM visits WHERE id=? AND deleted=0', [vId]);
        const existingKey = visitRow?.attachment_idb_key;
        
        if (existingKey) {
          const existingFile = await get(existingKey);
          if (existingFile && existingFile.type === 'application/pdf') {
            const existingArrayBuffer = await existingFile.arrayBuffer();
            pdfDoc = await PDFDocument.load(existingArrayBuffer);
          }
        }
        
        if (!pdfDoc) {
          pdfDoc = await PDFDocument.create();
        }

        for (const file of files) {
          if (file.type === 'application/pdf') {
            const newArrayBuffer = await file.arrayBuffer();
            const newPdfDoc = await PDFDocument.load(newArrayBuffer);
            const copiedPages = await pdfDoc.copyPages(newPdfDoc, newPdfDoc.getPageIndices());
            copiedPages.forEach((page) => pdfDoc.addPage(page));
          } else if (file.type.startsWith('image/')) {
            const imageBytes = await file.arrayBuffer();
            let image;
            if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
              image = await pdfDoc.embedJpg(imageBytes);
            } else if (file.type === 'image/png') {
              image = await pdfDoc.embedPng(imageBytes);
            } else {
              toast.error(`Unsupported image type: ${file.type}`);
              continue;
            }
            
            const a4W = 595.28; // A4 width in points
            const a4H = 841.89; // A4 height in points
            const page = pdfDoc.addPage([a4W, a4H]);
            
            let { width, height } = image.scale(1);
            const ratio = Math.min(a4W / width, a4H / height);
            width *= ratio;
            height *= ratio;
            
            const x = (a4W - width) / 2;
            const y = (a4H - height) / 2;
            
            page.drawImage(image, { x, y, width, height });
          } else {
             toast.error(`Unsupported file type: ${file.type}`);
          }
        }

        const pdfBytes = await pdfDoc.save();
        const finalFile = new File([pdfBytes], 'Combined_Report.pdf', { type: 'application/pdf' });
        toast.success('Report successfully saved and stitched.');

        const fileKey = 'visit_' + Date.now() + '_Combined_Report.pdf';
        await set(fileKey, finalFile);
        run('UPDATE visits SET attachment_idb_key=? WHERE id=?', [fileKey, vId]);
        
        // Refresh page
        renderPatientProfile(container, { patientId });
      } catch (err) {
        console.error(err);
        const { toast } = await import('../components/Toast.js');
        toast.error('Failed to process attachment.');
      }
    });
  });
}

function renderTimelineCard(v, patientId, index) {
  const isNew = v.visit_type === 'New';
  const vitals = [
    v.bp        ? `BP: ${v.bp}`           : null,
    v.temperature ? `Temp: ${v.temperature}°F` : null,
    v.weight    ? `${v.weight} kg`         : null,
    v.bmi       ? `BMI: ${v.bmi}`         : null,
    v.spo2      ? `SpO₂: ${v.spo2}%`      : null,
    v.pulse     ? `Pulse: ${v.pulse} bpm`  : null,
  ].filter(Boolean);

  const expandedContent = loadVisitDetails(v.id, patientId);

  return `
    <div class="timeline-item">
      <div class="timeline-header">
        <div class="timeline-dot" style="background:${isNew ? 'var(--success)' : 'var(--info)'}"></div>
        <div style="flex:1;min-width:0">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-semibold">${formatDate(v.visit_date)}</span>
            <span class="badge ${isNew ? 'badge-new' : 'badge-followup'}">${v.visit_type}</span>
            ${v.diagnosis ? `<span class="text-sm text-muted truncate">${v.diagnosis}</span>` : ''}
          </div>
          <div class="flex gap-3 mt-1" style="flex-wrap:wrap">
            <span class="text-xs text-tertiary">${v.chief_complaint}</span>
            ${v.rx_count > 0 ? `<span class="text-xs text-accent">💊 ${v.rx_count} medicines</span>` : ''}
            ${v.test_count > 0 ? `<span class="text-xs" style="color:var(--warning)">🧪 ${v.test_count} tests</span>` : ''}
            ${vitals.slice(0,3).map(vit => `<span class="text-xs text-tertiary">${vit}</span>`).join('')}
          </div>
        </div>
        <div class="flex items-center gap-2 timeline-actions">
          <label class="btn btn-ghost btn-icon" title="Attach Report" style="cursor:pointer;position:relative;padding:12px;" onclick="event.stopPropagation()">
            <svg style="width:24px;height:24px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
            <input type="file" class="hidden visit-file-upload" data-vid="${v.id}" accept="image/*,application/pdf" multiple />
          </label>
          ${v.attachment_idb_key ? `<button class="btn btn-ghost btn-icon" style="padding:12px;" title="View Report" onclick="event.stopPropagation();window.__viewFile('${v.attachment_idb_key}')"><svg style="width:24px;height:24px;" fill="none" stroke="var(--teal-400)" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg></button>` : ''}
          <button class="btn btn-ghost btn-icon" style="padding:12px;" title="Edit Visit"
                  onclick="event.stopPropagation();window.__navigate('/patients/${patientId}/visit/${v.id}/edit')">
            <svg style="width:24px;height:24px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          </button>
          <button class="btn btn-ghost btn-icon" style="padding:12px;" title="Print Prescription"
                  onclick="event.stopPropagation();window.__printVisit(${v.id})">
            <svg style="width:24px;height:24px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
          </button>
          <svg class="timeline-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24"
               style="width:24px;height:24px;transition:transform 0.2s; margin-left:8px;">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </div>
      </div>
      <div class="timeline-body">
        ${expandedContent}
      </div>
    </div>
  `;
}

function loadVisitDetails(visitId, patientId) {
  const rxRaw = queryAll('SELECT * FROM prescriptions WHERE visit_id=? AND deleted=0 ORDER BY sort_order ASC', [visitId]);
  const testsRaw = queryAll('SELECT * FROM diagnostic_tests WHERE visit_id=? AND deleted=0', [visitId]);
  const v = queryOne('SELECT * FROM visits WHERE id=? AND deleted=0', [visitId]);

  // Deduplicate rx and tests in case of accidental duplicate DB inserts
  const rxMap = new Map();
  rxRaw.forEach(r => { if (!rxMap.has(r.medicine_name)) rxMap.set(r.medicine_name, r); });
  const rx = Array.from(rxMap.values());

  const testsMap = new Map();
  testsRaw.forEach(t => { if (!testsMap.has(t.test_name)) testsMap.set(t.test_name, t); });
  const tests = Array.from(testsMap.values());

  const vitals = [
    { label: 'BP', value: v.bp, unit: 'mmHg' },
    { label: 'Temp', value: v.temperature ? `${v.temperature}°F` : null },
    { label: 'Weight', value: v.weight ? `${v.weight} kg` : null },
    { label: 'Height', value: v.height ? `${v.height} cm` : null },
    { label: 'BMI', value: v.bmi, unit: '', extra: v.bmi ? bmiCategory(v.bmi) : null },
    { label: 'SpO₂', value: v.spo2 ? `${v.spo2}%` : null },
    { label: 'Pulse', value: v.pulse ? `${v.pulse} bpm` : null },
  ].filter(vt => vt.value);

  return `
    <div class="divider" style="margin:0 0 14px"></div>

    ${vitals.length ? `
    <div class="vitals-grid profile-vitals-grid mb-4">
      ${vitals.map(vt => `
        <div class="vital-card">
          <div class="vital-label">${vt.label}</div>
          <div class="vital-value" style="font-size:1rem">${vt.value}${vt.unit ? ` <span class="vital-unit">${vt.unit}</span>` : ''}</div>
          ${vt.extra ? `<div class="badge badge-${bmiClass(parseFloat(v.bmi))}" style="align-self:flex-start;font-size:0.65rem">${vt.extra}</div>` : ''}
        </div>
      `).join('')}
    </div>` : ''}

    ${v.diagnosis ? `<div class="mb-3"><span class="text-xs font-bold text-tertiary">DIAGNOSIS — </span><span class="text-sm">${v.diagnosis}</span></div>` : ''}
    ${v.clinical_notes ? `<div class="mb-3"><span class="text-xs font-bold text-tertiary">NOTES — </span><span class="text-sm">${v.clinical_notes}</span></div>` : ''}

    ${rx.length ? `
    <div class="mb-3">
      <div class="text-xs font-bold text-tertiary mb-2">💊 PRESCRIPTIONS</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${rx.map((r, i) => `
          <div style="padding:8px 12px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:8px">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-tertiary font-mono" style="font-size:0.7rem;min-width:16px">${i+1}.</span>
              <span class="font-semibold" style="flex:1;color:var(--text-primary)">${r.medicine_name}</span>
            </div>
            <div class="flex items-center gap-2 text-sm flex-wrap" style="padding-left:24px">
              ${r.dosage ? `<span class="badge badge-neutral">${r.dosage}</span>` : ''}
              ${r.frequency ? `<span class="text-muted font-semibold">${r.frequency}</span>` : ''}
              ${r.duration ? `<span class="text-tertiary">× ${r.duration}</span>` : ''}
              ${r.instructions ? `<span class="text-tertiary text-xs bg-slate-800 px-2 py-1 rounded">(${r.instructions})</span>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </div>` : ''}

    ${tests.length ? `
    <div class="mb-3">
      <div class="text-xs font-bold text-tertiary mb-2">🧪 INVESTIGATIONS</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${tests.map(t => `
          <div style="padding:8px 12px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:8px">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-semibold" style="color:var(--text-primary)">${t.test_name}</span>
              ${t.urgency === 'Urgent' ? `<span class="badge badge-danger">Urgent</span>` : '<span class="badge badge-neutral">Routine</span>'}
            </div>
            ${t.instructions ? `<div class="text-tertiary text-xs mt-1 bg-slate-800 px-2 py-1 rounded inline-block">${t.instructions}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>` : ''}

    ${v.follow_up_date ? `
    <div class="badge badge-warning" style="margin-top:4px">
      📅 Follow-up: ${formatDate(v.follow_up_date)}
    </div>` : ''}
  `;
}

function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}
function genderLabel(g) { return g === 'M' ? 'Male' : g === 'F' ? 'Female' : 'Other'; }
function formatDate(d) {
  if (!d) return '';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function calcAge(dob) {
  return Math.floor((Date.now() - new Date(dob)) / (365.25 * 24 * 60 * 60 * 1000));
}
function bmiCategory(bmi) {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25)   return 'Normal';
  if (bmi < 30)   return 'Overweight';
  return 'Obese';
}
function bmiClass(bmi) {
  if (bmi < 18.5) return 'sky';
  if (bmi < 25)   return 'success';
  if (bmi < 30)   return 'warning';
  return 'danger';
}
