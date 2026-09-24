import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Starfield from '../components/Starfield.jsx';
import NavMenu from '../components/NavMenu.jsx';
import ProfileForm from '../components/ProfileForm.jsx';
import { listProfiles } from '../lib/api.js';
import { readActive } from '../lib/active-profile.js';

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
  const saved = (() => { try { return (localStorage.getItem('meridian_name') || '').split(/\s+/); } catch (e) { return []; } })();
  // null while loading, false when the account has no entry yet, else the chosen profile to edit
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let live = true;
    listProfiles()
      .then(list => {
        if (!live) return;
        const wanted = readActive();
        setProfile(list.find(p => p._id === wanted) || list.find(p => p.isPrimary) || list[0] || false);
      })
      .catch(e => { if (e.status === 401) navigate('/login'); else if (live) setProfile(false); });
    return () => { live = false; };
  }, [navigate]);

  return (
    <div style={{ minHeight: '100vh', background: '#1C2538', color: '#F4ECDC', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}><Starfield /></div>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'rgba(28,37,56,.42)' }} />

      <header style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '18px 24px', borderBottom: '1px solid rgba(244,236,220,.2)', maxWidth: 1200, width: '100%', margin: '0 auto' }}>
        <Link to="/" style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', borderBottom: 'none' }}>← Back</Link>
        <Link to="/" style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 18, letterSpacing: '.14em', textTransform: 'uppercase', borderBottom: 'none' }}>Meridian</Link>
        <NavMenu current="Birth Details" />
      </header>

      <main style={{ position: 'relative', flex: 1, width: '100%', maxWidth: 1200, margin: '0 auto', padding: '32px 24px 48px', display: 'flex', flexDirection: 'column', gap: 26 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: '#5F8B7A' }}>The logbook</span>
          <h1 style={{ margin: 0, fontFamily: SERIF, fontWeight: 500, fontSize: 'clamp(32px,8vw,44px)', lineHeight: 1.08, textWrap: 'balance' }}>{profile ? `${profile.firstName}'s entry, as it stands.` : 'Four lines, and we can draw your sky.'}</h1>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: MUTED, textWrap: 'pretty' }}>{profile ? 'Change anything below and the chart, transits and numbers will be redrawn from the new details.' : 'Everything here is used to compute planetary positions and nothing else. You can delete the entry at any time.'}</p>
        </div>

        {profile !== null && (
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

