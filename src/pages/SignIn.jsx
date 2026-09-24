import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Starfield from '../components/Starfield.jsx';
import { login as apiLogin, register as apiRegister } from '../lib/api.js';

const MONO = "'IBM Plex Mono',monospace";
const SERIF = "'Cormorant Garamond',Georgia,serif";
const label = { fontFamily: MONO, fontSize: 9.5, letterSpacing: '.16em', textTransform: 'uppercase', color: '#4A5266' };
const field = { display: 'flex', flexDirection: 'column', gap: 5, borderBottom: '1px solid rgba(28,37,56,.3)', paddingBottom: 8 };
const input = { width: '100%', border: 'none', background: 'transparent', padding: '2px 0', fontSize: 16 };
const cta = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 50, padding: '0 16px 0 18px', background: '#1C2538', color: '#F4ECDC', border: 'none', borderRadius: 2, cursor: 'pointer', fontFamily: "'Instrument Sans',sans-serif", fontWeight: 500, fontSize: 15 };
const textLink = { alignSelf: 'flex-start', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: '#4A5266', fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', borderBottom: '1px solid rgba(28,37,56,.35)' };

/** `mode` comes from the route: /login or /signup. Reset is a local sub-state of login. */
export default function SignIn({ mode }) {
  const navigate = useNavigate();
  const [reset, setReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const login = mode === 'login', signup = mode === 'signup';

  const submit = async () => {
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      if (signup) {
        await apiRegister({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), password });
        // not sensitive — only used to prefill the birth-details name field
        try { localStorage.setItem('meridian_name', `${firstName.trim()} ${lastName.trim()}`.trim()); } catch (e) {}
      } else {
        await apiLogin({ email: email.trim(), password });
      }
      // a fresh account has no profile yet; a returning one lands on home, which only sends to birth-details when nothing is saved
      navigate(signup ? '/birth-details' : '/dashboard');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown = e => { if (e.key === 'Enter') submit(); };

  return (
    <div style={{ minHeight: '100vh', background: '#1C2538', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '56px 20px' }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}><Starfield auth /></div>

      <div style={{ position: 'absolute', top: 22, left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
        <Link to="/" style={{ pointerEvents: 'auto', fontFamily: SERIF, fontWeight: 600, fontSize: 18, letterSpacing: '.16em', textTransform: 'uppercase', color: '#F4ECDC', borderBottom: 'none' }}>AstroMeridian</Link>
      </div>

      <div className="auth-card" style={{ position: 'relative', width: '100%', maxWidth: 380, background: 'rgba(244,236,220,.94)', border: '1px solid rgba(244,236,220,.5)', boxShadow: '0 30px 60px rgba(0,0,0,.35)', backdropFilter: 'blur(6px)', padding: '26px 24px 24px', display: 'flex', flexDirection: 'column', gap: 20, animation: 'om-rise .5s cubic-bezier(.3,0,.2,1) .2s both' }}>
        <div style={{ position: 'absolute', top: -1, left: 24, right: 24, height: 1, background: '#B4933F' }} />

        <div style={{ display: 'flex', borderBottom: '1px solid rgba(28,37,56,.3)' }}>
          {[['Log in', 'login'], ['Create account', 'signup']].map(([text, key]) => {
            const on = mode === key;
            return (
              <button key={key} type="button" onClick={() => { setReset(false); setResetSent(false); navigate('/' + key); }} style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: `2px solid ${on ? '#1C2538' : 'transparent'}`, marginBottom: -1, padding: '10px 0', cursor: 'pointer', color: on ? '#1C2538' : '#4A5266', fontFamily: MONO, fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase' }}>{text}</button>
            );
          })}
        </div>

        {reset ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, animation: 'om-fade .25s ease both' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <h1 style={{ margin: 0, fontFamily: SERIF, fontWeight: 500, fontSize: 26, lineHeight: 1.1 }}>Reset your password</h1>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: '#4A5266' }}>We'll send a link that works once, for an hour.</p>
            </div>
            <label style={field}>
              <span style={label}>Email</span>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={input} />
            </label>
            <button type="button" onClick={() => setResetSent(true)} className="hov-ink" style={cta}>
              <span>{resetSent ? 'Link sent, check your inbox' : 'Send reset link'}</span><span style={{ fontFamily: MONO, fontSize: 13, opacity: .8 }}>→</span>
            </button>
            <button type="button" onClick={() => { setReset(false); setResetSent(false); }} style={textLink}>← Back to log in</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'om-fade .25s ease both' }}>
            <h1 style={{ margin: 0, fontFamily: SERIF, fontWeight: 500, fontSize: 26, lineHeight: 1.1 }}>{login ? 'Welcome back.' : 'Begin your chart.'}</h1>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {signup && (
                <div style={{ display: 'flex', gap: 14 }}>
                  <label style={{ ...field, flex: 1, minWidth: 0 }}>
                    <span style={label}>First name</span>
                    <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} onKeyDown={onKeyDown} placeholder="Ana" autoComplete="given-name" style={input} />
                  </label>
                  <label style={{ ...field, flex: 1, minWidth: 0 }}>
                    <span style={label}>Last name</span>
                    <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} onKeyDown={onKeyDown} placeholder="Rodrigues" autoComplete="family-name" style={input} />
                  </label>
                </div>
              )}
              <label style={field}>
                <span style={label}>Email</span>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={onKeyDown} placeholder="you@example.com" autoComplete="email" style={input} />
              </label>
              <label style={field}>
                <span style={{ ...label, display: 'flex', justifyContent: 'space-between' }}><span>Password</span><span style={{ color: 'rgba(28,37,56,.4)' }}>{signup ? '10+ characters' : ''}</span></span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={onKeyDown} placeholder="••••••••••" autoComplete={signup ? 'new-password' : 'current-password'} style={{ flex: 1, minWidth: 0, border: 'none', background: 'transparent', padding: '2px 0', fontSize: 16, letterSpacing: '.06em' }} />
                  <button type="button" onClick={() => setShowPw(v => !v)} style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: '#4A5266', fontFamily: MONO, fontSize: 9.5, letterSpacing: '.12em', textTransform: 'uppercase' }}>{showPw ? 'Hide' : 'Show'}</button>
                </div>
              </label>
            </div>

            {error && (
              <div role="alert" style={{ borderLeft: '2px solid #B4933F', background: 'rgba(180,147,63,.1)', padding: '9px 12px', fontSize: 13.5, lineHeight: 1.45, color: '#1C2538' }}>{error}</div>
            )}

            <button type="button" onClick={submit} disabled={busy} className="hov-ink" style={{ ...cta, opacity: busy ? .6 : 1, cursor: busy ? 'wait' : 'pointer' }}>
              <span>{busy ? (login ? 'Logging in…' : 'Creating account…') : (login ? 'Log in' : 'Create account')}</span><span style={{ fontFamily: MONO, fontSize: 13, opacity: .8 }}>→</span>
            </button>

            {login && (
              <button type="button" onClick={() => { setReset(true); setResetSent(false); }} className="hov-sage" style={textLink}>Forgotten password</button>
            )}

            {signup && (
              <div style={{ borderTop: '1px solid rgba(28,37,56,.25)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ ...label, color: '#5F8B7A' }}>Free, without a card</span>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13.5, lineHeight: 1.45, color: '#1C2538' }}>
                  {['Your natal wheel, saved and re-drawable', 'A daily horoscope written for your chart', 'Exact placement table and life path number'].map(t => (
                    <li key={t} style={{ display: 'flex', gap: 9 }}><span style={{ fontFamily: MONO, color: '#5F8B7A' }}>✓</span><span>{t}</span></li>
                  ))}
                </ul>
                <span style={{ fontSize: 12, lineHeight: 1.5, color: '#4A5266' }}>By continuing you agree to the <a href="#">terms</a> and <a href="#">privacy notice</a>. Birth data is used only to compute your chart.</span>
              </div>
            )}
          </div>
        )}
      </div>

      <span style={{ position: 'absolute', bottom: 18, left: 0, right: 0, textAlign: 'center', fontFamily: MONO, fontSize: 9.5, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(244,236,220,.45)' }}>Sky as seen from 38°43′N · sidereal time 21h 14m</span>
    </div>
  );
}
