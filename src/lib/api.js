/* Production builds call the API subdomain set in VITE_API_URL (.env). In dev
   it is unset and calls go through Vite's /api proxy. */
const BASE = import.meta.env.VITE_API_URL || '/api';

export class ApiError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors || [];
    // plan_required, profile_slot_required, minutes_exhausted
    this.code = (this.errors[0] && this.errors[0].code) || null;
  }
}

/* Pages a lapsed account may still open; anything else is sent to pricing. */
const OPEN_PAGES = ['/', '/login', '/signup', '/subscription', '/checkout', '/billing', '/account'];

/** The API reports both validation and thrown errors as { errors: [{ msg }] }. */
function messageFrom(data, status) {
  const msg = data && Array.isArray(data.errors) && data.errors[0] && data.errors[0].msg;
  if (msg) return msg;
  if (status === 401) return 'Your session has expired. Please log in again.';
  return `Request failed (${status})`;
}

/* The access cookie lives an hour. When it lapses the first 401 triggers one
   refresh, shared by every request that fails in the same moment, and the
   original request is retried once. Sign-in itself never refreshes. */
const NO_REFRESH = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];
let refreshing = null;
const refreshSession = () => {
  refreshing = refreshing || fetch(BASE + '/auth/refresh', { method: 'POST', credentials: 'include' })
    .then(r => r.ok)
    .catch(() => false)
    .finally(() => { refreshing = null; });
  return refreshing;
};

async function call(path, { method = 'GET', body, signal, retried = false } = {}) {
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal
    });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new ApiError(0, 'Could not reach the server. Please try again.');
  }

  if (res.status === 401 && !retried && !NO_REFRESH.some(p => path.startsWith(p))) {
    if (await refreshSession()) return call(path, { method, body, signal, retried: true });
  }

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }

  if (!res.ok) {
    const err = new ApiError(res.status, messageFrom(data, res.status), data && data.errors);
    // the plan lapsed while the page was open: the only way forward is a plan
    if (err.code === 'plan_required' && !OPEN_PAGES.includes(window.location.pathname)) {
      window.location.assign('/subscription');
    }
    throw err;
  }
  return data;
}

/* Signing in, up or out changes whose data this tab may show, without a page
   load. Drop what the last account left in storage (its active profile and its
   astrologer chats) and tell the app to forget the rest (see App.jsx). A new
   account also starts with no astrologer chosen, so it gets the introduction. */
const newSession = (alsoForget = []) => {
  for (const key of ['meridian_active_profile', 'meridian_astrologer_history', ...alsoForget]) {
    try { localStorage.removeItem(key); } catch (e) {}
  }
  window.dispatchEvent(new Event('meridian:session'));
};
export const register = body => call('/auth/register', { method: 'POST', body }).then(r => { newSession(['meridian_astrologer']); return r; });
export const login = body => call('/auth/login', { method: 'POST', body }).then(r => { newSession(); return r; });
// the session ends here even if the call fails: the next account must not see this one
export const logout = () => call('/auth/logout', { method: 'POST' }).finally(() => newSession());
export const getMe = () => call('/auth/me');
export const getStats = () => call('/stats');
export const updateMe = body => call('/auth/me', { method: 'PATCH', body });
export const deleteMe = () => call('/auth/me', { method: 'DELETE' }).then(r => { newSession(['meridian_astrologer']); return r; });

/* Enabled profiles only; the account page passes true to manage disabled ones too. */
export const listProfiles = (includeDisabled = false) => call(includeDisabled ? '/profiles?include=disabled' : '/profiles');
export const createProfile = body => call('/profiles', { method: 'POST', body });
export const updateProfile = (id, body) => call(`/profiles/${id}`, { method: 'PATCH', body });
// profiles are never deleted, only switched off and on
export const setProfileDisabled = (id, disabled) => call(`/profiles/${id}/disabled`, { method: 'PATCH', body: { disabled } });
export const saveBirthName = (id, birthName) => updateProfile(id, { birthName });
export const getChart = (id, lang = 'en') => call(`/profiles/${id}/chart?lang=${lang}`);
export const getHoroscope = ({ sign, period = 'daily', date, tz, lang = 'en' }) => call(`/horoscope?${new URLSearchParams({ sign, period, date, tz, lang })}`);
export const getSynastry = (id, otherId, lang = 'en') => call(`/profiles/${id}/synastry/${otherId}?lang=${lang}`);
export const getTransits = (id, lang = 'en') => call(`/profiles/${id}/transits?lang=${lang}`);

export const shareProfile = id => call(`/profiles/${id}/share`, { method: 'POST' });
export const revokeShare = id => call(`/profiles/${id}/share`, { method: 'DELETE' });
export const getSharedChart = (token, lang = 'en') => call(`/shared/${encodeURIComponent(token)}?lang=${lang}`);

export const numerology = (body, lang = 'en') => call(`/numerology?lang=${lang}`, { method: 'POST', body });
export const drawTarot = (spread, lang = 'en') => call(`/tarot/draw?lang=${lang}`, { method: 'POST', body: { spread } });

export const searchPlaces = (q, signal) => call(`/places?q=${encodeURIComponent(q)}`, { signal });
export const placeDetails = placeId => call(`/places/${encodeURIComponent(placeId)}`);

export const astrologerPreview = id => call(`/astrologer/characters/${id}/preview`);
export const astrologerSession = body => call('/astrologer/session', { method: 'POST', body });
export const endAstrologerSession = id => call(`/astrologer/session/${id}/end`, { method: 'POST' });

export const billingCatalog = () => call('/billing/catalog');
export const billingStatus = () => call('/billing/status');
export const billingSync = paymentIntentId => call('/billing/sync', { method: 'POST', body: paymentIntentId ? { paymentIntentId } : {} });
export const subscribe = (plan, trial = false) => call('/billing/subscribe', { method: 'POST', body: { plan, trial } });
export const changePlan = plan => call('/billing/plan/change', { method: 'POST', body: { plan } });
export const cancelPlan = () => call('/billing/plan/cancel', { method: 'POST' });
export const resumePlan = () => call('/billing/plan/resume', { method: 'POST' });
export const chooseProfilePack = pack => call('/billing/profiles', { method: 'POST', body: { pack } });
export const buyMinutes = (pack, quantity = 1) => call('/billing/minutes', { method: 'POST', body: { pack, quantity } });
export const payOpenInvoice = kind => call('/billing/pay-open', { method: 'POST', body: { kind } });
export const getCard = () => call('/billing/card');
export const startCardSetup = () => call('/billing/card', { method: 'POST' });
export const saveCard = setupIntentId => call('/billing/card', { method: 'PUT', body: { setupIntentId } });
export const listInvoices = () => call('/billing/invoices');
