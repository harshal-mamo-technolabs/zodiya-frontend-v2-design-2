import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Starfield from '../components/Starfield.jsx';
import NavMenu, { AddProfile } from '../components/NavMenu.jsx';
import ProfileForm from '../components/ProfileForm.jsx';
import { listProfiles } from '../lib/api.js';
import { readActive } from '../lib/active-profile.js';
import { EDIT_LIMITS, editsText } from '../lib/billing.js';
import { avatarImage } from '../lib/assets.js';

const MONO = "'IBM Plex Mono',monospace";
const SERIF = "'Cormorant Garamond',Georgia,serif";
const MUTED = 'rgba(244,236,220,.68)';

function Compass() {
  const INK = '#F4ECDC', COP = '#5F8B7A';
  const ring = (r, sw, delay) => <circle key={'c' + r} cx={30} cy={30} r={r} fill="none" stroke={INK} strokeWidth={sw} pathLength={1} strokeDasharray={1} style={{ animation: `om-draw .6s cubic-bezier(.3,0,.2,1) ${delay}s both` }} />;
  const ticks = [];
  for (let d = 0; d < 360; d += 15) {
    const a = d * Math.PI / 180, maj = d % 90 === 0, len = maj ? 7 : 3.5;
    ticks.push(<line key={'t' + d} x1={30 + 26 * Math.sin(a)} y1={30 - 26 * Math.cos(a)} x2={30 + (26 - len) * Math.sin(a)} y2={30 - (26 - len) * Math.cos(a)} stroke={INK} strokeWidth={maj ? .9 : .5} />);
  }
  return (
    <svg viewBox="0 0 60 60" width="100%" height="100%" aria-hidden="true" style={{ display: 'block' }}>
      {ring(26, .9, 0)}{ring(15, .5, .12)}
      <g style={{ animation: 'om-fade .5s ease .3s both' }}>{ticks}</g>
      <path d="M30 8 L34 30 L30 34 L26 30 Z" fill={INK} style={{ animation: 'om-fade .5s ease .5s both' }} />
      <path d="M30 52 L26 30 L30 26 L34 30 Z" fill="none" stroke={COP} strokeWidth={.8} style={{ animation: 'om-fade .5s ease .55s both' }} />
    </svg>
  );
}

