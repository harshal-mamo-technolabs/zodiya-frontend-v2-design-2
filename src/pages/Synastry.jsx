import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Starfield from '../components/Starfield.jsx';
import NavMenu, { AddProfile } from '../components/NavMenu.jsx';
import { getSynastry, listProfiles } from '../lib/api.js';
import { readActive } from '../lib/active-profile.js';
import { BODY_GLYPH, SIGN_GLYPH, SIGNS } from '../lib/chart-view.js';
import { avatarImage } from '../lib/assets.js';

/* A port of Synastry.dc.html: pick two saved profiles, then read one sky laid over the other. */

const MONO = "'IBM Plex Mono',monospace";
const SERIF = "'Cormorant Garamond',Georgia,serif";
const SYM = "'Noto Sans Symbols','Segoe UI Symbol','Apple Symbols',serif";
const INK = '#F4ECDC', MUTED = 'rgba(244,236,220,.68)', COP = '#5F8B7A', GOLD = '#B4933F', HAIR = 'rgba(244,236,220,.35)', NAVY = '#1C2538';
const WHEEL_LINES = 14;

const CSS = `
@keyframes om-settle-r{from{opacity:0;transform:rotate(8deg)}to{opacity:1;transform:rotate(0deg)}}
@keyframes om-pulse{0%,100%{opacity:.45}50%{opacity:1}}
.syn-row:hover{color:#5F8B7A !important}
.syn-back:hover{color:#5F8B7A !important;border-bottom-color:#5F8B7A !important}
`;

const cap = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const glyph = key => (BODY_GLYPH[key] || '') + '︎';
const norm = a => ((a % 360) + 360) % 360;
/** Midpoint of two longitudes along the shorter arc, so a pair across 0° does not land opposite. */
const midpoint = (a, b) => norm(a + (norm(b - a + 180) - 180) / 2);

