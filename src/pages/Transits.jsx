import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Starfield from '../components/Starfield.jsx';
import NavMenu from '../components/NavMenu.jsx';
import { getTransits, listProfiles } from '../lib/api.js';
import { readActive } from '../lib/active-profile.js';
import { BODY_GLYPH } from '../lib/chart-view.js';

/* A port of Transits.dc.html: sixty-day plate, scrubbable timeline, one reading at a time. */

const MONO = "'IBM Plex Mono',monospace";
const SERIF = "'Cormorant Garamond',Georgia,serif";
const SYM = "'Noto Sans Symbols','Segoe UI Symbol',serif";
const INK = '#F4ECDC', MUTED = 'rgba(244,236,220,.68)', COP = '#5F8B7A', GOLD = '#B4933F', NAVY = '#1C2538';
const GL = { ...BODY_GLYPH, asc: 'AC', mc: 'MC', newMoon: '☽', fullMoon: '☽' };
const SOFT = new Set(['trine', 'sextile']);
const SLOW = new Set(['jupiter', 'saturn', 'uranus', 'neptune', 'pluto']);
const RANK = ['I', 'II', 'III', 'IV'];
const LOCALE = { en: 'en-GB' };

const CSS = `
.trt-range{-webkit-appearance:none;appearance:none;background:transparent;width:100%;height:44px;margin:0;cursor:ew-resize}
.trt-range:focus{outline:none}
.trt-range::-webkit-slider-runnable-track{height:1px;background:transparent}
.trt-range::-moz-range-track{height:1px;background:transparent}
.trt-range::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:44px;margin-top:-22px;background:transparent;border:none}
.trt-range::-moz-range-thumb{width:18px;height:44px;background:transparent;border:none;border-radius:0}
.trt-row:hover{background:rgba(244,236,220,.14) !important}
`;

const utc = iso => new Date(`${iso}T00:00:00Z`);
const part = (iso, lang, opts) => new Intl.DateTimeFormat(LOCALE[lang] || lang, { ...opts, timeZone: 'UTC' }).format(utc(iso));
/** "10 Sep", three letters as the design writes them. */
const fmt = (iso, lang) => `${part(iso, lang, { day: '2-digit' })} ${part(iso, lang, { month: 'short' }).replace('.', '').slice(0, 3)}`;
/** "Thu, 10 September 2026" */
const fmtLong = (iso, lang) => part(iso, lang, { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' });

const glyph = key => (GL[key] || '') + (GL[key]?.length === 1 ? '︎' : '');

/** The reading's closing sentence stands on its own line, as the design's second paragraph. */
function paragraphs(e) {
  const closer = `Your ${e.natalName} is where this lands`;
  const i = e.text.lastIndexOf(closer);
  return i > 0 ? [e.text.slice(0, i).trim(), e.text.slice(i)] : [e.text];
}

function Timeline({ days, today, events, day, sel, lang, onPick }) {
  const DAYS = days.length, W = 1000, H = 130, L = 8, R = 992, AX = 78;
  const X = d => L + (R - L) * d / (DAYS - 1);
  const ticks = [];
  days.forEach((iso, d) => {
    const dt = utc(iso), x = X(d);
    const first = dt.getUTCDate() === 1, week = dt.getUTCDay() === 1;
    ticks.push(<line key={'t' + d} x1={x} y1={AX} x2={x} y2={AX + (first ? 16 : week ? 10 : 5)} stroke={INK} strokeWidth={first ? .9 : .6} vectorEffect="non-scaling-stroke" />);
    if (first) ticks.push(<text key={'m' + d} x={x + 5} y={AX + 30} fontSize={11} fill={INK} fontFamily={MONO} letterSpacing={1.2}>{part(iso, lang, { month: 'long' }).toUpperCase()}</text>);
    else if (week) ticks.push(<text key={'w' + d} x={x} y={AX + 24} fontSize={9.5} fill={MUTED} fontFamily={MONO} textAnchor="middle">{String(dt.getUTCDate()).padStart(2, '0')}</text>);
  });
  const cx = X(day);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }} role="img" aria-label="Transit timeline">
      <line x1={L} y1={AX} x2={R} y2={AX} stroke={INK} strokeWidth={1} pathLength={1} strokeDasharray={1} style={{ animation: 'om-draw .7s cubic-bezier(.3,0,.2,1) both' }} />
      <g style={{ animation: 'om-fade .5s ease .35s both' }}>{ticks}</g>
      {events.map((e, i) => {
        const col = SOFT.has(e.aspect) ? GOLD : COP;
        const x0 = X(e.span[0]), x1 = X(e.span[1]), x = X(e.exact);
        const lane = e.weight >= 4 ? 0 : e.weight === 3 ? 1 : 2;
        const y = AX - 14 - lane * 18;
        const selected = sel === e.id;
        return (
          <g key={e.id} style={{ animation: `om-fade .4s ease ${.6 + i * .05}s both`, cursor: 'pointer' }} onClick={() => onPick(e)}>
            <line x1={x0} y1={y} x2={x1} y2={y} stroke={col} strokeWidth={selected ? 1.6 : .8} opacity={selected ? 1 : .7} vectorEffect="non-scaling-stroke" />
            <rect x={x - 14} y={y - 14} width={28} height={28} fill="transparent" />
            {SLOW.has(e.transit)
              ? <rect x={x - 5} y={y - 5} width={10} height={10} fill={selected ? INK : NAVY} stroke={INK} strokeWidth={selected ? 1.4 : .9} vectorEffect="non-scaling-stroke" />
              : <circle cx={x} cy={y} r={selected ? 4.5 : 3.2} fill={INK} />}
            <text x={x} y={y - 11} fontSize={12} fill={INK} textAnchor="middle" fontFamily={SYM} style={{ display: e.weight >= 3 || selected ? 'block' : 'none' }}>{glyph(e.transit)}</text>
          </g>
        );
      })}
      <g style={{ animation: 'om-fade .4s ease 1s both' }}>
        <line x1={X(today)} y1={14} x2={X(today)} y2={AX + 18} stroke={GOLD} strokeWidth={.7} strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
        <text x={X(today)} y={9} fontSize={8.5} fill={GOLD} fontFamily={MONO} textAnchor="middle" letterSpacing={1}>TODAY</text>
      </g>
      <g style={{ transition: 'transform .12s linear', transform: `translateX(${cx}px)` }}>
        <line x1={0} y1={2} x2={0} y2={AX + 20} stroke={INK} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
        <path d={`M-6 ${AX + 20} L6 ${AX + 20} L0 ${AX + 28} Z`} fill={INK} />
        <rect x={-26} y={AX + 34} width={52} height={16} fill={INK} />
        <text x={0} y={AX + 45} fontSize={9.5} fill={NAVY} fontFamily={MONO} textAnchor="middle" letterSpacing={.8}>{fmt(days[day], lang).toUpperCase()}</text>
      </g>
    </svg>
  );
}

