import * as THREE from 'three';
import { POS, TEAMS } from './data.js';
import { $, OTHER, reduceMotion } from './util.js';
import { sceneGame } from './games.js';
import { scene } from './core.js';
import { G, add } from './kit.js';
import { FIELD_POS, H, HOME_Z, at } from './ballpark.js';
import { dancers, players } from './figures.js';
import { pushLog } from './log.js';
import { Q } from './quality.js';
import { playTeam } from './audio.js';
import { weather } from './lighting.js';

// ================= game simulation =================
// A made-up at-bat simulation played with the real G4 starting lineups (not the real game).
const state = { hover: null, sel: null, play: true, cheer: true, paused: false, tab: 'wc', found: new Set() };
const TAU = Math.PI * 2;
const BASES = [at(12.7, -12.7), at(0, -25.4), at(-12.7, -12.7), at(0, 0)]; // 1B, 2B, 3B, home
const PLATE = at(-1.8, .4), MOUND = at(0, -12.1);
const sim = {
  fielding: sceneGame.home, inning: 1, bi: { wc: 0, ctbc: 0 }, balls: 0, strikes: 0, outs: 0,
  bases: [null, null, null], runs: { wc: 0, ctbc: 0 }, play: null, wait: 2, switchIn: 0, crowdCel: { wc: 0, ctbc: 0 },
};
const batting = () => OTHER[sim.fielding];
const lineupOf = team => players.filter(e => e.team === team && !e.sp);
const spOf = team => players.find(e => e.team === team && e.sp);
const fielderAt = pos => players.find(e => e.team === sim.fielding && e.role === 'field' && (pos === 'P' ? e.sp : e.pos === pos && !e.sp));
const currentBatter = () => players.find(e => e.role === 'bat');
const faceFrom = (p, x, z) => Math.atan2(x - p.x, z - p.z);
const lerpAngle = (a, b, k) => a + (((b - a) % TAU + TAU * 1.5) % TAU - Math.PI) * Math.min(1, k);
function homeSpot(e) { const [x, z] = FIELD_POS[e.sp ? 'P' : e.pos]; return at(x, z); }
function dugSpot(e) { return at(TEAMS[e.team].side * (14 + (e.sp ? 9 : e.order - 1) * 1.5), 6.6); }
function goTo(e, pts, speed = 10, face = e.face) {
  e.path = pts.map(p => p.clone());
  e.target.copy(e.path.shift());
  e.speed = speed;
  e.face = face;
}
function toDugout(e, speed = 7) { e.role = 'bench'; e.fig.bat.visible = false; goTo(e, [dugSpot(e)], speed, Math.PI); }
function backToPositions() {
  for (const e of players) if (e.team === sim.fielding && e.role === 'field') {
    const p = homeSpot(e);
    goTo(e, [p], 9, e.pos === 'C' && !e.sp ? Math.PI : faceFrom(p, 0, HOME_Z));
  }
}

function resetHalf() {
  const F = sim.fielding, B = batting();
  playTeam(B); // cheer song of the team now at bat
  for (const e of players) { e.fig.bat.visible = false; e.cel = 0; }
  for (const e of players.filter(e => e.team === F)) {
    if (e.pos === 'DH') { toDugout(e, 9); continue; }
    e.role = 'field';
  }
  backToPositions();
  for (const e of players.filter(e => e.team === B)) toDugout(e, 9);
  Object.assign(sim, { bases: [null, null, null], outs: 0, balls: 0, strikes: 0, play: null, wait: 2.5, switchIn: 0 });
  setBatter();
}
function setBatter() {
  const B = batting(), lu = lineupOf(B), s = TEAMS[B].side;
  const b = lu[sim.bi[B]];
  b.role = 'bat'; b.fig.bat.visible = true;
  goTo(b, [PLATE], 7, Math.PI / 2);
  const d = lu[(sim.bi[B] + 1) % 9];
  if (d.role === 'bench') { d.role = 'deck'; goTo(d, [at(s * 8, 3)], 6, Math.PI); }
  sim.balls = sim.strikes = 0;
  updateHalf();
}
function updateHalf() {
  const B = batting(), b = lineupOf(B)[sim.bi[B]];
  const dots = (n, max) => '●'.repeat(Math.min(n, max)) + '○'.repeat(Math.max(0, max - n));
  const base = i => sim.bases[i] ? '◆' : '◇';
  $('#half').innerHTML = `<b>${B === sceneGame.away ? 'TOP' : 'BOT'} ${sim.inning}</b>${TEAMS[B].short}進攻・打者 ${b.name}`
    + `<span class="bso">B ${dots(sim.balls, 3)} S ${dots(sim.strikes, 2)} O ${dots(sim.outs, 2)}</span>`
    + `<span title="三壘 二壘 一壘">${base(2)}${base(1)}${base(0)}</span>`
    + `<small>模擬 ${TEAMS.wc.short} ${sim.runs.wc} : ${sim.runs.ctbc} ${TEAMS.ctbc.short}</small>`;
}

