/* Portal translations. English text is its own key: t('Log in') looks the
   phrase up in the chosen language and falls back to the English as written,
   so a missing entry shows English instead of a blank. {name} placeholders
   are filled from vars: t('Hello {name}', { name }).
   Changing the language remounts the whole app (App.jsx), so a plain t() at
   render time is always current. */
import pages from './de/pages.js';
import readings from './de/readings.js';
import shell from './de/shell.js';
import astrocartography from './de/astrocartography.js';
import palm from './de/palm.js';

export const LANGS = [['en', 'English'], ['de', 'Deutsch']];
const DICTS = { de: { ...shell, ...pages, ...readings, ...astrocartography, ...palm } };
/* Locale for Intl date and number formatting. */
export const LOCALES = { en: 'en-GB', de: 'de-DE' };

const KEY = 'meridian_lang';
const read = () => {
  // ?lang= from the onboarding funnel wins, and is kept from then on
  const asked = new URLSearchParams(window.location.search).get('lang');
  if (LANGS.some(([c]) => c === asked)) {
    try { localStorage.setItem(KEY, asked); } catch (e) {}
    return asked;
  }
  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  if (LANGS.some(([c]) => c === saved)) return saved;
  // first visit: follow the browser
  return (navigator.language || '').toLowerCase().startsWith('de') ? 'de' : 'en';
};

let lang = read();
document.documentElement.lang = lang;

export const getLang = () => lang;
export const locale = () => LOCALES[lang];

export function setLang(next) {
  if (next === lang || !LANGS.some(([c]) => c === next)) return;
  lang = next;
  try { localStorage.setItem(KEY, next); } catch (e) {}
  document.documentElement.lang = next;
  window.dispatchEvent(new CustomEvent('meridian:lang', { detail: next }));
}

export function t(text, vars) {
  const out = (DICTS[lang] && DICTS[lang][text]) || text;
  return vars ? out.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : out;
}
