import * as THREE from 'three';
import { TEAMS } from './data.js';
import { pick, rng } from './util.js';
import { sceneGame } from './games.js';
import { scene } from './core.js';
import { G, add, flat, group, lampMat, mat } from './kit.js';
import { Q } from './quality.js';

// ================= ballpark geometry =================
// field centre at origin, home plate at +z, centre field toward -z, right field toward +x
const H = 2;                      // island surface height
const HOME_Z = 28;                // home plate z
const WALL = 58;                  // outfield wall radius
const at = (hx, hz) => new THREE.Vector3(hx, H, HOME_Z + hz); // home-relative → world
const FIELD_POS = { P: [0, -12.1], C: [0, 1.8], '1B': [15, -15], '2B': [6, -25], SS: [-7, -24], '3B': [-15, -14], LF: [-28, -48], CF: [0, -58], RF: [28, -48] };
const SKIN = '#f1c7a0';

{
  // island
  add(scene, new THREE.CylinderGeometry(118, 118, .1, 56), '#7cc3c9', 0, .02, 0).castShadow = false;
  add(scene, new THREE.CylinderGeometry(96, 101, 7, 56), '#efe2c9', 0, H - 7, 0);
  add(scene, new THREE.CylinderGeometry(96, 96, .2, 56), '#a9cd8b', 0, H - .2, 0);

  // mowed grass texture
  const cv = document.createElement('canvas');
  cv.width = cv.height = 512;
  const cx = cv.getContext('2d');
  for (let i = 0; i < 16; i++) { cx.fillStyle = i % 2 ? '#5fae55' : '#6dbb60'; cx.fillRect(i * 32, 0, 32, 512); }
  const grassTex = new THREE.CanvasTexture(cv);
  grassTex.colorSpace = THREE.SRGBColorSpace;
  const grass = new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 });
  flat(scene, new THREE.CircleGeometry(WALL + 4, 72), grass, 0, H + .02, 0).rotation.z = Math.PI / 4;

  const DIRT = '#c98a5c';
  flat(scene, new THREE.RingGeometry(WALL - 3, WALL, 72), DIRT, 0, H + .04, 0);
  flat(scene, new THREE.CircleGeometry(23, 48), DIRT, 0, H + .05, HOME_Z - 13);
  const infield = flat(scene, new THREE.PlaneGeometry(15.5, 15.5), '#6dbb60', 0, H + .07, HOME_Z - 12.7);
  infield.rotation.z = Math.PI / 4;
  flat(scene, new THREE.CircleGeometry(4.2, 28), DIRT, 0, H + .08, HOME_Z);
  add(scene, new THREE.CylinderGeometry(2.4, 3, .5, 20), DIRT, 0, H + .05, HOME_Z - 12.1);
  add(scene, G.box, '#ffffff', 0, H + .55, HOME_Z - 12.1, 1.2, .05, .3);
  add(scene, new THREE.CylinderGeometry(.7, .7, .08, 5), '#ffffff', 0, H + .08, HOME_Z, 1, 1, 1, Math.PI);
  for (const [x, z] of [[12.7, -12.7], [0, -25.4], [-12.7, -12.7]]) add(scene, G.box, '#ffffff', x, H + .08, HOME_Z + z, .9, .2, .9, Math.PI / 4);
  for (const s of [-1, 1]) {
    flat(scene, new THREE.CircleGeometry(1.3, 20), '#b07a52', s * 8, H + .09, HOME_Z + 3);           // on-deck circles
    add(scene, G.box, '#ffffff', s * 37.15 * .707, H + .09, HOME_Z - 37.15 * .707, 74.3, .02, .18, s > 0 ? Math.PI / 4 : 3 * Math.PI / 4);
    add(scene, G.cyl, '#f2c200', s * 74.3 * .707, H, HOME_Z - 74.3 * .707, .5, 15, .5);                 // foul poles
  }

  // outfield wall
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(WALL + .2, WALL + .2, 3, 96, 1, true), mat('#2f5d4a', { side: THREE.DoubleSide }));
  wall.position.y = H + 1.5;
  wall.receiveShadow = true;
  scene.add(wall);
  const pad2 = new THREE.Mesh(new THREE.CylinderGeometry(WALL + .25, WALL + .25, .5, 96, 1, true), mat('#f2c200', { side: THREE.DoubleSide }));
  pad2.position.y = H + 3;
  scene.add(pad2);

  // dugouts
  for (const team of ['wc', 'ctbc']) {
    const s = TEAMS[team].side, x = s * 22;
    add(scene, G.box, '#8d8174', x, H, HOME_Z + 8.6, 18, 3.4, .6);
    add(scene, G.box, TEAMS[team].color, x, H + 3.4, HOME_Z + 7.6, 18.4, .35, 2.6);
    add(scene, G.box, '#6f655d', x, H, HOME_Z + 7.9, 16, .8, .9);
  }
}

