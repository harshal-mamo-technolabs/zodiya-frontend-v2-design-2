import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Starfield from '../components/Starfield.jsx';
import NavMenu from '../components/NavMenu.jsx';
import { getChart, listProfiles, placeDetails, searchPlaces } from '../lib/api.js';
import { registerPage } from '../lib/pageActions.js';
import { readActive } from '../lib/active-profile.js';
import { isoToInput } from '../lib/date-input.js';
import { ANGLES, BODIES, DESTINATIONS, MEANINGS, OUTER, PLANETS, THEMES, bestPlace, computeLines, fmtCoord, fmtGmst, nearby, placeName } from '../lib/astromap.js';
import { t } from '../i18n/index.js';

const MONO = "'IBM Plex Mono',monospace";
const SERIF = "'Cormorant Garamond',Georgia,serif";
const SYM = "'Noto Sans Symbols','Segoe UI Symbol','Apple Symbols',serif";
const INK = '#1C2538', CREAM = '#F4ECDC', GOLD = '#B4933F';
const ORB_KM = 800;
const mono = (size, extra) => ({ fontFamily: MONO, fontSize: size, letterSpacing: '.12em', textTransform: 'uppercase', ...extra });
const rise = delay => ({ animation: `om-rise .6s cubic-bezier(.3,0,.2,1) ${delay}s both` });
const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
const touch = () => { try { return matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } };
/* The how-to card shows until the reader first moves the globe, once per browser. */
const GUIDE_KEY = 'meridian_globe_guided';
const guided = () => { try { return localStorage.getItem(GUIDE_KEY) === '1'; } catch (e) { return false; } };
const markGuided = () => { try { localStorage.setItem(GUIDE_KEY, '1'); } catch (e) {} };

