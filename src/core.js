import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { $ } from './util.js';
import { Q } from './quality.js';

// ================= renderer / scene =================
const stage = $('#stage');
const renderer = new THREE.WebGLRenderer({ antialias: Q.antialias });
renderer.setPixelRatio(Math.min(devicePixelRatio, Q.dpr));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
stage.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog('#bfe3ee', 380, 900);
const camera = new THREE.PerspectiveCamera(30, 1, 1, 2500);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = .08;
controls.minDistance = 20;
controls.maxDistance = 480;
controls.maxPolarAngle = 1.3;
controls.screenSpacePanning = false;

const HOME = { pos: new THREE.Vector3(0, 165, 228), target: new THREE.Vector3(0, 0, 4) };
const BIRD = { pos: new THREE.Vector3(0, 340, 1), target: new THREE.Vector3(0, 0, 0) };
camera.position.copy(HOME.pos);
controls.target.copy(HOME.target);

const hemi = new THREE.HemisphereLight('#ffffff', '#6d8a6a', 1.2);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff6e6', 3);
sun.castShadow = true;
sun.shadow.mapSize.set(Q.shadow, Q.shadow);
Object.assign(sun.shadow.camera, { left: -110, right: 110, top: 110, bottom: -110, near: 10, far: 600 });
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.3;
scene.add(sun, sun.target);

// GPU reset (driver crash, too many tabs): tell the viewer instead of showing a frozen canvas
renderer.domElement.addEventListener('webglcontextlost', ev => {
  ev.preventDefault();
  const el = $('#loading');
  el.classList.remove('done');
  el.innerHTML = '<div class="fail"><b>3D 畫面暫停了</b><p>顯示卡資源被系統收回（可能開了太多分頁）。重新整理就能恢復。</p><button onclick="location.reload()">重新整理</button></div>';
});

function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // portrait phones: widen the view so the whole ballpark still fits across the screen
  camera.fov = camera.aspect < 1 ? Math.min(58, 30 / Math.max(camera.aspect, .5) ** .9) : 30;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage);

export { stage, renderer, scene, camera, controls, HOME, BIRD, hemi, sun, resize };