// stands: stepped bowl via lathe (gap behind centre field for the scoreboard)
const ROWS = 8, ROW_D = 3, ROW_H = 1.6, STAND_R = 61;
const PHI0 = Math.PI + .3, PHIL = Math.PI * 2 - .6;
{
  const prof = [new THREE.Vector2(STAND_R - .5, H)];
  for (let k = 0; k < ROWS; k++) {
    const r = STAND_R + k * ROW_D, y = H + (k + 1) * ROW_H;
    prof.push(new THREE.Vector2(r, y), new THREE.Vector2(r + ROW_D, y));
  }
  prof.push(new THREE.Vector2(STAND_R + ROWS * ROW_D, H));
  prof.reverse();
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(prof, 120, PHI0, PHIL), mat('#e3dacb', { side: THREE.DoubleSide }));
  bowl.castShadow = bowl.receiveShadow = true;
  scene.add(bowl);
  // roof ring on top
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(STAND_R + ROWS * ROW_D + 1, STAND_R + ROWS * ROW_D + 1, 1.2, 120, 1, true, PHI0, PHIL), mat('#d0c6b8', { side: THREE.DoubleSide }));
  roof.position.y = H + ROWS * ROW_H + 3.2;
  scene.add(roof);

  // light towers
  for (const phi of [.75, -.75, 2.35, -2.35]) {
    const r = STAND_R + ROWS * ROW_D + 3, x = Math.sin(phi) * r, z = Math.cos(phi) * r;
    add(scene, G.cyl, '#cfd4d8', x, H, z, .9, 34, .9);
    const head = add(scene, G.box, lampMat, x, H + 33, z, 7, 4, .8, phi);
    head.lookAt(0, 0, 0);
  }
}

// crowd (instanced) – red/white on the 味全 side, yellow/black on the 中信 side
const crowd = (() => {
  const geo = new THREE.BoxGeometry(.9, 1.3, .9).translate(0, .65, 0);
  const seats = [];
  const r = rng(11);
  for (let k = 0; k < ROWS; k++) {
    const rad = STAND_R + k * ROW_D + 1.5, y = H + (k + 1) * ROW_H;
    const n = Math.floor(rad * PHIL / 1.25);
    for (let i = 0; i < n; i++) {
      if (r() < Q.crowdSkip) continue; // empty seats; more of them on low quality
      const phi = PHI0 + (i + .5) / n * PHIL, x = Math.sin(phi) * rad, z = Math.cos(phi) * rad;
      const side = x > 6 ? 'wc' : x < -6 ? 'ctbc' : r() < .5 ? 'wc' : 'ctbc';
      const col = side === 'wc' ? pick(['#c8102e', '#c8102e', '#ffffff', '#1d1d1f'], r) : pick(['#f2c200', '#f2c200', '#1d1d1f', '#ffffff'], r);
      seats.push({ x, y, z, phi, col });
    }
  }
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .9 }), seats.length);
  const m4 = new THREE.Matrix4(), c = new THREE.Color();
  seats.forEach((s, i) => {
    m4.makeTranslation(s.x, s.y, s.z);
    mesh.setMatrixAt(i, m4);
    mesh.setColorAt(i, c.set(s.col));
  });
  mesh.castShadow = true;
  scene.add(mesh);
  return { mesh, seats, m4 };
})();

