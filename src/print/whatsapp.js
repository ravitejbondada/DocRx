import { queryAll } from '../db/index.js';
import { _executePrint } from './prescription.js';

window.__sendWhatsApp = async (visitId) => {
  import('../components/Toast.js').then(({ toast }) => toast.info('Preparing PDF for WhatsApp...'));

  const pharmacies = queryAll('SELECT * FROM pharmacies WHERE deleted=0 ORDER BY name ASC');
  const diagCenters = queryAll('SELECT * FROM diagnostic_centers WHERE deleted=0 ORDER BY name ASC');
  
  const defaultPharmId = pharmacies.find(p => p.is_default)?.id || null;
  const defaultDiagId = diagCenters.find(d => d.is_default)?.id || null;

  _executePrint(visitId, defaultPharmId, defaultDiagId, { mode: 'whatsapp' });
};
