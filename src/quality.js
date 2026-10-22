// Graphics quality tiers. "auto" picks low on phones / small or low-memory devices, high otherwise.
// Override with ?q=low|medium|high in the URL or the picker in the help dialog (saved per browser).
const TIERS = {
  low:    { dpr: 1,    antialias: false, shadow: 1024, trees: 800,  terrainSeg: 100, rain: 1500, crowdSkip: .4 },
  medium: { dpr: 1.25, antialias: true,  shadow: 1536, trees: 1100, terrainSeg: 140, rain: 2500, crowdSkip: .25 },
  high:   { dpr: 1.5,  antialias: true,  shadow: 2048, trees: 1600, terrainSeg: 180, rain: 3500, crowdSkip: .12 },
};

function autoTier() {
  const coarse = matchMedia('(pointer: coarse)').matches;
  const small = Math.min(screen.width, screen.height) < 700;
  const lowMem = (navigator.deviceMemory ?? 8) <= 4;
  const fewCores = (navigator.hardwareConcurrency ?? 8) <= 4;
  if (small || (coarse && (lowMem || fewCores))) return 'low';
  if (coarse || lowMem || fewCores) return 'medium';
  return 'high';
}

function readChoice() {
  const fromUrl = new URLSearchParams(location.search).get('q');
  if (fromUrl in TIERS) return fromUrl;
  try { const saved = localStorage.getItem('quality'); if (saved in TIERS) return saved; } catch {}
  return 'auto';
}

const choice = readChoice();
const tier = choice === 'auto' ? autoTier() : choice;
const Q = { ...TIERS[tier], tier, choice };

function setQuality(value) {
  try { value === 'auto' ? localStorage.removeItem('quality') : localStorage.setItem('quality', value); } catch {}
  const url = new URL(location.href);
  url.searchParams.delete('q');
  location.replace(url); // tiers shape the scene at build time, so reload to apply
}

export { Q, setQuality };
