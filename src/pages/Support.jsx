import { Link } from 'react-router-dom';
import Starfield from '../components/Starfield.jsx';
import NavMenu from '../components/NavMenu.jsx';
import SupportBeacon from '../helpscout/SupportBeacon.jsx';
import { t } from '../i18n/index.js';

const MONO = "'IBM Plex Mono',monospace";
const SERIF = "'Cormorant Garamond',Georgia,serif";
const MUTED = 'rgba(244,236,220,.68)';

/* Help & support. The Help Scout chat lives on this page only. */
export default function Support() {
  const openChat = () => { if (typeof window.Beacon === 'function') window.Beacon('open'); };

  return (
    <div style={{ minHeight: '100vh', background: '#1C2538', color: '#F4ECDC', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <SupportBeacon />
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}><Starfield /></div>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'rgba(28,37,56,.42)' }} />

      <header style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '18px 24px', borderBottom: '1px solid rgba(244,236,220,.2)', maxWidth: 1200, width: '100%', margin: '0 auto' }}>
        <Link to="/" className="hdr-logo" style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 18, letterSpacing: '.14em', textTransform: 'uppercase', borderBottom: 'none' }}>AstroMeridian</Link>
        <NavMenu current="Help & support" />
      </header>

      <main style={{ position: 'relative', flex: 1, width: '100%', maxWidth: 720, margin: '0 auto', padding: '40px 24px 64px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: '#5F8B7A' }}>{t('Help & support')}</span>
        <h1 style={{ margin: 0, fontFamily: SERIF, fontWeight: 500, fontSize: 'clamp(32px,8vw,44px)', lineHeight: 1.08, textWrap: 'balance' }}>{t("We're here to help.")}</h1>
        <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6, color: MUTED, textWrap: 'pretty' }}>{t('Questions about your account, your plan, billing or a reading? Send us a message in the chat and our support team will get back to you.')}</p>
        <button type="button" onClick={openChat} className="hov-cream" style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 14, height: 50, padding: '0 18px 0 20px', background: '#F4ECDC', color: '#1C2538', border: 'none', borderRadius: 2, cursor: 'pointer', fontFamily: "'Instrument Sans',sans-serif", fontWeight: 500, fontSize: 15 }}>
          <span>{t('Open the chat')}</span><span style={{ fontFamily: MONO, fontSize: 13, opacity: .8 }}>→</span>
        </button>
      </main>
    </div>
  );
}
