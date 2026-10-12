/* Astrocartography: where on Earth each planet was rising (AC), culminating (MC),
   setting (DC) or at the nadir (IC) at the moment of birth. Cast from the natal
   chart the API already returns, so no extra request. Text here is English and
   goes through t() where it is shown. */
import { getLang } from '../i18n/index.js';

const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const norm = a => ((a % 360) + 360) % 360;
const wrap = a => { a = norm(a); return a > 180 ? a - 360 : a; };

export const PLANETS = {
  sun: { name: 'Sun', glyph: '☉', color: '#E3B64B' }, moon: { name: 'Moon', glyph: '☽', color: '#F4ECDC' },
  mercury: { name: 'Mercury', glyph: '☿', color: '#9FC7D8' }, venus: { name: 'Venus', glyph: '♀', color: '#E59BB0' },
  mars: { name: 'Mars', glyph: '♂', color: '#D8694A' }, jupiter: { name: 'Jupiter', glyph: '♃', color: '#7FBF9E' },
  saturn: { name: 'Saturn', glyph: '♄', color: '#A9A39A' }, uranus: { name: 'Uranus', glyph: '♅', color: '#7EC8E3' },
  neptune: { name: 'Neptune', glyph: '♆', color: '#8A7FD6' }, pluto: { name: 'Pluto', glyph: '♇', color: '#B06A8F' }
};
export const BODIES = Object.keys(PLANETS);
/* The outer three are on the globe but start hidden, like the design's classical set. */
export const OUTER = ['uranus', 'neptune', 'pluto'];

export const ANGLES = {
  AC: { name: 'Ascendant', verb: 'rising', theme: 'Identity & presence', text: 'Where the planet was rising. How you arrive, how you are seen at first glance, the body and the mood.' },
  MC: { name: 'Midheaven', verb: 'culminating', theme: 'Vocation & visibility', text: 'Where it stood highest. Work, reputation, what the world asks of you.' },
  DC: { name: 'Descendant', verb: 'setting', theme: 'Partnership & others', text: 'Where it was setting. The people you meet, partner with, and are changed by.' },
  IC: { name: 'Imum Coeli', verb: 'at the nadir', theme: 'Home & roots', text: 'Where it sat beneath your feet. Home, family, privacy, the roots you grow.' }
};

export const MEANINGS = {
  sun: { MC: 'You are seen here. Work carries further, authority comes easier, and the spotlight finds you whether or not you ask for it.', IC: 'A place that feels like origin even if you have never been. Good for retreat, family, and building something private.', AC: 'Vitality lifts. You walk in brighter, more certain of who you are — and people read you that way.', DC: 'Others define the chapter. Strong partners, strong rivals; relationships here are formative.' },
  moon: { MC: 'Public life turns personal. Care, audiences and emotional honesty become your reputation.', IC: 'The deepest home line there is. Rest, roots, kitchen tables — and old moods resurfacing.', AC: 'Feelings sit close to the surface. Intuitive, tender, easily moved, easily tired.', DC: 'You attract people who need you. Nurturing bonds, and the risk of carrying too much.' },
  mercury: { MC: 'Ideas get traction. Writing, teaching, trade and talk become the career thread.', IC: 'A studious, inward place. Journals fill; family stories get retold.', AC: 'Quick, curious, talkative. You learn the streets and the language fast.', DC: 'Partnerships run on conversation. Good for collaborators, agents and clever friends.' },
  venus: { MC: 'Taste becomes a calling. Design, diplomacy and beauty pay here.', IC: 'The comfort line. Homes are lovely, meals are long, and you soften.', AC: 'Charm comes easily and so do invitations. Watch for indulgence.', DC: 'The classic love line. Relationships begin, deepen, or are remembered from here.' },
  mars: { MC: 'Ambition sharpens. You compete, build and push — and are noticed for it.', IC: 'Restless at home. Renovation, arguments, or the drive to start over.', AC: 'Energy and edge. Physical, direct, impatient; superb for training, poor for peace.', DC: 'Friction with others is the teacher here. Passionate ties, sudden fallouts.' },
  jupiter: { MC: 'The expansion line. Opportunity, patrons, luck in public roles — and a tendency to overreach.', IC: 'Abundance at home. Larger houses, generous hosts, a sense of belonging.', AC: 'Optimism, appetite and growth in every sense. You take up more room.', DC: 'Generous partners and good counsel. Foreign ties and marriages are favoured.' },
  saturn: { MC: 'Serious work, slow reward. Mastery is built here; it is rarely quick.', IC: 'Solitary and structured. Good for discipline, hard for warmth.', AC: 'You feel older here. Responsibility settles on your shoulders; stature follows.', DC: 'Committed, enduring, demanding relationships. Lessons in loyalty and limit.' },
  uranus: { MC: 'Reinvention. Unconventional careers, sudden breaks, ideas ahead of their time.', IC: 'Unsettled ground. Frequent moves, unusual households, freedom from the past.', AC: 'You become the outsider — electric, original, hard to pin down.', DC: 'Unexpected people. Alliances form fast and end faster.' },
  neptune: { MC: 'Imagination as vocation. Art, film, faith, service — and a blurry public image.', IC: 'Dreamy, porous, sometimes escapist. Near water you dissolve.', AC: 'Boundaries soften. Inspired and compassionate, but easily lost.', DC: 'Idealised others. Romance and disappointment share one address.' },
  pluto: { MC: 'Power and transformation in public. Influence that unsettles as much as it builds.', IC: 'The excavation line. Buried history surfaces; endings make room.', AC: 'Intensity. You arrive and something in you is rewritten.', DC: 'Magnetic, consuming bonds. Nothing here stays shallow.' }
};

