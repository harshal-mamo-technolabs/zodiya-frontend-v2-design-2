import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Starfield from '../components/Starfield.jsx';
import NavMenu from '../components/NavMenu.jsx';
import { listProfiles, numerology } from '../lib/api.js';
import { checkDate, isoToInput } from '../lib/date-input.js';
import { readActive } from '../lib/active-profile.js';

const MONO = "'IBM Plex Mono',monospace";
const SERIF = "'Cormorant Garamond',Georgia,serif";
const INK = '#1C2538', CREAM = '#F4ECDC', MUTED = 'rgba(244,236,220,.68)';
const FAINT = 'rgba(244,236,220,.5)';
const COP = '#5F8B7A', GOLD = '#B4933F', LIT = '#E2C97F';
const HAIR = '1px solid rgba(244,236,220,.16)';

const lbl = { fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: MUTED };
const card = { display: 'flex', flexDirection: 'column', gap: 22, padding: '24px 22px', border: HAIR, background: 'rgba(244,236,220,.03)' };
const mathBox = { display: 'flex', flexDirection: 'column', gap: 4, fontFamily: MONO, fontSize: 11, lineHeight: 1.7, color: 'rgba(244,236,220,.6)', wordBreak: 'break-word', padding: '10px 12px', background: 'rgba(244,236,220,.05)' };
const body = { fontSize: 16, lineHeight: 1.66, color: CREAM, textWrap: 'pretty' };

/** A section heading with its explanatory line, used three times below. */
function Heading({ title, sub, first }) {
  return (
    <div style={{ marginTop: first ? 0 : 52, marginBottom: 18 }}>
      <div style={{ fontFamily: SERIF, fontSize: 26, lineHeight: 1.15 }}>{title}</div>
      <div style={{ fontSize: 13.5, lineHeight: 1.5, color: MUTED, marginTop: 5, maxWidth: 620 }}>{sub}</div>
    </div>
  );
}

function Ring({ value, master, size = 124, type = 'serif' }) {
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', border: `1px solid ${master ? 'rgba(180,147,63,.7)' : 'rgba(244,236,220,.22)'}`, background: master ? 'radial-gradient(circle at 50% 40%,rgba(180,147,63,.2),rgba(180,147,63,.02))' : 'rgba(244,236,220,.03)' }}>
      {master && <div style={{ position: 'absolute', inset: size > 90 ? 8 : 6, borderRadius: '50%', border: '1px solid rgba(180,147,63,.4)' }} />}
      <div style={{ fontFamily: type === 'serif' ? SERIF : MONO, fontSize: size * 0.52, lineHeight: 1, color: master ? LIT : CREAM, textShadow: master ? '0 0 26px rgba(180,147,63,.45)' : 'none' }}>{value}</div>
    </div>
  );
}

