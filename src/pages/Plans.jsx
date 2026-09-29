import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Starfield from '../components/Starfield.jsx';
import NavMenu from '../components/NavMenu.jsx';
import { logout } from '../lib/api.js';
import { clearActive } from '../lib/active-profile.js';
import { cadence, euros, getCatalog, getStatus, minutesText } from '../lib/billing.js';

/* Pricing. Every plan opens the whole app; they differ only in how long a
   billing period runs and how many astrologer minutes come with it. */

const MONO = "'IBM Plex Mono',monospace";
const SERIF = "'Cormorant Garamond',Georgia,serif";
const INK = '#F4ECDC', NAVY = '#1C2538', GOLD = '#B4933F', SAGE = '#5F8B7A';
const MUTED = 'rgba(244,236,220,.68)';

const INCLUDED = ['Natal chart and full placements', 'Daily horoscope and transits', 'Synastry, tarot and numerology', 'Your AI astrologer, by voice or text'];
const eyebrow = { fontFamily: MONO, fontSize: 10.5, letterSpacing: '.16em', textTransform: 'uppercase', color: SAGE };

export default function Plans() {
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState(null);
  const [status, setStatus] = useState(undefined); // undefined loading, null signed out
  const [trial, setTrial] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getCatalog().then(setCatalog).catch(e => setError(e.message));
    getStatus().then(setStatus).catch(e => (e.status === 401 ? setStatus(null) : setError(e.message)));
  }, []);

  const signOut = async () => {
    try { await logout(); } catch (e) {}
    clearActive();
    navigate('/login');
  };

  const current = status && status.plan;
  const lapsed = current && !status.entitled;
  const trialOn = trial && (status === null || (status && status.trialAvailable && !status.entitled));

  const choose = tier => {
    const t = tier === catalog.trial.tier && trialOn ? '&trial=1' : '';
    if (status === null) return navigate(`/signup?plan=${tier}${t}`);
    if (status.entitled) return navigate(`/checkout?item=change&plan=${tier}`);
    navigate(`/checkout?item=plan&plan=${tier}${t}`);
  };

  return (
    <div style={{ minHeight: '100vh', background: NAVY, color: INK, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <style>{`.pl-grid{display:grid;gap:18px;grid-template-columns:1fr}@media(min-width:860px){.pl-grid{grid-template-columns:repeat(3,1fr)}}.pl-card:hover{border-color:rgba(244,236,220,.55)!important}`}</style>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}><Starfield /></div>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'rgba(28,37,56,.55)' }} />

      <header style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '18px 24px', borderBottom: '1px solid rgba(244,236,220,.2)', maxWidth: 1200, width: '100%', margin: '0 auto' }}>
        <Link to={status && status.entitled ? '/dashboard' : '/'} style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', borderBottom: 'none' }}>← {status && status.entitled ? 'Home' : 'Back'}</Link>
        <Link to="/" style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 18, letterSpacing: '.14em', textTransform: 'uppercase', borderBottom: 'none' }}>AstroMeridian</Link>
        {status && status.entitled ? <NavMenu current="Plan & billing" />
          : status ? <button type="button" onClick={signOut} style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: MUTED, fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase' }}>Log out</button>
          : <Link to="/login" style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase' }}>Sign in</Link>}
      </header>

      <main style={{ position: 'relative', flex: 1, width: '100%', maxWidth: 1200, margin: '0 auto', padding: '40px 24px 64px', display: 'flex', flexDirection: 'column', gap: 34 }}>
        <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 14, animation: 'om-rise .5s cubic-bezier(.3,0,.2,1) both' }}>
          <span style={eyebrow}>{status && status.entitled ? 'Your plan' : 'Choose a plan'}</span>
          <h1 style={{ margin: 0, fontFamily: SERIF, fontWeight: 500, fontSize: 'clamp(34px,7vw,54px)', lineHeight: 1.05, maxWidth: 720, textWrap: 'balance' }}>{status && status.entitled ? 'Change how you are billed.' : 'Everything in the sky, one plan away.'}</h1>
          <p style={{ margin: 0, fontSize: 16, lineHeight: 1.55, color: MUTED, maxWidth: 520, textWrap: 'pretty' }}>Every plan opens the whole atlas. Longer plans cost less per month and bring more time with your astrologer.</p>
        </section>

        {error && <div role="alert" style={{ borderLeft: `2px solid ${GOLD}`, background: 'rgba(180,147,63,.12)', padding: '10px 14px', fontSize: 14 }}>{error}</div>}
        {lapsed && (
          <div role="alert" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderLeft: `2px solid ${GOLD}`, background: 'rgba(180,147,63,.12)', padding: '12px 16px', fontSize: 14.5 }}>
            <span>{current.status === 'past_due' || current.status === 'unpaid' ? 'Your last renewal did not go through, so the app is paused.' : 'Your plan has ended. Pick one to pick up where you left off.'}</span>
            {(current.status === 'past_due' || current.status === 'unpaid') && <Link to="/checkout?item=invoice&kind=plan" style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: GOLD, borderBottom: 'none' }}>Pay now →</Link>}
          </div>
        )}

        {catalog && status !== undefined && (
          <div className="pl-grid">
            {catalog.plans.map((p, i) => {
              const mine = current && status.entitled && current.tier === p.tier;
              const isTrialPlan = p.tier === catalog.trial.tier;
              const canTrial = isTrialPlan && (status === null || (status.trialAvailable && !status.entitled));
              const featured = p.tier === 'premium';
              return (
                <article key={p.tier} className="pl-card" style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 16, padding: '24px 22px 22px', border: `1px solid ${mine || featured ? GOLD : 'rgba(244,236,220,.25)'}`, background: 'rgba(28,37,56,.72)', transition: 'border-color .2s ease', animation: `om-rise .5s cubic-bezier(.3,0,.2,1) ${0.08 + i * 0.06}s both` }}>
                  {(mine || featured) && <span style={{ position: 'absolute', top: -9, left: 20, background: NAVY, padding: '0 8px', fontFamily: MONO, fontSize: 9.5, letterSpacing: '.14em', textTransform: 'uppercase', color: GOLD }}>{mine ? 'Current plan' : 'Most chosen'}</span>}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <h2 style={{ margin: 0, fontFamily: SERIF, fontWeight: 500, fontSize: 30 }}>{p.name}</h2>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span style={{ fontFamily: SERIF, fontSize: 44, lineHeight: 1 }}>{euros(p.amount)}</span>
                      <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.06em', color: MUTED }}>every {cadence(p.months)}</span>
                    </div>
                    <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '.06em', color: p.months > 1 ? SAGE : 'transparent' }}>{p.months > 1 ? `${euros(Math.round(p.amount / p.months))} a month` : '·'}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, padding: '12px 0', borderTop: '1px solid rgba(244,236,220,.18)', borderBottom: '1px solid rgba(244,236,220,.18)' }}>
                    <span style={{ fontSize: 14.5 }}>Astrologer minutes</span>
                    <span style={{ fontFamily: MONO, fontSize: 13, color: GOLD }}>{p.minutes} / {cadence(p.months)}</span>
                  </div>

                  <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>
                    {INCLUDED.map(t => <li key={t} style={{ display: 'flex', gap: 9, fontSize: 14, lineHeight: 1.45 }}><span style={{ fontFamily: MONO, color: SAGE }}>✓</span><span>{t}</span></li>)}
                  </ul>

                  {canTrial && (
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', border: `1px solid ${trial ? 'rgba(180,147,63,.6)' : 'rgba(244,236,220,.2)'}`, cursor: 'pointer', fontSize: 13.5, lineHeight: 1.45 }}>
                      <input type="checkbox" checked={trial} onChange={e => setTrial(e.target.checked)} style={{ accentColor: GOLD, marginTop: 3 }} />
                      <span>Start with a {catalog.trial.days}-day trial for {euros(catalog.trial.amount)} and {catalog.trial.minutes} minutes. {p.name} begins after, unless you cancel.</span>
                    </label>
                  )}

                  <button type="button" disabled={!!mine} onClick={() => choose(p.tier)} className={mine ? '' : 'hov-cream'} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 50, padding: '0 16px 0 18px', background: mine ? 'transparent' : INK, color: mine ? MUTED : NAVY, border: mine ? '1px solid rgba(244,236,220,.25)' : 'none', borderRadius: 2, cursor: mine ? 'default' : 'pointer', fontFamily: "'Instrument Sans',sans-serif", fontWeight: 500, fontSize: 15 }}>
                    <span>{mine ? 'Your plan' : status && status.entitled ? `Switch to ${p.name}` : canTrial && trial ? `Try for ${euros(catalog.trial.amount)}` : `Choose ${p.name}`}</span>
                    {!mine && <span style={{ fontFamily: MONO, fontSize: 13, opacity: .8 }}>→</span>}
                  </button>
                </article>
              );
            })}
          </div>
        )}

        {catalog && (
          <section style={{ display: 'grid', gap: 18, gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', animation: 'om-rise .5s cubic-bezier(.3,0,.2,1) .3s both' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 14, borderTop: `1px solid ${INK}` }}>
              <span style={eyebrow}>More people</span>
              <span style={{ fontFamily: SERIF, fontSize: 22 }}>{euros(catalog.profileSlot.amount)} a month per extra profile</span>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: MUTED }}>Your own profile is included. Add a partner, a parent or a friend any time; each one is billed monthly for as long as you keep it.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 14, borderTop: `1px solid ${INK}` }}>
              <span style={eyebrow}>More minutes</span>
              <span style={{ fontFamily: SERIF, fontSize: 22 }}>{catalog.minutePacks.map(p => `${p.minutes} min ${euros(p.amount)}`).join(' · ')}</span>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: MUTED }}>Top up whenever you like, as often as you like. Bought minutes never expire.{status && status.entitled ? <> <Link to="/billing">Top up now</Link>.</> : ''}</p>
            </div>
          </section>
        )}

        {status && status.entitled && (
          <p style={{ margin: 0, textAlign: 'center', fontSize: 13.5, color: MUTED }}>{current.trial ? 'Trial' : current.name} · {minutesText(status.minutes.total)} left · <Link to="/billing">Manage billing</Link></p>
        )}
      </main>
    </div>
  );
}
