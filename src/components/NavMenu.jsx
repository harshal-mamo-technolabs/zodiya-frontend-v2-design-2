import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { avatarImage } from '../lib/assets.js';
import { listProfiles, logout } from '../lib/api.js';
import { clearActive, readActive, writeActive } from '../lib/active-profile.js';
import ProfileForm from './ProfileForm.jsx';


const GROUPS = [
  { label: 'Today', items: [['Home', '/dashboard'], ['Daily Horoscope', '/daily-horoscope']] },
  { label: 'Your chart', items: [['Birth Details', '/birth-details'], ['Natal Chart', '/natal-chart'], ['Transits', '/transits']] },
  { label: 'Practices', items: [['Synastry', '/synastry'], ['Tarot', '/tarot'], ['Numerology', '/numerology']] },
  { label: 'You', items: [['Account', '/account']] }
];

const MONO = "'IBM Plex Mono',monospace";
const bar = (rotate, ty, opacity) => ({ display: 'block', width: 16, height: 1.4, background: '#F4ECDC', transition: 'transform .25s ease, opacity .2s ease', transform: `translateY(${ty}px) rotate(${rotate}deg)`, opacity });
const stop = e => e.stopPropagation();

/* A new entry for someone else. Saving makes it the active profile, and the
   page reloads the same way a switch does so every reading follows it. */
export function AddProfile({ onClose }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(10,14,24,.72)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '4vh 16px', overflowY: 'auto', animation: 'om-nav-fade .2s ease both' }}>
      <div role="dialog" aria-modal="true" aria-label="Add a profile" onClick={stop} style={{ width: 'min(680px,100%)', background: '#1C2538', color: '#F4ECDC', border: '1px solid rgba(244,236,220,.2)', boxShadow: '0 24px 60px rgba(0,0,0,.5)', padding: '22px 24px 28px', display: 'flex', flexDirection: 'column', gap: 22, animation: 'om-rise .28s cubic-bezier(.3,0,.2,1) both' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: '#5F8B7A' }}>New entry</span>
            <h2 style={{ margin: 0, fontFamily: "'Cormorant Garamond',Georgia,serif", fontWeight: 500, fontSize: 'clamp(26px,5vw,34px)', lineHeight: 1.1, textWrap: 'balance' }}>Add someone to your logbook.</h2>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'rgba(244,236,220,.68)', textWrap: 'pretty' }}>Their chart, transits and numbers, kept beside yours. You can switch between entries from the portrait in the header.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ width: 28, height: 28, flex: '0 0 auto', background: 'transparent', border: 'none', color: '#F4ECDC', fontSize: 20, lineHeight: 1, cursor: 'pointer', padding: 0 }}>×</button>
        </div>
        <ProfileForm withRelationship submitLabel="Add profile" busyLabel="Saving…" onSaved={() => window.location.reload()} />
      </div>
    </div>
  );
}

