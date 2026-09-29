import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import Starfield from '../components/Starfield.jsx';
import { addProfileSlot, buyMinutes, changePlan, getCard, payOpenInvoice, saveCard, startCardSetup, subscribe } from '../lib/api.js';
import { appearance, cadence, euros, fonts, forgetStatus, getCatalog, getStatus, getStripe, settle } from '../lib/billing.js';

/* Every payment in the app happens here, on our own page with Stripe
   Elements: a plan, a trial, an extra profile, a minute pack, an unpaid
   invoice, or a new card. The query string says which:

     ?item=plan&plan=starter[&trial=1]   ?item=change&plan=gold
     ?item=profile                       ?item=minutes&pack=pack_10&qty=2
     ?item=invoice&kind=plan|profiles    ?item=card
   plus an optional &next=/path for where to go afterwards. */

const MONO = "'IBM Plex Mono',monospace";
const SERIF = "'Cormorant Garamond',Georgia,serif";
const INK = '#F4ECDC', NAVY = '#1C2538', GOLD = '#B4933F', SAGE = '#5F8B7A';
const MUTED = 'rgba(244,236,220,.68)';

const eyebrow = { fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: SAGE };
const cta = on => ({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', height: 52, padding: '0 18px 0 20px', background: on ? INK : 'rgba(244,236,220,.25)', color: NAVY, border: 'none', borderRadius: 2, cursor: on ? 'pointer' : 'wait', fontFamily: "'Instrument Sans',sans-serif", fontWeight: 500, fontSize: 15.5 });
const quiet = { background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: MUTED };

/** What is being bought, how to start paying for it, and when it has landed. */
function describe(q, catalog) {
  const item = q.get('item');
  const plan = catalog.plans.find(p => p.tier === q.get('plan'));
  if ((item === 'plan' || item === 'change') && plan) {
    const trial = item === 'plan' && q.get('trial') === '1' && plan.tier === catalog.trial.tier;
    const lines = trial
      ? [[`${catalog.trial.days}-day trial`, euros(catalog.trial.amount)], [`Then ${plan.name}, every ${cadence(plan.months)}`, euros(plan.amount)]]
      : [[`${plan.name}, every ${cadence(plan.months)}`, euros(plan.amount)]];
    return item === 'plan' ? {
      title: trial ? `Try ${plan.name} for ${catalog.trial.days} days.` : `${plan.name}, every ${cadence(plan.months)}.`,
      lines, dueToday: trial ? catalog.trial.amount : plan.amount,
      notes: trial
        ? [`${catalog.trial.minutes} astrologer minutes during the trial.`, `After ${catalog.trial.days} days ${plan.name} starts at ${euros(plan.amount)} a month on the same card, unless you cancel first.`]
        : [`${plan.minutes} astrologer minutes every ${cadence(plan.months)}.`, `Renews automatically. Cancel any time from the billing page.`],
      start: () => subscribe(plan.tier, trial),
      done: s => s.entitled,
      // the dashboard sends a new account on to its birth details
      next: '/dashboard',
      cta: 'Continue to payment'
    } : {
      title: `Switch to ${plan.name}.`,
      lines, dueToday: null,
      notes: ['The switch happens now and a new billing period starts today.', 'Whatever is left of your current plan is credited against the new price.', 'Astrologer minutes already used this period still count.'],
      start: () => changePlan(plan.tier),
      done: s => s.plan && s.plan.tier === plan.tier && s.entitled,
      next: '/billing',
      cta: `Switch to ${plan.name}`
    };
  }
  if (item === 'profile') return {
    title: 'One more profile.',
    lines: [['Extra profile, every month', euros(catalog.profileSlot.amount)]], dueToday: null,
    notes: ['Charged today for the rest of this month, then monthly with your other profiles.', 'Removing a profile lowers the monthly total from the next invoice.'],
    start: addProfileSlot,
    // one more paid slot than when checkout opened; counting free slots fails
    // for an account that already holds more profiles than it pays for
    done: s => s.profiles.extra >= Number(q.get('slots')),
    next: '/account?add=1',
    cta: 'Add a profile'
  };
  if (item === 'minutes') {
    const pack = catalog.minutePacks.find(p => p.id === q.get('pack'));
    const qty = Math.min(catalog.maxPackQuantity, Math.max(1, parseInt(q.get('qty'), 10) || 1));
    if (pack) return {
      title: `${pack.minutes * qty} more minutes with your astrologer.`,
      lines: [[`${qty} × ${pack.minutes}-minute pack`, euros(pack.amount * qty)]], dueToday: pack.amount * qty,
      notes: ['Paid once. Top-up minutes never expire and are used after your plan minutes.'],
      start: () => buyMinutes(pack.id, qty),
      done: () => true,
      next: '/billing',
      cta: 'Continue to payment'
    };
  }
  if (item === 'invoice') {
    const kind = q.get('kind') === 'profiles' ? 'profiles' : 'plan';
    return {
      title: 'Settle your last invoice.',
      lines: [], dueToday: null,
      notes: ['Your last payment did not go through. Pay it here and everything unlocks again.'],
      start: () => payOpenInvoice(kind),
      done: s => (kind === 'plan' ? s.entitled : s.profiles.status === 'active'),
      next: '/billing',
      cta: 'Continue to payment'
    };
  }
  if (item === 'card') return { card: true, title: 'A new card for renewals.', lines: [], notes: ['Every renewal and top-up is charged to this card from now on. Nothing is charged today.'], next: '/billing' };
  return null;
}

export default function Checkout() {
  const [q, setQ] = useSearchParams();
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState('review'); // review | pay | finishing | done
  const [intent, setIntent] = useState(null); // { clientSecret, amount, description, paymentIntentId }
  const [card, setCard] = useState(null);
  const [busy, setBusy] = useState(false);
  const [freeSlot, setFreeSlot] = useState(false);
  const [after, setAfter] = useState(null); // status once the payment landed
  const started = useRef(false);

  const order = useMemo(() => (catalog ? describe(q, catalog) : null), [q, catalog]);
  const next = (q.get('next') || '').startsWith('/') ? q.get('next') : order && order.next;

  useEffect(() => {
    getCatalog().then(setCatalog).catch(e => setError(e.message));
    getStatus()
      .then(s => {
        setFreeSlot(s.profiles.used < s.profiles.included + s.profiles.extra);
        // the target rides in the URL so it survives a 3-D Secure redirect
        if (q.get('item') === 'profile' && !q.get('slots')) {
          setQ(prev => { const n = new URLSearchParams(prev); n.set('slots', String(s.profiles.extra + 1)); return n; }, { replace: true });
        }
      })
      .catch(e => { if (e.status === 401) navigate('/login'); });
    getCard().then(r => setCard(r.card)).catch(() => {});
  }, [navigate]);

  /* The final stretch, also reached when Stripe sends the browser back from a bank's 3-D Secure page. */
  const finish = async paymentIntentId => {
    setStep('finishing'); setError('');
    try {
      const s = await settle(order.done, paymentIntentId);
      setAfter(s);
      if (!order.done(s)) setError('Your payment went through and is still being confirmed. This page will be up to date in a minute.');
      setStep('done');
    } catch (e) { setError(e.message); setStep('done'); }
  };

  useEffect(() => {
    if (!order || started.current) return;
    const returned = q.get('payment_intent_client_secret');
    const setupReturned = q.get('setup_intent');
    if (returned) {
      started.current = true;
      getStripe().then(stripe => stripe.retrievePaymentIntent(returned)).then(({ paymentIntent }) => {
        if (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing')) finish(paymentIntent.id);
        else { setError('The payment was not completed. Try again or use another card.'); setStep('review'); started.current = false; }
      });
    } else if (setupReturned && q.get('redirect_status') === 'succeeded') {
      started.current = true;
      setStep('finishing');
      saveCard(setupReturned).then(r => { setCard(r.card); forgetStatus(); setStep('done'); }).catch(e => { setError(e.message); setStep('done'); });
    } else if (order.card) {
      // saving a card charges nothing, so its form can open straight away
      started.current = true;
      startCardSetup().then(r => { setIntent(r); setStep('pay'); }).catch(e => setError(e.message));
    }
  }, [order]); // eslint-disable-line react-hooks/exhaustive-deps

  const begin = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const r = await order.start();
      forgetStatus();
      // nothing left to pay: the saved card was charged, or nothing was due
      if (!r.clientSecret) return await finish(r.paymentIntentId);
      setIntent(r); setStep('pay');
    } catch (e) {
      setError(e.message);
    } finally { setBusy(false); }
  };

  if (!order && catalog) return <Shell><p style={{ color: MUTED }}>There is nothing to pay for here. <Link to="/subscription">See plans</Link></p></Shell>;

  return (
    <Shell>
      {!order ? <span style={eyebrow}>{error || 'Loading…'}</span> : (
        <div className="co-grid" style={{ display: 'grid', gap: 36, alignItems: 'start' }}>
          <section style={{ display: 'flex', flexDirection: 'column', gap: 18, animation: 'om-rise .45s cubic-bezier(.3,0,.2,1) both' }}>
            <span style={eyebrow}>{step === 'done' ? 'Confirmed' : 'Checkout'}</span>
            <h1 style={{ margin: 0, fontFamily: SERIF, fontWeight: 500, fontSize: 'clamp(30px,6vw,42px)', lineHeight: 1.08, textWrap: 'balance' }}>{order.title}</h1>
            {order.lines.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', borderTop: `1px solid ${INK}` }}>
                {order.lines.map(([label, price]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '12px 0', borderBottom: '1px solid rgba(244,236,220,.18)', fontSize: 15 }}>
                    <span>{label}</span><span style={{ fontFamily: MONO }}>{price}</span>
                  </div>
                ))}
                {(intent && intent.amount != null ? intent.amount : order.dueToday) != null && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '12px 0', fontFamily: MONO, fontSize: 12, letterSpacing: '.1em', textTransform: 'uppercase' }}>
                    <span>Due today</span><span style={{ color: GOLD, fontSize: 15 }}>{euros(intent && intent.amount != null ? intent.amount : order.dueToday)}</span>
                  </div>
                )}
              </div>
            )}
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {order.notes.map(n => <li key={n} style={{ display: 'flex', gap: 10, fontSize: 14, lineHeight: 1.5, color: MUTED }}><span style={{ fontFamily: MONO, color: SAGE }}>·</span><span>{n}</span></li>)}
            </ul>
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '22px 22px 24px', border: '1px solid rgba(244,236,220,.22)', background: 'rgba(28,37,56,.75)', animation: 'om-rise .45s cubic-bezier(.3,0,.2,1) .08s both' }}>
            {error && <div role="alert" style={{ borderLeft: `2px solid ${GOLD}`, background: 'rgba(180,147,63,.12)', padding: '10px 14px', fontSize: 14, lineHeight: 1.45 }}>{error}</div>}

            {step === 'review' && q.get('item') === 'profile' && freeSlot && (
              <>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: MUTED }}>You have a profile slot free already, so there is nothing to buy.</p>
                <Link to="/account?add=1" className="hov-cream" style={{ ...cta(true), borderBottom: 'none' }}>
                  <span>Add the profile</span><span style={{ fontFamily: MONO, fontSize: 13, opacity: .8 }}>→</span>
                </Link>
              </>
            )}

            {step === 'review' && !order.card && !(q.get('item') === 'profile' && freeSlot) && (
              <>
                {q.get('item') === 'profile' && !q.get('slots') ? <span style={eyebrow}>Loading…</span> : <>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: MUTED }}>{card ? `Your ${brand(card.brand)} ending ${card.last4} is on file.` : 'Card details come next, on this page. They go straight to Stripe and never touch our servers.'}</p>
                <button type="button" onClick={begin} disabled={busy} className="hov-cream" style={cta(!busy)}>
                  <span>{busy ? 'One moment…' : order.cta}</span><span style={{ fontFamily: MONO, fontSize: 13, opacity: .8 }}>→</span>
                </button>
                </>}
              </>
            )}

            {step === 'pay' && intent && intent.clientSecret && (
              <StripeForm key={intent.clientSecret} clientSecret={intent.clientSecret} setup={!!order.card} savedCard={order.card ? null : card} amount={intent.amount}
                onPaid={pi => (order.card ? null : finish(pi))}
                onSaved={c => { setCard(c); forgetStatus(); setStep('done'); }}
                onError={setError} />
            )}

            {step === 'finishing' && <span style={eyebrow}>Confirming with Stripe…</span>}

            {step === 'done' && (
              <>
                <p style={{ margin: 0, fontFamily: SERIF, fontSize: 22, lineHeight: 1.3 }}>{order.card ? (card ? `${brand(card.brand)} ending ${card.last4} is now your card.` : 'Card saved.') : 'Thank you. It is all set.'}</p>
                {q.get('item') === 'profile' && after && after.profiles.used >= after.profiles.included + after.profiles.extra && (
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: MUTED }}>You now pay for {after.profiles.extra} extra {after.profiles.extra === 1 ? 'profile' : 'profiles'} and hold {after.profiles.used} in total, so every slot is in use. Add another slot to save someone new.</p>
                )}
                <button type="button" onClick={() => navigate(next)} className="hov-cream" style={cta(true)}>
                  <span>Continue</span><span style={{ fontFamily: MONO, fontSize: 13, opacity: .8 }}>→</span>
                </button>
              </>
            )}

            <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(244,236,220,.4)' }}>Payments by Stripe · prices in euro, VAT included</span>
          </section>
        </div>
      )}
    </Shell>
  );
}

