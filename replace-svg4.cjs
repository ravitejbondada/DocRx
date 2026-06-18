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
  const regex = /<circle cx="35"[^>]+>\s*<circle cx="65"[^>]+>\s*<path d="[^"]+" \/>/g;
  
  if (regex.test(content)) {
    content = content.replace(regex, `<path d="${pathStr}" fill="currentColor" stroke="none" />`);
    // also fix viewBox
    content = content.replaceAll('viewBox="0 0 100 100"', 'viewBox="0 0 1024 1024"');
    
    // In index.html, it's fill="white" instead of currentColor to show on gradient
    if (f === 'index.html') {
      content = content.replace('fill="currentColor"', 'fill="white"');
    }
    
    fs.writeFileSync(f, content);
    console.log('Updated ' + f);
  }
});

const iconContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" fill="white" style="background:#1e5b92; border-radius: 204px;">
  <path d="${pathStr}" />
</svg>`;
fs.writeFileSync('public/icons/icon.svg', iconContent);
console.log('Updated public/icons/icon.svg');
