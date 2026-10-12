import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Starfield from '../components/Starfield.jsx';
import NavMenu from '../components/NavMenu.jsx';
import CelestialScan, { RevealRing } from '../components/CelestialScan.jsx';
import { deletePalmReading, getPalmReading, highlightReading, listPalmReadings, listProfiles, readPalm } from '../lib/api.js';
import { avatarImage } from '../lib/assets.js';
import { readActive } from '../lib/active-profile.js';
import { getLang, locale, t } from '../i18n/index.js';

const MONO = "'IBM Plex Mono',monospace";
const SERIF = "'Cormorant Garamond',Georgia,serif";
const INK = '#1C2538', CREAM = '#F4ECDC', GOLD = '#B4933F', BRIGHT = '#E3B64B';
const mono = (size, extra) => ({ fontFamily: MONO, fontSize: size, letterSpacing: '.14em', textTransform: 'uppercase', ...extra });
const rise = delay => ({ animation: `om-rise .6s cubic-bezier(.3,0,.2,1) ${delay}s both` });
const outline = { alignSelf: 'flex-start', background: 'transparent', border: '1px solid rgba(244,236,220,.45)', padding: '9px 16px', cursor: 'pointer', ...mono(9.5, { color: CREAM }) };
const textBtn = { alignSelf: 'flex-start', background: 'transparent', border: 'none', padding: '8px 0', cursor: 'pointer', ...mono(9.5, { color: 'rgba(244,236,220,.6)' }) };
const body = { margin: 0, fontSize: 14.5, lineHeight: 1.55, color: 'rgba(244,236,220,.82)', textWrap: 'pretty' };
const label = color => mono(9.5, { letterSpacing: '.16em', color });
const field = { width: '100%', border: 'none', borderBottom: '1px solid rgba(244,236,220,.35)', background: 'transparent', color: CREAM, padding: '6px 0', fontFamily: SERIF, fontSize: 20, borderRadius: 0, colorScheme: 'dark' };

const STEPS = ['Finding the palm', 'Tracing heart, head and life lines', 'Reading the fate line and mounts', 'Writing your report'];
// ponytail: profiles carry no dominant hand yet; read it from the profile once it does
const DOMINANT = 'right';
const MAX_SIDE = 1600;
// same values as the server (GENDERS in models/User)
const GENDERS = [['female', 'Female'], ['male', 'Male']];
// colours match the ones the image model is asked to draw (server: PalmImageService)
const LINES = [['heart', 'Heart line', '#E5484D'], ['head', 'Head line', '#3E8BFF'], ['life', 'Life line', '#3DBE6B'], ['fate', 'Fate line', '#E3B64B']];
const RANKS = ['I', 'II', 'III', 'IV'];
const VISIBILITY = { clear: 'Clear', partial: 'Partly visible', faint: 'Faint', not_visible: 'Not visible' };
const CONFIDENCE = { high: 'high confidence', medium: 'medium confidence', low: 'low confidence' };
const PROMINENCE = { high: ['high', GOLD], even: ['even', 'rgba(244,236,220,.7)'], low: ['low', 'rgba(244,236,220,.45)'], not_visible: ['not visible', 'rgba(244,236,220,.35)'] };
const OVERALL = [['personality', 'Personality'], ['relationships', 'Relationships'], ['career', 'Career'], ['lifeThemes', 'Life themes']];

const handLabel = h => (h === 'left' ? t('Left hand') : t('Right hand'));
const tag = (vis, conf) => (vis === 'not_visible' || conf === 'not_visible' && !vis ? t('Not visible') : [vis && t(VISIBILITY[vis] || vis), CONFIDENCE[conf] && t(CONFIDENCE[conf])].filter(Boolean).join(' · '));
// "Mount of Venus" reads "Venusberg" in German; in English the design shows just "Venus"
const mountName = n => { const k = `Mount of ${n}`, v = t(k); return v === k ? t(n) : v; };

/* A free check before anything is sent: clearly too dark, washed out or blurred
   photos are caught here. Thresholds are loose on purpose, since the reader checks
   again and "Use it anyway" covers a wrong call.
   ponytail: global thresholds, tuned by eye; calibrate against real rejects if they misfire. */
function lightCheck(src) {
  const s = Math.min(1, 256 / Math.max(src.width, src.height)), c = document.createElement('canvas');
  const w = c.width = Math.max(1, Math.round(src.width * s)), h = c.height = Math.max(1, Math.round(src.height * s));
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(src, 0, 0, w, h);
  const px = x.getImageData(0, 0, w, h).data, g = new Float32Array(w * h);
  let sum = 0, blown = 0;
  for (let i = 0; i < g.length; i++) {
    const y = (0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2]) / 255;
    g[i] = y; sum += y; if (y > 0.97) blown++;
  }
  // sharpness: variance of the Laplacian, on a 0–255 scale
  let n = 0, m = 0, m2 = 0;
  for (let yy = 1; yy < h - 1; yy++) for (let xx = 1; xx < w - 1; xx++) {
    const i = yy * w + xx, l = 255 * (4 * g[i] - g[i - 1] - g[i + 1] - g[i - w] - g[i + w]);
    n++; const d = l - m; m += d / n; m2 += d * (l - m);
  }
  const mean = sum / g.length, sharp = n ? m2 / n : 0;
  return [mean < 0.16 && 'dark', blown / g.length > 0.55 && 'bright', n && sharp < 12 && 'blurry'].filter(Boolean);
}

/* Draw a frame or a decoded file to a canvas, at most MAX_SIDE on its long
   side: the JPEG sent to the reader. */
async function prep(src, w, h, mirror = false) {
  const s = Math.min(1, MAX_SIDE / Math.max(w, h)), c = document.createElement('canvas');
  c.width = Math.round(w * s); c.height = Math.round(h * s);
  const x = c.getContext('2d');
  if (mirror) { x.translate(c.width, 0); x.scale(-1, 1); }
  x.drawImage(src, 0, 0, c.width, c.height);
  const issues = lightCheck(c);
  const blob = await new Promise((ok, no) => c.toBlob(b => (b ? ok(b) : no(new Error('encode'))), 'image/jpeg', 0.88));
  return { blob, url: URL.createObjectURL(blob), issues };
}

