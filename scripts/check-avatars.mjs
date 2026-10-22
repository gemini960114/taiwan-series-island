// Check that the roster (src/data.js), src/cheer-metadata.json, the PNG originals in art/
// and the generated WebP files all agree.
import fs from 'node:fs';
import sharp from 'sharp';
import { execFileSync } from 'node:child_process';

globalThis.window = {};
const { CHEER } = await import('../src/data.js');
const meta = JSON.parse(fs.readFileSync('src/cheer-metadata.json', 'utf8')).files;

const hasArt = fs.existsSync('art/cheer');
const problems = [];
let n = 0;
for (const [team, group] of Object.entries(CHEER)) {
  for (const m of group.members) {
    n++;
    const md = meta[m.avatarKey];
    if (!md) problems.push(`${m.avatarKey}: missing in cheer-metadata.json`);
    else {
      if (md.name !== m.name) problems.push(`${m.avatarKey}: name ${m.name} ≠ metadata ${md.name}`);
      if (md.team !== team) problems.push(`${m.avatarKey}: team ${team} ≠ metadata ${md.team}`);
      if ((m.no ?? null) !== (md.number ?? null)) problems.push(`${m.avatarKey}: number ${m.no} ≠ metadata ${md.number}`);
      if ((m.role ?? '成員') !== (md.role ?? '成員')) problems.push(`${m.avatarKey}: role ${m.role ?? '成員'} ≠ metadata ${md.role}`);
      const nat = m.kr ? '韓國' : m.note ?? '台灣'; // same wording as the detail page
      if (md.nationality && md.nationality !== nat) problems.push(`${m.avatarKey}: nationality ${nat} ≠ metadata ${md.nationality}`);
      if (!!m.feature !== !!md.featured) problems.push(`${m.avatarKey}: featured ${!!m.feature} ≠ metadata ${!!md.featured}`);
      if (!Array.isArray(md.aliases)) problems.push(`${m.avatarKey}: aliases should be an array`);
    }
    // art/ holds the PNG originals and is not committed (.gitignore), so CI checks only what gets deployed
    if (hasArt && !fs.existsSync('art/cheer/' + m.avatarKey)) problems.push(`art/cheer/${m.avatarKey}: original missing`);
    for (const [f, size] of [[m.avatar, 512], [m.thumb, 128]]) {
      if (!fs.existsSync('public/' + f)) { problems.push(`public/${f}: missing (run npm run images)`); continue; }
      const { width, height } = await sharp('public/' + f).metadata();
      if (width !== size || height !== size) problems.push(`public/${f}: ${width}×${height}, expected ${size}×${size}`);
    }
  }
}
const used = new Set(Object.values(CHEER).flatMap(g => g.members.map(m => m.avatarKey)));
for (const k of Object.keys(meta)) if (!used.has(k)) problems.push(`${k}: in cheer-metadata.json but not in the roster`);

// cheer songs: team rule is 30 seconds or less per clip (needs ffprobe; skipped if it is not installed)
const MAX_SECONDS = 30;
for (const f of fs.existsSync('public/assets/audio') ? fs.readdirSync('public/assets/audio').filter(f => f.endsWith('.mp3')) : []) {
  try {
    const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', `public/assets/audio/${f}`], { encoding: 'utf8' });
    const sec = parseFloat(out);
    if (!(sec <= MAX_SECONDS)) problems.push(`public/assets/audio/${f}: ${sec.toFixed(1)}s, over the ${MAX_SECONDS}s limit`);
  } catch (err) {
    if (err.code === 'ENOENT') { console.log('note: ffprobe not found, audio length not checked'); break; }
    problems.push(`public/assets/audio/${f}: cannot read (${err.message.split('\n')[0]})`);
  }
}

console.log(problems.length ? problems.join('\n')
  : `OK: ${n} members, metadata${hasArt ? ', originals' : ''} and web images all match${hasArt ? '' : ' (art/ not present, originals skipped)'}`);
process.exit(problems.length ? 1 : 0);
