import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Starfield from '../components/Starfield.jsx';
import NavMenu from '../components/NavMenu.jsx';
import { cancelPlan, getCard, listInvoices, listProfiles, resumePlan } from '../lib/api.js';
import { cadence, EDIT_LIMITS, editsText, euros, forgetStatus, getCatalog, getStatus, longDate, packName } from '../lib/billing.js';

/* Plan, minutes, profiles, card and receipts, and a way to change each. */

const MONO = "'IBM Plex Mono',monospace";
const SERIF = "'Cormorant Garamond',Georgia,serif";
const INK = '#F4ECDC', NAVY = '#1C2538', GOLD = '#B4933F', SAGE = '#5F8B7A', RED = '#C46A5A';
const MUTED = 'rgba(244,236,220,.6)';

const h2 = { margin: 0, fontFamily: MONO, fontWeight: 500, fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase' };
const head = { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, paddingBottom: 10, borderBottom: `1px solid ${INK}` };
const row = { display: 'flex', alignItems: 'center', gap: 14, padding: '13px 0', borderBottom: '1px solid rgba(244,236,220,.18)' };
const action = { flex: '0 0 auto', background: 'transparent', border: '1px solid rgba(244,236,220,.3)', color: INK, padding: '8px 14px', fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 0 };
const mono10 = { fontFamily: MONO, fontSize: 10, letterSpacing: '.06em', color: MUTED };
const section = delay => ({ display: 'flex', flexDirection: 'column', animation: `om-rise .45s cubic-bezier(.3,0,.2,1) ${delay}s both` });

const mins = s => Math.floor(s / 60);
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

function planLine(plan) {
  if (!plan) return '';
  const end = plan.currentPeriodEnd ? longDate(plan.currentPeriodEnd) : '';
  if (plan.status === 'past_due' || plan.status === 'unpaid') return 'Payment failed · app paused';
  if (plan.status === 'canceled' || plan.status === 'incomplete_expired') return 'Ended';
  if (plan.status === 'incomplete') return 'Waiting for the first payment';
  if (plan.cancelAtPeriodEnd) return `Ends ${end}`;
  if (plan.trial) return `Trial · ${plan.name} starts ${end}`;
  return `Renews ${end}`;
}

export default function Billing() {
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [card, setCard] = useState(undefined);
  const [invoices, setInvoices] = useState(null);
  const [error, setError] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [qty, setQty] = useState({});
  const [people, setPeople] = useState(null);

  useEffect(() => {
    // renewals and calls change the numbers behind our back; always ask afresh here
    forgetStatus();
    getStatus().then(setStatus).catch(e => (e.status === 401 ? navigate('/login') : setError(e.message)));
    getCatalog().then(setCatalog).catch(e => setError(e.message));
    getCard().then(r => setCard(r.card)).catch(() => setCard(null));
    listInvoices().then(setInvoices).catch(() => setInvoices([]));
    listProfiles(true).then(setPeople).catch(() => setPeople([]));
  }, [navigate]);

  const toggleCancel = async cancel => {
    setBusy(true); setError('');
    try { forgetStatus(); setStatus(await (cancel ? cancelPlan() : resumePlan())); setConfirmCancel(false); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const plan = status && status.plan;
  const tier = plan && catalog && catalog.plans.find(p => p.tier === plan.tier);
  const failed = plan && (plan.status === 'past_due' || plan.status === 'unpaid');
  const allowance = plan && catalog ? (plan.trial ? catalog.trial.minutes : tier ? tier.minutes : 0) * 60 : 0;

  return (
    <div style={{ minHeight: '100vh', background: NAVY, color: INK, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', fontFamily: "'Instrument Sans',Helvetica,Arial,sans-serif" }}>
      <style>{'.bl-line:hover{background:rgba(244,236,220,.1)!important}'}</style>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}><Starfield /></div>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'rgba(28,37,56,.72)' }} />

      <header style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '18px 24px', borderBottom: '1px solid rgba(244,236,220,.2)', maxWidth: 1200, width: '100%', margin: '0 auto' }}>
        <Link to="/" className="hdr-logo" style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 18, letterSpacing: '.14em', textTransform: 'uppercase', borderBottom: 'none' }}>AstroMeridian</Link>
        <NavMenu current="Plan & billing" />
      </header>

      <main style={{ position: 'relative', flex: 1, width: '100%', maxWidth: 1200, margin: '0 auto', padding: '32px 24px 56px', display: 'flex', flexDirection: 'column', gap: 30 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: SAGE }}>Plan & billing</span>
          <h1 style={{ margin: 0, fontFamily: SERIF, fontWeight: 500, fontSize: 'clamp(30px,7vw,42px)', lineHeight: 1.08 }}>{plan && status.entitled ? `${plan.trial ? `${plan.name} trial` : plan.name}, ${plan.cancelAtPeriodEnd ? 'ending soon' : 'active'}.` : 'No active plan.'}</h1>
        </div>

        {error && <div role="alert" style={{ borderLeft: `2px solid ${GOLD}`, background: 'rgba(180,147,63,.12)', padding: '10px 14px', fontSize: 14 }}>{error}</div>}

        {status && catalog && (
          <>
            {/* ----------------------------------------------------- plan */}
            <section style={section(0.05)}>
              <div style={head}><h2 style={h2}>Plan</h2><span style={{ ...mono10, color: failed ? RED : MUTED }}>{planLine(plan) || 'None'}</span></div>
              {failed && (
                <div style={{ ...row, borderLeft: `2px solid ${RED}`, paddingLeft: 12, background: 'rgba(196,106,90,.1)' }}>
                  <span style={{ flex: 1, fontSize: 14, lineHeight: 1.5 }}>Your renewal payment failed. Pay the invoice, or replace your card below and pay it.</span>
                  <Link to="/checkout?item=invoice&kind=plan" style={{ ...action, borderBottom: '1px solid rgba(244,236,220,.3)' }}>Pay now</Link>
                </div>
              )}
              {tier && status.entitled ? (
                <div style={row}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ fontSize: 15 }}>{tier.name} · {euros(tier.amount)} every {cadence(tier.months)}</span>
                    <span style={mono10}>{plan.trial ? `${catalog.trial.minutes} astrologer minutes during the trial` : `${tier.minutes} astrologer minutes every ${cadence(tier.months)}`}</span>
                  </div>
                  <Link to="/subscription" className="bl-line" style={{ ...action, borderBottom: '1px solid rgba(244,236,220,.3)' }}>Change plan</Link>
                </div>
              ) : !failed && (
                <div style={row}>
                  <span style={{ flex: 1, fontSize: 14.5, color: MUTED }}>Choose a plan to open the app again.</span>
                  <Link to="/subscription" className="bl-line" style={{ ...action, borderBottom: '1px solid rgba(244,236,220,.3)' }}>See plans</Link>
                </div>
              )}
              {status.entitled && (
                <div style={{ paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {plan.cancelAtPeriodEnd ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 13.5, color: MUTED }}>Everything stays open until {longDate(plan.currentPeriodEnd)}. Nothing more will be charged.</span>
                      <button type="button" disabled={busy} onClick={() => toggleCancel(false)} className="bl-line" style={action}>Keep my plan</button>
                    </div>
                  ) : confirmCancel ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, animation: 'om-fade .25s ease both' }}>
                      <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: 'rgba(244,236,220,.75)' }}>Your plan{status.profiles.extra ? ' and extra profiles' : ''} will stop renewing. You keep access until {longDate(plan.currentPeriodEnd)}{plan.trial ? ', and the trial will not turn into a paid plan' : ''}.</p>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button type="button" disabled={busy} onClick={() => toggleCancel(true)} style={{ ...action, borderColor: 'rgba(196,106,90,.7)', color: RED }}>{busy ? 'Cancelling' : 'Cancel renewal'}</button>
                        <button type="button" onClick={() => setConfirmCancel(false)} style={{ ...action, border: 'none', color: MUTED }}>Never mind</button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setConfirmCancel(true)} style={{ alignSelf: 'flex-start', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontFamily: MONO, fontSize: 9.5, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(244,236,220,.45)' }}>Cancel plan</button>
                  )}
                </div>
              )}
            </section>

            {/* --------------------------------------------------- minutes */}
            <section style={section(0.1)}>
              <div style={head}><h2 style={h2}>Astrologer minutes</h2><span style={mono10}>{mins(status.minutes.total)} min left</span></div>
              <div style={{ ...row, flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 14.5 }}>
                  <span>From your plan</span><span style={{ fontFamily: MONO }}>{mins(status.minutes.plan)} of {mins(allowance)} min</span>
                </div>
                <div aria-hidden="true" style={{ height: 3, background: 'rgba(244,236,220,.14)' }}>
                  <div style={{ height: '100%', width: `${allowance ? Math.min(100, (status.minutes.plan / allowance) * 100) : 0}%`, background: GOLD, transition: 'width .4s ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 14.5 }}>
                  <span>Top-ups</span><span style={{ fontFamily: MONO }}>{mins(status.minutes.topup)} min</span>
                </div>
                <span style={mono10}>Plan minutes reset at each renewal and are used first. Top-ups never expire.</span>
              </div>
              {status.entitled && (
                <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', paddingTop: 14 }}>
                  {catalog.minutePacks.map(p => {
                    const n = qty[p.id] || 1;
                    const step = d => setQty(q => ({ ...q, [p.id]: Math.min(catalog.maxPackQuantity, Math.max(1, n + d)) }));
                    return (
                      <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 14px 12px', border: '1px solid rgba(244,236,220,.22)' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                          <span style={{ fontFamily: SERIF, fontSize: 24 }}>{p.minutes} min</span>
                          <span style={{ fontFamily: MONO, fontSize: 12, color: GOLD }}>{euros(p.amount)}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button type="button" aria-label={`Fewer ${p.minutes}-minute packs`} onClick={() => step(-1)} style={{ ...action, padding: '4px 10px' }}>−</button>
                          <span aria-live="polite" style={{ fontFamily: MONO, fontSize: 13, minWidth: 24, textAlign: 'center' }}>{n}</span>
                          <button type="button" aria-label={`More ${p.minutes}-minute packs`} onClick={() => step(1)} style={{ ...action, padding: '4px 10px' }}>+</button>
                          <Link to={`/checkout?item=minutes&pack=${p.id}&qty=${n}`} className="bl-line" style={{ ...action, marginLeft: 'auto', borderBottom: '1px solid rgba(244,236,220,.3)' }}>Buy {euros(p.amount * n)}</Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* -------------------------------------------------- profiles */}
            <ProfilesSection status={status} catalog={catalog} people={people} />

            {/* ----------------------------------------------- payment card */}
            <section style={section(0.2)}>
              <div style={head}><h2 style={h2}>Payment method</h2></div>
              <div style={row}>
                <span style={{ flex: 1, fontSize: 14.5 }}>{card === undefined ? '…' : card ? `${cap(card.brand)} ending ${card.last4} · expires ${String(card.expMonth).padStart(2, '0')}/${card.expYear}` : 'No card saved yet'}</span>
                {plan && <Link to="/checkout?item=card" className="bl-line" style={{ ...action, borderBottom: '1px solid rgba(244,236,220,.3)' }}>{card ? 'Replace' : 'Add card'}</Link>}
              </div>
            </section>

            {/* --------------------------------------------------- receipts */}
            <section style={section(0.25)}>
              <div style={head}><h2 style={h2}>Invoices</h2><span style={mono10}>{invoices ? `${invoices.length} on record` : ''}</span></div>
              {invoices && invoices.length === 0 && <span style={{ ...row, color: MUTED, fontSize: 14 }}>Nothing yet.</span>}
              {invoices && invoices.map(inv => (
                <div key={inv.id} style={row}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                    <span style={{ fontSize: 14.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.description || 'Invoice'}</span>
                    <span style={mono10}>{longDate(inv.created)} · {inv.number || '—'} · {inv.status}</span>
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: 13 }}>{euros(inv.total)}</span>
                  {(inv.pdfUrl || inv.hostedUrl) && <a href={inv.pdfUrl || inv.hostedUrl} target="_blank" rel="noreferrer" style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.12em', textTransform: 'uppercase', color: MUTED, borderBottom: 'none' }}>{inv.pdfUrl ? 'PDF' : 'View'}</a>}
                </div>
              ))}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

const PROFILE_RULES = [
  'Your own profile comes with every plan. Packs add room for other people.',
  'One pack at a time. Moving up charges the difference for the rest of this month; moving down credits it. Your billing date stays the same.',
  'Saved people stay on your account for good; they cannot be deleted. Switch someone off to hide them. They keep their slot, and you can switch them back on.',
  `Details are fixed once saved: your own profile can be corrected ${EDIT_LIMITS.primary} times, each saved person once. The portrait and relationship are free to change.`,
  'A pack renews monthly and ends with your plan.'
];

/* The profile pack, how its slots are used, the way up or down, and the rules behind it. */
function ProfilesSection({ status, catalog, people }) {
  const p = status.profiles;
  const slots = p.included + p.extra;
  const current = catalog.profilePacks.find(x => x.id === p.pack);
  const extras = people ? people.filter(x => !x.isPrimary) : [];
  const off = extras.filter(x => x.disabled).length;
  const own = people && people.find(x => x.isPrimary);
  const failed = p.status === 'past_due' || p.status === 'unpaid';
  const sub = { fontSize: 12.5, lineHeight: 1.55, color: MUTED, textWrap: 'pretty' };

  return (
    <section style={section(0.15)}>
      <div style={head}><h2 style={h2}>Profiles</h2><span style={mono10}>{p.used} of {slots} slots used</span></div>

      {/* the pack you pay for */}
      <div style={row}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontSize: 14.5 }}>{current ? `${packName(current)} pack · ${euros(current.amount)} a month` : 'No profile pack'}</span>
          <span style={mono10}>{current ? `Room for ${slots} profiles, your own included` : 'Your own profile is included with your plan'}</span>
        </div>
      </div>

      {/* how the slots are used */}
      <div style={{ display: 'flex', gap: 3, padding: '14px 0 6px' }} aria-hidden="true">
        {Array.from({ length: Math.max(slots, p.used) }, (_, i) => (
          <span key={i} style={{ flex: 1, height: 6, background: i === 0 ? INK : i < p.used - off ? SAGE : i < p.used ? 'rgba(180,147,63,.6)' : 'rgba(244,236,220,.15)' }} />
        ))}
      </div>
      <div style={{ ...row, flexWrap: 'wrap', gap: '4px 18px', ...mono10 }}>
        <span>Yours · 1</span>
        <span style={{ color: SAGE }}>Saved, on · {extras.length - off}</span>
        <span style={{ color: GOLD }}>Switched off · {off}</span>
        <span>Free · {Math.max(0, slots - p.used)}</span>
        {own && <span style={{ marginLeft: 'auto' }}>Your details · {editsText(own.editsLeft).toLowerCase()}</span>}
      </div>

      {failed && (
        <div style={{ ...row, borderLeft: `2px solid ${RED}`, paddingLeft: 12 }}>
          <span style={{ flex: 1, fontSize: 14 }}>The last payment for your profile pack failed. Pay it to keep your pack.</span>
          <Link to="/checkout?item=invoice&kind=profiles" style={{ ...action, borderBottom: '1px solid rgba(244,236,220,.3)' }}>Pay now</Link>
        </div>
      )}

      {/* the way up or down */}
      {catalog.profilePacks.map(pack => {
        const mine = p.pack === pack.id;
        const up = !current || pack.extra > current.extra;
        // profiles are never deleted, so a smaller pack must still hold them all
        const fits = p.included + pack.extra >= p.used;
        return (
          <div key={pack.id} style={row}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 14.5 }}>{packName(pack)} · {euros(pack.amount)} a month</span>
              <span style={mono10}>{mine ? 'Your pack' : !fits ? `Holds ${p.included + pack.extra} profiles; you have ${p.used}` : current ? `${up ? 'Charged' : 'Credited'} the difference today, pro rata` : `Room for ${p.included + pack.extra} profiles`}</span>
            </div>
            {mine ? <span style={{ ...mono10, color: SAGE }}>Current</span>
              : status.entitled && fits && <Link to={`/checkout?item=profiles&pack=${pack.id}`} className="bl-line" style={{ ...action, borderBottom: '1px solid rgba(244,236,220,.3)' }}>{!current ? 'Choose' : up ? 'Upgrade' : 'Downgrade'}</Link>}
          </div>
        );
      })}

      {/* the rules */}
      <ul style={{ listStyle: 'none', margin: 0, padding: '14px 0 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {PROFILE_RULES.map(r => <li key={r} style={{ display: 'flex', gap: 10, ...sub }}><span style={{ fontFamily: MONO, color: SAGE }}>·</span><span>{r}</span></li>)}
      </ul>
      <Link to="/account" style={{ alignSelf: 'flex-start', marginTop: 12, ...mono10, textTransform: 'uppercase', letterSpacing: '.12em', borderBottom: '1px solid rgba(244,236,220,.3)' }}>Manage saved people</Link>
    </section>
  );
}
