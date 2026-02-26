const sharp = require('sharp');
const path = require('path');

const sizes = [
  { size: 512, name: 'icon-512.png' },
  { size: 192, name: 'icon-192.png' },
  { size: 180, name: 'apple-touch-icon.png' },
];

function buildSvg(size) {
  const r = Math.round(size * 0.22);
  const cx = size / 2;
  const cy = size / 2;

  const strokeW = size * 0.065;
  const qR = size * 0.26;

  const tailX1 = cx + qR * Math.cos(Math.PI * 0.72) - size * 0.01;
  const tailY1 = cy + qR * Math.sin(Math.PI * 0.72) - size * 0.025 - size * 0.015;
  const tailX2 = tailX1 + size * 0.175;
  const tailY2 = tailY1 + size * 0.175;

  const plusSize = size * 0.16;
  const plusStroke = size * 0.052;
  const plusCX = cx - size * 0.028;
  const plusCY = cy - size * 0.025;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4338ca;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#6366f1;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="shine" x1="0%" y1="0%" x2="0%" y2="60%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.14" />
      <stop offset="100%" style="stop-color:#ffffff;stop-opacity:0" />
    </linearGradient>
  </defs>

  <rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="url(#bg)"/>
  <rect width="${size}" height="${size * 0.55}" rx="${r}" ry="${r}" fill="url(#shine)"/>

  <circle cx="${cx}" cy="${cy - size * 0.025}" r="${qR - strokeW / 2}" fill="none" stroke="white" stroke-width="${strokeW}" opacity="0.95"/>

  <line x1="${tailX1}" y1="${tailY1}" x2="${tailX2}" y2="${tailY2}" stroke="white" stroke-width="${strokeW}" stroke-linecap="round" opacity="0.95"/>

  <line x1="${plusCX - plusSize / 2}" y1="${plusCY}" x2="${plusCX + plusSize / 2}" y2="${plusCY}" stroke="white" stroke-width="${plusStroke}" stroke-linecap="round"/>
  <line x1="${plusCX}" y1="${plusCY - plusSize / 2}" x2="${plusCX}" y2="${plusCY + plusSize / 2}" stroke="white" stroke-width="${plusStroke}" stroke-linecap="round"/>
</svg>`;
}

async function generate() {
  for (const { size, name } of sizes) {
    const svg = Buffer.from(buildSvg(size));
    const outPath = path.join(__dirname, '..', 'public', 'icons', name);
    await sharp(svg).png().toFile(outPath);
    console.log(`Generated ${name} (${size}x${size})`);
  }
  console.log('All icons generated successfully.');
}

generate().catch(err => { console.error(err); process.exit(1); });
