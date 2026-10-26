import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Starfield from '../components/Starfield.jsx';
import NavMenu from '../components/NavMenu.jsx';
import CelestialScan, { RevealRing } from '../components/CelestialScan.jsx';
import { deletePalmReading, getPalmReading, highlightReading, listPalmReadings, listProfiles, palmReadingPdf, readPalm } from '../lib/api.js';
import { avatarImage } from '../lib/assets.js';
import { money, forgetStatus, getCatalog, getStatus, readingsLeft, useSales } from '../lib/billing.js';
import { readActive } from '../lib/active-profile.js';
import { getLang, locale, t } from '../i18n/index.js';

const MONO = "'IBM Plex Mono',monospace";
const SERIF = "'Cormorant Garamond',Georgia,serif";
const INK = '#1C2538', CREAM = '#F4ECDC', GOLD = '#B4933F', BRIGHT = '#E3B64B';
const mono = (size, extra) => ({ fontFamily: MONO, fontSize: size, letterSpacing: '.14em', textTransform: 'uppercase', ...extra });
const rise = delay => ({ animation: `om-rise .6s cubic-bezier(.3,0,.2,1) ${delay}s both` });
// small uppercase labels, big enough to read
const small = color => mono(11, { letterSpacing: '.12em', lineHeight: 1.4, ...(color && { color }) });
const outline = { alignSelf: 'flex-start', background: 'transparent', border: '1px solid rgba(244,236,220,.5)', padding: '12px 18px', cursor: 'pointer', ...small(CREAM) };
const primary = { background: BRIGHT, border: `1px solid ${BRIGHT}`, color: INK, padding: '12px 20px', cursor: 'pointer', ...small(INK), fontWeight: 500 };
const textBtn = { alignSelf: 'flex-start', background: 'transparent', border: 'none', padding: '8px 0', cursor: 'pointer', ...small('rgba(244,236,220,.7)') };
const body = { margin: 0, fontSize: 15.5, lineHeight: 1.65, color: 'rgba(244,236,220,.86)', textWrap: 'pretty' };
const h2 = { margin: 0, fontFamily: SERIF, fontWeight: 400, fontSize: 28, lineHeight: 1.15, textWrap: 'balance' };
const section = { display: 'flex', flexDirection: 'column', gap: 14 };
const card = { display: 'flex', flexDirection: 'column', gap: 10, padding: '18px 20px', border: '1px solid rgba(244,236,220,.14)', background: 'rgba(18,26,43,.55)' };
const field = { width: '100%', border: 'none', borderBottom: '1px solid rgba(244,236,220,.35)', background: 'transparent', color: CREAM, padding: '6px 0', fontFamily: SERIF, fontSize: 20, borderRadius: 0, colorScheme: 'dark' };

