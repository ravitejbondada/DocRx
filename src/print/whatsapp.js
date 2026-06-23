import { queryAll } from '../db/index.js';
import { _executePrint } from './prescription.js';
import { showModal } from '../components/Modal.js';

function e(val) { return val != null ? String(val).replace(/"/g, '&quot;').replace(/</g, '&lt;') : ''; }

window.__sendWhatsApp = async (visitId) => {
  const pharmacies = queryAll('SELECT * FROM pharmacies WHERE deleted=0 ORDER BY name ASC');
  const diagCenters = queryAll('SELECT * FROM diagnostic_centers WHERE deleted=0 ORDER BY name ASC');
  
  if (pharmacies.length === 0 && diagCenters.length === 0) {
    import('../components/Toast.js').then(({ toast }) => toast.info('Preparing PDF for WhatsApp...'));
    return _executePrint(visitId, null, null, { mode: 'whatsapp' });
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
    title: 'WhatsApp Share Options',
    bodyHtml,
    confirmText: 'Share',
    cancelText: 'Cancel',
    onConfirm: (overlay) => {
      const pharmId = overlay.querySelector('#print-pharmacy-select')?.value || null;
      const diagId = overlay.querySelector('#print-diag-select')?.value || null;
      import('../components/Toast.js').then(({ toast }) => toast.info('Preparing PDF for WhatsApp...'));
      _executePrint(visitId, pharmId, diagId, { mode: 'whatsapp' });
    }
  });
};