/* ------------------------------------------------------------- the bi-wheel */
function Wheel({ a, b, contacts, speed = 1 }) {
  const T = s => (s / speed).toFixed(3) + 's';
  const C = 300, asc = a.asc;
  const P = (L, r) => { const t = (180 + L - asc) * Math.PI / 180; return [C + r * Math.cos(t), C - r * Math.sin(t)]; };
  const anim = (n, dur, delay, extra) => Object.assign({ animation: `${n} ${T(dur)} cubic-bezier(.3,0,.2,1) ${T(delay)} both` }, extra || {});
  const line = (key, p, q, stroke, sw, delay, dur = .5) => <line key={key} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke={stroke} strokeWidth={sw} pathLength={1} strokeDasharray={1} style={anim('om-draw', dur, delay)} />;
  const txt = (key, pos, s, size, fill, fam, delay, extra) => <text key={key} x={pos[0]} y={pos[1]} fontSize={size} fill={fill} fontFamily={fam} textAnchor="middle" dominantBaseline="central" style={anim('om-fade', .4, delay)} {...(extra || {})}>{s}</text>;
  const kids = [];
  // rings: zodiac 284 to 262, outer band 262 to 208, divider 208, inner band 208 to 150, aspect core 150
  [[284, .9], [262, .7], [208, .8], [150, .6]].forEach(([r, sw], i) =>
    kids.push(<circle key={'r' + r} cx={C} cy={C} r={r} fill="none" stroke={i === 2 ? COP : INK} strokeWidth={sw} pathLength={1} strokeDasharray={1} style={anim('om-draw', .65, i * .09)} />));
  for (let m = 0; m < 12; m++) {
    const ts = [];
    for (let d = m * 30; d < m * 30 + 30; d++) {
      const major = d % 30 === 0, ten = d % 10 === 0, five = d % 5 === 0;
      const len = major ? 22 : ten ? 11 : five ? 7 : 3.5;
      const p = P(d, 284), q = P(d, 284 - len);
      ts.push(<line key={'t' + d} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke={INK} strokeWidth={major ? .9 : ten ? .7 : .45} />);
    }
    kids.push(<g key={'ts' + m} style={anim('om-fade', .35, .4 + m * .035)}>{ts}</g>);
    kids.push(txt('zg' + m, P(m * 30 + 15, 273), SIGN_GLYPH[SIGNS[m]] + '︎', 13, INK, SYM, .75 + m * .03));
  }
  // person one's house cusps through both bands, faint
  a.cusps.forEach((cu, k) => {
    const ang = k % 3 === 0;
    kids.push(line('hc' + k, P(cu, 150), P(cu, ang ? 284 : 262), ang ? INK : HAIR, ang ? .9 : .4, .45 + k * .03));
  });
  kids.push(txt('ac', P(a.cusps[0], 297), 'AC', 9.5, INK, MONO, 1.1, { fontWeight: 500 }));
  kids.push(txt('mc', P(a.cusps[9], 297), 'MC', 9.5, INK, MONO, 1.12, { fontWeight: 500 }));
  // planets, inner (person one) and outer (person two)
  const band = (src, rGlyph, rDeg, rTick0, rTick1, color, key, animName) => {
    const arr = Object.keys(src).map(p => ({ p, L: src[p] })).sort((x, y) => x.L - y.L);
    let prev = -99; arr.forEach(o => { o.D = o.L; if (o.D - prev < 9) o.D = prev + 9; prev = o.D; });
    const pk = [];
    arr.forEach((o, i) => {
      pk.push(<line key={'tk' + i} x1={P(o.L, rTick0)[0]} y1={P(o.L, rTick0)[1]} x2={P(o.L, rTick1)[0]} y2={P(o.L, rTick1)[1]} stroke={color} strokeWidth={1} />);
      if (o.D !== o.L) pk.push(<line key={'ld' + i} x1={P(o.L, rTick1)[0]} y1={P(o.L, rTick1)[1]} x2={P(o.D, rGlyph + (rGlyph > rDeg ? 10 : -10))[0]} y2={P(o.D, rGlyph + (rGlyph > rDeg ? 10 : -10))[1]} stroke={HAIR} strokeWidth={.5} />);
      pk.push(<text key={'g' + i} x={P(o.D, rGlyph)[0]} y={P(o.D, rGlyph)[1]} fontSize={15} fill={color} fontFamily={SYM} textAnchor="middle" dominantBaseline="central">{glyph(o.p)}</text>);
      pk.push(<text key={'d' + i} x={P(o.D, rDeg)[0]} y={P(o.D, rDeg)[1]} fontSize={8.5} fill={MUTED} fontFamily={MONO} textAnchor="middle" dominantBaseline="central">{String(Math.floor(o.L % 30)).padStart(2, '0') + '°'}</text>);
    });
    kids.push(<g key={key} style={anim(animName, .7, .85, { transformOrigin: '300px 300px', transformBox: 'view-box' })}>{pk}</g>);
  };
  band(b.bodies, 240, 220, 262, 254, COP, 'outer', 'om-settle-r');
  band(a.bodies, 180, 162, 208, 200, INK, 'inner', 'om-settle');
  // cross aspects: the strongest lines, and a small ring where two planets sit together
  const strong = contacts.filter(x => x.weight >= 1.5);
  strong.filter(x => x.kind !== 'conjunction').slice(0, WHEEL_LINES).forEach((x, n) => {
    kids.push(line('as' + n, P(a.bodies[x.a], 148), P(b.bodies[x.b], 148), x.kind === 'flow' ? GOLD : COP, x.weight >= 2 ? .85 : .55, 1.15 + n * .05, .45));
  });
  strong.filter(x => x.kind === 'conjunction').forEach((x, n) => {
    const p = P(midpoint(a.bodies[x.a], b.bodies[x.b]), 148);
    kids.push(<circle key={'cj' + n} cx={p[0]} cy={p[1]} r={3.5} fill="none" stroke={INK} strokeWidth={.9} style={anim('om-fade', .4, 1.4 + n * .05)} />);
  });
  kids.push(<circle key="cd" cx={C} cy={C} r={1.6} fill={INK} style={anim('om-fade', .3, 1.3)} />);
  return <svg viewBox="0 0 600 600" width="100%" height="100%" style={{ display: 'block', overflow: 'visible' }} role="img" aria-label="Bi-wheel synastry chart">{kids}</svg>;
}

