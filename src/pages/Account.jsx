import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Starfield from '../components/Starfield.jsx';
import NavMenu, { AddProfile } from '../components/NavMenu.jsx';
import { deleteMe, getMe, listProfiles, logout, placeDetails, searchPlaces, setProfileDisabled, updateMe, updateProfile } from '../lib/api.js';
import { clearActive, readActive } from '../lib/active-profile.js';
import { EDIT_LIMITS, editsText, forgetStatus, getStatus, longDate, packName } from '../lib/billing.js';
import { checkDate, checkTime, coordText, formatDate, formatTime, MONTHS } from '../lib/date-input.js';

/* A port of Account.dc.html: who you are, your birth entry, the people you saved,
   your plan, and the way out. Every control does what it says. */

const MONO = "'IBM Plex Mono',monospace";
const SERIF = "'Cormorant Garamond',Georgia,serif";
const INK = '#F4ECDC', NAVY = '#1C2538', GOLD = '#B4933F', RED = '#C46A5A';

const CSS = `
.acc-line:hover{background:rgba(244,236,220,.1) !important;color:#F4ECDC !important;border-color:#F4ECDC !important}
.acc-remove:hover{color:#C46A5A !important}
.acc-toggle:hover{color:#F4ECDC !important}
.acc-quiet:hover{color:#F4ECDC !important}
.acc-input::placeholder{color:rgba(244,236,220,.3)}
`;

