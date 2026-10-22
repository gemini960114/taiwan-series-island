import * as THREE from 'three';
import { fbm, hash, pick, rng, smooth } from './util.js';
import { scene } from './core.js';
import { G, GREENS, add, building, group, lampMat, tree } from './kit.js';
import { Q } from './quality.js';

// ================= sea, terrain, islets =================
const water = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), new THREE.MeshStandardMaterial({ color: '#45a5b8', roughness: .35 }));
water.rotation.x = -Math.PI / 2;
water.receiveShadow = true;
scene.add(water);

function landHeight(x, z) {
  const e = Math.hypot(x / 210, (z - 10) / 165);
  const big = fbm(x * .01 + 3, z * .01 + 7);
  return -6 + smooth(.9, 1.25, e) * (14 + 55 * big) + smooth(.88, 1.1, e) * fbm(x * .05, z * .05) * 3;
}
{
  const geo = new THREE.PlaneGeometry(1300, 1300, Q.terrainSeg, Q.terrainSeg).rotateX(-Math.PI / 2).toNonIndexed();
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, landHeight(pos.getX(i), pos.getZ(i)));
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color(), sand = new THREE.Color('#e8d6a8'), g1 = new THREE.Color('#b3d189'), g2 = new THREE.Color('#86b466'), g3 = new THREE.Color('#5f9150');
  for (let i = 0; i < pos.count; i += 3) {
    const y = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
    const n = hash(pos.getX(i) * .1, pos.getZ(i) * .1) * .08;
    if (y < 1.2) c.copy(sand);
    else if (y < 9) c.copy(g1).lerp(g2, (y - 1.2) / 8);
    else c.copy(g2).lerp(g3, Math.min(1, (y - 9) / 25));
    c.offsetHSL(0, 0, n - .04);
    for (let k = 0; k < 3; k++) colors.set([c.r, c.g, c.b], (i + k) * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }));
  terrain.receiveShadow = true;
  scene.add(terrain);

  const N = Q.trees;
  const crowns = new THREE.InstancedMesh(G.cone, new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: .9 }), N);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
  const r = rng(42);
  for (let k = 0; k < N;) {
    const x = (r() - .5) * 1100, z = (r() - .5) * 900 - 120;
    const y = landHeight(x, z);
    if (y < 1.6 || y > 60) continue;
    const s = 2.6 + r() * 2.2;
    m4.compose(ps.set(x, y - .4, z), q, sc.set(s, s * (1.8 + r()), s));
    crowns.setMatrixAt(k, m4);
    crowns.setColorAt(k, new THREE.Color(pick(GREENS, r)).offsetHSL(0, 0, -.04));
    k++;
  }
  crowns.castShadow = true;
  scene.add(crowns);

  for (let i = 0; i < 40;) {
    const x = (r() - .5) * 520, z = -120 - r() * 160;
    const y = landHeight(x, z);
    if (y < 1.5 || y > 20) continue;
    building(scene, x, z, y - .2, 3.2, 2.8, 2.6, '#fbf6ee', pick(['#e2602f', '#d4583a', '#e2a23d'], r), r() * 3);
    i++;
  }
}

const spinners = [];
function islet(x, z, rad, kind) {
  const r = rng(Math.round(x * 13 + z * 7));
  const g = group(scene, x, 0, z);
  add(g, new THREE.CylinderGeometry(rad * 1.45, rad * 1.45, .1, 18), '#7cc3c9', 0, .02, 0).castShadow = false;
  add(g, new THREE.CylinderGeometry(rad, rad * 1.18, 4, 16), '#eadbb8', 0, -2.6, 0);
  add(g, new THREE.CylinderGeometry(rad * .86, rad * .95, .7, 16), '#a8cd88', 0, 1.4, 0);
  const T = 2.1;
  if (kind === 'trees') for (let i = 0; i < rad * .9; i++) {
    const a = r() * 6.28, d = r() * rad * .7;
    tree(g, Math.cos(a) * d, Math.sin(a) * d, T, .7 + r() * .5, r);
  }
  if (kind === 'turbines') for (let i = 0; i < 2; i++) {
    const tx = -2.5 + i * 5;
    add(g, G.cyl, '#ffffff', tx, T, 0, .45, 13, .45);
    const hub = group(g, tx, T + 13, .5);
    for (let b = 0; b < 3; b++) add(hub, G.box, '#ffffff', 0, 0, 0, .5, 6, .15).rotation.z = b * Math.PI * 2 / 3;
    spinners.push(hub);
  }
  if (kind === 'lighthouse') {
    for (let i = 0; i < 5; i++) add(g, G.cyl, i % 2 ? '#ffffff' : '#e2602f', 0, T + i * 2, 0, 2.6 - i * .2, 2, 2.6 - i * .2);
    add(g, G.cyl, lampMat, 0, T + 10, 0, 1.7, 1.4, 1.7);
    add(g, G.cone, '#38424f', 0, T + 11.4, 0, 2.4, 1.4, 2.4);
  }
  if (kind === 'beach') for (let i = 0; i < 3; i++) {
    const ux = -4 + i * 4;
    add(g, G.cyl, '#6f655d', ux, T, 0, .12, 2.6, .12);
    add(g, G.cone, pick(['#e2602f', '#f2b33d', '#ffffff'], r), ux, T + 2.2, 0, 3.6, .9, 3.6);
  }
}
[[-150, -40, 10, 'trees'], [-105, -95, 8, 'turbines'], [150, -60, 10, 'trees'], [165, 20, 8, 'lighthouse'],
 [-170, 40, 9, 'trees'], [-130, 110, 10, 'beach'], [120, 110, 9, 'trees'], [40, -125, 7, 'turbines']].forEach(a => islet(...a));

const boats = [];
for (let i = 0; i < 9; i++) {
  const r = rng(500 + i);
  const b = group(scene);
  add(b, G.box, '#ffffff', 0, -.2, 0, 3.2, .9, 1.4);
  add(b, G.box, pick(['#c8102e', '#f2c200', '#3f7fbf'], r), 0, .7, 0, 3.25, .2, 1.45);
  if (r() < .5) { add(b, G.cyl, '#6f655d', .2, .7, 0, .1, 4, .1); add(b, new THREE.ConeGeometry(.9, 3.2, 3).translate(0, 1.6, 0), '#fbf6ee', .9, 1.2, 0, .9, 1, .2); }
  else add(b, G.box, '#fbf6ee', -.3, .7, 0, 1.4, 1, 1.1);
  boats.push({ b, a: 128 + r() * 14, c: 112 + r() * 10, ang: r() * 6.28, spd: (r() < .5 ? -1 : 1) * (.015 + r() * .02) });
}

export { water, landHeight, spinners, islet, boats };
