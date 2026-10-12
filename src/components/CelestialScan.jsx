import { memo } from 'react';

/* The palm frame's "reading" effect: night falls over the photo, a golden
   astrolabe settles on the palm and turns, a constellation draws itself star
   by star across the hand and stardust drifts up. mode="draw" is the lighter
   version shown while the lines are being drawn. SVG in the frame's own 4:5
   space; all motion is CSS (index.css, cs-*), still under reduced motion. */

const W = 400, H = 500, CX = 200, CY = 270;
const SIGNS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
const GOLD = '#E3B64B';

// a constellation over the palm: heart, head and life arcs plus the fate rise
const PATHS = [
  [[118, 238], [158, 226], [204, 222], [248, 214], [286, 200]],
  [[124, 282], [170, 270], [214, 262], [262, 254]],
  [[156, 238], [146, 290], [150, 340], [170, 392], [196, 432]],
  [[214, 444], [210, 380], [206, 316], [204, 250], [206, 196]]
];
const STARS = PATHS.flat();

// deterministic stardust, so the effect looks the same every time
const DUST = Array.from({ length: 28 }, (_, i) => {
  const r = n => ((Math.sin(i * 97.13 + n * 13.7) + 1) / 2);
  return { x: 30 + r(1) * 340, size: 0.8 + r(2) * 1.8, delay: -(r(3) * 6), dur: 4.5 + r(4) * 4, drift: (r(5) - 0.5) * 30 };
});

function CelestialScan({ mode = 'read' }) {
  const read = mode === 'read';
  const pt = ([x, y]) => `${x},${y}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', animation: 'om-fade .6s ease both' }}>
      <defs>
        <radialGradient id="cs-night" cx="50%" cy="54%" r="70%">
          <stop offset="0" stopColor="#0B1020" stopOpacity={read ? 0.15 : 0.05} />
          <stop offset="1" stopColor="#0B1020" stopOpacity={read ? 0.7 : 0.35} />
        </radialGradient>
        <radialGradient id="cs-core" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor={GOLD} stopOpacity=".28" />
          <stop offset="1" stopColor={GOLD} stopOpacity="0" />
        </radialGradient>
        <filter id="cs-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* night falls over the photo */}
      <rect width={W} height={H} fill="url(#cs-night)" />
      <circle className="cs-pulse" cx={CX} cy={CY} r="150" fill="url(#cs-core)" />

      {read && (
        <g filter="url(#cs-glow)" className="cs-settle">
          {/* outer ring: the zodiac, turning slowly */}
          <g className="cs-spin" style={{ transformOrigin: `${CX}px ${CY}px` }}>
            <circle cx={CX} cy={CY} r="168" fill="none" stroke={GOLD} strokeOpacity=".55" strokeWidth=".9" />
            <circle cx={CX} cy={CY} r="150" fill="none" stroke={GOLD} strokeOpacity=".35" strokeWidth=".6" />
            {Array.from({ length: 72 }, (_, i) => {
              const a = (i * 5 * Math.PI) / 180, long = i % 6 === 0, r1 = 150, r2 = long ? 162 : 156;
              return <line key={i} x1={CX + r1 * Math.cos(a)} y1={CY + r1 * Math.sin(a)} x2={CX + r2 * Math.cos(a)} y2={CY + r2 * Math.sin(a)} stroke={GOLD} strokeOpacity={long ? 0.8 : 0.4} strokeWidth=".7" />;
            })}
            {SIGNS.map((g, i) => {
              const a = ((i * 30 + 15 - 90) * Math.PI) / 180;
              return <text key={g} x={CX + 182 * Math.cos(a)} y={CY + 182 * Math.sin(a)} fill={GOLD} fillOpacity=".85" fontSize="13" textAnchor="middle" dominantBaseline="central" style={{ fontFamily: "'Noto Sans Symbols','Segoe UI Symbol','Apple Symbols',serif" }}>{g + '︎'}</text>;
            })}
          </g>
          {/* inner rings turning the other way */}
          <g className="cs-spin-rev" style={{ transformOrigin: `${CX}px ${CY}px` }}>
            <circle cx={CX} cy={CY} r="112" fill="none" stroke="#F4ECDC" strokeOpacity=".35" strokeWidth=".7" strokeDasharray="2 7" />
            <circle cx={CX} cy={CY} r="70" fill="none" stroke={GOLD} strokeOpacity=".4" strokeWidth=".6" />
            {[0, 45, 90, 135].map(d => {
              const a = (d * Math.PI) / 180;
              return <line key={d} x1={CX - 112 * Math.cos(a)} y1={CY - 112 * Math.sin(a)} x2={CX + 112 * Math.cos(a)} y2={CY + 112 * Math.sin(a)} stroke={GOLD} strokeOpacity=".16" strokeWidth=".6" />;
            })}
          </g>
        </g>
      )}

      {/* drawing the lines: a comet circles the palm on a faint orbit */}
      {!read && (
        <g filter="url(#cs-glow)">
          <circle cx={CX} cy={CY} r="140" fill="none" stroke={GOLD} strokeOpacity=".3" strokeWidth=".8" strokeDasharray="1 6" />
          <g className="cs-orbit" style={{ transformOrigin: `${CX}px ${CY}px` }}>
            <path d={`M ${CX} ${CY - 140} A 140 140 0 0 1 ${CX + 140 * Math.sin(1)} ${CY - 140 * Math.cos(1)}`} fill="none" stroke={GOLD} strokeOpacity=".75" strokeWidth="2" strokeLinecap="round" />
            <circle cx={CX + 140 * Math.sin(1)} cy={CY - 140 * Math.cos(1)} r="4" fill="#FFF6DE" />
          </g>
        </g>
      )}

      {/* the constellation draws itself across the palm */}
      {read && (
        <g filter="url(#cs-glow)">
          {PATHS.map((p, i) => (
            <polyline key={i} className="cs-draw" points={p.map(pt).join(' ')} fill="none" stroke="#F4ECDC" strokeOpacity=".7" strokeWidth=".9" strokeLinecap="round" strokeLinejoin="round"
              pathLength="1" style={{ animationDelay: `${0.4 + i * 0.9}s` }} />
          ))}
        </g>
      )}
      <g filter="url(#cs-glow)">
        {(read ? STARS : STARS.filter((_, i) => i % 2 === 0)).map(([x, y], i) => (
          <circle key={i} className="cs-twinkle" cx={x} cy={y} r={i % 4 === 0 ? 2.6 : 1.7} fill={i % 3 === 0 ? GOLD : '#FFF6DE'} style={{ animationDelay: `${(i % 7) * 0.35}s`, transformOrigin: `${x}px ${y}px` }} />
        ))}
      </g>

      {/* stardust rising */}
      {DUST.map((d, i) => (
        <circle key={i} className="cs-dust" cx={d.x} cy={H + 10} r={d.size} fill={i % 3 ? '#FFF6DE' : GOLD}
          style={{ animationDuration: `${d.dur}s`, animationDelay: `${d.delay}s`, '--drift': `${d.drift}px` }} />
      ))}
    </svg>
  );
}

export default memo(CelestialScan);

/* The highlighted photo opening out from the palm behind a golden ring. */
export function RevealRing() {
  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <div className="cs-ring" style={{ position: 'absolute', left: '50%', top: '54%', width: 40, height: 40, marginLeft: -20, marginTop: -20, borderRadius: '50%', border: `2px solid ${GOLD}`, boxShadow: `0 0 24px 6px rgba(227,182,75,.55), inset 0 0 18px rgba(227,182,75,.5)` }} />
    </div>
  );
}