/* ------------------------------------------------------- the pairing preview */
function Hero({ pa, pb }) {
  const C = 200, RA = [C - 118, C], RB = [C + 118, C], midY = C - 70, LIGHT = 'rgba(244,236,220,.25)';
  const both = !!(pa && pb);
  const ticks = [];
  for (let d = 0; d < 360; d += 6) {
    const maj = d % 30 === 0, t = d * Math.PI / 180, len = maj ? 10 : 5;
    ticks.push(<line key={'t' + d} x1={C + 178 * Math.cos(t)} y1={C + 178 * Math.sin(t)} x2={C + (178 - len) * Math.cos(t)} y2={C + (178 - len) * Math.sin(t)} stroke={INK} strokeWidth={maj ? .8 : .5} opacity={.4} />);
  }
  const node = (pos, p, color) => {
    const clip = `syn-clip-${pos[0]}`;
    return (
      <g key={pos.join('-')} style={{ animation: 'om-settle .5s cubic-bezier(.3,0,.2,1) both' }}>
        {p && <circle cx={pos[0]} cy={pos[1]} r={46} fill="none" stroke={color} strokeWidth={1.2} style={{ animation: 'om-pulse 2.8s ease-in-out infinite' }} />}
        <circle cx={pos[0]} cy={pos[1]} r={34} fill={p ? 'rgba(244,236,220,.1)' : 'transparent'} stroke={p ? color : LIGHT} strokeWidth={p ? 1.4 : .8} strokeDasharray={p ? undefined : '3 5'} />
        {p?.avatar ? (
          <>
            <clipPath id={clip}><circle cx={pos[0]} cy={pos[1]} r={33} /></clipPath>
            <image href={avatarImage(p.avatar)} x={pos[0] - 33} y={pos[1] - 33} width={66} height={66} clipPath={`url(#${clip})`} preserveAspectRatio="xMidYMid slice" />
          </>
        ) : (
          <text x={pos[0]} y={pos[1] - 2} textAnchor="middle" dominantBaseline="central" fontSize={22} fontFamily={SERIF} fill={p ? INK : 'rgba(244,236,220,.35)'}>{p ? p.firstName.trim().charAt(0).toUpperCase() : '?'}</text>
        )}
        {p && <text x={pos[0]} y={pos[1] + (p.avatar ? 58 : 24)} textAnchor="middle" fontSize={8.5} letterSpacing={1} fontFamily={MONO} fill={color}>{p.zodiacSign.toUpperCase()}</text>}
      </g>
    );
  };
  return (
    <svg viewBox="0 0 400 400" width="100%" height="100%" role="img" aria-label="Synastry pairing preview" style={{ display: 'block', overflow: 'visible' }}>
      {[178, 150].map((r, i) => <circle key={'r' + r} cx={C} cy={C} r={r} fill="none" stroke={LIGHT} strokeWidth={i === 0 ? .7 : .5} />)}
      <g style={{ transformOrigin: `${C}px ${C}px`, animation: 'om-turn 90s linear infinite' }}>{ticks}</g>
      <path d={`M${RA[0]} ${RA[1]} Q${C} ${midY} ${RB[0]} ${RB[1]}`} fill="none" stroke={both ? GOLD : LIGHT} strokeWidth={both ? 1.6 : .8} pathLength={1} strokeDasharray={1} style={{ animation: 'om-draw 1.1s cubic-bezier(.3,0,.2,1) both', filter: both ? 'drop-shadow(0 0 6px rgba(180,147,63,.65))' : 'none', transition: 'stroke .4s ease' }} />
      {node(RA, pa, INK)}
      {node(RB, pb, COP)}
    </svg>
  );
}

