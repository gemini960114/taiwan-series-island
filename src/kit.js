import * as THREE from 'three';
import { R0, pick } from './util.js';

// ================= materials & geometry kit =================
const matCache = new Map();
function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: .88, flatShading: true, ...opts }));
  return matCache.get(key);
}
const windowMat = new THREE.MeshStandardMaterial({ color: '#4a6273', emissive: '#ffcf7a', emissiveIntensity: 0, roughness: .4 });
const lampMat = new THREE.MeshStandardMaterial({ color: '#fff3d6', emissive: '#fff1c9', emissiveIntensity: 0 });

const G = {
  box: new THREE.BoxGeometry(1, 1, 1).translate(0, .5, 0),
  cyl: new THREE.CylinderGeometry(.5, .5, 1, 10).translate(0, .5, 0),
  cone: new THREE.ConeGeometry(.5, 1, 7).translate(0, .5, 0),
  roof: new THREE.ConeGeometry(.71, 1, 4).rotateY(Math.PI / 4).translate(0, .5, 0),
  ball: new THREE.IcosahedronGeometry(.5, 0),
  head: new THREE.SphereGeometry(.5, 10, 8),
  dome: new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
};

function add(parent, geo, color, x, y, z, sx = 1, sy = 1, sz = 1, ry = 0) {
  const m = new THREE.Mesh(geo, typeof color === 'string' ? mat(color) : color);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.rotation.y = ry;
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}
function group(parent, x = 0, y = 0, z = 0, ry = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = ry;
  parent.add(g);
  return g;
}
function flat(parent, geo, color, x, y, z) {
  const m = new THREE.Mesh(geo, typeof color === 'string' ? mat(color) : color);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y, z);
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

const GREENS = ['#6fa860', '#7fb66a', '#5e9a56', '#8cbf72', '#4f8a4f', '#9cc77a'];
function tree(p, x, z, y, s = 1, r = R0) {
  add(p, G.cyl, '#8a6248', x, y, z, .35 * s, 1.2 * s, .35 * s);
  const g = pick(GREENS, r);
  if (r() < .45) {
    add(p, G.cone, g, x, y + .9 * s, z, 2.3 * s, 2.6 * s, 2.3 * s);
    add(p, G.cone, g, x, y + 2.2 * s, z, 1.6 * s, 2 * s, 1.6 * s);
  } else {
    add(p, G.ball, g, x, y + 2.1 * s, z, 2.7 * s, 2.5 * s, 2.7 * s, r() * 3);
  }
}
function building(p, x, z, y, w, d, h, color, roof, ry = 0) {
  const g = group(p, x, y, z, ry);
  add(g, G.box, color, 0, 0, 0, w, h, d);
  const rows = Math.max(1, Math.floor(h / 1.5)), cols = Math.max(1, Math.floor(w / 1.4));
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++)
    add(g, G.box, windowMat, (j - (cols - 1) / 2) * (w / cols), .45 + i * (h - .5) / rows, d / 2 + .02, .55, .65, .06);
  if (roof) add(g, G.roof, roof, 0, h, 0, w + .5, 1.4, d + .5);
  return g;
}

export { matCache, mat, windowMat, lampMat, G, add, group, flat, GREENS, tree, building };
