import './styles.css';
import * as THREE from 'three';
import { $, reduceMotion } from './util.js';
import { camera, controls, renderer, resize, scene } from './core.js';
import { crowd } from './ballpark.js';
import { boats, spinners } from './world.js';
import { dancers, players } from './figures.js';
import { applyLight } from './lighting.js';
import { lerpAngle, rain, sim, state, stepPlay, updateFireworks } from './simulation.js';
import { ease, marker, renderList, route, setMode, tickFacts, toggleList, tween, updateLabels } from './ui.js';

// ================= loop =================
const tmp = new THREE.Vector3();
const clock = new THREE.Clock();
let t = 0, frame = 0;
// per-frame pose for a player: walking/running, ready crouch, catcher squat, celebration
function posePlayer(e, moving, dt) {
  const f = e.fig, k = t * 12 + e.ph, p = sim.play;
  f.body.position.y = 0; f.body.rotation.x = 0;
  f.arms.forEach(a => { a.rotation.z = 0; a.rotation.x = 0; });
  if (moving) {
    const fast = (e.speed ?? 10) > 8;
    f.body.position.y = Math.abs(Math.sin(k)) * (fast ? .45 : .25);
    f.body.rotation.x = fast ? .22 : .06;
    f.arms[0].rotation.x = Math.sin(k) * (fast ? 1.3 : .6);
    f.arms[1].rotation.x = -Math.sin(k) * (fast ? 1.3 : .6);
  } else if (e.cel > 0) {
    f.body.position.y = Math.abs(Math.sin(t * 9 + e.ph)) * 1.1;
    f.arms[0].rotation.z = -2.6 + Math.sin(t * 9) * .3;
    f.arms[1].rotation.z = 2.6 - Math.sin(t * 9) * .3;
  } else if (e.role === 'field' && !e.sp) {
    if (e.pos === 'C') { f.body.position.y = -.65; f.body.rotation.x = .25; f.arms[0].rotation.x = -1.3; }
    else {
      const ready = p && p.t > .5 && p.t < 1.7;
      f.body.rotation.x = ready ? .42 : .1 + Math.sin(t * 1.5 + e.ph) * .04;
      f.body.position.y = ready ? -.2 : 0;
      f.arms[0].rotation.x = ready ? -.7 : 0;
    }
  } else if (e.role === 'bench') {
    f.arms[0].rotation.x = Math.sin(t * .7 + e.ph) * .15;
  } else if (e.role === 'deck') {
    f.arms[1].rotation.x = -1.6 + Math.sin(t * 4 + e.ph) * .9; // practice swings
  } else if (e.role === 'run') {
    f.body.rotation.x = .3; f.arms[0].rotation.z = -.4; f.arms[1].rotation.z = .4; // lead-off crouch
  }
  if (e.cel > 0) e.cel -= dt;
}
function tick() {
  const dt = Math.min(clock.getDelta(), .05);
  const run = !state.paused;
  if (run) t += dt;

  applyLight(1 - Math.exp(-dt * 2.5));

  // players follow their paths (base running, chasing the ball, walking to the dugout)
  if (run) for (const e of players) {
    const g = e.fig.g, d = tmp.subVectors(e.target, g.position);
    d.y = 0;
    let dist = d.length();
    if (dist < .08 && e.path?.length) { e.target.copy(e.path.shift()); d.subVectors(e.target, g.position); d.y = 0; dist = d.length(); }
    const moving = dist > .08;
    if (moving) {
      g.position.addScaledVector(d, Math.min(dist, (e.speed ?? 10) * dt) / dist);
      g.rotation.y = lerpAngle(g.rotation.y, Math.atan2(d.x, d.z), dt * 14);
    } else g.rotation.y = lerpAngle(g.rotation.y, e.face, dt * 6);
    posePlayer(e, moving, dt);
  }
  if (run && state.play) stepPlay(dt);

  // cheer squads (jump higher when their team scores) & crowd wave
  for (const e of dancers) {
    const f = e.fig, hype = e.cel > 0, k = t * (hype ? 9 : 5) + e.ph;
    if (run && (state.cheer || hype)) {
      f.body.position.y = Math.abs(Math.sin(k)) * (hype ? 1.3 : .5);
      f.arms[0].rotation.z = hype ? -2.7 : -1.2 - Math.sin(k) * 1.4;
      f.arms[1].rotation.z = hype ? 2.7 : 1.2 + Math.sin(k + 1.6) * 1.4;
      f.g.rotation.y = hype ? f.g.rotation.y + dt * 6 : Math.sin(t * .8 + e.ph) * .4;
      if (hype) e.cel -= dt;
    } else if (!state.cheer) { f.body.position.y = 0; f.arms[0].rotation.z = f.arms[1].rotation.z = 0; }
  }
  if (run) {
    const { mesh, seats, m4 } = crowd;
    const wave = (t * 1.3) % (Math.PI * 2);
    for (const k of ['wc', 'ctbc']) sim.crowdCel[k] = Math.max(0, sim.crowdCel[k] - dt);
    frame++;
    for (let i = frame & 1; i < seats.length; i += 2) { // half the crowd per frame — invisible at 60fps, half the cost
      const s = seats[i];
      let dy = 0;
      if (state.cheer) {
        const dphi = Math.abs(((s.phi - wave) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
        dy = Math.max(0, 1 - dphi * 4) * 1.4 + Math.abs(Math.sin(t * 6 + s.phi * 40)) * .12;
      }
      if (sim.crowdCel[s.x > 0 ? 'wc' : 'ctbc'] > 0) dy += Math.abs(Math.sin(t * 9 + s.phi * 30)) * 1.3;
      m4.makeTranslation(s.x, s.y + dy, s.z);
      mesh.setMatrixAt(i, m4);
    }
    mesh.instanceMatrix.needsUpdate = true;
    updateFireworks(dt);
    if (rain.visible) rain.userData.update(dt);

    spinners.forEach(s => { s.rotation.z += dt * 1.4; });
    boats.forEach(o => {
      o.ang += o.spd * dt;
      o.b.position.set(Math.cos(o.ang) * o.a, Math.sin(t * 1.6 + o.a) * .15, Math.sin(o.ang) * o.c);
      o.b.rotation.y = -o.ang + (o.spd > 0 ? 0 : Math.PI);
    });
    tickFacts(t);
  }

  if (state.sel?.fig) {
    state.sel.fig.g.getWorldPosition(marker.position);
    marker.position.y += .2;
    marker.scale.setScalar(1 + Math.sin(performance.now() / 250) * .12);
    marker.visible = true;
  } else marker.visible = false;

  if (tween.active) {
    tween.t += dt / tween.dur;
    const k = ease(Math.min(1, tween.t));
    camera.position.lerpVectors(tween.p0, tween.p1, k);
    controls.target.lerpVectors(tween.t0, tween.t1, k);
    if (tween.t >= 1) tween.active = false;
  }
  controls.update();
  renderer.render(scene, camera);
  updateLabels();
  requestAnimationFrame(tick);
}
renderList();
resize();
tick();
// deep link, e.g. #c:wc:李多慧 · #p:ctbc:曾頌恩 · #G5
const deep = decodeURIComponent(location.hash.slice(1));
if (matchMedia('(max-width: 900px)').matches) { toggleList(false); setMode('log', false); }
if (deep) route(deep);
if (reduceMotion) { setMode('cheer', false); setMode('play', false); }
window.__booted = true; // tells the fallback watchdog in index.html that the app started
requestAnimationFrame(() => $('#loading').classList.add('done'));

