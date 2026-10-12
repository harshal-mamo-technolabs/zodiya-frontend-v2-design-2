import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import '../lib/mrd-astro.js';
import NavMenu from '../components/NavMenu.jsx';
import { astrologerPreview, getMe } from '../lib/api.js';
import { CHARACTERS, SPEED, byId, getPrefs, setPrefs } from '../lib/astrologers.js';
import { euros, forgetStatus, getCatalog, getStatus, useSales } from '../lib/billing.js';
import { getLang, t } from '../i18n/index.js';

const MONO = "'IBM Plex Mono',monospace";
const SERIF = "'Cormorant Garamond',Georgia,serif";
const GOLD = '#D8BC6A';

/* Each astrologer's sample line in their own voice, fetched once per visit. */
const previews = {};
const loadPreview = id => (previews[id] = previews[id] || astrologerPreview(id).catch(e => { delete previews[id]; throw e; }));

export default function ChooseAstrologer() {
  const navigate = useNavigate();
  const [prefs, setPrefsState] = useState(getPrefs);
  const [pick, setPick] = useState(() => byId(getPrefs().char).id);
  const [playing, setPlaying] = useState(null); // { id, words, idx } | null
  const [loadingId, setLoadingId] = useState(null);
  const audio = useRef(null), tick = useRef(null);

  /* Phones show the astrologers as a sideways row. The counter and arrows say
     there are more to the right, and the row opens on the chosen one. */
  const rail = useRef(null);
  const [at, setAt] = useState(0);
  const cardAt = i => rail.current && rail.current.children[i];
  const centre = (i, behavior) => {
    const el = cardAt(i), r = rail.current;
    if (el) r.scrollTo({ left: el.offsetLeft - (r.clientWidth - el.clientWidth) / 2, behavior });
  };
  const onRail = () => {
    const r = rail.current, first = cardAt(0), second = cardAt(1);
    if (!first || !second) return;
    setAt(Math.round(r.scrollLeft / (second.offsetLeft - first.offsetLeft)));
  };
  useEffect(() => { centre(CHARACTERS.findIndex(c => c.id === pick), 'instant'); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    getMe().catch(e => { if (e.status === 401) navigate('/login'); });
    const onPrefs = e => setPrefsState(e.detail || getPrefs());
    window.addEventListener('meridian:astrologer', onPrefs);
    return () => { window.removeEventListener('meridian:astrologer', onPrefs); stop(); };
  }, [navigate]);

  const stop = () => {
    clearInterval(tick.current);
    if (audio.current) { audio.current.pause(); audio.current = null; }
    setPlaying(null);
  };

  const preview = async ch => {
    if (playing && playing.id === ch.id) return stop();
    stop(); setPick(ch.id); setLoadingId(ch.id);
    let data;
    try { data = await loadPreview(ch.id); } catch (e) { setLoadingId(null); return; }
    setLoadingId(null);
    const words = data.words.length ? data.words : [{ word: '…', start: 0 }];
    // the clip is rendered at normal speed; the speed setting stretches it
    const rate = (SPEED[getPrefs().rate] || SPEED.normal) / SPEED.normal;
    const a = new Audio(`data:audio/mpeg;base64,${data.audio}`);
    a.playbackRate = rate; a.preservesPitch = true;
    a.muted = !getPrefs().voiceOn;
    audio.current = a;
    setPlaying({ id: ch.id, words: words.map(w => w.word), idx: 0 });
    a.onended = () => { if (audio.current === a) { clearInterval(tick.current); setTimeout(() => { if (audio.current === a) { audio.current = null; setPlaying(null); } }, 900); } };
    tick.current = setInterval(() => {
      const sec = a.currentTime;
      let i = 0; while (i + 1 < words.length && words[i + 1].start <= sec) i++;
      setPlaying(p => (p && p.id === ch.id ? { ...p, idx: i } : p));
    }, 60);
    a.play().catch(() => stop());
  };

  const save = patch => setPrefsState(setPrefs(patch));
  const current = byId(prefs.char).id;
  const chosen = byId(pick);
  const same = pick === current && prefs.chosen;
  // English reads 'Marco, aries astrologer'; German nouns keep their capital
  const roleText = getLang() === 'en' ? chosen.role.toLowerCase() : t(chosen.role);
  // talk time: what is left, and top-ups that come straight back here after paying
  const sales = useSales();
  const [minutes, setMinutes] = useState(null);
  const [packs, setPacks] = useState([]);
  useEffect(() => {
    forgetStatus();
    getStatus().then(s => setMinutes(s.minutes)).catch(() => {});
    getCatalog().then(c => setPacks(c.minutePacks)).catch(() => {});
  }, []);
  const mins = s => Math.floor(s / 60);

  // ?welcome=1: the last step after a new account's first birth details
  const [query] = useSearchParams();
  const welcome = query.get('welcome') === '1';
  const confirm = () => {
    stop(); save({ char: pick, chosen: true, hidden: false, minimized: false });
    // the chart is where the astrologer then introduces itself (the widget's onboarding card)
    if (welcome) navigate('/natal-chart');
  };

  const opt = (label, key, val) => {
    const on = prefs[key] === val;
    return <button key={label} type="button" role="radio" aria-checked={on} onClick={() => save({ [key]: val })} style={{ minHeight: 36, padding: '0 13px', borderRadius: 999, border: 'none', background: on ? GOLD : 'transparent', color: on ? '#1C2538' : '#F4ECDC', fontFamily: MONO, fontSize: 9.5, letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer' }}>{t(label)}</button>;
  };
  const rows = [
    [t('Voice'), t('Answers are spoken aloud.'), [opt('On', 'voiceOn', true), opt('Off', 'voiceOn', false)]],
    [t('Speaking speed'), t('Applies to every astrologer. Normal is already a little unhurried.'), [opt('Slow', 'rate', 'slow'), opt('Normal', 'rate', 'normal'), opt('Fast', 'rate', 'fast')]],
    [t('Subtitles'), t('Live captions, on by default.'), [opt('On', 'subs', true), opt('Off', 'subs', false)]],
    [t('Subtitle size'), 'S 15px · M 17px · L 21px', [opt('S', 'subSize', 'S'), opt('M', 'subSize', 'M'), opt('L', 'subSize', 'L')]],
    [t('Animation'), t('Reduced keeps only soft fades. Follows your system setting.'), [opt('Full', 'motion', 'full'), opt('Reduced', 'motion', 'reduced'), opt('Off', 'motion', 'off')]],
    [t('Show on every page'), t('Hide it here or from its own panel.'), [opt('On', 'hidden', false), opt('Off', 'hidden', true)]]
  ];
  const ghost = { minHeight: 40, padding: '0 16px', borderRadius: 999, border: '1px solid rgba(244,236,220,.3)', background: 'transparent', color: '#F4ECDC', fontFamily: MONO, fontSize: 9.5, letterSpacing: '.12em', textTransform: 'uppercase', cursor: 'pointer' };

  return (
    <div className="ca-shell" style={{ minHeight: '100vh', background: 'radial-gradient(ellipse 80% 50% at 50% 0%,#26314B 0%,#1C2538 70%)', color: '#F4ECDC', position: 'relative', paddingBottom: 140 }}>
      <header className="ca-pad" style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '18px 22px', borderBottom: '1px solid rgba(244,236,220,.2)' }}>
        <Link to="/" className="hdr-logo" style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 18, letterSpacing: '.14em', textTransform: 'uppercase', borderBottom: 'none' }}>AstroMeridian</Link>
        <NavMenu current="Your astrologer" />
      </header>

      <section className="ca-pad" style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 22px 26px', display: 'flex', flexDirection: 'column', gap: 14, animation: 'om-rise .6s cubic-bezier(.3,0,.2,1) both' }}>
        <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.18em', textTransform: 'uppercase', color: GOLD }}>{welcome ? t('Last step · Your astrologer') : t('Your astrologer · new')}</span>
        <h1 className="ca-h1" style={{ margin: 0, fontFamily: SERIF, fontWeight: 400, fontSize: 40, lineHeight: 1.02, letterSpacing: '-.01em', textWrap: 'balance', maxWidth: '16ch' }}>{t('Choose who reads your sky with you.')}</h1>
        <p style={{ margin: 0, maxWidth: '56ch', fontSize: 15, lineHeight: 1.6, color: 'rgba(244,236,220,.78)', textWrap: 'pretty' }}>{t('Your astrologer lives in the corner of every page. Ask about your chart out loud or by text, and they’ll explain it with subtitles. They only talk about your own readings.')}</p>
        {/* talk time up top: what is left, and top-ups that return here after paying.
            Payments off: talking is free, so there is nothing to show or buy. */}
        {sales && minutes && (
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px 18px', marginTop: 6, padding: '12px 16px', borderRadius: 14, border: '1px solid rgba(216,188,106,.3)', background: 'rgba(216,188,106,.05)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontFamily: SERIF, fontSize: 22, lineHeight: 1.1 }}>{t('{n} min left', { n: mins(minutes.total) })}</span>
              <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(244,236,220,.55)' }}>{t('{plan} plan · {topup} top-up · top-ups never expire', { plan: mins(minutes.plan), topup: mins(minutes.topup) })}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {packs.map(p => (
                <Link key={p.id} to={`/checkout?item=minutes&pack=${p.id}&qty=1&next=${encodeURIComponent('/choose-astrologer')}`} style={{ display: 'flex', alignItems: 'baseline', gap: 8, minHeight: 40, padding: '9px 14px', borderRadius: 999, border: '1px solid rgba(216,188,106,.45)', color: '#F4ECDC', borderBottom: '1px solid rgba(216,188,106,.45)' }}>
                  <span style={{ fontFamily: SERIF, fontSize: 17 }}>+{p.minutes} min</span>
                  <span style={{ fontFamily: MONO, fontSize: 10.5, color: GOLD }}>{euros(p.amount)}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="ca-nav ca-pad" style={{ maxWidth: 1280, margin: '0 auto', padding: '0 22px 10px', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(244,236,220,.6)' }}>{at + 1} / {CHARACTERS.length} · {t('Swipe to meet them all')}</span>
        <span style={{ display: 'flex', gap: 8 }}>
          {[['Previous astrologer', -1, '←'], ['Next astrologer', 1, '→']].map(([label, step, arrow]) => {
            const off = step < 0 ? at === 0 : at === CHARACTERS.length - 1;
            return <button key={label} type="button" aria-label={t(label)} disabled={off} onClick={() => centre(at + step, 'smooth')} style={{ width: 44, height: 44, borderRadius: '50%', border: '1px solid rgba(244,236,220,.35)', background: 'transparent', color: '#F4ECDC', fontSize: 16, cursor: off ? 'default' : 'pointer', opacity: off ? 0.3 : 1 }}>{arrow}</button>;
          })}
        </span>
      </div>

      <div ref={rail} onScroll={onRail} role="radiogroup" aria-label={t('Astrologers')} className="ca-grid" style={{ maxWidth: 1280, margin: '0 auto', position: 'relative' }}>
        {CHARACTERS.map((ch, idx) => {
          const on = ch.id === pick, pl = playing && playing.id === ch.id, loading = loadingId === ch.id;
          const select = () => setPick(ch.id);
          return (
            <div key={ch.id} role="radio" aria-checked={on} tabIndex={0} className="ca-card" onClick={select}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); }
                if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                  e.preventDefault();
                  const n = (idx + (e.key === 'ArrowRight' ? 1 : 11)) % 12;
                  setPick(CHARACTERS[n].id);
                  const el = e.currentTarget.parentElement.children[n]; if (el) el.focus();
                }
              }}
              style={{ position: 'relative', display: 'flex', flexDirection: 'column', borderRadius: 14, border: `1px solid ${on ? GOLD : 'rgba(244,236,220,.14)'}`, background: on ? 'linear-gradient(180deg,rgba(216,188,106,.10),rgba(17,23,37,.6))' : 'rgba(17,23,37,.45)', boxShadow: on ? `0 0 0 1px ${GOLD}, 0 20px 50px rgba(0,0,0,.35), 0 0 60px rgba(216,188,106,.14)` : '0 10px 30px rgba(0,0,0,.2)', cursor: 'pointer', overflow: 'hidden', transition: 'border-color .2s ease,box-shadow .3s ease,background .3s ease', outline: 'none' }}>
              <div style={{ position: 'relative', height: 236, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'radial-gradient(circle at 50% 62%,rgba(216,188,106,.16) 0%,rgba(216,188,106,0) 58%)', borderBottom: '1px solid rgba(244,236,220,.08)' }}>
                {ch.id === current && prefs.chosen && <span style={{ position: 'absolute', top: 12, left: 12, fontFamily: MONO, fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(244,236,220,.7)', border: '1px solid rgba(244,236,220,.3)', borderRadius: 999, padding: '3px 8px' }}>{t('Current')}</span>}
                {on && <span style={{ position: 'absolute', top: 12, right: 12, width: 24, height: 24, borderRadius: '50%', background: GOLD, color: '#1C2538', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600 }}>✓</span>}
                <span style={{ display: 'block', width: 196, height: 225, marginBottom: 6 }}>
                  <mrd-astro char={ch.id} state={pl ? 'speaking' : 'idle'} reduced={prefs.motion !== 'full' ? 'true' : 'false'} framing="full" style={{ display: 'block', width: '100%', height: '100%' }} />
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontFamily: SERIF, fontSize: 26, lineHeight: 1 }}>{ch.name}</span>
                  <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: GOLD, textAlign: 'right' }}>{t(ch.role)}</span>
                </div>
                <span style={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(244,236,220,.8)', textWrap: 'pretty', minHeight: 42 }}>{t(ch.tagline)}</span>
                <div aria-live="polite" style={{ minHeight: pl ? 46 : 0, fontFamily: SERIF, fontStyle: 'italic', fontSize: 17, lineHeight: 1.35, textWrap: 'pretty' }}>
                  {pl && prefs.subs && `“${playing.words.slice(0, playing.idx + 1).join(' ')}”`}
                </div>
                <button type="button" onClick={e => { e.stopPropagation(); preview(ch); }} aria-label={pl ? t('Stop {name}’s voice preview', { name: ch.name }) : t('Preview {name}’s voice', { name: ch.name })}
                  style={{ marginTop: 'auto', alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 8, minHeight: 38, padding: '0 14px', borderRadius: 999, border: '1px solid rgba(244,236,220,.32)', background: pl ? 'rgba(216,188,106,.14)' : 'transparent', color: '#F4ECDC', fontFamily: MONO, fontSize: 9.5, letterSpacing: '.12em', textTransform: 'uppercase', cursor: 'pointer' }}>
                  {pl ? <span style={{ width: 8, height: 8, background: GOLD }} /> : <span style={{ width: 0, height: 0, borderLeft: `7px solid ${GOLD}`, borderTop: '4.5px solid transparent', borderBottom: '4.5px solid transparent' }} />}
                  {pl ? t('Stop') : loading ? t('Loading…') : t('Preview voice')}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <section className="ca-pad" style={{ maxWidth: 1280, margin: '0 auto', padding: '48px 22px 0', display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid rgba(180,147,63,.6)', paddingTop: 24 }}>
          <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.18em', textTransform: 'uppercase', color: GOLD }}>{t('Settings')}</span>
          <h2 style={{ margin: 0, fontFamily: SERIF, fontWeight: 400, fontSize: 32, lineHeight: 1.1 }}>{t('Voice, subtitles and motion')}</h2>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'rgba(244,236,220,.72)', maxWidth: '60ch' }}>{t('Saved to this device.')}</p>
        </div>
        <div className="ca-prefs" style={{ display: 'grid' }}>
          {rows.map(([label, hint, opts]) => (
            <div key={label} role="radiogroup" aria-label={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', padding: '16px 0', borderBottom: '1px solid rgba(244,236,220,.12)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                <span style={{ fontSize: 15 }}>{label}</span>
                <span style={{ fontSize: 12.5, color: 'rgba(244,236,220,.6)', lineHeight: 1.4 }}>{hint}</span>
              </div>
              <div style={{ display: 'flex', gap: 2, padding: 2, borderRadius: 999, border: '1px solid rgba(244,236,220,.22)' }}>{opts}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <button type="button" onClick={() => save({ onboarded: false, hidden: false, minimized: false })} style={ghost}>{t('Replay introduction')}</button>
          <button type="button" onClick={() => save({ side: 'right', yFrac: 1, minimized: false, hidden: false })} style={ghost}>{t('Reset widget position')}</button>
        </div>
      </section>

      <div className="ca-bar" style={{ position: 'fixed', left: 10, right: 10, bottom: 10, zIndex: 800, display: 'flex', alignItems: 'center', gap: 14, padding: '10px 10px 10px 18px', borderRadius: 999, background: 'rgba(17,23,37,.94)', WebkitBackdropFilter: 'blur(10px)', backdropFilter: 'blur(10px)', border: '1px solid rgba(216,188,106,.4)', boxShadow: '0 18px 40px rgba(0,0,0,.45)' }}>
        <span aria-live="polite" style={{ flex: 1, minWidth: 0, fontSize: 13.5, lineHeight: 1.35, color: 'rgba(244,236,220,.85)' }}>
          {welcome ? t('{name}, {role}. You can change this any time from the menu.', { name: chosen.name, role: roleText }) : same ? t('{name} is your astrologer. Change anytime here or from the menu.', { name: chosen.name }) : t('{name}, {role}. You can change this later from the menu.', { name: chosen.name, role: roleText })}
        </span>
        <button type="button" onClick={confirm} disabled={same && !welcome} style={{ minHeight: 46, padding: '0 20px', borderRadius: 999, border: 'none', background: same && !welcome ? 'rgba(244,236,220,.12)' : GOLD, color: same && !welcome ? 'rgba(244,236,220,.7)' : '#1C2538', fontFamily: MONO, fontSize: 10.5, letterSpacing: '.14em', textTransform: 'uppercase', cursor: same ? 'default' : 'pointer', whiteSpace: 'nowrap' }}>
          {welcome ? t('Continue with {name}', { name: chosen.name }) : same ? t('Chosen ✓') : t('Choose {plan}', { plan: chosen.name })}
        </button>
      </div>
    </div>
  );
}
