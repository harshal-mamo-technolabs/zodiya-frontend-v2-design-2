/* The half-dial from the horoscope design: a needle from heavy (left) to bright (right). */
const INK = '#F4ECDC', COP = '#5F8B7A';

export default function MoodDial({ value }) {
  const cx = 26, cy = 22, r = 18, ticks = [];
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI * (1 - i / 10), maj = i % 5 === 0, len = maj ? 5 : 3;
    ticks.push(<line key={i} x1={cx + r * Math.cos(a)} y1={cy - r * Math.sin(a)} x2={cx + (r - len) * Math.cos(a)} y2={cy - (r - len) * Math.sin(a)} stroke={INK} strokeWidth={maj ? .8 : .5} />);
  }
  const na = Math.PI * (1 - value);
  return (
    <svg viewBox="0 0 52 26" width="100%" height="100%" aria-hidden="true" style={{ display: 'block' }}>
      <path d={`M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={INK} strokeWidth={.9} pathLength={1} strokeDasharray={1} style={{ animation: 'om-draw .6s cubic-bezier(.3,0,.2,1) both' }} />
      <g style={{ animation: 'om-fade .4s ease .25s both' }}>{ticks}</g>
      <line x1={cx} y1={cy} x2={cx + (r - 6) * Math.cos(na)} y2={cy - (r - 6) * Math.sin(na)} stroke={COP} strokeWidth={1.4} strokeLinecap="round" style={{ animation: 'om-fade .5s ease .45s both', transition: 'all .5s cubic-bezier(.3,0,.2,1)' }} />
      <circle cx={cx} cy={cy} r={1.5} fill={INK} />
    </svg>
  );
}
