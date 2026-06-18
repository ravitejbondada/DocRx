const sharp = require('sharp');
const fs = require('fs');

const imagePath = 'C:\\Users\\91955\\.gemini\\antigravity\\brain\\09736551-4ed0-45c2-aa77-583fd3f8014d\\media__1781790705235.jpg';

async function processImage() {
  try {
    const { data, info } = await sharp(imagePath)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const w = info.width;
    const h = info.height;
    const c = info.channels;
    
    // We want to isolate the white icon in the center.
    // The checkered background might be disconnected from the center icon.
    // Let's create a binary mask.
    const mask = new Uint8Array(w * h);
    
    // First, let's identify all "white" pixels (r>200, g>200, b>200).
    for (let i = 0; i < w * h; i++) {
      const idx = i * c;
      const r = data[idx];
      const g = data[idx+1];
      const b = data[idx+2];
      if (r > 200 && g > 200 && b > 200) {
        mask[i] = 1; // potential icon pixel
      } else {
        mask[i] = 0;
      }
    }
    
    // Flood fill from center to find the contiguous white shape
    const cx = Math.floor(w / 2);
    const cy = Math.floor(h / 2);
    
    const outMask = new Uint8Array(w * h);
    const queue = [[cx, cy]];
    
    // To be safe, let's start flood fill from a small region in the center in case the exact center is a hole.
    for (let y = cy - 20; y <= cy + 20; y++) {
      for (let x = cx - 20; x <= cx + 20; x++) {
        if (mask[y * w + x] === 1) {
          queue.push([x, y]);
          outMask[y * w + x] = 1;
        }
      }
    }

    let head = 0;
    while(head < queue.length) {
      const [x, y] = queue[head++];
      
      const neighbors = [
        [x+1, y], [x-1, y], [x, y+1], [x, y-1],
        [x+1, y+1], [x-1, y-1], [x+1, y-1], [x-1, y+1]
      ];
      
      for (const [nx, ny] of neighbors) {
        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
          const idx = ny * w + nx;
          if (mask[idx] === 1 && outMask[idx] === 0) {
            outMask[idx] = 1;
            queue.push([nx, ny]);
          }
        }
      }
    }
    
    // Now outMask contains ONLY the contiguous white shape from the center.
    // Let's create an output image for potrace.
    // Potrace traces black, so we make the shape BLACK (0) and background WHITE (255)
    const outData = Buffer.alloc(w * h * c);
    for (let i = 0; i < w * h; i++) {
      const idx = i * c;
      if (outMask[i] === 1) {
        // It's the icon -> make it black
        outData[idx] = 0;
        outData[idx+1] = 0;
        outData[idx+2] = 0;
        if (c === 4) outData[idx+3] = 255;
      } else {
        // It's background -> make it white
        outData[idx] = 255;
        outData[idx+1] = 255;
        outData[idx+2] = 255;
        if (c === 4) outData[idx+3] = 255;
      }
    }

    const tmpPath = 'temp-flood.png';
    await sharp(outData, {
      raw: { width: w, height: h, channels: c }
    }).toFile(tmpPath);
    console.log('Flood-filled image saved to ' + tmpPath);

    const potrace = require('potrace');
    potrace.trace(tmpPath, { color: 'currentColor', background: 'transparent', optTolerance: 0.4 }, function(err, svg) {
      if (err) throw err;
      
      // Clean up the SVG a bit
      svg = svg.replace(/width="[0-9.]+"/g, 'width="100%"');
      svg = svg.replace(/height="[0-9.]+"/g, 'height="100%"');

      fs.writeFileSync('traced-icon.svg', svg);
      console.log('Successfully traced SVG to traced-icon.svg');
    });

  } catch(e) {
    console.error(e);
  }
}

processImage();
