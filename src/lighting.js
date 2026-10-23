import * as THREE from 'three';
import { hemi, scene, sun } from './core.js';
import { lampMat, windowMat } from './kit.js';
import { board } from './ballpark.js';
import { water } from './world.js';

// ================= lighting presets =================
const PRESETS = {
  dawn:  { sky: '#f4cdb0', sun: '#ffd2a1', si: 2.2, dir: [-1, .45, .6], hs: '#ffe2c8', hg: '#7a8a6a', hi: 1.1, water: '#58a3b4', win: .4, lamp: .8 },
  day:   { sky: '#bfe3ee', sun: '#fff6e6', si: 3.0, dir: [.55, 1, .45], hs: '#ffffff', hg: '#6d8a6a', hi: 1.25, water: '#45a5b8', win: 0, lamp: .2 },
  dusk:  { sky: '#f3a57f', sun: '#ff9a62', si: 2.1, dir: [1, .35, -.15], hs: '#ffc39a', hg: '#6e6a7a', hi: 1.0, water: '#4f8aa6', win: .8, lamp: 1.6 },
  night: { sky: '#1b2740', sun: '#c9d6ff', si: 1.5, dir: [-.2, 1, .35], hs: '#6d7bab', hg: '#2a3048', hi: .9, water: '#1d4660', win: 1.8, lamp: 3 },
};
const L = { sky: new THREE.Color(), sun: new THREE.Color(), hs: new THREE.Color(), hg: new THREE.Color(), water: new THREE.Color(), dir: new THREE.Vector3(), si: 3, hi: 1.2, win: 0, lamp: 0 };
let preset = PRESETS.night;
const setPreset = p => { preset = p; };
const weather = { rain: true }; // the typhoon that postponed G5: the page opens in the rain
function applyLight(k) {
  const P = preset, wet = weather.rain;
  for (const c of ['sky', 'sun', 'hs', 'hg', 'water']) {
    const target = new THREE.Color(P[c]);
    if (wet && c !== 'hg') target.lerp(new THREE.Color(c === 'water' ? '#2e4a57' : '#5b6670'), .65);
    L[c].lerp(target, k);
  }
  L.dir.lerp(new THREE.Vector3(...P.dir).normalize(), k);
  for (const n of ['si', 'hi', 'win', 'lamp']) L[n] += ((n === 'si' && wet ? P[n] * .35 : P[n]) - L[n]) * k;
  scene.background = L.sky;
  scene.fog.color.copy(L.sky);
  sun.color.copy(L.sun); sun.intensity = L.si;
  sun.position.copy(L.dir).multiplyScalar(260);
  hemi.color.copy(L.hs); hemi.groundColor.copy(L.hg); hemi.intensity = L.hi;
  water.material.color.copy(L.water);
  windowMat.emissiveIntensity = L.win;
  lampMat.emissiveIntensity = L.lamp;
  board.material.emissiveIntensity = .4 + L.lamp * .2;
}
applyLight(1);

export { PRESETS, L, preset, setPreset, weather, applyLight };
