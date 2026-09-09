import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';

const OUT = '/Users/pranav/Desktop/JOB card/angular-app/public/icons';
const PUB = '/Users/pranav/Desktop/JOB card/angular-app/public';

// Purple, rounded-app-icon style (matches the reference the user liked),
// "DP" monogram + a small scissors nod to garment cutting.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#7c3aed"/>
      <stop offset="1" stop-color="#a855f7"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#g)"/>
  <g fill="#ffffff">
    <path d="M120 150h78c58 0 100 43 100 106s-42 106-100 106h-78zM160 190v132h36c35 0 60-27 60-66s-25-66-60-66z"/>
    <path d="M300 150h74c46 0 78 30 78 72s-32 72-78 72h-34v68h-40zM340 190v66h30c23 0 38-13 38-33s-15-33-38-33z"/>
  </g>
  <g stroke="#ffffff" stroke-width="14" stroke-linecap="round" fill="none" opacity="0.85">
    <circle cx="150" cy="392" r="18"/>
    <circle cx="362" cy="392" r="18"/>
    <path d="M168 380 330 300 M168 404 330 300 M344 380 250 336 M344 404 250 336"/>
  </g>
</svg>`;

await mkdir(OUT, { recursive: true });
await writeFile(`${PUB}/icon.svg`, svg);

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
for (const s of sizes) {
  await sharp(Buffer.from(svg)).resize(s, s).png().toFile(`${OUT}/icon-${s}x${s}.png`);
  console.log(`icon-${s}x${s}.png`);
}

// favicon (32) + apple-touch already points at 192
await sharp(Buffer.from(svg)).resize(32, 32).png().toFile(`${PUB}/favicon-32.png`);
console.log('favicon-32.png');
console.log('done');