/* ------------------------------------------------------------------ the gauge */
function Gauge({ value }) {
  const W = 260, y = 30;
  const ticks = [];
  for (let i = 0; i <= 20; i++) {
    const x = 6 + (W - 12) * i / 20, maj = i % 5 === 0;
    ticks.push(<line key={'t' + i} x1={x} y1={y} x2={x} y2={y + (maj ? 10 : 5)} stroke={INK} strokeWidth={maj ? .9 : .5} />);
  }
  ['Strained', 'Workable', 'Warm', 'Rare'].forEach((w, i) => ticks.push(<text key={'l' + i} x={6 + (W - 12) * (i * 5 + 2.5) / 20} y={y + 22} fontSize={7.5} fill={MUTED} fontFamily={MONO} textAnchor="middle" letterSpacing={.8}>{w.toUpperCase()}</text>));
  const x = 6 + (W - 12) * value;
  return (
    <svg viewBox={`0 0 ${W} 64`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }} aria-label="Overall compatibility gauge">
      <line x1={6} y1={y} x2={W - 6} y2={y} stroke={INK} strokeWidth={1} pathLength={1} strokeDasharray={1} style={{ animation: 'om-draw .7s cubic-bezier(.3,0,.2,1) both' }} />
      <g style={{ animation: 'om-fade .4s ease .3s both' }}>{ticks}</g>
      <g style={{ animation: 'om-fade .5s ease .7s both' }}>
        <path d={`M${x - 5} 8 L${x + 5} 8 L${x} 18 Z`} fill={GOLD} />
        <line x1={x} y1={18} x2={x} y2={y} stroke={GOLD} strokeWidth={1.2} />
      </g>
    </svg>
  );
}

const mono10 = { fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: MUTED };
const KIND_COLOR = { tense: COP, flow: GOLD, conjunction: MUTED };

