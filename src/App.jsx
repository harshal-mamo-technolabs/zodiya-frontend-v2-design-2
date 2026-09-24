import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { getMe } from './lib/api.js';
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

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/welcome" element={<Navigate to="/" replace />} />
      <Route path="/login" element={<SignIn mode="login" />} />
      <Route path="/signup" element={<SignIn mode="signup" />} />
      <Route path="/birth-details" element={<BirthDetails />} />
      <Route path="/natal-chart" element={<NatalChart />} />
      <Route path="/chart/:token" element={<SharedChart />} />
      <Route path="/numerology" element={<Numerology />} />
      <Route path="/tarot" element={<Tarot />} />
      <Route path="/transits" element={<Transits />} />
      <Route path="/synastry" element={<Synastry />} />
      <Route path="/daily-horoscope" element={<Horoscope />} />
      <Route path="/account" element={<Account />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
