import { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { billingCatalog, billingStatus, billingSync } from './api.js';
import { locale, t } from '../i18n/index.js';

/* Prices, plans and the publishable key all come from the API, so the
   amounts on screen are the amounts Stripe charges. */
let catalog = null;
let currency = null;
export const getCatalog = () => {
  catalog = catalog || billingCatalog().then(c => { currency = c.currency; return c; }).catch(e => { catalog = null; throw e; });
  return catalog;
};

/* false when the API runs with PAYMENTS_ENABLED=false: the whole app is free and
   nothing is sold, so no page may ask for money. null while still unknown. */
export function useSales() {
  const [on, setOn] = useState(null);
  useEffect(() => { getCatalog().then(c => setOn(c.paymentsEnabled !== false)).catch(() => setOn(true)); }, []);
  return on;
}

let stripe = null;
export const getStripe = () => {
  stripe = stripe || getCatalog().then(c => loadStripe(c.publishableKey, { developerTools: { assistant: { enabled: false } } }));
  return stripe;
};

/* One status request shared by every page until a payment changes it. */
let status = null;
export const getStatus = () => {
  status = status || billingStatus().catch(e => { status = null; throw e; });
  return status;
};
export const forgetStatus = () => { status = null; };
// another account signed in or out (lib/api.js): its status is not ours
window.addEventListener('meridian:session', forgetStatus);

/** Cents in the catalog's currency (or `cur`, e.g. a receipt's own). */
export const money = (cents, cur = currency) => {
  const v = cents / 100, d = Number.isInteger(v) ? 0 : 2;
  return new Intl.NumberFormat(locale(), { ...(cur && { style: 'currency', currency: cur.toUpperCase() }), minimumFractionDigits: d, maximumFractionDigits: d }).format(v);
};

/** The cheapest plan and the trial, for a teaser line; null until the catalog is in. */
export const fromPrices = c => {
  if (!c || !c.plans.length) return null;
  return { price: money(Math.min(...c.plans.map(p => p.amount))), trial: c.trial && money(c.trial.amount), days: c.trial && c.trial.days };
};

export const minutesText = seconds => {
  const m = Math.floor(seconds / 60);
  return `${m} min`;
};

/** Lifetime edits per profile, as the API enforces them. */
export const EDIT_LIMITS = { primary: 3, extra: 1 };
export const editsText = n => (n === 0 ? t('No edits left') : t(n === 1 ? '{n} edit left' : '{n} edits left', { n }));

/** Palm readings: a count of them, and how many are left. */
export const palmReadings = n => t(n === 1 ? '{n} palm reading' : '{n} palm readings', { n });
export const readingsLeft = n => t(n === 1 ? '{n} reading left' : '{n} readings left', { n });

export const packName = p => t(p.extra === 1 ? '{n} extra profile' : '{n} extra profiles', { n: p.extra });

export const cadence = months => (months === 1 ? t('month') : t('{n} months', { n: months }));
export const every = months => (months === 1 ? t('every month') : t('every {n} months', { n: months }));

export const longDate = iso => new Date(iso).toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' });

/**
 * After the browser confirms a payment: pull the result from Stripe through
 * the API until `done(status)` holds. The webhook would get there too, this
 * just does not make the user wait for it.
 */
export async function settle(done, paymentIntentId, tries = 12) {
  let last = null;
  for (let i = 0; i < tries; i++) {
    last = await billingSync(paymentIntentId);
    status = Promise.resolve(last);
    if (done(last)) return last;
    await new Promise(r => setTimeout(r, 1500));
  }
  return last;
}

/* The Payment Element, dressed in the site's ink, cream and gold. */
export const appearance = {
  theme: 'night',
  variables: {
    colorPrimary: '#B4933F',
    colorBackground: '#222C42',
    colorText: '#F4ECDC',
    colorTextSecondary: 'rgba(244,236,220,.68)',
    colorTextPlaceholder: 'rgba(244,236,220,.35)',
    colorDanger: '#E08B7A',
    fontFamily: "'Instrument Sans', Helvetica, Arial, sans-serif",
    fontSizeBase: '15px',
    borderRadius: '2px',
    spacingUnit: '4px'
  },
  rules: {
    '.Input': { border: '1px solid rgba(244,236,220,.25)', boxShadow: 'none' },
    '.Input:focus': { border: '1px solid #F4ECDC', boxShadow: 'none' },
    '.Label': { fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', letterSpacing: '.14em', textTransform: 'uppercase' },
    '.Tab': { border: '1px solid rgba(244,236,220,.25)', boxShadow: 'none' },
    '.Tab--selected': { borderColor: '#B4933F' }
  }
};

export const fonts = [{ cssSrc: 'https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500&family=IBM+Plex+Mono:wght@400&display=swap' }];
