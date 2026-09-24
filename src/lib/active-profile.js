/* Which saved profile the app is showing. Every page reads this on load and
   falls back to the primary entry when it is unset or stale. */
const KEY = 'meridian_active_profile';

export const readActive = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
export const writeActive = id => { try { localStorage.setItem(KEY, id); } catch (e) {} };
export const clearActive = () => { try { localStorage.removeItem(KEY); } catch (e) {} };
