import * as THREE from 'three';
import { CHEER, POS, SCENE_GAME, SCHEDULE, SITE, TEAMS } from './data.js';
import { $, OTHER, pad, reduceMotion } from './util.js';
import { gameById, played, runsOf, sceneGame, winnerOf } from './games.js';
import { BIRD, HOME, camera, controls, renderer, scene, stage } from './core.js';
import { STAGE, STAND_R, board } from './ballpark.js';
import { entById, ents, players } from './figures.js';
import { PRESETS, setPreset, weather } from './lighting.js';
import { pushLog } from './log.js';
import { abortPlay, fireworkShow, rain, state, switchHalf, toast } from './simulation.js';
import { Q, setQuality } from './quality.js';
import { hold, musicAvailable, setMusic } from './audio.js';

let shownGame = sceneGame; // the game on the scoreboard and score card

// ================= labels =================
const labelBox = $('#labels');
for (const e of ents.filter(e => e.fig)) {
  const el = document.createElement('button');
  el.className = 'tag' + (e.kind === 'cheer' ? ' cheer' : '');
  e.tag = el;
  el.onclick = () => select(e.id);
  el.onmouseenter = () => setHover(e);
  el.onmouseleave = () => setHover(null);
  labelBox.append(el);
  if (e.kind === 'cheer') {
    const m = e.member;
    el.innerHTML = `<img class="face" src="${m.thumb}" alt="" style="border-color:${TEAMS[e.team].color}">${m.no != null ? `<b>#${m.no}</b>` : ''}${m.name}${m.kr ? '<span class="kr">韓</span>' : ''}`;
  }
}
function tagText(e) {
  const pos = e.role === 'bat' ? `${e.order}棒` : e.role === 'deck' ? '次棒' : e.role === 'run' ? '跑者' : e.sp ? 'P' : e.pos;
  return `<i style="background:${TEAMS[e.team].color}"></i><b>${pos}</b>${e.name}`;
}
// project tags, then nudge overlapping ones upward so every name stays readable
const v3 = new THREE.Vector3();
function updateLabels() {
  const w = stage.clientWidth, h = stage.clientHeight;
  const shown = [];
  for (const e of ents) {
    if (!e.tag) continue;
    const show = e === state.sel || e === state.hover || state.found.has(e)
      || (e.kind === 'cheer' ? e.featured && !state.found.size : e.role !== 'bench');
    e.fig.g.getWorldPosition(v3);
    v3.y += 7;
    v3.project(camera);
    const vis = show && v3.z < 1 && Math.abs(v3.x) < 1.1 && Math.abs(v3.y) < 1.1;
    e.tag.style.display = vis ? '' : 'none';
    if (!vis) continue;
    if (e.kind === 'player') { const html = tagText(e); if (e.tag._h !== html) { e.tag.innerHTML = e.tag._h = html; e.tag._w = 0; } }
    if (!e.tag._w) { e.tag._w = e.tag.offsetWidth; e.tag._hgt = e.tag.offsetHeight; }
    shown.push({ e, x: (v3.x + 1) / 2 * w, y: (1 - v3.y) / 2 * h });
  }
  shown.sort((a, b) => b.y - a.y);
  const placed = [];
  for (const s of shown) {
    const tw = s.e.tag._w, th = s.e.tag._hgt;
    for (let guard = 0; guard < 12; guard++) {
      const hit = placed.find(p => Math.abs(p.x - s.x) < (p.w + tw) / 2 + 2 && Math.abs(p.y - s.y) < th + 2);
      if (!hit) break;
      s.y = hit.y - th - 3;
    }
    placed.push({ x: s.x, y: s.y, w: tw });
    const tf = `translate(${Math.round(s.x)}px, ${Math.round(s.y)}px) translate(-50%, -100%)`;
    if (s.e.tag._tf !== tf) s.e.tag.style.transform = s.e.tag._tf = tf; // skip DOM writes when nothing moved
  }
}