const h2 = { margin: 0, fontFamily: MONO, fontWeight: 500, fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase' };
const mono10 = { fontFamily: MONO, fontSize: 10, letterSpacing: '.06em', color: 'rgba(244,236,220,.5)' };
const quiet = { fontFamily: MONO, fontSize: 9.5, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(244,236,220,.45)', borderBottom: 'none', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' };
const rowInput = { flex: 1, minWidth: 0, border: 'none', background: 'transparent', padding: '2px 0', fontFamily: MONO, fontSize: 16, letterSpacing: '.04em', color: INK };

const dob = iso => { const [y, m, d] = iso.split('-'); return `${d} ${MONTHS[+m - 1]} ${y}`; };
const editedOn = iso => { const d = new Date(iso); return `Last edited ${d.getDate()} ${MONTHS[d.getMonth()]}`; };
const initials = (a, b) => `${(a || '').trim().charAt(0)}${(b || '').trim().charAt(0)}`.toUpperCase();


export default function Account() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [error, setError] = useState('');
  const [query, setQuery] = useSearchParams();
  // back from buying a profile slot: open the form straight away
  const [adding, setAdding] = useState(query.get('add') === '1');
  const [billing, setBilling] = useState(null);

  // identity
  const [editing, setEditing] = useState(false);
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');

  // birth entry
  const [fields, setFields] = useState(null);
  const [picked, setPicked] = useState(null);
  const [hits, setHits] = useState([]);
  const [focused, setFocused] = useState(false);
  const [state, setState] = useState('clean'); // clean | dirty | saving | saved
  const seq = useRef(0);

  // the way out
  const [switching, setSwitching] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = () => Promise.all([getMe(), listProfiles(true)]).then(([account, list]) => {
    setMe(account); setProfiles(list);
    setFirst(account.firstName); setLast(account.lastName);
    const own = list.find(p => p.isPrimary);
    if (own) {
      const [y, m, d] = own.birthDate.split('-');
      const place = [own.city, own.state, own.country].filter(Boolean).join(', ');
      setFields({ name: `${own.firstName} ${own.lastName}`, date: `${d} / ${m} / ${y}`, time: own.birthTime.replace(':', ' : '), place });
      setPicked({ description: place, city: own.city, state: own.state, country: own.country, lat: own.lat, lon: own.lon });
      setState('clean');
    }
  });

  useEffect(() => {
    load().catch(e => { if (e.status === 401) navigate('/login'); else setError(e.message); });
    forgetStatus();
    getStatus().then(setBilling).catch(() => {});
  }, [navigate]);

  /* Birthplace lookup, the same debounced search the entry form uses. */
  useEffect(() => {
    if (!fields) return;
    const q = fields.place.trim();
    if ((picked && picked.description === fields.place) || q.length < 2) { setHits([]); return; }
    const controller = new AbortController();
    const timer = setTimeout(() => searchPlaces(q, controller.signal).then(setHits).catch(e => { if (e.name !== 'AbortError') setHits([]); }), 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [fields, picked]);

  const pickPlace = async suggestion => {
    setFields(f => ({ ...f, place: suggestion.description }));
    setHits([]); setFocused(false);
    const mine = ++seq.current;
    try {
      const detail = await placeDetails(suggestion.placeId);
      if (mine === seq.current) { setPicked({ ...detail, description: suggestion.description }); setState('dirty'); }
    } catch (e) {
      if (mine === seq.current) { setPicked(null); setError(e.message); }
    }
  };

  const set = (key, value) => {
    setFields(f => ({ ...f, [key]: value }));
    if (key === 'place') setPicked(null);
    setState('dirty');
  };

  const own = profiles.find(p => p.isPrimary);
  const people = profiles.filter(p => !p.isPrimary);
  const dv = fields ? checkDate(fields.date) : { iso: null }, tv = fields ? checkTime(fields.time) : { hm: null };
  const exact = !!(picked && fields && picked.description === fields.place);
  const [firstName, ...rest] = (fields?.name ?? '').trim().split(/\s+/);
  const valid = !!(firstName && rest.length && dv.iso && tv.hm && exact);
  const dirty = state === 'dirty';
  // every save that changes the name or birth data uses one of a lifetime few
  const locked = !!own && own.editsLeft === 0;
  const slots = billing ? billing.profiles.included + billing.profiles.extra : null;

  const save = async () => {
    if (!dirty || !valid || !own || locked) return;
    setState('saving'); setError('');
    try {
      await updateProfile(own._id, { firstName, lastName: rest.join(' '), birthDate: dv.iso, birthTime: tv.hm, city: picked.city, state: picked.state, country: picked.country });
      await load();
      setState('saved');
    } catch (e) {
      setError(e.message); setState('dirty');
    }
  };

  const saveName = async () => {
    if (!first.trim() || !last.trim()) return;
    setBusy(true); setError('');
    try { setMe(await updateMe({ firstName: first.trim(), lastName: last.trim() })); setEditing(false); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  /* Off hides someone from every page and reading; their slot stays taken. */
  const switchProfile = async p => {
    setSwitching(p._id); setError('');
    try {
      const updated = await setProfileDisabled(p._id, !p.disabled);
      if (updated.disabled && readActive() === p._id) clearActive();
      setProfiles(list => list.map(x => (x._id === p._id ? updated : x)));
    } catch (e) { setError(e.message); }
    finally { setSwitching(null); }
  };

  const signOut = async () => {
    try { await logout(); } catch (e) {}
    clearActive();
    navigate('/login');
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ account: me, profiles, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'astromeridian-export.json'; a.click();
    URL.revokeObjectURL(url);
  };

  const deleteAccount = async () => {
    setBusy(true); setError('');
    try { await deleteMe(); clearActive(); navigate('/'); }
    catch (e) { setError(e.message); setBusy(false); }
  };

  const birthRows = fields ? [
    ['Full name', 'name', '', v => v],
    ['Date of birth', 'date', dv.error || '', formatDate],
    ['Time of birth', 'time', tv.error || 'Sets your rising', formatTime],
    ['Birthplace', 'place', exact ? coordText(picked.lat, picked.lon) : 'Pick from the list', v => v]
  ] : [];

  return (
    <div style={{ minHeight: '100vh', background: NAVY, color: INK, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', fontFamily: "'Instrument Sans',Helvetica,Arial,sans-serif" }}>
      <style>{CSS}</style>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}><Starfield /></div>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'rgba(28,37,56,.72)' }} />

      <header style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '18px 24px', borderBottom: '1px solid rgba(244,236,220,.2)', maxWidth: 1200, width: '100%', margin: '0 auto' }}>
        <Link to="/" className="hdr-logo" style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 18, letterSpacing: '.14em', textTransform: 'uppercase', borderBottom: 'none' }}>AstroMeridian</Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span className="hdr-tag" style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(244,236,220,.6)' }}>Account</span>
          <NavMenu current="Account" />
        </div>
      </header>

      {adding && <AddProfile onClose={() => { setAdding(false); if (query.get('add')) setQuery({}, { replace: true }); }} />}

      <main style={{ position: 'relative', flex: 1, width: '100%', maxWidth: 1200, margin: '0 auto', padding: '32px 24px 56px', display: 'flex', flexDirection: 'column', gap: 30 }}>
        {error && <div role="alert" style={{ borderLeft: `2px solid ${GOLD}`, background: 'rgba(180,147,63,.12)', padding: '10px 14px', fontSize: 14, lineHeight: 1.45 }}>{error}</div>}

        {me && (
          <>
            {/* ------------------------------------------------- who you are */}
            <section style={{ display: 'flex', alignItems: 'center', gap: 16, animation: 'om-rise .45s cubic-bezier(.3,0,.2,1) .05s both' }}>
              <div style={{ width: 52, height: 52, flex: '0 0 auto', border: '1px solid rgba(244,236,220,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SERIF, fontSize: 22, letterSpacing: '.04em' }}>{initials(me.firstName, me.lastName)}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, flex: 1 }}>
                {editing ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px' }}>
                    <input className="acc-input" value={first} onChange={e => setFirst(e.target.value)} placeholder="First name" aria-label="First name" style={{ ...rowInput, flex: '1 1 140px', fontFamily: SERIF, fontSize: 24, borderBottom: '1px solid rgba(244,236,220,.3)' }} />
                    <input className="acc-input" value={last} onChange={e => setLast(e.target.value)} placeholder="Last name" aria-label="Last name" style={{ ...rowInput, flex: '1 1 140px', fontFamily: SERIF, fontSize: 24, borderBottom: '1px solid rgba(244,236,220,.3)' }} />
                  </div>
                ) : (
                  <h1 style={{ margin: 0, fontFamily: SERIF, fontWeight: 500, fontSize: 28, lineHeight: 1.1 }}>{me.firstName} {me.lastName}</h1>
                )}
                <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.06em', color: 'rgba(244,236,220,.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{me.email}</span>
              </div>
              {editing ? (
                <div style={{ display: 'flex', gap: 14, flex: '0 0 auto' }}>
                  <button type="button" onClick={saveName} disabled={busy || !first.trim() || !last.trim()} className="acc-quiet" style={{ ...quiet, color: 'rgba(244,236,220,.68)', fontSize: 10, letterSpacing: '.12em' }}>Save</button>
                  <button type="button" onClick={() => { setEditing(false); setFirst(me.firstName); setLast(me.lastName); }} className="acc-quiet" style={{ ...quiet, fontSize: 10, letterSpacing: '.12em' }}>Cancel</button>
                </div>
              ) : (
                <button type="button" onClick={() => setEditing(true)} className="acc-quiet" style={{ ...quiet, marginLeft: 'auto', flex: '0 0 auto', color: 'rgba(244,236,220,.68)', fontSize: 10, letterSpacing: '.12em' }}>Edit</button>
              )}
            </section>

            {/* ---------------------------------------------- birth details */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: 0, animation: 'om-rise .45s cubic-bezier(.3,0,.2,1) .12s both' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, paddingBottom: 10, borderBottom: `1px solid ${INK}` }}>
                <h2 style={h2}>Birth details</h2>
                <span style={mono10}>{!own ? 'Nothing saved yet' : state === 'saved' ? 'Saved' : dirty ? 'Unsaved changes' : state === 'saving' ? 'Saving' : `${editedOn(own.updatedAt)} · ${editsText(own.editsLeft)}`}</span>
              </div>
              {!fields && (
                <Link to="/birth-details" style={{ padding: '14px 0', fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(244,236,220,.68)', borderBottom: 'none' }}>+ Add your birth details</Link>
              )}
              {fields && birthRows.map(([label, key, hint, format]) => (
                <label key={key} style={{ display: 'flex', alignItems: 'baseline', gap: 16, padding: '13px 0', borderBottom: '1px solid rgba(244,236,220,.18)', position: 'relative' }}>
                  <span style={{ flex: '0 0 116px', fontFamily: MONO, fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(244,236,220,.6)' }}>{label}</span>
                  <input className="acc-input" type="text" value={fields[key]} readOnly={locked} onChange={e => set(key, format(e.target.value))} onFocus={() => key === 'place' && setFocused(true)} onBlur={() => key === 'place' && setTimeout(() => setFocused(false), 120)} autoComplete="off" style={rowInput} />
                  <span style={{ flex: '0 0 auto', fontFamily: MONO, fontSize: 9.5, letterSpacing: '.1em', textTransform: 'uppercase', color: (key === 'date' && dv.error) || (key === 'time' && tv.error) || (key === 'place' && !exact) ? GOLD : 'rgba(244,236,220,.4)' }}>{hint}</span>
                  {key === 'place' && focused && hits.length > 0 && !exact && (
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0, position: 'absolute', left: 132, right: 0, top: '100%', zIndex: 5, background: NAVY, border: `1px solid ${INK}`, boxShadow: '0 10px 24px rgba(244,236,220,.14)', maxHeight: 230, overflow: 'auto', animation: 'om-fade .16s ease both' }}>
                      {hits.map(c => (
                        <li key={c.placeId}>
                          <button type="button" onMouseDown={() => pickPlace(c)} className="hov-wash" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 14, width: '100%', textAlign: 'left', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(244,236,220,.15)', padding: '11px 14px', cursor: 'pointer', color: INK, font: 'inherit' }}>
                            <span style={{ fontSize: 15 }}>{c.main}</span>
                            <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.06em', color: 'rgba(244,236,220,.6)', whiteSpace: 'nowrap' }}>{c.secondary}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </label>
              ))}
              {fields && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 14 }}>
                  <span style={{ fontSize: 12.5, lineHeight: 1.5, color: locked ? GOLD : 'rgba(244,236,220,.55)', textWrap: 'pretty' }}>{locked ? `All ${EDIT_LIMITS.primary} edits are used, so your birth details are now fixed.` : ''}</span>
                  <button type="button" onClick={save} disabled={!dirty || !valid || state === 'saving'} style={{ flex: '0 0 auto', border: `1px solid ${dirty && valid ? INK : 'rgba(244,236,220,.25)'}`, background: dirty && valid ? 'rgba(244,236,220,.12)' : 'transparent', color: dirty && valid ? INK : 'rgba(244,236,220,.45)', padding: '9px 18px', fontFamily: MONO, fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', cursor: dirty && valid ? 'pointer' : 'default', transition: 'background .2s ease,color .2s ease' }}>{state === 'saved' ? 'Saved' : state === 'saving' ? 'Saving' : 'Save changes'}</button>
                </div>
              )}
            </section>

            {/* ------------------------------------------------ saved people */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: 0, animation: 'om-rise .45s cubic-bezier(.3,0,.2,1) .18s both' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, paddingBottom: 10, borderBottom: `1px solid ${INK}` }}>
                <h2 style={h2}>Saved people</h2>
                <span style={mono10}>{slots == null ? `${people.length} saved` : `${billing.profiles.used} of ${slots} slots used${billing.profiles.extra ? ` · ${packName(billing.profiles)} pack` : ''}`}</span>
              </div>
              {people.map(p => (
                <div key={p._id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 0', borderBottom: '1px solid rgba(244,236,220,.18)', opacity: p.disabled ? 0.55 : 1 }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                    <span style={{ fontSize: 14.5 }}>{p.firstName} {p.lastName}{p.disabled && <span style={{ ...mono10, marginLeft: 8, color: GOLD }}>OFF</span>}</span>
                    <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.05em', color: 'rgba(244,236,220,.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dob(p.birthDate)} · {p.birthTime} · {p.city}{p.relationship && p.relationship !== 'self' ? ` · ${p.relationship}` : ''} · {editsText(p.editsLeft)}</span>
                  </div>
                  {!p.disabled && <Link to={`/synastry?with=${p._id}`} style={{ flex: '0 0 auto', fontFamily: MONO, fontSize: 9.5, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(244,236,220,.68)', borderBottom: 'none' }}>Open</Link>}
                  {!p.disabled && p.editsLeft > 0 && <Link to={`/birth-details?id=${p._id}`} style={{ flex: '0 0 auto', fontFamily: MONO, fontSize: 9.5, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(244,236,220,.68)', borderBottom: 'none' }}>Edit</Link>}
                  <button type="button" onClick={() => switchProfile(p)} disabled={switching === p._id} aria-pressed={!p.disabled} className="acc-toggle" style={{ flex: '0 0 auto', border: 'none', background: 'transparent', color: 'rgba(244,236,220,.45)', fontFamily: MONO, fontSize: 9.5, letterSpacing: '.12em', textTransform: 'uppercase', cursor: 'pointer', padding: 4 }}>{switching === p._id ? '…' : p.disabled ? 'Switch on' : 'Switch off'}</button>
                </div>
              ))}
              <button type="button" onClick={() => setAdding(true)} className="acc-quiet" style={{ ...quiet, alignSelf: 'flex-start', paddingTop: 14, fontSize: 10, letterSpacing: '.12em', color: 'rgba(244,236,220,.68)' }}>+ Add someone</button>
            </section>

            {/* ------------------------------------------------ plan */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: 0, animation: 'om-rise .45s cubic-bezier(.3,0,.2,1) .3s both' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, paddingBottom: 10, borderBottom: `1px solid ${INK}` }}>
                <h2 style={h2}>Plan</h2>
                <span style={mono10}>{billing && billing.plan && billing.entitled ? (billing.plan.cancelAtPeriodEnd ? `Ends ${longDate(billing.plan.currentPeriodEnd)}` : `Renews ${longDate(billing.plan.currentPeriodEnd)}`) : ''}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '13px 0', borderBottom: '1px solid rgba(244,236,220,.18)' }}>
                <span style={{ flex: 1, fontSize: 14.5 }}>{!billing ? '…' : billing.entitled ? `${billing.plan.name}${billing.plan.trial ? ' trial' : ''} · ${Math.floor(billing.minutes.total / 60)} astrologer minutes left` : 'No active plan'}</span>
                <Link to={billing && billing.entitled ? '/billing' : '/subscription'} style={{ flex: '0 0 auto', fontFamily: MONO, fontSize: 9.5, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(244,236,220,.68)', borderBottom: 'none' }}>{billing && billing.entitled ? 'Manage' : 'See plans'}</Link>
              </div>
            </section>

            {/* ------------------------------------------------ the way out */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 6, animation: 'om-rise .45s cubic-bezier(.3,0,.2,1) .36s both' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <button type="button" onClick={signOut} className="acc-line" style={{ background: 'transparent', color: INK, padding: '10px 20px', border: '1px solid rgba(244,236,220,.3)', fontFamily: MONO, fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', cursor: 'pointer' }}>Log out</button>
                <div style={{ display: 'flex', gap: 18 }}>
                  <button type="button" onClick={exportData} className="acc-quiet" style={quiet}>Export data</button>
                  <button type="button" onClick={() => setDeleteOpen(o => !o)} className="acc-remove" style={quiet}>Delete account</button>
                </div>
              </div>
              {deleteOpen && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 14, borderTop: '1px solid rgba(244,236,220,.18)', animation: 'om-fade .25s ease both' }}>
                  <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: 'rgba(244,236,220,.72)', textWrap: 'pretty' }}>This cancels your plan straight away and removes your account, your chart and everyone you have saved. There is no refund and no undo. Export your data first if you want to keep it.</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    <button type="button" onClick={deleteAccount} disabled={busy} style={{ border: '1px solid rgba(196,106,90,.7)', background: 'transparent', color: RED, padding: '9px 18px', fontFamily: MONO, fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', cursor: 'pointer' }}>{busy ? 'Deleting' : 'Confirm deletion'}</button>
                    <button type="button" onClick={() => setDeleteOpen(false)} className="acc-quiet" style={{ ...quiet, color: 'rgba(244,236,220,.55)', padding: '9px 4px', fontSize: 10, letterSpacing: '.14em' }}>Keep it</button>
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