const corner = (v, h) => ({ position: 'absolute', [v]: 0, [h]: 0, width: 14, height: 14, pointerEvents: 'none', [`border${v[0].toUpperCase() + v.slice(1)}`]: '1px solid rgba(180,147,63,.7)', [`border${h[0].toUpperCase() + h.slice(1)}`]: '1px solid rgba(180,147,63,.7)' });
const ctrl = { width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(28,37,56,.78)', border: '1px solid rgba(244,236,220,.3)', color: CREAM, cursor: 'pointer', padding: 0, fontFamily: MONO, fontSize: 16, lineHeight: 1 };

/* The globe in its own component: three.js loads only when this page opens. */
function GlobeView({ lines, hidden, birth, sel, onPick, onHome, flyRef }) {
  const host = useRef(null), canvas = useRef(null), globe = useRef(null);
  const [state, setState] = useState('raising'); // raising | drawing | ready | failed
  const [guide, setGuide] = useState(() => !guided());
  const done = () => { setGuide(false); markGuided(); };
  const pickRef = useRef(onPick); pickRef.current = onPick;

  useEffect(() => {
    let dead = false;
    import('../lib/globe.js').then(({ Globe }) => {
      if (dead) return;
      globe.current = new Globe(canvas.current, host.current, { onPick: p => pickRef.current(p), onLoaded: () => setState('ready'), onInteract: done, reducedMotion: reduced() });
      setState(s => (s === 'ready' ? s : 'drawing'));
    }).catch(() => { if (!dead) setState('failed'); }); // no WebGL, or the chunk failed to load
    return () => { dead = true; if (globe.current) globe.current.destroy(); globe.current = null; };
  }, []);

  const up = state === 'drawing' || state === 'ready';
  useEffect(() => { if (up && lines.length) globe.current.setLines(lines, birth); }, [up, lines, birth]);
  useEffect(() => { if (up) globe.current.setHidden(hidden); }, [up, hidden, lines]);
  useEffect(() => { if (up) globe.current.setSelected(sel ? sel.lat : null, sel ? sel.lon : null); }, [up, sel, lines]);
  flyRef.current = (lat, lon) => { if (globe.current) globe.current.flyTo(lat, lon); };

  const status = state === 'failed' ? t('Globe unavailable — WebGL needed') : state === 'raising' ? t('Raising the globe…') : state === 'drawing' ? t('Drawing the coastlines…') : !lines.length ? t('Casting your lines…') : null;
  return (
    <div ref={host} style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', maxHeight: '78vh' }}>
      <div style={{ position: 'absolute', inset: '-6%', borderRadius: '50%', background: 'radial-gradient(circle,rgba(180,147,63,.12) 0%,rgba(180,147,63,0) 62%)', pointerEvents: 'none' }} />
      <canvas ref={canvas} aria-label={t('Globe with your planetary lines. Tap a place for a reading.')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', touchAction: 'none', cursor: 'grab', outline: 'none' }} />
      {/* a frame and a label, so the box reads as something to handle */}
      <span style={corner('top', 'left')} /><span style={corner('top', 'right')} /><span style={corner('bottom', 'left')} /><span style={corner('bottom', 'right')} />
      <span style={{ position: 'absolute', top: 10, left: 12, pointerEvents: 'none', ...mono(9, { letterSpacing: '.16em', color: 'rgba(244,236,220,.5)' }) }}>{t('Interactive globe')}</span>
      {up && (
        <div role="group" aria-label={t('Globe controls')} style={{ position: 'absolute', right: 10, bottom: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button type="button" className="hov-wash-cream" onClick={() => globe.current.zoom(0.8)} aria-label={t('Zoom in')} title={t('Zoom in')} style={ctrl}>+</button>
          <button type="button" className="hov-wash-cream" onClick={() => globe.current.zoom(1.25)} aria-label={t('Zoom out')} title={t('Zoom out')} style={ctrl}>−</button>
          {birth && <button type="button" className="hov-wash-cream" onClick={() => { done(); onHome(); }} aria-label={t('Back to birthplace')} title={t('Back to birthplace')} style={{ ...ctrl, color: GOLD, fontSize: 14 }}>◎</button>}
        </div>
      )}
      {guide && !status && (
        <div style={{ position: 'absolute', left: '50%', bottom: 12, transform: 'translateX(-50%)', width: 'min(300px, calc(100% - 80px))', display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 16px', border: '1px solid rgba(180,147,63,.55)', background: 'rgba(20,27,45,.88)', boxShadow: '0 12px 30px rgba(0,0,0,.35)', animation: 'om-rise .5s cubic-bezier(.3,0,.2,1) .3s both' }}>
          <span style={mono(9, { letterSpacing: '.16em', color: GOLD })}>{t('How to read the globe')}</span>
          {[['⟲', touch() ? t('Drag with one finger to turn the Earth') : t('Drag to turn the Earth')],
            ['±', touch() ? t('Pinch, or use + and −, to zoom') : t('Scroll, or use + and −, to zoom')],
            ['◉', t('Tap any place to read the lines that pass near it')]].map(([icon, text]) => (
            <span key={icon} style={{ display: 'flex', alignItems: 'baseline', gap: 10, fontSize: 13, lineHeight: 1.4, color: 'rgba(244,236,220,.86)' }}>
              <span aria-hidden="true" style={{ width: 16, flex: '0 0 auto', textAlign: 'center', fontFamily: SYM, color: GOLD }}>{icon}</span>{text}
            </span>
          ))}
          <button type="button" onClick={done} className="hov-cream-text" style={{ alignSelf: 'flex-end', background: 'transparent', border: 'none', padding: '2px 0 0', cursor: 'pointer', ...mono(9.5, { letterSpacing: '.14em', color: 'rgba(244,236,220,.7)' }) }}>{t('Got it')}</button>
        </div>
      )}
      {status && (
        <div style={{ position: 'absolute', left: '50%', bottom: '8%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', border: '1px solid rgba(244,236,220,.25)', background: 'rgba(28,37,56,.7)', pointerEvents: 'none', animation: 'om-fade .3s ease both', whiteSpace: 'nowrap' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: GOLD, animation: 'om-glow 1.4s ease-in-out infinite' }} />
          <span style={mono(9.5, { letterSpacing: '.16em', color: 'rgba(244,236,220,.8)' })}>{status}</span>
        </div>
      )}
    </div>
  );
}

export default function Astrocartography() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [hidden, setHidden] = useState(OUTER);
  const [sel, setSel] = useState(null); // { lat, lon, name }
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [missed, setMissed] = useState(''); // why the last search found nothing
  const [found, setFound] = useState(null);
  const [hits, setHits] = useState([]);
  const [focused, setFocused] = useState(false); // the last searched place, shown first among the destinations
  const fly = useRef(() => {});
  const panel = useRef(null);
  const pickId = useRef(0);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const profiles = await listProfiles();
        if (!profiles.length) { navigate('/birth-details'); return; }
        const wanted = readActive();
        const chosen = profiles.find(p => p._id === wanted) || profiles.find(p => p.isPrimary) || profiles[0];
        const payload = await getChart(chosen._id);
        if (live) setData(payload);
      } catch (e) {
        if (e.status === 401) { navigate('/login'); return; }
        if (live) setError(e.message);
      }
    })();
    return () => { live = false; };
  }, [navigate]);

  const lines = useMemo(() => (data ? computeLines(data.chart) : []), [data]);
  const birth = useMemo(() => (data ? { lat: data.chart.meta.lat, lon: data.chart.meta.lon } : null), [data]);
  const visible = useMemo(() => lines.filter(l => !hidden.includes(l.planet)), [lines, hidden]);
  const place = data ? [data.profile.city, data.profile.country].filter(Boolean).join(', ') : '';
  // every theme's closest city, from all lines (hiding a chip doesn't change where life is)
  const best = useMemo(() => THEMES.map(th => ({ ...th, at: lines.length ? bestPlace(lines, th, ORB_KM) : null })), [lines]);

  /* A tap on the globe names itself from OpenStreetMap; a destination brings its own name. */
  const pick = ({ lat, lon }, name) => {
    const id = ++pickId.current;
    setSel({ lat, lon, name: name || null });
    if (!name) placeName(lat, lon).then(n => { if (n && pickId.current === id) setSel(s => ({ ...s, name: n })); }).catch(() => {});
  };
  const go = (lat, lon, name) => { fly.current(lat, lon); pick({ lat, lon }, name); };
  const goHome = () => { if (birth) go(birth.lat, birth.lon, t('{place} · birthplace', { place: place || t('Birthplace') })); };

  // open on the birthplace's own reading, so the panel is never empty; the globe already faces it
  useEffect(() => {
    if (birth && !sel) pick(birth, t('{place} · birthplace', { place: place || t('Birthplace') }));
  }, [birth]); // eslint-disable-line react-hooks/exhaustive-deps

  /* City suggestions while typing, from the same Google Places lookup as the
     birth-place picker (the API proxies it, so the key stays server-side). */
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2 || (found && found.full === query)) { setHits([]); return; }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      searchPlaces(q, controller.signal).then(setHits).catch(e => { if (e.name !== 'AbortError') setHits([]); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, found]);

  /* The voice astrologer's astrocartography tool: find the place, turn the globe
     to it, and answer with the lines on screen near it (never a guessed one). */
  const live = useRef({});
  live.current = { visible, go };
  useEffect(() => registerPage('astrocartography', async ({ place: asked } = {}) => {
    const q = String(asked || '').trim();
    if (!q) return 'No place was named. Nothing was shown.';
    let hit;
    try { [hit] = await searchPlaces(q); } catch (e) { return `Could not look up "${q}" right now.`; }
    if (!hit) return `No city called "${q}" was found. Ask the user for a city name.`;
    const p = await placeDetails(hit.placeId);
    const name = [p.city, p.country].filter(Boolean).join(', ') || hit.description;
    live.current.go(p.lat, p.lon, name);
    const near = nearby(live.current.visible, p.lat, p.lon, ORB_KM).slice(0, 4);
    if (!near.length) return `The globe now shows ${name}. No planet line passes within ${ORB_KM} km: open sky there, calm, neither charged nor difficult.`;
    return `The globe now shows ${name}. Lines within ${ORB_KM} km, strongest first: ${near.map(r => `${PLANETS[r.planet].name} on the ${ANGLES[r.angle].name} (${ANGLES[r.angle].verb}), ${Math.round(r.km)} km away: ${MEANINGS[r.planet][r.angle]}`).join(' ')}`;
  }), []);

  const open = async hit => {
    setHits([]); setFocused(false); setSearching(true); setMissed('');
    try {
      const p = await placeDetails(hit.placeId);
      const name = [p.city, p.country].filter(Boolean).join(', ') || hit.description;
      setQuery(name);
      setFound({ name: p.city || name, full: name, lat: p.lat, lon: p.lon });
      go(p.lat, p.lon, name);
      // on phones the reading sits above this section: bring it into view
      const box = panel.current && panel.current.getBoundingClientRect();
      if (box && (box.top < 0 || box.top > window.innerHeight)) panel.current.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
    } catch (err) { setMissed(err.message || t('No place found by that name.')); }
    finally { setSearching(false); }
  };

  /* Find (or Enter) takes the top suggestion, looking it up first if none has arrived yet. */
  const search = async e => {
    e.preventDefault();
    const q = query.trim(); if (q.length < 2 || searching) return;
    if (hits[0]) return open(hits[0]);
    setSearching(true); setMissed('');
    try {
      const [hit] = await searchPlaces(q);
      if (hit) return await open(hit);
      setMissed(t('No place found by that name.'));
    } catch (err) { setMissed(err.message || t('No place found by that name.')); }
    finally { setSearching(false); }
  };

  const reading = sel ? nearby(visible, sel.lat, sel.lon, ORB_KM).slice(0, 5) : [];
  const summary = (lat, lon) => { const r = nearby(visible, lat, lon, ORB_KM).slice(0, 2); return r.length ? r.map(x => `${PLANETS[x.planet].glyph} ${x.angle}`).join(' · ') : t('open sky'); };
  const dests = [
    ...(birth ? [{ name: (place || t('Birthplace')).split(',')[0], lat: birth.lat, lon: birth.lon, birth: true }] : []),
    ...(found ? [found] : []),
    ...DESTINATIONS.map(d => ({ ...d, name: t(d.name) }))
  ];
  const first = data ? data.profile.name.split(' ')[0] : '';

  return (
    <div className="ac-shell" style={{ minHeight: '100vh', background: INK, color: CREAM, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}><Starfield /></div>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'linear-gradient(180deg,rgba(28,37,56,.35) 0%,rgba(28,37,56,.62) 55%,rgba(28,37,56,.82) 100%)' }} />

      <header style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '18px 24px', borderBottom: '1px solid rgba(244,236,220,.2)', maxWidth: 1200, width: '100%', margin: '0 auto' }}>
        <Link to="/" className="hdr-logo" style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 18, letterSpacing: '.14em', textTransform: 'uppercase', borderBottom: 'none' }}>AstroMeridian</Link>
        <NavMenu current="Astrocartography" />
      </header>

      <main className="ac-cols" style={{ position: 'relative', width: '100%', maxWidth: 1200, margin: '0 auto', padding: '32px 22px 56px', display: 'grid', rowGap: 40 }}>

        <section className="ac-hero" style={{ gridArea: 'hero', display: 'flex', flexDirection: 'column', gap: 22, ...rise(.05) }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <span style={mono(9.5, { letterSpacing: '.18em', color: GOLD })}>{t('Astrocartography · relocation astrology')}</span>
            <h1 style={{ margin: 0, maxWidth: '11ch', fontFamily: SERIF, fontWeight: 400, fontSize: 42, lineHeight: 1.02, letterSpacing: '-.01em', textWrap: 'balance' }}>{t('Where your sky')} <em style={{ fontStyle: 'italic' }}>{t('meets the ground')}</em>.</h1>
          </div>
          <p style={{ margin: 0, maxWidth: '44ch', fontSize: 15, lineHeight: 1.6, color: 'rgba(244,236,220,.74)', textWrap: 'pretty' }}>{t('Your birth chart, cast across the Earth. Every line marks where a planet was rising, setting, overhead or underfoot at the moment you were born — and what that place would ask of you.')}</p>
        </section>

        <section className="ac-globe" style={{ gridArea: 'globe', display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0, ...rise(.15) }}>
          {error && <div role="alert" style={{ borderLeft: `2px solid ${GOLD}`, background: 'rgba(180,147,63,.12)', padding: '10px 14px', fontSize: 14, lineHeight: 1.45 }}>{error}</div>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {BODIES.map(b => {
              const on = !hidden.includes(b), P = PLANETS[b];
              return (
                <button key={b} type="button" className="ac-chip" aria-pressed={on} onClick={() => setHidden(h => (on ? [...h, b] : h.filter(x => x !== b)))}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 11px 6px 9px', borderRadius: 999, border: `1px solid ${on ? P.color + '99' : 'rgba(244,236,220,.25)'}`, background: 'rgba(28,37,56,.55)', color: CREAM, cursor: 'pointer', opacity: on ? 1 : .42, transition: 'opacity .2s ease,border-color .2s ease', ...mono(9.5) }}>
                  <span style={{ fontFamily: SYM, fontSize: 14, lineHeight: 1, color: P.color }}>{P.glyph}</span>
                  <span>{t(P.name)}</span>
                </button>
              );
            })}
          </div>
          <GlobeView lines={lines} hidden={hidden} birth={birth} sel={sel} onPick={p => pick(p)} onHome={goHome} flyRef={fly} />
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px 24px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px' }}>
              {[['solid', t('Rising · Culminating')], ['dashed', t('Setting · Nadir')]].map(([kind, label]) => (
                <span key={kind} style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 22, height: 0, borderTop: `2px ${kind} rgba(244,236,220,.85)` }} /><span style={mono(9.5, { color: 'rgba(244,236,220,.6)' })}>{label}</span></span>
              ))}
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: GOLD, boxShadow: '0 0 8px rgba(180,147,63,.8)' }} /><span style={mono(9.5, { color: 'rgba(244,236,220,.6)' })}>{t('Birthplace')}</span></span>
            </div>
            <span style={mono(9.5, { color: 'rgba(244,236,220,.38)' })}>{touch() ? t('Drag to turn · pinch to zoom · tap for a reading') : t('Drag to turn · scroll to zoom · tap for a reading')}</span>
          </div>
        </section>

        <div style={{ gridArea: 'side', display: 'flex', flexDirection: 'column', gap: 40, minWidth: 0 }}>
        <aside ref={panel} className="ac-panel" aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0, scrollMarginTop: 16, padding: '20px 20px 18px', border: '1px solid rgba(244,236,220,.16)', background: 'rgba(17,23,37,.55)', ...rise(.25) }}>
          <span style={mono(9.5, { letterSpacing: '.16em', color: 'rgba(244,236,220,.45)' })}>{t('Reading')}</span>
          {sel ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <h2 style={{ margin: 0, fontFamily: SERIF, fontWeight: 400, fontSize: 32, lineHeight: 1.05, letterSpacing: '-.01em', textWrap: 'balance' }}>{sel.name || fmtCoord(sel.lat, sel.lon)}</h2>
                <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', color: 'rgba(244,236,220,.55)' }}>{fmtCoord(sel.lat, sel.lon)}</span>
              </div>
              {reading.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {reading.map(r => {
                    const P = PLANETS[r.planet], A = ANGLES[r.angle];
                    return (
                      <article key={r.planet + r.angle} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '18px 0', borderTop: '1px solid rgba(244,236,220,.13)', animation: 'om-rise .4s cubic-bezier(.3,0,.2,1) both' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                          <span style={{ fontFamily: SYM, fontSize: 22, lineHeight: 1, color: P.color, filter: `drop-shadow(0 0 6px ${P.color})` }}>{P.glyph}</span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 0 }}>
                            <span style={{ fontFamily: SERIF, fontSize: 21, lineHeight: 1.1 }}>{t(`{planet} on the ${A.name}`, { planet: t(P.name) })}</span>
                            <span style={mono(9.5, { letterSpacing: '.1em', color: 'rgba(244,236,220,.5)' })}>{t('{verb} · {km} km off the line', { verb: t(A.verb), km: Math.round(r.km) })}</span>
                          </div>
                        </div>
                        <span style={{ display: 'block', height: 2, background: 'rgba(244,236,220,.14)', position: 'relative' }}><span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.round(r.strength * 100)}%`, background: P.color, display: 'block', transition: 'width .5s cubic-bezier(.3,0,.2,1)' }} /></span>
                        <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.55, color: 'rgba(244,236,220,.82)', textWrap: 'pretty' }}>{t(MEANINGS[r.planet][r.angle])}</p>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p style={{ margin: 0, paddingTop: 16, borderTop: '1px solid rgba(244,236,220,.13)', fontFamily: SERIF, fontStyle: 'italic', fontSize: 19, lineHeight: 1.45, color: 'rgba(244,236,220,.8)', textWrap: 'pretty' }}>{t('Open sky. No planetary line within {orb} — neither charged nor difficult. A place to simply be.', { orb: `${ORB_KM} km` })}</p>
              )}
            </>
          ) : (
            <p style={{ margin: 0, fontFamily: SERIF, fontStyle: 'italic', fontSize: 19, lineHeight: 1.45, color: 'rgba(244,236,220,.8)', textWrap: 'pretty' }}>{t('Tap anywhere on the globe, or choose a destination, to read what your lines make of a place.')}</p>
          )}
          <p style={{ margin: 0, fontFamily: MONO, fontSize: 9.5, letterSpacing: '.1em', lineHeight: 1.7, color: 'rgba(244,236,220,.38)' }}>{t('Orb {orb} · strength falls with distance', { orb: `${ORB_KM} km` })}</p>
        </aside>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0, ...rise(.3) }}>
          <h2 style={{ margin: 0, fontFamily: SERIF, fontWeight: 500, fontSize: 24, letterSpacing: '.01em' }}>{t('Best places for you')}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 8 }}>
            {best.map(b => (
              <button key={b.key} type="button" className="ac-dest" disabled={!b.at} onClick={() => b.at && go(b.at.lat, b.at.lon, t(b.at.name))}
                style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 13px', border: '1px solid rgba(244,236,220,.2)', background: 'rgba(17,23,37,.4)', color: CREAM, cursor: b.at ? 'pointer' : 'default', textAlign: 'left', minWidth: 0 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, ...mono(9.5, { color: GOLD }) }}><span style={{ fontFamily: SYM, fontSize: 14 }}>{b.glyph + '\uFE0E'}</span>{t(b.label)}</span>
                <span style={{ fontFamily: SERIF, fontSize: 19, lineHeight: 1.1 }}>{b.at ? t(b.at.name) : t('No strong line nearby')}</span>
                {b.at && <span style={{ fontFamily: `${SYM},${MONO}`, fontSize: 10, letterSpacing: '.06em', color: 'rgba(244,236,220,.55)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{PLANETS[b.at.planet].glyph} {b.at.angle} · {t('{km} km', { km: Math.round(b.at.km) })}</span>}
              </button>
            ))}
          </div>
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0, ...rise(.35) }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16 }}>
            <h2 style={{ margin: 0, fontFamily: SERIF, fontWeight: 500, fontSize: 24, letterSpacing: '.01em' }}>{t('Destinations')}</h2>
            <button type="button" onClick={goHome} className="hov-cream-text" style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', ...mono(9.5, { letterSpacing: '.14em', color: 'rgba(244,236,220,.55)' }) }}>{t('Back to birthplace')}</button>
          </div>
          <form onSubmit={search} style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(244,236,220,.4)', position: 'relative', zIndex: 10 }}>
            <input value={query} onChange={e => { setQuery(e.target.value); setMissed(''); }} onFocus={() => setFocused(true)} onBlur={() => setTimeout(() => setFocused(false), 120)} autoComplete="off" role="combobox" aria-expanded={focused && hits.length > 0} aria-autocomplete="list" placeholder={t('Search a city or place')} aria-label={t('Search a place')} style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', color: CREAM, fontFamily: "'Instrument Sans',Helvetica,sans-serif", fontSize: 15, padding: '10px 0', outline: 'none' }} />
            <button type="submit" className="hov-cream-text" style={{ background: 'transparent', border: 'none', padding: '10px 0', cursor: 'pointer', whiteSpace: 'nowrap', ...mono(9.5, { letterSpacing: '.14em', color: GOLD }) }}>{searching ? t('Searching…') : t('Find →')}</button>
            {focused && hits.length > 0 && (
              <ul role="listbox" style={{ listStyle: 'none', margin: 0, padding: 0, position: 'absolute', left: -12, right: -12, top: '100%', zIndex: 5, background: INK, border: `1px solid ${CREAM}`, boxShadow: '0 10px 24px rgba(244,236,220,.14)', maxHeight: 230, overflow: 'auto', animation: 'om-fade .16s ease both' }}>
                {hits.map(c => (
                  <li key={c.placeId} role="option" aria-selected="false">
                    <button type="button" onMouseDown={e => { e.preventDefault(); open(c); }} className="hov-wash" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 14, width: '100%', textAlign: 'left', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(244,236,220,.15)', padding: '11px 14px', cursor: 'pointer', color: CREAM, font: 'inherit' }}>
                      <span style={{ fontSize: 15 }}>{c.main}</span>
                      <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.06em', color: 'rgba(244,236,220,.68)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.secondary}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </form>
          {missed && <span role="status" style={{ fontSize: 13, color: 'rgba(244,236,220,.6)', marginTop: -6 }}>{missed}</span>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(128px,1fr))', gap: 8 }}>
            {dests.map(d => {
              const active = sel && Math.abs(sel.lat - d.lat) < .01 && Math.abs(sel.lon - d.lon) < .01;
              return (
                <button key={d.name + d.lat} type="button" className="ac-dest" onClick={() => go(d.lat, d.lon, d.birth ? t('{place} · birthplace', { place: place || d.name }) : d.full || d.name)}
                  style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: '12px 13px', border: `1px solid ${active ? GOLD : 'rgba(244,236,220,.2)'}`, background: 'transparent', color: CREAM, cursor: 'pointer', textAlign: 'left', minWidth: 0, transition: 'border-color .2s ease' }}>
                  <span style={{ fontFamily: SERIF, fontSize: 18, lineHeight: 1.1 }}>{d.name}</span>
                  <span style={{ fontFamily: `${SYM},${MONO}`, fontSize: 10, letterSpacing: '.08em', color: 'rgba(244,236,220,.55)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lines.length ? (d.birth ? t('birthplace') : summary(d.lat, d.lon)) : ' '}</span>
                </button>
              );
            })}
          </div>
        </section>

        </div>

        <section style={{ gridArea: 'angles', display: 'flex', flexDirection: 'column', gap: 20, ...rise(.45) }}>
          <h2 style={{ margin: 0, fontFamily: SERIF, fontWeight: 500, fontSize: 24, letterSpacing: '.01em' }}>{t('The four angles')}</h2>
          <div className="ac-angles" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '28px 32px' }}>
            {['AC', 'MC', 'DC', 'IC'].map(c => (
              <div key={c} style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 14, borderTop: '1px solid rgba(180,147,63,.6)' }}>
                <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', color: GOLD }}>{c}</span>
                <span style={{ fontFamily: SERIF, fontSize: 22, lineHeight: 1.1 }}>{t(ANGLES[c].name)}</span>
                <span style={mono(9.5, { color: 'rgba(244,236,220,.5)' })}>{t(ANGLES[c].theme)}</span>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: 'rgba(244,236,220,.74)', textWrap: 'pretty' }}>{t(ANGLES[c].text)}</p>
              </div>
            ))}
          </div>
        </section>

        <span style={{ gridArea: 'foot', ...mono(9.5, { letterSpacing: '.14em', color: 'rgba(244,236,220,.35)', lineHeight: 1.8 }) }}>
          {data
            ? t('Lines cast for {name} · {place} · {coords} · {date} {time} · GMST {gmst}', { name: first, place, coords: fmtCoord(birth.lat, birth.lon), date: isoToInput(data.profile.birthDate), time: data.profile.birthTime || '', gmst: fmtGmst(data.chart) })
            : t('Lines cast from your birth chart · Natural Earth geometry')}
        </span>
      </main>
    </div>
  );
}
