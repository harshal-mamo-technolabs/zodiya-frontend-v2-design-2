import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Starfield from '../components/Starfield.jsx';
import { getStats } from '../lib/api.js';

/* A port of Landing Page.dc.html: the public front door. Numbers on it are real. */

const MONO = "'IBM Plex Mono',monospace";
const SERIF = "'Cormorant Garamond',Georgia,serif";
const SYM = "'Noto Sans Symbols','Segoe UI Symbol','Apple Symbols',serif";
const INK = '#F4ECDC', MUTED = 'rgba(244,236,220,.68)', COP = '#5F8B7A', GOLD = '#B4933F', HAIR = 'rgba(244,236,220,.35)', NAVY = '#1C2538';

const CSS = `
.ld-cta:hover{background:#E6DCC6 !important;color:#1C2538 !important}
.ld-cell:hover{background:rgba(244,236,220,.14) !important;color:#F4ECDC !important}
`;

const OFFERINGS = [
  ['I', 'Birth chart', 'The sky at your first breath, plotted and explained house by house.', '/natal-chart'],
  ['II', 'Synastry', 'Two charts laid over one another. Where you meet, where you grind.', '/synastry'],
  ['III', 'Transits', 'What the planets are doing to your chart this month, and why it feels that way.', '/transits'],
  ['IV', 'Daily horoscope', 'A short note each morning, written for your chart, not just your sign.', '/daily-horoscope'],
  ['V', 'Tarot', 'Three-card draws with readings that follow the question you asked.', '/tarot'],
  ['VI', 'Numerology', 'Life path, expression and destiny numbers from your name and date.', '/numerology']
];

/* The sample wheel is the design's own: a Lisbon birth on 14 March 1994, equal houses. */
const SAMPLE = [
  { g: '☉', L: 353, d: '23°' }, { g: '☽', L: 218, d: '08°' }, { g: '☿', L: 2, d: '02°' }, { g: '♀', L: 317, d: '17°' },
  { g: '♂', L: 329, d: '29°' }, { g: '♃', L: 224, d: '14°' }, { g: '♄', L: 337, d: '07°' }, { g: '♅', L: 290, d: '20°' },
  { g: '♆', L: 292, d: '22°' }, { g: '♇', L: 237, d: '27°' }
];
const SIGNS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