const brand = b => (b ? b.charAt(0).toUpperCase() + b.slice(1) : 'Card');

/** The Payment Element for one client secret; a saved card can pay without it. */
function StripeForm(props) {
  const [stripe, setStripe] = useState(null);
  useEffect(() => { getStripe().then(setStripe); }, []);
  if (!stripe) return <span style={eyebrow}>Loading the secure form…</span>;
  return (
    <Elements stripe={stripe} options={{ clientSecret: props.clientSecret, appearance, fonts }}>
      <PayForm {...props} />
    </Elements>
  );
}

function PayForm({ clientSecret, setup, savedCard, amount, onPaid, onSaved, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [useSaved, setUseSaved] = useState(!!savedCard);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  // Stripe sends the browser back here after a bank redirect; the query keeps the order
  const returnUrl = window.location.href.split('#')[0];

  const pay = async () => {
    if (!stripe || !elements || busy) return;
    setBusy(true); onError('');
    try {
      if (setup) {
        const { error, setupIntent } = await stripe.confirmSetup({ elements, confirmParams: { return_url: returnUrl }, redirect: 'if_required' });
        if (error) throw error;
        onSaved((await saveCard(setupIntent.id)).card);
        return;
      }
      const { error, paymentIntent } = useSaved
        ? await stripe.confirmPayment({ clientSecret, confirmParams: { payment_method: savedCard.id, return_url: returnUrl }, redirect: 'if_required' })
        : await stripe.confirmPayment({ elements, confirmParams: { return_url: returnUrl }, redirect: 'if_required' });
      if (error) throw error;
      if (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing') onPaid(paymentIntent.id);
      else throw new Error('The payment was not completed. Try again or use another card.');
    } catch (e) {
      onError(e.message || 'The payment did not go through.');
    } finally { setBusy(false); }
  };

  const can = !!stripe && (useSaved || ready) && !busy;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {savedCard && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, borderTop: '1px solid rgba(244,236,220,.18)' }}>
          {[[true, `${brand(savedCard.brand)} •••• ${savedCard.last4}`, `Expires ${String(savedCard.expMonth).padStart(2, '0')}/${String(savedCard.expYear).slice(-2)}`], [false, 'Another card', '']].map(([v, label, note]) => (
            <label key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid rgba(244,236,220,.18)', cursor: 'pointer', fontSize: 14.5 }}>
              <input type="radio" name="method" checked={useSaved === v} onChange={() => setUseSaved(v)} style={{ accentColor: GOLD }} />
              <span style={{ flex: 1 }}>{label}</span>
              <span style={{ fontFamily: MONO, fontSize: 10, color: MUTED }}>{note}</span>
            </label>
          ))}
        </div>
      )}
      <div style={{ display: useSaved ? 'none' : 'block' }}>
        {/* card only: no wallets, and no Link sign-up asking for contact details */}
        <PaymentElement onReady={() => setReady(true)} options={{ layout: 'tabs', wallets: { applePay: 'never', googlePay: 'never', link: 'never' } }} />
      </div>
      <button type="button" onClick={pay} disabled={!can} className="hov-cream" style={cta(can)}>
        <span>{busy ? 'Processing…' : setup ? 'Save card' : `Pay ${euros(amount)}`}</span>
        <span style={{ fontFamily: MONO, fontSize: 13, opacity: .8 }}>→</span>
      </button>
    </div>
  );
}

