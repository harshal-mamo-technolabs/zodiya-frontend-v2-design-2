/* Every call goes through Vite's /api proxy, so the browser stays same-origin
   and the API's httpOnly session cookies ride along. */
const BASE = '/api';

export class ApiError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors || [];
  }
}

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
    throw new ApiError(0, 'Could not reach the server. Is the API running on port 5501?');
  }

  if (res.status === 401 && !retried && !NO_REFRESH.some(p => path.startsWith(p))) {
    if (await refreshSession()) return call(path, { method, body, signal, retried: true });
  }

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }

  if (!res.ok) throw new ApiError(res.status, messageFrom(data, res.status), data && data.errors);
  return data;
}

export const register = body => call('/auth/register', { method: 'POST', body });
export const login = body => call('/auth/login', { method: 'POST', body });
export const logout = () => call('/auth/logout', { method: 'POST' });
export const getMe = () => call('/auth/me');
export const getStats = () => call('/stats');
export const updateMe = body => call('/auth/me', { method: 'PATCH', body });
export const deleteMe = () => call('/auth/me', { method: 'DELETE' });

export const listProfiles = () => call('/profiles');
export const createProfile = body => call('/profiles', { method: 'POST', body });
export const updateProfile = (id, body) => call(`/profiles/${id}`, { method: 'PATCH', body });
export const deleteProfile = id => call(`/profiles/${id}`, { method: 'DELETE' });
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
