const fs = require('fs');
const path = require('path');

const newPathData = fs.readFileSync('traced-icon.svg', 'utf8').match(/<path d="([^"]+)"/)[1];

const baseSvgInner = `<path d="${newPathData}" fill="currentColor" />`;
const whiteSvgInner = `<path d="${newPathData}" fill="white" />`;

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // The old SVG has varying viewBox and stroke/fill properties. We'll use a regex to match the entire <svg>...</svg> block when it contains <circle cx="35"
  
  // Match `<svg ...> ... <circle cx="35" ... </svg>`
  const regex = /<svg[^>]*>[\s\S]*?<circle cx="35"[\s\S]*?<\/svg>/g;
  
  content = content.replace(regex, (match) => {
    // If it's the mobile app bar (Layout.js line 100ish), we used stroke="currentColor" and fill="none".
    // Wait, the match context can help us decide attributes.
    // Let's just standardise the SVG wrapper.
    // If the original match had `width="32"` or `width="24"`, we keep those!
    let widthMatch = match.match(/width="([^"]+)"/);
    let heightMatch = match.match(/height="([^"]+)"/);
    let classMatch = match.match(/class="([^"]+)"/);
    let styleMatch = match.match(/style="([^"]+)"/);
    let viewBox = '0 0 1024 1024';

    let width = widthMatch ? widthMatch[1] : null;
    let height = heightMatch ? heightMatch[1] : null;
    let className = classMatch ? classMatch[1] : null;
    let style = styleMatch ? styleMatch[1] : null;
    
    // Check if the original match had `currentColor` or `white` for the circle
    let isCurrentColor = match.includes('fill="currentColor"');
    let inner = isCurrentColor ? baseSvgInner : whiteSvgInner;

    // For public/icons/icon.svg, it has background style.
    if (filePath.includes('icon.svg')) {
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" fill="white" style="background:#1e5b92; border-radius: 200px;">\n  <path d="${newPathData}" />\n</svg>`;
    }
    
    let attrs = [];
    if (width) attrs.push(`width="${width}"`);
    if (height) attrs.push(`height="${height}"`);
    if (className) attrs.push(`class="${className}"`);
    if (style) attrs.push(`style="${style}"`);
    
    return `<svg viewBox="${viewBox}" ${attrs.join(' ')}>\n  ${inner}\n</svg>`;
  });
  
  fs.writeFileSync(filePath, content);
  console.log('Updated ' + filePath);
}

const filesToUpdate = [
  'src/components/Layout.js',
  'src/pages/Login.js',
  'src/pages/Setup.js',
  'public/icons/icon.svg',
  'index.html'
];

filesToUpdate.forEach(f => replaceInFile(path.join(__dirname, f)));

