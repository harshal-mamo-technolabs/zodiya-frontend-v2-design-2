import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Starfield from '../components/Starfield.jsx';
import NavMenu from '../components/NavMenu.jsx';
import { cancelPlan, getCard, listReceipts, listProfiles, resumePlan } from '../lib/api.js';
import { EDIT_LIMITS, editsText, money, every, forgetStatus, getCatalog, getStatus, longDate, packName, palmReadings, readingsLeft } from '../lib/billing.js';
import { getLang, t } from '../i18n/index.js';

/* Plan, minutes, palm readings, profiles, card and receipts, and a way to change each. */

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
  if (plan.status === 'past_due' || plan.status === 'unpaid') return t('Payment failed · app paused');
  if (plan.status === 'canceled' || plan.status === 'incomplete_expired') return t('Ended');
  if (plan.status === 'incomplete') return t('Waiting for the first payment');
  if (plan.cancelAtPeriodEnd) return t('Ends {date}', { date: end });
  if (plan.trial) return t('Trial · {plan} starts {date}', { plan: plan.name, date: end });
  return t('Renews {date}', { date: end });
}

export default function Billing() {
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [card, setCard] = useState(undefined);
  const [receipts, setReceipts] = useState(null);
  const [error, setError] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [people, setPeople] = useState(null);

  useEffect(() => {
    // renewals and calls change the numbers behind our back; always ask afresh here
    forgetStatus();
    getStatus().then(setStatus).catch(e => (e.status === 401 ? navigate('/login') : setError(e.message)));
    getCatalog().then(setCatalog).catch(e => setError(e.message));
    getCard().then(r => setCard(r.card)).catch(() => setCard(null));
    listReceipts().then(setReceipts).catch(() => setReceipts([]));
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
  const palm = status && status.palm; // absent until the API counts palm readings
  const palmAllowance = plan && catalog ? (plan.trial ? catalog.trial.palm : tier && tier.palm) || 0 : 0;

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
          <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: SAGE }}>{t('Plan & billing')}</span>
          <h1 style={{ margin: 0, fontFamily: SERIF, fontWeight: 500, fontSize: 'clamp(30px,7vw,42px)', lineHeight: 1.08 }}>{plan && status.entitled ? t(plan.cancelAtPeriodEnd ? '{plan}, ending soon.' : '{plan}, active.', { plan: plan.trial ? t('{plan} trial', { plan: plan.name }) : plan.name }) : t('No active plan.')}</h1>
        </div>

        {error && <div role="alert" style={{ borderLeft: `2px solid ${GOLD}`, background: 'rgba(180,147,63,.12)', padding: '10px 14px', fontSize: 14 }}>{error}</div>}

        {status && catalog && (
          <>
            {/* ------------------------------------------- the three at a glance */}
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', animation: 'om-rise .45s cubic-bezier(.3,0,.2,1) both' }}>
              {[
                ['membership', t('01 · Membership'), tier && status.entitled ? (plan.trial ? t('{plan} trial', { plan: tier.name }) : tier.name) : t('No plan'), planLine(plan) || t('Choose a plan to start')],
                ['astrologer', t('02 · AI astrologer'), t('{n} min left', { n: mins(status.minutes.total) }), t('{plan} plan · {topup} top-up', { plan: mins(status.minutes.plan), topup: mins(status.minutes.topup) })],
                palm && ['palm', t('03 · Palm readings'), readingsLeft(palm.total), t('{plan} from plan · {topup} bought', { plan: palm.plan, topup: palm.topup })],
                ['profiles', t('04 · Profiles'), t('{used} of {total} slots', { used: status.profiles.used, total: status.profiles.included + status.profiles.extra }), status.profiles.pack ? t('{pack} pack', { pack: packName(catalog.profilePacks.find(x => x.id === status.profiles.pack)) }) : t('Your own profile only')]
              ].filter(Boolean).map(([id, label, value, note]) => (
                <button key={id} type="button" onClick={() => document.getElementById(id).scrollIntoView({ behavior: 'smooth', block: 'start' })} className="bl-line" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, padding: '16px 16px 14px', border: '1px solid rgba(244,236,220,.22)', background: 'rgba(17,23,37,.55)', color: INK, textAlign: 'left', cursor: 'pointer', font: 'inherit' }}>
                  <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.14em', textTransform: 'uppercase', color: GOLD }}>{label}</span>
                  <span style={{ fontFamily: SERIF, fontSize: 26, lineHeight: 1.05 }}>{value}</span>
                  <span style={mono10}>{note}</span>
                </button>
              ))}
            </div>

            {/* ----------------------------------------------------- plan */}
            <Card id="membership" n="01" title={t('Membership')} delay={0.05} status={<span style={{ ...mono10, color: failed ? RED : MUTED }}>{planLine(plan) || t('None')}</span>}>
              {failed && (
                <div style={{ ...row, borderLeft: `2px solid ${RED}`, paddingLeft: 12, background: 'rgba(196,106,90,.1)' }}>
                  <span style={{ flex: 1, fontSize: 14, lineHeight: 1.5 }}>{t('Your renewal payment failed. Pay the invoice, or replace your card below and pay it.')}</span>
                  <Link to="/checkout?item=invoice&kind=plan" style={{ ...action, borderBottom: '1px solid rgba(244,236,220,.3)' }}>{t('Pay now')}</Link>
                </div>
              )}
              {tier && status.entitled ? (
                <div style={row}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ fontSize: 15 }}>{tier.name} · {money(tier.amount)} {every(tier.months)}</span>
                    <span style={mono10}>{plan.trial ? t('{minutes} astrologer minutes during the trial', { minutes: catalog.trial.minutes }) : t('{minutes} astrologer minutes {every}', { minutes: tier.minutes, every: every(tier.months) })}</span>
                  </div>
                  <Link to="/subscription" className="bl-line" style={{ ...action, borderBottom: '1px solid rgba(244,236,220,.3)' }}>{t('Change plan')}</Link>
                </div>
              ) : !failed && (
                <div style={row}>
                  <span style={{ flex: 1, fontSize: 14.5, color: MUTED }}>{t('Choose a plan to open the app again.')}</span>
                  <Link to="/subscription" className="bl-line" style={{ ...action, borderBottom: '1px solid rgba(244,236,220,.3)' }}>{t('See plans')}</Link>
                </div>
              )}
              {status.entitled && (
                <div style={{ paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {plan.cancelAtPeriodEnd ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 13.5, color: MUTED }}>{t('Everything stays open until {date}. Nothing more will be charged.', { date: longDate(plan.currentPeriodEnd) })}</span>
                      <button type="button" disabled={busy} onClick={() => toggleCancel(false)} className="bl-line" style={action}>{t('Keep my plan')}</button>
                    </div>
                  ) : confirmCancel ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, animation: 'om-fade .25s ease both' }}>
                      <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: 'rgba(244,236,220,.75)' }}>{t(status.profiles.extra ? (plan.trial ? 'Your plan and extra profiles will stop renewing. You keep access until {date}, and the trial will not turn into a paid plan.' : 'Your plan and extra profiles will stop renewing. You keep access until {date}.') : (plan.trial ? 'Your plan will stop renewing. You keep access until {date}, and the trial will not turn into a paid plan.' : 'Your plan will stop renewing. You keep access until {date}.'), { date: longDate(plan.currentPeriodEnd) })}</p>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button type="button" disabled={busy} onClick={() => toggleCancel(true)} style={{ ...action, borderColor: 'rgba(196,106,90,.7)', color: RED }}>{busy ? t('Cancelling') : t('Cancel renewal')}</button>
                        <button type="button" onClick={() => setConfirmCancel(false)} style={{ ...action, border: 'none', color: MUTED }}>{t('Never mind')}</button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setConfirmCancel(true)} style={{ alignSelf: 'flex-start', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontFamily: MONO, fontSize: 9.5, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(244,236,220,.45)' }}>{t('Cancel plan')}</button>
                  )}
                </div>
              )}
            </Card>

            {/* --------------------------------------------------- minutes */}
            <Card id="astrologer" n="02" title={t('AI astrologer')} delay={0.1} status={<span style={mono10}>{t('{n} min left', { n: mins(status.minutes.total) })}</span>}>
              <div style={{ ...row, flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 14.5 }}>
                  <span>{t('From your plan')}</span><span style={{ fontFamily: MONO }}>{t('{n} of {total} min', { n: mins(status.minutes.plan), total: mins(allowance) })}</span>
                </div>
                <div aria-hidden="true" style={{ height: 3, background: 'rgba(244,236,220,.14)' }}>
                  <div style={{ height: '100%', width: `${allowance ? Math.min(100, (status.minutes.plan / allowance) * 100) : 0}%`, background: GOLD, transition: 'width .4s ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 14.5 }}>
                  <span>{t('Top-ups')}</span><span style={{ fontFamily: MONO }}>{mins(status.minutes.topup)} min</span>
                </div>
                <span style={mono10}>{t('Plan minutes reset at each renewal and are used first. Top-ups never expire.')}</span>
              </div>
              {status.entitled && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 16 }}>
                  <span style={{ ...mono10, textTransform: 'uppercase', letterSpacing: '.14em' }}>{t('Top up')}</span>
                  {/* three equal tiles: they never wrap two-and-one on a phone */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8 }}>
                    {catalog.minutePacks.map(p => (
                      <Link key={p.id} to={`/checkout?item=minutes&pack=${p.id}&qty=1`} className="bl-line" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '12px 6px 10px', border: '1px solid rgba(180,147,63,.45)', background: 'rgba(180,147,63,.06)', color: INK, borderBottom: '1px solid rgba(180,147,63,.45)', textAlign: 'center' }}>
                        <span style={{ fontFamily: SERIF, fontSize: 28, lineHeight: 1 }}>+{p.minutes}</span>
                        <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.12em', textTransform: 'uppercase', color: MUTED }}>min</span>
                        <span style={{ fontFamily: MONO, fontSize: 12, color: GOLD, marginTop: 4 }}>{money(p.amount)}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* ---------------------------------------------- palm readings */}
            {palm && (
              <Card id="palm" n="03" title={t('Palm readings')} delay={0.12} status={<span style={mono10}>{readingsLeft(palm.total)}</span>}>
                <div style={{ ...row, flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 14.5 }}>
                    <span>{t('From your plan')}</span><span style={{ fontFamily: MONO }}>{t('{n} of {total}', { n: palm.plan, total: palmAllowance })}</span>
                  </div>
                  <div aria-hidden="true" style={{ height: 3, background: 'rgba(244,236,220,.14)' }}>
                    <div style={{ height: '100%', width: `${palmAllowance ? Math.min(100, (palm.plan / palmAllowance) * 100) : 0}%`, background: GOLD, transition: 'width .4s ease' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 14.5 }}>
                    <span>{t('Bought')}</span><span style={{ fontFamily: MONO }}>{palm.topup}</span>
                  </div>
                  <span style={mono10}>{t('Plan readings reset at each renewal and are used first. A photo that cannot be read costs nothing.')}</span>
                </div>
                {status.entitled && (catalog.palmPacks || []).length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 16 }}>
                    <span style={{ ...mono10, textTransform: 'uppercase', letterSpacing: '.14em' }}>{t('Buy more')}</span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8 }}>
                      {catalog.palmPacks.map(p => (
                        <Link key={p.id} to={`/checkout?item=palm&pack=${p.id}&qty=1&next=/billing`} aria-label={`${palmReadings(p.readings)} · ${money(p.amount)}`} className="bl-line" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '12px 6px 10px', border: '1px solid rgba(180,147,63,.45)', background: 'rgba(180,147,63,.06)', color: INK, borderBottom: '1px solid rgba(180,147,63,.45)', textAlign: 'center' }}>
                          <span style={{ fontFamily: SERIF, fontSize: 28, lineHeight: 1 }}>+{p.readings}</span>
                          <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.12em', textTransform: 'uppercase', color: MUTED }}>{t('readings')}</span>
                          <span style={{ fontFamily: MONO, fontSize: 12, color: GOLD, marginTop: 4 }}>{money(p.amount)}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* -------------------------------------------------- profiles */}
            <ProfilesSection status={status} catalog={catalog} people={people} />

            {/* ----------------------------------- payment details, not a product */}
            <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: SAGE, paddingTop: 10 }}>{t('Payment details')}</span>
            <section style={section(0.2)}>
              <div style={head}><h2 style={h2}>{t('Payment method')}</h2></div>
              <div style={row}>
                <span style={{ flex: 1, fontSize: 14.5 }}>{card === undefined ? '…' : card ? t('{brand} ending {last4} · expires {date}', { brand: cap(card.brand), last4: card.last4, date: `${String(card.expMonth).padStart(2, '0')}/${card.expYear}` }) : t('No card saved yet')}</span>
                {plan && <Link to="/checkout?item=card" className="bl-line" style={{ ...action, borderBottom: '1px solid rgba(244,236,220,.3)' }}>{card ? t('Replace') : t('Add card')}</Link>}
              </div>
            </section>

            {/* --------------------------------------------------- receipts */}
            <section style={section(0.25)}>
              <div style={head}><h2 style={h2}>{t('Receipts')}</h2><span style={mono10}>{receipts ? t(receipts.length === 1 ? '{n} payment' : '{n} payments', { n: receipts.length }) : ''}</span></div>
              {receipts && receipts.length === 0 && <span style={{ ...row, color: MUTED, fontSize: 14 }}>{t('No payments yet.')}</span>}
              {receipts && receipts.map(r => (
                <div key={r.id} style={row}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                    <span style={{ fontSize: 14.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description}</span>
                    <span style={mono10}>{longDate(r.created)}{r.refunded ? ` · ${t('refunded')}` : ''}</span>
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: 13 }}>{money(r.amount, r.currency)}</span>
                  {/* Stripe's own receipt page for this payment, nothing else */}
                  {r.receiptUrl && <a href={r.receiptUrl} target="_blank" rel="noreferrer" style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.12em', textTransform: 'uppercase', color: GOLD, borderBottom: 'none', whiteSpace: 'nowrap' }}>{t('Receipt ↗')}</a>}
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
  'Details are fixed once saved: your own profile can be corrected {n} times, each saved person once. The portrait and relationship are free to change.',
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
    <Card id="profiles" n="04" title={t('Profiles')} delay={0.15} status={<span style={mono10}>{t('{used} of {total} slots used', { used: p.used, total: slots })}</span>}>

      {/* the pack you pay for */}
      <div style={row}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontSize: 14.5 }}>{current ? t('{pack} pack · {price} a month', { pack: packName(current), price: money(current.amount) }) : t('No profile pack')}</span>
          <span style={mono10}>{current ? t('Room for {n} profiles, your own included', { n: slots }) : t('Your own profile is included with your plan')}</span>
        </div>
      </div>

      {/* how the slots are used */}
      <div style={{ display: 'flex', gap: 3, padding: '14px 0 6px' }} aria-hidden="true">
        {Array.from({ length: Math.max(slots, p.used) }, (_, i) => (
          <span key={i} style={{ flex: 1, height: 6, background: i === 0 ? INK : i < p.used - off ? SAGE : i < p.used ? 'rgba(180,147,63,.6)' : 'rgba(244,236,220,.15)' }} />
        ))}
      </div>
      <div style={{ ...row, flexWrap: 'wrap', gap: '4px 18px', ...mono10 }}>
        <span>{t('Yours · 1')}</span>
        <span style={{ color: SAGE }}>{t('Saved, on · {n}', { n: extras.length - off })}</span>
        <span style={{ color: GOLD }}>{t('Switched off · {n}', { n: off })}</span>
        <span>{t('Free · {n}', { n: Math.max(0, slots - p.used) })}</span>
        {own && <span style={{ marginLeft: 'auto' }}>{t('Your details · {edits}', { edits: getLang() === 'en' ? editsText(own.editsLeft).toLowerCase() : editsText(own.editsLeft) })}</span>}
      </div>

      {failed && (
        <div style={{ ...row, borderLeft: `2px solid ${RED}`, paddingLeft: 12 }}>
          <span style={{ flex: 1, fontSize: 14 }}>{t('The last payment for your profile pack failed. Pay it to keep your pack.')}</span>
          <Link to="/checkout?item=invoice&kind=profiles" style={{ ...action, borderBottom: '1px solid rgba(244,236,220,.3)' }}>{t('Pay now')}</Link>
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
              <span style={{ fontSize: 14.5 }}>{t('{pack} · {price} a month', { pack: packName(pack), price: money(pack.amount) })}</span>
              <span style={mono10}>{mine ? t('Your pack') : !fits ? t('Holds {n} profiles; you have {used}', { n: p.included + pack.extra, used: p.used }) : current ? t(up ? 'Charged the difference today, pro rata' : 'Credited the difference today, pro rata') : t('Room for {n} profiles', { n: p.included + pack.extra })}</span>
            </div>
            {mine ? <span style={{ ...mono10, color: SAGE }}>{t('Current')}</span>
              : status.entitled && fits && <Link to={`/checkout?item=profiles&pack=${pack.id}`} className="bl-line" style={{ ...action, borderBottom: '1px solid rgba(244,236,220,.3)' }}>{!current ? t('Choose') : up ? t('Upgrade') : t('Downgrade')}</Link>}
          </div>
        );
      })}

      {/* the rules, folded away until asked for */}
      <details style={{ paddingTop: 14 }}>
        <summary style={{ cursor: 'pointer', ...mono10, textTransform: 'uppercase', letterSpacing: '.12em' }}>{t('How profile packs work')}</summary>
        <ul style={{ listStyle: 'none', margin: 0, padding: '10px 0 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {PROFILE_RULES.map(r => <li key={r} style={{ display: 'flex', gap: 10, ...sub }}><span style={{ fontFamily: MONO, color: SAGE }}>·</span><span>{t(r, { n: EDIT_LIMITS.primary })}</span></li>)}
        </ul>
      </details>
      <Link to="/account" style={{ alignSelf: 'flex-start', marginTop: 12, ...mono10, textTransform: 'uppercase', letterSpacing: '.12em', borderBottom: '1px solid rgba(244,236,220,.3)' }}>{t('Manage saved people')}</Link>
    </Card>
  );
}

/* One product, one box: its number and name, its status on the right, then the detail. */
function Card({ id, n, title, status, delay, children }) {
  return (
    <section id={id} style={{ ...section(delay), scrollMarginTop: 16, border: '1px solid rgba(244,236,220,.18)', background: 'rgba(17,23,37,.55)', padding: '18px 20px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', paddingBottom: 12, borderBottom: `1px solid ${INK}` }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{ fontFamily: MONO, fontSize: 10, color: GOLD }}>{n}</span>
          <h2 style={{ margin: 0, fontFamily: SERIF, fontWeight: 500, fontSize: 26, lineHeight: 1.1 }}>{title}</h2>
        </div>
        {status}
      </div>
      {children}
    </section>
  );
}