function Shell({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: NAVY, color: INK, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <style>{`.co-grid{grid-template-columns:1fr}@media(min-width:880px){.co-grid{grid-template-columns:1.1fr .9fr}}`}</style>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}><Starfield /></div>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'rgba(28,37,56,.6)' }} />
      <header style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '18px 24px', borderBottom: '1px solid rgba(244,236,220,.2)', maxWidth: 1100, width: '100%', margin: '0 auto' }}>
        <Link to="/subscription" style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', borderBottom: 'none' }}>← Plans</Link>
        <Link to="/" style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 18, letterSpacing: '.14em', textTransform: 'uppercase', borderBottom: 'none' }}>AstroMeridian</Link>
        <span style={{ ...quiet, cursor: 'default', display: 'flex', alignItems: 'center', gap: 6 }}><svg width="10" height="12" viewBox="0 0 10 12" aria-hidden="true"><rect x="1" y="5" width="8" height="6.5" rx="1" fill="none" stroke="currentColor" /><path d="M3 5V3.5a2 2 0 0 1 4 0V5" fill="none" stroke="currentColor" /></svg>Secure</span>
      </header>
      <main style={{ position: 'relative', flex: 1, width: '100%', maxWidth: 1100, margin: '0 auto', padding: '36px 24px 56px' }}>{children}</main>
    </div>
  );
}

