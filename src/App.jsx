import { Fragment, useEffect, useRef, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { getMe, redeemHandoff } from './lib/api.js';
import { readActive } from './lib/active-profile.js';
import SignIn from './pages/SignIn.jsx';
import BirthDetails from './pages/BirthDetails.jsx';
import NatalChart, { SharedChart } from './pages/NatalChart.jsx';
import Numerology from './pages/Numerology.jsx';
import Tarot from './pages/Tarot.jsx';
import Transits from './pages/Transits.jsx';
import Astrocartography from './pages/Astrocartography.jsx';
import PalmReading from './pages/PalmReading.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Landing from './pages/Landing.jsx';
import Synastry from './pages/Synastry.jsx';
import Horoscope from './pages/Horoscope.jsx';
import Account from './pages/Account.jsx';
import ChooseAstrologer from './pages/ChooseAstrologer.jsx';
import AstrologerWidget from './components/AstrologerWidget.jsx';
import Plans from './pages/Plans.jsx';
import Checkout from './pages/Checkout.jsx';
import Billing from './pages/Billing.jsx';
import Support from './pages/Support.jsx';
import { getStatus, useSales } from './lib/billing.js';
import { getLang } from './i18n/index.js';

/* The landing for visitors; anyone with a session goes straight to the dashboard. */
function Home() {
  const [signedIn, setSignedIn] = useState(null);
  useEffect(() => {
    let live = true;
    getMe().then(() => { if (live) setSignedIn(true); }).catch(() => { if (live) setSignedIn(false); });
    return () => { live = false; };
  }, []);
  if (signedIn === null) return <div style={{ minHeight: '100vh', background: '#1C2538' }} />;
  return signedIn ? <Navigate to="/dashboard" replace /> : <Landing />;
}

/* The app proper needs a live plan; anyone else is sent to sign in or to pricing.
   The API enforces the same rule, this only saves a trip. */
function Paid({ children }) {
  const [state, setState] = useState(null); // null | ok | none | out
  useEffect(() => {
    let live = true;
    getStatus()
      .then(s => { if (live) setState(s.entitled ? 'ok' : 'none'); })
      // unreachable API: let the page show its own error
      .catch(e => { if (live) setState(e.status === 401 ? 'out' : 'ok'); });
    return () => { live = false; };
  }, []);
  if (state === null) return <div style={{ minHeight: '100vh', background: '#1C2538' }} />;
  if (state === 'out') return <Navigate to="/login" replace />;
  if (state === 'none') return <Navigate to="/subscription" replace />;
  return children;
}

/* With payments switched off there is nothing to buy: these pages go home. */
function ForSale({ children }) {
  const sales = useSales();
  if (sales === null) return <div style={{ minHeight: '100vh', background: '#1C2538' }} />;
  return sales ? children : <Navigate to="/dashboard" replace />;
}

export default function App() {
  // a profile switch remounts every page, so each reads the new active profile
  const [active, setActive] = useState(readActive);
  // a sign-in, sign-up or sign-out remounts everything, so no page or widget
  // keeps the last account's data in memory (lib/api.js sends the event)
  const [session, setSession] = useState(0);
  // a new language remounts everything too, so every page and reading reloads in it
  const [lang, setLang] = useState(getLang);
  useEffect(() => {
    const on = e => setActive(e.detail);
    const fresh = () => { setActive(readActive()); setSession(n => n + 1); };
    const relang = e => setLang(e.detail);
    window.addEventListener('meridian:active-profile', on);
    window.addEventListener('meridian:session', fresh);
    window.addEventListener('meridian:lang', relang);
    return () => { window.removeEventListener('meridian:active-profile', on); window.removeEventListener('meridian:session', fresh); window.removeEventListener('meridian:lang', relang); };
  }, []);

  /* ?handoff= from the onboarding funnel: a one-time token that becomes this
     app's session before any page asks who is here. It leaves the address bar
     at once, so it does not linger in history. */
  const location = useLocation();
  const navigate = useNavigate();
  const [handoff, setHandoff] = useState(() => new URLSearchParams(location.search).get('handoff'));
  // the token works once, and StrictMode runs effects twice in development:
  // a second redeem would be refused and bounce a signed-in user to /login
  const redeemed = useRef(false);
  useEffect(() => {
    if (!handoff || redeemed.current) return;
    redeemed.current = true;
    const rest = new URLSearchParams(location.search);
    rest.delete('handoff');
    navigate({ pathname: location.pathname, search: rest.toString() ? `?${rest}` : '' }, { replace: true });
    redeemHandoff(handoff)
      .then(() => setHandoff(null))
      // expired or already used: an ordinary sign-in still works
      .catch(() => { setHandoff(null); navigate('/login', { replace: true }); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (handoff) return <div style={{ minHeight: '100vh', background: '#1C2538' }} />;

  return (
    <>
    <Fragment key={`${session}-${lang}`}>
    <Routes key={active || 'none'}>
      <Route path="/" element={<Home />} />
      <Route path="/dashboard" element={<Paid><Dashboard /></Paid>} />
      <Route path="/welcome" element={<Navigate to="/" replace />} />
      <Route path="/login" element={<SignIn mode="login" />} />
      <Route path="/signup" element={<SignIn mode="signup" />} />
      <Route path="/birth-details" element={<Paid><BirthDetails /></Paid>} />
      <Route path="/natal-chart" element={<Paid><NatalChart /></Paid>} />
      <Route path="/chart/:token" element={<SharedChart />} />
      <Route path="/numerology" element={<Paid><Numerology /></Paid>} />
      <Route path="/tarot" element={<Paid><Tarot /></Paid>} />
      <Route path="/transits" element={<Paid><Transits /></Paid>} />
      <Route path="/astrocartography" element={<Paid><Astrocartography /></Paid>} />
      <Route path="/palm-reading" element={<Paid><PalmReading /></Paid>} />
      <Route path="/synastry" element={<Paid><Synastry /></Paid>} />
      <Route path="/daily-horoscope" element={<Paid><Horoscope /></Paid>} />
      <Route path="/account" element={<Account />} />
      <Route path="/choose-astrologer" element={<Paid><ChooseAstrologer /></Paid>} />
      <Route path="/subscription" element={<ForSale><Plans /></ForSale>} />
      <Route path="/checkout" element={<ForSale><Checkout /></ForSale>} />
      <Route path="/billing" element={<ForSale><Billing /></ForSale>} />
      <Route path="/support" element={<Support />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    {/* follows the reader across every signed-in page */}
    <AstrologerWidget />
    </Fragment>
    </>
  );
}
