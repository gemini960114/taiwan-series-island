// Team cheer songs: the batting team's song plays (looped) and cross-fades when the half-inning switches.
// Off by default — browsers only allow audio after the viewer presses something.
const TRACKS = { wc: 'assets/audio/wc.mp3', ctbc: 'assets/audio/canon.mp3' };
const VOLUME = .55;
const players = {};
const fades = new Map();
let enabled = false, current = null;
const holds = new Set(); // reasons the music is silenced for now: 'pause' button, hidden tab
let listener = () => {};
const onMusicChange = fn => { listener = fn; };
const notify = () => listener({ enabled, team: current, held: holds.size > 0 });

function track(team) {
  if (!players[team]) {
    const a = new Audio(TRACKS[team]);
    a.loop = true;
    a.preload = 'none';
    a.volume = 0;
    players[team] = a;
  }
  return players[team];
}
function fade(a, to, ms = 900) {
  clearInterval(fades.get(a));
  const from = a.volume, start = performance.now();
  fades.set(a, setInterval(() => {
    const k = Math.min(1, (performance.now() - start) / ms);
    a.volume = from + (to - from) * k;
    if (k >= 1) {
      clearInterval(fades.get(a));
      if (to === 0) a.pause();
    }
  }, 30));
}

// called whenever the batting team changes
function playTeam(team) {
  current = team;
  notify();
  if (!enabled || holds.size) return;
  for (const [t, a] of Object.entries(players)) if (t !== team && !a.paused) fade(a, 0);
  const a = track(team);
  a.play().then(() => fade(a, VOLUME)).catch(() => {});
}
// If the song files are missing from a deployment, hide the button instead of failing silently.
// Resolves true only when the file really is audio (a dev server may answer 200 with index.html).
const musicAvailable = fetch(TRACKS.wc, { method: 'HEAD' })
  .then(r => r.ok && (r.headers.get('content-type') ?? '').includes('audio'))
  .catch(() => false);

function silence() { for (const a of Object.values(players)) if (!a.paused) fade(a, 0, 400); }
function setMusic(on) {
  enabled = on;
  notify();
  if (on && current) playTeam(current);
  else silence();
}
// pause/resume for a reason; music comes back only when no reason is left and it is still switched on
function hold(reason, on) {
  if (on) holds.add(reason); else holds.delete(reason);
  notify();
  if (holds.size) silence();
  else if (enabled && current) playTeam(current);
}

export { playTeam, setMusic, hold, musicAvailable, onMusicChange };
