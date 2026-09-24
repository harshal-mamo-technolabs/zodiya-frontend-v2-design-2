/* Maps the API's natal chart payload onto the shape the wheel and the reading
   already render. All astronomy happens on the server; this file is presentation
   only — glyphs, roman numerals, and the strings the design asks for. */

export const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

export const SIGN_GLYPH = { Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋', Leo: '♌', Virgo: '♍', Libra: '♎', Scorpio: '♏', Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓' };

const SIGN_NAME = { aries: 'Aries', taurus: 'Taurus', gemini: 'Gemini', cancer: 'Cancer', leo: 'Leo', virgo: 'Virgo', libra: 'Libra', scorpio: 'Scorpio', sagittarius: 'Sagittarius', capricorn: 'Capricorn', aquarius: 'Aquarius', pisces: 'Pisces' };

const BODY_NAME = { sun: 'Sun', moon: 'Moon', mercury: 'Mercury', venus: 'Venus', mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus', neptune: 'Neptune', pluto: 'Pluto', northNode: 'North Node' };

export const BODY_GLYPH = { sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂', jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇', northNode: '☊' };

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* Trine and sextile are drawn gold; the rest are drawn sage. */
const SOFT = new Set(['trine', 'sextile']);

const pad = n => String(n).padStart(2, '0');
const degText = p => `${pad(p.degree)}°${pad(p.minute)}′`;

function point(p) {
  const sign = SIGN_NAME[p.sign] || p.sign;
  return { lon: p.lon, sign, signGlyph: SIGN_GLYPH[sign], deg: degText(p), text: degText(p), full: `${degText(p)} ${sign}` };
}

/** "15 Aug 1995" from "1995-08-15". */
export function dobText(iso) {
  const [y, m, d] = String(iso).split('-');
  return `${d} ${MONTHS[+m - 1]} ${y}`;
}

/** payload is the whole { profile, chart, reading } response. */
export function toChartView(payload) {
  const { profile, chart, reading } = payload;

  const bodies = chart.bodies.map(b => ({
    name: BODY_NAME[b.body] || b.body,
    glyph: BODY_GLYPH[b.body] || '',
    lon: b.lon,
    speed: b.speed,
    retro: b.retrograde,
    sign: SIGN_NAME[b.sign] || b.sign,
    signGlyph: SIGN_GLYPH[SIGN_NAME[b.sign]],
    deg: degText(b),
    degFull: `${degText(b)} ${SIGN_NAME[b.sign]}`,
    house: b.house,
    houseRoman: ROMAN[b.house - 1]
  }));

  const byName = Object.fromEntries(bodies.map(b => [b.name, b]));
  const lonOf = Object.fromEntries(chart.bodies.map(b => [b.body, b.lon]));

  const aspects = chart.aspects.map(a => ({
    a: BODY_NAME[a.a], b: BODY_NAME[a.b],
    lonA: lonOf[a.a], lonB: lonOf[a.b],
    aspect: a.type, kind: SOFT.has(a.type) ? 'soft' : 'hard',
    angle: a.angle, orb: a.orb, applying: a.applying
  }));

  const asc = point(chart.angles.asc);
  const mc = point(chart.angles.mc);

  return {
    profile,
    asc: asc.lon,
    mc: mc.lon,
    ascSign: asc.sign,
    mcSign: mc.sign,
    ascText: asc.full,
    mcText: mc.full,
    cusps: chart.houses.map(h => h.lon),
    cuspsFmt: chart.houses.map((h, i) => ({ house: h.house, roman: ROMAN[i], ...point(h) })),
    bodies,
    byName,
    aspects,
    dominants: chart.dominants,
    big3: { sun: byName.Sun.sign, moon: byName.Moon.sign, rising: asc.sign },
    meta: {
      ...chart.meta,
      houseSystem: chart.meta.houseSystem === 'placidus' ? 'Placidus' : 'Whole sign',
      metaLine: [
        profile.name,
        dobText(profile.birthDate),
        profile.birthTime,
        [profile.city, profile.country].filter(Boolean).join(', ')
      ].filter(Boolean).join(' · ')
    },
    reading: {
      lang: reading.lang,
      headline: reading.headline,
      chips: reading.chips,
      summary: reading.summary,
      sections: reading.sections.map(s => ({
        key: s.key, n: s.numeral, title: s.title, meta: s.subtitle,
        basis: s.caption, paras: s.paragraphs
      }))
    }
  };
}