// ================= interaction =================
const tween = { active: false };
function flyTo(pos, target, dur = 1.3) {
  if (reduceMotion) dur = .001;
  Object.assign(tween, { active: true, t: 0, dur, p0: camera.position.clone(), t0: controls.target.clone(), p1: pos.clone(), t1: target.clone() });
}
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const marker = new THREE.Mesh(new THREE.TorusGeometry(1.6, .14, 6, 32), new THREE.MeshBasicMaterial({ color: '#e2602f' }));
marker.rotation.x = Math.PI / 2;
marker.visible = false;
scene.add(marker);

function setHover(e) {
  state.hover = e;
  renderer.domElement.style.cursor = e ? 'pointer' : '';
  for (const x of ents) x.tag?.classList.toggle('hot', x === e || x === state.sel);
  document.querySelectorAll('#list li[data-id]').forEach(li => li.classList.toggle('hot', !!e && li.dataset.id === e.id));
}

const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
const hitBoxes = ents.map(e => e.hit);
function entAt(ev) {
  const rect = renderer.domElement.getBoundingClientRect();
  ndc.set((ev.clientX - rect.left) / rect.width * 2 - 1, -(ev.clientY - rect.top) / rect.height * 2 + 1);
  ray.setFromCamera(ndc, camera);
  return ray.intersectObjects(hitBoxes, false)[0]?.object.userData.ent ?? null;
}
let down = null, moveEv = null;
// hover picking at most once per frame
renderer.domElement.addEventListener('pointermove', ev => {
  if (down) return;
  if (!moveEv) requestAnimationFrame(() => { const e = entAt(moveEv); moveEv = null; if (e !== state.hover) setHover(e); });
  moveEv = ev;
});
renderer.domElement.addEventListener('pointerdown', ev => { down = { x: ev.clientX, y: ev.clientY }; tween.active = false; });
renderer.domElement.addEventListener('pointerup', ev => {
  if (down && Math.hypot(ev.clientX - down.x, ev.clientY - down.y) < 5) { const e = entAt(ev); if (e) select(e.id); }
  down = null;
});

// the URL hash mirrors what is open (#c:wc:李多慧, #p:ctbc:曾頌恩, #G5), so views can be shared and Back works
let routing = false;
function setHash(h) {
  if (routing || decodeURIComponent(location.hash.slice(1)) === h) return;
  history.pushState(null, '', h ? '#' + h : location.pathname + location.search);
}
function route(h) {
  routing = true;
  if (entById.has(h)) select(h);
  else if (gameById[h.toUpperCase()]) selectGame(h.toUpperCase());
  else goHome();
  routing = false;
}
window.addEventListener('popstate', () => route(decodeURIComponent(location.hash.slice(1))));

function select(id) {
  const e = entById.get(id);
  setHash(id);
  state.sel = e;
  setBird(false);
  const p = new THREE.Vector3();
  (e.fig ? e.fig.g : STAGE[e.team]).getWorldPosition(p);
  flyTo(p.clone().add(new THREE.Vector3(0, e.fig ? 20 : 26, e.fig ? 30 : 40)), p);
  renderDetail(e);
  if (document.body.classList.contains('list-off')) toggleList(true);
  setHover(state.hover);
}
function deselect() {
  state.sel = null;
  $('#detail').hidden = true; $('#index').hidden = false;
  renderList();
  setHover(null);
}
function goHome() { setHash(''); deselect(); setBird(false); flyTo(HOME.pos, HOME.target); }
function setBird(on) {
  const btn = document.querySelector('[data-mode=bird]');
  btn.classList.toggle('on', on);
  btn.setAttribute('aria-pressed', on);
  if (on) flyTo(BIRD.pos, BIRD.target);
}

// ================= sidebar =================
$('#brandBig').innerHTML = SITE.brand.big.join('<br>');
$('#brandSub').innerHTML = `${SITE.brand.sub[0]} <span>${SITE.brand.sub[1]}</span>`;
$('#eyebrow').textContent = SITE.eyebrow;
$('#headline').textContent = SITE.headline;
$('#introLine').textContent = SITE.intro;

