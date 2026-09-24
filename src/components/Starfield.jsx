import { memo } from 'react';

const CREAM = 'rgba(244,236,220,';
// a few constellation figures — hairlines joining bright stars
const FIGS = [[[420, 380], [470, 340], [540, 350], [600, 400], [640, 470]], [[880, 300], [930, 330], [960, 400], [920, 460], [860, 440]], [[380, 900], [440, 950], [520, 940], [560, 880]], [[900, 950], [960, 900], [1020, 920], [1060, 990]]];

/** Rotating planisphere background. `auth` adds the hour spokes, constellation nodes and ring-draw of the sign-in screen. */
function Starfield({ auth = false }) {
  // deterministic pseudo-random stars so the sky is stable across re-renders
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const stars = [];
  for (let i = 0; i < 260; i++) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 640, m = rnd();
    stars.push(<circle key={'s' + i} cx={700 + r * Math.cos(a)} cy={700 + r * Math.sin(a)} r={m > .93 ? 1.6 : m > .7 ? 1.05 : .6} fill={CREAM + (m > .93 ? .85 : m > .7 ? .55 : .3) + ')'} />);
  }
  const lines = FIGS.map((f, i) => <polyline key={'f' + i} points={f.map(p => p.join(',')).join(' ')} fill="none" stroke={CREAM + '.28)'} strokeWidth={.6} />);
  const nodes = auth ? FIGS.flat().map((p, i) => <circle key={'n' + i} cx={p[0]} cy={p[1]} r={1.9} fill="none" stroke={CREAM + '.7)'} strokeWidth={.6} />) : [];
  // graduated rings + hour lines of the planisphere
  const rings = [640, 520, 380].map((r, i) => (
    <circle key={'r' + r} cx={700} cy={700} r={r} fill="none" stroke={CREAM + (i === 0 ? '.28)' : '.14)')} strokeWidth={i === 0 ? .8 : .5}
      {...(auth ? { pathLength: 1, strokeDasharray: 1, style: { animation: `om-draw 1.4s cubic-bezier(.3,0,.2,1) ${i * .15}s both` } } : {})} />
  ));
  const ticks = [];
  for (let d = 0; d < 360; d += 2) {
    const maj = d % 30 === 0, a = d * Math.PI / 180, len = maj ? 14 : d % 10 === 0 ? 8 : 4;
    ticks.push(<line key={'t' + d} x1={700 + 640 * Math.cos(a)} y1={700 + 640 * Math.sin(a)} x2={700 + (640 - len) * Math.cos(a)} y2={700 + (640 - len) * Math.sin(a)} stroke={CREAM + (maj ? '.5)' : '.25)')} strokeWidth={maj ? .8 : .5} />);
  }
  const spokes = [];
  if (auth) for (let k = 0; k < 12; k++) { const a = k * 30 * Math.PI / 180; spokes.push(<line key={'sp' + k} x1={700} y1={700} x2={700 + 640 * Math.cos(a)} y2={700 + 640 * Math.sin(a)} stroke={CREAM + '.07)'} strokeWidth={.5} />); }
  return (
    <svg viewBox="0 0 1400 1400" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" aria-hidden="true" style={{ display: 'block', position: 'absolute', inset: 0 }}>
      <g style={{ animation: 'om-fade 1s ease both' }}>{rings}</g>
      <g style={{ transformOrigin: '700px 700px', animation: 'om-turn 360s linear infinite, om-fade 1.2s ease .2s both' }}>{spokes}{ticks}{stars}{lines}{nodes}</g>
    </svg>
  );
}

export default memo(Starfield);
