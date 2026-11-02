import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { forgetStatus, getStatus, longDate } from '../lib/billing.js';
import { t } from '../i18n/index.js';

/* After logging in to a deleted account: it is open again, and this says what that means.
   Mounted once beside the routes, so it survives the redirect a lapsed plan gets. */

// set by login() in lib/api.js
const RESTORED_KEY = 'meridian_restored';

const MONO = "'IBM Plex Mono',monospace";
const SERIF = "'Cormorant Garamond',Georgia,serif";
const INK = '#F4ECDC', NAVY = '#1C2538', GOLD = '#B4933F', SAGE = '#5F8B7A';
const button = { background: 'transparent', color: INK, padding: '10px 18px', border: '1px solid rgba(244,236,220,.3)', fontFamily: MONO, fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', cursor: 'pointer' };

export default function AccountRestored() {
  const navigate = useNavigate();
  const [deletedAt, setDeletedAt] = useState(() => {
    try { return sessionStorage.getItem(RESTORED_KEY); } catch (e) { return null; }
  });
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!deletedAt) return;
    forgetStatus();
    getStatus().then(setStatus).catch(() => {});
    const onKey = e => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [deletedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!deletedAt) return null;

  function close(to) {
    try { sessionStorage.removeItem(RESTORED_KEY); } catch (e) {}
    setDeletedAt(null);
    if (to) navigate(to);
  }

  const plan = status && status.paymentsEnabled !== false ? status.plan : null;
  const running = plan && status.entitled;
  const steps = [
    t('Everything you had is still here: your chart, the people you saved and your readings.'),
    !status || status.paymentsEnabled === false ? null
      : running && plan.cancelAtPeriodEnd ? t('Your plan is still cancelled. It runs until {date} and then ends. Keep it from Plan & billing if you want it to renew.', { date: longDate(plan.currentPeriodEnd) })
      : running ? t('Your plan is active.')
      : t('Your plan has ended. Choose a plan to use the app again.'),
    t('Changed your mind? You can delete your account again from your account page.')
  ].filter(Boolean);

  return createPortal(
    <div onClick={() => close()} style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(10,14,24,.72)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '8vh 16px', overflowY: 'auto', animation: 'om-nav-fade .2s ease both' }}>
      <div role="dialog" aria-modal="true" aria-labelledby="restored-title" onClick={e => e.stopPropagation()} style={{ width: 'min(520px,100%)', background: NAVY, color: INK, border: '1px solid rgba(244,236,220,.2)', boxShadow: '0 24px 60px rgba(0,0,0,.5)', padding: '24px 24px 26px', display: 'flex', flexDirection: 'column', gap: 18, fontFamily: "'Instrument Sans',Helvetica,Arial,sans-serif", animation: 'om-rise .28s cubic-bezier(.3,0,.2,1) both' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: SAGE }}>{t('Welcome back')}</span>
          <h2 id="restored-title" style={{ margin: 0, fontFamily: SERIF, fontWeight: 500, fontSize: 'clamp(26px,5vw,32px)', lineHeight: 1.1, textWrap: 'balance' }}>{t('Your account is open again.')}</h2>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'rgba(244,236,220,.68)', textWrap: 'pretty' }}>{t('You deleted this account on {date}. Logging in has reopened it.', { date: longDate(deletedAt) })}</p>
        </div>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {steps.map(s => (
            <li key={s} style={{ display: 'flex', gap: 10, fontSize: 14, lineHeight: 1.5, color: 'rgba(244,236,220,.82)' }}>
              <span aria-hidden="true" style={{ fontFamily: MONO, color: GOLD }}>·</span><span>{s}</span>
            </li>
          ))}
        </ul>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <button type="button" autoFocus onClick={() => close()} style={{ ...button, borderColor: GOLD }}>{t('Continue')}</button>
          {plan && <button type="button" onClick={() => close('/billing')} style={{ ...button, border: 'none', color: 'rgba(244,236,220,.68)' }}>{t('Plan & billing')}</button>}
          {status && status.paymentsEnabled !== false && !running && <button type="button" onClick={() => close('/subscription')} style={{ ...button, border: 'none', color: 'rgba(244,236,220,.68)' }}>{t('See plans')}</button>}
        </div>
      </div>
    </div>,
    document.body
  );
}
