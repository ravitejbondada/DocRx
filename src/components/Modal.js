// ============================================================
// DocRx — Modal Component
// ============================================================

export function showModal({ title, bodyHtml, confirmText = 'Confirm', cancelText = 'Cancel', onConfirm, onCancel }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width: 480px;">
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="modal-close" id="modal-close-x" style="font-size: 1.5rem; line-height: 1;">&times;</button>
      </div>
      <div class="modal-body">
        ${bodyHtml}
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" id="modal-cancel-btn">${cancelText}</button>
        <button class="btn btn-primary" id="modal-confirm-btn">${confirmText}</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  
  // Trigger open animation transition
  setTimeout(() => overlay.classList.add('open'), 10);

  const close = () => {
    overlay.classList.remove('open');
    setTimeout(() => overlay.remove(), 250);
  };

  overlay.querySelector('#modal-close-x').onclick = () => {
    if (onCancel) onCancel();
    close();
  };
  overlay.querySelector('#modal-cancel-btn').onclick = () => {
    if (onCancel) onCancel();
    close();
  };
  overlay.querySelector('#modal-confirm-btn').onclick = () => {
    if (onConfirm) {
      const shouldClose = onConfirm(overlay);
      if (shouldClose !== false) close();
    } else {
      close();
    }
  };

  return overlay;
}
