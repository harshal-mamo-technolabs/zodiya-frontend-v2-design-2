import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Starfield from '../components/Starfield.jsx';
import NavMenu from '../components/NavMenu.jsx';
import { drawTarot } from '../lib/api.js';
import { tarotImage } from '../lib/assets.js';

const MONO = "'IBM Plex Mono',monospace";
const SERIF = "'Cormorant Garamond',Georgia,serif";
const INK = '#1C2538', CREAM = '#F4ECDC', MUTED = 'rgba(244,236,220,.68)';
const COP = '#5F8B7A', GOLD = '#B4933F', LIT = '#E2C97F', VIOLET = '#B7A4E6';
const HAIR = '1px solid rgba(244,236,220,.16)';
const FACE = '#F3EFE6', FACE_INK = '#1A1D2B';

const lbl = { fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: MUTED };


/* ------------------------------------------------------------ card art */

/** The back: a small astrolabe, the same on every card. */
function Back() {
  return <img src={tarotImage('card-back')} alt="" draggable={false} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6, background: '#141b2c' }} />;
}

function Face({ card, w, h }) {
  return (
    <>
      {/* the illustration is upright in the file; a reversed card turns the picture, not the name */}
      <img src={tarotImage(card.id)} alt="" draggable={false} decoding="async" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', background: FACE, transform: card.reversed ? 'rotate(180deg)' : 'none' }} />
      <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute', inset: 0, display: 'block', pointerEvents: 'none' }}>
        <rect x="8" y="8" width={w - 16} height={h - 16} rx="3" fill="none" stroke="rgba(26,29,43,.35)" strokeWidth="1" />
      </svg>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '34px 12px 5%', textAlign: 'center', background: 'linear-gradient(to top, rgba(243,239,230,.96) 55%, rgba(243,239,230,0))' }}>
        <div style={{ fontFamily: SERIF, fontSize: 'clamp(16px, 2.2vw, 21px)', color: FACE_INK, lineHeight: 1.1 }}>{card.name}</div>
        <div style={{ marginTop: 5, fontFamily: MONO, fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: card.reversed ? '#8A5A2B' : '#5A5344' }}>{card.orientation}</div>
      </div>
    </>
  );
}

