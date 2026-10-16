import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PNG } from 'pngjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');

// Colors
const BG_DARK = [8, 9, 11, 255];      // #08090B
const BORDER_DARK = [31, 36, 45, 255]; // #1F242D
const SHIELD_BG = [13, 15, 18, 255];   // #0D0F12
const CYAN_BLUE = [56, 189, 248, 255]; // #38BDF8
const TRANSPARENT = [0, 0, 0, 0];

function distancePointToSegment(px, py, x1, y1, x2, y2) {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

function isInsidePolygon(px, py, vertices) {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i][0], yi = vertices[i][1];
    const xj = vertices[j][0], yj = vertices[j][1];
    const intersect = ((yi > py) !== (yj > py)) &&
      (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function renderShieldPng(size) {
  const png = new PNG({ width: size, height: size });
  const scale = size / 512;
  const strokeWidth = Math.max(1.2, 20 * scale);
  const halfStroke = strokeWidth / 2;

  // Normalized polygon vertices from 512x512 SVG
  // M256 80 L128 136 v112 c0 102.4 54.4 172.8 128 200 c73.6 -27.2 128 -97.6 128 -200 V136 L256 80z
  // Approximate curve with discrete segments
  const baseCurve = [];
  const steps = 16;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Cubic bezier from (128, 248) to (256, 448) with control points (128, 350.4) and (182.4, 420.8)
    const x = Math.pow(1 - t, 3) * 128 + 3 * Math.pow(1 - t, 2) * t * 128 + 3 * (1 - t) * Math.pow(t, 2) * 182.4 + Math.pow(t, 3) * 256;
    const y = Math.pow(1 - t, 3) * 248 + 3 * Math.pow(1 - t, 2) * t * 350.4 + 3 * (1 - t) * Math.pow(t, 2) * 420.8 + Math.pow(t, 3) * 448;
    baseCurve.push([x * scale, y * scale]);
  }

  const rightCurve = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Mirror curve to (384, 248)
    const x = Math.pow(1 - t, 3) * 256 + 3 * Math.pow(1 - t, 2) * t * 329.6 + 3 * (1 - t) * Math.pow(t, 2) * 384 + Math.pow(t, 3) * 384;
    const y = Math.pow(1 - t, 3) * 448 + 3 * Math.pow(1 - t, 2) * t * 420.8 + 3 * (1 - t) * Math.pow(t, 2) * 350.4 + Math.pow(t, 3) * 248;
    rightCurve.push([x * scale, y * scale]);
  }

  const shieldVertices = [
    [256 * scale, 80 * scale],
    [128 * scale, 136 * scale],
    [128 * scale, 248 * scale],
    ...baseCurve.slice(1),
    ...rightCurve.slice(1),
    [384 * scale, 136 * scale],
  ];

  const squircleRadius = 112 * scale;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;

      // Squircle distance check
      const dx = Math.max(0, Math.abs(x - size / 2) - (size / 2 - squircleRadius));
      const dy = Math.max(0, Math.abs(y - size / 2) - (size / 2 - squircleRadius));
      const distFromCorner = Math.hypot(dx, dy);

      if (distFromCorner > squircleRadius) {
        // Outside rounded squircle
        png.data[idx] = TRANSPARENT[0];
        png.data[idx + 1] = TRANSPARENT[1];
        png.data[idx + 2] = TRANSPARENT[2];
        png.data[idx + 3] = TRANSPARENT[3];
        continue;
      }

      // Default background
      let color = [...BG_DARK];

      // Subtle squircle border
      if (distFromCorner > squircleRadius - Math.max(1, 8 * scale) ||
          x <= 4 * scale || x >= size - 4 * scale || y <= 4 * scale || y >= size - 4 * scale) {
        color = [...BORDER_DARK];
      }

      // Inside shield
      const insideShield = isInsidePolygon(x, y, shieldVertices);

      // Distance to shield boundary
      let minBorderDist = Infinity;
      for (let i = 0, j = shieldVertices.length - 1; i < shieldVertices.length; j = i++) {
        const d = distancePointToSegment(x, y, shieldVertices[j][0], shieldVertices[j][1], shieldVertices[i][0], shieldVertices[i][1]);
        if (d < minBorderDist) minBorderDist = d;
      }

      if (minBorderDist <= halfStroke) {
        // Shield outline
        color = [...CYAN_BLUE];
      } else if (insideShield) {
        color = [...SHIELD_BG];

        // Lock Core: Rect x=208..304, y=240..320
        const lx = x / scale;
        const ly = y / scale;

        // Lock Shackle: arch x=228..284, y=208..240
        const shackleDist = Math.abs(Math.hypot(lx - 256, ly - 240) - 28);
        if (ly <= 240 && ly >= 208 && shackleDist <= 8 && lx >= 220 && lx <= 292) {
          color = [...CYAN_BLUE];
        }

        // Lock Body: x=208..304, y=240..320
        if (lx >= 208 && lx <= 304 && ly >= 240 && ly <= 320) {
          // Keyhole: circle cx=256, cy=275, r=8 + slot y=283..299
          const keyholeCircle = Math.hypot(lx - 256, ly - 275);
          const keyholeSlot = Math.abs(lx - 256) <= 3 && ly >= 280 && ly <= 299;
          if (keyholeCircle <= 8 || keyholeSlot) {
            color = [...BG_DARK];
          } else {
            color = [...CYAN_BLUE];
          }
        }
      }

      png.data[idx] = color[0];
      png.data[idx + 1] = color[1];
      png.data[idx + 2] = color[2];
      png.data[idx + 3] = color[3];
    }
  }

  return PNG.sync.write(png);
}

// Generate multi-image ICO format (16x16, 32x32, 48x48)
function createIco(pngEntries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // ICO type
  header.writeUInt16LE(pngEntries.length, 4); // count

  let offset = 6 + pngEntries.length * 16;
  const dirEntries = [];
  const imageBuffers = [];

  for (const { buf, size } of pngEntries) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size < 256 ? size : 0, 0); // width
    entry.writeUInt8(size < 256 ? size : 0, 1); // height
    entry.writeUInt8(0, 2); // color palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(buf.length, 8); // size
    entry.writeUInt32LE(offset, 12); // offset

    dirEntries.push(entry);
    imageBuffers.push(buf);
    offset += buf.length;
  }

  return Buffer.concat([header, ...dirEntries, ...imageBuffers]);
}

console.log('Generating official NEXUS shield favicons...');
const p16 = renderShieldPng(16);
const p32 = renderShieldPng(32);
const p48 = renderShieldPng(48);
const p180 = renderShieldPng(180);
const p192 = renderShieldPng(192);
const p512 = renderShieldPng(512);

fs.writeFileSync(path.join(publicDir, 'favicon-16x16.png'), p16);
fs.writeFileSync(path.join(publicDir, 'favicon-32x32.png'), p32);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), p180);
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), p192);
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), p512);

const ico = createIco([
  { buf: p16, size: 16 },
  { buf: p32, size: 32 },
  { buf: p48, size: 48 },
]);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), ico);

console.log('Generated:');
console.log(' - public/favicon-16x16.png');
console.log(' - public/favicon-32x32.png');
console.log(' - public/apple-touch-icon.png');
console.log(' - public/icon-192.png');
console.log(' - public/icon-512.png');
console.log(' - public/favicon.ico');
