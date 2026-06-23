import { queryAll, queryOne, run } from '../db/index.js';
import { toast } from '../components/Toast.js';
import { showModal } from '../components/Modal.js';

export function renderPartnersDB(container) {
  function loadData() {
    const pharmacies = queryAll('SELECT * FROM pharmacies WHERE deleted=0 ORDER BY name ASC');
    const diagCenters = queryAll('SELECT * FROM diagnostic_centers WHERE deleted=0 ORDER BY name ASC');
    renderUI(pharmacies, diagCenters);
  }

  function renderUI(pharmacies, diagCenters) {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Partners Database</h1>
          <p class="page-subtitle">Manage default Pharmacies and Diagnostic Centers</p>
        </div>
      </div>

      <div class="page-content slide-up">
        
        <!-- Pharmacies -->
        <div class="card card-p mb-6">
          <div class="flex justify-between items-center mb-4">
            <div class="section-title">Medical Shops (Pharmacies)</div>
            <button class="btn btn-secondary btn-sm" id="add-pharmacy-btn">Add Pharmacy</button>
          </div>
          ${pharmacies.length ? `
          <div class="table-wrap">
            <table class="table w-full">
              <thead><tr><th>Name</th><th>Location / Phone</th><th>Default</th><th>Action</th></tr></thead>
              <tbody>
                ${pharmacies.map(p => `
                  <tr>
                    <td class="font-semibold">${e(p.name)}</td>
                    <td class="text-sm text-muted">${e(p.address)} <br/> ${e(p.phone)}</td>
                    <td>
                      <input type="radio" name="default_pharmacy" value="${p.id}" ${p.is_default ? 'checked' : ''} class="set-default" data-table="pharmacies" data-id="${p.id}">
                    </td>
                    <td>
                      <div style="display:flex; gap:8px;">
                        <button class="btn btn-secondary btn-sm edit-partner" data-table="pharmacies" data-id="${p.id}">Edit</button>
                        <button class="btn btn-danger btn-sm delete-partner" data-table="pharmacies" data-id="${p.id}">Delete</button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : '<p class="text-sm text-muted">No pharmacies added yet.</p>'}
        </div>

        <!-- Diagnostic Centers -->
        <div class="card card-p">
          <div class="flex justify-between items-center mb-4">
            <div class="section-title">Diagnostic Centers</div>
            <button class="btn btn-secondary btn-sm" id="add-diag-btn">Add Center</button>
          </div>
          ${diagCenters.length ? `
          <div class="table-wrap">
            <table class="table w-full">
              <thead><tr><th>Name</th><th>Location / Phone</th><th>Default</th><th>Action</th></tr></thead>
              <tbody>
                ${diagCenters.map(p => `
                  <tr>
                    <td class="font-semibold">${e(p.name)}</td>
                    <td class="text-sm text-muted">${e(p.address)} <br/> ${e(p.phone)}</td>
                    <td>
                      <input type="radio" name="default_diag" value="${p.id}" ${p.is_default ? 'checked' : ''} class="set-default" data-table="diagnostic_centers" data-id="${p.id}">
                    </td>
                    <td>
                      <div style="display:flex; gap:8px;">
                        <button class="btn btn-secondary btn-sm edit-partner" data-table="diagnostic_centers" data-id="${p.id}">Edit</button>
                        <button class="btn btn-danger btn-sm delete-partner" data-table="diagnostic_centers" data-id="${p.id}">Delete</button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : '<p class="text-sm text-muted">No diagnostic centers added yet.</p>'}
        </div>

      </div>
    `;

    // Events
    container.querySelector('#add-pharmacy-btn')?.addEventListener('click', () => addPartner('pharmacies'));
    container.querySelector('#add-diag-btn')?.addEventListener('click', () => addPartner('diagnostic_centers'));
    
    container.querySelectorAll('.set-default').forEach(el => {
      el.addEventListener('change', (ev) => {
        const table = ev.target.dataset.table;
        const id = ev.target.dataset.id;
        setDefaultPartner(table, id);
      });
    });

    container.querySelectorAll('.edit-partner').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        const table = ev.target.dataset.table;
        const id = ev.target.dataset.id;
        editPartner(table, id);
      });
    });

    container.querySelectorAll('.delete-partner').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        const table = ev.target.dataset.table;
        const id = ev.target.dataset.id;
        deletePartner(table, id);
      });
    });
  }

  function addPartner(table) {
    const isPharm = table === 'pharmacies';
    const typeLabel = isPharm ? 'Medical Shop (Pharmacy)' : 'Diagnostic Center';
    const bodyHtml = `
      <div style="display: flex; flex-direction: column; gap: 14px;">
        <div class="form-group">
          <label class="form-label" style="font-weight:600; font-size:0.9rem; margin-bottom:6px; display:block;">Name <span style="color:var(--danger)">*</span></label>
          <input type="text" class="input" id="partner-name-input" placeholder="e.g. Care Pharmacy" style="width:100%" required />
        </div>
        <div class="form-group">
          <label class="form-label" style="font-weight:600; font-size:0.9rem; margin-bottom:6px; display:block;">Address / Location (Optional)</label>
          <input type="text" class="input" id="partner-address-input" placeholder="e.g. Hyderabad, TS" style="width:100%" />
        </div>
        <div class="form-group">
          <label class="form-label" style="font-weight:600; font-size:0.9rem; margin-bottom:6px; display:block;">Phone (Optional)</label>
          <input type="text" class="input" id="partner-phone-input" placeholder="e.g. 9876543210" style="width:100%" />
        </div>
      </div>
    `;

    showModal({
      title: `Add ${isPharm ? 'Pharmacy' : 'Diagnostic Center'}`,
      bodyHtml,
      confirmText: 'Add Partner',
      cancelText: 'Cancel',
      onConfirm: (overlay) => {
        const name = overlay.querySelector('#partner-name-input').value.trim();
        if (!name) {
          toast.error('Name is required.');
          return false;
        }
        const address = overlay.querySelector('#partner-address-input').value.trim();
        const phone = overlay.querySelector('#partner-phone-input').value.trim();

        // If it's the first one, make it default
        const count = queryOne(`SELECT COUNT(*) as c FROM ${table} WHERE deleted=0`).c;
        const isDefault = count === 0 ? 1 : 0;
        
        run(`INSERT INTO ${table} (id, name, address, phone, is_default, updated_at) VALUES (?, ?, ?, ?, ?, datetime('now','localtime'))`, [crypto.randomUUID(), name, address, phone, isDefault]);
        toast.success(`${typeLabel} added.`);
        loadData();
      }
    });
  }

  function editPartner(table, id) {
    const isPharm = table === 'pharmacies';
    const typeLabel = isPharm ? 'Medical Shop (Pharmacy)' : 'Diagnostic Center';
    const partner = queryOne(`SELECT * FROM ${table} WHERE id=? AND deleted=0`, [id]);
    if (!partner) return;

    const bodyHtml = `
      <div style="display: flex; flex-direction: column; gap: 14px;">
        <div class="form-group">
          <label class="form-label" style="font-weight:600; font-size:0.9rem; margin-bottom:6px; display:block;">Name <span style="color:var(--danger)">*</span></label>
          <input type="text" class="input" id="partner-name-input" value="${e(partner.name)}" style="width:100%" required />
        </div>
        <div class="form-group">
          <label class="form-label" style="font-weight:600; font-size:0.9rem; margin-bottom:6px; display:block;">Address / Location (Optional)</label>
          <input type="text" class="input" id="partner-address-input" value="${e(partner.address)}" style="width:100%" />
        </div>
        <div class="form-group">
          <label class="form-label" style="font-weight:600; font-size:0.9rem; margin-bottom:6px; display:block;">Phone (Optional)</label>
          <input type="text" class="input" id="partner-phone-input" value="${e(partner.phone)}" style="width:100%" />
        </div>
      </div>
    `;

    showModal({
      title: `Edit ${isPharm ? 'Pharmacy' : 'Diagnostic Center'}`,
      bodyHtml,
      confirmText: 'Save Changes',
      cancelText: 'Cancel',
      onConfirm: (overlay) => {
        const name = overlay.querySelector('#partner-name-input').value.trim();
        if (!name) {
          toast.error('Name is required.');
          return false;
        }
        const address = overlay.querySelector('#partner-address-input').value.trim();
        const phone = overlay.querySelector('#partner-phone-input').value.trim();

        run(`UPDATE ${table} SET name=?, address=?, phone=?, updated_at=datetime('now','localtime') WHERE id=?`, [name, address, phone, id]);
        toast.success(`${typeLabel} updated.`);
        loadData();
      }
    });
  }

  function deletePartner(table, id) {
    const pwd = prompt("Enter Admin Password to delete partner data (Hint: 4 cont keys):");
    if (pwd !== 'rtyu') {
      alert("Incorrect Admin Password. Deletion cancelled.");
      return;
    }
    if (!confirm('Are you sure you want to delete this partner? (Note: 4 cont keys)')) return;
    run(`UPDATE ${table} SET deleted=1, deleted_at=datetime('now','localtime'), updated_at=datetime('now','localtime') WHERE id=?`, [id]);
    loadData();
  }

  function setDefaultPartner(table, id) {
    run(`UPDATE ${table} SET is_default=0 WHERE deleted=0`);
    run(`UPDATE ${table} SET is_default=1, updated_at=datetime('now','localtime') WHERE id=?`, [id]);
    toast.success('Default updated.');
  }

  loadData();
}

function e(val) { return val != null ? String(val).replace(/"/g, '&quot;').replace(/</g, '&lt;') : ''; }
