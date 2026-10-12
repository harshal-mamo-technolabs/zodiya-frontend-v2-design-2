import { LANGS, getLang, setLang, t } from '../i18n/index.js';

const MONO = "'IBM Plex Mono',monospace";

/* EN · DE. Picking one re-renders the whole app in that language. */
export default function LanguageSwitch({ style }) {
  const current = getLang();
  return (
    <div role="group" aria-label={t('Language')} style={{ display: 'inline-flex', alignItems: 'center', gap: 2, ...style }}>
      {LANGS.map(([code, name], i) => (
        <span key={code} style={{ display: 'inline-flex', alignItems: 'center' }}>
          {i > 0 && <span aria-hidden="true" style={{ opacity: 0.35, padding: '0 4px', fontFamily: MONO, fontSize: 10 }}>·</span>}
          <button type="button" onClick={() => setLang(code)} aria-pressed={code === current} title={name} lang={code}
            style={{ background: 'transparent', border: 'none', padding: '4px 2px', cursor: 'pointer', fontFamily: MONO, fontSize: 10.5, letterSpacing: '.12em', textTransform: 'uppercase', color: 'inherit', opacity: code === current ? 1 : 0.5, borderBottom: code === current ? '1px solid #B4933F' : '1px solid transparent' }}>
            {code}
          </button>
        </span>
      ))}
    </div>
  );
}