export default function BirthDetails() {
  const navigate = useNavigate();
  // ?id= picks whose entry is open; the picker and the account page's Edit link set it
  const [query, setQuery] = useSearchParams();
  const saved = (() => { try { return (localStorage.getItem('meridian_name') || '').split(/\s+/); } catch (e) { return []; } })();
  // null while loading; switched-off people are listed but cannot be opened here
  const [profiles, setProfiles] = useState(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let live = true;
    listProfiles(true)
      .then(list => { if (live) setProfiles(list); })
      .catch(e => { if (e.status === 401) navigate('/login'); else if (live) setProfiles([]); });
    return () => { live = false; };
  }, [navigate]);

  // false when the account has no entry yet, else the profile being edited
  const usable = (profiles || []).filter(p => !p.disabled);
  const wanted = query.get('id') || readActive();
  const profile = profiles === null ? null : usable.find(p => p._id === wanted) || usable.find(p => p.isPrimary) || usable[0] || false;
  const choose = id => setQuery({ id }, { replace: true });

  return (
    <div style={{ minHeight: '100vh', background: '#1C2538', color: '#F4ECDC', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}><Starfield /></div>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'rgba(28,37,56,.42)' }} />

      <header style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '18px 24px', borderBottom: '1px solid rgba(244,236,220,.2)', maxWidth: 1200, width: '100%', margin: '0 auto' }}>
        <Link to="/" className="hdr-logo" style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 18, letterSpacing: '.14em', textTransform: 'uppercase', borderBottom: 'none' }}>AstroMeridian</Link>
        <NavMenu current="Birth Details" />
      </header>

      {adding && <AddProfile onClose={() => setAdding(false)} />}

      <main style={{ position: 'relative', flex: 1, width: '100%', maxWidth: 1200, margin: '0 auto', padding: '32px 24px 48px', display: 'flex', flexDirection: 'column', gap: 26 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: '#5F8B7A' }}>The logbook</span>
          <h1 style={{ margin: 0, fontFamily: SERIF, fontWeight: 500, fontSize: 'clamp(32px,8vw,44px)', lineHeight: 1.08, textWrap: 'balance' }}>{profile ? `${profile.firstName}'s entry, as it stands.` : 'Four lines, and we can draw your sky.'}</h1>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: MUTED, textWrap: 'pretty' }}>{profile ? 'Change anything below and the chart, transits and numbers will be redrawn from the new details.' : 'Everything here is used to compute planetary positions and nothing else. Check it carefully: saved details can only be corrected a few times.'}</p>
        </div>

        {profiles && profiles.length > 0 && (
          <nav aria-label="Whose details" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: MUTED }}>Whose details</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {profiles.map(p => {
                const on = profile && p._id === profile._id;
                return (
                  <button key={p._id} type="button" disabled={p.disabled} aria-pressed={!!on} onClick={() => choose(p._id)} title={p.disabled ? 'Switched off. Switch them on from Account to edit.' : undefined}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 14px 7px 7px', minHeight: 44, background: on ? 'rgba(244,236,220,.12)' : 'transparent', border: `1px solid ${on ? '#F4ECDC' : 'rgba(244,236,220,.25)'}`, color: '#F4ECDC', cursor: p.disabled ? 'not-allowed' : 'pointer', opacity: p.disabled ? 0.45 : 1, textAlign: 'left', font: 'inherit' }}>
                    {p.avatar
                      ? <img src={avatarImage(p.avatar)} alt="" width={28} height={28} style={{ borderRadius: '50%', objectFit: 'cover' }} />
                      : <span aria-hidden="true" style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid rgba(244,236,220,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SERIF, fontSize: 14 }}>{p.firstName.charAt(0)}</span>}
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 14 }}>{p.isPrimary ? 'You' : p.firstName}</span>
                      <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.08em', textTransform: 'uppercase', color: p.disabled ? MUTED : p.editsLeft ? '#5F8B7A' : '#B4933F' }}>{p.disabled ? 'Switched off' : editsText(p.editsLeft)}</span>
                    </span>
                  </button>
                );
              })}
              <button type="button" onClick={() => setAdding(true)} style={{ minHeight: 44, padding: '0 14px', background: 'transparent', border: '1px dashed rgba(244,236,220,.35)', color: MUTED, fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', cursor: 'pointer' }}>+ Add someone</button>
            </div>
            {profiles.some(p => p.disabled) && <span style={{ fontSize: 12.5, color: MUTED }}>Switched-off people can be turned back on from <Link to="/account">Account</Link>.</span>}
          </nav>
        )}

        {profile && (
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '6px 14px', borderLeft: `2px solid ${profile.editsLeft ? '#5F8B7A' : '#B4933F'}`, padding: '8px 14px', background: 'rgba(244,236,220,.05)' }}>
            <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: profile.editsLeft ? '#5F8B7A' : '#B4933F' }}>{editsText(profile.editsLeft)}</span>
            <span style={{ fontSize: 13.5, lineHeight: 1.5, color: MUTED, textWrap: 'pretty' }}>{profile.editsLeft
              ? `${profile.isPrimary ? 'Your own profile' : 'A saved person'} can be changed ${profile.isPrimary ? `${EDIT_LIMITS.primary} times` : 'once'} in all. Saving a new name, date, time or place uses one; the portrait does not.`
              : 'Every edit for this profile has been used, so its details are now fixed.'}</span>
          </div>
        )}

        {profile !== null && !(profile && profile.editsLeft === 0) && (
          <ProfileForm key={profile ? profile._id : 'new'} defaultName={saved} profile={profile || null} withRelationship={!!profile && profile.relationship !== 'self'} submitLabel={profile ? 'Save and redraw' : 'Draw my chart'} busyLabel={profile ? 'Saving…' : 'Drawing…'} onSaved={() => navigate('/natal-chart')} />
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, borderTop: '1px solid rgba(244,236,220,.25)', paddingTop: 18 }}>
          <div style={{ flex: '0 0 auto', width: 56, height: 56 }}><Compass /></div>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: MUTED, textWrap: 'pretty' }}>Your birthplace is matched against Google Places, then converted to UTC using the time zone in force there on that date, including daylight-saving shifts.</p>
        </div>
      </main>
    </div>
  );
}

