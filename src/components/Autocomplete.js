// ============================================================
// DocRx — Reusable Autocomplete Component
// ============================================================

/**
 * Creates an autocomplete input
 * @param {Object} options
 *   - input: HTMLInputElement
 *   - fetchFn: async (query) => [{label, sublabel, data}]
 *   - onSelect: (item) => void
 *   - minChars: number (default 2)
 *   - placeholder: string
 */
export function createAutocomplete({ input, fetchFn, onSelect, minChars = 2 }) {
  const wrap = input.parentElement;
  if (!wrap.classList.contains('autocomplete-wrap')) {
    input.parentElement.classList.add('autocomplete-wrap');
  }

  let list = wrap.querySelector('.autocomplete-list');
  if (!list) {
    list = document.createElement('div');
    list.className = 'autocomplete-list';
    wrap.appendChild(list);
  }

  let focusedIndex = -1;
  let items = [];
  let debounceTimer = null;

  function close() {
    list.classList.remove('open');
    list.innerHTML = '';
    focusedIndex = -1;
    items = [];
  }

  function render(results) {
    items = results;
    list.innerHTML = '';
    if (!results.length) { close(); return; }
    results.forEach((item, i) => {
      const el = document.createElement('div');
      el.className = 'autocomplete-item';
      el.innerHTML = `
        <span>${highlight(item.label, input.value)}</span>
        ${item.sublabel ? `<span class="autocomplete-item-meta">${item.sublabel}</span>` : ''}
      `;
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        select(i);
      });
      list.appendChild(el);
    });
    list.classList.add('open');
    focusedIndex = -1;
  }

  function highlight(text, query) {
    if (!query) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark style="background:rgba(14,165,233,0.25);color:inherit;border-radius:2px">$1</mark>');
  }

  function select(i) {
    if (items[i]) {
      input.value = items[i].label;
      onSelect(items[i]);
      close();
    }
  }

  function moveFocus(dir) {
    const listItems = list.querySelectorAll('.autocomplete-item');
    if (!listItems.length) return;
    listItems[focusedIndex]?.classList.remove('focused');
    focusedIndex = Math.max(0, Math.min(listItems.length - 1, focusedIndex + dir));
    listItems[focusedIndex]?.classList.add('focused');
    listItems[focusedIndex]?.scrollIntoView({ block: 'nearest' });
  }

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const q = input.value.trim();
    if (q.length < minChars) { close(); return; }
    debounceTimer = setTimeout(async () => {
      const results = await fetchFn(q);
      render(results);
    }, 120);
  });

  input.addEventListener('keydown', (e) => {
    if (!list.classList.contains('open')) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); moveFocus(1); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); moveFocus(-1); }
    if (e.key === 'Enter' && focusedIndex >= 0) { e.preventDefault(); select(focusedIndex); }
    if (e.key === 'Escape') close();
  });

  input.addEventListener('blur', () => setTimeout(close, 150));

  return { close };
}
