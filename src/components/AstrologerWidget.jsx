import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import '../lib/mrd-astro.js';
import { listProfiles } from '../lib/api.js';
import { getStatus } from '../lib/billing.js';
import { readActive } from '../lib/active-profile.js';
import { READINGS, SUB_PX, byId, getPrefs, setPrefs } from '../lib/astrologers.js';
import { useAstrologer } from '../lib/useAstrologer.js';

/* The AI astrologer that follows the reader round the app: a draggable
   figure that snaps to either edge, steps out of the way of buttons, and
   opens into a chat panel. Ported from the design's Astrologer Widget. */

const HIDDEN_ON = [/^\/$/, /^\/login/, /^\/signup/, /^\/chart\//, /^\/subscription/, /^\/checkout/];
const SANS = "'DM Sans',system-ui,sans-serif";
const MONO = "'IBM Plex Mono',monospace";
const SERIF = "'Cormorant Garamond',serif";
const INK = '#EFEAE0', SOFT = '#B9BDCB', DIM = '#8A90A6', GOLD = '#D4B26A', PANEL = '#0E1226';
const SUGG = ['Explain my Sun sign', 'What does my 7th house mean?', 'Summarize my natal chart', 'Tell me about my Moon', "What's today's sky doing?"];
const ERR = {
  mic: ['Microphone blocked', "I can't hear you yet. Allow microphone access from the icon in your browser's address bar, or type your question instead."],
  unsupported: ['Voice input unavailable', "This browser can't use the microphone here. Type your question and I'll still answer."],
  offline: ['Connection lost', "I've lost the stars for a moment. Check your connection and try again."],
  nospeech: ["I didn't catch that", 'Try again a little closer to the mic, or type your question.'],
  setup: ['Not ready yet', 'Your astrologer is still being set up. Please try again in a little while.'],
  minutes: ['Out of minutes', "You've used all your astrologer minutes. Top up to keep talking, or wait for your plan to renew."],
  plan: ['Plan needed', 'Talking with your astrologer needs an active plan.']
};
// these errors are fixed on the billing page, not by trying again
const PAID_FIX = { minutes: ['Top up minutes', '/billing'], plan: ['See plans', '/subscription'] };
const STATE_UI = { idle: ['Ready', '#D4B26A'], listening: ['Listening', '#7FD4C8'], connecting: ['Connecting', '#7FD4C8'], thinking: ['Thinking', '#C9BCF0'], speaking: ['Speaking', '#EBD39A'], error: ['Needs attention', '#EBA0A0'] };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const px = n => Math.round(n) + 'px';

const Icon = ({ d, size = 14, fill }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ fill: fill ? 'currentColor' : 'none', stroke: fill ? 'none' : 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round', flexShrink: 0 }}>
    {d.map((p, i) => <path key={i} d={p} />)}
  </svg>
);
const MicIcon = ({ listening, size = 20 }) => listening
  ? <svg width={18} height={18} viewBox="0 0 24 24" style={{ fill: 'currentColor' }}><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
  : <svg width={size} height={size} viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' }}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" /></svg>;

function Figure({ id, state, reduced, framing = 'full', style }) {
  return <mrd-astro char={id} state={state} reduced={reduced ? 'true' : 'false'} framing={framing} style={{ display: 'block', width: '100%', height: '100%', pointerEvents: 'none', ...style }} />;
}

function Anim({ kind, color, reduced }) {
  if (kind === 'wave') return (
    <span aria-hidden="true" style={{ display: 'inline-flex', gap: 2, alignItems: 'center', height: 14, marginLeft: 6 }}>
      {[0, 1, 2, 3, 4].map(i => <span key={i} style={{ width: 3, height: 14, borderRadius: 2, background: color, animation: reduced ? 'none' : `astro-wave ${0.7 + i * 0.09}s ease-in-out ${-i * 0.13}s infinite`, transform: reduced ? 'scaleY(.6)' : undefined }} />)}
    </span>
  );
  if (kind === 'dots') return (
    <span aria-hidden="true" style={{ display: 'inline-flex', gap: 4, alignItems: 'center', marginLeft: 6 }}>
      {[0, 1, 2].map(i => <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: color, animation: reduced ? 'none' : `astro-wave .9s ease-in-out ${i * 0.15}s infinite` }} />)}
    </span>
  );
  return null;
}

function Captions({ caption, compact, size }) {
  const CH = compact ? 10 : 14;
  const i = Math.max(0, caption.idx), start = Math.floor(i / CH) * CH;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: '.26em', rowGap: 3, font: `400 ${size}/1.45 ${SANS}` }}>
      {caption.words.slice(start, start + CH).map((w, j) => {
        const k = start + j;
        return <span key={k} style={{ color: k < i ? INK : k === i ? '#F7E7BE' : DIM, background: k === i ? 'rgba(212,178,106,.26)' : 'transparent', borderRadius: 4, padding: '0 2px', margin: '0 -2px', transition: 'color .15s,background .15s' }}>{w}</span>;
      })}
    </div>
  );
}

