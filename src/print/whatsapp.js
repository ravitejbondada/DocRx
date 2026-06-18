import { queryOne, queryAll } from '../db/index.js';

// English to Telugu Translation Map for medical instructions
const teluguMap = {
  'OD (1-0-0)': 'ఉదయం 1',
  'OD (0-0-1)': 'రాత్రి 1',
  'BD (1-0-1)': 'ఉదయం 1, రాత్రి 1',
  'TDS (1-1-1)': 'ఉదయం 1, మధ్యాహ్నం 1, రాత్రి 1',
  'QID (1-1-1-1)': 'రోజుకు 4 సార్లు',
  'SOS (As needed)': 'అవసరమైనప్పుడు',
  
  'Before Food': 'భోజనానికి ముందు',
  'After Food': 'భోజనం తర్వాత',
  'With Food': 'భోజనంతో',
  'Empty Stomach': 'ఖాళీ కడుపుతో',
  'Local Application': 'పైపూత'
};

function translateTelugu(text) {
  if (!text) return '';
  return teluguMap[text] || text;
}

window.__sendWhatsApp = (visitId) => {
  const visit = queryOne('SELECT * FROM visits WHERE id=? AND deleted=0', [visitId]);
  if (!visit) return;
  const patient = queryOne('SELECT * FROM patients WHERE id=? AND deleted=0', [visit.patient_id]);
  const settings= queryOne('SELECT * FROM settings WHERE id=1') || {};
  const rxItems = queryAll('SELECT * FROM prescriptions WHERE visit_id=? AND deleted=0 ORDER BY sort_order ASC', [visitId]);
  const tests   = queryAll('SELECT * FROM diagnostic_tests WHERE visit_id=? AND deleted=0', [visitId]);

  let msg = `🏥 *${settings.clinic_name || 'Clinic'}*\n`;
  msg += `*Dr. ${settings.doctor_first_name || ''} ${settings.doctor_last_name || ''}* (${settings.doctor_qualification || ''})\n\n`;

  msg += `👤 *Patient:* ${patient.full_name}\n`;
  msg += `📅 *Date:* ${new Date(visit.visit_date).toLocaleDateString('en-IN')}\n`;
  
  if (visit.diagnosis) {
    msg += `\n*Diagnosis:* ${visit.diagnosis}\n`;
  }

  if (rxItems.length > 0) {
    msg += `\n💊 *Prescription:*\n`;
    rxItems.forEach((rx, i) => {
      msg += `\n${i + 1}. *${rx.medicine_name}*`;
      if (rx.dosage) msg += ` - ${rx.dosage}`;
      msg += `\n   `;
      
      const freq = translateTelugu(rx.frequency);
      const instr = translateTelugu(rx.instructions);
      const duration = rx.duration ? `${rx.duration} days` : '';

      const details = [freq, instr, duration].filter(Boolean).join(' | ');
      if (details) msg += `🔹 ${details}`;
    });
    msg += `\n`;
  }

  if (tests.length > 0) {
    msg += `\n🧪 *Recommended Tests:*\n`;
    tests.forEach((t, i) => {
      msg += `${i + 1}. ${t.test_name}`;
      if (t.instructions) msg += ` (${t.instructions})`;
      msg += `\n`;
    });
  }

  if (visit.follow_up_date) {
    msg += `\n🗓️ *Next Visit:* ${new Date(visit.follow_up_date).toLocaleDateString('en-IN')}\n`;
  }

  if (settings.clinic_phone) {
    msg += `\n📞 *Contact:* ${settings.clinic_phone}\n`;
  }

  if (settings.print_footer_message) {
    msg += `\n_${settings.print_footer_message}_`;
  }

  const encodedMsg = encodeURIComponent(msg);
  
  // Use patient's phone if available, else blank so doctor can pick contact
  let phoneStr = '';
  if (patient.phone) {
    // Add country code if not present. Assuming India (+91)
    let p = patient.phone.replace(/[^0-9]/g, '');
    if (p.length === 10) p = '91' + p;
    phoneStr = `phone=${p}&`;
  }

  const waUrl = `https://api.whatsapp.com/send?${phoneStr}text=${encodedMsg}`;
  window.open(waUrl, '_blank');
};
