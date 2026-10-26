import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import Starfield from '../components/Starfield.jsx';
import NavMenu from '../components/NavMenu.jsx';
import { getLang } from '../i18n/index.js';
import CONTENT from './legal-content.js';

const MONO = "'IBM Plex Mono',monospace";
const SERIF = "'Cormorant Garamond',Georgia,serif";
const MUTED = 'rgba(244,236,220,.78)';
const link = { color: '#F4ECDC', textDecoration: 'underline' };

/* Emails and web addresses in the text become links. */
const LINKS = /([\w.+-]+@[\w-]+\.[\w.]+\w|https?:\/\/[^\s]+[^\s.,)]|stripe\.com\/privacy)/g;
function Text({ value }) {
  if (typeof value !== 'string') {
    // a FAQ answer: strings and in-app links
    return value.map((v, i) => typeof v === 'string'
      ? <Text key={i} value={v} />
      : <Link key={i} to={v.to} style={link}>{v.label}</Link>);
  }
  return value.split(LINKS).map((part, i) => {
    if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>;
    const href = part.includes('@') ? `mailto:${part}` : part.startsWith('http') ? part : `https://${part}`;
    const external = !href.startsWith('mailto:');
    return <a key={i} href={href} style={link} {...(external && { target: '_blank', rel: 'noopener noreferrer' })}>{part}</a>;
  });
}

const List = ({ items }) => (
  <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
    {items.map((b, i) => <li key={i}><Text value={b} /></li>)}
  </ul>
);

/* Privacy policy, terms, refund policy and FAQ: doc is a key of legal-content.js. */
const MENU = { privacy: 'Privacy Policy', terms: 'Terms of Use', refund: 'Refund Policy', faq: 'FAQ' };

export default function Legal({ doc }) {
  const c = CONTENT[doc][getLang()] || CONTENT[doc].en;
  const p = { margin: 0 };

  return (
    <div style={{ minHeight: '100vh', background: '#1C2538', color: '#F4ECDC', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}><Starfield /></div>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'rgba(28,37,56,.6)' }} />

      <header style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '18px 24px', borderBottom: '1px solid rgba(244,236,220,.2)', maxWidth: 1200, width: '100%', margin: '0 auto' }}>
        <Link to="/" className="hdr-logo" style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 18, letterSpacing: '.14em', textTransform: 'uppercase', borderBottom: 'none' }}>AstroMeridian</Link>
        <NavMenu current={MENU[doc]} />
      </header>

      <main style={{ position: 'relative', flex: 1, width: '100%', maxWidth: 760, margin: '0 auto', padding: '40px 24px 64px', display: 'flex', flexDirection: 'column', gap: 28, fontSize: 15.5, lineHeight: 1.65, color: MUTED }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: '#5F8B7A' }}>{c.pageTitle}</span>
          <h1 style={{ margin: 0, fontFamily: SERIF, fontWeight: 500, fontSize: 'clamp(30px,7vw,42px)', lineHeight: 1.1, color: '#F4ECDC', textWrap: 'balance' }}>{c.title || c.pageTitle}</h1>
          {c.effectiveDate && <span style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '.06em' }}>{c.effectiveDate}</span>}
        </div>
        {c.intro && <p style={p}><Text value={c.intro} /></p>}

        {c.sections.map((s, i) => (
          <section key={i} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h2 style={{ margin: 0, fontFamily: SERIF, fontWeight: 500, fontSize: 24, lineHeight: 1.25, color: '#F4ECDC' }}>{s.heading}</h2>
            {s.paragraphs?.map((x, j) => <p key={j} style={p}><Text value={x} /></p>)}
            {s.subsections?.map((sub, j) => (
              <div key={j} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{ ...p, fontWeight: 600, color: '#F4ECDC' }}>{sub.subheading}</p>
                <List items={sub.bullets} />
              </div>
            ))}
            {s.paragraphsAfter?.map((x, j) => <p key={j} style={p}><Text value={x} /></p>)}
            {s.bullets && <List items={s.bullets} />}
          </section>
        ))}

        <footer style={{ borderTop: '1px solid rgba(244,236,220,.2)', paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'center' }}>
          {[].concat(c.footer).map((x, i) => <p key={i} style={p}><Text value={x} /></p>)}
        </footer>
      </main>
    </div>
  );
}