function scoreRun(e) {
  sim.runs[e.team]++;
  pushLog('得分', `${TEAMS[e.team].short} ${e.name} 跑回本壘`);
  celebrate(e.team, 2.5);
}
// everyone moves n bases; n = 4 is a home run
function advance(n, batter) {
  const nb = [null, null, null];
  for (let b = 2; b >= 0; b--) {
    const r = sim.bases[b];
    if (!r) continue;
    const to = b + n, pts = [];
    for (let k = b + 1; k <= Math.min(to, 3); k++) pts.push(BASES[k]);
    if (to >= 3) { pts.push(dugSpot(r)); r.role = 'bench'; scoreRun(r); goTo(r, pts, n >= 4 ? 7 : 10, Math.PI); }
    else { nb[to] = r; goTo(r, pts, 10, faceFrom(BASES[to], 0, HOME_Z)); }
  }
  batter.fig.bat.visible = false;
  const pts = [];
  for (let k = 0; k < Math.min(n, 4); k++) pts.push(BASES[k]);
  if (n >= 4) { pts.push(dugSpot(batter)); batter.role = 'bench'; scoreRun(batter); goTo(batter, pts, 7, Math.PI); }
  else { nb[n - 1] = batter; batter.role = 'run'; goTo(batter, pts, 10, faceFrom(BASES[n - 1], 0, HOME_Z)); }
  sim.bases = nb;
}
// walk: only forced runners move
function walk(batter) {
  const push = b => {
    const r = sim.bases[b];
    if (!r) return;
    if (b === 2) { r.role = 'bench'; scoreRun(r); goTo(r, [BASES[3], dugSpot(r)], 8, Math.PI); }
    else { push(b + 1); sim.bases[b + 1] = r; goTo(r, [BASES[b + 1]], 8); }
    sim.bases[b] = null;
  };
  push(0);
  batter.fig.bat.visible = false; batter.role = 'run';
  goTo(batter, [BASES[0]], 6);
  sim.bases[0] = batter;
}
function recordOut(e, how) {
  sim.outs++;
  pushLog('出局', `${e.name} ${how}（${sim.outs} 出局）`);
  toDugout(e);
}
function endPA() {
  const B = batting();
  sim.bi[B] = (sim.bi[B] + 1) % 9;
  sim.balls = sim.strikes = 0;
  if (sim.outs >= 3) sim.switchIn = 2.2;
  else setBatter();
  updateHalf();
}
function switchHalf(why = '三出局') {
  pushLog('攻守交換', `${why}，換${TEAMS[sim.fielding].short}進攻`);
  if (batting() === sceneGame.home) sim.inning++;
  sim.fielding = OTHER[sim.fielding];
  resetHalf();
}
function celebrate(team, dur) {
  for (const e of players) if (e.team === team && e.role === 'bench') e.cel = dur;
  for (const e of dancers) if (e.team === team) e.cel = dur;
  sim.crowdCel[team] = dur;
}

// ---------- ball, fireworks, rain ----------
const ball = add(scene, G.head, '#ffffff', 0, -10, 0, .6, .6, .6);
ball.visible = false;
const arc = (a, b, h, s) => tmpArc.lerpVectors(a, b, s).setY(a.y + (b.y - a.y) * s + 4 * h * s * (1 - s));
const tmpArc = new THREE.Vector3();
const handOf = e => e.fig.g.position.clone().setY(H + 3.8);

