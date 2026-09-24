import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Starfield from '../components/Starfield.jsx';
import NavMenu from '../components/NavMenu.jsx';
import { getChart, getSharedChart, listProfiles, shareProfile } from '../lib/api.js';
import { toChartView, SIGNS, SIGN_GLYPH } from '../lib/chart-view.js';

const MONO = "'IBM Plex Mono',monospace";
const SERIF = "'Cormorant Garamond',Georgia,serif";
const SYM = "'Noto Sans Symbols','Segoe UI Symbol','Apple Symbols',serif";
const INK = '#F4ECDC', MUTED = 'rgba(244,236,220,.68)', COP = '#5F8B7A', GOLD = '#B4933F', HAIR = 'rgba(244,236,220,.35)';
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const norm = a => ((a % 360) + 360) % 360;

export function Wheel({ chart, name, speed = 1, showAspects = true }) {
  const T = s => (s / speed).toFixed(3) + 's';
  const C = 300;
  const asc = chart ? chart.asc : 250;
  const cusps = chart ? chart.cusps : Array.from({ length: 12 }, (_, i) => (asc + i * 30) % 360);
  const P = (L, r) => { const a = (180 + L - asc) * Math.PI / 180; return [C + r * Math.cos(a), C - r * Math.sin(a)]; };
  const anim = (n, dur, delay, extra) => Object.assign({ animation: `${n} ${T(dur)} cubic-bezier(.3,0,.2,1) ${T(delay)} both` }, extra || {});
  const line = (key, a, b, stroke, sw, delay, dur = .5) => <line key={key} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={stroke} strokeWidth={sw} pathLength={1} strokeDasharray={1} style={anim('om-draw', dur, delay)} />;
  const txt = (key, pos, s, size, fill, fam, delay, extra) => <text key={key} x={pos[0]} y={pos[1]} fontSize={size} fill={fill} fontFamily={fam} textAnchor="middle" dominantBaseline="central" style={anim('om-fade', .4, delay)} {...(extra || {})}>{s}</text>;
  const kids = [];

  [[282, .9], [258, .55], [234, .8], [120, .6]].forEach(([r, sw], i) =>
    kids.push(<circle key={'r' + r} cx={C} cy={C} r={r} fill="none" stroke={INK} strokeWidth={sw} pathLength={1} strokeDasharray={1} style={anim('om-draw', .65, i * .09)} />));

  for (let m = 0; m < 12; m++) {
    const ts = [];
    for (let d = m * 30; d < m * 30 + 30; d++) {
      const major = d % 30 === 0, ten = d % 10 === 0, five = d % 5 === 0;
      const len = major ? 24 : ten ? 12 : five ? 8 : 4;
      const a = P(d, 282), b = P(d, 282 - len);
      ts.push(<line key={'t' + d} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={INK} strokeWidth={major ? .9 : ten ? .7 : .45} />);
    }
    kids.push(<g key={'ts' + m} style={anim('om-fade', .35, .4 + m * .035)}>{ts}</g>);
  }

  SIGNS.forEach((sn, m) => {
    kids.push(line('zd' + m, P(m * 30, 234), P(m * 30, 258), HAIR, .6, .35 + m * .03, .35));
    kids.push(txt('zg' + m, P(m * 30 + 15, 246), SIGN_GLYPH[sn] + '︎', 15, INK, SYM, .75 + m * .03));
  });

  cusps.forEach((cu, k) => {
    const angle = k % 3 === 0;
    kids.push(line('hc' + k, P(cu, 120), P(cu, angle ? 282 : 234), angle ? INK : HAIR, angle ? 1 : .5, .45 + k * .03, .5));
    const span = norm(cusps[(k + 1) % 12] - cu);
    kids.push(txt('hn' + k, P(norm(cu + span / 2), 135), ROMAN[k], 10.5, MUTED, MONO, .9 + k * .02, { letterSpacing: '.05em' }));
  });
  kids.push(txt('ac', P(cusps[0], 296), 'AC', 10, INK, MONO, 1.1, { fontWeight: 500 }));
  kids.push(txt('mc', P(cusps[9], 296), 'MC', 10, INK, MONO, 1.12, { fontWeight: 500 }));
  kids.push(txt('dc', P(cusps[6], 296), 'DC', 10, MUTED, MONO, 1.14));
  kids.push(txt('ic', P(cusps[3], 296), 'IC', 10, MUTED, MONO, 1.16));

  const bodies = (chart ? chart.bodies : []).map(b => ({ name: b.name, g: b.glyph, L: b.lon, r: b.retro, deg: b.deg }));
  const sorted = bodies.slice().sort((a, b) => a.L - b.L);
  let prev = -99; sorted.forEach(p => { p.D = p.L; if (p.D - prev < 9) p.D = prev + 9; prev = p.D; });
  const pk = [];
  sorted.forEach((p, i) => {
    pk.push(<line key={'pt' + i} x1={P(p.L, 234)[0]} y1={P(p.L, 234)[1]} x2={P(p.L, 226)[0]} y2={P(p.L, 226)[1]} stroke={INK} strokeWidth={.9} />);
    if (p.D !== p.L) pk.push(<line key={'pl' + i} x1={P(p.L, 226)[0]} y1={P(p.L, 226)[1]} x2={P(p.D, 214)[0]} y2={P(p.D, 214)[1]} stroke={HAIR} strokeWidth={.5} />);
    pk.push(<text key={'pg' + i} x={P(p.D, 200)[0]} y={P(p.D, 200)[1]} fontSize={18} fill={INK} fontFamily={SYM} textAnchor="middle" dominantBaseline="central">{p.g + '︎'}</text>);
    pk.push(<text key={'pd' + i} x={P(p.D, 176)[0]} y={P(p.D, 176)[1]} fontSize={10} fill={MUTED} fontFamily={MONO} textAnchor="middle" dominantBaseline="central">{p.deg.slice(0, 3) + (p.r ? ' ℞' : '')}</text>);
  });
  kids.push(<g key="planets" style={anim('om-settle', .7, .85, { transformOrigin: '300px 300px', transformBox: 'view-box' })}>{pk}</g>);

  if (showAspects && chart) {
    chart.aspects.forEach((a, n) => {
      kids.push(line('as' + n, P(a.lonA, 118), P(a.lonB, 118), a.kind === 'soft' ? GOLD : COP, a.angle % 90 === 0 ? .75 : .55, 1.15 + n * .04, .45));
    });
  }
  kids.push(<circle key="cd" cx={C} cy={C} r={1.6} fill={INK} style={anim('om-fade', .3, 1.3)} />);
  return <svg viewBox="0 0 600 600" width="100%" height="100%" style={{ display: 'block', overflow: 'visible' }} role="img" aria-label={'Natal chart wheel for ' + name}>{kids}</svg>;
}