export default function Numerology() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  /* Name and birth date come from the active profile; switch profiles from the menu. */
  useEffect(() => {
    let live = true;
    listProfiles()
      .then(profiles => {
        if (!profiles.length) { navigate('/birth-details'); return null; }
        const wanted = readActive();
        const p = profiles.find(x => x._id === wanted) || profiles.find(x => x.isPrimary) || profiles[0];
        const full = (p.birthName || `${p.firstName} ${p.lastName}`).trim();
        const input = isoToInput(p.birthDate);
        if (live) { setName(full); setDob(input); }
        return numerology({ name: full, birthDate: checkDate(input).iso });
      })
      .then(data => { if (live && data) setResult(data); })
      .catch(e => {
        if (e.status === 401) { navigate('/login'); return; }
        if (live) setError(e.message);
      });
    return () => { live = false; };
  }, [navigate]);

  const s = result?.sections;

  return (
    <div style={{ minHeight: '100vh', background: INK, color: CREAM, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}><Starfield /></div>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'rgba(28,37,56,.42)' }} />

      <header style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '18px 24px', borderBottom: '1px solid rgba(244,236,220,.2)', maxWidth: 1200, width: '100%', margin: '0 auto' }}>
        <Link to="/natal-chart" style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', borderBottom: 'none' }}>← Natal chart</Link>
        <Link to="/" style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 18, letterSpacing: '.14em', textTransform: 'uppercase', borderBottom: 'none' }}>Meridian</Link>
        <NavMenu current="Numerology" />
      </header>

      <main style={{ position: 'relative', flex: 1, width: '100%', maxWidth: 1200, margin: '0 auto', padding: '32px 24px 64px', display: 'flex', flexWrap: 'wrap', gap: 'clamp(28px,4vw,64px)', alignItems: 'flex-start' }}>

        {/* ------------------------------------------------------- left rail */}
        <div style={{ flex: '1 1 340px', minWidth: 0, maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <div style={{ ...lbl, color: COP, marginBottom: 14 }}>Numerology</div>
            <h1 style={{ margin: 0, fontFamily: SERIF, fontWeight: 500, fontSize: 'clamp(30px,5vw,44px)', lineHeight: 1.06, textWrap: 'balance' }}>Two facts. Five numbers.</h1>
          </div>

          {name && (
            <div style={{ ...card, gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={lbl}>Full name at birth</span>
                <span style={{ fontFamily: SERIF, fontSize: 24, lineHeight: 1.2 }}>{name}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={lbl}>Date of birth</span>
                <span style={{ fontFamily: MONO, fontSize: 20, letterSpacing: '.06em' }}>{dob}</span>
              </div>
              <span style={{ fontSize: 12.5, lineHeight: 1.5, color: MUTED }}>From your active profile. Switch profiles from the menu. Pythagorean system, with the working shown for every number.</span>
            </div>
          )}

          {error && (
            <div role="alert" style={{ borderLeft: `2px solid ${GOLD}`, background: 'rgba(180,147,63,.12)', padding: '10px 14px', fontSize: 14, lineHeight: 1.45 }}>{error}</div>
          )}

          {result && (
            <>
              <div style={{ padding: '22px 22px', border: '1px solid rgba(95,139,122,.35)', background: 'rgba(95,139,122,.08)' }}>
                <div style={{ ...lbl, color: COP, marginBottom: 10 }}>{result.firstName}, in brief</div>
                <div style={{ fontFamily: SERIF, fontSize: 23, lineHeight: 1.34, textWrap: 'pretty' }}>{result.summary}</div>
              </div>

              {/* the one number here that changes with the calendar */}
              <div style={{ ...card, gap: 14, borderColor: 'rgba(180,147,63,.4)', background: 'rgba(180,147,63,.07)' }}>
                <div style={{ ...lbl, color: LIT }}>{s.personalYear.title}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <Ring value={result.personalYear.value} master={false} size={66} />
                  <div style={{ fontFamily: SERIF, fontSize: 26, lineHeight: 1.15 }}>{result.personalYear.heading}</div>
                </div>
                <div style={body}>{result.personalYear.meaning}</div>
                <div style={mathBox}>{result.personalYear.math.map((line, i) => <div key={i}>{line}</div>)}</div>
                <div style={{ fontSize: 12.5, lineHeight: 1.5, color: MUTED }}>{s.personalYear.sub}</div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: 10, padding: '16px 18px', border: HAIR, background: 'rgba(244,236,220,.03)' }}>
                  <div style={lbl}>Lucky numbers</div>
                  <div style={{ display: 'flex', gap: 14 }}>
                    {result.lucky.map(n => <div key={n} style={{ fontFamily: SERIF, fontSize: 30, lineHeight: 1, color: GOLD }}>{n}</div>)}
                  </div>
                </div>
                <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: 10, padding: '16px 18px', border: HAIR, background: 'rgba(244,236,220,.03)' }}>
                  <div style={lbl}>Favourable days</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {result.days.map(d => <div key={d} style={{ fontFamily: SERIF, fontSize: 18, lineHeight: 1.2 }}>{d}</div>)}
                  </div>
                </div>
              </div>

            </>
          )}
        </div>

        {/* ------------------------------------------------------ right rail */}
        <div style={{ flex: '2 1 460px', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ ...lbl, marginBottom: 16 }}>Your five numbers</div>

          {!result && (
            <div style={{ padding: '40px 0', fontFamily: SERIF, fontSize: 21, color: MUTED, lineHeight: 1.4 }}>
              {error ? '' : 'Loading your numbers…'}
            </div>
          )}

          {result && result.numbers.map(n => (
            <div key={n.key} style={{ display: 'flex', flexWrap: 'wrap', gap: 24, padding: '28px 0', borderTop: HAIR, alignItems: 'flex-start' }}>
              <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <Ring value={n.value} master={n.master} />
                {n.master && (
                  <div style={{ padding: '4px 10px', border: '1px solid rgba(180,147,63,.5)', fontFamily: MONO, fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', color: LIT }}>Master number</div>
                )}
              </div>

              <div style={{ flex: '1 1 210px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontFamily: SERIF, fontSize: 28, lineHeight: 1.1 }}>{n.label}</div>
                  <div style={{ fontSize: 13, color: MUTED }}>{n.sub}</div>
                </div>
                <div style={mathBox}>{n.math.map((line, i) => <div key={i}>{line}</div>)}</div>
              </div>

              <div style={{ flex: '1 1 240px', minWidth: 0, ...body, paddingTop: 4 }}>{n.meaning}</div>
            </div>
          ))}

          {result && (
            <>
              {/* -------------------------------------------- four chapters */}
              <Heading title={s.chapters.title} sub={s.chapters.sub} />

              {result.chapters.map(c => (
                <div key={c.label} style={{ display: 'flex', flexWrap: 'wrap', gap: 24, padding: '26px 0', borderTop: HAIR, alignItems: 'flex-start' }}>
                  <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: 96 }}>
                    <Ring value={c.pinnacle} master={c.master} size={78} />
                    <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.1em', color: MUTED, textAlign: 'center' }}>{c.ages}</div>
                  </div>

                  <div style={{ flex: '1 1 320px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ fontFamily: SERIF, fontSize: 22, lineHeight: 1.15 }}>{c.label}</div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      <div style={{ ...lbl, color: COP }}>{s.chapters.pinnacle}</div>
                      <div style={body}>{c.pinnacleMeaning}</div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, paddingTop: 14, borderTop: '1px solid rgba(244,236,220,.09)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ fontFamily: MONO, fontSize: 12, width: 24, height: 24, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(244,236,220,.3)', color: FAINT }}>{c.challenge}</div>
                        <div style={{ ...lbl, color: GOLD }}>{s.chapters.challenge}</div>
                      </div>
                      <div style={body}>{c.challengeMeaning}</div>
                      {c.challengeAgain && <div style={{ fontSize: 13.5, lineHeight: 1.5, color: MUTED, fontStyle: 'italic' }}>{c.challengeAgain}</div>}
                    </div>
                  </div>
                </div>
              ))}

              {/* --------------------------------------- the name, letter by letter */}
              <Heading title={s.name.title} sub={s.name.sub} />

              <div style={{ borderTop: HAIR, paddingTop: 22, display: 'flex', flexDirection: 'column', gap: 22 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {result.name.letters.map((l, i) => (
                    <div key={i} style={{ width: 40, height: 52, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, border: `1px solid ${l.vowel ? 'rgba(95,139,122,.5)' : 'rgba(244,236,220,.18)'}`, background: l.vowel ? 'rgba(95,139,122,.12)' : 'rgba(244,236,220,.03)' }}>
                      <div style={{ fontFamily: SERIF, fontSize: 21, lineHeight: 1 }}>{l.letter}</div>
                      <div style={{ fontFamily: MONO, fontSize: 10, color: l.vowel ? COP : FAINT }}>{l.value}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, fontFamily: MONO, fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7, color: COP }}>
                    <span style={{ width: 11, height: 11, border: '1px solid rgba(95,139,122,.5)', background: 'rgba(95,139,122,.12)' }} />{s.name.vowels}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7, color: MUTED }}>
                    <span style={{ width: 11, height: 11, border: '1px solid rgba(244,236,220,.18)', background: 'rgba(244,236,220,.03)' }} />{s.name.consonants}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12, padding: '20px 20px', border: HAIR, background: 'rgba(244,236,220,.03)' }}>
                    <div style={{ ...lbl, color: COP }}>{s.name.passion}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 14 }}>
                      <Ring value={result.name.hiddenPassion.value} master={false} size={54} />
                      <div style={{ ...body, flex: '1 1 260px', minWidth: 0 }}>{result.name.hiddenPassion.meaning}</div>
                    </div>
                  </div>

                  <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14, padding: '20px 20px', border: HAIR, background: 'rgba(244,236,220,.03)' }}>
                    <div style={{ ...lbl, color: GOLD }}>{s.name.karmic}</div>
                    {result.name.karmicLessons.length === 0 && <div style={body}>{result.name.karmicNone}</div>}
                    {result.name.karmicLessons.map(k => (
                      <div key={k.value} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ fontFamily: MONO, fontSize: 12, width: 26, height: 26, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(180,147,63,.5)', color: LIT }}>{k.value}</div>
                        <div style={{ ...body, fontSize: 15 }}>{k.meaning}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ borderTop: HAIR, marginTop: 40, paddingTop: 18, fontSize: 13, color: MUTED }}>{result.footnote}</div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