const STEPS = ['Finding the palm', 'Tracing heart, head and life lines', 'Reading the fate line and mounts', 'Writing your report'];
// ponytail: profiles carry no dominant hand yet; read it from the profile once it does
const DOMINANT = 'right';
const MAX_SIDE = 1600;
// same values as the server (GENDERS in models/User)
const GENDERS = [['female', 'Female'], ['male', 'Male']];
// colours match the ones the image model is asked to draw (server: PalmImageService)
const LINES = [['heart', 'Heart line', '#E5484D'], ['head', 'Head line', '#3E8BFF'], ['life', 'Life line', '#3DBE6B'], ['fate', 'Fate line', '#E3B64B']];
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
  if (e.code === 'hand_already_read') return { text: t('This hand has already been read. Open the saved reading, or delete it to read this hand again.'), retry: false, open: e.errors && e.errors[0] && e.errors[0].readingId };
  if (e.code === 'palm_credits_exhausted') return { text: e.message || t("You've used your palm readings for this period."), buy: true };
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
  const sales = useSales(); // false: payments are off and readings are unlimited
  const [credits, setCredits] = useState(null); // { plan, topup, total } readings left
  const [billing, setBilling] = useState(null); // { status, catalog }: for the packs and the renewal note
  const [saving, setSaving] = useState(''); // the PDF: '' | 'busy' | what went wrong
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
    Promise.all([getStatus(), getCatalog()]).then(([st, cat]) => {
      if (dead.current) return;
      setBilling({ status: st, catalog: cat });
      if (st.palm) setCredits(st.palm);
    }).catch(() => {});
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
    if (readFor(who, h)) { setStage('idle'); return; }
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
      if (res.credits) { setCredits(res.credits); forgetStatus(); }
      if (res.saved && res.id) {
        const images = res.images || {};
        setHistory(hs => ({ ...hs, items: [{ id: res.id, subject: res.subject, hand: res.hand, title: res.report.title, createdAt: res.createdAt, thumb: images.original }, ...hs.items] }));
        highlight(res.id);
      } else setDrawn({ state: 'unsaved', url: null });
    } catch (e) {
      if (dead.current || denied(e)) return;
      if (e.code === 'palm_credits_exhausted') setCredits({ plan: 0, topup: 0, total: 0 });
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
    if (mode === 'camera' && !out) openCamera();
  };
  const retry = () => { if (last.current) submit(last.current.shot, last.current.hand, true); }; // a resend: the photo was already accepted
  const changePerson = () => {
    camOff(); run.current += 1;
    setStage('who'); setMode('choose'); setPhoto(null); setResult(null); setError(null); setDrawn({ state: 'none', url: null });
  };

  /* A hand is read once per person: the saved reading is opened instead of
     paying for the same hand again (delete it to read that hand afresh).
     ponytail: checks the readings loaded so far (newest 20 + "load more"); the server checks them all */
  const sameSubject = (r, w) => r.subject && w && (w.profileId
    ? (r.subject.profile ? r.subject.profile === w.profileId : r.subject.kind === 'profile' && r.subject.name === w.name)
    : r.subject.kind !== 'profile' && (r.subject.name || '').trim().toLowerCase() === (w.name || '').trim().toLowerCase());
  const readFor = (w, h) => history.items.find(r => r.hand === h && sameSubject(r, w));

  const chosen = profiles && pick !== 'other' ? profiles.find(p => p._id === pick) : null;
  const ready = chosen || (pick === 'other' && other.name.trim() && validAge(other.age.trim()));
  const proceed = () => {
    if (!ready) return;
    const w = chosen ? { profileId: chosen._id, name: fullName(chosen) } : { name: other.name.trim(), gender: other.gender, age: other.age.trim() };
    setWho(w);
    // start on a hand that has not been read yet
    if (readFor(w, hand)) { const o = hand === 'right' ? 'left' : 'right'; if (!readFor(w, o)) setHand(o); }
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
  // nothing left to read with: no photo is taken until more are bought or the plan renews
  const metered = sales === true && credits;
  const out = metered && credits.total <= 0;
  const already = !report && who ? readFor(who, hand) : null; // this hand is read: open it instead
  const otherRead = who ? readFor(who, otherHand) : null;
  const camOn = camera === 'on' && mode === 'camera' && !out && !already;
  const subjectName = (result && result.subject && result.subject.name) || (who && who.name) || '';

  const download = async () => {
    if (!result || !result.id || saving === 'busy') return;
    setSaving('busy');
    try {
      const { blob, name } = await palmReadingPdf(result.id);
      const url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      if (!dead.current) setSaving('');
    } catch (e) {
      if (dead.current || denied(e)) return;
      setSaving(t("The report couldn't be downloaded. Try again in a moment."));
    }
  };

  const plan = billing && billing.status.plan;
  const tier = plan && billing.catalog.plans.find(p => p.tier === plan.tier);
  const adds = plan && plan.currentPeriodEnd && !plan.cancelAtPeriodEnd && tier && tier.palm;
  const shop = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, animation: 'om-fade .4s ease both' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8 }}>
        {((billing && billing.catalog.palmPacks) || []).map(p => (
          <Link key={p.id} to={`/checkout?item=palm&pack=${p.id}&qty=1&next=/palm-reading`} className="pr-outline"
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '14px 6px 12px', border: '1px solid rgba(180,147,63,.45)', background: 'rgba(180,147,63,.06)', color: CREAM, textAlign: 'center' }}>
            <span style={{ fontFamily: SERIF, fontSize: 30, lineHeight: 1 }}>+{p.readings}</span>
            <span style={small('rgba(244,236,220,.6)')}>{t('readings')}</span>
            <span style={{ fontFamily: MONO, fontSize: 13, color: BRIGHT, marginTop: 4 }}>{money(p.amount)}</span>
          </Link>
        ))}
      </div>
      {adds && <span style={{ ...body, fontSize: 14, color: 'rgba(244,236,220,.65)' }}>{t(tier.palm === 1 ? 'Your plan adds one more on {date}.' : 'Your plan adds {n} more on {date}.', { n: tier.palm, date: new Date(plan.currentPeriodEnd).toLocaleDateString(locale(), { day: 'numeric', month: 'short' }) })}</span>}
    </div>
  );

  // where the visitor is: 1 whose palm, 2 the photo, 3 the reading
  const at = choosing ? 0 : report ? 2 : 1;
  const stepper = (
    <ol aria-label={t('Progress')} style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {['Whose palm', 'Add a photo', 'Your reading'].map((s, i) => (
        <li key={s} aria-current={i === at ? 'step' : undefined} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px 7px 8px', border: `1px solid ${i === at ? GOLD : 'rgba(244,236,220,.18)'}`, background: i === at ? 'rgba(180,147,63,.12)' : 'transparent', opacity: i > at ? .5 : 1 }}>
          <span style={{ width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: i < at ? GOLD : 'transparent', border: `1px solid ${i <= at ? GOLD : 'rgba(244,236,220,.35)'}`, color: i < at ? INK : CREAM, fontFamily: MONO, fontSize: 10.5 }}>{i < at ? '✓' : i + 1}</span>
          <span style={small(i === at ? CREAM : 'rgba(244,236,220,.7)')}>{t(s)}</span>
        </li>
      ))}
    </ol>
  );

  const frame = (
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
      {report && drawn.state === 'drawing' && <Status text={t('Drawing your lines…')} />}
      {idle && camOn && (
        <>
          <div className="pr-breathe" style={{ position: 'absolute', inset: '9% 12%', border: '1px dashed rgba(244,236,220,.45)', borderRadius: '46% 46% 36% 36% / 30% 30% 26% 26%', pointerEvents: 'none', animation: 'om-breathe 4s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: '7%', display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
            <span style={{ padding: '8px 12px', background: 'rgba(28,37,56,.78)', border: '1px solid rgba(244,236,220,.25)', ...small('rgba(244,236,220,.9)') }}>{t('Palm flat · fingers apart · fill the frame')}</span>
          </div>
        </>
      )}
      {analyzing && (<><CelestialScan mode="read" /><Status text={`${t(STEPS[step])}…`} /></>)}
      {idle && out && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
          <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 22, lineHeight: 1.4, color: 'rgba(244,236,220,.85)', textWrap: 'balance' }}>{t("You've used your palm readings for this period.")}</span>
        </div>
      )}
      {idle && already && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 28, textAlign: 'center', background: already.thumb ? `linear-gradient(rgba(18,26,43,.82),rgba(18,26,43,.9)), url("${already.thumb}") center / cover` : 'transparent' }}>
          <span style={small(BRIGHT)}>✓ {t('Already read')} · {shortDate(already.createdAt)}</span>
          <span style={{ fontFamily: SERIF, fontSize: 24, lineHeight: 1.3, textWrap: 'balance' }}>{hand === 'left' ? t("{name}'s left hand is already read.", { name: who.name }) : t("{name}'s right hand is already read.", { name: who.name })}</span>
          <span style={{ ...body, fontSize: 14.5, color: 'rgba(244,236,220,.75)', marginBottom: 6 }}>{t('Each hand is read once. To read it again, delete the saved reading first.')}</span>
          <button type="button" className="pr-primary" onClick={() => open(already.id)} disabled={!!busy} style={{ ...primary, minWidth: 220 }}>{busy === already.id ? t('Opening…') : t('Open this reading')}</button>
          {!otherRead && <button type="button" className="pr-outline" onClick={() => setHand(otherHand)} style={{ ...outline, alignSelf: 'center', minWidth: 220 }}>{otherHand === 'left' ? t('Read the left hand instead') : t('Read the right hand instead')}</button>}
        </div>
      )}
      {idle && !out && !already && mode === 'choose' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, textAlign: 'center' }}>
          <span aria-hidden="true" style={{ fontSize: 40, lineHeight: 1, marginBottom: 4 }}>✋</span>
          <span style={{ fontFamily: SERIF, fontSize: 24, lineHeight: 1.3, textWrap: 'balance', marginBottom: 8 }}>{t('How would you like to add the photo?')}</span>
          <button type="button" className="pr-primary" onClick={takePhoto} style={{ ...primary, minWidth: 220 }}>{t('Take a photo')}</button>
          <button type="button" className="pr-outline" onClick={pickFile} style={{ ...outline, alignSelf: 'center', minWidth: 220 }}>{t('Choose from gallery')}</button>
        </div>
      )}
      {idle && !out && !already && mode === 'camera' && camera === 'none' && (
        <button type="button" onClick={pickFile} style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, textAlign: 'center', background: 'transparent', border: 'none', color: CREAM, cursor: 'pointer' }}>
          <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 22, lineHeight: 1.4, color: 'rgba(244,236,220,.85)', textWrap: 'balance' }}>{t('No camera here — or permission was declined.')}</span>
          <span style={small(GOLD)}>{t('Upload a photo instead')}</span>
        </button>
      )}
      {[['left', 'top'], ['right', 'top'], ['left', 'bottom'], ['right', 'bottom']].map(([x, y]) => (
        <div key={x + y} style={{ position: 'absolute', [x]: 10, [y]: 10, width: 18, height: 18, [`border${x[0].toUpperCase() + x.slice(1)}`]: '1px solid rgba(244,236,220,.6)', [`border${y[0].toUpperCase() + y.slice(1)}`]: '1px solid rgba(244,236,220,.6)', pointerEvents: 'none' }} />
      ))}
    </div>
  );

  /* ---------------------------------------------------- step 1: whose palm */
  const whoCard = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <h2 style={h2}>{t('Whose palm are we reading?')}</h2>
      <p style={{ ...body, color: 'rgba(244,236,220,.7)' }}>{t('Choose one of your profiles, or read the palm of someone else.')}</p>
      <div role="radiogroup" aria-label={t('Whose palm?')} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(profiles || []).map(p => {
          const on = pick === p._id;
          return (
            <button key={p._id} type="button" role="radio" aria-checked={on} className="pr-pick" onClick={() => setPick(p._id)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: on ? 'rgba(180,147,63,.12)' : 'transparent', border: `1px solid ${on ? GOLD : 'rgba(244,236,220,.25)'}`, color: CREAM, cursor: 'pointer', textAlign: 'left' }}>
              <Avatar p={p} />
              <span style={{ fontFamily: SERIF, fontSize: 20, lineHeight: 1.2, minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.isPrimary ? t('{name} · you', { name: fullName(p) }) : fullName(p)}</span>
              <Radio on={on} />
            </button>
          );
        })}
        <button type="button" role="radio" aria-checked={pick === 'other'} className="pr-pick" onClick={() => setPick('other')}
          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: pick === 'other' ? 'rgba(180,147,63,.12)' : 'transparent', border: `1px solid ${pick === 'other' ? GOLD : 'rgba(244,236,220,.25)'}`, color: CREAM, cursor: 'pointer', textAlign: 'left' }}>
          <span style={{ width: 30, height: 30, flex: '0 0 auto', borderRadius: '50%', border: '1px dashed rgba(244,236,220,.45)', fontFamily: SERIF, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</span>
          <span style={{ fontFamily: SERIF, fontSize: 20, lineHeight: 1.2, flex: 1 }}>{t('Someone else')}</span>
          <Radio on={pick === 'other'} />
        </button>
      </div>
      {pick === 'other' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '16px', border: '1px solid rgba(244,236,220,.15)', background: 'rgba(244,236,220,.03)', animation: 'om-fade .3s ease both' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={small('rgba(244,236,220,.65)')}>{t('Name')}</span>
            <input type="text" value={other.name} maxLength={60} autoComplete="off" onChange={e => setOther(o => ({ ...o, name: e.target.value }))} style={field} />
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '16px 28px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ ...small('rgba(244,236,220,.65)'), whiteSpace: 'nowrap' }}>{t('Gender · optional')}</span>
              <div role="radiogroup" aria-label={t('Gender · optional')} style={{ display: 'flex', border: '1px solid rgba(244,236,220,.3)' }}>
                {[...GENDERS, ['', 'Rather not say']].map(([v, name]) => {
                  const on = other.gender === v;
                  return (
                    <button key={v || 'none'} type="button" role="radio" aria-checked={on} className="pr-hand" onClick={() => setOther(o => ({ ...o, gender: v }))}
                      style={{ padding: '9px 14px', background: on ? CREAM : 'transparent', color: on ? INK : 'rgba(244,236,220,.75)', border: 'none', borderLeft: v === GENDERS[0][0] ? 'none' : '1px solid rgba(244,236,220,.18)', cursor: 'pointer', whiteSpace: 'nowrap', ...small() }}>
                      {t(name)}
                    </button>
                  );
                })}
              </div>
            </div>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, width: 110, flex: '0 0 auto' }}>
              <span style={{ ...small('rgba(244,236,220,.65)'), whiteSpace: 'nowrap' }}>{t('Age · optional')}</span>
              <input type="text" inputMode="numeric" maxLength={3} placeholder="—" value={other.age} onChange={e => setOther(o => ({ ...o, age: e.target.value.replace(/\D/g, '') }))} aria-invalid={!validAge(other.age.trim())} style={field} />
            </label>
          </div>
          {!validAge(other.age.trim()) && <span role="alert" style={small(BRIGHT)}>{t('Age is a whole number from 1 to 120.')}</span>}
        </div>
      )}
      <button type="button" className="pr-primary" onClick={proceed} disabled={!ready} style={{ ...primary, alignSelf: 'flex-start', marginTop: 4, opacity: ready ? 1 : .45, cursor: ready ? 'pointer' : 'default' }}>{t('Continue')} →</button>
    </div>
  );

  /* ---------------------------------------------------- step 2: the photo */
  const photoCard = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: SERIF, fontSize: 20 }}>{t('Reading for {name}', { name: subjectName })}</span>
        {!analyzing && <button type="button" className="pr-link" onClick={changePerson} style={{ ...textBtn, padding: 0, color: BRIGHT }}>{t('Change person')}</button>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={small('rgba(244,236,220,.65)')}>{t('Which hand?')}</span>
        <div role="group" aria-label={t('Which hand')} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1px solid rgba(244,236,220,.3)' }}>
          {['left', 'right'].map(h => {
            const on = h === hand, name = h === 'left' ? t('Left') : t('Right');
            return (
              <button key={h} type="button" className="pr-hand" aria-pressed={on} disabled={analyzing} onClick={() => setHand(h)}
                style={{ padding: '10px 12px', background: on ? CREAM : 'transparent', color: on ? INK : 'rgba(244,236,220,.75)', border: 'none', cursor: analyzing ? 'default' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <span style={small()}>{h === dom ? t('{hand} · dominant', { hand: name }) : name}</span>
                <span style={{ fontSize: 12.5, opacity: .75 }}>{readFor(who, h) ? `✓ ${t('Already read')}` : h === dom ? t('What you make of your life') : t('What you were given')}</span>
              </button>
            );
          })}
        </div>
      </div>
      {frame}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, minHeight: 40 }}>
        {(idle && mode === 'choose') || out || already ? <span /> : <button type="button" className="pr-link" onClick={pickFile} disabled={analyzing} style={textBtn}>{t('Upload photo')}</button>}
        {idle && camOn && (
          <button type="button" className="pr-shutter" onClick={shoot} aria-label={t('Take photo')} style={{ width: 66, height: 66, borderRadius: '50%', border: '1px solid rgba(244,236,220,.7)', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, flex: '0 0 auto' }}>
            <span style={{ width: 50, height: 50, borderRadius: '50%', background: CREAM, display: 'block', transition: 'transform .15s ease' }} />
          </button>
        )}
        {failed && <button type="button" className="pr-outline" onClick={retake} style={{ ...outline, alignSelf: 'center' }}>{t('Retake')}</button>}
        {metered && !out ? (
          <span style={{ ...small('rgba(244,236,220,.6)'), textAlign: 'right' }}>
            {readingsLeft(credits.total)}
            {credits.total <= 1 && <> · <Link to="/billing" className="pr-link" style={{ color: BRIGHT, borderBottom: 'none' }}>{t('get more →')}</Link></>}
          </span>
        ) : <span />}
      </div>
    </div>
  );

  const tips = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '18px 20px', borderLeft: `2px solid ${GOLD}`, background: 'rgba(180,147,63,.08)' }}>
      <span style={small(BRIGHT)}>{t('For a clear reading')}</span>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {TIPS.map(tip => <li key={tip} style={{ display: 'flex', gap: 10, ...body, fontSize: 14.5 }}><span aria-hidden="true" style={{ color: BRIGHT }}>✓</span><span>{t(tip)}</span></li>)}
      </ul>
    </div>
  );

  // the column beside the photo: what to do now
  const guide = (
    <div aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
      {idle && out && (<><h2 style={h2}>{t('Pick a pack to keep reading.')}</h2>{shop}</>)}
      {idle && !out && (
        <>
          <h2 style={h2}>{t('Photograph your open palm')}</h2>
          <p style={{ ...body, fontSize: 16 }}>
            {hand === 'left'
              ? t('Hold your left hand open, palm to the camera, fingers a little apart. Daylight is best — the lines should cast faint shadows.')
              : t('Hold your right hand open, palm to the camera, fingers a little apart. Daylight is best — the lines should cast faint shadows.')}
          </p>
          {tips}
          <p style={{ ...body, fontSize: 14, color: 'rgba(244,236,220,.6)' }}>{t('Your report takes about half a minute. Photos that are too dark, blurry or not a palm are turned away free of charge.')}</p>
        </>
      )}
      {analyzing && (
        <>
          <h2 style={h2}>{t('Reading your palm…')}</h2>
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' }}>
            {STEPS.map((s, i) => (
              <li key={s} aria-current={i === step ? 'step' : undefined} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderTop: '1px solid rgba(244,236,220,.13)', opacity: i <= step ? 1 : .35, transition: 'opacity .4s ease' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', flex: '0 0 auto', background: i < step ? GOLD : i === step ? BRIGHT : 'rgba(244,236,220,.3)', boxShadow: i === step ? '0 0 10px rgba(227,182,75,.9)' : 'none' }} />
                <span style={{ fontFamily: SERIF, fontSize: 21 }}>{t(s)}</span>
              </li>
            ))}
          </ol>
        </>
      )}
      {failed && error && (
        <>
          <h2 style={h2}>{error.buy ? t('Pick a pack to keep reading.') : t('Let’s try that again')}</h2>
          <p role="alert" style={{ margin: 0, fontFamily: SERIF, fontStyle: 'italic', fontSize: 20, lineHeight: 1.45, color: 'rgba(244,236,220,.9)', textWrap: 'pretty' }}>{error.text}</p>
          {error.buy && shop}
          {error.tips && tips}
          {!error.buy && (
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 18px' }}>
              {error.open && <button type="button" className="pr-primary" onClick={() => open(error.open)} style={primary}>{t('Open this reading')}</button>}
              <button type="button" className={error.open ? 'pr-outline' : 'pr-primary'} onClick={error.who ? changePerson : error.retry && last.current ? retry : retake} style={error.open ? outline : primary}>{error.who ? t('Change person') : error.tips ? t('Retake photo') : t('Try again')}</button>
              <button type="button" className="pr-link" onClick={pickFile} style={textBtn}>{t('Upload another')}</button>
              {error.anyway && last.current && <button type="button" className="pr-link" onClick={() => submit(last.current.shot, last.current.hand, true)} style={textBtn}>{t('Use it anyway')}</button>}
            </div>
          )}
        </>
      )}
    </div>
  );

  /* ---------------------------------------------------- step 3: the report */
  const colorOf = key => (LINES.find(([k]) => k === key) || [])[2] || GOLD;
  const lineName = l => { const known = LINES.find(([k]) => k === l.key); return known ? t(known[1]) : l.name; };
  const strength = l => (l.visibility === 'not_visible' ? 0 : Math.max(4, Math.min(100, +l.strength || 0)));
  const reportView = report && (
    <>
      <section style={{ display: 'flex', flexDirection: 'column', gap: 16, ...rise(.05) }}>
        <button type="button" className="pr-link" onClick={changePerson} style={{ ...textBtn, padding: 0 }}>← {t('New reading')}</button>
        <span style={small('rgba(244,236,220,.6)')}>{[subjectName, handLabel(result.hand || hand), shortDate(result.createdAt)].filter(Boolean).join(' · ')}</span>
        <h1 className="pr-title" style={{ margin: 0, fontFamily: SERIF, fontWeight: 400, fontSize: 40, lineHeight: 1.05, letterSpacing: '-.01em', textWrap: 'balance', maxWidth: '22ch' }}>{report.title}</h1>
        <p style={{ margin: 0, maxWidth: '62ch', fontFamily: SERIF, fontStyle: 'italic', fontSize: 21, lineHeight: 1.45, color: 'rgba(244,236,220,.88)', textWrap: 'pretty' }}>{report.summary}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 14px', marginTop: 6 }}>
          {result.id && <button type="button" className="pr-primary" onClick={download} disabled={saving === 'busy'} style={{ ...primary, opacity: saving === 'busy' ? .6 : 1 }}>{saving === 'busy' ? t('Preparing PDF…') : `↓ ${t('Download report (PDF)')}`}</button>}
          {otherRead
            ? (otherRead.id !== result.id && <button type="button" className="pr-outline" onClick={() => open(otherRead.id)} disabled={!!busy} style={{ ...outline, alignSelf: 'center' }}>{otherHand === 'left' ? t('Open the left hand reading') : t('Open the right hand reading')}</button>)
            : <button type="button" className="pr-outline" onClick={() => { setHand(otherHand); retake(); }} style={{ ...outline, alignSelf: 'center' }}>{otherHand === 'left' ? t('Read the left hand') : t('Read the right hand')}</button>}
          {result.subject && result.subject.kind === 'profile' && <Link to="/natal-chart" className="pr-link" style={{ ...small('rgba(244,236,220,.7)'), borderBottom: 'none' }}>{t('Compare with your chart →')}</Link>}
        </div>
        {saving && saving !== 'busy' && <span role="alert" style={{ ...body, fontSize: 14, color: BRIGHT }}>{saving}</span>}
      </section>

      <div className="pr-report" style={{ display: 'grid', gap: 40, ...rise(.15) }}>
        <aside className="pr-aside" style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          {frame}
          {(drawn.state !== 'none' || result.id) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {drawn.state === 'done' && (
                <div role="group" aria-label={t('Photo view')} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1px solid rgba(244,236,220,.3)' }}>
                  {[['lines', t('Lines')], ['photo', t('Photo')]].map(([v, name]) => (
                    <button key={v} type="button" className="pr-hand" aria-pressed={view === v} onClick={() => setView(v)}
                      style={{ padding: '8px 11px', background: view === v ? CREAM : 'transparent', color: view === v ? INK : 'rgba(244,236,220,.75)', border: 'none', cursor: 'pointer', ...small() }}>{name}</button>
                  ))}
                </div>
              )}
              {drawn.state === 'failed' ? (
                <span style={{ ...body, fontSize: 13.5, color: 'rgba(244,236,220,.65)' }}>
                  {drawn.text}{' '}
                  {result.id && <button type="button" className="pr-link" onClick={() => highlight(result.id)} style={{ ...textBtn, padding: 0, color: BRIGHT }}>{t('Try again')}</button>}
                </span>
              ) : drawn.state === 'unsaved' ? (
                <span style={{ ...body, fontSize: 13.5, color: 'rgba(244,236,220,.65)' }}>{t("This reading couldn't be saved, so its lines can't be drawn.")}</span>
              ) : drawn.state === 'none' ? (
                <button type="button" className="pr-outline" onClick={() => highlight(result.id)} style={outline}>{t('Draw the lines')}</button>
              ) : (
                <span style={{ ...body, fontSize: 13, color: 'rgba(244,236,220,.55)' }}>{t('An AI illustration: the lines are drawn over your photo by eye and may not follow every crease exactly.')}</span>
              )}
            </div>
          )}
          {(report.lines || []).length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 18px', border: '1px solid rgba(244,236,220,.15)', background: 'rgba(18,26,43,.6)' }}>
              <span style={small(BRIGHT)}>{t('At a glance')}</span>
              {(report.lines || []).map(l => (
                <a key={l.key} href={`#line-${l.key}`} className="pr-link" style={{ display: 'flex', flexDirection: 'column', gap: 6, color: CREAM, borderBottom: 'none' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: colorOf(l.key), boxShadow: `0 0 6px ${colorOf(l.key)}`, opacity: l.visibility === 'not_visible' ? .35 : 1 }} />
                    <span style={{ fontSize: 15, flex: 1 }}>{lineName(l)}</span>
                    <span style={{ fontFamily: MONO, fontSize: 12, color: 'rgba(244,236,220,.65)' }}>{l.visibility === 'not_visible' ? t('not visible') : `${strength(l)}%`}</span>
                  </span>
                  <span style={{ display: 'block', height: 3, background: 'rgba(244,236,220,.12)', position: 'relative' }}><span style={{ position: 'absolute', inset: 0, right: 'auto', width: `${strength(l)}%`, background: colorOf(l.key), display: 'block' }} /></span>
                </a>
              ))}
              <span style={{ fontSize: 12.5, lineHeight: 1.5, color: 'rgba(244,236,220,.5)' }}>{t('The percentage is how strong and well defined each line looks in the photo.')}</span>
            </div>
          )}
        </aside>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 44, minWidth: 0 }}>
          {report.hand && (
            <section style={section}>
              <Heading n="01" title={t('Hand shape')} />
              <div style={card}>
                <span style={small(BRIGHT)}>{report.hand.element && report.hand.element !== 'Unknown' ? t('Hand shape · {element}', { element: t(report.hand.element) }) : t('Hand shape')}</span>
                <span style={{ fontFamily: SERIF, fontSize: 26, lineHeight: 1.15 }}>{report.hand.type}</span>
                {tag(null, report.hand.confidence) && <span style={small('rgba(244,236,220,.5)')}>{tag(null, report.hand.confidence)}</span>}
                {report.hand.observation && <p style={{ ...body, fontSize: 14.5, color: 'rgba(244,236,220,.65)' }}>{report.hand.observation}</p>}
                <p style={body}>{report.hand.interpretation}</p>
              </div>
            </section>
          )}

          <section style={section}>
            <Heading n="02" title={t('The lines')} />
            {(report.lines || []).map((l, i) => {
              const unseen = l.visibility === 'not_visible', c = colorOf(l.key);
              return (
                <article key={l.key || i} id={`line-${l.key}`} style={{ ...card, borderLeft: `3px solid ${unseen ? 'rgba(244,236,220,.2)' : c}`, scrollMarginTop: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: SERIF, fontSize: 25, lineHeight: 1.1 }}>{lineName(l)}</span>
                    <span style={{ fontFamily: MONO, fontSize: 13, color: unseen ? 'rgba(244,236,220,.45)' : c }}>{unseen ? t('Not visible') : `${strength(l)}%`}</span>
                  </div>
                  <span style={small('rgba(244,236,220,.55)')}>{[l.quality, tag(l.visibility, l.confidence)].filter(Boolean).join(' · ')}</span>
                  {!unseen && <span style={{ display: 'block', height: 3, background: 'rgba(244,236,220,.12)', position: 'relative' }}><span style={{ position: 'absolute', inset: 0, right: 'auto', width: `${strength(l)}%`, background: c, display: 'block', transition: 'width .6s cubic-bezier(.3,0,.2,1)' }} /></span>}
                  {l.observation && <p style={{ ...body, fontSize: 14.5, color: 'rgba(244,236,220,.65)' }}><span style={small('rgba(244,236,220,.5)')}>{t('Seen')}</span>{' — '}{l.observation}</p>}
                  <p style={body}>{l.interpretation}</p>
                </article>
              );
            })}
          </section>

          {(report.mounts || []).length > 0 && (
            <section style={section}>
              <Heading n="03" title={t('The mounts')} />
              <p style={{ ...body, color: 'rgba(244,236,220,.7)' }}>{t('The fleshy pads at the base of the fingers and thumb. A raised mount is read as a strong theme in your life.')}</p>
              <div className="pr-mounts" style={{ display: 'grid', gap: 10 }}>
                {(report.mounts || []).map(m => {
                  const [word, color] = PROMINENCE[m.prominence] || [m.prominence, 'rgba(244,236,220,.7)'];
                  return (
                    <div key={m.name} style={{ ...card, gap: 6, padding: '14px 16px', opacity: m.prominence === 'not_visible' ? .6 : 1 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                        <span style={{ fontFamily: SERIF, fontSize: 21 }}>{mountName(m.name)}</span>
                        <span style={small(color)}>{t(word)}</span>
                      </div>
                      {m.interpretation && <p style={{ ...body, fontSize: 14 }}>{m.interpretation}</p>}
                    </div>
                  );
                })}
              </div>
              {report.mountsText && <p style={body}>{report.mountsText}</p>}
            </section>
          )}

          {report.overall && (
            <section style={section}>
              <Heading n="04" title={t('Overall reading')} />
              <div className="pr-overall" style={{ display: 'grid', gap: 10 }}>
                {OVERALL.filter(([k]) => report.overall[k]).map(([k, name]) => (
                  <article key={k} style={card}>
                    <span style={{ fontFamily: SERIF, fontSize: 22, lineHeight: 1.1 }}>{t(name)}</span>
                    <p style={body}>{report.overall[k]}</p>
                  </article>
                ))}
              </div>
            </section>
          )}

          {report.advice && (
            <section style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '24px 26px', border: `1px solid ${GOLD}`, background: 'rgba(180,147,63,.1)' }}>
              <span style={small(BRIGHT)}>{t('Carry this')}</span>
              <p style={{ margin: 0, fontFamily: SERIF, fontSize: 25, lineHeight: 1.35, textWrap: 'pretty' }}>{report.advice}</p>
            </section>
          )}

          <p style={{ ...small('rgba(244,236,220,.45)'), lineHeight: 1.7 }}>{t('For reflection, not diagnosis. Lines change as hands do.')}</p>
        </div>
      </div>
    </>
  );

  /* ---------------------------------------------------- past readings */
  const readings = (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 32, borderTop: '1px solid rgba(244,236,220,.15)' }}>
      <h2 style={h2}>{t('Your readings')}</h2>
      {history.state === 'failed' && !history.items.length ? (
        <p style={{ ...body, color: 'rgba(244,236,220,.6)' }}>{t("Your readings couldn't be loaded.")}</p>
      ) : history.state === 'ready' && !history.items.length ? (
        <p style={{ ...body, color: 'rgba(244,236,220,.6)' }}>{t('Your readings will appear here.')}</p>
      ) : (
        <ul className="pr-history" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
          {history.items.map(r => {
            const isOpen = report && result.id === r.id;
            return (
              <li key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, border: `1px solid ${isOpen ? GOLD : 'rgba(244,236,220,.15)'}`, background: isOpen ? 'rgba(180,147,63,.08)' : 'rgba(18,26,43,.5)', opacity: busy === r.id ? .5 : 1, minWidth: 0 }}>
                <button type="button" className="pr-link" onClick={() => open(r.id)} disabled={!!busy} aria-current={isOpen ? 'true' : undefined}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: CREAM, textAlign: 'left' }}>
                  <span style={{ width: 56, height: 56, flex: '0 0 auto', background: r.thumb ? `#121A2B url("${r.thumb}") center / cover no-repeat` : '#121A2B', border: '1px solid rgba(244,236,220,.22)' }} />
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                    <span style={{ fontFamily: SERIF, fontSize: 19, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{busy === r.id ? t('Opening…') : r.title}</span>
                    <span style={{ fontSize: 13, color: 'rgba(244,236,220,.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{[r.subject && r.subject.name, handLabel(r.hand), shortDate(r.createdAt)].filter(Boolean).join(' · ')}</span>
                  </span>
                </button>
                <button type="button" className="pr-link" onClick={() => remove(r.id)} disabled={!!busy} aria-label={t('Delete reading')} style={{ ...textBtn, alignSelf: 'center', flex: '0 0 auto' }}>{t('Delete')}</button>
              </li>
            );
          })}
        </ul>
      )}
      {histNote && <span role="alert" style={{ ...body, fontSize: 14, color: 'rgba(244,236,220,.65)' }}>{histNote}</span>}
      {history.next && history.state !== 'loading' && <button type="button" className="pr-link" onClick={loadMore} style={textBtn}>{t('Load more')}</button>}
    </section>
  );

  return (
    <div className="pr-shell" style={{ minHeight: '100vh', background: INK, color: CREAM, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}><Starfield /></div>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'linear-gradient(180deg,rgba(28,37,56,.35) 0%,rgba(28,37,56,.62) 55%,rgba(28,37,56,.82) 100%)' }} />

      <header style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '18px 24px', borderBottom: '1px solid rgba(244,236,220,.2)', maxWidth: 1200, width: '100%', margin: '0 auto' }}>
        <Link to="/" className="hdr-logo" style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 18, letterSpacing: '.14em', textTransform: 'uppercase', borderBottom: 'none' }}>AstroMeridian</Link>
        <NavMenu current="Palm Reading" />
      </header>

      <main className="pr-main" style={{ position: 'relative', width: '100%', maxWidth: 1120, margin: '0 auto', padding: '36px 20px 64px', display: 'flex', flexDirection: 'column', gap: 40 }}>
        {report ? reportView : (
          <>
            <section className="pr-hero" style={{ display: 'flex', flexDirection: 'column', gap: 16, ...rise(.05) }}>
              <span style={small(BRIGHT)}>{t('Palmistry · chiromancy')}</span>
              <h1 style={{ margin: 0, fontFamily: SERIF, fontWeight: 400, fontSize: 44, lineHeight: 1.04, letterSpacing: '-.01em', textWrap: 'balance' }}>{t('The map you were')} <em style={{ fontStyle: 'italic' }}>{t('born holding')}</em>.</h1>
              <p style={{ ...body, fontSize: 16.5, maxWidth: '58ch', color: 'rgba(244,236,220,.78)' }}>{t('Photograph your open palm in good light. AstroMeridian reads the heart, head, life and fate lines, the shape of the hand and the rise of its mounts — then writes you a report.')}</p>
              {stepper}
            </section>

            <div className="pr-flow" style={{ display: 'grid', gap: 36, ...rise(.15) }}>
              <div className="pr-cam" style={{ minWidth: 0 }}>{choosing ? whoCard : photoCard}</div>
              {choosing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <h2 style={h2}>{t('How it works')}</h2>
                  {[['1', 'Choose whose palm', 'Yourself, one of your profiles, or anyone else.'], ['2', 'Add a photo', 'Take one with your camera or pick one from your gallery.'], ['3', 'Get your reading', 'Your lines, hand shape and mounts explained, with the lines drawn on your photo. Download it as a PDF.']].map(([n, title, text]) => (
                    <div key={n} style={{ display: 'flex', gap: 16 }}>
                      <span style={{ width: 34, height: 34, flex: '0 0 auto', borderRadius: '50%', border: `1px solid ${GOLD}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SERIF, fontSize: 18, color: BRIGHT }}>{n}</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ fontFamily: SERIF, fontSize: 21 }}>{t(title)}</span>
                        <p style={{ ...body, color: 'rgba(244,236,220,.72)' }}>{t(text)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : guide}
            </div>
          </>
        )}

        {readings}
        <span style={{ ...small('rgba(244,236,220,.45)'), lineHeight: 1.8 }}>{t('Your readings and palm photos are saved privately to your account. Delete them any time.')}</span>
        <input ref={fileRef} type="file" accept="image/*" onChange={onFile} aria-label={t('Choose a photo of your palm')} style={{ display: 'none' }} />
      </main>
    </div>
  );
}

const Status = ({ text }) => (
  <div role="status" style={{ position: 'absolute', left: '50%', bottom: '8%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', border: '1px solid rgba(244,236,220,.25)', background: 'rgba(28,37,56,.8)', whiteSpace: 'nowrap', pointerEvents: 'none', animation: 'om-fade .3s ease both' }}>
    <span style={{ width: 6, height: 6, borderRadius: '50%', background: GOLD, animation: 'om-glow 1.4s ease-in-out infinite' }} />
    <span style={small('rgba(244,236,220,.9)')}>{text}</span>
  </div>
);

const Radio = ({ on }) => (
  <span aria-hidden="true" style={{ width: 16, height: 16, flex: '0 0 auto', borderRadius: '50%', border: `1px solid ${on ? GOLD : 'rgba(244,236,220,.4)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    {on && <span style={{ width: 8, height: 8, borderRadius: '50%', background: BRIGHT }} />}
  </span>
);

const Heading = ({ n, title }) => (
  <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, paddingBottom: 10, borderBottom: '1px solid rgba(180,147,63,.5)' }}>
    <span style={{ fontFamily: MONO, fontSize: 12, color: BRIGHT }}>{n}</span>
    <h2 style={{ ...h2, fontSize: 30 }}>{title}</h2>
  </div>
);
