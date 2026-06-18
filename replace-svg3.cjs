const fs = require('fs');

const pathStr = fs.readFileSync('traced-icon.svg', 'utf8').match(/<path d="([^"]+)"/)[1];

const files = [
  'src/components/Layout.js',
  'src/pages/Login.js',
  'src/pages/Setup.js',
  'index.html'
];

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  
  // Replace all instances of the ugly SVG inner content with the new inner content
  const oldInner = `<circle cx="35" cy="18" r="5" fill="white" stroke="none" />
              <circle cx="65" cy="18" r="5" fill="white" stroke="none" />
              <path d="M 35 22 C 35 34, 42 40, 50 40 L 82 40 A 12 12 0 0 1 82 64 L 62 64 L 62 84 A 12 12 0 0 1 38 84 L 38 64 L 18 64 A 12 12 0 0 1 18 40 L 50 40 C 58 40, 65 34, 65 22" />`;
  const newInner = `<path d="${pathStr}" fill="currentColor" stroke="none" />`;
  
  const oldInnerMobile = `<circle cx="35" cy="18" r="5" fill="currentColor" stroke="none" />
              <circle cx="65" cy="18" r="5" fill="currentColor" stroke="none" />
              <path d="M 35 22 C 35 34, 42 40, 50 40 L 82 40 A 12 12 0 0 1 82 64 L 62 64 L 62 84 A 12 12 0 0 1 38 84 L 38 64 L 18 64 A 12 12 0 0 1 18 40 L 50 40 C 58 40, 65 34, 65 22" />`;

  const oldInnerSetup2 = `                <circle cx="35" cy="18" r="5" fill="white" stroke="none" />
                <circle cx="65" cy="18" r="5" fill="white" stroke="none" />
                <path d="M 35 22 C 35 34, 42 40, 50 40 L 82 40 A 12 12 0 0 1 82 64 L 62 64 L 62 84 A 12 12 0 0 1 38 84 L 38 64 L 18 64 A 12 12 0 0 1 18 40 L 50 40 C 58 40, 65 34, 65 22" />`;

  const oldInnerIndex = `<circle cx="35" cy="18" r="4.5" fill="#ffffff" stroke="none" />
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
          " />`;

  // We also need to fix the viewBox.
  // We'll replace `viewBox="0 0 100 100"` with `viewBox="0 0 1024 1024"`
  
  let changed = false;
  if (content.includes(oldInner)) {
    content = content.replaceAll(oldInner, newInner);
    changed = true;
  }
  if (content.includes(oldInnerMobile)) {
    content = content.replaceAll(oldInnerMobile, newInner);
    changed = true;
  }
  if (content.includes(oldInnerSetup2)) {
    content = content.replaceAll(oldInnerSetup2, `<path d="${pathStr}" fill="currentColor" stroke="none" />`);
    changed = true;
  }
  if (content.includes(oldInnerIndex)) {
    content = content.replaceAll(oldInnerIndex, `<path d="${pathStr}" fill="white" stroke="none" />`);
    changed = true;
  }

  if (changed) {
    // Also replace the viewbox on the surrounding tag if necessary.
    // Wait, replacing viewBox="0 0 100 100" might replace other things? Let's just do it, only SVGs have viewBox.
    content = content.replaceAll('viewBox="0 0 100 100"', 'viewBox="0 0 1024 1024"');
    fs.writeFileSync(f, content);
    console.log('Updated ' + f);
  }
});