/* Phones store photos sideways with an EXIF turn; the bitmap (or an <img>) applies it. */
async function fromFile(file) {
  if (window.createImageBitmap) {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
      try { return await prep(bmp, bmp.width, bmp.height); } finally { if (bmp.close) bmp.close(); }
    } catch (e) { /* fall back to <img> */ }
  }
  const src = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = src;
    await img.decode();
    return await prep(img, img.naturalWidth, img.naturalHeight);
  } finally { URL.revokeObjectURL(src); }
}

/* The server's reasons for turning a photo away (PHOTO_PROBLEMS in PalmReportService). */
const PHOTO_PROBLEMS = {
  not_a_hand: "This photo doesn't show a hand. Take a photo of just your open palm.",
  back_of_hand: 'This looks like the back of your hand. Turn it over so your palm faces the camera.',
  closed_hand: 'Your hand looks closed. Open it flat with your fingers a little apart.',
  multiple_hands: 'There is more than one hand in the photo. Photograph one palm at a time.',
  poor_light: "The lines aren't clear in this light. Retake the photo in bright, even daylight, without flash.",
  blurry: 'The photo is blurry. Hold the camera steady and let it focus on your palm.',
  palm_cropped: 'Part of your palm is out of the frame. Fit your whole palm, from wrist to fingers, in the photo.'
};
const LOCAL = {
  dark: 'This photo looks too dark to read the lines. Move into brighter, even light and retake it.',
  bright: 'This photo looks washed out. Step out of direct glare or switch off the flash and retake it.',
  blurry: 'This photo looks blurry. Hold steady and let the camera focus on your palm.'
};
const TIPS = ['Bright, even daylight — no flash, no harsh shadows', 'Only your hand in the frame, palm facing the camera', 'Palm flat, fingers a little apart', 'Whole palm visible, from wrist to fingertips', 'Hold steady until the camera focuses'];

const failure = e => {
  const photo = PHOTO_PROBLEMS[e.code];
  if (photo) return { text: t(photo), tips: true, retry: false };
  if (e.code === 'palm_unclear') return { text: e.message || t('The lines would not come into focus. Try again in brighter, more even light.'), tips: true, retry: false };
  if (e.code === 'too_large' || e.status === 413) return { text: t('That photo is too large. Try a smaller one, under 10 MB.'), retry: false };
  if (e.code === 'unsupported_format' || e.status === 415) return { text: t("That file can't be read. Use a JPEG, PNG or WebP photo."), retry: false };
  if (e.status === 429) return { text: t("You've read a lot of palms this hour. Try again a little later."), retry: false };
  if (e.code === 'profile_not_found') return { text: t('That profile is no longer available. Choose someone else.'), retry: false, who: true };
  if (e.status === 400 && e.message) return { text: e.message, retry: false };
  // a server setup problem, not a passing hiccup: retrying won't help
  if (e.code === 'ai_not_configured' || e.code === 'storage_not_configured') return { text: t("Palm reading isn't set up on the server yet. Please try again later."), retry: false };
  return { text: t('The reader is resting. Try again in a moment.'), retry: true };
};

/* The photo as the design shows it: cover-cropped into the 4:5 frame. */
const PalmPhoto = ({ photo, label }) => (
  <div role="img" aria-label={label || t('Your palm')} style={{ position: 'absolute', inset: 0, backgroundImage: `url("${photo}")`, backgroundSize: 'cover', backgroundPosition: 'center', animation: 'om-fade .4s ease both' }} />
);

