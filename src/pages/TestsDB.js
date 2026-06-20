import { queryAll, run } from '../db/index.js';
import { toast } from '../components/Toast.js';
import { showModal } from '../components/Modal.js';

export function renderTestsDB(container) {
  let tests = [];
  let searchQuery = '';

  function loadData() {
    if (searchQuery) {
      tests = queryAll('SELECT * FROM test_catalog WHERE name LIKE ? ORDER BY name ASC', [`%${searchQuery}%`]);
    } else {
      tests = queryAll('SELECT * FROM test_catalog ORDER BY name ASC');
    }
    renderUI();
  }

  function renderUI() {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Diagnostic Tests Database</h1>
          <p class="page-subtitle">Manage your clinic's catalog of diagnostic tests</p>
        </div>
        <button class="btn btn-primary btn-sm" id="add-btn">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          Add Test
        </button>
      </div>

      <div class="page-content slide-up">
        <div class="search-bar mb-6" style="max-width:400px">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input type="text" id="search-input" placeholder="Search tests..." value="${searchQuery}" autocomplete="off" />
        </div>

        <div class="card card-p">
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>Test Name</th>
                  <th>Default Instructions</th>
                  <th style="width:80px">Action</th>
                </tr>
              </thead>
              <tbody>
                ${tests.length === 0 ? `
                  <tr><td colspan="3" class="text-center text-muted py-8">No tests found.</td></tr>
                ` : tests.map(t => `
                  <tr>
                    <td class="font-medium">${t.name}</td>
                    <td>${t.default_instructions || '-'}</td>
                    <td>
                      <button class="btn btn-ghost btn-sm text-primary edit-btn" data-id="${t.id}">Edit</button>
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
        const testObj = tests.find(x => x.id == id);
        if (testObj) openForm(testObj);
      });
    });
  }

  function openForm(testObj = null) {
    const isEdit = !!testObj;
    
    showModal({
      title: isEdit ? 'Edit Test' : 'Add Test',
      bodyHtml: `
        <form id="test-form">
          <div class="form-group">
            <label class="form-label">Test Name <span class="req">*</span></label>
            <input class="input" id="t-name" type="text" value="${testObj?.name || ''}" placeholder="e.g. Complete Blood Count (CBC)" required />
          </div>
          <div class="form-group">
            <label class="form-label">Default Instructions</label>
            <input class="input" id="t-instr" type="text" value="${testObj?.default_instructions || ''}" placeholder="e.g. Fasting 10-12 hours" />
          </div>
        </form>
      `,
      buttons: [
        { label: 'Cancel', class: 'btn-ghost', onClick: () => true },
        { label: 'Save', class: 'btn-primary', onClick: () => {
          const name = document.getElementById('t-name').value.trim();
          if (!name) return toast.error('Name is required');

          const instr = document.getElementById('t-instr').value.trim();

          try {
            if (isEdit) {
              run('UPDATE test_catalog SET name=?, default_instructions=? WHERE id=?', [name, instr, testObj.id]);
              toast.success('Test updated');
            } else {
              run('INSERT INTO test_catalog (name, default_instructions) VALUES (?, ?)', [name, instr]);
              toast.success('Test added');
            }
            loadData();
            return true;
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
