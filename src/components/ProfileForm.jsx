import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createProfile, placeDetails, searchPlaces, updateProfile } from '../lib/api.js';
import { AVATARS, avatarImage } from '../lib/assets.js';
import { writeActive } from '../lib/active-profile.js';
import { checkDate, checkTime, coordText, formatDate, formatTime } from '../lib/date-input.js';

/* Everything but "self", which the first entry gets by default on the API. */
const RELATIONSHIPS = ['spouse', 'partner', 'parent', 'child', 'sibling', 'friend', 'other'];

const MONO = "'IBM Plex Mono',monospace";
const SERIF = "'Cormorant Garamond',Georgia,serif";
const MUTED = 'rgba(244,236,220,.68)';
const lbl = { fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: MUTED };
const bigInput = { width: '100%', border: 'none', background: 'transparent', padding: '2px 0', fontFamily: SERIF, fontSize: 26, lineHeight: 1.2 };
const monoInput = { width: '100%', border: 'none', background: 'transparent', padding: '2px 0', fontFamily: MONO, fontSize: 20, letterSpacing: '.06em' };
const err = { fontFamily: MONO, fontSize: 10, letterSpacing: '.08em', color: '#B4933F' };

/** A saved profile's fields in the shape the inputs hold them. */
function fromProfile(p) {
  if (!p) return null;
  const [y, m, d] = p.birthDate.split('-');
  const description = [p.city, p.state, p.country].filter(Boolean).join(', ');
  return {
    firstName: p.firstName, lastName: p.lastName,
    date: `${d} / ${m} / ${y}`, time: p.birthTime.replace(':', ' : '),
    place: description,
    picked: { description, city: p.city, state: p.state, country: p.country, lat: p.lat, lon: p.lon },
    avatar: p.avatar || '', relationship: p.relationship && p.relationship !== 'self' ? p.relationship : ''
  };
}

/** The birth entry form. Creates the profile, makes it the active one, then hands the new id to onSaved.
    With `profile` it edits that entry instead. withRelationship adds the "who they are to you" row for entries about someone else. */