// scoreboard behind centre field
const board = (() => {
  const cv = document.createElement('canvas');
  cv.width = 1024; cv.height = 420;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const g = group(scene, 0, H, -(STAND_R + 9));
  add(g, G.box, '#38424f', -14, 0, 0, 1.2, 10, 1.2);
  add(g, G.box, '#38424f', 14, 0, 0, 1.2, 10, 1.2);
  add(g, G.box, '#1d1d1f', 0, 9, -.2, 38, 16, 1.2);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(36, 14.8), new THREE.MeshStandardMaterial({ map: tex, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: .5 }));
  screen.position.set(0, 17, .45);
  g.add(screen);
  let current = sceneGame;
  function draw(gm = current) {
    current = gm;
    const x = cv.getContext('2d');
    x.fillStyle = '#0f2a22'; x.fillRect(0, 0, 1024, 420);
    x.fillStyle = '#f2c200'; x.font = '900 40px "Noto Sans TC"';
    x.fillText(`台灣大賽 ${gm.g}  ${gm.date}（${gm.wd}）  ${gm.venue}`, 36, 62);
    x.font = '700 30px "Space Mono", monospace'; x.fillStyle = '#9fb3aa';
    const n = gm.line.wc.length, step = n > 9 ? 50 : 60;
    const col = i => 250 + i * step;
    for (let i = 0; i < n; i++) x.fillText(String(i + 1), col(i) + (i > 8 ? -8 : 0), 130);
    ['R', 'H', 'E'].forEach((s, i) => x.fillText(s, 830 + i * 60, 130));
    [gm.away, gm.home].forEach((t, row) => {
      const y = 210 + row * 90;
      x.fillStyle = TEAMS[t].color; x.fillRect(36, y - 42, 14, 54);
      x.fillStyle = '#ffffff'; x.font = '900 42px "Noto Sans TC"';
      x.fillText(TEAMS[t].name, 66, y);
      x.font = '700 36px "Space Mono", monospace';
      gm.line[t].forEach((v, i) => {
        const walk = gm.walkoff && t === gm.home && i === n - 1;
        x.fillStyle = v ? '#ffcf3a' : '#d7e3dd';
        x.fillText(v == null ? 'X' : walk ? v + 'x' : String(v), col(i) - (walk ? 6 : 0), y);
      });
      gm.rhe[t].forEach((v, i) => { x.fillStyle = i ? '#d7e3dd' : '#ffcf3a'; x.fillText(String(v), 830 + i * 60, y); });
    });
    tex.needsUpdate = true;
  }
  screen.userData.draw = draw;
  draw();
  document.fonts.ready.then(() => draw());
  return screen;
})();

// cheer stages in foul territory, next to each dugout
const STAGE = {};
for (const team of ['wc', 'ctbc']) {
  const s = TEAMS[team].side, x = s * 37, z = HOME_Z + 5;
  const g = group(scene, x, H, z, -s * .35);
  add(g, G.box, '#1d1d1f', 0, 0, 0, 14, 1.4, 6.5);
  add(g, G.box, TEAMS[team].color, 0, 1.4, 0, 14.2, .12, 6.7);
  add(g, G.box, TEAMS[team].color, 0, 0, -3.4, 14, 5.5, .4);
  add(g, G.box, '#ffffff', 0, 4.2, -3.15, 10, .6, .1);
  for (const lx of [-6.5, 6.5]) { add(g, G.cyl, '#38424f', lx, 1.5, -2.6, .2, 4.4, .2); add(g, G.head, lampMat, lx, 6, -2.6, .7, .7, .7); }
  STAGE[team] = g;
}

export { H, HOME_Z, WALL, at, FIELD_POS, SKIN, ROWS, ROW_D, ROW_H, STAND_R, PHI0, PHIL, crowd, board, STAGE };