const lbl9 = { fontFamily: MONO, fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: MUTED };
const cell = { display: 'flex', flexDirection: 'column', gap: 4, padding: '12px 16px', borderRight: '1px solid rgba(244,236,220,.25)' };
const legendLine = { fontFamily: MONO, fontSize: 9.5, letterSpacing: '.12em', textTransform: 'uppercase', color: MUTED };

export default function Transits() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [day, setDay] = useState(0);
  const [sel, setSel] = useState(null);

  useEffect(() => {
    let live = true;
    listProfiles()
      .then(profiles => {
        if (!profiles.length) { navigate('/birth-details'); return null; }
        const wanted = readActive();
        const p = profiles.find(q => q._id === wanted) || profiles.find(q => q.isPrimary) || profiles[0];
        if (live) setProfile(p);
        return getTransits(p._id);
      })
      .then(t => {
        if (!live || !t) return;
        setData(t);
        setDay(t.today);
        // open on what matters most today, as the design does
        const now = t.events.filter(e => t.today >= e.span[0] && t.today <= e.span[1]);
        setSel((now[0] ?? t.events[0])?.id ?? null);
      })
      .catch(e => {
        if (e.status === 401) { navigate('/login'); return; }
        if (live) setError(e.message);
      });
    return () => { live = false; };
  }, [navigate]);

  const lang = data?.lang ?? 'en';
  const days = data?.days ?? [];
  const TODAY = data?.today ?? 0;
  const events = data?.events ?? [];

  /* In orb on the chosen day, strongest and closest to exact first. Distances
     are counted to the real exact date, which may lie beyond the plate. */
  const daysUntil = e => Math.round((utc(e.exactDate) - utc(days[day] ?? e.exactDate)) / 86400000);
  const reach = e => Math.max(e.exact - e.span[0], e.span[1] - e.exact, 1);
  const withOrb = events
    .map(e => ({ e, dist: Math.abs(daysUntil(e)) }))
    .filter(({ e }) => day >= e.span[0] && day <= e.span[1]);
  const score = ({ e, dist }) => e.weight * (1 - dist / reach(e));
  withOrb.sort((a, b) => score(b) - score(a) || b.e.weight - a.e.weight);
  const active = withOrb.slice(0, 4);
  const selected = events.find(e => e.id === sel);
  const pick = e => { setSel(e.id); setDay(e.exact); };

  const dist = selected ? -daysUntil(selected) : 0;
  const inOrb = selected ? day >= selected.span[0] && day <= selected.span[1] : false;
  const fullName = profile ? `${profile.firstName} ${profile.lastName}` : '';

  return (
    <div style={{ minHeight: '100vh', background: NAVY, color: INK, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', fontFamily: "'Instrument Sans',Helvetica,Arial,sans-serif" }}>
      <style>{CSS}</style>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}><Starfield /></div>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'rgba(28,37,56,.42)' }} />

      <header style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '18px 24px', borderBottom: '1px solid rgba(244,236,220,.2)', maxWidth: 1200, width: '100%', margin: '0 auto' }}>
        <Link to="/natal-chart" style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', borderBottom: 'none', whiteSpace: 'nowrap' }}>← Chart</Link>
        <Link to="/" style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 18, letterSpacing: '.14em', textTransform: 'uppercase', borderBottom: 'none' }}>AstroMeridian</Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: MUTED }}>Plate III</span>
          <NavMenu current="Transits" />
        </div>
      </header>

      <main style={{ position: 'relative', flex: 1, width: '100%', maxWidth: 1200, margin: '0 auto', padding: '26px 0 56px', display: 'flex', flexDirection: 'column', gap: 26 }}>
        {error && <div role="alert" style={{ margin: '0 24px', borderLeft: `2px solid ${GOLD}`, background: 'rgba(180,147,63,.12)', padding: '10px 14px', fontSize: 14, lineHeight: 1.45 }}>{error}</div>}

        {data && (
          <>
            <section style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: COP }}>Transits to the natal chart · {fullName}</span>
                  <h1 style={{ margin: 0, fontFamily: SERIF, fontWeight: 500, fontSize: 'clamp(30px,7.6vw,42px)', lineHeight: 1.04 }}>{fmtLong(days[day], lang)}</h1>
                </div>
                <button type="button" onClick={() => setDay(TODAY)} className="hov-wash" style={{ background: 'transparent', border: '1px solid rgba(244,236,220,.4)', borderRadius: 2, padding: '8px 12px', cursor: 'pointer', color: INK, fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase' }}>{day === TODAY ? 'Today' : 'Back to today'}</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', borderTop: `1px solid ${INK}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '9px 0 4px', fontFamily: MONO, fontSize: 9.5, letterSpacing: '.14em', textTransform: 'uppercase', color: MUTED }}>
                  <span>Active influences · by significance</span>
                  <span>{withOrb.length ? `${withOrb.length} within orb` : 'none within orb'}</span>
                </div>
                {active.map(({ e, dist: d }, k) => {
                  const exact = d === 0, applying = daysUntil(e) > 0;
                  return (
                    <button key={e.id} type="button" onClick={() => setSel(e.id)} className="trt-row" style={{ display: 'grid', gridTemplateColumns: '20px 1fr auto', alignItems: 'center', gap: 12, width: '100%', background: sel === e.id ? 'rgba(244,236,220,.08)' : 'transparent', border: 'none', borderBottom: '1px solid rgba(244,236,220,.2)', padding: '12px 6px', cursor: 'pointer', textAlign: 'left', color: INK, font: 'inherit' }}>
                      <span style={{ fontFamily: MONO, fontSize: 10, color: COP }}>{RANK[k]}</span>
                      <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                        <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: SYM, fontSize: 15, letterSpacing: '.06em' }}>{glyph(e.transit)} {e.glyph} {glyph(e.natal)}</span>
                          <span style={{ fontFamily: SERIF, fontSize: 20, lineHeight: 1.1 }}>{e.title}</span>
                        </span>
                        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.06em', color: MUTED }}>{exact ? 'Exact today' : `${d}d ${applying ? 'before' : 'after'} exact · ${fmt(e.exactDate, lang)}`}</span>
                      </span>
                      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
                        <span style={{ display: 'flex', gap: 3 }}>
                          {[0, 1, 2, 3, 4].map(p => <span key={p} style={{ width: 6, height: 6, border: `1px solid ${INK}`, background: p < e.weight ? INK : 'transparent', display: 'block' }} />)}
                        </span>
                        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', color: exact ? GOLD : applying ? COP : MUTED }}>{exact ? 'Exact' : applying ? 'Applying' : 'Separating'}</span>
                      </span>
                    </button>
                  );
                })}
                {!withOrb.length && (
                  <div style={{ padding: '16px 6px', fontSize: 14, color: MUTED, borderBottom: '1px solid rgba(244,236,220,.2)' }}>{data.labels.quiet}</div>
                )}
              </div>
            </section>

            <section style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '0 24px', fontFamily: MONO, fontSize: 9.5, letterSpacing: '.14em', textTransform: 'uppercase', color: MUTED }}>
                <span>{fmt(days[0], lang)}</span>
                <span style={{ color: COP }}>Drag to scrub · tap a marker</span>
                <span>{fmt(days[days.length - 1], lang)}</span>
              </div>
              <div style={{ position: 'relative', padding: '0 24px' }}>
                <div style={{ position: 'relative', height: 130 }}>
                  <Timeline days={days} today={TODAY} events={events} day={day} sel={sel} lang={lang} onPick={pick} />
                </div>
                <input type="range" className="trt-range" min={0} max={days.length - 1} step={1} value={day} onChange={e => setDay(+e.target.value)} onInput={e => setDay(+e.target.value)} aria-label="Scrub date" style={{ position: 'absolute', left: 24, right: 24, width: 'calc(100% - 48px)', top: 56, height: 44 }} />
              </div>
            </section>

            <section style={{ padding: '0 24px' }}>
              {selected && (
                <article key={selected.id} style={{ border: `1px solid ${INK}`, background: 'rgba(244,236,220,.08)', display: 'flex', flexDirection: 'column', animation: 'om-rise .3s cubic-bezier(.3,0,.2,1) both' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', borderBottom: `1px solid ${INK}` }}>
                    <div style={cell}>
                      <span style={lbl9}>Transiting</span>
                      <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><span style={{ fontFamily: SYM, fontSize: 18 }}>{glyph(selected.transit)}</span><span style={{ fontFamily: SERIF, fontSize: 22 }}>{selected.transitName}</span></span>
                    </div>
                    <div style={cell}>
                      <span style={lbl9}>Aspect</span>
                      <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><span style={{ fontFamily: MONO, fontSize: 16, color: SOFT.has(selected.aspect) ? GOLD : COP }}>{selected.glyph}</span><span style={{ fontFamily: SERIF, fontSize: 22 }}>{selected.aspectName}</span></span>
                    </div>
                    <div style={{ ...cell, borderRight: 'none' }}>
                      <span style={lbl9}>Natal point</span>
                      <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><span style={{ fontFamily: SYM, fontSize: 18 }}>{glyph(selected.natal)}</span><span style={{ fontFamily: SERIF, fontSize: 22 }}>{selected.natalName}</span></span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', padding: '12px 16px', borderBottom: '1px solid rgba(244,236,220,.25)', fontFamily: MONO, fontSize: 10.5, letterSpacing: '.04em', color: INK }}>
                    <span>Exact {fmt(selected.exactDate, lang)} {selected.exactDate.slice(0, 4)}</span>
                    <span style={{ color: MUTED }}>In orb {fmt(days[selected.span[0]], lang)} – {fmt(days[selected.span[1]], lang)}</span>
                    <span style={{ color: MUTED }}>{selected.natalName} {selected.natalPos}</span>
                    <span style={{ color: COP }}>{dist === 0 ? 'Exact on the selected day' : !inOrb ? `Out of orb on ${fmt(days[day], lang)}` : `${Math.abs(dist)}d ${dist < 0 ? 'applying' : 'separating'} on ${fmt(days[day], lang)}`}</span>
                  </div>
                  <div style={{ padding: '18px 16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <h2 style={{ margin: 0, fontFamily: SERIF, fontWeight: 500, fontSize: 'clamp(22px,5.4vw,28px)', lineHeight: 1.2, textWrap: 'balance' }}>{selected.lede}</h2>
                    {paragraphs(selected).map((p, i) => <p key={i} style={{ margin: 0, fontSize: 15.5, lineHeight: 1.6, textWrap: 'pretty', maxWidth: '60ch' }}>{p}</p>)}
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', borderTop: '1px solid rgba(244,236,220,.22)', paddingTop: 12 }}>
                      <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: GOLD, flex: '0 0 auto', paddingTop: 3, whiteSpace: 'nowrap' }}>To do</span>
                      <span style={{ fontSize: 14, lineHeight: 1.5, color: MUTED }}>{selected.advice}</span>
                    </div>
                  </div>
                </article>
              )}
            </section>

            <section style={{ padding: '0 24px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px', ...legendLine, borderTop: '1px solid rgba(244,236,220,.25)', paddingTop: 12 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 14, height: 1, background: COP, display: 'block' }} />Hard aspect</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 14, height: 1, background: GOLD, display: 'block' }} />Flowing aspect</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, border: `1px solid ${INK}`, display: 'block' }} />Outer planet · slow</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 5, height: 5, background: INK, display: 'block' }} />Inner planet · quick</span>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