function SampleWheel() {
  const C = 300, ASC = 311;
  const P = (L, r) => { const a = (180 + L - ASC) * Math.PI / 180; return [C + r * Math.cos(a), C - r * Math.sin(a)]; };
  const Pf = (phi, r) => { const a = phi * Math.PI / 180; return [C + r * Math.cos(a), C - r * Math.sin(a)]; };
  const anim = (name, dur, delay, extra) => Object.assign({ animation: `${name} ${dur}s cubic-bezier(.3,0,.2,1) ${delay}s both` }, extra || {});
  const line = (key, a, b, stroke, sw, delay, dur = .5) => <line key={key} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={stroke} strokeWidth={sw} pathLength={1} strokeDasharray={1} style={anim('om-draw', dur, delay)} />;
  const txt = (key, pos, s, size, fill, fam, delay, extra) => <text key={key} x={pos[0]} y={pos[1]} fontSize={size} fill={fill} fontFamily={fam} textAnchor="middle" dominantBaseline="central" style={anim('om-fade', .4, delay)} {...(extra || {})}>{s}</text>;
  const kids = [];
  [[280, .9], [256, .55], [232, .8], [118, .6]].forEach(([r, sw], i) =>
    kids.push(<circle key={'r' + r} cx={C} cy={C} r={r} fill="none" stroke={INK} strokeWidth={sw} pathLength={1} strokeDasharray={1} style={anim('om-draw', .65, i * .09)} />));
  for (let m = 0; m < 12; m++) {
    const ts = [];
    for (let d = m * 30; d < m * 30 + 30; d++) {
      const major = d % 30 === 0, ten = d % 10 === 0, five = d % 5 === 0;
      const len = major ? 24 : ten ? 12 : five ? 8 : 4;
      const a = P(d, 280), b = P(d, 280 - len);
      ts.push(<line key={'t' + d} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={INK} strokeWidth={major ? .9 : ten ? .7 : .45} />);
    }
    kids.push(<g key={'ts' + m} style={anim('om-fade', .35, .4 + m * .035)}>{ts}</g>);
  }
  SIGNS.forEach((g, m) => {
    kids.push(line('zd' + m, P(m * 30, 232), P(m * 30, 256), HAIR, .6, .35 + m * .03, .35));
    kids.push(txt('zg' + m, P(m * 30 + 15, 244), g + '︎', 14, INK, SYM, .75 + m * .03));
  });
  for (let k = 0; k < 12; k++) {
    const phi = 180 + k * 30, angle = k === 0 || k === 9;
    kids.push(line('hc' + k, Pf(phi, 118), Pf(phi, angle ? 280 : 232), angle ? INK : HAIR, angle ? 1 : .5, .45 + k * .03, .5));
    kids.push(txt('hn' + k, Pf(phi + 15, 133), ROMAN[k], 10.5, MUTED, MONO, .9 + k * .02, { letterSpacing: '.05em' }));
  }
  kids.push(txt('ac', Pf(180, 294), 'AC', 9.5, INK, MONO, 1.1, { fontWeight: 500 }));
  kids.push(txt('mc', Pf(90, 294), 'MC', 9.5, INK, MONO, 1.15, { fontWeight: 500 }));
  const sorted = SAMPLE.map(p => ({ ...p })).sort((a, b) => a.L - b.L);
  let prev = -99; sorted.forEach(p => { p.D = p.L; if (p.D - prev < 8) p.D = prev + 8; prev = p.D; });
  const pk = [];
  sorted.forEach((p, i) => {
    pk.push(<line key={'pt' + i} x1={P(p.L, 232)[0]} y1={P(p.L, 232)[1]} x2={P(p.L, 224)[0]} y2={P(p.L, 224)[1]} stroke={INK} strokeWidth={.9} />);
    if (p.D !== p.L) pk.push(<line key={'pl' + i} x1={P(p.L, 224)[0]} y1={P(p.L, 224)[1]} x2={P(p.D, 212)[0]} y2={P(p.D, 212)[1]} stroke={HAIR} strokeWidth={.5} />);
    pk.push(<text key={'pg' + i} x={P(p.D, 198)[0]} y={P(p.D, 198)[1]} fontSize={17} fill={INK} fontFamily={SYM} textAnchor="middle" dominantBaseline="central">{p.g + '︎'}</text>);
    pk.push(<text key={'pd' + i} x={P(p.D, 174)[0]} y={P(p.D, 174)[1]} fontSize={10} fill={MUTED} fontFamily={MONO} textAnchor="middle" dominantBaseline="central">{p.d}</text>);
  });
  kids.push(<g key="planets" style={anim('om-settle', .7, .85, { transformOrigin: '300px 300px', transformBox: 'view-box' })}>{pk}</g>);
  let n = 0;
  for (let i = 0; i < SAMPLE.length; i++) for (let j = i + 1; j < SAMPLE.length; j++) {
    let diff = Math.abs(SAMPLE[i].L - SAMPLE[j].L); diff = Math.min(diff, 360 - diff);
    const asp = [[60, GOLD], [90, COP], [120, GOLD], [180, COP]].find(([a]) => Math.abs(diff - a) <= 6);
    if (!asp) continue;
    kids.push(line('as' + n, P(SAMPLE[i].L, 116), P(SAMPLE[j].L, 116), asp[1], asp[0] % 90 === 0 ? .75 : .55, 1.15 + n * .05, .45));
    n++;
  }
  kids.push(<circle key="cdot" cx={C} cy={C} r={1.6} fill={INK} style={anim('om-fade', .3, 1.3)} />);
  return <svg viewBox="0 0 600 600" width="100%" height="100%" style={{ display: 'block', overflow: 'visible' }} role="img" aria-label="Sample natal chart wheel">{kids}</svg>;
}