export const DESTINATIONS = [
  { name: 'New York', lat: 40.7128, lon: -74.006 }, { name: 'Tokyo', lat: 35.6762, lon: 139.6503 }, { name: 'Sydney', lat: -33.8688, lon: 151.2093 },
  { name: 'Cape Town', lat: -33.9249, lon: 18.4241 }, { name: 'Buenos Aires', lat: -34.6037, lon: -58.3816 }, { name: 'Mumbai', lat: 19.076, lon: 72.8777 },
  { name: 'Reykjavík', lat: 64.1466, lon: -21.9426 }, { name: 'Mexico City', lat: 19.4326, lon: -99.1332 }, { name: 'Cairo', lat: 30.0444, lon: 31.2357 },
  { name: 'Bali', lat: -8.4095, lon: 115.1889 }, { name: 'Vancouver', lat: 49.2827, lon: -123.1207 }, { name: 'Istanbul', lat: 41.0082, lon: 28.9784 }
];

/* Major cities the "Best places for you" picks are chosen from. */
export const CITIES = [
  ['London', 51.507, -0.128], ['Paris', 48.857, 2.352], ['Berlin', 52.52, 13.405], ['Rome', 41.903, 12.496], ['Madrid', 40.417, -3.704],
  ['Lisbon', 38.722, -9.139], ['Amsterdam', 52.368, 4.904], ['Vienna', 48.208, 16.374], ['Zurich', 47.377, 8.542], ['Stockholm', 59.329, 18.069],
  ['Athens', 37.984, 23.728], ['Istanbul', 41.008, 28.978], ['Dubai', 25.205, 55.271], ['Cairo', 30.044, 31.236], ['Cape Town', -33.925, 18.424],
  ['Nairobi', -1.286, 36.817], ['Mumbai', 19.076, 72.878], ['Delhi', 28.614, 77.209], ['Bangkok', 13.756, 100.502], ['Singapore', 1.352, 103.82],
  ['Bali', -8.41, 115.189], ['Hong Kong', 22.319, 114.169], ['Tokyo', 35.676, 139.65], ['Seoul', 37.567, 126.978], ['Sydney', -33.869, 151.209],
  ['Melbourne', -37.814, 144.963], ['Auckland', -36.849, 174.763], ['Honolulu', 21.307, -157.858], ['Los Angeles', 34.052, -118.244], ['San Francisco', 37.775, -122.419],
  ['Vancouver', 49.283, -123.121], ['Mexico City', 19.433, -99.133], ['New York', 40.713, -74.006], ['Toronto', 43.653, -79.383], ['Miami', 25.762, -80.192],
  ['Rio de Janeiro', -22.907, -43.173], ['Buenos Aires', -34.604, -58.382], ['Lima', -12.046, -77.043], ['Reykjavík', 64.147, -21.943], ['Marrakesh', 31.629, -7.981]
];

/* Life themes and the planet lines tradition ties to them. */
export const THEMES = [
  { key: 'love', label: 'Love', glyph: '♀', lines: [['venus', 'DC'], ['venus', 'AC'], ['moon', 'DC']] },
  { key: 'career', label: 'Career', glyph: '☉', lines: [['sun', 'MC'], ['jupiter', 'MC'], ['saturn', 'MC']] },
  { key: 'luck', label: 'Luck', glyph: '♃', lines: [['jupiter', 'AC'], ['jupiter', 'MC'], ['jupiter', 'DC'], ['jupiter', 'IC']] },
  { key: 'home', label: 'Home', glyph: '☽', lines: [['moon', 'IC'], ['venus', 'IC'], ['jupiter', 'IC']] }
];

