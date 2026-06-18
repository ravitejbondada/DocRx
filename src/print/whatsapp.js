import { queryOne, queryAll } from '../db/index.js';
import { translateTeluguAsync } from '../utils/translation.js';

window.__sendWhatsApp = async (visitId) => {
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
    for (let i = 0; i < rxItems.length; i++) {
      const rx = rxItems[i];
      msg += `\n${i + 1}. *${rx.medicine_name}*`;
      if (rx.dosage) msg += ` - ${rx.dosage}`;
      msg += `\n   `;
      
      const freqEng = rx.frequency || '';
      const instrEng = rx.instructions || '';
      const duration = rx.duration ? `${rx.duration} days` : '';

      // English Line
      const engDetails = [freqEng, instrEng, duration].filter(Boolean).join(' | ');
      if (engDetails) msg += `🔹 ${engDetails}`;

      // Telugu Translation Line
      const freqTel = await translateTeluguAsync(freqEng);
      const instrTel = await translateTeluguAsync(instrEng);
      
      if (freqTel || instrTel) {
        const telDetails = [freqTel || freqEng, instrTel || instrEng, duration].filter(Boolean).join(' | ');
        msg += `\n   🔸 _${telDetails}_`;
      }
    }
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