/** A face-down card that turns over on click. */
function FlipCard({ card, revealed, onReveal, w, h }) {
  return (
    <button type="button" onClick={onReveal} aria-pressed={revealed} aria-label={revealed ? `${card.name}, ${card.orientation}` : `Turn the ${card.position} card`} style={{ width: w, maxWidth: '78vw', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: 'inherit' }}>
      <div style={{ perspective: 1200, width: '100%', aspectRatio: `${w} / ${h}` }}>
        <div style={{ position: 'relative', width: '100%', height: '100%', transformStyle: 'preserve-3d', transition: 'transform .8s cubic-bezier(.2,.8,.25,1)', transform: revealed ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', borderRadius: 6, overflow: 'hidden', boxShadow: '0 18px 36px rgba(0,0,0,.5), 0 0 0 1px rgba(180,147,63,.2)' }}><Back /></div>
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)', borderRadius: 6, overflow: 'hidden', boxShadow: '0 18px 36px rgba(0,0,0,.5)' }}><Face card={card} w={w} h={h} /></div>
        </div>
      </div>
      <span style={{ ...lbl, color: revealed ? GOLD : MUTED }}>{card.position}</span>
    </button>
  );
}

/* -------------------------------------------------------------- page */

export default function Tarot() {
  const navigate = useNavigate();
  const [spread, setSpread] = useState('three');
  const [draw, setDraw] = useState(null);
  const [revealed, setRevealed] = useState([]);
  const [error, setError] = useState('');

  const shuffle = useCallback(kind => {
    setRevealed([]);
    setError('');
    drawTarot(kind)
      .then(setDraw)
      .catch(e => {
        if (e.status === 401) { navigate('/login'); return; }
        setError(e.message);
      });
  }, [navigate]);

  useEffect(() => { shuffle(spread); }, [spread, shuffle]);

  const cards = draw?.cards ?? [];
  const shown = cards.filter((_, i) => revealed.includes(i));
  const three = cards.length === 3;
  const cw = three ? 200 : 260, ch = three ? 320 : 416;
  const verdict = draw?.verdict && revealed.includes(0) ? draw.verdict : null;

  return (
    <div style={{ minHeight: '100vh', background: INK, color: CREAM, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}><Starfield /></div>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'rgba(28,37,56,.42)' }} />

      <header style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '18px 24px', borderBottom: '1px solid rgba(244,236,220,.2)', maxWidth: 1200, width: '100%', margin: '0 auto' }}>
        <Link to="/natal-chart" style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', borderBottom: 'none' }}>← Natal chart</Link>
        <Link to="/" style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 18, letterSpacing: '.14em', textTransform: 'uppercase', borderBottom: 'none' }}>Meridian</Link>
        <NavMenu current="Tarot" />
      </header>

      <main style={{ position: 'relative', flex: 1, width: '100%', maxWidth: 1200, margin: '0 auto', padding: '40px 24px 64px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40 }}>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 14 }}>
          <div style={{ ...lbl, color: COP }}>Tarot</div>
          <h1 style={{ margin: 0, fontFamily: SERIF, fontWeight: 500, fontSize: 'clamp(32px,5vw,50px)', lineHeight: 1.06, maxWidth: 660, textWrap: 'balance' }}>{draw?.headline ?? 'Shuffling…'}</h1>
          <p style={{ margin: 0, fontSize: 16.5, lineHeight: 1.6, color: MUTED, maxWidth: 480, textWrap: 'pretty' }}>{draw?.subline ?? ''}</p>

          <div role="tablist" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4, padding: 4, border: HAIR, background: 'rgba(244,236,220,.03)', width: '100%', maxWidth: 420, marginTop: 12 }}>
            {(draw?.spreads ?? [{ key: 'single', label: 'Single card' }, { key: 'three', label: 'Three cards' }, { key: 'yesNo', label: 'Yes / no' }]).map(s => (
              <button key={s.key} type="button" role="tab" aria-selected={spread === s.key} onClick={() => setSpread(s.key)} style={{ padding: '12px 4px', border: 'none', cursor: 'pointer', background: spread === s.key ? 'rgba(180,147,63,.16)' : 'transparent', color: spread === s.key ? LIT : MUTED, fontFamily: MONO, fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase' }}>{s.label}</button>
            ))}
          </div>
        </div>

        {error && (
          <div role="alert" style={{ borderLeft: `2px solid ${GOLD}`, background: 'rgba(180,147,63,.12)', padding: '10px 14px', fontSize: 14, lineHeight: 1.45 }}>{error}</div>
        )}

        {/* the spread */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: three ? 24 : 0, justifyContent: 'center', minHeight: ch + 30 }}>
          {cards.map((card, i) => (
            <FlipCard key={`${draw.spread}-${card.id}`} card={card} w={cw} h={ch} revealed={revealed.includes(i)} onReveal={() => setRevealed(r => r.includes(i) ? r : [...r, i])} />
          ))}
        </div>

        {verdict && (
          <div style={{ padding: '30px 40px', border: '1px solid rgba(180,147,63,.4)', background: 'linear-gradient(180deg,rgba(180,147,63,.12),rgba(180,147,63,.03))', textAlign: 'center', maxWidth: 640, animation: 'om-nav-fade .4s ease both' }}>
            <div style={{ ...lbl, color: GOLD, marginBottom: 12 }}>The answer</div>
            <div style={{ fontFamily: SERIF, fontSize: 58, lineHeight: 1, marginBottom: 14 }}>{verdict.title}</div>
            <div style={{ fontSize: 16.5, lineHeight: 1.6, color: CREAM, textWrap: 'pretty' }}>{verdict.line}</div>
          </div>
        )}

        {shown.length === 0 && draw && (
          <div style={{ fontSize: 15, lineHeight: 1.6, color: MUTED, textAlign: 'center', maxWidth: 480 }}>{draw.prompt}</div>
        )}

        {/* the readings, one per turned card */}
        {shown.length > 0 && (
          <div style={{ width: '100%', display: 'grid', gridTemplateColumns: three ? 'repeat(auto-fit, minmax(280px, 1fr))' : 'minmax(0, 720px)', justifyContent: 'center', gap: 20 }}>
            {shown.map(card => (
              <article key={card.id} style={{ padding: '28px 28px', border: HAIR, background: 'rgba(244,236,220,.03)', animation: 'om-nav-fade .5s ease both', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                  <div style={lbl}>{card.position}</div>
                  <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.06em', color: card.reversed ? VIOLET : GOLD }}>{card.orientation}</div>
                </div>
                <div style={{ fontFamily: SERIF, fontSize: 32, lineHeight: 1.08 }}>{card.name}</div>
                <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 20, lineHeight: 1.4, color: LIT, textWrap: 'pretty' }}>{card.lede}</div>
                <div style={{ fontSize: 16, lineHeight: 1.7, color: CREAM, textWrap: 'pretty' }}>{card.text}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                  {card.keywords.map(k => <span key={k} style={{ padding: '6px 12px', border: HAIR, fontFamily: MONO, fontSize: 11, color: MUTED }}>{k}</span>)}
                </div>
              </article>
            ))}
          </div>
        )}

        <button type="button" onClick={() => shuffle(spread)} className="hov-wash-10" style={{ height: 50, padding: '0 32px', border: HAIR, background: 'transparent', color: CREAM, fontFamily: MONO, fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', cursor: 'pointer' }}>
          {draw?.shuffle ?? 'Shuffle a new spread'}
        </button>
      </main>
    </div>
  );
}