const pill = (extra = {}) => ({ padding: '8px 14px', borderRadius: 999, border: '1px solid rgba(239,234,224,.25)', background: 'transparent', color: INK, font: `500 13px ${SANS}`, cursor: 'pointer', whiteSpace: 'nowrap', ...extra });
const round = size => ({ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', border: '1px solid rgba(239,234,224,.18)', background: 'rgba(14,18,38,.85)', color: SOFT, cursor: 'pointer', padding: 0 });

export default function AstrologerWidget() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const onPage = !HIDDEN_ON.some(r => r.test(pathname));

  const [prefs, setPrefsState] = useState(getPrefs);
  const [profileId, setProfileId] = useState(null);
  const [signedIn, setSignedIn] = useState(false);
  const [view, setView] = useState(() => { const s = getPrefs(); return !s.onboarded ? 'onboard' : s.minimized ? 'mini' : 'bubble'; });
  const [tab, setTab] = useState('chat');
  const [input, setInput] = useState('');
  const [toast, setToast] = useState(false);
  const [vp, setVp] = useState({ vw: window.innerWidth, vh: window.innerHeight });
  const [anchor, setAnchor] = useState('rest'); // rest | drag | snap
  const [drag, setDrag] = useState(null);
  const [snapTo, setSnapTo] = useState(null);
  const [nudge, setNudge] = useState(0);
  const [tucked, setTucked] = useState(false);
  const [hover, setHover] = useState(false);
  const [afterPerm, setAfterPerm] = useState(null); // what to do once the mic is allowed

  const boxRef = useRef(null), hitRef = useRef(null), inputRef = useRef(null), histRef = useRef(null);
  const pd = useRef(null), dragAt = useRef(null), dragged = useRef(false), toastT = useRef(null);

  const page = pathname.replace(/^\//, '') || 'dashboard';
  const astro = useAstrologer({ prefs, profileId, page, navigate });
  const { aState, err, caption, interim, hist, live } = astro;

  const save = useCallback(patch => setPrefsState(setPrefs(patch)), []);

  // signed in, and whose chart: the same active-profile rule every page uses
  useEffect(() => {
    if (!onPage) return;
    let live = true;
    // only a paying account gets the astrologer
    Promise.all([listProfiles(), getStatus()])
      .then(([list, status]) => {
        if (!live) return;
        const wanted = readActive();
        const p = list.find(x => x._id === wanted) || list.find(x => x.isPrimary) || list[0];
        setSignedIn(status.entitled); setProfileId(p ? p._id : null);
      })
      .catch(() => { if (live) setSignedIn(false); });
    return () => { live = false; };
  }, [onPage, pathname]);

  useEffect(() => {
    const onPrefs = e => setPrefsState(e.detail || getPrefs());
    const onStorage = () => setPrefsState(getPrefs());
    const onResize = () => { setVp({ vw: window.innerWidth, vh: window.innerHeight }); setNudge(0); };
    const onActive = e => setProfileId(e.detail);
    window.addEventListener('meridian:active-profile', onActive);
    window.addEventListener('meridian:astrologer', onPrefs);
    window.addEventListener('storage', onStorage);
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('meridian:active-profile', onActive); window.removeEventListener('meridian:astrologer', onPrefs); window.removeEventListener('storage', onStorage); window.removeEventListener('resize', onResize); clearTimeout(toastT.current); };
  }, []);

  // the choose page and "replay introduction" reset these from outside
  useEffect(() => {
    if (!prefs.onboarded) setView('onboard');
    else if (prefs.minimized) setView(v => (v === 'panel' ? v : 'mini'));
    else setView(v => (v === 'mini' || v === 'onboard' ? 'bubble' : v));
  }, [prefs.onboarded, prefs.minimized]);

  useEffect(() => { const h = histRef.current; if (h) h.scrollTop = h.scrollHeight; }, [hist.length, view, tab]);

  const compact = vp.vw < 640;
  const M = compact ? 10 : 18, avW = compact ? 86 : 120, avH = compact ? 100 : 140, baseH = avH + (compact ? 70 : 76);
  const reduced = prefs.motion !== 'full';
  const ch = byId(prefs.char);

  // ---------- step out of the way of what is under the widget ----------
  const hits = useCallback(dy => {
    const b = boxRef.current, tgt = hitRef.current; if (!b || !tgt) return false;
    const r = tgt.getBoundingClientRect(), vh = window.innerHeight;
    for (const fx of [0.2, 0.5, 0.8]) for (const fy of [0.15, 0.5, 0.85]) {
      const x = r.left + r.width * fx, y = r.top + dy + r.height * fy;
      if (y < 72 || y > vh) return true;
      const el = document.elementsFromPoint(x, y).find(n => !b.contains(n) && n !== document.body && n !== document.documentElement);
      if (!el) continue;
      if (el.closest('a,button,input,select,textarea,label,[role=button],[data-astro-avoid]')) return true;
      if (getComputedStyle(el).cursor === 'pointer') return true;
    }
    return false;
  }, []);

  const avoid = useCallback(() => {
    if (anchor !== 'rest' || aState !== 'idle' || (view !== 'bubble' && view !== 'mini')) return;
    if (!hits(0)) { setTucked(false); return; }
    for (let k = 1; k <= 10; k++) for (const sgn of [-1, 1]) {
      const d = sgn * k * 24;
      if (!hits(d)) { setNudge(n => n + d); setTucked(false); return; }
    }
    setTucked(true);
  }, [anchor, aState, view, hits]);

  useEffect(() => { const t = setTimeout(avoid, 1200); return () => clearTimeout(t); }, [pathname, view, avoid]);
  useEffect(() => {
    let t = null;
    const onScroll = () => {
      if (t) return;
      t = setTimeout(() => {
        t = null;
        if (anchor === 'rest' && aState === 'idle' && (view === 'bubble' || view === 'mini')) setTucked(hits(0));
      }, 140);
    };
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    return () => { window.removeEventListener('scroll', onScroll, { capture: true }); clearTimeout(t); };
  }, [anchor, aState, view, hits]);

  // ---------- drag and snap ----------
  const onPointerDown = e => {
    if ((e.button && e.button !== 0) || !boxRef.current) return;
    const r = boxRef.current.getBoundingClientRect();
    pd.current = { sx: e.clientX, sy: e.clientY, ox: r.left, oy: r.top, moved: false };
    const mv = ev => {
      const p = pd.current; if (!p) return;
      const dx = ev.clientX - p.sx, dy = ev.clientY - p.sy;
      if (!p.moved && Math.hypot(dx, dy) < 6) return;
      if (!p.moved) { p.moved = true; setTucked(false); }
      dragAt.current = { x: clamp(p.ox + dx, 0, window.innerWidth - r.width), y: clamp(p.oy + dy, 0, window.innerHeight - r.height) };
      setAnchor('drag'); setDrag(dragAt.current);
    };
    const up = () => {
      window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
      const p = pd.current; pd.current = null;
      if (p && p.moved) { dragged.current = true; setTimeout(() => { dragged.current = false; }, 60); drop(); }
    };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  };

  // snaps to the nearer edge and remembers the height as a fraction of the screen
  const drop = () => {
    const d = dragAt.current, b = boxRef.current; if (!d || !b) return;
    const vw = window.innerWidth, vh = window.innerHeight, bw = b.offsetWidth, bh = b.offsetHeight;
    const side = d.x + bw / 2 < vw / 2 ? 'left' : 'right';
    const range = Math.max(1, vh - 2 * M - baseH);
    const yFrac = clamp((d.y - M) / range, 0, 1);
    const x = side === 'right' ? vw - bw - M : M;
    const y = yFrac < 0.5 ? M + yFrac * range : M + baseH + yFrac * range - bh;
    save({ side, yFrac });
    setAnchor('snap'); setSnapTo({ x, y }); setNudge(0);
    setTimeout(() => { setAnchor('rest'); setTimeout(avoid, 320); }, 460);
  };

  const onHandleKey = e => {
    const k = e.key;
    if (k === 'ArrowLeft' || k === 'ArrowRight') { e.preventDefault(); save({ side: k === 'ArrowLeft' ? 'left' : 'right' }); setNudge(0); }
    else if (k === 'ArrowUp' || k === 'ArrowDown') { e.preventDefault(); save({ yFrac: clamp((prefs.yFrac ?? 1) + (k === 'ArrowUp' ? -0.1 : 0.1), 0, 1) }); setNudge(0); }
  };

  // ---------- views ----------
  const openPanel = () => { setView('panel'); setTab('chat'); setTucked(false); };
  const collapse = () => { setView('bubble'); setTab('chat'); setTimeout(avoid, 400); };
  const minimize = () => { save({ minimized: true }); setView('mini'); };
  const restore = () => { if (dragged.current) return; save({ minimized: false }); setView('bubble'); setTimeout(avoid, 400); };
  const hide = () => { astro.stop(); save({ hidden: true }); setToast(true); clearTimeout(toastT.current); toastT.current = setTimeout(() => setToast(false), 7000); };
  const undoHide = () => { save({ hidden: false }); setToast(false); };
  const onAvatarClick = () => { if (!dragged.current) openPanel(); };

  const onboardNext = () => {
    if (prefs.micAsked) { save({ onboarded: true }); setView('bubble'); astro.greet(); }
    else { setAfterPerm('greet'); setView('perm'); }
  };
  const notNow = () => { save({ onboarded: true, minimized: true }); setView('mini'); };
  const allowMic = async () => {
    const then = afterPerm; setAfterPerm(null);
    save({ micAsked: true, onboarded: true, minimized: false });
    setView('bubble');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      setPrefsState(setPrefs({ micOk: true }));
      // prefs reach the hook on the next render
      setTimeout(() => (then === 'greet' ? astro.greet() : astro.toggleLive()), 0);
    } catch (e) { save({ micOk: false }); astro.fail('mic'); }
  };
  const typeInstead = () => {
    const first = !prefs.onboarded;
    save({ micAsked: true, onboarded: true, minimized: false });
    astro.reset(); setView('panel'); setTab('chat');
    setTimeout(() => inputRef.current && inputRef.current.focus(), 50);
    if (first) astro.greet();
  };
  const toggleLive = () => {
    if (!prefs.micOk && !live) { setAfterPerm('mic'); setView('perm'); return; }
    astro.toggleLive();
  };
  const retry = () => {
    const kind = err; astro.reset();
    if (kind === 'offline') { const lastQ = [...hist].reverse().find(m => m.role === 'user'); if (lastQ) return astro.ask(lastQ.text); }
    toggleLive();
  };
  const submit = e => { e.preventDefault(); const q = input; setInput(''); astro.ask(q); };

  if (!onPage || !signedIn) return null;
  // the choose page is the introduction; the card would only cover it
  if (view === 'onboard' && pathname === '/choose-astrologer') return null;

  // ---------- layout ----------
  const side = prefs.side || 'right';
  const yFrac = prefs.yFrac ?? 1;
  const upper = yFrac < 0.5;
  const big = view === 'panel' || view === 'onboard' || view === 'perm';
  const isSheet = view === 'panel' && compact;
  const pos = { position: 'fixed', left: 'auto', right: 'auto', top: 'auto', bottom: 'auto', transition: 'none', transform: 'none', transformOrigin: 'center', opacity: 1 };
  if (isSheet) Object.assign(pos, { left: '0px', right: '0px', bottom: '0px' });
  else if (anchor === 'drag' && drag) Object.assign(pos, { left: px(drag.x), top: px(drag.y) });
  else if (anchor === 'snap' && snapTo) Object.assign(pos, { left: px(snapTo.x), top: px(snapTo.y), transition: 'left .44s cubic-bezier(.3,1.35,.5,1), top .44s cubic-bezier(.3,1.2,.5,1)' });
  else {
    const range = Math.max(0, vp.vh - 2 * M - baseH);
    if (side === 'right') pos.right = px(M); else pos.left = px(M);
    if (big) { if (upper) pos.top = px(M); else pos.bottom = px(M); }
    else if (upper) pos.top = px(M + yFrac * range + nudge);
    else pos.bottom = px(M + (1 - yFrac) * range - nudge);
    pos.transition = 'top .3s ease, bottom .3s ease, transform .35s ease, opacity .35s ease';
    // never tuck away mid-conversation, so the switch and captions stay in reach
    if (tucked && !hover && !big && aState === 'idle' && !live) Object.assign(pos, { transform: `translateX(${side === 'right' ? '34%' : '-34%'}) scale(.7)`, opacity: 0.55, transformOrigin: side === 'right' ? 'right center' : 'left center' });
  }

  const [stateLabel, stateColor] = STATE_UI[aState] || STATE_UI.idle;
  const e = ERR[err] || ERR.offline;
  const subs = prefs.subs !== false;
  const subPx = SUB_PX[prefs.subSize] || SUB_PX.M;
  let cardEyebrow = ch.name, cardText = '', cardTextColor = INK;
  if (aState === 'listening') { cardEyebrow = 'Listening'; cardText = interim ? `“${interim}…”` : "Just talk. I'll answer when you pause."; cardTextColor = interim ? INK : SOFT; }
  else if (aState === 'connecting') { cardEyebrow = 'Connecting'; cardText = `Getting ${ch.name} on the line. Start talking once the switch turns green.`; cardTextColor = SOFT; }
  else if (aState === 'thinking') { cardEyebrow = 'Thinking'; cardText = 'Reading your chart…'; cardTextColor = SOFT; }
  else if (aState === 'error') { cardEyebrow = e[0]; cardText = e[1]; cardTextColor = '#E4E0D8'; }
  else if (aState === 'speaking' && !subs) cardEyebrow = `${ch.name} · subtitles off`;
  const stageText = aState === 'idle' ? 'Start a conversation or type below. I can explain anything in your own readings.' : cardText;
  const showWords = aState === 'speaking' && subs && caption && caption.words.length > 0;
  const showCard = view === 'bubble' && aState !== 'idle';
  const cardAnim = aState === 'listening' || aState === 'speaking' ? <Anim kind="wave" color={stateColor} reduced={reduced} /> : aState === 'thinking' || aState === 'connecting' ? <Anim kind="dots" color={stateColor} reduced={reduced} /> : null;
  const pulse = inset => (aState === 'listening' && !reduced ? <span aria-hidden="true" style={{ position: 'absolute', inset, borderRadius: '50%', border: '2px solid #7FD4C8', animation: 'astro-pulse 1.4s ease-out infinite', pointerEvents: 'none' }} /> : null);
  const liveText = aState === 'error' ? `${e[0]}. ${e[1]}` : aState === 'speaking' && caption ? caption.words.join(' ') : aState === 'listening' ? 'Listening' : aState === 'thinking' ? 'Thinking' : aState === 'connecting' ? 'Connecting' : '';
  const busy = aState === 'speaking';
  const hasAnswer = hist.some(m => m.role !== 'user');

  // on/off for the whole conversation: the mic stays open while it is on
  const connecting = aState === 'connecting';
  const liveSwitch = wide => (
    <button type="button" role="switch" aria-checked={live} aria-busy={connecting} disabled={connecting} className="astro-focus" onClick={toggleLive} title={connecting ? 'Connecting…' : live ? 'End the conversation' : `Start talking with ${ch.name}`} style={{ cursor: connecting ? 'progress' : 'pointer', display: 'flex', alignItems: 'center', gap: 10, height: wide ? 48 : 40, padding: '0 14px 0 6px', flex: wide ? 1 : '0 0 auto', borderRadius: 999, border: `1px solid ${live || connecting ? 'rgba(127,212,200,.55)' : 'rgba(212,178,106,.45)'}`, background: live ? 'rgba(127,212,200,.12)' : connecting ? 'rgba(127,212,200,.06)' : 'rgba(14,18,38,.9)', color: INK, font: `500 ${wide ? 14 : 13}px ${SANS}`, whiteSpace: 'nowrap', boxShadow: '0 6px 20px rgba(0,0,0,.35)' }}>
      <span aria-hidden="true" style={{ position: 'relative', width: 44, height: 26, flexShrink: 0, borderRadius: 13, background: live ? '#7FD4C8' : 'rgba(239,234,224,.18)', transition: 'background .25s ease' }}>
        <span style={{ position: 'absolute', top: 3, left: live ? 21 : connecting ? 12 : 3, width: 20, height: 20, borderRadius: '50%', background: live ? '#07091A' : connecting ? 'rgba(127,212,200,.25)' : GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', color: live ? '#7FD4C8' : '#07091A', transition: reduced ? 'none' : 'left .25s cubic-bezier(.3,1.3,.5,1)' }}>
          {connecting
            ? <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(127,212,200,.3)', borderTopColor: '#7FD4C8', animation: reduced ? 'none' : 'astro-spin .8s linear infinite' }} />
            : <MicIcon size={12} />}
        </span>
      </span>
      {connecting ? 'Connecting…' : live ? 'End conversation' : wide ? `Talk with ${ch.name}` : 'Talk'}
    </button>
  );

  const ctrls = [
    { label: prefs.voiceOn ? 'Mute' : 'Unmute', aria: prefs.voiceOn ? 'Mute voice' : 'Unmute voice', d: prefs.voiceOn ? ['M4 9h4l5-4v14l-5-4H4z', 'M16.5 9a4 4 0 0 1 0 6', 'M19 6.5a8 8 0 0 1 0 11'] : ['M4 9h4l5-4v14l-5-4H4z', 'M16 9l5 6M21 9l-5 6'], onClick: () => { astro.stop(); save({ voiceOn: !prefs.voiceOn }); }, pressed: !prefs.voiceOn, bg: prefs.voiceOn ? 'transparent' : 'rgba(239,234,224,.08)' },
    { label: 'CC', aria: subs ? 'Turn subtitles off' : 'Turn subtitles on', d: ['M3 6h18v12H3z', 'M10 10.5a2 2 0 1 0 0 3', 'M17 10.5a2 2 0 1 0 0 3'], onClick: () => save({ subs: !subs }), pressed: subs, border: subs ? 'rgba(212,178,106,.5)' : undefined, color: subs ? '#EBD39A' : SOFT },
    { label: 'Stop', aria: 'Stop speaking', d: ['M7 7h10v10H7z'], onClick: astro.stop, disabled: !busy },
    { label: 'Replay', aria: 'Replay last answer', d: ['M4 12a8 8 0 1 0 2.4-5.7', 'M4 4v4.5h4.5'], onClick: astro.replay, disabled: !hasAnswer }
  ];
  const toggles = [
    ['Speak answers aloud', `Uses ${ch.name}'s own voice`, prefs.voiceOn, () => { astro.stop(); save({ voiceOn: !prefs.voiceOn }); }],
    ['Subtitles', 'Live captions, word by word, on by default', subs, () => save({ subs: !subs })],
    ['Reduce motion', 'Stills idle animation, pulses and snapping', reduced, () => save({ motion: reduced ? 'full' : 'reduced' })]
  ];
  const segs = [
    ['Speaking speed', prefs.rate, [['slow', 'Slower'], ['normal', 'Normal'], ['fast', 'Faster']], v => save({ rate: v })],
    ['Subtitle size', prefs.subSize, [['S', 'Small'], ['M', 'Medium'], ['L', 'Large']], v => save({ subSize: v })]
  ];

  const cardW = 'min(340px, calc(100vw - 24px))';
  const panelW = isSheet ? '100vw' : 'min(390px, calc(100vw - 36px))';
  const panelH = isSheet ? 'min(64vh, 600px)' : 'min(640px, calc(100vh - 36px))';

  return (
    <div data-astro-widget="true" style={{ fontFamily: SANS, color: INK, WebkitFontSmoothing: 'antialiased' }}>
      <div role="status" aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>{liveText}</div>

      {!prefs.hidden && (
        <div ref={boxRef} role="region" aria-label={`${ch.name}, your AI astrologer`} onKeyDown={ev => { if (ev.key === 'Escape' && view === 'panel') { ev.stopPropagation(); collapse(); } }} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onFocus={() => setHover(true)} style={{ ...pos, zIndex: 900 }}>

          {view === 'bubble' && (
            <div style={{ display: 'flex', flexDirection: side === 'right' ? 'row-reverse' : 'row', alignItems: upper ? 'flex-start' : 'flex-end', gap: 12 }}>
              <div ref={hitRef} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <div style={{ position: 'relative', width: avW, height: avH }}>
                  {pulse('18% 12% 4%')}
                  <button type="button" className="astro-focus" onPointerDown={onPointerDown} onClick={onAvatarClick} onKeyDown={onHandleKey} aria-label={`${ch.name}, your astrologer. Click to open the conversation. Drag, or use arrow keys, to move.`} title="Drag to move · click to open" style={{ position: 'absolute', inset: 0, margin: 0, padding: 0, border: 0, background: 'transparent', cursor: anchor === 'drag' ? 'grabbing' : 'grab', touchAction: 'none', borderRadius: 36 }}>
                    <Figure id={ch.id} state={aState === 'connecting' ? 'thinking' : aState} reduced={reduced} />
                  </button>
                  <div style={{ position: 'absolute', top: 0, right: -8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <button type="button" className="astro-hov astro-focus" onClick={minimize} aria-label="Minimize astrologer" title="Minimize" style={round(26)}><Icon d={['M6 12h12']} /></button>
                    <button type="button" className="astro-hov astro-focus" onClick={hide} aria-label="Hide astrologer" title="Hide" style={round(26)}><Icon d={['M7 7l10 10M17 7L7 17']} /></button>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, font: `500 10px ${MONO}`, letterSpacing: '.12em', textTransform: 'uppercase', color: stateColor }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: stateColor, boxShadow: `0 0 8px ${stateColor}` }} />{stateLabel}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {liveSwitch(false)}
                  <button type="button" className="astro-focus" onClick={openPanel} aria-label="Open conversation" title="Conversation" style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid rgba(239,234,224,.22)', background: 'rgba(14,18,38,.9)', color: INK, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinejoin: 'round' }}><path d="M4 5h16v11H10l-6 4z" /></svg>
                  </button>
                </div>
              </div>

              {showCard && (
                <div style={{ width: compact ? 'min(260px, calc(100vw - 130px))' : 'min(320px, calc(100vw - 180px))', padding: '14px 16px', borderRadius: 18, background: 'rgba(14,18,38,.95)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', border: `1px solid ${aState === 'error' ? 'rgba(235,160,160,.45)' : aState === 'listening' ? 'rgba(127,212,200,.45)' : 'rgba(239,234,224,.14)'}`, boxShadow: '0 18px 50px rgba(0,0,0,.5)', display: 'flex', flexDirection: 'column', gap: 10, animation: 'astro-in .3s ease both' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ font: `500 10px ${MONO}`, letterSpacing: '.12em', textTransform: 'uppercase', color: stateColor }}>{cardEyebrow}</div>
                    {cardAnim}
                  </div>
                  {showWords && <Captions caption={caption} compact={compact} size={subPx} />}
                  {!showWords && cardText && <div style={{ font: `400 ${subPx}/1.45 ${SANS}`, color: cardTextColor, textWrap: 'pretty' }}>{cardText}</div>}
                  {aState === 'error' && (PAID_FIX[err] ? (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <Link to={PAID_FIX[err][1]} onClick={astro.reset} className="astro-focus" style={pill({ border: 0, background: GOLD, color: '#07091A', borderBottom: 'none' })}>{PAID_FIX[err][0]}</Link>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button type="button" className="astro-focus" onClick={typeInstead} style={pill({ border: 0, background: GOLD, color: '#07091A' })}>Type instead</button>
                      <button type="button" className="astro-focus" onClick={retry} style={pill()}>Try again</button>
                    </div>
                  ))}
                  {busy && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button type="button" className="astro-focus" onClick={astro.stop} aria-label="Stop speaking" style={pill({ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 11px', font: `400 12px ${SANS}`, border: '1px solid rgba(239,234,224,.2)' })}><Icon d={['M5 5h14v14H5z']} size={12} fill />Stop</button>
                      <button type="button" className="astro-focus" onClick={openPanel} style={pill({ padding: '6px 11px', font: `400 12px ${SANS}`, border: '1px solid rgba(239,234,224,.2)' })}>Open chat</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {view === 'mini' && (
            <button type="button" ref={hitRef} className="astro-focus" onPointerDown={onPointerDown} onClick={restore} onKeyDown={onHandleKey} aria-label={`Open ${ch.name}. Drag or use arrow keys to move.`} title="Open astrologer" style={{ position: 'relative', width: 58, height: 58, borderRadius: '50%', padding: 0, border: '1px solid rgba(212,178,106,.55)', background: 'radial-gradient(circle at 50% 35%,#1E2548,#0A0E1C 75%)', cursor: anchor === 'drag' ? 'grabbing' : 'grab', touchAction: 'none', boxShadow: '0 10px 30px rgba(0,0,0,.5),0 0 18px rgba(212,178,106,.18)' }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden' }}><Figure id={ch.id} state={aState === 'connecting' ? 'thinking' : aState} reduced={reduced} framing="face" /></div>
              <span style={{ position: 'absolute', right: 1, bottom: 3, width: 12, height: 12, borderRadius: '50%', background: stateColor, border: '2px solid #0A0E1C' }} />
            </button>
          )}

          {view === 'onboard' && (
            <div style={{ width: cardW, borderRadius: 24, background: 'linear-gradient(180deg,#151B3A,#0E1226 60%)', border: '1px solid rgba(212,178,106,.3)', boxShadow: '0 30px 80px rgba(0,0,0,.6)', padding: '22px 22px 20px', display: 'flex', flexDirection: 'column', gap: 14, animation: 'astro-in .45s cubic-bezier(.2,.7,.2,1) both' }}>
              <div style={{ alignSelf: 'center', width: 150, height: 170 }}><Figure id={ch.id} state="idle" reduced={reduced} /></div>
              <div style={{ font: `400 11px ${MONO}`, letterSpacing: '.14em', textTransform: 'uppercase', color: GOLD }}>New · Your AI astrologer</div>
              <div style={{ font: `400 30px/1.05 ${SERIF}`, color: INK }}>Meet {ch.name}</div>
              <div style={{ font: `400 15px/1.55 ${SANS}`, color: SOFT, textWrap: 'pretty' }}>{ch.tagline} Ask about your chart, houses and today's sky, out loud or by typing. I only talk about your own readings.</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
                <button type="button" className="astro-focus" onClick={onboardNext} style={pill({ padding: '13px 18px', border: 0, background: GOLD, color: '#07091A', font: `500 15px ${SANS}` })}>Say hello</button>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <Link to="/choose-astrologer" style={{ font: `400 13px ${SANS}`, color: GOLD, padding: '6px 0', borderBottom: 'none' }}>Choose a different astrologer</Link>
                  <button type="button" className="astro-hov astro-focus" onClick={notNow} style={{ border: 0, background: 'transparent', color: DIM, font: `400 13px ${SANS}`, cursor: 'pointer', padding: '6px 0' }}>Not now</button>
                </div>
              </div>
            </div>
          )}

          {view === 'perm' && (
            <div style={{ width: cardW, borderRadius: 24, background: 'linear-gradient(180deg,#151B3A,#0E1226 60%)', border: '1px solid rgba(127,212,200,.3)', boxShadow: '0 30px 80px rgba(0,0,0,.6)', padding: '24px 22px 20px', display: 'flex', flexDirection: 'column', gap: 14, animation: 'astro-in .45s cubic-bezier(.2,.7,.2,1) both' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 64, height: 72, flexShrink: 0 }}><Figure id={ch.id} state="listening" reduced={reduced} framing="face" /></div>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(127,212,200,.14)', border: '1px solid rgba(127,212,200,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7FD4C8' }}><MicIcon size={22} /></div>
              </div>
              <div style={{ font: `400 28px/1.08 ${SERIF}`, color: INK }}>Can {ch.name} hear you?</div>
              <div style={{ font: `400 15px/1.55 ${SANS}`, color: SOFT, textWrap: 'pretty' }}>AstroMeridian uses your microphone only while a conversation is on, so {ch.name} can hear your question. Nothing is kept after the conversation.</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
                <button type="button" className="astro-focus" onClick={allowMic} style={pill({ padding: '13px 18px', border: 0, background: '#7FD4C8', color: '#07091A', font: `500 15px ${SANS}` })}>Allow microphone</button>
                <button type="button" className="astro-focus" onClick={typeInstead} style={pill({ padding: '12px 18px', border: '1px solid rgba(239,234,224,.22)', font: `500 15px ${SANS}` })}>I'll type instead</button>
              </div>
              <div style={{ font: `400 12px/1.5 ${SANS}`, color: DIM }}>Your browser will ask to confirm. You can change this anytime in its site settings.</div>
            </div>
          )}

          {view === 'panel' && (
            <div style={{ width: panelW, height: panelH, display: 'flex', flexDirection: 'column', background: PANEL, border: '1px solid rgba(239,234,224,.14)', borderRadius: isSheet ? '22px 22px 0 0' : 22, boxShadow: '0 30px 80px rgba(0,0,0,.6)', overflow: 'hidden', animation: 'astro-in .3s cubic-bezier(.2,.7,.2,1) both' }}>
              {isSheet && <div style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, background: 'rgba(239,234,224,.25)', marginTop: 8 }} />}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 12px 10px 16px', borderBottom: '1px solid rgba(239,234,224,.08)' }}>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <div style={{ font: `500 20px/1.1 ${SERIF}`, color: INK }}>{ch.name}</div>
                  <div style={{ font: `400 10px ${MONO}`, letterSpacing: '.12em', textTransform: 'uppercase', color: DIM }}>{ch.role}</div>
                </div>
                <button type="button" className="astro-focus" onClick={() => setTab(t => (t === 'settings' ? 'chat' : 'settings'))} aria-label="Astrologer settings" aria-pressed={tab === 'settings'} title="Settings" style={{ height: 34, padding: '0 12px', borderRadius: 999, border: `1px solid ${tab === 'settings' ? 'rgba(212,178,106,.5)' : 'rgba(239,234,224,.18)'}`, background: tab === 'settings' ? 'rgba(212,178,106,.14)' : 'transparent', color: INK, display: 'flex', alignItems: 'center', gap: 6, font: `400 13px ${SANS}`, cursor: 'pointer' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' }}><path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></svg>Settings
                </button>
                <button type="button" className="astro-hov astro-focus" onClick={minimize} aria-label="Minimize astrologer" title="Minimize" style={{ ...round(34), background: 'transparent' }}><Icon d={['M6 12h12']} /></button>
                <button type="button" className="astro-hov astro-focus" onClick={collapse} aria-label="Close conversation" title="Close" style={{ ...round(34), background: 'transparent' }}><Icon d={['M7 7l10 10M17 7L7 17']} /></button>
              </div>

              {tab === 'chat' ? (
                <>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 16px', background: 'radial-gradient(ellipse 80% 120% at 20% 50%,rgba(183,164,230,.12),transparent 70%)', borderBottom: '1px solid rgba(239,234,224,.06)' }}>
                    <div style={{ position: 'relative', width: compact ? 64 : 92, height: compact ? 74 : 106, flexShrink: 0 }}><Figure id={ch.id} state={aState === 'connecting' ? 'thinking' : aState} reduced={reduced} /></div>
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, font: `500 10px ${MONO}`, letterSpacing: '.12em', textTransform: 'uppercase', color: stateColor }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: stateColor, boxShadow: `0 0 8px ${stateColor}` }} />{stateLabel}{cardAnim}
                      </div>
                      {showWords ? <Captions caption={caption} compact={compact} size={subPx} /> : stageText && <div style={{ font: `400 14px/1.5 ${SANS}`, color: aState === 'idle' ? SOFT : cardTextColor, textWrap: 'pretty' }}>{stageText}</div>}
                      {aState === 'error' && <div style={{ display: 'flex', gap: 8 }}>{PAID_FIX[err]
                        ? <Link to={PAID_FIX[err][1]} onClick={astro.reset} className="astro-focus" style={pill({ padding: '6px 12px', font: `500 12px ${SANS}`, borderBottom: 'none' })}>{PAID_FIX[err][0]}</Link>
                        : <button type="button" className="astro-focus" onClick={retry} style={pill({ padding: '6px 12px', font: `500 12px ${SANS}` })}>Try again</button>}</div>}
                    </div>
                  </div>

                  <div ref={histRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', scrollbarWidth: 'thin', scrollbarColor: 'rgba(239,234,224,.18) transparent', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {hist.length === 0 && <div style={{ margin: 'auto 0', textAlign: 'center', font: `400 14px/1.5 ${SANS}`, color: DIM, padding: '8px 20px' }}>Ask about your Sun, Moon, rising, houses or today's transits. Your conversation appears here.</div>}
                    {hist.map((m, i) => m.role === 'user'
                      ? <div key={i} style={{ alignSelf: 'flex-end', maxWidth: '84%', padding: '9px 13px', borderRadius: '16px 16px 4px 16px', background: 'rgba(212,178,106,.14)', border: '1px solid rgba(212,178,106,.3)', font: `400 14px/1.45 ${SANS}`, color: INK }}>{m.text}</div>
                      : (
                        <div key={i} style={{ alignSelf: 'flex-start', maxWidth: '92%', display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div style={{ font: `500 10px ${MONO}`, letterSpacing: '.12em', textTransform: 'uppercase', color: DIM }}>{ch.name}</div>
                          <div style={{ font: `400 15px/1.55 ${SANS}`, color: INK, textWrap: 'pretty' }}>{m.text}</div>
                          {m.ref && READINGS[m.ref] && (
                            <Link to={READINGS[m.ref][1]} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 7, padding: '5px 11px', borderRadius: 999, border: '1px solid rgba(183,164,230,.4)', background: 'rgba(183,164,230,.08)', font: `400 12px ${SANS}`, color: '#C9BCF0' }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#B7A4E6' }} />{READINGS[m.ref][0]} →
                            </Link>
                          )}
                        </div>
                      ))}
                  </div>

                  <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '4px 16px 10px', flexShrink: 0, scrollbarWidth: 'none' }}>
                    {SUGG.map(label => <button key={label} type="button" className="astro-chip astro-focus" onClick={() => astro.ask(label)} style={{ flexShrink: 0, padding: '7px 12px', borderRadius: 999, border: '1px solid rgba(212,178,106,.35)', background: 'rgba(212,178,106,.06)', color: '#EBD39A', font: `400 13px ${SANS}`, cursor: 'pointer', whiteSpace: 'nowrap' }}>{label}</button>)}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '10px 12px 12px', borderTop: '1px solid rgba(239,234,224,.08)', background: '#0B0F20' }}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'space-between' }}>
                      {ctrls.map(k => (
                        <button key={k.aria} type="button" className="astro-focus" onClick={k.onClick} aria-label={k.aria} aria-pressed={k.pressed} disabled={k.disabled} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 34, borderRadius: 10, border: `1px solid ${k.border || 'rgba(239,234,224,.14)'}`, background: k.bg || 'transparent', color: k.color || INK, font: `400 12px ${SANS}`, cursor: k.disabled ? 'default' : 'pointer', padding: '0 6px', opacity: k.disabled ? 0.45 : 1 }}>
                          <Icon d={k.d} />{k.label}
                        </button>
                      ))}
                    </div>
                    <form onSubmit={submit} style={{ display: 'flex', gap: 8, alignItems: 'center', margin: 0 }}>
                      <input ref={inputRef} value={input} onChange={ev => setInput(ev.target.value)} placeholder={`Ask about your ${compact ? 'chart' : 'chart, houses or today'}…`} aria-label="Type a question about your readings" style={{ flex: 1, minWidth: 0, height: 48, padding: '0 16px', borderRadius: 999, border: '1px solid rgba(239,234,224,.16)', background: 'rgba(239,234,224,.05)', color: INK, font: `400 15px ${SANS}`, outline: 'none' }} />
                      <button type="submit" className="astro-focus" aria-label="Send question" title="Send" style={{ width: 44, height: 44, flexShrink: 0, borderRadius: '50%', border: '1px solid rgba(239,234,224,.2)', background: 'transparent', color: INK, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}><Icon d={['M5 12h14M13 6l6 6-6 6']} size={18} /></button>
                    </form>
                    <div style={{ display: 'flex' }}>{liveSwitch(true)}</div>
                  </div>
                </>
              ) : (
                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: 16, display: 'flex', flexDirection: 'column', gap: 18, scrollbarWidth: 'thin', scrollbarColor: 'rgba(239,234,224,.18) transparent' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, border: '1px solid rgba(239,234,224,.1)', background: 'rgba(239,234,224,.03)' }}>
                    <div style={{ width: 52, height: 58, flexShrink: 0 }}><Figure id={ch.id} state="idle" reduced={reduced} framing="face" /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ font: `500 18px/1.1 ${SERIF}`, color: INK }}>{ch.name}</div>
                      <div style={{ font: `400 12px/1.4 ${SANS}`, color: DIM }}>{ch.role}</div>
                    </div>
                    <Link to="/choose-astrologer" style={{ flexShrink: 0, padding: '8px 14px', borderRadius: 999, border: '1px solid rgba(212,178,106,.5)', font: `500 13px ${SANS}`, color: GOLD }}>Change</Link>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {toggles.map(([label, sub, on, fn]) => (
                      <button key={label} type="button" role="switch" aria-checked={on} className="astro-focus" onClick={fn} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 4px', border: 0, borderBottom: '1px solid rgba(239,234,224,.06)', background: 'transparent', color: INK, textAlign: 'left', cursor: 'pointer' }}>
                        <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ font: `400 15px ${SANS}` }}>{label}</span><span style={{ font: `400 12px/1.4 ${SANS}`, color: DIM }}>{sub}</span></span>
                        <span style={{ position: 'relative', width: 40, height: 22, borderRadius: 11, background: on ? GOLD : 'rgba(239,234,224,.18)', flexShrink: 0, transition: 'background .2s' }}><span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: INK, transition: 'left .2s' }} /></span>
                      </button>
                    ))}
                  </div>
                  {segs.map(([label, cur, opts, fn]) => (
                    <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ font: `500 10px ${MONO}`, letterSpacing: '.12em', textTransform: 'uppercase', color: DIM }}>{label}</div>
                      <div role="radiogroup" aria-label={label} style={{ display: 'flex', gap: 4, padding: 3, borderRadius: 12, background: 'rgba(239,234,224,.05)' }}>
                        {opts.map(([v, l]) => <button key={v} type="button" role="radio" aria-checked={cur === v} className="astro-focus" onClick={() => fn(v)} style={{ flex: 1, height: 34, borderRadius: 9, border: 0, background: cur === v ? GOLD : 'transparent', color: cur === v ? '#07091A' : SOFT, font: `500 13px ${SANS}`, cursor: 'pointer' }}>{l}</button>)}
                      </div>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 4 }}>
                    <button type="button" className="astro-focus" onClick={() => { save({ side: 'right', yFrac: 1 }); setNudge(0); }} style={pill({ padding: '9px 14px', font: `400 13px ${SANS}`, border: '1px solid rgba(239,234,224,.2)' })}>Reset position</button>
                    <button type="button" className="astro-focus" onClick={astro.clearHist} style={pill({ padding: '9px 14px', font: `400 13px ${SANS}`, border: '1px solid rgba(239,234,224,.2)' })}>Clear conversation</button>
                    <button type="button" className="astro-focus" onClick={hide} style={pill({ padding: '9px 14px', font: `400 13px ${SANS}`, border: '1px solid rgba(224,138,138,.4)', color: '#EBB0B0' })}>Hide from all pages</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {toast && (
        <div role="status" style={{ position: 'fixed', left: '50%', bottom: 20, transform: 'translateX(-50%)', zIndex: 901, display: 'flex', alignItems: 'center', gap: 14, maxWidth: 'calc(100vw - 24px)', padding: '12px 12px 12px 18px', borderRadius: 14, background: PANEL, border: '1px solid rgba(239,234,224,.16)', boxShadow: '0 18px 50px rgba(0,0,0,.5)', font: `400 14px/1.4 ${SANS}`, color: INK, animation: 'astro-in .3s ease both' }}>
          <span>{ch.name} is hidden. Bring them back from <Link to="/choose-astrologer">Your astrologer</Link> in the menu.</span>
          <button type="button" className="astro-focus" onClick={undoHide} style={pill({ padding: '7px 14px', border: 0, background: GOLD, color: '#07091A' })}>Undo</button>
        </div>
      )}
    </div>
  );
}
