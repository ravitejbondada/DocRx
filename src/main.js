// ============================================================
// DocRx — Main Entry Point
// ============================================================
import './styles/main.css';
import { initDB } from './db/index.js';
import { isAuthenticated } from './auth/crypto.js';
import { route, initRouter, navigate } from './router.js';
import { renderLayout } from './components/Layout.js';

// Pages
import { renderLogin }          from './pages/Login.js';
import { renderSetup }          from './pages/Setup.js';
import { renderDashboard }      from './pages/Dashboard.js';
import { renderPatientList }    from './pages/PatientList.js';
import { renderPatientForm }    from './pages/PatientForm.js';
import { renderPatientProfile } from './pages/PatientProfile.js';
import { renderVisitForm }      from './pages/VisitForm.js';
import { renderSettings }       from './pages/Settings.js';
import { renderFinance }        from './pages/Finance.js';
import { renderMedicinesDB }    from './pages/MedicinesDB.js';
import { renderTestsDB }        from './pages/TestsDB.js';
import { renderPartnersDB }     from './pages/PartnersDB.js';
import { renderAnalytics }      from './pages/Analytics.js';

// Print & Share engine
import './print/prescription.js';
import './print/whatsapp.js';

window.__viewFile = async (key) => {
  const { get, set } = await import('idb-keyval');
  let blob = await get(key);
  
  if (!blob) {
    // Attempt lazy download if Google Drive token is present
    const { getSavedToken, downloadBackupFile } = await import('./backup/drive.js');
    const token = getSavedToken();
    if (token) {
      const { toast } = await import('./components/Toast.js');
      toast.info('Downloading report from Google Drive...');
      try {
        // Find file by name in AppDataFolder
        const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${key}' and trashed=false&fields=files(id)`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const file = data.files?.[0];
          if (file) {
            const buffer = await downloadBackupFile(token, file.id);
            blob = new File([buffer], key.split('_').slice(2).join('_') || 'Report.pdf', { type: 'application/pdf' });
            await set(key, blob);
            toast.success('Download complete!');
          }
        }
      } catch (err) {
        console.warn('Lazy download failed', err);
      }
    }
  }

  if (!blob) {
    alert('File not found in storage. Ensure you are connected to the internet and Google Drive sync is active.');
    return;
  }
  
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
};

async function bootstrap() {
  const splash = document.getElementById('splash');

  try {
    // Initialize database
    await initDB();

    // Request persistent storage
    if (navigator.storage?.persist) {
      navigator.storage.persist();
    }

    const appEl = document.getElementById('app');

    // Register all routes
    route('/',         () => navigate('/dashboard', true));
    route('/login',    (c) => renderLogin(c));
    route('/setup',    (c) => renderSetup(c));
    route('/recovery', (c) => renderLogin(c));

    // Protected routes (wrapped in layout)
    function withLayout(pageFn) {
      return (c) => {
        if (!isAuthenticated()) { initRouter(c); return; }
        c.innerHTML = '';
        const pageRoot = renderLayout(c);
        pageFn(pageRoot);
      };
    }

    function withLayoutParams(pageFn) {
      return (c, params) => {
        if (!isAuthenticated()) { initRouter(c); return; }
        c.innerHTML = '';
        const pageRoot = renderLayout(c);
        pageFn(pageRoot, params);
      };
    }

    route('/dashboard',                           withLayout(renderDashboard));
    route('/patients',                            withLayout(renderPatientList));
    route('/patients/new',                        withLayout((c) => renderPatientForm(c)));
    route('/patients/:id',                        withLayoutParams(renderPatientProfile));
    route('/patients/:id/edit',                   withLayoutParams((c, p) => renderPatientForm(c, p)));
    route('/patients/:patientId/visit/new',       withLayoutParams((c, p) => renderVisitForm(c, p)));
    route('/patients/:patientId/visit/:visitId/edit', withLayoutParams((c, p) => renderVisitForm(c, p)));
    route('/finance',                             withLayout(renderFinance));
    route('/analytics',                           withLayout(renderAnalytics));
    route('/settings',                            withLayout(renderSettings));
    route('/medicines',                           withLayout(renderMedicinesDB));
    route('/tests',                               withLayout(renderTestsDB));
    route('/partners',                            withLayout(renderPartnersDB));

    // Start router
    initRouter(appEl);

  } catch (err) {
    console.error('DocRx bootstrap error:', err);
    document.getElementById('app').innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;gap:16px;padding:24px;font-family:sans-serif;color:#f1f5f9;background:#020817">
        <h1 style="font-size:1.5rem;font-weight:700">DocRx failed to start</h1>
        <p style="color:#94a3b8;text-align:center">Error: ${err.message}</p>
        <p style="color:#64748b;font-size:0.85rem">Please ensure you are using a modern browser (Chrome 90+, Edge 90+)</p>
        <button onclick="location.reload()" style="padding:10px 24px;background:#0ea5e9;color:white;border:none;border-radius:8px;cursor:pointer;font-size:1rem">Retry</button>
      </div>`;
  } finally {
    // Hide splash
    if (splash) {
      splash.classList.add('hidden');
      setTimeout(() => splash.remove(), 400);
    }
  }
}

bootstrap();