function lineScore(g) {
  const cols = g.line.wc.length;
  const row = t => `<tr class="${winnerOf(g) === t ? 'w' : ''}"><td>${TEAMS[t].short}</td>${g.line[t].map((v, i) =>
    `<td class="${v ? 'run' : ''}">${v == null ? 'X' : v}${g.walkoff && t === g.home && i === cols - 1 ? 'x' : ''}</td>`).join('')}${g.rhe[t].map((v, i) => `<td class="${i ? '' : 'r sep'}">${v}</td>`).join('')}</tr>`;
  const extra = [g.sv && `救援 ${g.sv}`, g.hr && `全壘打 ${g.hr}`].filter(Boolean).join('・');
  return `<div class="cap"><span><b>台灣大賽 ${g.g}</b>・${g.date}（${g.wd}）・${g.venue}</span><span>${g.crowd} 人</span></div>
    <table><tr><th></th>${g.line.wc.map((_, i) => `<th>${i + 1}</th>`).join('')}<th class="sep">R</th><th>H</th><th>E</th></tr>
    ${row(g.away)}${row(g.home)}</table>
    <p>勝投 ${g.wp}・敗投 ${g.lp}${extra ? '・' + extra : ''}${g.note ? '<br>' + g.note : ''}</p>`;
}
function showGame(g) {
  shownGame = g;
  $('#score').innerHTML = lineScore(g);
  board.userData.draw(g);
}
showGame(sceneGame);