export default function Landing() {
  const [charts, setCharts] = useState(null);
  useEffect(() => { getStats().then(s => setCharts(s.charts)).catch(() => {}); }, []);

  return (
    <div style={{ minHeight: '100vh', background: NAVY, color: INK, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', fontFamily: "'Instrument Sans',Helvetica,Arial,sans-serif" }}>
      <style>{CSS}</style>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}><Starfield /></div>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'rgba(28,37,56,.42)' }} />

      <header style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid rgba(244,236,220,.2)', maxWidth: 1200, width: '100%', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 22, letterSpacing: '.14em', textTransform: 'uppercase' }}>AstroMeridian</span>
          <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', color: MUTED, textTransform: 'uppercase' }}>Natal Atlas</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/login" style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', borderBottom: '1px solid rgba(244,236,220,.35)', paddingBottom: 2 }}>Sign in</Link>
        </div>
      </header>

      <main style={{ position: 'relative', flex: 1, width: '100%', maxWidth: 1200, margin: '0 auto' }}>

        <section style={{ padding: '44px 24px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 20 }}>
          <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: COP, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ display: 'block', width: 28, height: 1, background: COP }} />
            <span>Free birth chart · A minute to set up</span>
            <span style={{ display: 'block', width: 28, height: 1, background: COP }} />
          </div>
          <h1 style={{ margin: 0, fontFamily: SERIF, fontWeight: 500, fontSize: 'clamp(38px,9vw,64px)', lineHeight: 1.04, letterSpacing: '-.01em', maxWidth: 680, textWrap: 'balance' }}>You were born under a sky no one else has ever seen.</h1>
          <p style={{ margin: 0, fontSize: 17, lineHeight: 1.55, color: MUTED, maxWidth: 460, textWrap: 'pretty' }}>Enter your birth date, time and place. We plot the heavens exactly as they stood in that minute, then explain what they mean, in plain English.</p>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: '100%', maxWidth: 360, marginTop: 4 }}>
            <Link to="/signup" className="ld-cta" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', height: 54, padding: '0 20px 0 24px', background: INK, color: NAVY, border: 'none', borderBottom: 'none', borderRadius: 2, fontFamily: "'Instrument Sans',sans-serif", fontWeight: 500, fontSize: 16, letterSpacing: '.01em' }}>
              <span>Get your free birth chart</span>
              <span style={{ fontFamily: MONO, fontSize: 14, opacity: .8 }}>→</span>
            </Link>
            <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.08em', color: MUTED }}>Takes about a minute</span>
          </div>
        </section>

        <section style={{ padding: '28px 16px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{ width: '100%', maxWidth: 560, aspectRatio: '1 / 1', position: 'relative' }}><SampleWheel /></div>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px 18px', fontFamily: MONO, fontSize: 11, letterSpacing: '.06em', color: MUTED, textAlign: 'center' }}>
            <span>14 MAR 1994</span><span>06:42 UTC</span><span>38°43′N · 9°08′W</span>
            <span style={{ width: '100%', color: COP, textTransform: 'uppercase', letterSpacing: '.14em', fontSize: 10, marginTop: 2 }}>Sample chart · Lisbon · Equal houses</span>
          </div>
        </section>

        <section style={{ padding: '56px 24px 24px', display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, borderBottom: `1px solid ${INK}`, paddingBottom: 12 }}>
            <h2 style={{ margin: 0, fontFamily: SERIF, fontWeight: 500, fontSize: 30, lineHeight: 1.1 }}>Six instruments</h2>
            <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: MUTED, whiteSpace: 'nowrap' }}>Plate I – VI</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', background: NAVY, borderTop: '1px solid rgba(244,236,220,.25)', borderLeft: '1px solid rgba(244,236,220,.25)' }}>
            {OFFERINGS.map(([n, title, desc, to]) => (
              <Link key={n} to={to} className="ld-cell" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '18px 16px 20px', background: NAVY, border: 'none', borderRight: '1px solid rgba(244,236,220,.25)', borderBottom: '1px solid rgba(244,236,220,.25)', minHeight: 150 }}>
                <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.14em', color: COP }}>{n}</span>
                <span style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 24, lineHeight: 1.05 }}>{title}</span>
                <span style={{ fontSize: 13, lineHeight: 1.45, color: MUTED, textWrap: 'pretty' }}>{desc}</span>
              </Link>
            ))}
          </div>
        </section>

        <section style={{ padding: '40px 24px 24px' }}>
          <div style={{ border: '1px solid rgba(244,236,220,.3)', background: 'rgba(244,236,220,.08)', padding: '26px 22px 24px', display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 720, margin: '0 auto', position: 'relative' }}>
            <div style={{ position: 'absolute', top: -1, left: 22, right: 22, height: 1, background: GOLD }} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', fontFamily: MONO, fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: MUTED }}>
              <span>From a sample reading</span>
              <span style={{ color: COP }}>Moon · 08°14′ Scorpio · Eighth house</span>
            </div>
            <p style={{ margin: 0, fontFamily: SERIF, fontSize: 'clamp(21px,5.2vw,27px)', lineHeight: 1.35, fontWeight: 400, textWrap: 'pretty' }}>Your Moon sits low in the chart, in the house of things kept private. You don't feel emotions so much as absorb them: slowly, completely, and often before you have words for what has happened. People mistake the stillness for calm. It isn't calm; it's depth. What you need most from the people closest to you is not reassurance but honesty, because you can always tell when something is being withheld, and the withholding hurts more than the truth would.</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, borderTop: '1px solid rgba(244,236,220,.2)', paddingTop: 14, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: MUTED }}>Every reading is written like this: specific to your chart, in full sentences.</span>
              <Link to="/signup" style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Draw your own →</Link>
            </div>
          </div>
        </section>

        <section style={{ padding: '40px 24px 56px', display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 720, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, alignItems: 'center', fontFamily: MONO, fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: MUTED, textAlign: 'center', flexWrap: 'wrap' }}>
            <span>{charts == null ? ' ' : `${charts.toLocaleString('en-GB')} ${charts === 1 ? 'chart' : 'charts'} drawn so far`}</span>
            <span style={{ color: GOLD }}>·</span>
            <span>Positions to the arc-minute</span>
          </div>
        </section>
      </main>

      <footer style={{ position: 'relative', background: INK, color: NAVY, padding: '36px 24px 28px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '24px 40px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 300 }}>
              <span style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 20, letterSpacing: '.14em', textTransform: 'uppercase' }}>AstroMeridian</span>
              <span style={{ fontSize: 13, lineHeight: 1.5, color: 'rgba(28,37,56,.7)' }}>Planetary positions computed to the arc-minute. Written by people, checked against the ephemeris.</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(120px,auto))', gap: '10px 40px', fontSize: 13 }}>
              {[['Birth chart', '/natal-chart'], ['Synastry', '/synastry'], ['Transits', '/transits'], ['Daily horoscope', '/daily-horoscope'], ['Tarot', '/tarot'], ['Numerology', '/numerology'], ['Pricing', '/subscription'], ['Sign in', '/login']].map(([label, to]) => (
                <Link key={label} to={to} style={{ color: 'rgba(28,37,56,.85)', borderBottom: 'none' }}>{label}</Link>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '8px 20px', borderTop: '1px solid rgba(28,37,56,.2)', paddingTop: 16, fontFamily: MONO, fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(28,37,56,.6)' }}>
            <span>© MMXXVI AstroMeridian</span>
            <span>For reflection, not prediction</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