const fireworks = [], fwQueue = [];
function firework(pos, color) {
  const n = 110, arr = new Float32Array(n * 3), vel = [];
  for (let i = 0; i < n; i++) {
    arr.set([pos.x, pos.y, pos.z], i * 3);
    const v = new THREE.Vector3().randomDirection().multiplyScalar(9 + Math.random() * 6);
    vel.push(v);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const m = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: 1.6, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(m);
  fireworks.push({ m, vel, life: 0 });
}
function fireworkShow(team, count = 7) {
  if (reduceMotion) return;
  const cols = [TEAMS[team].color, '#ffffff', team === 'wc' ? '#ff6a6a' : '#ffe36b'];
  for (let i = 0; i < count; i++)
    fwQueue.push({ in: i * .35, pos: new THREE.Vector3((Math.random() - .5) * 110, 45 + Math.random() * 25, (Math.random() - .5) * 70 - 10), color: cols[i % 3] });
}
function updateFireworks(dt) {
  for (let i = fwQueue.length - 1; i >= 0; i--) {
    if ((fwQueue[i].in -= dt) <= 0) { firework(fwQueue[i].pos, fwQueue[i].color); fwQueue.splice(i, 1); }
  }
  for (let i = fireworks.length - 1; i >= 0; i--) {
    const f = fireworks[i], a = f.m.geometry.attributes.position;
    f.life += dt;
    f.vel.forEach((v, k) => { v.y -= 7 * dt; v.multiplyScalar(.985); a.setXYZ(k, a.getX(k) + v.x * dt, a.getY(k) + v.y * dt, a.getZ(k) + v.z * dt); });
    a.needsUpdate = true;
    f.m.material.opacity = Math.max(0, 1 - f.life / 2.2);
    if (f.life > 2.2) { scene.remove(f.m); f.m.geometry.dispose(); f.m.material.dispose(); fireworks.splice(i, 1); }
  }
}

const rain = (() => {
  const N = Q.rain, arr = new Float32Array(N * 6);
  for (let i = 0; i < N; i++) {
    const x = (Math.random() - .5) * 320, y = Math.random() * 130, z = (Math.random() - .5) * 320;
    arr.set([x, y, z, x + 1.2, y + 4, z + .4], i * 6);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: '#cfe0ff', transparent: true, opacity: .45 }));
  lines.visible = weather.rain;
  scene.add(lines);
  lines.userData.update = dt => {
    const a = geo.attributes.position.array;
    for (let i = 0; i < a.length; i += 6) {
      let dy = -95 * dt, dx = -28 * dt;
      if (a[i + 1] + dy < 0) { dy += 130; dx += (Math.random() - .5) * 40; }
      a[i] += dx; a[i + 3] += dx; a[i + 1] += dy; a[i + 4] += dy;
      if (a[i] < -160) { a[i] += 320; a[i + 3] += 320; }
    }
    geo.attributes.position.needsUpdate = true;
  };
  return lines;
})();