function Shell({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: '#1C2538', color: '#F4ECDC', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24, textAlign: 'center' }}>
      {children}
    </div>
  );
}

function Loading() {
  return (
    <Shell>
      <div style={{ width: 46, height: 46, border: '1px solid rgba(244,236,220,.3)', borderTopColor: '#F4ECDC', borderRadius: '50%', animation: 'om-turn 1.1s linear infinite' }} />
      <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: MUTED }}>Computing your sky</span>
    </Shell>
  );
}

function Failed({ message, action }) {
  return (
    <Shell>
      <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: GOLD }}>Could not draw the chart</span>
      <p style={{ margin: 0, fontFamily: SERIF, fontSize: 24, maxWidth: 440, lineHeight: 1.25 }}>{message}</p>
      {action}
    </Shell>
  );
}

/* One view, two routes: your own chart and a public share link. */
function ChartView({ chart, shared }) {
  const [open, setOpen] = useState({ personality: true });
  const [tableOpen, setTableOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const timer = useRef();
  useEffect(() => () => clearTimeout(timer.current), []);

  const flash = text => {
    setNotice(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(''), 3000);
  };

  const copy = async url => {
    try {
      await navigator.clipboard.writeText(url);
      flash('Link copied to clipboard');
    } catch (e) {
      // clipboard is blocked on insecure origins and in some browsers
      flash(url);
    }
  };

  /* Deliberately not navigator.share: it needs a live user gesture, and minting
     the token is an await, so the activation can lapse and the sheet never opens.
     Copying is one predictable path that works everywhere. */
  const share = async () => {
    // a viewer is already on the public URL; only the owner has to mint one
    if (shared) return copy(window.location.href);

    flash('Creating link…');
    try {
      const { token } = await shareProfile(chart.profile.id);
      await copy(`${window.location.origin}/chart/${token}`);
    } catch (e) {
      flash(e.message);
    }
  };

  /* The browser's own print-to-PDF: vector wheel, selectable text, no library. */
  const download = () => window.print();

  const secs = chart.reading.sections;
  const R = b => (b && b.retro ? ' ℞' : '');
  const allOpen = secs.every(s => open[s.key]);
  const name = chart.profile.name;
  const rows = chart.bodies.map(b => ({ body: b.name + R(b), sign: b.sign, deg: b.deg, house: String(b.house).padStart(2, '0') }));
  rows.push({ body: 'Ascendant', sign: chart.cuspsFmt[0].sign, deg: chart.cuspsFmt[0].text, house: '01' });
  rows.push({ body: 'Midheaven', sign: chart.cuspsFmt[9].sign, deg: chart.cuspsFmt[9].text, house: '10' });

  const th = { padding: 10, fontWeight: 500, borderBottom: '1px solid rgba(244,236,220,.25)' };
  const td = { padding: '8px 10px', borderBottom: '1px solid rgba(244,236,220,.14)', whiteSpace: 'nowrap' };
  // the reading sits in its own column so the text fills its box instead of
  // stopping halfway across a 1200px container
  const column = { width: '100%', maxWidth: 760, margin: '0 auto' };
  const actionBtn = { flex: '1 1 200px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 52, padding: '0 18px 0 22px', borderRadius: 2, cursor: 'pointer', fontFamily: "'Instrument Sans',sans-serif", fontWeight: 500, fontSize: 15 };

  return (
    <div className="chart-root" style={{ minHeight: '100vh', background: '#1C2538', color: '#F4ECDC', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <div className="starfield-layer" style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}><Starfield /></div>
      <div className="starfield-layer" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'rgba(28,37,56,.42)' }} />

      <header className="print-hide" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '18px 24px', borderBottom: '1px solid rgba(244,236,220,.2)', maxWidth: 1200, width: '100%', margin: '0 auto' }}>
        {shared
          ? <Link to="/signup" style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', borderBottom: 'none' }}>Draw your own →</Link>
          : <Link to="/birth-details" style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', borderBottom: 'none' }}>← Edit entry</Link>}
        <Link to="/" style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 18, letterSpacing: '.14em', textTransform: 'uppercase', borderBottom: 'none' }}>Meridian</Link>
        {/* the public view has no menu; the empty box keeps the wordmark centred */}
        <div style={{ display: 'flex', alignItems: 'center', minWidth: 34 }}>
          {!shared && <NavMenu current="Natal Chart" />}
        </div>
      </header>

      <main style={{ position: 'relative', flex: 1, width: '100%', maxWidth: 1200, margin: '0 auto', padding: '0 0 56px' }}>
        <div className="print-plate">
          <section style={{ padding: '20px 12px 0' }}>
            <div style={{ width: '100%', aspectRatio: '1/1', maxWidth: 620, margin: '0 auto' }}><Wheel chart={chart} name={name} /></div>
          </section>

          <section style={{ padding: '16px 24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: COP }}>{chart.meta.metaLine}</div>
            <h1 style={{ margin: 0, fontFamily: SERIF, fontWeight: 500, fontSize: 'clamp(28px,7.2vw,42px)', lineHeight: 1.12, textWrap: 'balance' }}>{chart.reading.headline[0]},<br />{chart.reading.headline[1]}</h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
              {chart.reading.chips.map(c => (
                <div key={c.label} style={{ display: 'flex', alignItems: 'baseline', gap: 8, border: '1px solid rgba(244,236,220,.3)', padding: '6px 11px', background: 'rgba(244,236,220,.08)' }}>
                  <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: MUTED }}>{c.label}</span>
                  <span style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '.04em', whiteSpace: 'nowrap' }}>{c.value}</span>
                </div>
              ))}
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 16, lineHeight: 1.6, color: MUTED, maxWidth: 520, textWrap: 'pretty' }}>{chart.reading.summary}</p>
          </section>
        </div>

        <section className="print-reading" style={{ ...column, padding: '36px 24px 0', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, borderBottom: '1px solid #F4ECDC', paddingBottom: 10 }}>
            <h2 style={{ margin: 0, fontFamily: SERIF, fontWeight: 500, fontSize: 26 }}>The reading</h2>
            <button type="button" className="hov-sage print-hide" onClick={() => { const next = {}; if (!allOpen) secs.forEach(s => next[s.key] = true); setOpen(next); }} style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: MUTED, fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', borderBottom: '1px solid rgba(244,236,220,.35)' }}>{allOpen ? 'Collapse all' : 'Expand all'}</button>
          </div>
          {secs.map(s => (
            <div key={s.key} style={{ borderBottom: '1px solid rgba(244,236,220,.25)' }}>
              <button type="button" onClick={() => setOpen(o => ({ ...o, [s.key]: !o[s.key] }))} className="hov-sage" style={{ display: 'flex', alignItems: 'baseline', gap: 14, width: '100%', background: 'transparent', border: 'none', padding: '17px 0', cursor: 'pointer', textAlign: 'left', color: '#F4ECDC', font: 'inherit' }}>
                <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.14em', color: COP, flex: '0 0 auto', width: 22 }}>{s.n}</span>
                <span style={{ flex: 1, fontFamily: SERIF, fontSize: 25, lineHeight: 1.1 }}>{s.title}</span>
                <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.1em', color: MUTED, flex: '0 0 auto' }}>{s.meta}</span>
                <span className="print-hide" style={{ fontFamily: MONO, fontSize: 15, color: MUTED, flex: '0 0 auto', width: 12, textAlign: 'center' }}>{open[s.key] ? '−' : '+'}</span>
              </button>
              {/* kept in the DOM rather than unmounted, so printing can reveal it */}
              <div className="reading-body" style={{ display: open[s.key] ? 'flex' : 'none', padding: '0 0 22px', flexDirection: 'column', gap: 14 }}>
                <div className="reading-basis" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', fontFamily: MONO, fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: COP, borderLeft: '1px solid #B4933F', paddingLeft: 12 }}>{s.basis}</div>
                {s.paras.map((para, i) => <p key={i} style={{ margin: 0, fontSize: 16.5, lineHeight: 1.62, color: '#F4ECDC', textWrap: 'pretty' }}>{para}</p>)}
              </div>
            </div>
          ))}
        </section>

        <section className="print-table" style={{ ...column, padding: '32px 24px 0' }}>
          <div style={{ border: '1px solid rgba(244,236,220,.3)', background: 'rgba(244,236,220,.08)' }}>
            <button type="button" onClick={() => setTableOpen(v => !v)} className="hov-sage" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, width: '100%', background: 'transparent', border: 'none', padding: '15px 16px', cursor: 'pointer', textAlign: 'left', color: '#F4ECDC', fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase' }}>
              <span>{'Exact placements · Tropical · ' + chart.meta.houseSystem}</span>
              <span className="print-hide" style={{ fontSize: 14, color: MUTED }}>{tableOpen ? '−' : '+'}</span>
            </button>
            <div className="table-body" style={{ display: tableOpen ? 'block' : 'none', overflowX: 'auto', borderTop: '1px solid rgba(244,236,220,.3)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: MONO, fontSize: 12, minWidth: 340 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: MUTED, fontSize: 9.5, letterSpacing: '.14em', textTransform: 'uppercase' }}>
                    <th style={{ ...th, padding: '10px 10px 8px 16px' }}>Body</th>
                    <th style={th}>Sign</th>
                    <th style={{ ...th, textAlign: 'right' }}>Degree</th>
                    <th style={{ ...th, padding: '10px 16px 8px 10px', textAlign: 'right' }}>House</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.body}>
                      <td style={{ ...td, padding: '8px 10px 8px 16px' }}>{r.body}</td>
                      <td style={td}>{r.sign}</td>
                      <td style={{ ...td, textAlign: 'right' }}>{r.deg}</td>
                      <td style={{ ...td, padding: '8px 16px 8px 10px', textAlign: 'right', color: MUTED, whiteSpace: 'normal' }}>{r.house}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ padding: '11px 16px 13px', fontFamily: MONO, fontSize: 9.5, letterSpacing: '.1em', textTransform: 'uppercase', color: MUTED, borderTop: '1px solid rgba(244,236,220,.25)' }}>
                ℞ = retrograde: from Earth the planet looked like it was moving backwards when you were born, which turns its themes inward rather than outward. Positions computed server-side to arc-minute precision.
              </div>
            </div>
          </div>
        </section>

        <section className="print-hide" style={{ ...column, padding: '28px 24px 0' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <button type="button" onClick={share} className="hov-cream" style={{ ...actionBtn, background: '#F4ECDC', color: '#1C2538', border: 'none' }}>
              <span>{shared ? 'Copy this link' : 'Share this chart'}</span>
              <span style={{ fontFamily: MONO, fontSize: 13, opacity: .8 }}>↗</span>
            </button>
            <button type="button" onClick={download} className="hov-wash-cream" style={{ ...actionBtn, background: 'transparent', color: '#F4ECDC', border: '1px solid #F4ECDC' }}>
              <span>Download as plate</span>
              <span style={{ fontFamily: MONO, fontSize: 13, color: MUTED }}>PDF</span>
            </button>
          </div>
          <div aria-live="polite" style={{ minHeight: 20, marginTop: 10, fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: COP, wordBreak: 'break-all' }}>{notice}</div>
          <p style={{ margin: '2px 0 0', fontSize: 12.5, lineHeight: 1.5, color: MUTED, maxWidth: 560 }}>
            {shared
              ? 'Anyone with this link can read this chart.'
              : 'Sharing creates a link that works without logging in. It shows the name, date and city, but not the exact birthplace. You can turn it off again at any time.'}
          </p>
        </section>
      </main>
    </div>
  );
}