export default function ProfileForm({ defaultName = [], profile = null, withRelationship = false, submitLabel = 'Draw my chart', busyLabel = 'Drawing…', onSaved }) {
  const navigate = useNavigate();
  const init = fromProfile(profile);
  const [firstName, setFirstName] = useState(init?.firstName ?? defaultName[0] ?? '');
  const [lastName, setLastName] = useState(init?.lastName ?? defaultName.slice(1).join(' '));
  const [date, setDate] = useState(init?.date ?? '');
  const [time, setTime] = useState(init?.time ?? '');
  const [place, setPlace] = useState(init?.place ?? '');
  const [hits, setHits] = useState([]);
  const [picked, setPicked] = useState(init?.picked ?? null);   // resolved city/state/country from Google
  const [resolving, setResolving] = useState(false);
  const [focused, setFocused] = useState(false);
  const [noTime, setNoTime] = useState(false);
  const [avatar, setAvatar] = useState(init?.avatar ?? '');
  const [relationship, setRelationship] = useState(init?.relationship ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const seq = useRef(0);

  /* Debounced city lookup — the API proxies Google Places so the key stays server-side. */
  useEffect(() => {
    const q = place.trim();
    if (picked && picked.description === place) { setHits([]); return; }
    if (q.length < 2) { setHits([]); return; }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      searchPlaces(q, controller.signal)
        .then(setHits)
        .catch(e => { if (e.name !== 'AbortError') setHits([]); });
    }, 250);

    return () => { clearTimeout(timer); controller.abort(); };
  }, [place, picked]);

  const pick = async suggestion => {
    setPlace(suggestion.description);
    setHits([]);
    setFocused(false);
    setResolving(true);
    setError('');
    const mine = ++seq.current;
    try {
      const detail = await placeDetails(suggestion.placeId);
      if (mine === seq.current) setPicked({ ...detail, description: suggestion.description });
    } catch (e) {
      if (mine === seq.current) { setPicked(null); setError(e.message); }
    } finally {
      if (mine === seq.current) setResolving(false);
    }
  };

  const dv = checkDate(date), tv = checkTime(time);
  const exact = !!(picked && picked.description === place);
  const showSuggestions = focused && hits.length > 0 && !exact;
  const ready = !!(firstName.trim() && lastName.trim() && dv.iso && exact && (noTime || tv.hm) && (!withRelationship || relationship)) && !resolving;

  const submit = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError('');
    try {
      const body = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        birthDate: dv.iso,
        // a cleared time on an edit goes back to midnight, the same default a new entry gets
        ...(noTime ? (profile ? { birthTime: '00:00' } : {}) : { birthTime: tv.hm }),
        city: picked.city,
        state: picked.state,
        country: picked.country,
        ...(avatar && { avatar }),
        ...(relationship && { relationship })
      };
      const id = profile ? (await updateProfile(profile._id, body), profile._id) : (await createProfile(body)).id;
      writeActive(id);
      onSaved(id);
    } catch (e) {
      if (e.status === 401) { navigate('/login'); return; }
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
    <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid #F4ECDC' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 24px', borderBottom: '1px solid rgba(244,236,220,.25)' }}>
        <label style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: 6, padding: '16px 0 14px' }}>
          <span style={lbl}>i · First name</span>
          <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Ana" autoComplete="given-name" style={bigInput} />
        </label>
        <label style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: 6, padding: '16px 0 14px' }}>
          <span style={{ ...lbl, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}><span>Last name</span><span style={{ color: 'rgba(244,236,220,.35)' }}>As you'd like it written</span></span>
          <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Rodrigues" autoComplete="family-name" style={bigInput} />
        </label>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 24px', borderBottom: '1px solid rgba(244,236,220,.25)' }}>
        <label style={{ flex: '1 1 180px', display: 'flex', flexDirection: 'column', gap: 6, padding: '16px 0 14px' }}>
          <span style={lbl}>ii · Date of birth</span>
          <input type="text" inputMode="numeric" value={date} onChange={e => setDate(formatDate(e.target.value))} placeholder="DD / MM / YYYY" style={monoInput} />
          {dv.error && <span style={err}>{dv.error}</span>}
        </label>
        <label style={{ flex: '1 1 140px', display: 'flex', flexDirection: 'column', gap: 6, padding: '16px 0 14px', opacity: noTime ? .35 : 1 }}>
          <span style={lbl}>iii · Time of birth</span>
          <input type="text" inputMode="numeric" value={time} onChange={e => setTime(formatTime(e.target.value))} disabled={noTime} placeholder="HH : MM" style={monoInput} />
          {tv.error && !noTime && <span style={err}>{tv.error}</span>}
        </label>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '16px 0 14px', borderBottom: '1px solid rgba(244,236,220,.25)', position: 'relative', zIndex: 10 }}>
        <span style={{ ...lbl, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
          <span>iv · Place of birth</span>
          <span style={{ color: '#5F8B7A' }}>{resolving ? 'Locating…' : exact ? coordText(picked.lat, picked.lon) : ''}</span>
        </span>
        <input type="text" value={place} onChange={e => { setPlace(e.target.value); setPicked(null); }} onFocus={() => setFocused(true)} onBlur={() => setTimeout(() => setFocused(false), 120)} placeholder="Start typing a city" autoComplete="off" style={bigInput} />
        {exact && <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: MUTED }}>{[picked.city, picked.state, picked.country].filter(Boolean).join(' · ')}</span>}
        {showSuggestions && (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, position: 'absolute', left: -12, right: -12, top: '100%', zIndex: 5, background: '#1C2538', border: '1px solid #F4ECDC', boxShadow: '0 10px 24px rgba(244,236,220,.14)', maxHeight: 230, overflow: 'auto', animation: 'om-fade .16s ease both' }}>
            {hits.map(c => (
              <li key={c.placeId}>
                <button type="button" onMouseDown={() => pick(c)} className="hov-wash" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 14, width: '100%', textAlign: 'left', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(244,236,220,.15)', padding: '11px 14px', cursor: 'pointer', color: '#F4ECDC', font: 'inherit' }}>
                  <span style={{ fontSize: 15 }}>{c.main}</span>
                  <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.06em', color: MUTED, whiteSpace: 'nowrap' }}>{c.secondary}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {withRelationship && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '16px 0 14px', borderBottom: '1px solid rgba(244,236,220,.25)' }}>
          <span style={lbl}>v · Who they are to you</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {RELATIONSHIPS.map(r => {
              const on = r === relationship;
              return (
                <button key={r} type="button" onClick={() => setRelationship(r)} aria-pressed={on} className={on ? '' : 'hov-wash-10'} style={{ padding: '7px 13px', borderRadius: 2, cursor: 'pointer', fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: on ? '#1C2538' : '#F4ECDC', background: on ? '#F4ECDC' : 'transparent', border: on ? '1px solid #F4ECDC' : '1px solid rgba(244,236,220,.35)' }}>{r}</button>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '16px 0 14px', borderBottom: '1px solid rgba(244,236,220,.25)' }}>
        <span style={{ ...lbl, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}><span>{withRelationship ? 'vi' : 'v'} · Portrait</span><span style={{ color: 'rgba(244,236,220,.35)' }}>Optional</span></span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {AVATARS.map(id => {
            const on = id === avatar;
            return (
              <button key={id} type="button" onClick={() => setAvatar(on ? '' : id)} aria-label={`Portrait ${id.slice(-2)}`} aria-pressed={on} style={{ width: 52, height: 52, padding: 0, borderRadius: '50%', overflow: 'hidden', cursor: 'pointer', background: 'rgba(244,236,220,.08)', border: on ? '2px solid #B4933F' : '1px solid rgba(244,236,220,.3)', boxShadow: on ? '0 0 0 3px rgba(180,147,63,.25)' : 'none', opacity: avatar && !on ? .55 : 1, transition: 'opacity .15s, box-shadow .15s' }}>
                <img src={avatarImage(id)} alt="" loading="lazy" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ padding: '18px 0 4px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button type="button" onClick={() => setNoTime(v => !v)} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: 'transparent', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', color: '#F4ECDC', font: 'inherit' }}>
          <span style={{ flex: '0 0 auto', width: 18, height: 18, marginTop: 1, border: '1px solid #F4ECDC', background: noTime ? '#F4ECDC' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 12, color: '#1C2538', lineHeight: 1 }}>{noTime ? '✓' : ''}</span>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: 15, fontWeight: 500 }}>{withRelationship ? "I don't know their birth time" : "I don't know my birth time"}</span>
            <span style={{ fontSize: 13, lineHeight: 1.45, color: MUTED }}>Very common. Tick this and we'll compute from midnight.</span>
          </span>
        </button>
        {noTime && (
          <div style={{ border: '1px solid rgba(244,236,220,.3)', borderLeft: '2px solid #B4933F', background: 'rgba(244,236,220,.08)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, animation: 'om-rise .28s cubic-bezier(.3,0,.2,1) both' }}>
            <span style={lbl}>What changes without a time</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14, lineHeight: 1.5 }}>
              <div style={{ display: 'flex', gap: 10 }}><span style={{ fontFamily: MONO, color: '#5F8B7A', flex: '0 0 auto' }}>✓</span><span><strong style={{ fontWeight: 500 }}>Still exact:</strong> Sun, Mercury, Venus, Mars and the outer planets. Their signs and aspects barely move in a day.</span></div>
              <div style={{ display: 'flex', gap: 10 }}><span style={{ fontFamily: MONO, color: '#B4933F', flex: '0 0 auto' }}>~</span><span><strong style={{ fontWeight: 500 }}>Approximate:</strong> the Moon, which travels about 13° a day, so it can land in the neighbouring sign.</span></div>
              <div style={{ display: 'flex', gap: 10 }}><span style={{ fontFamily: MONO, color: '#B4933F', flex: '0 0 auto' }}>~</span><span><strong style={{ fontWeight: 500 }}>Provisional:</strong> the Ascendant, Midheaven and houses are drawn from midnight. They move a full circle in a day, so treat them as a placeholder until you find the time.</span></div>
            </div>
            <span style={{ fontSize: 13, color: MUTED, borderTop: '1px solid rgba(244,236,220,.2)', paddingTop: 9 }}>A birth certificate or hospital record usually has it. You can add it later and the chart will redraw.</span>
          </div>
        )}
      </div>
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {error && (
        <div role="alert" style={{ borderLeft: '2px solid #B4933F', background: 'rgba(180,147,63,.12)', padding: '10px 14px', fontSize: 14, lineHeight: 1.45 }}>{error}</div>
      )}
      <button type="button" onClick={submit} disabled={!ready || busy} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', height: 56, padding: '0 20px 0 24px', background: ready && !busy ? '#F4ECDC' : 'rgba(244,236,220,.35)', color: '#1C2538', border: 'none', borderRadius: 2, fontFamily: "'Instrument Sans',sans-serif", fontWeight: 500, fontSize: 16, cursor: ready && !busy ? 'pointer' : 'not-allowed' }}>
        <span>{busy ? busyLabel : submitLabel}</span>
        <span style={{ fontFamily: MONO, fontSize: 14, opacity: .8 }}>→</span>
      </button>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, fontFamily: MONO, fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: MUTED, flexWrap: 'wrap' }}>
        <span>{ready ? 'Entry complete' : (noTime ? 'Name, date and place required' : (withRelationship ? 'All five lines required' : 'All four lines required'))}</span>
        <span>Free · No card</span>
      </div>
    </div>
    </div>
  );
}