export default function Synastry() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [stage, setStage] = useState('form');
  const [profiles, setProfiles] = useState([]);
  const [slotA, setSlotA] = useState(null);
  const [slotB, setSlotB] = useState(params.get('with'));
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState({ emotional: true });

  useEffect(() => {
    let live = true;
    listProfiles()
      .then(list => {
        if (!live) return;
        if (!list.length) { navigate('/birth-details'); return; }
        setProfiles(list);
        const active = readActive();
        setSlotA((list.find(p => p._id === active) || list.find(p => p.isPrimary) || list[0])._id);
      })
      .catch(e => { if (e.status === 401) navigate('/login'); else if (live) setError(e.message); });
    return () => { live = false; };
  }, [navigate]);

  const pa = profiles.find(p => p._id === slotA) || null;
  const pb = profiles.find(p => p._id === slotB) || null;
  const ready = !!(pa && pb) && slotA !== slotB;

  const submit = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError('');
    try {
      setData(await getSynastry(slotA, slotB));
      setOpen({ emotional: true });
      setStage('result');
      window.scrollTo(0, 0);
    } catch (e) {
      if (e.status === 401) { navigate('/login'); return; }
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const option = (p, chosenId, otherId, color, pick) => {
    const selected = p._id === chosenId, disabled = p._id === otherId;
    return (
      <button key={p._id} type="button" onClick={() => { if (!disabled) pick(p._id); }} disabled={disabled} aria-pressed={selected} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: 84, background: 'transparent', border: 'none', padding: 0, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? .35 : 1, color: INK, font: 'inherit' }}>
        <span style={{ width: 54, height: 54, borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SERIF, fontSize: 19, background: selected ? color : 'rgba(244,236,220,.08)', border: selected ? `2px solid ${color}` : '1px solid rgba(244,236,220,.3)', color: selected ? NAVY : INK, boxShadow: selected ? `0 0 14px ${color === INK ? 'rgba(244,236,220,.5)' : 'rgba(95,139,122,.55)'}` : 'none', transition: 'all .3s cubic-bezier(.3,0,.2,1)' }}>
          {p.avatar ? <img src={avatarImage(p.avatar)} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : p.firstName.trim().charAt(0).toUpperCase()}
        </span>
        <span style={{ fontSize: 12, color: selected ? INK : MUTED, textAlign: 'center', lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 84 }}>{p.firstName} {p.lastName}</span>
        <span style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(244,236,220,.5)' }}>{cap(p.zodiacSign)}</span>
      </button>
    );
  };

  const slots = profiles.length ? [
    { label: 'Person one', rule: INK, render: p => option(p, slotA, slotB, INK, setSlotA) },
    { label: 'Person two', rule: COP, render: p => option(p, slotB, slotA, COP, setSlotB) }
  ] : [];

  return (
    <div style={{ minHeight: '100vh', background: NAVY, color: INK, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', fontFamily: "'Instrument Sans',Helvetica,Arial,sans-serif" }}>
      <style>{CSS}</style>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}><Starfield /></div>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'rgba(28,37,56,.42)' }} />

      <header style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '18px 24px', borderBottom: '1px solid rgba(244,236,220,.2)', maxWidth: 1200, width: '100%', margin: '0 auto' }}>
        <Link to="/" style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', borderBottom: 'none', whiteSpace: 'nowrap' }}>← Home</Link>
        <Link to="/" style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 18, letterSpacing: '.14em', textTransform: 'uppercase', borderBottom: 'none' }}>AstroMeridian</Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: MUTED, whiteSpace: 'nowrap' }}>{stage === 'form' ? 'Synastry · entry' : 'Synastry · plate'}</span>
          <NavMenu current="Synastry" />
        </div>
      </header>

      {adding && <AddProfile onClose={() => setAdding(false)} />}

      {stage === 'form' && (
        <main style={{ position: 'relative', flex: 1, width: '100%', maxWidth: 1200, margin: '0 auto', padding: '32px 24px 56px', display: 'flex', flexDirection: 'column', gap: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 560 }}>
            <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: COP }}>Comparative plate</span>
            <h1 style={{ margin: 0, fontFamily: SERIF, fontWeight: 500, fontSize: 'clamp(32px,8vw,46px)', lineHeight: 1.06, textWrap: 'balance' }}>Two skies, laid one over the other.</h1>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: MUTED, textWrap: 'pretty' }}>Choose two saved profiles. Their charts are already on file. Nothing to type.</p>
          </div>

          <div style={{ width: '100%', maxWidth: 460, aspectRatio: '1 / 1', margin: '0 auto' }}><Hero pa={pa} pb={pb} /></div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '30px 44px' }}>
            {slots.map(slot => (
              <div key={slot.label} style={{ display: 'flex', flexDirection: 'column', gap: 14, borderTop: `2px solid ${slot.rule}`, paddingTop: 14 }}>
                <span style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500 }}>{slot.label}</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>{profiles.map(slot.render)}</div>
              </div>
            ))}
          </div>

          {profiles.length > 0 && profiles.length < 2 && (
            <p style={{ margin: 0, fontSize: 13.5, color: MUTED }}>Add another profile to run a comparison. <button type="button" onClick={() => setAdding(true)} style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: INK, font: 'inherit', borderBottom: '1px solid rgba(244,236,220,.35)' }}>Add a profile</button></p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 420 }}>
            {error && <div role="alert" style={{ borderLeft: `2px solid ${GOLD}`, background: 'rgba(180,147,63,.12)', padding: '10px 14px', fontSize: 14, lineHeight: 1.45 }}>{error}</div>}
            <button type="button" onClick={submit} disabled={!ready || busy} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', height: 56, padding: '0 20px 0 24px', background: ready && !busy ? INK : 'rgba(244,236,220,.35)', color: NAVY, border: 'none', borderRadius: 2, fontFamily: "'Instrument Sans',sans-serif", fontWeight: 500, fontSize: 16, cursor: ready && !busy ? 'pointer' : 'not-allowed' }}>
              <span>{busy ? 'Comparing…' : 'Compare the charts'}</span>
              <span style={{ fontFamily: MONO, fontSize: 14, opacity: .8 }}>→</span>
            </button>
            <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: MUTED }}>{ready ? 'Both profiles chosen' : 'Choose two different profiles to compare'}</span>
          </div>
        </main>
      )}

      {stage === 'result' && data && (
        <main style={{ position: 'relative', flex: 1, width: '100%', maxWidth: 1200, margin: '0 auto', padding: '0 0 56px', display: 'flex', flexDirection: 'column', gap: 0 }}>
          <section style={{ padding: '18px 12px 0' }}>
            <div style={{ width: '100%', aspectRatio: '1 / 1', maxWidth: 640, margin: '0 auto' }}><Wheel a={data.a} b={data.b} contacts={data.contacts} /></div>
          </section>

          <section style={{ padding: '14px 24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px 18px', fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: MUTED }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}><span style={{ width: 9, height: 9, border: `1px solid ${INK}`, background: INK, display: 'block' }} />{data.a.firstName} · inner</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}><span style={{ width: 9, height: 9, border: `1px solid ${INK}`, background: COP, display: 'block' }} />{data.b.firstName} · outer</span>
            </div>
            <h1 style={{ margin: 0, fontFamily: SERIF, fontWeight: 500, fontSize: 'clamp(28px,7vw,40px)', lineHeight: 1.12, textWrap: 'balance' }}>{data.headline}</h1>
            <button type="button" onClick={() => setStage('form')} className="syn-back" style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: MUTED, fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', borderBottom: '1px solid rgba(244,236,220,.35)' }}>Edit either entry</button>
          </section>

          <section style={{ padding: '30px 24px 0' }}>
            <div style={{ border: `1px solid ${INK}`, background: 'rgba(244,236,220,.08)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '20px 20px 18px', borderRight: '1px solid rgba(244,236,220,.25)', borderBottom: '1px solid rgba(244,236,220,.25)' }}>
                <span style={mono10}>Overall reading</span>
                <div style={{ height: 64 }}><Gauge value={data.score.value} /></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                  <span style={{ fontFamily: SERIF, fontSize: 26, lineHeight: 1.1 }}>{data.score.word}</span>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: MUTED }}>{data.score.detail}</span>
                </div>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: MUTED, textWrap: 'pretty' }}>{data.score.note}</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', padding: '16px 20px 12px', borderBottom: '1px solid rgba(244,236,220,.25)' }}>
                <span style={{ ...mono10, paddingBottom: 8 }}>Strongest cross-aspects</span>
                {data.top.map(t => (
                  <div key={`${t.a}-${t.type}-${t.b}`} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'baseline', padding: '8px 0', borderTop: '1px solid rgba(244,236,220,.18)' }}>
                    <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 14 }}><span style={{ fontFamily: SYM, fontSize: 14, letterSpacing: '.04em' }}>{glyph(t.a)} {t.glyph} {glyph(t.b)}</span><span>{t.text}</span></span>
                    <span style={{ fontFamily: MONO, fontSize: 10, color: KIND_COLOR[t.kind], whiteSpace: 'nowrap' }}>{t.orbText}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section style={{ padding: '34px 24px 0', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, borderBottom: `1px solid ${INK}`, paddingBottom: 10 }}>
              <h2 style={{ margin: 0, fontFamily: SERIF, fontWeight: 500, fontSize: 26 }}>The comparison</h2>
              <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: MUTED }}>Four sections</span>
            </div>
            {data.sections.map(s => (
              <div key={s.key} style={{ borderBottom: '1px solid rgba(244,236,220,.25)' }}>
                <button type="button" onClick={() => setOpen(o => ({ ...o, [s.key]: !o[s.key] }))} aria-expanded={!!open[s.key]} className="syn-row" style={{ display: 'flex', alignItems: 'baseline', gap: 14, width: '100%', background: 'transparent', border: 'none', padding: '17px 0', cursor: 'pointer', textAlign: 'left', color: INK, font: 'inherit' }}>
                  <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.14em', color: COP, flex: '0 0 auto', width: 22 }}>{s.numeral}</span>
                  <span style={{ flex: 1, fontFamily: SERIF, fontSize: 25, lineHeight: 1.1 }}>{s.title}</span>
                  <span style={{ display: 'flex', gap: 3, flex: '0 0 auto' }}>
                    {[0, 1, 2, 3, 4].map(k => <span key={k} style={{ width: 6, height: 6, border: `1px solid ${INK}`, background: k < s.score ? INK : 'transparent', display: 'block' }} />)}
                  </span>
                  <span style={{ fontFamily: MONO, fontSize: 15, color: MUTED, flex: '0 0 auto', width: 12, textAlign: 'center' }}>{open[s.key] ? '−' : '+'}</span>
                </button>
                {open[s.key] && (
                  <div style={{ padding: '0 0 22px', display: 'flex', flexDirection: 'column', gap: 14, animation: 'om-rise .26s cubic-bezier(.3,0,.2,1) both' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, borderLeft: `1px solid ${GOLD}`, paddingLeft: 12 }}>
                      {s.basis.map(b => <span key={b} style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '.04em', color: INK, lineHeight: 1.45 }}>{b}</span>)}
                    </div>
                    {s.paragraphs.map((p, i) => <p key={i} style={{ margin: 0, fontSize: 16, lineHeight: 1.62, textWrap: 'pretty', maxWidth: '62ch' }}>{p}</p>)}
                  </div>
                )}
              </div>
            ))}
          </section>
        </main>
      )}
    </div>
  );
}