/** Your own chart: whichever profile is active. */
export default function NatalChart() {
  const navigate = useNavigate();
  const [chart, setChart] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const profiles = await listProfiles();
        if (!profiles.length) { navigate('/birth-details'); return; }

        let wanted = null;
        try { wanted = localStorage.getItem('meridian_active_profile'); } catch (e) {}
        const chosen = profiles.find(p => p._id === wanted) || profiles.find(p => p.isPrimary) || profiles[0];

        const payload = await getChart(chosen._id);
        if (live) setChart(toChartView(payload));
      } catch (e) {
        if (e.status === 401) { navigate('/login'); return; }
        if (live) setError(e.message);
      }
    })();
    return () => { live = false; };
  }, [navigate]);

  if (error) return <Failed message={error} action={<Link to="/birth-details" style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase' }}>Check your birth details</Link>} />;
  if (!chart) return <Loading />;
  return <ChartView chart={chart} shared={false} />;
}

/** A public share link — no session required. */
export function SharedChart() {
  const { token } = useParams();
  const [chart, setChart] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    getSharedChart(token)
      .then(payload => { if (live) setChart(toChartView(payload)); })
      .catch(e => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [token]);

  if (error) return <Failed message={error} action={<Link to="/signup" style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase' }}>Draw your own chart</Link>} />;
  if (!chart) return <Loading />;
  return <ChartView chart={chart} shared />;
}
