import { loadStripe } from '@stripe/stripe-js';
import { billingCatalog, billingStatus, billingSync } from './api.js';

/* Prices, plans and the publishable key all come from the API, so the
   amounts on screen are the amounts Stripe charges. */
let catalog = null;
export const getCatalog = () => {
  catalog = catalog || billingCatalog().catch(e => { catalog = null; throw e; });
  return catalog;
};

let stripe = null;
export const getStripe = () => {
  stripe = stripe || getCatalog().then(c => loadStripe(c.publishableKey));
  return stripe;
};

/* One status request shared by every page until a payment changes it. */
let status = null;
export const getStatus = () => {
  status = status || billingStatus().catch(e => { status = null; throw e; });
  return status;
};
export const forgetStatus = () => { status = null; };

export const euros = cents => {
  const v = cents / 100;
  return `€${Number.isInteger(v) ? v : v.toFixed(2)}`;
};

export const minutesText = seconds => {
  const m = Math.floor(seconds / 60);
  return `${m} min`;
};

export const cadence = months => (months === 1 ? 'month' : `${months} months`);

export const longDate = iso => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

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