// series standing & countdown
const seriesWins = () => {
  const w = { wc: 0, ctbc: 0 };
  SCHEDULE.filter(played).forEach(g => w[winnerOf(g)]++);
  return w;
};
const nextGame = () => SCHEDULE.find(g => !played(g));
function fmtCountdown(ms) {
  if (ms <= 0) return '已開打';
  const s = Math.floor(ms / 1000), d = Math.floor(s / 86400);
  return `${d ? d + ' 天 ' : ''}${pad(Math.floor(s / 3600) % 24)}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
}
setInterval(() => document.querySelectorAll('.countdown[data-start]').forEach(el => {
  el.textContent = fmtCountdown(new Date(el.dataset.start) - Date.now());
}), 1000);
function trackerHtml() {
  const w = seriesWins(), ng = nextGame();
  const pips = t => Array.from({ length: 4 }, (_, i) => `<i style="${i < w[t] ? `background:${TEAMS[t].color};border-color:${TEAMS[t].color}` : ''}"></i>`).join('');
  const lead = w.wc === w.ctbc ? null : w.wc > w.ctbc ? 'wc' : 'ctbc';
  const champ = w.wc >= 4 ? 'wc' : w.ctbc >= 4 ? 'ctbc' : null;
  const msg = champ ? `${TEAMS[champ].name}奪下總冠軍！`
    : lead ? `${TEAMS[lead].name} ${w[lead]} 勝 ${w[OTHER[lead]]} 敗領先，${4 - w[lead] === 1 ? '再贏 1 場就封王' : `還差 ${4 - w[lead]} 勝`}。`
    : `系列戰 ${w.wc}:${w.ctbc} 平手。`;
  return `<div class="tracker">
    <div class="row"><span>${TEAMS.wc.name}</span><span class="pips">${pips('wc')}</span><span>${w.wc}</span></div>
    <div class="row"><span>${TEAMS.ctbc.name}</span><span class="pips">${pips('ctbc')}</span><span>${w.ctbc}</span></div>
    <p>七戰四勝制・${msg}</p>
    ${ng && !champ ? `<p>距離 <b>${ng.g}</b>（${ng.date} ${ng.time ?? ''}）開打</p><div class="countdown" data-start="${ng.start}">${fmtCountdown(new Date(ng.start) - Date.now())}</div>` : ''}
  </div>`;
}

const posOrderLabel = e => e.sp ? 'SP' : pad(e.order);
const dotHead = (t, text) => `<li class="head"><span class="dot" style="background:${TEAMS[t].color}"></span>${text}</li>`;
const playerRow = e => `<li data-id="${e.id}" tabindex="0" role="button"><span class="num">${posOrderLabel(e)}</span><span class="name">${e.name}</span><span class="cnt">${e.sp ? '先發投手' : POS[e.pos]} ↗</span></li>`;
const cheerRow = (t, m) => {
  const spot = entById.get(`c:${t}:${m.name}`)?.spot;
  return `<li data-id="c:${t}:${m.name}" tabindex="0" role="button" data-avatar-id="${m.avatarMeta.id}" data-person="${m.avatarMeta.person}" data-team="${m.avatarMeta.teamName}" title="${m.name}｜${m.avatarMeta.squad}">`
    + `<img class="avatar" src="${m.thumb}" alt="${m.name} AI 生成插畫" data-person="${m.avatarMeta.person}" loading="lazy">`
    + `<span class="num">${m.no != null ? pad(m.no) : '·'}</span>`
    + `<span class="name">${m.name}${m.kr ? '<span class="badge kr">韓籍</span>' : ''}${m.role ? `<span class="badge role">${m.role}</span>` : ''}${m.note ? `<span class="badge">${m.note}</span>` : ''}</span>`
    + `<span class="cnt">${spot ? spot.replace('應援台', '') : ''} ↗</span></li>`;
};
const gameText = g => [g.g, g.date, `週${g.wd}`, `星期${g.wd}`, g.time, TEAMS[g.away].name, TEAMS[g.home].name,
  g.wp, g.lp, g.sv, g.hr, g.sp, g.note, played(g) ? '已完賽' : '未開打'];
function gameRow(g) {
  const ng = nextGame();
  const status = played(g) ? '<span class="sbadge done">已完賽</span>'
    : g === ng ? '<span class="sbadge next">下一場</span>' : g.ifNeeded ? '<span class="sbadge">若有必要</span>' : '';
  const typhoon = g.postponed ? '<span class="sbadge typhoon">颱風順延</span>' : '';
  const main = played(g)
    ? `${TEAMS[g.away].short} ${runsOf(g, g.away)} : ${runsOf(g, g.home)} ${TEAMS[g.home].short}${g.line.wc.length > 9 ? `（${g.line.wc.length} 局）` : ''}`
    : `${TEAMS[g.away].short} vs ${TEAMS[g.home].short}`;
  return `<li class="sched${g === shownGame ? ' cur' : ''}" data-game="${g.g}" tabindex="0" role="button"><span class="num">${g.g.slice(1)}</span>
    <span class="game"><b>${main}</b><small>${g.date}（${g.wd}）${g.time ? ' ' + g.time : ''}・${g.venue}・主場 ${TEAMS[g.home].short}</small></span>${status}${typhoon}</li>`;
}

// case-, space- and dash-insensitive matching, so "dahye lee", "DahyeLee" and "10-24" all work
const norm = s => String(s).toLowerCase().replace(/\s+/g, '').replace(/-/g, '/');

function renderList() {
  const q = norm($('#search').value.trim());
  const has = s => !!s && norm(s).includes(q);
  const list = $('#list');
  let html = '';
  // people matching the search also get their name tags shown on the field
  state.found = new Set(q ? ents.filter(e => e.kind === 'player' ? has(e.name) : has(e.member.name) || (e.member.aliases ?? []).some(has)) : []);
  if (q) {
    // global search: players, 32-man rosters, cheerleaders (with photos) and games, whatever tab is open
    for (const t of ['wc', 'ctbc']) {
      const ps = players.filter(e => e.team === t && has(e.name));
      if (ps.length) html += dotHead(t, `${TEAMS[t].name}・${SCENE_GAME} 先發`) + ps.map(playerRow).join('');
      const rs = Object.entries(TEAMS[t].roster).flatMap(([grp, ns]) => ns.filter(n => has(n) && !ps.some(e => e.name === n)).map(n => `<span>${n}（${grp}）</span>`));
      if (rs.length) html += `<li class="chips"><small>${TEAMS[t].name} 32 人名單</small>${rs.join('')}</li>`;
    }
    for (const t of ['wc', 'ctbc']) {
      const ms = CHEER[t].members.filter(m => has(m.name) || has(m.role) || (m.kr && has('韓籍')) || has(m.aka) || (m.aliases ?? []).some(has));
      if (ms.length) html += dotHead(t, `${TEAMS[t].name}・${CHEER[t].squad}`) + ms.map(m => cheerRow(t, m)).join('');
    }
    const gs = SCHEDULE.filter(g => gameText(g).some(has));
    if (gs.length) html += `<li class="head">賽程</li>` + gs.map(gameRow).join('');
  } else if (state.tab === 'wc' || state.tab === 'ctbc') {
    const t = state.tab, T = TEAMS[t];
    const rows = players.filter(e => e.team === t).sort((a, b) => (a.sp ? -1 : a.order) - (b.sp ? -1 : b.order));
    html += dotHead(t, `台灣大賽 ${SCENE_GAME} 先發`) + rows.map(playerRow).join('');
    html += `<li class="head">台灣大賽 32 人名單</li>`;
    for (const [grp, names] of Object.entries(T.roster))
      html += `<li class="chips"><small>${grp}（${names.length}）</small>${names.map(n => `<span>${n}</span>`).join('')}</li>`;
  } else if (state.tab === 'cheer') {
    for (const t of [sceneGame.away, sceneGame.home])
      html += dotHead(t, `${TEAMS[t].name}・${CHEER[t].squad}（${CHEER[t].members.length}）`) + CHEER[t].members.map(m => cheerRow(t, m)).join('');
  } else {
    html += `<li class="chips" style="display:block">${trackerHtml()}</li>` + SCHEDULE.map(gameRow).join('');
  }
  list.innerHTML = html || '<li class="empty">找不到符合的結果</li>';
}
$('#list').addEventListener('click', ev => {
  const li = ev.target.closest('li[data-id]');
  if (li) select(li.dataset.id);
  const gl = ev.target.closest('li[data-game]');
  if (gl) selectGame(gl.dataset.game);
});

function selectGame(id) {
  const g = gameById[id];
  setHash(g.g);
  state.sel = null;
  setBird(false);
  if (played(g)) {
    showGame(g);
    fireworkShow(winnerOf(g), 5);
    flyTo(new THREE.Vector3(0, 48, 40), new THREE.Vector3(0, 16, -STAND_R - 9));
  }
  const d = $('#detail');
  const title = played(g)
    ? `${TEAMS[g.away].short} ${runsOf(g, g.away)} : ${runsOf(g, g.home)} ${TEAMS[g.home].short}`
    : `${TEAMS[g.away].short} vs ${TEAMS[g.home].short}`;
  d.innerHTML = `<button class="back">← 返回賽程</button>
    <div class="dnum">${g.g}</div>
    <h2>${title}</h2>
    <dl>
      <dt>日期</dt><dd>2026/${g.date}（${g.wd}）${g.time ? ' ' + g.time : ''}</dd>
      <dt>球場</dt><dd>${g.venue}</dd>
      <dt>主場</dt><dd>${TEAMS[g.home].name}</dd>
      ${g.sp ? `<dt>先發</dt><dd>${g.sp}</dd>` : ''}
      ${played(g) ? `<dt>勝方</dt><dd>${TEAMS[winnerOf(g)].name}</dd>` : `<dt>狀態</dt><dd>${g.ifNeeded ? '若有必要才舉行' : '未開打'}</dd>`}
    </dl>
    ${played(g) ? `<div class="score">${lineScore(g)}</div><p>外野記分板已切換成這一場。</p>`
      : `<h3>開打倒數</h3><div class="countdown" data-start="${g.start}">${fmtCountdown(new Date(g.start) - Date.now())}</div><p>${g.note ?? ''}</p>`}
    ${played(g) && g !== sceneGame ? `<button class="cta">記分板換回 ${SCENE_GAME}</button>` : ''}`;
  d.querySelector('.back').onclick = () => { state.tab = 'series'; document.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x.dataset.tab === 'series')); goHome(); };
  d.querySelector('.cta')?.addEventListener('click', () => { showGame(sceneGame); selectGame(SCENE_GAME); });
  d.hidden = false; $('#index').hidden = true;
  $('#side').scrollTop = 0;
  if (document.body.classList.contains('list-off')) toggleList(true);
}
$('#list').addEventListener('mouseover', ev => { const li = ev.target.closest('li[data-id]'); setHover(li ? entById.get(li.dataset.id) : null); });
$('#list').addEventListener('mouseleave', () => setHover(null));
$('#search').addEventListener('input', renderList);
document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => {
  state.tab = b.dataset.tab;
  document.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x === b));
  renderList();
});

function renderDetail(e) {
  const T = TEAMS[e.team];
  const d = $('#detail');
  let body;
  if (e.kind === 'player') {
    const mates = players.filter(x => x.team === e.team && x !== e);
    body = `
      <div class="dnum">${e.sp ? 'SP' : pad(e.order)}</div>
      <h2>${e.name}</h2>
      <span class="team"><i style="background:${T.color}"></i>${T.name}</span>
      <h3>台灣大賽 ${sceneGame.g}・${sceneGame.date}</h3>
      <dl>
        <dt>棒次</dt><dd>${e.sp ? '—' : `第 ${e.order} 棒`}</dd>
        <dt>守位</dt><dd>${e.sp ? '先發投手' : POS[e.pos]}</dd>
        <dt>本場</dt><dd>${T.name} ${sceneGame.rhe[e.team][0]} 分、${sceneGame.rhe[e.team][1]} 安打</dd>
        <dt>場上</dt><dd>${{ field: '守備中', bat: '打擊中', deck: '準備區', run: '壘上跑者', bench: '休息區' }[e.role] ?? '—'}</dd>
      </dl>
      <h3>同隊先發</h3>
      <div class="mates">${mates.map(x => `<button data-id="${x.id}">${x.sp ? 'P' : x.pos} ${x.name}</button>`).join('')}</div>`;
  } else {
    const m = e.member, C = CHEER[e.team];
    const mates = C.members.filter(x => x.feature && x !== m);
    body = `
      <img class="portrait" src="${m.avatar}" alt="${m.name} AI 生成插畫" data-avatar-id="${m.avatarMeta.id}" data-person="${m.avatarMeta.person}" data-team="${m.avatarMeta.teamName}" title="${m.name}｜${m.avatarMeta.squad}（AI 生成插畫，非本人照片）">
      <p class="ai-note">AI 生成的風格化插畫，非本人照片</p>
      <div class="dnum">${m.no != null ? '#' + m.no : '★'}</div>
      <h2>${m.name}</h2>
      <span class="team"><i style="background:${T.color}"></i>${T.name}・${C.squad}</span>
      <dl style="margin-top:20px">
        <dt>職務</dt><dd>${m.role ?? '成員'}</dd>
        <dt>國籍</dt><dd>${m.kr ? '韓國' : m.note ?? '台灣'}</dd>
        ${m.aka ? `<dt>備註</dt><dd>${m.aka}</dd>` : ''}
        <dt>位置</dt><dd>${T.side > 0 ? '一壘側' : '三壘側'}・${e.spot ?? '應援台'}</dd>
      </dl>
      <h3>應援台主力</h3>
      <div class="mates">${mates.map(x => `<button data-id="c:${e.team}:${x.name}">${x.name}${x.kr ? '（韓）' : ''}</button>`).join('')}</div>`;
  }
  d.innerHTML = `<button class="back">← 返回清單</button>${body}`;
  d.querySelector('.back').onclick = goHome;
  d.querySelectorAll('.mates button').forEach(b => b.onclick = () => select(b.dataset.id));
  d.hidden = false; $('#index').hidden = true;
  $('#side').scrollTop = 0;
}

// ================= toolbar =================
const isPhone = () => matchMedia('(max-width: 900px)').matches;
document.querySelectorAll('[data-time]').forEach(b => b.onclick = () => {
  const all = [...document.querySelectorAll('[data-time]')];
  const pick = isPhone() && b.classList.contains('on') ? all[(all.indexOf(b) + 1) % all.length] : b;
  setPreset(PRESETS[pick.dataset.time]);
  all.forEach(x => { x.classList.toggle('on', x === pick); x.setAttribute('aria-pressed', x === pick); });
});
function setMode(mode, on) {
  const btn = document.querySelector(`[data-mode=${mode}]`);
  if (mode === 'swap') { switchHalf('手動交換'); return; }
  on ??= !btn.classList.contains('on');
  if (mode === 'bird') return on ? setBird(true) : goHome();
  btn.classList.toggle('on', on);
  btn.setAttribute('aria-pressed', on);
  if (mode === 'tags') document.body.classList.toggle('tags-off', !on);
  if (mode === 'play') {
    state.play = on;
    if (!on) abortPlay();
  }
  if (mode === 'cheer') state.cheer = on;
  if (mode === 'log') document.body.classList.toggle('log-on', on);
  if (mode === 'music') {
    setMusic(on);
    if (on) toast('♪ 應援曲開啟<small>進攻方換隊時自動切歌</small>', 1600);
  }
  if (mode === 'pause') {
    state.paused = on;
    hold('pause', on);
    document.body.classList.toggle('paused', on);
    btn.querySelector('span').textContent = on ? '播放' : '暫停';
  }
}
document.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => setMode(b.dataset.mode));
$('#btnRain').onclick = () => {
  weather.rain = !weather.rain;
  $('#btnRain').classList.toggle('on', weather.rain);
  $('#btnRain').setAttribute('aria-pressed', weather.rain);
  rain.visible = weather.rain;
  if (weather.rain) {
    toast('薔琵颱風來襲！<small>G5 順延至 10/24（六）17:05</small>', 2600);
    pushLog('颱風', '強烈颱風薔琵襲台，G5 順延一天，G6、G7 也跟著延後');
  }
};
function toggleList(on) {
  on ??= document.body.classList.contains('list-off');
  document.body.classList.toggle('list-off', !on);
  $('#btnList').setAttribute('aria-expanded', on);
}
$('#btnHome').onclick = goHome;
// without the song files (e.g. the public site) the music button explains instead of failing silently
musicAvailable.then(ok => {
  if (ok) return;
  const btn = document.querySelector('[data-mode=music]');
  btn.disabled = true;
  btn.title = '此版本未附應援曲音檔';
  btn.setAttribute('aria-label', '音樂（此版本未附音檔）');
});
// list rows act like buttons for keyboard users
$('#list').addEventListener('keydown', ev => {
  if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches('li[tabindex]')) { ev.preventDefault(); ev.target.click(); }
});
// music never keeps playing in a tab nobody is looking at (the render loop already stops by itself there)
document.addEventListener('visibilitychange', () => hold('hidden', document.hidden));
// toggle buttons announce their state to screen readers
document.querySelectorAll('[data-mode]:not([data-mode=swap])').forEach(b => b.setAttribute('aria-pressed', b.classList.contains('on')));
document.querySelectorAll('[data-time]').forEach(b => b.setAttribute('aria-pressed', b.classList.contains('on')));
$('#btnRain').setAttribute('aria-pressed', 'false');
// graphics quality picker (help dialog)
const qSel = $('#quality');
qSel.value = Q.choice;
$('#qualityNow').textContent = { low: '低', medium: '中', high: '高' }[Q.tier];
qSel.onchange = () => setQuality(qSel.value);
function toggleUI(min) {
  min ??= !document.body.classList.contains('ui-min');
  document.body.classList.toggle('ui-min', min);
  try { localStorage.setItem('ui-min', min ? '1' : ''); } catch {}
}
$('#btnUI').onclick = () => toggleUI();
document.addEventListener('keydown', ev => {
  if (ev.target.closest('input, textarea') || ev.ctrlKey || ev.metaKey || ev.altKey) return;
  if ((ev.key === 'h' || ev.key === 'H') && $('#help').hidden) toggleUI();
});
try { if (localStorage.getItem('ui-min')) toggleUI(true); } catch {}
$('#btnList').onclick = () => toggleList();
$('#sideClose').onclick = () => { toggleList(false); $('#btnList').focus(); };
function openHelp() {
  $('#help').hidden = false;
  $('#help .box').focus();
}
function closeHelp() {
  $('#help').hidden = true;
  $('#btnHelp').focus();
}
$('#btnHelp').onclick = openHelp;
$('#help').onclick = ev => { if (ev.target === ev.currentTarget || ev.target.closest('.close')) closeHelp(); };
$('#help').addEventListener('keydown', ev => {
  if (ev.key === 'Escape') { ev.preventDefault(); closeHelp(); return; }
  if (ev.key !== 'Tab') return;
  const items = [...$('#help').querySelectorAll('button, select, [href], input')].filter(el => !el.disabled);
  const first = items[0], last = items.at(-1);
  if (ev.shiftKey && (document.activeElement === first || document.activeElement === $('#help .box'))) { ev.preventDefault(); last.focus(); }
  else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
});
document.body.classList.add('log-on');

// ================= game log =================
const FACTS = [
  ['G1', '10/17 味全 3:0 中信，勝投蔣銲、救援林凱威'],
  ['G2', '10/18 味全 3:1 中信，曾聖安全壘打'],
  ['G3', '10/20 味全 6:0 中信，勝投鋼龍'],
  ['G4', '10/21 中信延長 11 局 5:4 擊敗味全'],
  ['G4', '先發投手：味全 黃暐傑 vs 中信 鄭浩均'],
  ['G4', '臺北大巨蛋 4 萬人滿場'],
  ['颱風', '強烈颱風薔琵來襲，G5 順延到 10/24（六）17:05'],
  ['G5', '預告先發：中信 伍立辰 vs 味全 蔣銲，味全贏球即封王'],
  ['G6', '若有必要：10/25（日）17:05'],
  ['G7', '若有必要：10/26（一）光復節補假 15:05'],
  ['應援', '小龍女 Captain 李多慧、金娜妍、權喜原 在一壘側應援台'],
  ['應援', 'Passion Sisters 邊荷律、金渡兒、JJUBI 在三壘側應援台'],
];
let factI = 3, nextFact = 0;
FACTS.slice(0, 3).forEach(f => pushLog(...f));
// rotate one series fact into the log every few seconds
function tickFacts(t) {
  if (t > nextFact) { pushLog(...FACTS[factI++ % FACTS.length]); nextFact = t + 6; }
}

// ================= onboarding =================
const STEPS = [
  '2026 台灣大賽「龍象大戰」G4，10/21 臺北大巨蛋。拖曳旋轉、滾輪縮放。',
  '點選場上的球員或應援台上的啦啦隊員，看他們的資料；右側清單有完整名單。',
  '場上會用 G4 先發陣容模擬對戰：好壞球、安打、接殺、跑壘，打出全壘打還會放煙火。',
  '右側「賽程」可以查 G1–G7、看 G5 開打倒數；點已完賽的場次，外野記分板會換成那場比分。',
];
let step = 0;
function showStep() {
  $('#introStep').textContent = pad(step + 1);
  $('#introText').textContent = STEPS[step];
  $('#intro .next').textContent = step === STEPS.length - 1 ? '開始看球' : '下一步';
}
$('#intro .next').onclick = () => { if (++step >= STEPS.length) $('#intro').remove(); else showStep(); };
$('#intro .skip').onclick = () => $('#intro').remove();
showStep();

export { shownGame, labelBox, tagText, v3, updateLabels, tween, flyTo, ease, marker, setHover, ray, ndc, hitBoxes, entAt, down, select, deselect, goHome, setBird, lineScore, showGame, seriesWins, nextGame, fmtCountdown, trackerHtml, posOrderLabel, dotHead, playerRow, cheerRow, gameText, gameRow, renderList, selectGame, renderDetail, setMode, toggleList, toggleUI, tickFacts, STEPS, step, showStep, route };
