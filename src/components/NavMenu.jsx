import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { avatarImage } from '../lib/assets.js';
import { listProfiles, logout } from '../lib/api.js';
import { clearActive, readActive, writeActive } from '../lib/active-profile.js';
import ProfileForm from './ProfileForm.jsx';
import { euros, forgetStatus, getCatalog, getStatus, packName, useSales } from '../lib/billing.js';
import { t } from '../i18n/index.js';
import LanguageSwitch from './LanguageSwitch.jsx';


// always in view: the two places people go every day
const TOP = [['Home', '/dashboard', '⌂'], ['Daily Horoscope', '/daily-horoscope', '☼']];
// the rest folds into submenus; the one holding the current page starts open
const GROUPS = [
  { label: 'Your chart', glyph: '☉', items: [['Birth Details', '/birth-details'], ['Natal Chart', '/natal-chart'], ['Transits', '/transits'], ['Astrocartography', '/astrocartography']] },
  { label: 'Practices', glyph: '✦', items: [['Synastry', '/synastry'], ['Tarot', '/tarot'], ['Numerology', '/numerology'], ['Palm Reading', '/palm-reading']] },
  { label: 'You', glyph: '◐', items: [['Your astrologer', '/choose-astrologer'], ['Plan & billing', '/billing'], ['Account', '/account'], ['Help & support', '/support']] }
];
const NEW = ['Astrocartography', 'Palm Reading'];
const SYM = "'Noto Sans Symbols','Segoe UI Symbol','Apple Symbols',serif";
const SANS = "'Instrument Sans',Helvetica,sans-serif";
const GOLD = '#B4933F';
const dot = <span style={{ width: 5, height: 5, background: GOLD, borderRadius: '50%', flex: '0 0 auto' }} />;
const newTag = () => <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 8.5, letterSpacing: '.12em', textTransform: 'uppercase', color: GOLD, border: '1px solid rgba(180,147,63,.55)', padding: '1px 5px', borderRadius: 2 }}>{t('New')}</span>;

const MONO = "'IBM Plex Mono',monospace";
const bar = (rotate, ty, opacity) => ({ display: 'block', width: 16, height: 1.4, background: '#F4ECDC', transition: 'transform .25s ease, opacity .2s ease', transform: `translateY(${ty}px) rotate(${rotate}deg)`, opacity });
const stop = e => e.stopPropagation();

/* A new entry for someone else. Saving makes it the active profile, and the
   page reloads the same way a switch does so every reading follows it. */
/* After adding someone, always land on the dashboard. ProfileForm has already
   made them the active profile, so it opens on their sky. A full load, so every
   page and the profile switcher pick them up (and no ?add=1 reopens this dialog). */
const toDashboard = () => window.location.assign('/dashboard');

