// Build the web images for the cheerleader avatars from the PNG originals in art/cheer/:
//   public/assets/cheer/{team}/{team}-NN.webp   512px, detail page
//   public/assets/cheer/thumb/{team}-NN.webp    128px, name tags & lists
// The PNGs stay in art/ (not deployed).
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const SRC = 'art/cheer', OUT = 'public/assets/cheer';
let png = 0, big = 0, small = 0;
for (const team of ['wc', 'ctbc']) {
  fs.mkdirSync(path.join(OUT, team), { recursive: true });
  fs.mkdirSync(path.join(OUT, 'thumb'), { recursive: true });
  for (const file of fs.readdirSync(path.join(SRC, team)).filter(f => f.endsWith('.png'))) {
    const src = path.join(SRC, team, file), name = file.replace(/\.png$/, '.webp');
    const detail = path.join(OUT, team, name), thumb = path.join(OUT, 'thumb', name);
    await sharp(src).resize(512, 512, { fit: 'cover' }).webp({ quality: 80 }).toFile(detail);
    await sharp(src).resize(128, 128, { fit: 'cover' }).webp({ quality: 78 }).toFile(thumb);
    png += fs.statSync(src).size; big += fs.statSync(detail).size; small += fs.statSync(thumb).size;
  }
}
const mb = n => (n / 1048576).toFixed(2) + ' MB';
console.log(`PNG ${mb(png)} → detail WebP ${mb(big)} + thumbnails ${mb(small)}`);