/** The city closest to any of a theme's lines, within the orb; null when none is close. */
export function bestPlace(lines, theme, orbKm = 800) {
  const wanted = lines.filter(l => theme.lines.some(([p, a]) => p === l.planet && a === l.angle));
  let best = null;
  for (const [name, lat, lon] of CITIES) {
    for (const r of nearby(wanted, lat, lon, orbKm)) {
      if (!best || r.km < best.km) best = { name, lat, lon, km: r.km, planet: r.planet, angle: r.angle };
      break; // nearby() is sorted: the first is this city's closest
    }
  }
  return best;
}

/* Greenwich sidereal time at birth, in degrees: the chart's RAMC less the birth longitude. */
const gast = chart => norm(chart.angles.ramc - chart.meta.lon);

/** Lines for a natal chart: [{ planet, angle, glyph, color, dashed, points: [[lat, lon]…], label: [lat, lon] }]. */
export function computeLines(chart) {
  if (!chart) return [];
  const G = gast(chart), eps = chart.angles.obliquity * D2R, out = [];
  chart.bodies.filter(b => PLANETS[b.body]).forEach(b => {
    const L = b.lon * D2R;
    // ecliptic latitude is ignored: the angle lines move by well under a degree for it
    const dec = Math.asin(Math.sin(eps) * Math.sin(L)), ra = norm(Math.atan2(Math.sin(L) * Math.cos(eps), Math.cos(L)) * R2D);
    const P = PLANETS[b.body], base = { planet: b.body, glyph: P.glyph, color: P.color };
    const lonMC = wrap(ra - G), lonIC = wrap(lonMC + 180);
    const meridian = lon => { const pts = []; for (let f = -85; f <= 85; f += 0.25) pts.push([f, lon]); return pts; };
    out.push({ ...base, angle: 'MC', dashed: false, points: meridian(lonMC), label: [58, lonMC] });
    out.push({ ...base, angle: 'IC', dashed: true, points: meridian(lonIC), label: [-50, lonIC] });
    // rising and setting: the hour angle where the planet meets the horizon at each latitude
    const ac = [], dc = [], td = Math.tan(dec);
    for (let f = -89; f <= 89; f += 0.25) {
      const c = -Math.tan(f * D2R) * td; if (Math.abs(c) > 1) continue;
      const H = Math.acos(c) * R2D;
      ac.push([f, wrap(ra - H - G)]); dc.push([f, wrap(ra + H - G)]);
    }
    const near = (pts, lat) => pts.reduce((a, p) => Math.abs(p[0] - lat) < Math.abs(a[0] - lat) ? p : a, pts[0]);
    if (ac.length > 2) out.push({ ...base, angle: 'AC', dashed: false, points: ac, label: near(ac, 24) });
    if (dc.length > 2) out.push({ ...base, angle: 'DC', dashed: true, points: dc, label: near(dc, -24) });
  });
  return out;
}

export function haversine(a1, o1, a2, o2) {
  const dLat = (a2 - a1) * D2R, dLon = (o2 - o1) * D2R;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a1 * D2R) * Math.cos(a2 * D2R) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Lines within orbKm of a point, nearest first; strength falls linearly to 0 at the orb. */
export function nearby(lines, lat, lon, orbKm = 800) {
  return lines.map(l => {
    let km = Infinity;
    for (const p of l.points) { const d = haversine(lat, lon, p[0], p[1]); if (d < km) km = d; }
    return { planet: l.planet, angle: l.angle, km, strength: Math.max(0, 1 - km / orbKm) };
  }).filter(r => r.km <= orbKm).sort((a, b) => a.km - b.km);
}

export function fmtCoord(lat, lon) {
  const f = (v, pos, neg) => { const a = Math.abs(v); let d = Math.floor(a), m = Math.round((a - d) * 60); if (m === 60) { d += 1; m = 0; } return `${d}°${String(m).padStart(2, '0')}′${v >= 0 ? pos : neg}`; };
  return `${f(lat, 'N', 'S')} · ${f(lon, 'E', 'W')}`;
}

export function fmtGmst(chart) { const h = gast(chart) / 15; const hh = Math.floor(h), mm = Math.floor((h - hh) * 60); return `${hh}h ${String(mm).padStart(2, '0')}m`; }

/** OpenStreetMap reverse geocode of a tapped point → "Town, Country" in the portal's language. */
export async function placeName(lat, lon) {
  const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&zoom=10&lat=${lat}&lon=${lon}&accept-language=${getLang()}`);
  const j = await r.json(); if (!j || !j.address) return null;
  const a = j.address, local = a.city || a.town || a.village || a.municipality || a.county || a.state || a.region;
  return [local, a.country].filter(Boolean).join(', ') || null;
}