export function AddProfile({ onClose }) {
  const navigate = useNavigate();
  // null while checking; false means every slot in the current pack is in use
  const [free, setFree] = useState(null);
  const [extra, setExtra] = useState(0);
  const [packs, setPacks] = useState([]);
  useEffect(() => {
    forgetStatus();
    // payments off: no slots to buy, anyone can be added
    getStatus().then(s => { setExtra(s.profiles.extra); setFree(s.paymentsEnabled === false || s.profiles.used < s.profiles.included + s.profiles.extra); }).catch(() => setFree(true));
    getCatalog().then(c => setPacks(c.profilePacks)).catch(() => {});
  }, []);
  const bigger = packs.filter(p => p.extra > extra);

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(10,14,24,.72)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '4vh 16px', overflowY: 'auto', animation: 'om-nav-fade .2s ease both' }}>
      <div role="dialog" aria-modal="true" aria-label={t('Add a profile')} onClick={stop} style={{ width: 'min(680px,100%)', background: '#1C2538', color: '#F4ECDC', border: '1px solid rgba(244,236,220,.2)', boxShadow: '0 24px 60px rgba(0,0,0,.5)', padding: '22px 24px 28px', display: 'flex', flexDirection: 'column', gap: 22, animation: 'om-rise .28s cubic-bezier(.3,0,.2,1) both' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: '#5F8B7A' }}>{t('New entry')}</span>
            <h2 style={{ margin: 0, fontFamily: "'Cormorant Garamond',Georgia,serif", fontWeight: 500, fontSize: 'clamp(26px,5vw,34px)', lineHeight: 1.1, textWrap: 'balance' }}>{t('Add someone to your logbook.')}</h2>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'rgba(244,236,220,.68)', textWrap: 'pretty' }}>{t('Their chart, transits and numbers, kept beside yours. You can switch between entries from the portrait in the header. Check the details before saving: a saved person stays on your account for good and can be corrected once.')}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t('Close')} style={{ width: 28, height: 28, flex: '0 0 auto', background: 'transparent', border: 'none', color: '#F4ECDC', fontSize: 20, lineHeight: 1, cursor: 'pointer', padding: 0 }}>×</button>
        </div>
        {free === true && <ProfileForm withRelationship submitLabel={t('Add profile')} busyLabel={t('Saving…')} onSaved={toDashboard} />}
        {free === false && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, borderTop: '1px solid rgba(244,236,220,.2)', paddingTop: 18 }}>
            <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: '#B4933F' }}>{t('Profile packs · monthly')}</span>
            <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.55, color: 'rgba(244,236,220,.78)', textWrap: 'pretty' }}>{extra ? t('Every slot in your {pack} pack is in use. Move to a bigger pack to add someone new.', { pack: packName({ extra }) }) : t('Your own profile is included in your plan. To add other people, choose a monthly profile pack.')}</p>
            {bigger.length === 0 && packs.length > 0 && <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: 'rgba(244,236,220,.68)' }}>{t('You already have the largest pack and every slot is taken. Switched-off people keep their slot.')}</p>}
            {bigger.map(p => (
              <button key={p.id} type="button" onClick={() => { onClose(); navigate(`/checkout?item=profiles&pack=${p.id}&next=${encodeURIComponent('/account?add=1')}`); }} className="hov-cream" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 50, padding: '0 16px 0 18px', background: '#F4ECDC', color: '#1C2538', border: 'none', borderRadius: 2, cursor: 'pointer', fontFamily: "'Instrument Sans',sans-serif", fontWeight: 500, fontSize: 15 }}>
                <span>{t('{pack} · {price}/month', { pack: packName(p), price: euros(p.amount) })}</span><span style={{ fontFamily: MONO, fontSize: 13, opacity: .8 }}>→</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* A fine zodiac dial around the profile portrait: twelve ticks, one per sign,
   the longer ones at the four angles. It turns slowly all the time (index.css). */
function ZodiacDial() {
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const a = (i * 30 * Math.PI) / 180, inner = i % 3 === 0 ? 16.4 : 17.6;
    return <line key={i} x1={20 + inner * Math.sin(a)} y1={20 - inner * Math.cos(a)} x2={20 + 19.4 * Math.sin(a)} y2={20 - 19.4 * Math.cos(a)} />;
  });
  return (
    <svg className="nm-dial" viewBox="0 0 40 40" width="40" height="40" aria-hidden="true" style={{ position: 'absolute', top: -5, left: -5, pointerEvents: 'none', stroke: '#D8BC6A', strokeWidth: 0.9, fill: 'none' }}>
      <circle cx="20" cy="20" r="19.4" />
      {ticks}
    </svg>
  );
}

