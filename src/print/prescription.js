// ============================================================
// DocRx — Print Engine (A4 Prescription + Patient Summary)
// ============================================================
import { queryOne, queryAll } from '../db/index.js';
import { showModal } from '../components/Modal.js';
import { translateTeluguAsync } from '../utils/translation.js';

export async function _executePrint(visitId, pharmacyId = null, diagCenterId = null, options = {}) {
  const isDownload = options.mode === 'download';
  let win = options.win;

  if (!isDownload && options.mode !== 'whatsapp') {
    if (!win) win = window.open('', '_blank');
    if (win) win.document.write('<div style="font-family:sans-serif;padding:20px;text-align:center;color:#64748b;">Generating Prescription...</div>');
  }
  const visit   = queryOne('SELECT * FROM visits WHERE id=? AND deleted=0', [visitId]);
  const patient = queryOne('SELECT * FROM patients WHERE id=? AND deleted=0', [visit.patient_id]);
  const settings= queryOne('SELECT * FROM settings WHERE id=1') || {};
  const rxItems = queryAll('SELECT * FROM prescriptions WHERE visit_id=? AND deleted=0 ORDER BY sort_order ASC', [visitId]);
  const tests   = queryAll('SELECT * FROM diagnostic_tests WHERE visit_id=? AND deleted=0', [visitId]);

  let pharmacy = null;
  if (pharmacyId) pharmacy = queryOne('SELECT * FROM pharmacies WHERE id=? AND deleted=0', [pharmacyId]);
  
  let diagCenter = null;
  if (diagCenterId) diagCenter = queryOne('SELECT * FROM diagnostic_centers WHERE id=? AND deleted=0', [diagCenterId]);

  // Fetch async translations
  for (let r of rxItems) {
    r._freqTel = await translateTeluguAsync(r.frequency);
    r._instrTel = await translateTeluguAsync(r.instructions);
  }

  const age = patient.dob ? calcAge(patient.dob) : patient.age;

  const headerHtml = `
    <div class="letterhead">
      <div class="lh-top">
        <div>
          <div class="doctor-name">${settings.doctor_name || ''}</div>
          <div class="doctor-qual">${settings.doctor_qualification || ''}</div>
          <div class="doctor-reg">Reg. No: ${settings.doctor_reg_number || ''}</div>
        </div>
        <div class="clinic-info">
          <div class="clinic-name">${settings.clinic_name || ''}</div>
          <div class="clinic-addr">${(settings.clinic_address || '').replace(/\\n/g, '<br/>')}</div>
          <div class="clinic-phone">📞 ${settings.clinic_phone || ''}</div>
        </div>
      </div>
    </div>

    <!-- Patient Bar -->
    <div class="patient-bar">
      <div class="pb-item"><label>Patient</label><span>${patient.full_name}</span></div>
      <div class="pb-item"><label>ID</label><span class="pb-code">${patient.patient_code}</span></div>
      <div class="pb-item"><label>Age / Gender</label><span>${age}y / ${patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : 'Other'}</span></div>
      <div class="pb-item"><label>Date</label><span>${formatDate(visit.visit_date)}</span></div>
      ${patient.blood_group ? `<div class="pb-item"><label>Blood Group</label><span>${patient.blood_group}</span></div>` : ''}
    </div>
  `;

  const footerHtml = (isPrescriptionPage, partner) => `
    <!-- Footer Container -->
    <div class="print-footer-container">
      <div class="print-footer-above">
        <div class="followup-note">
          ${isPrescriptionPage && visit.follow_up_date ? `<strong>Follow-up:</strong> ${formatDate(visit.follow_up_date)}` : ''}
        </div>
        <div class="signature-line">
          <div class="signature-dash"></div>
          <span class="signature-label">${settings.doctor_name || ''}</span>
        </div>
      </div>
      
      ${(partner || settings.print_footer_message) ? `
        <div class="print-footer-divider"></div>
        
        ${partner ? `
          <div class="print-footer-partner">
            <strong>Please visit:</strong> ${partner.name} ${partner.phone ? `| 📞 ${partner.phone}` : ''} ${partner.address ? `| 📍 ${partner.address}` : ''}
          </div>
        ` : ''}
        
        ${settings.print_footer_message ? `
          <div class="print-footer-msg">
            ${settings.print_footer_message}
          </div>
        ` : ''}
      ` : ''}
    </div>
  `;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Prescription — ${patient.full_name}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
  <style>
    * { box-sizing: border-box; margin:0; padding:0; }
    /* Setting margin: 0 removes browser default headers/footers in Chrome/Edge */
    @page { size: A4 portrait; margin: 0; }
    html, body {
      width: 210mm;
      min-width: 210mm;
      font-family: 'Inter', Arial, sans-serif;
      color: #1e293b; background: #ffffff !important; font-size: 11pt;
    }
    
    .print-page {
      width: 210mm;
      height: 282mm;
      background: #ffffff;
      color: #0f172a;
      padding: 15mm;
      display: flex;
      flex-direction: column;
      page-break-after: always;
    }
    
    .print-page:last-child {
      page-break-after: auto;
    }

    /* Letterhead */
    .letterhead { border-bottom: 2.5px solid #0891b2; padding-bottom: 12px; margin-bottom: 14px; }
    .lh-top { display: flex; justify-content: space-between; align-items: flex-start; }
    .doctor-name { font-size: 16pt; font-weight: 700; color: #0f172a; letter-spacing: -0.01em; }
    .doctor-qual { font-size: 9.5pt; color: #475569; margin-top: 2px; }
    .doctor-reg  { font-size: 8pt;   color: #64748b; margin-top: 2px; }
    .clinic-info { text-align: right; }
    .clinic-name { font-size: 11pt; font-weight: 600; color: #0f172a; }
    .clinic-addr { font-size: 8.5pt; color: #475569; margin-top: 3px; line-height: 1.4; max-width: 180px; }
    .clinic-phone{ font-size: 8.5pt; color: #0891b2; margin-top: 3px; }

    /* Patient bar */
    .patient-bar {
      background: #f8fafc; border-radius: 6px; padding: 10px 14px;
      display: flex; gap: 24px; flex-wrap: wrap; margin-bottom: 14px;
      border: 1px solid #e2e8f0;
    }
    .pb-item label { font-size: 7.5pt; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; display: block; }
    .pb-item span  { font-size: 10pt; font-weight: 600; color: #0f172a; }
    .pb-code { font-family: 'Courier New', monospace; font-size: 9pt; font-weight: 700; color: #0891b2; }

    /* Rx Symbol & table */
    .rx-symbol { font-size: 28pt; font-weight: 800; color: #0891b2; font-style: italic; margin: 12px 0 8px; line-height: 1; }
    .medicine-print-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
    .medicine-print-table th {
      background: #f1f5f9; padding: 7px 10px; text-align: left;
      font-size: 8pt; font-weight: 700; color: #475569 !important; text-transform: uppercase;
      border-bottom: 1.5px solid #e2e8f0;
    }
    .medicine-print-table td {
      padding: 8px 10px; font-size: 10pt; vertical-align: top;
      border-bottom: 1px solid #f1f5f9;
      color: #0f172a !important;
    }
    .medicine-print-table .med-num { color: #94a3b8; font-size: 8.5pt; min-width: 20px; }
    .medicine-print-table .med-name { font-weight: 600; }
    .medicine-print-table .badge { font-size: 7.5pt; background: #e0f2fe; color: #0369a1; padding: 1px 6px; border-radius: 10px; }

    /* Tests */
    .tests-section { margin-top: 12px; }
    .tests-title { font-size: 12pt; font-weight: 700; color: #0891b2; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #0891b2; padding-bottom: 6px; margin-bottom: 14px; margin-top: 10px; }
    .test-row { display: flex; gap: 10px; align-items: flex-start; margin-bottom: 5px; }
    .test-bullet { color: #0891b2; }
    .test-name { font-weight: 600; font-size: 10pt; }
    .test-instr { font-size: 8.5pt; color: #64748b; }
    .test-urgent { font-size: 7.5pt; background: #fee2e2; color: #b91c1c; padding: 1px 6px; border-radius: 10px; }

    /* Footer - pushed to bottom via flexbox */
    .print-footer-container { margin-top: auto; width: 100%; padding-top: 12px; }
    .print-footer-above { display: flex; justify-content: space-between; align-items: flex-end; }
    .followup-note { font-size: 9pt; }
    .signature-line { text-align: right; }
    .signature-dash { border-top: 1.5px solid #000; width: 140px; display: inline-block; margin-bottom: 4px; }
    .signature-label { font-size: 8.5pt; color: #475569; display: block; }
    .print-footer-divider { border-top: 1px solid #e2e8f0; margin: 10px 0; }
    .print-footer-partner { font-size: 9pt; text-align: center; color: #334155; margin-bottom: 6px; }
    .print-footer-msg { font-size: 9.5pt; text-align: center; color: #64748b; font-style: italic; font-weight: 500; }

    /* Allergies alert */
    .allergy-alert { background: #fff7ed; border: 1.5px solid #fb923c; border-radius: 5px; padding: 6px 10px; margin-bottom: 12px; font-size: 9pt; color: #9a3412; }
    .allergy-alert strong { color: #c2410c; }
  </style>
</head>
<body>

  <!-- PAGE 1: Prescription -->
  <div class="print-page">
    ${headerHtml}
    
    <!-- Rx Section -->
    ${rxItems.length ? `
    <div class="rx-symbol">℞</div>
    <table class="medicine-print-table">
      <thead>
        <tr>
          <th style="width:24px">#</th>
          <th>Medicine</th>
          <th>Dosage</th>
          <th>Frequency</th>
          <th>Duration</th>
          <th>Instructions</th>
        </tr>
      </thead>
      <tbody>
        ${rxItems.map((r, i) => {
          const freqTel = r._freqTel;
          const instrTel = r._instrTel;
          const hasTel = freqTel || instrTel;
          return `
          <tr>
            <td class="med-num">${i + 1}</td>
            <td class="med-name">${r.medicine_name}</td>
            <td>${r.dosage ? `<span class="badge">${r.dosage}</span>` : '—'}</td>
            <td>
              <div>${r.frequency || '—'}</div>
              ${hasTel ? `<div style="font-size: 8.5pt; color: #475569; margin-top: 3px;">${freqTel || ''}</div>` : ''}
            </td>
            <td>${r.duration || '—'}</td>
            <td>
              <div>${r.instructions || ''}</div>
              ${hasTel ? `<div style="font-size: 8.5pt; color: #475569; margin-top: 3px;">${instrTel || ''}</div>` : ''}
            </td>
          </tr>
        `}).join('')}
      </tbody>
    </table>` : '<p style="color:#64748b;font-style:italic;margin:12px 0">No medications prescribed.</p>'}

    ${footerHtml(true, pharmacy)}
  </div>

  <!-- PAGE 2: Investigations -->
  ${tests.length ? `
  <div class="print-page">
    ${headerHtml}

    <div class="tests-section">
      <div class="tests-title">Investigations Ordered</div>
      ${tests.map(t => `
        <div class="test-row">
          <span class="test-bullet">◉</span>
          <div>
            <span class="test-name">${t.test_name}</span>
            ${t.urgency === 'Urgent' ? '<span class="test-urgent">URGENT</span>' : ''}
            ${t.instructions ? `<div class="test-instr">${t.instructions}</div>` : ''}
          </div>
        </div>
      `).join('')}
    </div>

    ${footerHtml(false, diagCenter)}
  </div>` : ''}

</body>
</html>`;

  const isWhatsApp = options.mode === 'whatsapp';

  if (isDownload || isWhatsApp) {
    if (window.html2pdf) {
      const opt = {
        margin: 0,
        filename: `Prescription_${patient.patient_code}_${formatDate(visit.visit_date).replace(/ /g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, windowWidth: 794 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], avoid: '.print-page' }
      };

      if (isWhatsApp) {
        html2pdf().set(opt).from(html).output('blob').then(async (blob) => {
          const file = new File([blob], opt.filename, { type: 'application/pdf' });
          const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

          if (isMobile && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
             // To bypass the "Must be handling a user gesture" restriction caused by async delay,
             // we show a modal with a "Share" button, which provides a fresh synchronous user gesture.
             import('../components/Modal.js').then(({ showModal }) => {
               showModal({
                 title: 'Ready to Share',
                 bodyHtml: '<p>The prescription PDF has been generated. Click <strong>Share</strong> below and select WhatsApp.</p>',
                 confirmText: 'Share to WhatsApp',
                 cancelText: 'Cancel',
                 onConfirm: async () => {
                   try {
                     await navigator.share({
                       files: [file],
                       title: 'DocRx Prescription'
                     });
                   } catch (e) {
                     console.log('Share canceled or failed', e);
                   }
                   if (win) win.close();
                 },
                 onCancel: () => { if (win) win.close(); }
               });
             });
          } else {
             html2pdf().set(opt).from(html).save().then(() => {
               import('../components/Modal.js').then(({ showModal }) => {
                 showModal({
                   title: 'PDF Downloaded',
                   bodyHtml: '<p>Direct file sharing is not supported on desktop browsers.</p><p>The PDF has been downloaded to your computer. Click below to open WhatsApp Web, and manually attach the downloaded PDF.</p>',
                   confirmText: 'Open WhatsApp Web',
                   cancelText: 'Close',
                   onConfirm: () => {
                     let waUrl = `https://web.whatsapp.com/send?text=Please%20find%20the%20attached%20prescription%20PDF.`;
                     if (patient.phone) {
                       let p = patient.phone.replace(/[^0-9]/g, '');
                       if (p.length === 10) p = '91' + p;
                       waUrl = `https://web.whatsapp.com/send?phone=${p}&text=Please%20find%20the%20attached%20prescription%20PDF.`;
                     }
                     window.open(waUrl, '_blank');
                     if (win) win.close();
                   },
                   onCancel: () => { if (win) win.close(); }
                 });
               });
             });
          }
        }).catch(err => {
          console.error("PDF generation failed:", err);
          alert("Failed to generate PDF for WhatsApp.");
          if (win) win.close();
        });
      } else {
        html2pdf().set(opt).from(html).save().then(() => {
          import('../components/Toast.js').then(({ toast }) => toast.success('PDF downloaded successfully!'));
        });
      }
    } else {
      console.error("html2pdf is not loaded");
    }
  } else {
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 800);
  }
}

// Expose globally for onclick
window.__printVisit = (visitId) => {
  const pharmacies = queryAll('SELECT * FROM pharmacies WHERE deleted=0 ORDER BY name ASC');
  const diagCenters = queryAll('SELECT * FROM diagnostic_centers WHERE deleted=0 ORDER BY name ASC');
  
  if (pharmacies.length === 0 && diagCenters.length === 0) {
    const win = window.open('', '_blank');
    if (!win) { alert("Popup blocked!"); return; }
    return _executePrint(visitId, null, null, { win });
  }

  const defaultPharmId = pharmacies.find(p => p.is_default)?.id || '';
  const defaultDiagId = diagCenters.find(d => d.is_default)?.id || '';

  const bodyHtml = `
    <div style="display: flex; flex-direction: column; gap: 16px;">
      ${pharmacies.length ? `
      <div class="form-group">
        <label class="form-label" style="font-weight: 600; font-size: 0.9rem; margin-bottom: 6px; display: block;">Medical Shop (Pharmacy)</label>
        <select class="input" id="print-pharmacy-select" style="width: 100%;">
          <option value="">-- Do not recommend --</option>
          ${pharmacies.map(p => `<option value="${p.id}" ${p.id === defaultPharmId ? 'selected' : ''}>${e(p.name)}</option>`).join('')}
        </select>
      </div>` : ''}

      ${diagCenters.length ? `
      <div class="form-group">
        <label class="form-label" style="font-weight: 600; font-size: 0.9rem; margin-bottom: 6px; display: block;">Diagnostic Center</label>
        <select class="input" id="print-diag-select" style="width: 100%;">
          <option value="">-- Do not recommend --</option>
          ${diagCenters.map(p => `<option value="${p.id}" ${p.id === defaultDiagId ? 'selected' : ''}>${e(p.name)}</option>`).join('')}
        </select>
      </div>` : ''}
    </div>
  `;

  showModal({
    title: 'Print Options',
    bodyHtml,
    confirmText: 'Print Now',
    cancelText: 'Cancel',
    onConfirm: (overlay) => {
      const pharmId = overlay.querySelector('#print-pharmacy-select')?.value || null;
      const diagId = overlay.querySelector('#print-diag-select')?.value || null;
      const win = window.open('', '_blank');
      _executePrint(visitId, pharmId, diagId, { win });
    }
  });
};

window.__downloadVisitPDF = (visitId) => {
  const pharmacies = queryAll('SELECT * FROM pharmacies WHERE deleted=0 ORDER BY name ASC');
  const diagCenters = queryAll('SELECT * FROM diagnostic_centers WHERE deleted=0 ORDER BY name ASC');
  
  import('../components/Toast.js').then(({ toast }) => toast.info('Generating PDF...'));
  
  if (pharmacies.length === 0 && diagCenters.length === 0) {
    return _executePrint(visitId, null, null, { mode: 'download' });
  }

  const defaultPharmId = pharmacies.find(p => p.is_default)?.id || '';
  const defaultDiagId = diagCenters.find(d => d.is_default)?.id || '';

  const bodyHtml = `
    <div style="display: flex; flex-direction: column; gap: 16px;">
      ${pharmacies.length ? `
      <div class="form-group">
        <label class="form-label" style="font-weight: 600; font-size: 0.9rem; margin-bottom: 6px; display: block;">Medical Shop (Pharmacy)</label>
        <select class="input" id="print-pharmacy-select" style="width: 100%;">
          <option value="">-- Do not recommend --</option>
          ${pharmacies.map(p => `<option value="${p.id}" ${p.id === defaultPharmId ? 'selected' : ''}>${e(p.name)}</option>`).join('')}
        </select>
      </div>` : ''}

      ${diagCenters.length ? `
      <div class="form-group">
        <label class="form-label" style="font-weight: 600; font-size: 0.9rem; margin-bottom: 6px; display: block;">Diagnostic Center</label>
        <select class="input" id="print-diag-select" style="width: 100%;">
          <option value="">-- Do not recommend --</option>
          ${diagCenters.map(p => `<option value="${p.id}" ${p.id === defaultDiagId ? 'selected' : ''}>${e(p.name)}</option>`).join('')}
        </select>
      </div>` : ''}
    </div>
  `;

  showModal({
    title: 'Download PDF Options',
    bodyHtml,
    confirmText: 'Download',
    cancelText: 'Cancel',
    onConfirm: (overlay) => {
      const pharmId = overlay.querySelector('#print-pharmacy-select')?.value || null;
      const diagId = overlay.querySelector('#print-diag-select')?.value || null;
      _executePrint(visitId, pharmId, diagId, { mode: 'download' });
    }
  });
};

function e(val) { return val != null ? String(val).replace(/"/g, '&quot;').replace(/</g, '&lt;') : ''; }

function calcAge(dob) {
  return Math.floor((Date.now() - new Date(dob)) / (365.25 * 24 * 60 * 60 * 1000));
}
function formatDate(d) {
  if (!d) return '';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}