let toastTimer = 0;
function toast(html, ms = 2200) {
  const el = $('#toast');
  el.innerHTML = html;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

// ---------- one pitch ----------
const T_PITCH = .9, T_PLATE = 1.3;
function startPlay() {
  const r = Math.random();
  const kind = r < .3 ? 'ball' : r < .52 ? 'strike' : r < .64 ? 'foul' : r < .955 ? 'inplay' : 'hr';
  const p = { kind, t: 0, swing: kind !== 'ball' && (kind !== 'strike' || Math.random() < .5) };
  if (kind === 'inplay') {
    const k = Math.random(), type = k < .45 ? 'grounder' : k < .8 ? 'fly' : 'liner';
    const a = (Math.random() - .5) * 1.4;
    const d = type === 'grounder' ? 13 + Math.random() * 14 : type === 'fly' ? 32 + Math.random() * 20 : 22 + Math.random() * 20;
    Object.assign(p, {
      type, hit: Math.random() < { grounder: .28, fly: .22, liner: .7 }[type],
      land: at(Math.sin(a) * d, -Math.cos(a) * d).setY(H + .5),
      h: type === 'fly' ? 14 + Math.random() * 10 : type === 'liner' ? 3 : .4,
      flight: type === 'fly' ? 2.3 : type === 'liner' ? .9 : .6 + d / 40,
    });
    if (p.hit) p.nb = type === 'grounder' ? 1 : Math.random() < .7 ? 1 : Math.random() < .85 ? 2 : 3;
    p.fielder = players.filter(e => e.team === sim.fielding && e.role === 'field' && e.pos !== 'C')
      .sort((x, y) => homeSpot(x).distanceTo(p.land) - homeSpot(y).distanceTo(p.land))[0];
  }
  if (kind === 'hr') { const a = (Math.random() - .5) * 1.3; p.land = new THREE.Vector3(Math.sin(a) * 72, H + 9, -Math.cos(a) * 72); p.flight = 2.6; p.h = 30; }
  if (kind === 'foul') { p.land = new THREE.Vector3((Math.random() < .5 ? -1 : 1) * (8 + Math.random() * 30), H + 8, 66); p.flight = 1.4; p.h = 16; }
  return p;
}
// stop the current pitch cleanly; if the ball was already in play, settle that at-bat first
function abortPlay() {
  const p = sim.play;
  sim.play = null;
  sim.wait = 1;
  ball.visible = false;
  spOf(sim.fielding).fig.arms[1].rotation.x = 0;
  backToPositions();
  if (!p || p.t < T_PLATE || ['ball', 'strike', 'foul'].includes(p.kind)) return;
  if (p.kind === 'inplay' && !p.hit && !p.outDone) recordOut(p.runner, '出局');
  endPA();
}
function stepPlay(dt) {
  if (sim.switchIn > 0) { if ((sim.switchIn -= dt) <= 0) switchHalf(); return; }
  const batter = currentBatter(), pitcher = spOf(sim.fielding), catcher = fielderAt('C');
  if (!sim.play) {
    if (!batter) { setBatter(); return; } // safety net: never sit waiting for a batter who isn't there
    sim.wait -= dt;
    const ready = batter && batter.fig.g.position.distanceTo(PLATE) < .4 && pitcher.fig.g.position.distanceTo(MOUND) < .5;
    if (sim.wait <= 0 && ready) sim.play = startPlay();
    ball.visible = false;
    if (batter) batter.fig.bat.rotation.y = Math.sin(performance.now() / 300) * .2;
    return;
  }
  const p = sim.play, prev = p.t;
  p.t += dt;
  const t = p.t, crossed = x => prev < x && t >= x;

  // pitcher windup + delivery, batter swing
  pitcher.fig.arms[1].rotation.x = t < T_PITCH ? -t / T_PITCH * 2.8 : t < T_PITCH + .3 ? -2.8 + (t - T_PITCH) / .3 * 4 : t < 2 ? 1.2 : 0;
  pitcher.fig.body.rotation.x = t > T_PITCH && t < T_PITCH + .6 ? .35 : 0;
  if (batter && batter.fig.bat.visible) {
    batter.fig.bat.rotation.y = p.swing && t > 1.15 && t < 1.45 ? -(t - 1.15) / .3 * 3.4 : p.swing && t >= 1.45 && t < 2.2 ? -3.4 : Math.sin(t * 3) * .2;
  }
  const mitt = catcher.fig.g.position.clone().setY(H + 2).add(new THREE.Vector3(0, 0, -1));
  if (t < T_PITCH) { ball.visible = false; return; }
  ball.visible = true;
  if (t < T_PLATE) { ball.position.copy(arc(handOf(pitcher), PLATE.clone().setY(H + 2.4), .3, (t - T_PITCH) / (T_PLATE - T_PITCH))); return; }

  if (p.kind === 'ball' || p.kind === 'strike') {
    if (t < 2) ball.position.copy(mitt);
    else if (t < 2.6) ball.position.copy(arc(mitt, handOf(pitcher), 2, (t - 2) / .6));
    if (t >= 2.8) {
      sim.play = null; sim.wait = .6;
      if (p.kind === 'ball' && ++sim.balls >= 4) { pushLog('保送', `${batter.name} 四壞球保送`); walk(batter); endPA(); }
      else if (p.kind === 'strike' && ++sim.strikes >= 3) { recordOut(batter, p.swing ? '揮棒落空三振' : '站著不動三振'); endPA(); }
      updateHalf();
    }
    return;
  }
  if (p.kind === 'foul') {
    ball.position.copy(arc(PLATE.clone().setY(H + 2.4), p.land, p.h, Math.min(1, (t - T_PLATE) / p.flight)));
    if (t >= T_PLATE + p.flight + .4) { sim.play = null; sim.wait = .8; if (sim.strikes < 2) sim.strikes++; updateHalf(); }
    return;
  }
  if (p.kind === 'hr') {
    if (crossed(T_PLATE)) {
      pushLog('全壘打', `${TEAMS[batter.team].short} ${batter.name} 轟出全壘打！`);
      toast(`全壘打！<small>${TEAMS[batter.team].name} ${batter.name}</small>`);
      advance(4, batter);
      fireworkShow(batter.team);
      p.team = batter.team;
    }
    ball.position.copy(arc(PLATE.clone().setY(H + 2.4), p.land, p.h, Math.min(1, (t - T_PLATE) / p.flight)));
    if (t > T_PLATE + p.flight) ball.visible = false;
    if (t >= T_PLATE + 7) { sim.play = null; sim.wait = 1; endPA(); }
    return;
  }

  // ball in play
  const tLand = T_PLATE + p.flight, f = p.fielder;
  if (crossed(T_PLATE)) {
    p.runner = batter;
    goTo(f, [p.land], 13);
    if (p.hit) {
      advance(p.nb, batter);
      const word = ['', '一壘安打', '二壘安打', '三壘安打'][p.nb];
      pushLog('安打', `${TEAMS[batter.team].short} ${batter.name} ${word}`);
      if (p.nb >= 2) toast(`${word}！<small>${batter.name}</small>`, 1600);
      celebrate(batter.team, 1.2);
    } else {
      batter.fig.bat.visible = false; batter.role = 'run';
      goTo(batter, [BASES[0]], 10);
    }
  }
  if (t < tLand) { ball.position.copy(arc(PLATE.clone().setY(H + 2.4), p.land, p.h, (t - T_PLATE) / p.flight)); return; }

  // fielder picks the ball up (or catches it), then throws
  if (!p.held) {
    if (f.fig.g.position.distanceTo(p.land) < 2.5 || t > tLand + 3) {
      p.held = t;
      if (!p.hit && p.type !== 'grounder') { recordOut(p.runner, p.type === 'fly' ? `${POS[f.pos === 'P' && f.sp ? 'P' : f.pos]}接殺` : '平飛球被接殺'); p.outDone = true; }
    } else { ball.position.copy(p.land); return; }
  }
  if (!p.throwTo) {
    p.throwTo = !p.hit && p.type === 'grounder' ? fielderAt('1B') : fielderAt(f.pos === '2B' ? 'SS' : '2B') || pitcher;
    if (p.throwTo === f) p.throwTo = pitcher;
  }
  const tThrow = p.held + .45;
  if (t < tThrow) { ball.position.copy(handOf(f)); f.fig.arms[1].rotation.x = -2.4; return; }
  f.fig.arms[1].rotation.x = 0;
  const s = Math.min(1, (t - tThrow) / .6);
  ball.position.copy(arc(handOf(f), handOf(p.throwTo), 3, s));
  if (s >= 1 && !p.outDone && !p.hit) { recordOut(p.runner, `${POS[f.pos]}滾地球，刺殺於一壘`); p.outDone = true; }
  if (t >= tThrow + 1.3) { sim.play = null; sim.wait = 1; backToPositions(); endPA(); }
}

resetHalf();
for (const e of players) { e.fig.g.position.copy(e.target); e.fig.g.rotation.y = e.face; e.path = []; }

export { state, TAU, BASES, PLATE, MOUND, sim, batting, lineupOf, spOf, fielderAt, currentBatter, faceFrom, lerpAngle, homeSpot, dugSpot, goTo, toDugout, backToPositions, resetHalf, setBatter, updateHalf, scoreRun, advance, walk, recordOut, endPA, switchHalf, celebrate, ball, arc, tmpArc, handOf, fireworks, fwQueue, firework, fireworkShow, updateFireworks, rain, toastTimer, toast, T_PITCH, T_PLATE, startPlay, stepPlay, abortPlay };
