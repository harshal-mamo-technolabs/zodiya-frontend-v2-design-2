import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Starfield from '../components/Starfield.jsx';
import NavMenu from '../components/NavMenu.jsx';
import MoodDial from '../components/MoodDial.jsx';
import { getHoroscope, listProfiles } from '../lib/api.js';
import { readActive } from '../lib/active-profile.js';

/* A port of Daily Horoscope.dc.html, with the day toggle widened to daily, weekly and yearly.
   Every reading is computed from the real sky for the date asked, so it works on any day. */

const MONO = "'IBM Plex Mono',monospace";
const SERIF = "'Cormorant Garamond',Georgia,serif";
const INK = '#F4ECDC', MUTED = 'rgba(244,236,220,.68)', COP = '#5F8B7A', GOLD = '#B4933F', NAVY = '#1C2538';
const SIGNS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
const ABBR = { aries: 'Ari', taurus: 'Tau', gemini: 'Gem', cancer: 'Can', leo: 'Leo', virgo: 'Vir', libra: 'Lib', scorpio: 'Sco', sagittarius: 'Sag', capricorn: 'Cap', aquarius: 'Aqu', pisces: 'Pis' };
const PERIODS = ['daily', 'weekly', 'yearly'];
const LOCALE = { en: 'en-GB' };

// Engraved glyphs drawn as stroked paths, as the design draws them.
const GLYPH = {
  aries: 'M6 20 C6 9 11 6 16 6 C21 6 26 9 26 20 M6 20 C4 15 6 11 9 11 M26 20 C28 15 26 11 23 11',
  taurus: 'M8 8 C11 12 21 12 24 8 M16 27 A7.5 7.5 0 1 0 16 12 A7.5 7.5 0 1 0 16 27',
  gemini: 'M8 7 C13 9 19 9 24 7 M8 25 C13 23 19 23 24 25 M12 8 L12 24 M20 8 L20 24',
  cancer: 'M6 12 C10 8 18 8 21 12 M11 12 A4 4 0 1 0 11 12.01 M26 20 C22 24 14 24 11 20 M21 20 A4 4 0 1 0 21 20.01',
  leo: 'M9 24 A5 5 0 1 0 9 14 C6 14 6 8 11 7 C16 6 19 10 17 15 C15 20 17 24 22 24 C25 24 26 21 25 19',
  virgo: 'M6 8 L6 22 M6 11 C7 8 10 8 11 11 L11 22 M11 11 C12 8 15 8 16 11 L16 22 M16 11 C17 8 21 8 22 12 C24 17 22 22 18 24 M22 12 C25 14 27 18 26 24',
  libra: 'M5 25 L27 25 M5 19 L12 19 M20 19 L27 19 M12 19 A6.5 6.5 0 1 1 20 19',
  scorpio: 'M5 8 L5 21 M5 11 C6 8 9 8 10 11 L10 21 M10 11 C11 8 14 8 15 11 L15 21 M15 11 C16 8 19 8 20 11 L20 24 L27 24 M23 20 L27 24 L23 28',
  sagittarius: 'M7 25 L25 7 M17 7 L25 7 L25 15 M11 15 L19 23',
  capricorn: 'M5 9 L5 20 M5 11 C6 8 9 8 10 11 L10 22 M10 12 C12 8 17 8 19 12 C21 16 19 20 16 20 M16 20 A4.5 4.5 0 1 0 22 24 C24 20 21 16 17 17',
  aquarius: 'M5 13 L9 9 L13 13 L17 9 L21 13 L25 9 M5 22 L9 18 L13 22 L17 18 L21 22 L25 18',
  pisces: 'M9 6 C4 12 4 20 9 26 M23 6 C28 12 28 20 23 26 M6 16 L26 16'
};

const CSS = `
.hor-sign:hover{background:rgba(244,236,220,.14) !important}
`;

const utc = iso => new Date(`${iso}T00:00:00Z`);
const part = (iso, lang, opts) => new Intl.DateTimeFormat(LOCALE[lang] || lang, { ...opts, timeZone: 'UTC' }).format(utc(iso));
/** "Thu 17 September 2026", "14 – 20 September 2026", "The year 2026". */
function dateLine(period, span, lang) {
  if (period === 'daily') return part(span.start, lang, { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' }).replace(',', '');
  if (period === 'weekly') {
    const sameMonth = span.start.slice(0, 7) === span.end.slice(0, 7);
    const start = sameMonth ? part(span.start, lang, { day: 'numeric' }) : part(span.start, lang, { day: 'numeric', month: 'long' });
    return `${start} – ${part(span.end, lang, { day: 'numeric', month: 'long', year: 'numeric' })}`;
  }
  return `The year ${span.start.slice(0, 4)}`;
}
/** Today, in the zone the reading is for. */
const today = zone => new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const browserZone = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) { return 'UTC'; } };