const drawFailure = e => (e.status === 429 ? t("You've drawn a lot of palms this hour. Try again a little later.") : e.code === 'image_refused' ? e.message : t("The lines couldn't be drawn this time."));
const shortDate = iso => (iso ? new Date(iso).toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const fullName = p => [p.firstName, p.lastName].filter(Boolean).join(' ') || p.name || '';
const validAge = a => a === '' || (/^\d+$/.test(a) && +a >= 1 && +a <= 120);
/* Who a stored reading was for, as the form sends it again ("read the other hand").
   The profile may come as an id or as the populated document. */
const subjectOf = s => (s && s.kind === 'profile' && s.profile
  ? { profileId: s.profile._id || s.profile, name: s.name }
  : { name: (s && s.name) || '', gender: (s && s.gender) || '', age: s && s.age ? String(s.age) : '' });

const Avatar = ({ p }) => (
  <span style={{ width: 30, height: 30, flex: '0 0 auto', borderRadius: '50%', overflow: 'hidden', background: 'rgba(244,236,220,.12)', border: '1px solid rgba(244,236,220,.4)', fontFamily: SERIF, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    {p.avatar
      ? <img src={avatarImage(p.avatar)} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      : ((p.firstName || p.name || '?').trim().charAt(0) || '?').toUpperCase()}
  </span>
);

export default function PalmReading() {
  const navigate = useNavigate();
  const [stage, setStage] = useState('who'); // who | idle | analyzing | report | error
  const [hand, setHand] = useState(DOMINANT);
  const [photo, setPhoto] = useState(null); // { url, blob }
  const [result, setResult] = useState(null);
  const [step, setStep] = useState(0);
  const [error, setError] = useState(null); // { text, retry, tips, anyway, who }
  const [camera, setCamera] = useState('pending'); // pending | on | none
  const [mode, setMode] = useState('choose'); // choose | camera: the camera starts only when asked for
  const [facing, setFacing] = useState('environment');
  const [profiles, setProfiles] = useState(null);
  const [pick, setPick] = useState(null); // a profile id, or 'other'
  const [other, setOther] = useState({ name: '', gender: '', age: '' });
  const [who, setWho] = useState(null); // { profileId, name } | { name, gender, age }
  const [history, setHistory] = useState({ items: [], next: null, state: 'loading' }); // loading | ready | failed
  const [busy, setBusy] = useState(null); // the reading being opened or deleted
  const [histNote, setHistNote] = useState('');
  const [drawn, setDrawn] = useState({ state: 'none', url: null }); // none | drawing | done | failed | unsaved
  const [view, setView] = useState('lines'); // lines | photo
  const videoRef = useRef(null), fileRef = useRef(null), streamRef = useRef(null), tick = useRef(null), last = useRef(null), dead = useRef(false);
  const run = useRef(0); // a retake or a new photo makes an older drawing stale
  const wantCam = useRef(false); // a late camera grant after the user moved on is dropped

  const denied = useCallback(e => { if (e.status === 401) { navigate('/login'); return true; } return false; }, [navigate]);

  useEffect(() => {
    // readings used to be kept on the device; they live on the account now
    try { localStorage.removeItem('meridian_palm_reading_v1'); } catch (e) {}
    listProfiles().then(list => {
      if (dead.current) return;
      const wanted = readActive();
      const p = list.find(x => x._id === wanted) || list.find(x => x.isPrimary) || list[0];
      setProfiles(list); setPick(p ? p._id : 'other');
    }).catch(e => { if (!denied(e) && !dead.current) { setProfiles([]); setPick('other'); } });
    listPalmReadings().then(r => { if (!dead.current) setHistory({ items: r.readings || [], next: r.next || null, state: 'ready' }); })
      .catch(e => { if (!denied(e) && !dead.current) setHistory(h => ({ ...h, state: 'failed' })); });
  }, [denied]);

  const loadMore = () => {
    setHistory(h => ({ ...h, state: 'loading' }));
    listPalmReadings({ before: history.next })
      .then(r => { if (!dead.current) setHistory(h => ({ items: [...h.items, ...(r.readings || [])], next: r.next || null, state: 'ready' })); })
      .catch(e => { if (!denied(e) && !dead.current) setHistory(h => ({ ...h, state: 'failed' })); });
  };

  const bind = () => {
    const v = videoRef.current, s = streamRef.current;
    if (v && s && v.srcObject !== s) { v.srcObject = s; v.play().catch(() => {}); }
  };
  const videoEl = useCallback(el => { videoRef.current = el; bind(); }, []);
  const stopCamera = () => { if (streamRef.current) { streamRef.current.getTracks().forEach(x => x.stop()); streamRef.current = null; } };
  const startCamera = () => {
    if (streamRef.current) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { setCamera('none'); return; }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 1600 } }, audio: false })
      .then(stream => {
        // unmounted, the camera was put away meanwhile, or a second start already holds it
        if (dead.current || streamRef.current || !wantCam.current) { stream.getTracks().forEach(x => x.stop()); return; }
        streamRef.current = stream;
        const track = stream.getVideoTracks()[0];
        setFacing((track && track.getSettings && track.getSettings().facingMode) || 'environment');
        setCamera('on');
        bind();
      })
      .catch(() => { if (!dead.current) setCamera('none'); });
  };
  const camOff = () => { wantCam.current = false; stopCamera(); };
  const openCamera = () => { wantCam.current = true; startCamera(); };

  useEffect(() => {
    dead.current = false;
    return () => { dead.current = true; camOff(); clearInterval(tick.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // the photo's object URL goes when the photo does
  useEffect(() => () => { if (photo && photo.url.startsWith('blob:')) URL.revokeObjectURL(photo.url); }, [photo]);

  /* After a saved reading: the stored photo redrawn with its lines highlighted.
     The server leaves out lines the reading could not see. */
  const highlight = async id => {
    const mine = run.current;
    setDrawn({ state: 'drawing', url: null }); setView('lines');
    try {
      const { image } = await highlightReading(id);
      if (dead.current || mine !== run.current) return;
      setDrawn({ state: 'done', url: image });
    } catch (e) {
      if (dead.current || mine !== run.current || denied(e)) return;
      setDrawn({ state: 'failed', url: null, text: drawFailure(e) });
    }
  };

  const submit = async (shot, h, anyway = false) => {
    camOff();
    if (!anyway && shot.issues && shot.issues.length) {
      setPhoto(shot); setResult(null); last.current = { shot, hand: h };
      setError({ text: t(LOCAL[shot.issues[0]]), tips: true, anyway: true }); setStage('error');
      return;
    }
    run.current += 1;
    setDrawn({ state: 'none', url: null });
    last.current = { shot, hand: h };
    setPhoto(shot); setResult(null); setError(null); setStep(0); setStage('analyzing');
    clearInterval(tick.current);
    // the last step stays lit, never done, until the reading arrives
    tick.current = setInterval(() => setStep(s => Math.min(STEPS.length - 1, s + 1)), 3200);
    const form = new FormData();
    form.append('photo', shot.blob, 'palm.jpg');
    form.append('hand', h);
    form.append('dominant', DOMINANT);
    form.append('lang', getLang());
    if (who.profileId) form.append('profileId', who.profileId);
    else {
      form.append('name', who.name.trim());
      if (who.gender) form.append('gender', who.gender);
      if (who.age) form.append('age', who.age);
    }
    try {
      const res = await readPalm(form);
      if (dead.current) return;
      if (!res || !res.report || res.report.ok === false) throw Object.assign(new Error((res && res.report && res.report.reason) || ''), { code: 'palm_unclear' });
      setResult(res); setStage('report');
      if (res.saved && res.id) {
        const images = res.images || {};
        setHistory(hs => ({ ...hs, items: [{ id: res.id, subject: res.subject, hand: res.hand, title: res.report.title, createdAt: res.createdAt, thumb: images.original }, ...hs.items] }));
        highlight(res.id);
      } else setDrawn({ state: 'unsaved', url: null });
    } catch (e) {
      if (dead.current || denied(e)) return;
      setError(failure(e)); setStage('error');
    } finally { clearInterval(tick.current); }
  };

  const shoot = async () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    try { submit(await prep(v, v.videoWidth, v.videoHeight, facing === 'user'), hand); }
    catch (e) { camOff(); setError({ text: t('Could not take the photo. Try again.'), retry: false }); setStage('error'); }
  };
  const onFile = async e => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try { submit(await fromFile(f), hand); }
    catch (err) { camOff(); setPhoto(null); setError({ text: t("That photo couldn't be opened. Try a JPEG or PNG."), retry: false }); setStage('error'); }
  };
  const pickFile = () => { if (fileRef.current) fileRef.current.click(); };
  const takePhoto = () => { setMode('camera'); openCamera(); };
  const retake = () => {
    run.current += 1; setDrawn({ state: 'none', url: null }); setStage('idle'); setPhoto(null); setResult(null); setError(null);
    if (mode === 'camera') openCamera();
  };
  const retry = () => { if (last.current) submit(last.current.shot, last.current.hand, true); }; // a resend: the photo was already accepted
  const changePerson = () => {
    camOff(); run.current += 1;
    setStage('who'); setMode('choose'); setPhoto(null); setResult(null); setError(null); setDrawn({ state: 'none', url: null });
  };

  const chosen = profiles && pick !== 'other' ? profiles.find(p => p._id === pick) : null;
  const ready = chosen || (pick === 'other' && other.name.trim() && validAge(other.age.trim()));
  const proceed = () => {
    if (!ready) return;
    setWho(chosen ? { profileId: chosen._id, name: fullName(chosen) } : { name: other.name.trim(), gender: other.gender, age: other.age.trim() });
    setMode('choose'); setStage('idle');
  };

  const open = async id => {
    setBusy(id); setHistNote('');
    try {
      const r = await getPalmReading(id);
      if (dead.current) return;
      camOff(); run.current += 1;
      const images = r.images || {};
      setResult(r); setHand(r.hand || hand); setWho(subjectOf(r.subject)); setMode('choose');
      setPhoto(images.original ? { url: images.original } : null);
      setDrawn(images.highlighted ? { state: 'done', url: images.highlighted } : { state: 'none', url: null }); setView('lines');
      setError(null); setStage('report');
      window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    } catch (e) {
      if (dead.current || denied(e)) return;
      if (e.status === 404) setHistory(h => ({ ...h, items: h.items.filter(x => x.id !== id) }));
      setHistNote(t("That reading couldn't be opened."));
    } finally { if (!dead.current) setBusy(null); }
  };

  const remove = async id => {
    if (!window.confirm(t('Delete this reading and its photos? This cannot be undone.'))) return;
    setBusy(id); setHistNote('');
    try {
      await deletePalmReading(id);
      if (dead.current) return;
      setHistory(h => ({ ...h, items: h.items.filter(x => x.id !== id) }));
      if (result && result.id === id) changePerson();
    } catch (e) {
      if (dead.current || denied(e)) return;
      setHistNote(t("That reading couldn't be deleted."));
    } finally { if (!dead.current) setBusy(null); }
  };

  const dom = DOMINANT, otherHand = hand === 'right' ? 'left' : 'right';
  const choosing = stage === 'who', idle = stage === 'idle', analyzing = stage === 'analyzing', failed = stage === 'error', report = stage === 'report' && result ? result.report : null;
  const camOn = camera === 'on' && mode === 'camera';
  const subjectName = (result && result.subject && result.subject.name) || (who && who.name) || '';
  const lightNote = idle ? t('Daylight · no flash') : analyzing ? t('Reading…') : handLabel(hand);

  const readings = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: report ? 18 : 0, borderTop: report ? '1px solid rgba(244,236,220,.13)' : 'none' }}>
      <span style={label('rgba(244,236,220,.45)')}>{t('Your readings')}</span>
      {history.state === 'failed' && !history.items.length ? (
        <p style={{ ...body, fontSize: 13.5, color: 'rgba(244,236,220,.6)' }}>{t("Your readings couldn't be loaded.")}</p>
      ) : history.state === 'ready' && !history.items.length ? (
        <p style={{ ...body, fontSize: 13.5, color: 'rgba(244,236,220,.6)' }}>{t('Your readings will appear here.')}</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' }}>
          {history.items.map(r => {
            const isOpen = report && result.id === r.id;
            return (
              <li key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px solid rgba(244,236,220,.13)', opacity: busy === r.id ? .5 : 1 }}>
                <button type="button" className="pr-link" onClick={() => open(r.id)} disabled={!!busy} aria-current={isOpen ? 'true' : undefined}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: CREAM, textAlign: 'left' }}>
                  <span style={{ width: 52, height: 52, flex: '0 0 auto', background: r.thumb ? `#121A2B url("${r.thumb}") center / cover no-repeat` : '#121A2B', border: `1px solid ${isOpen ? GOLD : 'rgba(244,236,220,.22)'}` }} />
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                    <span style={mono(9, { letterSpacing: '.1em', color: 'rgba(244,236,220,.5)' })}>{[r.subject && r.subject.name, handLabel(r.hand), shortDate(r.createdAt)].filter(Boolean).join(' · ')}</span>
                    <span style={{ fontFamily: SERIF, fontSize: 18, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{busy === r.id ? t('Opening…') : r.title}</span>
                  </span>
                </button>
                <button type="button" className="pr-link" onClick={() => remove(r.id)} disabled={!!busy} aria-label={t('Delete reading')} style={{ ...textBtn, alignSelf: 'center', flex: '0 0 auto' }}>{t('Delete')}</button>
              </li>
            );
          })}
        </ul>
      )}
      {histNote && <span role="alert" style={{ fontSize: 12.5, lineHeight: 1.5, color: 'rgba(244,236,220,.6)' }}>{histNote}</span>}
      {history.next && history.state !== 'loading' && <button type="button" className="pr-link" onClick={loadMore} style={textBtn}>{t('Load more')}</button>}
    </div>
  );
  return (
    <div className="pr-shell" style={{ minHeight: '100vh', background: INK, color: CREAM, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}><Starfield /></div>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'linear-gradient(180deg,rgba(28,37,56,.35) 0%,rgba(28,37,56,.62) 55%,rgba(28,37,56,.82) 100%)' }} />

      <header style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '18px 24px', borderBottom: '1px solid rgba(244,236,220,.2)', maxWidth: 1200, width: '100%', margin: '0 auto' }}>
        <Link to="/" className="hdr-logo" style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 18, letterSpacing: '.14em', textTransform: 'uppercase', borderBottom: 'none' }}>AstroMeridian</Link>
        <NavMenu current="Palm Reading" />
      </header>

      <main className="pr-cols" style={{ position: 'relative', width: '100%', maxWidth: 460, margin: '0 auto', padding: '36px 22px 56px', display: 'grid', rowGap: 40 }}>

        <section className="pr-hero" style={{ gridArea: 'hero', display: 'flex', flexDirection: 'column', gap: 22, ...rise(.05) }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <span style={label(GOLD)}>{t('Palmistry · chiromancy')}</span>
            <h1 style={{ margin: 0, maxWidth: '11ch', fontFamily: SERIF, fontWeight: 400, fontSize: 42, lineHeight: 1.02, letterSpacing: '-.01em', textWrap: 'balance' }}>{t('The map you were')} <em style={{ fontStyle: 'italic' }}>{t('born holding')}</em>.</h1>
          </div>
          <p style={{ margin: 0, maxWidth: '44ch', fontSize: 15, lineHeight: 1.6, color: 'rgba(244,236,220,.74)', textWrap: 'pretty' }}>{t('Photograph your open palm in good light. AstroMeridian reads the heart, head, life and fate lines, the shape of the hand and the rise of its mounts — then writes you a report.')}</p>
        </section>

        <section className="pr-cam" style={{ gridArea: 'cam', display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0, ...rise(.15) }}>
          {choosing ? (
            <>
              <span style={label(GOLD)}>{t('Whose palm?')}</span>
              <div role="radiogroup" aria-label={t('Whose palm?')} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(profiles || []).map(p => {
                  const on = pick === p._id;
                  return (
                    <button key={p._id} type="button" role="radio" aria-checked={on} className="pr-pick" onClick={() => setPick(p._id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: on ? 'rgba(180,147,63,.12)' : 'transparent', border: `1px solid ${on ? GOLD : 'rgba(244,236,220,.25)'}`, color: CREAM, cursor: 'pointer', textAlign: 'left' }}>
                      <Avatar p={p} />
                      <span style={{ fontFamily: SERIF, fontSize: 19, lineHeight: 1.2, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.isPrimary ? t('{name} · you', { name: fullName(p) }) : fullName(p)}</span>
                    </button>
                  );
                })}
                <button type="button" role="radio" aria-checked={pick === 'other'} className="pr-pick" onClick={() => setPick('other')}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: pick === 'other' ? 'rgba(180,147,63,.12)' : 'transparent', border: `1px solid ${pick === 'other' ? GOLD : 'rgba(244,236,220,.25)'}`, color: CREAM, cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ width: 30, height: 30, flex: '0 0 auto', borderRadius: '50%', border: '1px dashed rgba(244,236,220,.45)', fontFamily: SERIF, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</span>
                  <span style={{ fontFamily: SERIF, fontSize: 19, lineHeight: 1.2 }}>{t('Someone else')}</span>
                </button>
              </div>
              {pick === 'other' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '6px 0 2px', animation: 'om-fade .3s ease both' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={label('rgba(244,236,220,.55)')}>{t('Name')}</span>
                    <input type="text" value={other.name} maxLength={60} autoComplete="off" onChange={e => setOther(o => ({ ...o, name: e.target.value }))} style={field} />
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '16px 28px' }}>
                    {/* a segmented choice in the page's own style, like the hand toggle; empty = not given */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <span style={{ ...label('rgba(244,236,220,.55)'), whiteSpace: 'nowrap' }}>{t('Gender · optional')}</span>
                      <div role="radiogroup" aria-label={t('Gender · optional')} style={{ display: 'flex', border: '1px solid rgba(244,236,220,.3)' }}>
                        {[...GENDERS, ['', 'Rather not say']].map(([v, name]) => {
                          const on = other.gender === v;
                          return (
                            <button key={v || 'none'} type="button" role="radio" aria-checked={on} className="pr-hand" onClick={() => setOther(o => ({ ...o, gender: v }))}
                              style={{ padding: '8px 14px', background: on ? CREAM : 'transparent', color: on ? INK : 'rgba(244,236,220,.7)', border: 'none', borderLeft: v === GENDERS[0][0] ? 'none' : '1px solid rgba(244,236,220,.18)', cursor: 'pointer', whiteSpace: 'nowrap', ...mono(9.5) }}>
                              {t(name)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, width: 110, flex: '0 0 auto' }}>
                      <span style={{ ...label('rgba(244,236,220,.55)'), whiteSpace: 'nowrap' }}>{t('Age · optional')}</span>
                      <input type="text" inputMode="numeric" maxLength={3} placeholder="—" value={other.age} onChange={e => setOther(o => ({ ...o, age: e.target.value.replace(/\D/g, '') }))} aria-invalid={!validAge(other.age.trim())} style={field} />
                    </label>
                  </div>
                  {!validAge(other.age.trim()) && <span role="alert" style={mono(9, { letterSpacing: '.08em', color: GOLD })}>{t('Age is a whole number from 1 to 120.')}</span>}
                </div>
              )}
              <button type="button" className="pr-outline" onClick={proceed} disabled={!ready} style={{ ...outline, marginTop: 6, opacity: ready ? 1 : .45, cursor: ready ? 'pointer' : 'default' }}>{t('Continue')}</button>
            </>
          ) : (<>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <span style={mono(9.5, { color: 'rgba(244,236,220,.6)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })}>{t('Reading for {name}', { name: subjectName })}</span>
            {!analyzing && <button type="button" className="pr-link" onClick={changePerson} style={{ ...textBtn, padding: 0, color: GOLD }}>{t('Change person')}</button>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div role="group" aria-label={t('Which hand')} style={{ display: 'flex', border: '1px solid rgba(244,236,220,.3)' }}>
              {['left', 'right'].map(h => {
                const on = h === hand, name = h === 'left' ? t('Left') : t('Right');
                return (
                  <button key={h} type="button" className="pr-hand" aria-pressed={on} disabled={analyzing} onClick={() => setHand(h)}
                    style={{ padding: '7px 14px', background: on ? CREAM : 'transparent', color: on ? INK : 'rgba(244,236,220,.7)', border: 'none', cursor: analyzing ? 'default' : 'pointer', ...mono(9.5) }}>
                    {h === dom ? t('{hand} · dominant', { hand: name }) : name}
                  </button>
                );
              })}
            </div>
            <span style={mono(9.5, { letterSpacing: '.12em', color: 'rgba(244,236,220,.45)' })}>{hand === dom ? t('What you make of your life') : t('What you were given')}</span>
          </div>

          <div style={{ position: 'relative', width: '100%', aspectRatio: '4 / 5', background: '#121A2B', border: '1px solid rgba(244,236,220,.22)', overflow: 'hidden' }}>
            {camOn && idle && (
              <video ref={videoEl} autoPlay playsInline muted aria-label={t('Camera preview')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: facing === 'user' ? 'scaleX(-1)' : 'none', transition: 'opacity .4s ease' }} />
            )}
            {photo && !idle && !choosing && <PalmPhoto photo={photo.url} />}
            {report && drawn.state === 'done' && view === 'lines' && (
              <>
                {/* keyed on the image: it opens out from the palm when it arrives */}
                <div key={drawn.url} className="cs-reveal" style={{ position: 'absolute', inset: 0 }}><PalmPhoto photo={drawn.url} label={t('Your palm with its lines highlighted')} /></div>
                <RevealRing key={`ring-${drawn.url}`} />
              </>
            )}
            {report && drawn.state === 'drawing' && <CelestialScan mode="draw" />}
            {report && drawn.state === 'drawing' && (
              <div role="status" style={{ position: 'absolute', left: '50%', bottom: '8%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', border: '1px solid rgba(244,236,220,.25)', background: 'rgba(28,37,56,.78)', whiteSpace: 'nowrap', pointerEvents: 'none', animation: 'om-fade .3s ease both' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: GOLD, animation: 'om-glow 1.4s ease-in-out infinite' }} />
                <span style={mono(9.5, { letterSpacing: '.16em', color: 'rgba(244,236,220,.85)' })}>{t('Drawing your lines…')}</span>
              </div>
            )}
            {idle && camOn && (
              <>
                <div className="pr-breathe" style={{ position: 'absolute', inset: '9% 12%', border: '1px dashed rgba(244,236,220,.45)', borderRadius: '46% 46% 36% 36% / 30% 30% 26% 26%', pointerEvents: 'none', animation: 'om-breathe 4s ease-in-out infinite' }} />
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: '7%', display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
                  <span style={{ padding: '7px 12px', background: 'rgba(28,37,56,.72)', border: '1px solid rgba(244,236,220,.25)', ...mono(9.5, { color: 'rgba(244,236,220,.85)' }) }}>{t('Palm flat · fingers apart · fill the frame')}</span>
                </div>
              </>
            )}
            {analyzing && (
              <>
                <CelestialScan mode="read" />
                <div role="status" style={{ position: 'absolute', left: '50%', bottom: '8%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', border: '1px solid rgba(244,236,220,.25)', background: 'rgba(28,37,56,.78)', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: GOLD, animation: 'om-glow 1.4s ease-in-out infinite' }} />
                  <span style={mono(9.5, { letterSpacing: '.16em', color: 'rgba(244,236,220,.85)' })}>{t(STEPS[step])}…</span>
                </div>
              </>
            )}
            {idle && mode === 'choose' && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24, textAlign: 'center' }}>
                <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 20, lineHeight: 1.4, color: 'rgba(244,236,220,.85)', textWrap: 'balance', marginBottom: 6 }}>{t('How would you like to add the photo?')}</span>
                <button type="button" className="pr-outline" onClick={takePhoto} style={{ ...outline, alignSelf: 'center', minWidth: 200 }}>{t('Take a photo')}</button>
                <button type="button" className="pr-outline" onClick={pickFile} style={{ ...outline, alignSelf: 'center', minWidth: 200 }}>{t('Choose from gallery')}</button>
              </div>
            )}
            {idle && mode === 'camera' && camera === 'none' && (
              <button type="button" onClick={pickFile} style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, textAlign: 'center', background: 'transparent', border: 'none', color: CREAM, cursor: 'pointer' }}>
                <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 20, lineHeight: 1.4, color: 'rgba(244,236,220,.85)', textWrap: 'balance' }}>{t('No camera here — or permission was declined.')}</span>
                <span style={mono(9.5, { color: 'rgba(244,236,220,.5)' })}>{t('Upload a photo instead')}</span>
              </button>
            )}
            {[['left', 'top'], ['right', 'top'], ['left', 'bottom'], ['right', 'bottom']].map(([x, y]) => (
              <div key={x + y} style={{ position: 'absolute', [x]: 10, [y]: 10, width: 18, height: 18, [`border${x[0].toUpperCase() + x.slice(1)}`]: '1px solid rgba(244,236,220,.6)', [`border${y[0].toUpperCase() + y.slice(1)}`]: '1px solid rgba(244,236,220,.6)', pointerEvents: 'none' }} />
            ))}
          </div>

          {report && (drawn.state !== 'none' || result.id) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, animation: 'om-fade .4s ease both' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '8px 16px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px' }}>
                  {(report.lines || []).length > 0 && LINES.map(([key, name, color]) => {
                    const line = (report.lines || []).find(l => l.key === key), seen = !line || line.visibility !== 'not_visible';
                    return (
                      <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ width: 18, height: 0, borderTop: `2px ${seen ? 'solid' : 'dashed'} ${color}`, opacity: seen ? 1 : .35, boxShadow: seen ? `0 0 6px ${color}` : 'none' }} />
                        <span style={mono(9, { letterSpacing: '.1em', color: seen ? 'rgba(244,236,220,.7)' : 'rgba(244,236,220,.38)' })}>{t(name)}{seen ? '' : ` · ${t('not visible')}`}</span>
                      </span>
                    );
                  })}
                </div>
                {drawn.state === 'done' && (
                  <div role="group" aria-label={t('Photo view')} style={{ display: 'flex', border: '1px solid rgba(244,236,220,.3)' }}>
                    {[['lines', t('Lines')], ['photo', t('Photo')]].map(([v, name]) => (
                      <button key={v} type="button" className="pr-hand" aria-pressed={view === v} onClick={() => setView(v)}
                        style={{ padding: '5px 11px', background: view === v ? CREAM : 'transparent', color: view === v ? INK : 'rgba(244,236,220,.7)', border: 'none', cursor: 'pointer', ...mono(9) }}>{name}</button>
                    ))}
                  </div>
                )}
              </div>
              {drawn.state === 'failed' ? (
                <span style={{ fontSize: 12.5, lineHeight: 1.5, color: 'rgba(244,236,220,.6)' }}>
                  {drawn.text}{' '}
                  {result.id && <button type="button" className="pr-link" onClick={() => highlight(result.id)} style={{ ...textBtn, padding: 0, color: GOLD }}>{t('Try again')}</button>}
                </span>
              ) : drawn.state === 'unsaved' ? (
                <span style={{ fontSize: 12.5, lineHeight: 1.5, color: 'rgba(244,236,220,.6)' }}>{t("This reading couldn't be saved, so its lines can't be drawn.")}</span>
              ) : drawn.state === 'none' ? (
                <button type="button" className="pr-outline" onClick={() => highlight(result.id)} style={outline}>{t('Draw the lines')}</button>
              ) : (
                <span style={{ fontSize: 12.5, lineHeight: 1.5, color: 'rgba(244,236,220,.5)' }}>{t('An AI illustration: the lines are drawn over your photo by eye and may not follow every crease exactly.')}</span>
              )}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
            {idle && mode === 'choose' ? <span /> : <button type="button" className="pr-link" onClick={pickFile} disabled={analyzing} style={textBtn}>{t('Upload photo')}</button>}
            {idle && camOn && (
              <button type="button" className="pr-shutter" onClick={shoot} aria-label={t('Take photo')} style={{ width: 66, height: 66, borderRadius: '50%', border: '1px solid rgba(244,236,220,.7)', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, flex: '0 0 auto' }}>
                <span style={{ width: 50, height: 50, borderRadius: '50%', background: CREAM, display: 'block', transition: 'transform .15s ease' }} />
              </button>
            )}
            {!idle && !analyzing && <button type="button" className="pr-outline" onClick={retake} style={{ ...outline, alignSelf: 'center' }}>{t('Retake')}</button>}
            <span style={mono(9.5, { letterSpacing: '.12em', color: 'rgba(244,236,220,.38)', textAlign: 'right' })}>{lightNote}</span>
          </div>
          </>)}
          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} aria-label={t('Choose a photo of your palm')} style={{ display: 'none' }} />
        </section>

        <section aria-live="polite" style={{ gridArea: 'report', display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0, ...rise(.25) }}>
          {choosing ? readings : <span style={label('rgba(244,236,220,.45)')}>{t('Report')}</span>}

          {idle && (
            <>
              <p style={{ margin: 0, fontFamily: SERIF, fontStyle: 'italic', fontSize: 19, lineHeight: 1.45, color: 'rgba(244,236,220,.8)', textWrap: 'pretty' }}>
                {hand === 'left'
                  ? t('Hold your left hand open, palm to the camera, fingers a little apart. Daylight is best — the lines should cast faint shadows.')
                  : t('Hold your right hand open, palm to the camera, fingers a little apart. Daylight is best — the lines should cast faint shadows.')}
              </p>
            </>
          )}

          {analyzing && (
            <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' }}>
              {STEPS.map((s, i) => (
                <li key={s} aria-current={i === step ? 'step' : undefined} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderTop: '1px solid rgba(244,236,220,.13)', opacity: i <= step ? 1 : .35, transition: 'opacity .4s ease' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', flex: '0 0 auto', background: i < step ? GOLD : i === step ? BRIGHT : 'rgba(244,236,220,.3)', boxShadow: i === step ? '0 0 10px rgba(227,182,75,.9)' : 'none' }} />
                  <span style={{ fontFamily: SERIF, fontSize: 20 }}>{t(s)}</span>
                </li>
              ))}
            </ol>
          )}

          {failed && error && (
            <>
              <p role="alert" style={{ margin: 0, fontFamily: SERIF, fontStyle: 'italic', fontSize: 19, lineHeight: 1.45, color: 'rgba(244,236,220,.85)', textWrap: 'pretty' }}>{error.text}</p>
              {error.tips && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '14px 16px', borderLeft: `2px solid ${GOLD}`, background: 'rgba(180,147,63,.08)' }}>
                  <span style={label(GOLD)}>{t('For a clear reading')}</span>
                  <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14, lineHeight: 1.5, color: 'rgba(244,236,220,.82)' }}>
                    {TIPS.map(tip => <li key={tip}>{t(tip)}</li>)}
                  </ul>
                </div>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 18px' }}>
                <button type="button" className="pr-outline" onClick={error.who ? changePerson : error.retry && last.current ? retry : retake} style={outline}>{error.who ? t('Change person') : error.tips ? t('Retake photo') : t('Try again')}</button>
                <button type="button" className="pr-link" onClick={pickFile} style={textBtn}>{t('Upload another')}</button>
                {error.anyway && last.current && <button type="button" className="pr-link" onClick={() => submit(last.current.shot, last.current.hand, true)} style={textBtn}>{t('Use it anyway')}</button>}
              </div>
            </>
          )}

          {report && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={mono(9.5, { color: 'rgba(244,236,220,.5)' })}>{[subjectName, handLabel(result.hand || hand), shortDate(result.createdAt)].filter(Boolean).join(' · ')}</span>
                <h2 style={{ margin: 0, fontFamily: SERIF, fontWeight: 400, fontSize: 34, lineHeight: 1.05, letterSpacing: '-.01em', textWrap: 'balance' }}>{report.title}</h2>
                <p style={{ margin: 0, fontFamily: SERIF, fontStyle: 'italic', fontSize: 20, lineHeight: 1.4, color: 'rgba(244,236,220,.85)', textWrap: 'pretty' }}>{report.summary}</p>
              </div>

              {report.hand && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 18, borderTop: '1px solid rgba(180,147,63,.6)' }}>
                  <span style={label(GOLD)}>{report.hand.element && report.hand.element !== 'Unknown' ? t('Hand shape · {element}', { element: t(report.hand.element) }) : t('Hand shape')}</span>
                  <span style={{ fontFamily: SERIF, fontSize: 22, lineHeight: 1.1 }}>{report.hand.type}</span>
                  {tag(null, report.hand.confidence) && <span style={mono(9, { letterSpacing: '.1em', color: 'rgba(244,236,220,.45)' })}>{tag(null, report.hand.confidence)}</span>}
                  {report.hand.observation && <p style={{ ...body, fontSize: 13.5, color: 'rgba(244,236,220,.6)' }}>{report.hand.observation}</p>}
                  <p style={body}>{report.hand.interpretation}</p>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ ...label('rgba(244,236,220,.45)'), padding: '18px 0 4px' }}>{t('The lines')}</span>
                {(report.lines || []).map((l, i) => {
                  const unseen = l.visibility === 'not_visible';
                  const pct = unseen ? 0 : Math.max(4, Math.min(100, +l.strength || 0));
                  const known = LINES.find(([k]) => k === l.key);
                  return (
                    <article key={l.key || i} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '18px 0', borderTop: '1px solid rgba(244,236,220,.13)', animation: 'om-rise .4s cubic-bezier(.3,0,.2,1) both' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
                        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.08em', color: GOLD, width: 18, flex: '0 0 auto' }}>{RANKS[i]}</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 0 }}>
                          <span style={{ fontFamily: SERIF, fontSize: 21, lineHeight: 1.1 }}>{known ? t(known[1]) : l.name}</span>
                          {l.quality && <span style={mono(9.5, { letterSpacing: '.1em', color: 'rgba(244,236,220,.5)' })}>{l.quality}</span>}
                          <span style={mono(9, { letterSpacing: '.1em', color: unseen ? 'rgba(244,236,220,.35)' : 'rgba(180,147,63,.85)' })}>{tag(l.visibility, l.confidence)}</span>
                        </div>
                        <span style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(244,236,220,.55)' }}>{unseen ? '—' : `${pct}%`}</span>
                      </div>
                      <span style={{ display: 'block', height: 2, background: 'rgba(244,236,220,.14)', position: 'relative', marginLeft: 32 }}><span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: GOLD, display: 'block', transition: 'width .6s cubic-bezier(.3,0,.2,1)' }} /></span>
                      {l.observation && <p style={{ ...body, marginLeft: 32, fontSize: 13.5, color: 'rgba(244,236,220,.6)' }}>{l.observation}</p>}
                      <p style={{ ...body, marginLeft: 32 }}>{l.interpretation}</p>
                    </article>
                  );
                })}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 18, borderTop: '1px solid rgba(244,236,220,.13)' }}>
                <span style={label('rgba(244,236,220,.45)')}>{t('The mounts')}</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px' }}>
                  {(report.mounts || []).map(m => {
                    const [word, color] = PROMINENCE[m.prominence] || [m.prominence, 'rgba(244,236,220,.7)'];
                    return (
                      <span key={m.name} title={m.interpretation} style={{ display: 'flex', alignItems: 'baseline', gap: 8, cursor: 'help', opacity: m.prominence === 'not_visible' ? .6 : 1 }}>
                        <span style={{ fontFamily: SERIF, fontSize: 19 }}>{mountName(m.name)}</span>
                        <span style={mono(9.5, { letterSpacing: '.1em', color })}>{t(word)}</span>
                      </span>
                    );
                  })}
                </div>
                <p style={body}>{report.mountsText}</p>
              </div>

              {report.overall && (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ ...label('rgba(244,236,220,.45)'), padding: '18px 0 4px' }}>{t('Overall reading')}</span>
                  {OVERALL.filter(([k]) => report.overall[k]).map(([k, name]) => (
                    <article key={k} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '18px 0', borderTop: '1px solid rgba(244,236,220,.13)', animation: 'om-rise .4s cubic-bezier(.3,0,.2,1) both' }}>
                      <span style={{ fontFamily: SERIF, fontSize: 21, lineHeight: 1.1 }}>{t(name)}</span>
                      <p style={body}>{report.overall[k]}</p>
                    </article>
                  ))}
                </div>
              )}

              {report.advice && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 18, borderTop: '1px solid rgba(180,147,63,.6)' }}>
                  <span style={label(GOLD)}>{t('Carry this')}</span>
                  <p style={{ margin: 0, fontFamily: SERIF, fontSize: 22, lineHeight: 1.3, textWrap: 'pretty' }}>{report.advice}</p>
                </div>
              )}

              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 18px', paddingTop: 6 }}>
                <button type="button" className="pr-outline" onClick={() => { setHand(otherHand); retake(); }} style={outline}>{otherHand === 'left' ? t('Read the left hand') : t('Read the right hand')}</button>
                {result.subject && result.subject.kind === 'profile' && <Link to="/natal-chart" style={mono(9.5, { color: 'rgba(244,236,220,.6)', borderBottom: 'none' })}>{t('Compare with your chart →')}</Link>}
              </div>
              <p style={{ margin: 0, fontFamily: MONO, fontSize: 9.5, letterSpacing: '.1em', lineHeight: 1.7, color: 'rgba(244,236,220,.38)' }}>{t('For reflection, not diagnosis. Lines change as hands do.')}</p>
              {readings}
            </>
          )}
        </section>

        <span style={{ gridArea: 'foot', ...mono(9.5, { color: 'rgba(244,236,220,.35)', lineHeight: 1.8 }) }}>{t('Your readings and palm photos are saved privately to your account. Delete them any time.')}</span>
      </main>
    </div>
  );
}