export default function NavMenu({ current = '' }) {
  const sales = useSales();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profiles, setProfiles] = useState([]);
  const [adding, setAdding] = useState(false);
  const [openGroup, setOpenGroup] = useState(() => (GROUPS.find(g => g.items.some(([n]) => n === current)) || {}).label || null);
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

  const active = profiles.find(p => p._id === activeId) || profiles[0] || { name: t('You') };

  return (
    // never squeezed: on a narrow header this is the one thing that must stay visible
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 10, flex: '0 0 auto' }}>
      <div className="nm-dial-wrap" style={{ position: 'relative' }}>
        <ZodiacDial />
        <button type="button" onClick={() => setProfileOpen(o => !o)} aria-label={t('Switch profile')} className="hov-wash-20" style={{ width: 30, height: 30, flex: '0 0 auto', borderRadius: '50%', overflow: 'hidden', background: 'rgba(244,236,220,.12)', border: '1px solid rgba(244,236,220,.4)', color: '#F4ECDC', fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
          {active.avatar
            ? <img src={avatarImage(active.avatar)} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            : ((active.firstName || active.name || '?').trim().charAt(0) || '?').toUpperCase()}
        </button>
        {profileOpen && (
          <>
            <div onClick={() => setProfileOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 999 }} />
            <div onClick={stop} style={{ position: 'absolute', top: 38, right: 0, minWidth: 190, background: '#1C2538', border: '1px solid rgba(244,236,220,.3)', boxShadow: '0 12px 30px rgba(0,0,0,.4)', zIndex: 1001, display: 'flex', flexDirection: 'column', padding: '6px 0', animation: 'om-nav-fade .15s ease both' }}>
              {profiles.length === 0 && (
                <span style={{ padding: '9px 14px', fontFamily: MONO, fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(244,236,220,.5)' }}>{t('No profiles yet')}</span>
              )}
              {profiles.map(p => (
                <button key={p._id} type="button" onClick={() => { writeActive(p._id); window.location.reload(); }} className="hov-wash-10" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '9px 14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', color: '#F4ECDC', fontFamily: "'Instrument Sans',Helvetica,sans-serif", fontSize: 13.5 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    {p.avatar && <img src={avatarImage(p.avatar)} alt="" draggable={false} style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', flex: '0 0 auto' }} />}
                    <span style={{ whiteSpace: 'nowrap' }}>{p.isPrimary ? t('{name} · you', { name: `${p.firstName} ${p.lastName}` }) : `${p.firstName} ${p.lastName}`}</span>
                  </span>
                  {p._id === activeId && <span style={{ width: 5, height: 5, background: '#B4933F', borderRadius: '50%', flex: '0 0 auto' }} />}
                </button>
              ))}
              <button type="button" onClick={() => { setProfileOpen(false); setAdding(true); }} className="hov-cream-text" style={{ padding: '9px 14px 8px', background: 'transparent', border: 'none', borderTop: '1px solid rgba(244,236,220,.16)', marginTop: 4, cursor: 'pointer', textAlign: 'left', fontFamily: MONO, fontSize: 9.5, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(244,236,220,.55)' }}>{t('+ Add profile')}</button>
            </div>
          </>
        )}
      </div>
      <button type="button" onClick={() => setOpen(o => !o)} aria-label={t('Open menu')} className="hov-wash" style={{ width: 34, height: 34, flex: '0 0 auto', background: 'transparent', border: '1px solid rgba(244,236,220,.4)', borderRadius: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer', padding: 0 }}>
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
              <button type="button" onClick={() => setOpen(false)} aria-label={t('Close menu')} style={{ width: 28, height: 28, background: 'transparent', border: 'none', color: '#F4ECDC', fontSize: 20, lineHeight: 1, cursor: 'pointer', padding: 0 }}>×</button>
            </div>
            <div style={{ padding: '14px 12px 6px', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {TOP.map(([name, href, glyph]) => (
                <Link key={name} to={href} className="nm-row" aria-current={name === current ? 'page' : undefined} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 10px', borderRadius: 3, color: name === current ? GOLD : '#F4ECDC', fontSize: 15, fontFamily: SANS, background: name === current ? 'rgba(180,147,63,.1)' : 'transparent' }}>
                  <span aria-hidden="true" style={{ width: 20, textAlign: 'center', fontFamily: SYM, fontSize: 15, color: GOLD }}>{glyph + '\uFE0E'}</span>
                  <span style={{ flex: 1 }}>{t(name)}</span>
                  {name === current && dot}
                </Link>
              ))}
            </div>
            <div style={{ margin: '4px 20px', borderTop: '1px solid rgba(244,236,220,.12)' }} />
            <div style={{ padding: '6px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {GROUPS.map(g => (sales === false ? { ...g, items: g.items.filter(([, to]) => to !== '/billing') } : g)).map(g => {
                const isOpen = openGroup === g.label, here = g.items.some(([n]) => n === current), id = `nm-${g.label.replace(/\W/g, '')}`;
                return (
                  <div key={g.label}>
                    <button type="button" className="nm-row" aria-expanded={isOpen} aria-controls={id} onClick={() => setOpenGroup(isOpen ? null : g.label)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 10px', borderRadius: 3, background: isOpen ? 'rgba(244,236,220,.05)' : 'transparent', border: 'none', cursor: 'pointer', color: here ? GOLD : '#F4ECDC', fontFamily: SANS, fontSize: 15, textAlign: 'left' }}>
                      <span aria-hidden="true" style={{ width: 20, textAlign: 'center', fontFamily: SYM, fontSize: 15, color: GOLD }}>{g.glyph + '\uFE0E'}</span>
                      <span style={{ flex: 1 }}>{t(g.label)}</span>
                      {!isOpen && g.items.some(([n]) => NEW.includes(n)) && newTag()}
                      <span aria-hidden="true" style={{ fontSize: 11, color: 'rgba(244,236,220,.55)', transition: 'transform .25s ease', transform: isOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
                    </button>
                    {/* grid rows 0fr → 1fr animates the submenu to its own height */}
                    <div id={id} style={{ display: 'grid', gridTemplateRows: isOpen ? '1fr' : '0fr', transition: 'grid-template-rows .28s cubic-bezier(.3,0,.2,1)' }}>
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ margin: '2px 0 8px 20px', paddingLeft: 14, borderLeft: '1px solid rgba(180,147,63,.35)', display: 'flex', flexDirection: 'column' }}>
                          {g.items.map(([name, href]) => (
                            <Link key={name} to={href} tabIndex={isOpen ? 0 : -1} className="hov-cream-text" aria-current={name === current ? 'page' : undefined}
                              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px', color: name === current ? GOLD : 'rgba(244,236,220,.78)', fontSize: 14, fontFamily: SANS }}>
                              <span style={{ flex: 1 }}>{t(name)}</span>
                              {NEW.includes(name) && newTag()}
                              {name === current && dot}
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 'auto', padding: '16px 20px 20px', borderTop: '1px solid rgba(244,236,220,.16)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <button type="button" onClick={signOut} className="hov-cream-text" style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontFamily: MONO, fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(244,236,220,.55)' }}>{t('Log out')}</button>
              <LanguageSwitch style={{ color: '#F4ECDC' }} />
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
