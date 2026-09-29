import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { getMe } from './lib/api.js';
import { readActive } from './lib/active-profile.js';
import SignIn from './pages/SignIn.jsx';
import BirthDetails from './pages/BirthDetails.jsx';
import NatalChart, { SharedChart } from './pages/NatalChart.jsx';
import Numerology from './pages/Numerology.jsx';
import Tarot from './pages/Tarot.jsx';
import Transits from './pages/Transits.jsx';
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
import { getStatus } from './lib/billing.js';

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

export default function App() {
  // a profile switch remounts every page, so each reads the new active profile
  const [active, setActive] = useState(readActive);
  useEffect(() => {
    const on = e => setActive(e.detail);
    window.addEventListener('meridian:active-profile', on);
    return () => window.removeEventListener('meridian:active-profile', on);
  }, []);

  return (
    <>
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
      <Route path="/synastry" element={<Paid><Synastry /></Paid>} />
      <Route path="/daily-horoscope" element={<Paid><Horoscope /></Paid>} />
      <Route path="/account" element={<Account />} />
      <Route path="/choose-astrologer" element={<Paid><ChooseAstrologer /></Paid>} />
      <Route path="/subscription" element={<Plans />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/billing" element={<Billing />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    {/* follows the reader across every signed-in page */}
    <AstrologerWidget />
    </>
  );
}
