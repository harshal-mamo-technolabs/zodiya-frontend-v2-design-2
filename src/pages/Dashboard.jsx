import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Starfield from '../components/Starfield.jsx';
import NavMenu from '../components/NavMenu.jsx';
import { Wheel } from './NatalChart.jsx';
import MoodDial from '../components/MoodDial.jsx';
import { getChart, getHoroscope, getTransits, listProfiles, numerology } from '../lib/api.js';
import { readActive } from '../lib/active-profile.js';
import { toChartView, SIGN_GLYPH } from '../lib/chart-view.js';

/* A port of Home.dc.html: one column on a phone, hero + sticky wheel on a desk. */

const MONO = "'IBM Plex Mono',monospace";
const SERIF = "'Cormorant Garamond',Georgia,serif";
const SYM = "'Noto Sans Symbols','Segoe UI Symbol','Apple Symbols',serif";
const GOLD = '#B4933F', COP = '#5F8B7A';
const ROMAN = ['I', 'II', 'III', 'IV', 'V'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CSS = `
.om-shell{container-type:inline-size;width:100%}
.om-cols{grid-template-columns:minmax(0,1fr);grid-template-areas:"hero" "wheel" "sky" "sign" "chart" "numbers" "more" "foot"}
@container (min-width: 820px){
  .om-header{padding:34px 24px 0 !important}
  .om-cols{padding:48px 24px 72px !important;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);column-gap:72px !important;row-gap:40px !important;grid-template-areas:"hero wheel" "sky sign" "numbers chart" "more foot"}
  .om-hero h1{font-size:64px !important}
  .om-lede{font-size:38px !important}
  .om-more{flex-direction:row !important;align-items:baseline !important;gap:40px !important}
  .om-foot{text-align:right !important;align-self:end}
}
@container (min-width: 1240px){
  .om-hero h1{font-size:76px !important}
  .om-lede{font-size:44px !important}
}
.om-cream:hover{color:#F4ECDC !important}
.om-row:hover{background:rgba(244,236,220,.06) !important}
`;

const jdOf = d => d.getTime() / 86400000 + 2440587.5;

/** Mean synodic month is close enough for a header label. */
function moonPhase(d) {
  const age = (((jdOf(d) - 2451550.1) % 29.530588853) + 29.530588853) % 29.530588853;
  const names = ['New moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous', 'Full moon', 'Waning gibbous', 'Last quarter', 'Waning crescent'];
  return names[Math.floor(((age / 29.530588853) * 8 + 0.5) % 8)];
}

/** Local sidereal time at the profile's longitude, "21h 14m". */
function siderealTime(d, lon) {
  const t = jdOf(d) - 2451545;
  const lst = (((280.46061837 + 360.98564736629 * t + lon) % 360) + 360) % 360;
  const h = lst / 15;
  return `${Math.floor(h)}h ${String(Math.floor((h % 1) * 60)).padStart(2, '0')}m`;
}

const latText = lat => { const a = Math.abs(lat), d = Math.floor(a); return `${d}°${String(Math.round((a - d) * 60)).padStart(2, '0')}′${lat < 0 ? 'S' : 'N'}`; };
const shortDate = iso => { const [, m, d] = iso.split('-'); return `${+d} ${MONTHS[+m - 1]}`; };
const dobText = iso => { const [y, m, d] = iso.split('-'); return `${d} ${MONTHS[+m - 1]} ${y}`; };

const Glyph = ({ sign }) => (
  <svg viewBox="0 0 32 32" width="100%" height="100%" aria-hidden="true" style={{ display: 'block', overflow: 'visible' }}>
    <text x="16" y="17" fontSize="24" fill="#F4ECDC" fontFamily={SYM} textAnchor="middle" dominantBaseline="central">{(SIGN_GLYPH[sign] || '') + '︎'}</text>
  </svg>
);

const eyebrow = { fontFamily: MONO, fontSize: 9.5, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(244,236,220,.45)' };
const link19 = { fontFamily: SERIF, fontSize: 19, borderBottom: 'none' };
const note = { fontFamily: MONO, fontSize: 10, color: 'rgba(244,236,220,.5)' };

export default function Dashboard() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState(null);
  const [profile, setProfile] = useState(null);
  const [chart, setChart] = useState(null);
  const [transits, setTransits] = useState(null);
  const [numbers, setNumbers] = useState(null);
  const [horo, setHoro] = useState(null);

  useEffect(() => {
    let live = true;
    const fail = e => { if (e.status === 401) navigate('/'); };
    listProfiles()
      .then(list => {
        if (!live) return;
        if (!list.length) { navigate('/birth-details'); return; }
        const wanted = readActive();
        const p = list.find(x => x._id === wanted) || list.find(x => x.isPrimary) || list[0];
        setProfiles(list); setProfile(p);
        getChart(p._id).then(r => { if (live) setChart(toChartView(r)); }).catch(fail);
        getTransits(p._id).then(r => { if (live) setTransits(r); }).catch(fail);
        numerology({ name: p.birthName || `${p.firstName} ${p.lastName}`, birthDate: p.birthDate })
          .then(r => { if (live) setNumbers(r); })
          .catch(fail);
        const zone = p.timezoneId || 'UTC';
        const localToday = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
        getHoroscope({ sign: p.zodiacSign, date: localToday, tz: zone }).then(r => { if (live) setHoro(r); }).catch(fail);
      })
      .catch(fail);
    return () => { live = false; };
  }, [navigate]);

  if (!profile) return null;

  const now = new Date();
  const hr = now.getHours();
  const greeting = hr < 5 ? 'Still up' : hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
  // the mean-lunation estimate only bridges the gap until the exact phase arrives with the horoscope
  const dateLine = `${WEEKDAYS[now.getDay()]} ${now.getDate()} ${MONTHS[now.getMonth()]} · ${horo ? horo.moonLine.split(' · ')[0] : moonPhase(now)}`;
  const placements = chart ? [['Sun', chart.big3.sun], ['Moon', chart.big3.moon], ['Rising', chart.big3.rising]] : [];
  const placeDob = `${[profile.city, profile.country].filter(Boolean).join(', ')} · ${dobText(profile.birthDate)}`;

  /* The strongest transit in orb today carries the day's reading, ranked as the Transits page ranks them. */
  const today = transits?.today ?? 0;
  const active = transits ? transits.events
    .filter(e => today >= e.span[0] && today <= e.span[1])
    .sort((a, b) => (b.weight - Math.abs(b.exact - today) * 0.6) - (a.weight - Math.abs(a.exact - today) * 0.6)) : [];
  const top = active[0];
  const when = e => {
    const exactToday = e.exactDate === transits.days[today];
    const orb = e.daily[today - e.span[0]]?.orb;
    if (exactToday) return `Exact today${orb != null ? ` · within ${Math.floor(orb)}°${String(Math.round((orb % 1) * 60)).padStart(2, '0')}′` : ''}`;
    return `Exact ${shortDate(e.exactDate)} · ${e.exactDate > transits.days[today] ? 'applying' : 'separating'}`;
  };
  const rows = active.slice(0, 3).map((e, i) => ({
    id: e.id, rank: ROMAN[i],
    name: `${e.transitName} ${e.aspectName.toLowerCase()} natal ${e.natalName}`,
    when: when(e), strength: (e.weight / 5 * 100) + '%'
  }));
  const lede = top ? top.lede : (transits?.labels.quiet ?? '');
  const sub = top ? `${top.title} is exact ${top.exactDate === transits.days[today] ? 'today' : 'on ' + shortDate(top.exactDate)}${top.exactDate > transits.days[today] ? ' and still building' : ''}. ${top.text.split(/(?<=\.)\s/)[0]}` : '';

  const lifePath = numbers?.numbers.find(n => n.key === 'lifePath')?.value ?? null;
  /* Exact after today and not yet in orb: what the next fortnight brings. */
  const upcoming = transits ? transits.events
    .filter(e => e.span[0] > today)
    .sort((a, b) => a.span[0] - b.span[0] || b.weight - a.weight)
    .slice(0, 3) : [];
  const dominant = chart ? `Mostly ${chart.dominants.topElement} · ${chart.dominants.topModality}` : '';

  const me = profiles.find(p => p.isPrimary) || profile;
  const pairs = profiles.filter(p => p._id !== me._id).map(p => ({ id: p._id, names: `${me.firstName} & ${p.firstName}`, word: p.relationship || 'other' }));

  return (
    <div className="om-shell" style={{ minHeight: '100vh', background: '#1C2538', color: '#F4ECDC', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: "'Instrument Sans',Helvetica,Arial,sans-serif" }}>
      <style>{CSS}</style>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}><Starfield /></div>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'linear-gradient(180deg,rgba(28,37,56,.35) 0%,rgba(28,37,56,.62) 55%,rgba(28,37,56,.82) 100%)' }} />

      <header className="om-header" style={{ position: 'relative', width: '100%', maxWidth: 1200, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 0' }}>
        <Link to="/" style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 17, letterSpacing: '.16em', textTransform: 'uppercase', borderBottom: 'none' }}>Meridian</Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(244,236,220,.5)' }}>{dateLine}</span>
          <NavMenu current="Home" />
        </div>
      </header>

      <main className="om-cols" style={{ position: 'relative', width: '100%', maxWidth: 1200, padding: '36px 24px 56px', display: 'grid', rowGap: 44 }}>

        <section className="om-hero" style={{ gridArea: 'hero', display: 'flex', flexDirection: 'column', gap: 26, animation: 'om-rise .6s cubic-bezier(.3,0,.2,1) .05s both' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h1 style={{ margin: 0, fontFamily: SERIF, fontWeight: 400, fontSize: 42, lineHeight: 1.02, letterSpacing: '-.01em', textWrap: 'balance' }}>{greeting},<br /><em style={{ fontStyle: 'italic' }}>{profile.firstName}</em>.</h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px 18px' }}>
              {placements.map(([body, sign]) => (
                <span key={body} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ width: 15, height: 15, flex: '0 0 auto', display: 'block', filter: 'drop-shadow(0 0 5px rgba(244,236,220,.5))', animation: 'om-glow 5s ease-in-out infinite' }}><Glyph sign={sign} /></span>
                  <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.13em', textTransform: 'uppercase', color: 'rgba(244,236,220,.6)' }}>{body} {sign}</span>
                </span>
              ))}
            </div>
          </div>

          <Link to="/transits" className="om-cream" style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingTop: 24, borderTop: '1px solid rgba(180,147,63,.6)', borderBottom: 'none' }}>
            <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.18em', textTransform: 'uppercase', color: GOLD }}>Today · for your chart</span>
            <p className="om-lede" style={{ margin: 0, fontFamily: SERIF, fontWeight: 400, fontSize: 28, lineHeight: 1.24, letterSpacing: '-.005em', textWrap: 'pretty' }}>{lede}</p>
            {sub && <span style={{ fontSize: 14, lineHeight: 1.6, color: 'rgba(244,236,220,.7)', maxWidth: '44ch', textWrap: 'pretty' }}>{sub}</span>}
            <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: GOLD }}>Read the full reading →</span>
          </Link>
        </section>

        <Link to="/natal-chart" className="om-wheel om-cream" style={{ gridArea: 'wheel', display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center', animation: 'om-rise .6s cubic-bezier(.3,0,.2,1) .2s both', borderBottom: 'none' }}>
          <div style={{ width: '100%', maxWidth: 440, aspectRatio: '1 / 1', padding: '0 4%' }}><Wheel chart={chart} name={profile.firstName} /></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', textAlign: 'center' }}>
            <span style={{ fontFamily: SERIF, fontSize: 19, letterSpacing: '.02em' }}>Your natal chart</span>
            <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(244,236,220,.5)' }}>{placeDob}</span>
          </div>
        </Link>

        <section style={{ gridArea: 'sky', display: 'flex', flexDirection: 'column', gap: 4, animation: 'om-rise .6s cubic-bezier(.3,0,.2,1) .3s both' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, paddingBottom: 14 }}>
            <h2 style={{ margin: 0, fontFamily: SERIF, fontWeight: 500, fontSize: 24, letterSpacing: '.01em' }}>Current sky</h2>
            <Link to="/transits" style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(244,236,220,.55)', borderBottom: 'none' }}>All transits</Link>
          </div>
          {rows.map(t => (
            <Link key={t.id} to="/transits" className="om-cream" style={{ display: 'flex', alignItems: 'baseline', gap: 16, padding: '16px 0', borderTop: '1px solid rgba(244,236,220,.13)', borderBottom: 'none' }}>
              <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.08em', color: GOLD, width: 18, flex: '0 0 auto' }}>{t.rank}</span>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                <span style={{ fontSize: 15.5, lineHeight: 1.35, textWrap: 'pretty' }}>{t.name}</span>
                <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.08em', color: 'rgba(244,236,220,.5)' }}>{t.when}</span>
              </div>
              <span style={{ width: 40, height: 2, flex: '0 0 auto', marginRight: 2, background: 'rgba(244,236,220,.16)', position: 'relative', alignSelf: 'center' }}>
                <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: t.strength, background: GOLD, display: 'block' }} />
              </span>
            </Link>
          ))}
          {transits && !rows.length && (
            <span style={{ padding: '16px 0', borderTop: '1px solid rgba(244,236,220,.13)', fontSize: 15.5, color: 'rgba(244,236,220,.7)' }}>{transits.labels.quiet}</span>
          )}
          {upcoming.length > 0 && (
            <>
              <span style={{ ...eyebrow, paddingTop: 22 }}>Coming up</span>
              {upcoming.map(e => (
                <Link key={e.id} to="/transits" className="om-cream" style={{ display: 'flex', alignItems: 'baseline', gap: 16, padding: '12px 0', borderTop: '1px solid rgba(244,236,220,.13)', borderBottom: 'none', color: 'rgba(244,236,220,.75)' }}>
                  <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.08em', color: GOLD, width: 52, flex: '0 0 auto' }}>{shortDate(transits.days[e.span[0]])}</span>
                  <span style={{ flex: 1, fontSize: 14.5, lineHeight: 1.35, minWidth: 0 }}>{e.transitName} {e.aspectName.toLowerCase()} natal {e.natalName}</span>
                  <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.08em', color: 'rgba(244,236,220,.5)', flex: '0 0 auto' }}>exact {shortDate(e.exactDate)}</span>
                </Link>
              ))}
            </>
          )}
        </section>

        {/* ---------------------------------------------- your sign today */}
        <section style={{ gridArea: 'sign', display: 'flex', flexDirection: 'column', gap: 4, animation: 'om-rise .6s cubic-bezier(.3,0,.2,1) .35s both' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, paddingBottom: 14 }}>
            <h2 style={{ margin: 0, fontFamily: SERIF, fontWeight: 500, fontSize: 24, letterSpacing: '.01em' }}>Your sign today{horo ? ` · ${horo.signName}` : ''}</h2>
            <Link to="/daily-horoscope" style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(244,236,220,.55)', borderBottom: 'none' }}>Full reading</Link>
          </div>
          {horo && (
            <>
              <p style={{ margin: 0, padding: '14px 0 18px', borderTop: '1px solid rgba(244,236,220,.13)', fontFamily: SERIF, fontSize: 22, lineHeight: 1.3, textWrap: 'pretty', maxWidth: '44ch' }}>{horo.headline}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', borderLeft: '1px solid rgba(244,236,220,.25)', borderTop: '1px solid rgba(244,236,220,.25)', background: 'rgba(244,236,220,.06)' }}>
                {[
                  [horo.labels.mood, <div key="m" style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div style={{ flex: '0 0 auto', width: 52, height: 26 }}><MoodDial value={horo.mood.value} /></div><span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.04em' }}>{horo.mood.label}</span></div>],
                  [horo.labels.luckyNumber, <span key="n" style={{ fontFamily: MONO, fontSize: 22, lineHeight: 1 }}>{horo.luckyNumber}</span>],
                  [horo.labels.luckyColour, <div key="c" style={{ display: 'flex', alignItems: 'center', gap: 9 }}><span style={{ width: 15, height: 15, border: '1px solid rgba(244,236,220,.5)', background: horo.luckyColour.hex, flex: '0 0 auto', display: 'block' }} /><span style={{ fontFamily: MONO, fontSize: 11 }}>{horo.luckyColour.name}</span></div>],
                  [horo.labels.moon.daily, <span key="mo" style={{ fontFamily: MONO, fontSize: 11, lineHeight: 1.35 }}>{horo.moonLine}</span>]
                ].map(([label, body]) => (
                  <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 9, padding: '12px 14px', borderRight: '1px solid rgba(244,236,220,.25)', borderBottom: '1px solid rgba(244,236,220,.25)' }}>
                    <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(244,236,220,.68)' }}>{label}</span>
                    {body}
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: '0 24px', marginTop: 6 }}>
                {horo.categories.map(c => (
                  <Link key={c.key} to="/daily-horoscope" className="om-cream" style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '11px 0', borderBottom: '1px solid rgba(244,236,220,.13)', borderTop: 'none' }}>
                    <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', color: COP, flex: '0 0 auto', width: 20 }}>{c.numeral}</span>
                    <span style={{ flex: 1, fontSize: 14.5 }}>{c.title}</span>
                    <span style={{ display: 'flex', gap: 3, flex: '0 0 auto' }}>
                      {[0, 1, 2, 3, 4].map(k => <span key={k} style={{ width: 6, height: 6, border: '1px solid #F4ECDC', background: k < c.score ? '#F4ECDC' : 'transparent', display: 'block' }} />)}
                    </span>
                  </Link>
                ))}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', paddingTop: 14, fontFamily: MONO, fontSize: 10, letterSpacing: '.03em', color: 'rgba(244,236,220,.55)' }}>
                {horo.skyNotes.map(n => <span key={n}>{n}</span>)}
              </div>
            </>
          )}
        </section>

        {/* -------------------------------------------- your chart, your numbers */}
        <section style={{ gridArea: 'chart', display: 'flex', flexDirection: 'column', gap: 4, animation: 'om-rise .6s cubic-bezier(.3,0,.2,1) .4s both' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, paddingBottom: 14 }}>
              <h2 style={{ margin: 0, fontFamily: SERIF, fontWeight: 500, fontSize: 24, letterSpacing: '.01em' }}>Your chart in a sentence</h2>
              <Link to="/natal-chart" style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(244,236,220,.55)', borderBottom: 'none' }}>Full chart</Link>
            </div>
            {chart && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 14, borderTop: '1px solid rgba(244,236,220,.13)' }}>
                <p style={{ margin: 0, fontFamily: SERIF, fontSize: 22, lineHeight: 1.3, textWrap: 'pretty' }}>{chart.reading.headline[0]}, {chart.reading.headline[1]}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {chart.reading.chips.map(ch => (
                    <span key={ch.label} style={{ display: 'inline-flex', alignItems: 'baseline', gap: 7, padding: '6px 10px', border: '1px solid rgba(244,236,220,.25)', borderRadius: 2, fontFamily: MONO, fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase' }}>
                      <span style={{ color: 'rgba(244,236,220,.55)' }}>{ch.label}</span><span>{ch.value}</span>
                    </span>
                  ))}
                </div>
                <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(244,236,220,.55)' }}>{dominant}</span>
                <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: 'rgba(244,236,220,.7)', textWrap: 'pretty' }}>{chart.reading.summary}</p>
              </div>
            )}
        </section>

        <section style={{ gridArea: 'numbers', display: 'flex', flexDirection: 'column', gap: 4, animation: 'om-rise .6s cubic-bezier(.3,0,.2,1) .45s both' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, paddingBottom: 14 }}>
              <h2 style={{ margin: 0, fontFamily: SERIF, fontWeight: 500, fontSize: 24, letterSpacing: '.01em' }}>Your numbers</h2>
              <Link to="/numerology" style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(244,236,220,.55)', borderBottom: 'none' }}>All numbers</Link>
            </div>
            {numbers && (
              <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid rgba(244,236,220,.13)' }}>
                {numbers.numbers.slice(0, 4).map(n => (
                  <Link key={n.key} to="/numerology" className="om-cream" style={{ display: 'flex', alignItems: 'baseline', gap: 14, padding: '12px 0', borderBottom: '1px solid rgba(244,236,220,.13)', borderTop: 'none' }}>
                    <span style={{ fontFamily: SERIF, fontSize: 26, lineHeight: 1, width: 40, flex: '0 0 auto', color: n.master ? GOLD : '#F4ECDC' }}>{n.value}</span>
                    <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                      <span style={{ fontSize: 14.5 }}>{n.label}</span>
                      <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(244,236,220,.5)' }}>{n.sub}</span>
                    </span>
                  </Link>
                ))}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '14px 0 0' }}>
                  <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.16em', textTransform: 'uppercase', color: GOLD }}>Personal year {numbers.personalYear.value} · {numbers.personalYear.year}</span>
                  <span style={{ fontFamily: SERIF, fontSize: 19 }}>{numbers.personalYear.heading}</span>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: 'rgba(244,236,220,.7)', textWrap: 'pretty' }}>{numbers.personalYear.meaning.split(/(?<=\.)\s/)[0]}</p>
                </div>
              </div>
            )}
        </section>

        <section className="om-more" style={{ gridArea: 'more', display: 'flex', flexDirection: 'column', gap: 28, animation: 'om-rise .6s cubic-bezier(.3,0,.2,1) .4s both' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={eyebrow}>Synastry</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px' }}>
              {pairs.map(s => (
                <Link key={s.id} to={`/synastry?with=${s.id}`} style={{ display: 'flex', alignItems: 'baseline', gap: 8, borderBottom: 'none' }}>
                  <span style={{ fontFamily: SERIF, fontSize: 19 }}>{s.names}</span>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: GOLD }}>{s.word}</span>
                </Link>
              ))}
              {!pairs.length && <span style={{ ...link19, color: 'rgba(244,236,220,.5)' }}>Add someone from the portrait in the header</span>}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={eyebrow}>Also today</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px' }}>
              <Link to="/tarot" style={link19}>Tarot <span style={note}>card ready</span></Link>
              <Link to="/numerology" style={link19}>Numerology <span style={note}>{lifePath != null ? `Life path ${lifePath}` : ''}</span></Link>
            </div>
          </div>
          <p style={{ margin: 0, maxWidth: '42ch', fontFamily: SERIF, fontStyle: 'italic', fontSize: 17, lineHeight: 1.5, color: 'rgba(244,236,220,.78)', textWrap: 'pretty' }}>Year-ahead transits and unlimited synastry are part of Meridian Plus. <Link to="/subscription" style={{ fontFamily: MONO, fontStyle: 'normal', fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: GOLD, whiteSpace: 'nowrap', borderBottom: 'none' }}>See plans →</Link></p>
        </section>

        <span className="om-foot" style={{ gridArea: 'foot', fontFamily: MONO, fontSize: 9.5, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(244,236,220,.35)', lineHeight: 1.8 }}>Sky as seen from {latText(profile.lat)} · sidereal time {siderealTime(now, profile.lon)}</span>
      </main>
    </div>
  );
}
