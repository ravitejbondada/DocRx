import { queryAll, run } from '../db/index.js';
import { toast } from '../components/Toast.js';
import { showModal } from '../components/Modal.js';

export function renderMedicinesDB(container) {
  let medicines = [];
  let searchQuery = '';

  function loadData() {
    if (searchQuery) {
      medicines = queryAll('SELECT * FROM medicines WHERE name LIKE ? ORDER BY name ASC', [`%${searchQuery}%`]);
    } else {
      medicines = queryAll('SELECT * FROM medicines ORDER BY name ASC');
    }
    renderUI();
  }

  function renderUI() {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Medicines Database</h1>
          <p class="page-subtitle">Manage your clinic's medication library</p>
        </div>
        <button class="btn btn-primary btn-sm" id="add-btn">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          Add Medicine
        </button>
      </div>

      <div class="page-content slide-up">
        <div class="search-bar mb-6" style="max-width:400px">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input type="text" id="search-input" placeholder="Search medicines..." value="${searchQuery}" autocomplete="off" />
        </div>

        <div class="card card-p">
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Medicine Name</th>
                  <th>Default Route</th>
                  <th>Default Dosage</th>
                  <th>Status</th>
                  <th style="width:80px">Action</th>
                </tr>
              </thead>
              <tbody>
                ${medicines.length === 0 ? `
                  <tr><td colspan="5" class="text-center text-muted py-8">No medicines found.</td></tr>
                ` : medicines.map(m => `
                  <tr class="${m.is_active ? '' : 'text-muted'}">
                    <td class="font-medium">${m.name}</td>
                    <td>${m.default_route || '-'}</td>
                    <td>${[m.default_dosage, m.default_frequency, m.default_instructions].filter(Boolean).join(' • ') || '-'}</td>
                    <td>
                      ${m.is_active 
                        ? '<span class="status-badge success">Active</span>' 
                        : '<span class="status-badge">Inactive</span>'}
                    </td>
                    <td>
                      <button class="btn btn-ghost btn-sm text-primary edit-btn" data-id="${m.id}">Edit</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Events
    container.querySelector('#search-input')?.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      loadData(); // Re-render
      setTimeout(() => {
        const i = container.querySelector('#search-input');
        if(i) { i.focus(); i.setSelectionRange(searchQuery.length, searchQuery.length); }
      }, 0);
    });

    container.querySelector('#add-btn')?.addEventListener('click', () => openForm());

    container.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        const med = medicines.find(x => x.id == id);
        if (med) openForm(med);
      });
    });
  }

  function openForm(med = null) {
    const isEdit = !!med;
    
    showModal({
      title: isEdit ? 'Edit Medicine' : 'Add Medicine',
      bodyHtml: `
        <form id="med-form">
          <div class="form-group">
            <label class="form-label">Medicine Name <span class="req">*</span></label>
            <input class="input" id="m-name" type="text" value="${med?.name || ''}" required />
          </div>
          <div class="form-grid form-grid-2">
            <div class="form-group">
              <label class="form-label">Default Route</label>
              <select class="input" id="m-route">
                ${['Oral', 'Topical', 'Injection', 'IV', 'Inhalation', 'Drops', 'Other'].map(r => 
                  `<option value="${r}" ${med?.default_route === r ? 'selected' : ''}>${r}</option>`
                ).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Default Dosage</label>
              <input class="input" id="m-dosage" type="text" value="${med?.default_dosage || ''}" placeholder="e.g. 500mg" />
            </div>
            <div class="form-group">
              <label class="form-label">Default Frequency</label>
              <select class="input" id="m-frequency">
                <option value="">None</option>
                ${['OD (1-0-0)', 'OD (0-0-1)', 'BD (1-0-1)', 'TDS (1-1-1)', 'QID (1-1-1-1)', 'SOS (As needed)'].map(f => 
                  `<option value="${f}" ${med?.default_frequency === f ? 'selected' : ''}>${f}</option>`
                ).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Default Instructions</label>
              <select class="input" id="m-instructions">
                <option value="">None</option>
                ${['Before Food', 'After Food', 'With Food', 'Empty Stomach', 'Local Application', 'Take with warm water', 'Take with milk', 'Chew well', 'Apply twice a day', 'Swallow whole'].map(i => 
                  `<option value="${i}" ${med?.default_instructions === i ? 'selected' : ''}>${i}</option>`
                ).join('')}
              </select>
            </div>
          </div>
          <div class="form-group mt-4">
            <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
              <input type="checkbox" id="m-active" ${(!isEdit || med.is_active) ? 'checked' : ''} />
              <span>Active (Available in suggestions)</span>
            </label>
          </div>
        </form>
      `,
      buttons: [
        { label: 'Cancel', class: 'btn-ghost', onClick: () => true },
        { label: 'Save', class: 'btn-primary', onClick: () => {
          const name = document.getElementById('m-name').value.trim();
          if (!name) return toast.error('Name is required');

          const route = document.getElementById('m-route').value;
          const dosage = document.getElementById('m-dosage').value.trim();
          const freq = document.getElementById('m-frequency').value;
          const instr = document.getElementById('m-instructions').value;
          const active = document.getElementById('m-active').checked ? 1 : 0;

          try {
            if (isEdit) {
              run('UPDATE medicines SET name=?, default_route=?, default_dosage=?, default_frequency=?, default_instructions=?, is_active=? WHERE id=?',
                [name, route, dosage, freq, instr, active, med.id]);
              toast.success('Medicine updated');
            } else {
              run('INSERT INTO medicines (name, default_route, default_dosage, default_frequency, default_instructions, is_active) VALUES (?, ?, ?, ?, ?, ?)',
                [name, route, dosage, freq, instr, active]);
              toast.success('Medicine added');
            }
            loadData();
            return true; // close modal
          } catch (e) {
            toast.error(e.message);
            return false;
          }
        }}
      ]
    });
  }

  loadData();
}