export default function NavMenu({ current = '' }) {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profiles, setProfiles] = useState([]);
  const [adding, setAdding] = useState(false);
  const activeId = readActive();
  const navigate = useNavigate();

  const signOut = async () => {
    // the server clears the cookies; a failed call still sends the user to sign in
    try { await logout(); } catch (e) {}
    clearActive();
    navigate('/login');
  };

  /* Loaded up front so the header can show the active portrait. */
  useEffect(() => {
    let live = true;
    listProfiles()
      .then(list => { if (live) setProfiles(list); })
      .catch(() => {});
    return () => { live = false; };
  }, []);

  const active = profiles.find(p => p._id === activeId) || profiles[0] || { name: 'You' };

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <div style={{ position: 'relative' }}>
        <button type="button" onClick={() => setProfileOpen(o => !o)} aria-label="Switch profile" className="hov-wash-20" style={{ width: 30, height: 30, flex: '0 0 auto', borderRadius: '50%', overflow: 'hidden', background: 'rgba(244,236,220,.12)', border: '1px solid rgba(244,236,220,.4)', color: '#F4ECDC', fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
          {active.avatar
            ? <img src={avatarImage(active.avatar)} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            : ((active.firstName || active.name || '?').trim().charAt(0) || '?').toUpperCase()}
        </button>
        {profileOpen && (
          <>
            <div onClick={() => setProfileOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 999 }} />
            <div onClick={stop} style={{ position: 'absolute', top: 38, right: 0, minWidth: 190, background: '#1C2538', border: '1px solid rgba(244,236,220,.3)', boxShadow: '0 12px 30px rgba(0,0,0,.4)', zIndex: 1001, display: 'flex', flexDirection: 'column', padding: '6px 0', animation: 'om-nav-fade .15s ease both' }}>
              {profiles.length === 0 && (
                <span style={{ padding: '9px 14px', fontFamily: MONO, fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(244,236,220,.5)' }}>No profiles yet</span>
              )}
              {profiles.map(p => (
                <button key={p._id} type="button" onClick={() => { writeActive(p._id); window.location.reload(); }} className="hov-wash-10" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '9px 14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', color: '#F4ECDC', fontFamily: "'Instrument Sans',Helvetica,sans-serif", fontSize: 13.5 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    {p.avatar && <img src={avatarImage(p.avatar)} alt="" draggable={false} style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', flex: '0 0 auto' }} />}
                    <span style={{ whiteSpace: 'nowrap' }}>{p.isPrimary ? `${p.firstName} ${p.lastName} · you` : `${p.firstName} ${p.lastName}`}</span>
                  </span>
                  {p._id === activeId && <span style={{ width: 5, height: 5, background: '#B4933F', borderRadius: '50%', flex: '0 0 auto' }} />}
                </button>
              ))}
              <button type="button" onClick={() => { setProfileOpen(false); setAdding(true); }} className="hov-cream-text" style={{ padding: '9px 14px 8px', background: 'transparent', border: 'none', borderTop: '1px solid rgba(244,236,220,.16)', marginTop: 4, cursor: 'pointer', textAlign: 'left', fontFamily: MONO, fontSize: 9.5, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(244,236,220,.55)' }}>+ Add profile</button>
            </div>
          </>
        )}
      </div>
      <button type="button" onClick={() => setOpen(o => !o)} aria-label="Open menu" className="hov-wash" style={{ width: 34, height: 34, flex: '0 0 auto', background: 'transparent', border: '1px solid rgba(244,236,220,.4)', borderRadius: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer', padding: 0 }}>
        <span style={bar(open ? 45 : 0, open ? 6 : 0, 1)} />
        <span style={bar(0, 0, open ? 0 : 1)} />
        <span style={bar(open ? -45 : 0, open ? -6 : 0, 1)} />
      </button>
      {adding && <AddProfile onClose={() => setAdding(false)} />}
      {open && (
        <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(10,14,24,.72)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', display: 'flex', justifyContent: 'flex-end', animation: 'om-nav-fade .2s ease both' }}>
          <nav onClick={stop} style={{ width: 'min(320px,84vw)', height: '100%', background: '#1C2538', borderLeft: '1px solid rgba(244,236,220,.2)', boxShadow: '-24px 0 50px rgba(0,0,0,.4)', display: 'flex', flexDirection: 'column', padding: 0, overflowY: 'auto', animation: 'om-nav-slide .28s cubic-bezier(.3,0,.2,1) both' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid rgba(244,236,220,.16)' }}>
              <Link to="/" onClick={() => setOpen(false)} style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontWeight: 600, fontSize: 16, letterSpacing: '.14em', textTransform: 'uppercase', color: '#F4ECDC', borderBottom: 'none' }}>AstroMeridian</Link>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" style={{ width: 28, height: 28, background: 'transparent', border: 'none', color: '#F4ECDC', fontSize: 20, lineHeight: 1, cursor: 'pointer', padding: 0 }}>×</button>
            </div>
            {GROUPS.map(g => (
              <div key={g.label} style={{ padding: '16px 20px 4px', display: 'flex', flexDirection: 'column', gap: 0 }}>
                <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(244,236,220,.5)', padding: '0 0 6px', display: 'block' }}>{g.label}</span>
                {g.items.map(([name, href]) => (
                  <Link key={name} to={href} className="hov-cream-text" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '9px 0', borderBottom: '1px solid rgba(244,236,220,.08)', color: name === current ? '#B4933F' : '#F4ECDC', fontSize: 14.5, fontFamily: "'Instrument Sans',Helvetica,sans-serif" }}>
                    <span>{name}</span>
                    {name === current && <span style={{ width: 5, height: 5, background: '#B4933F', borderRadius: '50%', flex: '0 0 auto' }} />}
                  </Link>
                ))}
              </div>
            ))}
            <div style={{ marginTop: 'auto', padding: '16px 20px 20px', borderTop: '1px solid rgba(244,236,220,.16)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button type="button" onClick={signOut} className="hov-cream-text" style={{ alignSelf: 'flex-start', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontFamily: MONO, fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(244,236,220,.55)' }}>Log out</button>
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