function Glyph({ sign, active }) {
  return (
    <svg viewBox="0 0 32 32" width="100%" height="100%" aria-hidden="true" style={{ display: 'block', overflow: 'visible' }}>
      <path d={GLYPH[sign]} fill="none" stroke={active ? NAVY : INK} strokeWidth={active ? 1.5 : 1.15} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

const cellLabel = { fontFamily: MONO, fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: MUTED };
const cell = { display: 'flex', flexDirection: 'column', gap: 9, padding: '12px 14px', borderRight: '1px solid rgba(244,236,220,.25)', borderBottom: '1px solid rgba(244,236,220,.25)' };

export default function Horoscope() {
  const navigate = useNavigate();
  const [sign, setSign] = useState(null);
  const [period, setPeriod] = useState('daily');
  const [zone, setZone] = useState(browserZone());
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  // the sign starts as the active profile's sun sign; a tap on the grid overrides it
  useEffect(() => {
    let live = true;
    listProfiles()
      .then(list => {
        if (!live) return;
        const wanted = readActive();
        const p = list.find(x => x._id === wanted) || list.find(x => x.isPrimary) || list[0];
        if (p) { setZone(p.timezoneId || browserZone()); setSign(s => s || p.zodiacSign); }
        else setSign(s => s || 'virgo');
      })
      .catch(e => { if (e.status === 401) navigate('/login'); else if (live) setSign(s => s || 'virgo'); });
    return () => { live = false; };
  }, [navigate]);

  useEffect(() => {
    if (!sign) return;
    let live = true;
    setError('');
    getHoroscope({ sign, period, date: today(zone), tz: zone })
      .then(r => { if (live) setData(r); })
      .catch(e => { if (e.status === 401) navigate('/login'); else if (live) setError(e.message); });
    return () => { live = false; };
  }, [sign, period, zone, navigate]);

  const lang = data?.lang ?? 'en';
  const shown = data && data.sign === sign && data.period === period ? data : null;
  const strengthMarks = shown ? '▪'.repeat(shown.strength) + '▫'.repeat(5 - shown.strength) : '';

  return (
    <div style={{ minHeight: '100vh', background: NAVY, color: INK, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', fontFamily: "'Instrument Sans',Helvetica,Arial,sans-serif" }}>
      <style>{CSS}</style>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}><Starfield /></div>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'rgba(28,37,56,.42)' }} />

      <header style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '18px 24px', borderBottom: '1px solid rgba(244,236,220,.2)', maxWidth: 1200, width: '100%', margin: '0 auto' }}>
        <Link to="/natal-chart" style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', borderBottom: 'none' }}>← Chart</Link>
        <Link to="/" style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 18, letterSpacing: '.14em', textTransform: 'uppercase', borderBottom: 'none' }}>AstroMeridian</Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: MUTED }}>{shown?.labels.ephemeris ?? 'Ephemeris'}</span>
          <NavMenu current="Daily Horoscope" />
        </div>
      </header>

      <main style={{ position: 'relative', flex: 1, width: '100%', maxWidth: 1200, margin: '0 auto', padding: '0 0 56px' }}>

        <section style={{ padding: '20px 16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, padding: '0 2px 9px', borderBottom: '1px solid rgba(244,236,220,.25)' }}>
            <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: MUTED }}>{shown?.labels.selectSign ?? 'Select a sign'}</span>
            <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.08em', color: COP }}>{shown ? `${shown.range} · ${shown.labels.ruledBy} ${shown.ruler}` : ''}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', borderLeft: '1px solid rgba(244,236,220,.2)', borderTop: '1px solid rgba(244,236,220,.2)' }}>
            {SIGNS.map(s => {
              const active = s === sign;
              return (
                <button key={s} type="button" onClick={() => setSign(s)} title={s.charAt(0).toUpperCase() + s.slice(1)} aria-pressed={active} className={active ? '' : 'hor-sign'} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, aspectRatio: '1 / 1', background: active ? INK : 'transparent', border: 'none', borderRight: '1px solid rgba(244,236,220,.2)', borderBottom: '1px solid rgba(244,236,220,.2)', cursor: 'pointer', padding: '6px 2px' }}>
                  <span style={{ width: '100%', maxWidth: 30, display: 'block' }}><Glyph sign={s} active={active} /></span>
                  <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '.1em', textTransform: 'uppercase', color: active ? 'rgba(28,37,56,.8)' : MUTED }}>{ABBR[s]}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section style={{ padding: '24px 24px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: COP }}>{shown ? dateLine(period, shown.span, lang) : ' '}</span>
              <h1 style={{ margin: 0, fontFamily: SERIF, fontWeight: 500, fontSize: 'clamp(30px,7.6vw,42px)', lineHeight: 1.04 }}>{shown?.signName ?? ' '}</h1>
            </div>
            <div style={{ display: 'flex', border: `1px solid ${INK}` }}>
              {PERIODS.map((key, i) => (
                <button key={key} type="button" onClick={() => setPeriod(key)} aria-pressed={period === key} style={{ background: period === key ? INK : 'transparent', color: period === key ? NAVY : INK, border: 'none', borderRight: i < PERIODS.length - 1 ? `1px solid ${INK}` : 'none', padding: '9px 12px', cursor: 'pointer', fontFamily: MONO, fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase' }}>{shown?.labels.periods[key] ?? key}</button>
              ))}
            </div>
          </div>

          {error && <div role="alert" style={{ borderLeft: `2px solid ${GOLD}`, background: 'rgba(180,147,63,.12)', padding: '10px 14px', fontSize: 14, lineHeight: 1.45 }}>{error}</div>}

          {shown && (
            <>
              <p style={{ margin: 0, fontFamily: SERIF, fontSize: 'clamp(20px,5.4vw,27px)', lineHeight: 1.36, textWrap: 'pretty', maxWidth: '44ch' }}>{shown.headline}</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', borderLeft: '1px solid rgba(244,236,220,.25)', borderTop: '1px solid rgba(244,236,220,.25)', background: 'rgba(244,236,220,.08)' }}>
                <div style={cell}>
                  <span style={cellLabel}>{shown.labels.mood}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: '0 0 auto', width: 52, height: 26 }}><MoodDial value={shown.mood.value} /></div>
                    <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.04em' }}>{shown.mood.label}</span>
                  </div>
                </div>
                <div style={cell}>
                  <span style={cellLabel}>{shown.labels.luckyNumber}</span>
                  <span style={{ fontFamily: MONO, fontSize: 22, lineHeight: 1 }}>{shown.luckyNumber}</span>
                </div>
                <div style={cell}>
                  <span style={cellLabel}>{shown.labels.luckyColour}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <span style={{ width: 15, height: 15, border: '1px solid rgba(244,236,220,.5)', background: shown.luckyColour.hex, flex: '0 0 auto', display: 'block' }} />
                    <span style={{ fontFamily: MONO, fontSize: 11 }}>{shown.luckyColour.name}</span>
                  </div>
                </div>
                <div style={cell}>
                  <span style={cellLabel}>{shown.labels.moon[period]}</span>
                  <span style={{ fontFamily: MONO, fontSize: 11, lineHeight: 1.35 }}>{shown.moonLine}</span>
                </div>
              </div>
            </>
          )}
        </section>

        {shown && (
          <>
            <section style={{ padding: '24px 24px 0' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, borderBottom: `1px solid ${INK}`, paddingBottom: 9 }}>
                <h2 style={{ margin: 0, fontFamily: SERIF, fontWeight: 500, fontSize: 24 }}>{shown.labels.readings}</h2>
                <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.12em', textTransform: 'uppercase', color: MUTED }}>{shown.labels.strength} {strengthMarks}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '0 32px' }}>
                {shown.categories.map(c => (
                  <article key={c.key} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '17px 0 18px', borderBottom: '1px solid rgba(244,236,220,.22)' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                      <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', color: COP, flex: '0 0 auto', width: 20 }}>{c.numeral}</span>
                      <h3 style={{ margin: 0, flex: 1, fontFamily: SERIF, fontWeight: 500, fontSize: 22, lineHeight: 1.1 }}>{c.title}</h3>
                      <div style={{ display: 'flex', gap: 3, alignItems: 'center', flex: '0 0 auto' }}>
                        {[0, 1, 2, 3, 4].map(k => <span key={k} style={{ width: 6, height: 6, border: `1px solid ${INK}`, background: k < c.score ? INK : 'transparent', display: 'block' }} />)}
                      </div>
                    </div>
                    <p style={{ margin: 0, paddingLeft: 30, fontSize: 15.5, lineHeight: 1.58, color: INK, textWrap: 'pretty' }}>{c.text}</p>
                  </article>
                ))}
              </div>
            </section>

            <section style={{ padding: '26px 24px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ border: '1px solid rgba(244,236,220,.3)', borderLeft: `2px solid ${GOLD}`, background: 'rgba(244,236,220,.08)', padding: '15px 16px', display: 'flex', flexDirection: 'column', gap: 9 }}>
                <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.16em', textTransform: 'uppercase', color: MUTED }}>{shown.labels.why[period]}</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', fontFamily: MONO, fontSize: 11, letterSpacing: '.03em', color: INK }}>
                  {shown.skyNotes.map(s => <span key={s}>{s}</span>)}
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
