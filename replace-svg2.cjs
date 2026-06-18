const fs = require('fs');

const pathStr = fs.readFileSync('traced-icon.svg', 'utf8').match(/<path d="([^"]+)"/)[1];

const files = [
  'src/components/Layout.js',
  'src/pages/Login.js',
  'src/pages/Setup.js',
  'public/icons/icon.svg',
  'index.html'
];

// Target to replace (the old ugly logo SVG)
const target1 = `<svg fill="none" stroke="white" viewBox="0 0 100 100" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="35" cy="18" r="5" fill="white" stroke="none" />
              <circle cx="65" cy="18" r="5" fill="white" stroke="none" />
              <path d="M 35 22 C 35 34, 42 40, 50 40 L 82 40 A 12 12 0 0 1 82 64 L 62 64 L 62 84 A 12 12 0 0 1 38 84 L 38 64 L 18 64 A 12 12 0 0 1 18 40 L 50 40 C 58 40, 65 34, 65 22" />
            </svg>`;

const replacement1 = `<svg viewBox="0 0 1024 1024" fill="currentColor">
              <path d="${pathStr}" />
            </svg>`;

// The mobile layout one
const target2 = `<svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 100 100" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="35" cy="18" r="5" fill="currentColor" stroke="none" />
              <circle cx="65" cy="18" r="5" fill="currentColor" stroke="none" />
              <path d="M 35 22 C 35 34, 42 40, 50 40 L 82 40 A 12 12 0 0 1 82 64 L 62 64 L 62 84 A 12 12 0 0 1 38 84 L 38 64 L 18 64 A 12 12 0 0 1 18 40 L 50 40 C 58 40, 65 34, 65 22" />
            </svg>`;
const replacement2 = `<svg width="24" height="24" viewBox="0 0 1024 1024" fill="currentColor">
              <path d="${pathStr}" />
            </svg>`;
            
// The index.html one
const target3 = `<svg viewBox="0 0 100 100" width="56" height="56" fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" style="background: linear-gradient(135deg, #0ea5e9, #0f766e); border-radius: 20%;">
          <circle cx="35" cy="18" r="4.5" fill="#ffffff" stroke="none" />
          <circle cx="65" cy="18" r="4.5" fill="#ffffff" stroke="none" />
          <path d="
            M 35 22
            C 35 34, 42 40, 50 40
            L 82 40
            A 12 12 0 0 1 82 64
            L 62 64
            L 62 84
            A 12 12 0 0 1 38 84
            L 38 64
            L 18 64
            A 12 12 0 0 1 18 40
            L 50 40
            C 58 40, 65 34, 65 22
          " />
        </svg>`;
const replacement3 = `<svg viewBox="0 0 1024 1024" width="56" height="56" fill="white" style="background: linear-gradient(135deg, #0ea5e9, #0f766e); border-radius: 20%;">
          <path d="${pathStr}" />
        </svg>`;

// The public/icons/icon.svg one
const replacement4 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" fill="white" style="background:#1e5b92; border-radius: 204px;">
  <path d="${pathStr}" />
</svg>`;

files.forEach(f => {
  if (fs.existsSync(f)) {
    let str = fs.readFileSync(f, 'utf8');
    
    if (f === 'public/icons/icon.svg') {
      fs.writeFileSync(f, replacement4);
    } else {
      str = str.replace(target1, replacement1);
      str = str.replace(target2, replacement2);
      str = str.replace(target3, replacement3);
      fs.writeFileSync(f, str);
    }
  }
});
console.log('Replaced exact targets.');
