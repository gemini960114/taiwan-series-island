import * as THREE from 'three';
import { CHEER, TEAMS } from './data.js';
import { R0, pick, rng } from './util.js';
import { scene } from './core.js';
import { G, add, group } from './kit.js';
import { SKIN, STAGE } from './ballpark.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Q } from './quality.js';

// ================= figures =================
// player: jersey in team colour; cheerleader: skirt + pom-poms
function figure(team, kind, r = R0) {
  const T = TEAMS[team];
  const g = group(scene);
  const body = group(g);
  const arms = [];
  if (kind === 'player') {
    for (const s of [-1, 1]) add(body, G.box, '#f4f1ea', s * .28, 0, 0, .44, 1.15, .5);
    add(body, G.box, T.color, 0, 1.1, 0, 1.25, 1.3, .72);
    add(body, G.box, T.dark, 0, 1.1, 0, 1.27, .16, .74);
    add(body, G.head, SKIN, 0, 2.75, 0, .9, .9, .9);
    add(body, G.dome, team === 'wc' ? T.color : T.dark, 0, 2.85, 0, .48, .4, .48);
    add(body, G.box, team === 'wc' ? T.color : T.dark, 0, 2.86, .45, .7, .08, .5);
  } else {
    for (const s of [-1, 1]) add(body, G.box, SKIN, s * .2, 0, 0, .3, 1.1, .32);
    add(body, new THREE.ConeGeometry(.8, 1, 10).translate(0, .5, 0), T.color, 0, .95, 0, 1, .8, 1);
    add(body, G.box, team === 'wc' ? T.dark : T.color, 0, 1.75, 0, .9, 1.1, .55);
    add(body, G.box, '#ffffff', 0, 2.25, 0, .92, .22, .57);
    add(body, G.head, SKIN, 0, 3.15, 0, .85, .85, .85);
    const hair = pick(['#2b2522', '#5a3d2b', '#8b5a3c', '#c9a26b', '#1a1a1a'], r);
    add(body, G.head, hair, 0, 3.28, -.08, .92, .7, .92);
    add(body, G.box, hair, 0, 2.2, -.3, .8, 1.2, .25);
  }
  const shoulderY = kind === 'player' ? 2.25 : 2.75;
  for (const s of [-1, 1]) {
    const pivot = group(body, s * (kind === 'player' ? .75 : .58), shoulderY, 0);
    add(pivot, G.box, kind === 'player' ? T.color : SKIN, 0, -1.05, 0, .32, 1.05, .32);
    if (kind === 'cheer') add(pivot, G.ball, s > 0 ? T.color : '#ffffff', 0, -1.25, 0, .9, .9, .9);
    else if (s < 0) add(pivot, G.head, '#8a5a2b', 0, -1.15, .1, .45, .45, .3);
    arms.push(pivot);
  }
  g.scale.setScalar(kind === 'player' ? 1.7 : 1.45);
  let bat = null;
  if (kind === 'player') {
    bat = group(body, .2, 2, .5);
    add(bat, G.cyl, '#d8b27a', 0, 0, 0, .18, 2.4, .18).rotation.z = 1.9;
    bat.visible = false;
  }
  return { g, body, arms, bat };
}

const ents = [];
const entById = new Map();
function addEnt(e) { ents.push(e); entById.set(e.id, e); return e; }

for (const team of ['wc', 'ctbc']) {
  const T = TEAMS[team];
  T.lineup.forEach(([name, pos], i) => {
    const f = figure(team, 'player');
    addEnt({ id: `p:${team}:${name}`, kind: 'player', team, name, pos, order: i + 1, fig: f, target: new THREE.Vector3(), face: 0, ph: R0() * 9 });
  });
  const f = figure(team, 'player');
  addEnt({ id: `p:${team}:${T.sp}`, kind: 'player', team, name: T.sp, pos: 'P', order: null, sp: true, fig: f, target: new THREE.Vector3(), face: 0, ph: R0() * 9 });
}
// Low quality: bake a figure's ~13 parts into one vertex-coloured mesh (1 draw call instead of 13).
// It keeps bouncing as a whole; arm waving is dropped (arms become detached placeholders).
const bakedMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .88 });
function bake(f) {
  f.g.updateMatrixWorld(true);
  const toLocal = new THREE.Matrix4().copy(f.g.matrixWorld).invert();
  const parts = [];
  f.g.traverse(o => {
    if (!o.isMesh) return;
    const geo = o.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(toLocal, o.matrixWorld));
    const g2 = geo.index ? geo.toNonIndexed() : geo;
    for (const k of Object.keys(g2.attributes)) if (k !== 'position' && k !== 'normal') g2.deleteAttribute(k);
    const c = o.material.color, n = g2.attributes.position.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
    g2.setAttribute('color', new THREE.BufferAttribute(col, 3));
    parts.push(g2);
  });
  f.g.remove(f.body);
  const body = new THREE.Group();
  body.add(new THREE.Mesh(mergeGeometries(parts), bakedMat));
  f.g.add(body);
  f.body = body;
  f.arms = [new THREE.Group(), new THREE.Group()];
}

// every cheerleader gets a figure: featured members on the front row of the stage,
// the next six on the back row, everyone else in rows on the ground in front of the stage (台下)
for (const team of ['wc', 'ctbc']) {
  const stg = STAGE[team];
  const featured = CHEER[team].members.filter(m => m.feature);
  const rest = CHEER[team].members.filter(m => !m.feature);
  const place = [];
  featured.forEach((m, i) => place.push({ m, x: -5 + i * 2.5, y: 1.52, z: 1.5, spot: '應援台前排' }));
  rest.slice(0, 6).forEach((m, i) => place.push({ m, x: -5.5 + i * 2.2, y: 1.52, z: -1, spot: '應援台後排' }));
  rest.slice(6).forEach((m, i) => {
    const row = Math.floor(i / 8), col = i % 8;
    place.push({ m, x: -5.6 + col * 1.6 + (row % 2) * .8, y: 0, z: 4.4 + row * 1.7, spot: '應援台下', small: true });
  });
  place.forEach(({ m, x, y, z, spot, small }, i) => {
    const f = figure(team, 'cheer', rng(team.length * 100 + i));
    if (small) f.g.scale.setScalar(1.2);
    if (Q.tier === 'low' && !m.feature) bake(f);
    stg.add(f.g);
    f.g.position.set(x, y, z);
    addEnt({ id: `c:${team}:${m.name}`, kind: 'cheer', team, fig: f, ph: i * .7, member: m, spot, featured: !!m.feature });
  });
}

// one invisible box per person: cheap to raycast against instead of every body part
const HIT_GEO = new THREE.BoxGeometry(1.6, 3.8, 1.2).translate(0, 1.9, 0);
const HIT_MAT = new THREE.MeshBasicMaterial({ visible: false });
for (const e of ents) {
  const hit = new THREE.Mesh(HIT_GEO, HIT_MAT);
  hit.userData.ent = e;
  e.fig.g.add(hit);
  e.hit = hit;
  if (e.kind === 'cheer' && !e.featured) e.fig.g.traverse(o => { o.castShadow = false; });
}

const players = ents.filter(e => e.kind === 'player');
const dancers = ents.filter(e => e.kind === 'cheer' && e.fig);

export { figure, ents, entById, addEnt, players, dancers };
