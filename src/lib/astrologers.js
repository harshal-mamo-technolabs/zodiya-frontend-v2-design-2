/* The twelve AI astrologers and the one settings store both the choose page
   and the floating widget read. Voices and prompts live on the server; this
   is only what the screen shows. */
export const CHARACTERS = [
  { id: 'aries', name: 'Marco', glyph: '♈', role: 'Aries astrologer', tagline: 'Bold and direct. I tell you what the sky says, then what to do about it.' },
  { id: 'taurus', name: 'Elena', glyph: '♉', role: 'Taurus astrologer', tagline: 'Grounded and patient. I make slow planets feel practical.' },
  { id: 'gemini', name: 'Theo', glyph: '♊', role: 'Gemini astrologer', tagline: 'Quick and curious. I love connecting the dots in your chart.' },
  { id: 'cancer', name: 'Clara', glyph: '♋', role: 'Cancer astrologer', tagline: 'Warm and protective. I read your Moon like an old friend.' },
  { id: 'leo', name: 'Margot', glyph: '♌', role: 'Leo astrologer', tagline: 'Radiant and encouraging. I find the spotlight in every placement.' },
  { id: 'virgo', name: 'Dev', glyph: '♍', role: 'Virgo astrologer', tagline: 'Precise and kind. I love the small details of your houses.' },
  { id: 'libra', name: 'Priya', glyph: '♎', role: 'Libra astrologer', tagline: 'Balanced and gracious. I am at my best on relationships and timing.' },
  { id: 'scorpio', name: 'Nico', glyph: '♏', role: 'Scorpio astrologer', tagline: 'Deep and honest. I go straight to what matters.' },
  { id: 'sagittarius', name: 'Rafa', glyph: '♐', role: 'Sagittarius astrologer', tagline: 'Playful and big-picture. I know when the sky is on your side.' },
  { id: 'capricorn', name: 'Helena', glyph: '♑', role: 'Capricorn astrologer', tagline: 'Wise and structured. I turn transits into a plan.' },
  { id: 'aquarius', name: 'Walter', glyph: '♒', role: 'Aquarius astrologer', tagline: 'Seasoned and inventive. I explain things in plain words.' },
  { id: 'pisces', name: 'Marina', glyph: '♓', role: 'Pisces astrologer', tagline: 'Dreamy and intuitive. Calm answers, gently given.' }
];

export const byId = id => CHARACTERS.find(c => c.id === id) || CHARACTERS[5];

/* ElevenLabs speaking speed per setting (0.7–1.2). Normal sits a little under
   1 on purpose, so answers feel unhurried. */
export const SPEED = { slow: 0.8, normal: 0.9, fast: 1.05 };
export const SUB_PX = { S: '15px', M: '17px', L: '21px' };

/* Where the open_reading tool may send the reader. */
export const READINGS = {
  natal: ['Your natal chart', '/natal-chart'],
  transits: ['Your transits', '/transits'],
  horoscope: ["Today's horoscope", '/daily-horoscope'],
  numerology: ['Your numbers', '/numerology'],
  synastry: ['Compatibility', '/synastry'],
  tarot: ['Tarot', '/tarot']
};

const KEY = 'meridian_astrologer';
const reducedByDefault = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
export const DEFAULTS = {
  // micAsked: the permission card was answered; micOk: the browser granted it
  char: 'virgo', chosen: false, onboarded: false, micAsked: false, micOk: false,
  voiceOn: true, rate: 'normal', subs: true, subSize: 'M', motion: 'full',
  hidden: false, minimized: false, side: 'right', yFrac: 1
};

export function getPrefs() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) {}
  return { ...DEFAULTS, motion: reducedByDefault() ? 'reduced' : 'full', ...saved };
}

/* Every change is announced, so the page and the widget stay in step. */
export function setPrefs(patch) {
  const next = { ...getPrefs(), ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch (e) {}
  window.dispatchEvent(new CustomEvent('meridian:astrologer', { detail: next }));
  return next;
}

const HKEY = 'meridian_astrologer_history';
export const getHistory = () => { try { return JSON.parse(localStorage.getItem(HKEY) || '[]') || []; } catch (e) { return []; } };
export const saveHistory = h => { try { localStorage.setItem(HKEY, JSON.stringify(h.slice(-30))); } catch (e) {} };
export const clearHistory = () => { try { localStorage.removeItem(HKEY); } catch (e) {} };
