import { useCallback, useEffect, useRef, useState } from 'react';
import { astrologerSession, listProfiles } from './api.js';
import { READINGS, SPEED, getHistory, saveHistory, clearHistory } from './astrologers.js';
import { alignToWords, pacedWords } from './captions.js';
import { runOnPage } from './pageActions.js';
import { writeActive } from './active-profile.js';

const IDLE_END_MS = 60_000; // a quiet session is closed so it stops spending minutes
const THINK_TIMEOUT_MS = 20_000;

/* The profile a spoken name points at: full name, then first name, then a first-name prefix. */
export function findByName(list, name) {
  const n = name.trim().toLowerCase();
  const full = p => `${p.firstName} ${p.lastName}`.trim().toLowerCase();
  return list.find(p => full(p) === n)
    || list.find(p => p.firstName.trim().toLowerCase() === n)
    || list.find(p => full(p).startsWith(n));
}

/**
 * One conversation with the chosen astrologer. The session opens on the
 * first question or mic tap, not on page load, and closes itself when idle.
 */
export function useAstrologer({ prefs, profileId, page, navigate }) {
  const [aState, setAState] = useState('idle'); // idle | connecting | listening | thinking | speaking | error
  const [err, setErr] = useState(null);         // mic | offline | unsupported | nospeech | setup
  const [caption, setCaption] = useState(null); // { words: [{ w, t }], idx }
  const [interim, setInterim] = useState('');
  const [hist, setHist] = useState(getHistory);
  const [live, setLive] = useState(false);      // a hands-free conversation is on

  const conv = useRef(null);
  const opening = useRef(null);
  const mode = useRef({ textOnly: false });
  const typed = useRef(null);       // a typed question, so its echo is not added twice
  const pendingRef = useRef(null);  // a reading the agent opened during this answer
  const repeating = useRef(false);  // a replay: spoken again, not logged again
  const align = useRef(null);       // timings of the audio chunk about to play
  const speech = useRef({ words: [], cursor: 0, t0: 0, live: false });
  const timers = useRef({});
  const stateRef = useRef('idle');
  const liveRef = useRef(false);
  const stale = useRef(false);      // the session knows an older profile's chart
  const reliveRef = useRef(null);
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  const set = s => { stateRef.current = s; setAState(s); };
  const setOn = on => { liveRef.current = on; setLive(on); };
  // between answers: still listening while the conversation is on
  const rest = () => {
    // after confirming a profile switch: reconnect with the new chart, mic still on
    if (stale.current) { const wasLive = liveRef.current; set('idle'); return end().then(() => { if (wasLive) reliveRef.current(); }); }
    set(liveRef.current ? 'listening' : 'idle');
  };
  const clear = name => { clearTimeout(timers.current[name]); clearInterval(timers.current[name]); };

  const pushHist = useCallback(m => {
    setHist(h => { const next = h.concat([m]).slice(-30); saveHistory(next); return next; });
  }, []);

  const end = useCallback(async () => {
    Object.keys(timers.current).forEach(clear);
    const c = conv.current; conv.current = null; opening.current = null; stale.current = false;
    setOn(false);
    speech.current.live = false;
    if (c) try { await c.endSession(); } catch (e) {}
  }, []);

  const touch = useCallback(() => {
    clear('idle');
    timers.current.idle = setTimeout(() => { if (stateRef.current === 'idle') end(); }, IDLE_END_MS);
  }, [end]);

  const fail = useCallback(kind => {
    clear('think'); speech.current.live = false;
    setErr(kind); setInterim(''); setCaption(null); set('error');
  }, []);

  // advances the highlighted caption word against the voice's clock
  const runCaption = useCallback(() => {
    clear('tick');
    timers.current.tick = setInterval(() => {
      const s = speech.current; if (!s.words.length) return;
      const elapsed = performance.now() - s.t0;
      let i = 0; while (i + 1 < s.words.length && s.words[i + 1].t <= elapsed) i++;
      setCaption({ words: s.words.map(x => x.w), idx: i });
      // text-only answers finish when their last word has been shown
      if (!s.live && elapsed > s.words[s.words.length - 1].t + 1200) { clear('tick'); setCaption(null); if (stateRef.current === 'speaking') rest(); touch(); }
    }, 80);
  }, [touch]);

  const startSpeech = useCallback(() => {
    speech.current = { words: [], cursor: 0, t0: performance.now(), live: true };
    clear('think'); set('speaking'); runCaption();
  }, [runCaption]);

  const open = useCallback(async ({ voice, greet = false }) => {
    const p = prefsRef.current;
    const textOnly = !voice;
    if (conv.current && !stale.current && mode.current.textOnly === textOnly && mode.current.char === p.char && mode.current.rate === p.rate) return conv.current;
    if (opening.current) return opening.current;
    if (conv.current) await end();
    if (!profileId) throw Object.assign(new Error('no profile'), { kind: 'setup' });
    if (!navigator.onLine) throw Object.assign(new Error('offline'), { kind: 'offline' });

    opening.current = (async () => {
      const { signedUrl, dynamicVariables } = await astrologerSession({ character: p.char, profileId, page, greet });
      // the SDK is large, so it only loads once someone actually talks
      const { Conversation } = await import('@elevenlabs/client');
      const session = await Conversation.startSession({
        signedUrl,
        textOnly,
        dynamicVariables,
        overrides: { tts: { speed: SPEED[p.rate] || SPEED.normal }, ...(textOnly ? { conversation: { textOnly: true } } : {}) },
        clientTools: {
          open_reading: async ({ page: key, partner }) => {
            const r = READINGS[key]; if (!r) return 'unknown page';
            if (key === 'synastry' && partner) {
              const p = findByName(await listProfiles(), partner);
              if (!p || p._id === profileId) return `No saved profile matches "${partner}". Nothing was selected.`;
              pendingRef.current = key; navigate(`${r[1]}?with=${p._id}&go=1`);
              return `Opened the synastry reading for the user and ${p.firstName} ${p.lastName}. It is on screen now.`;
            }
            pendingRef.current = key; navigate(r[1]); return 'opened';
          },
          switch_profile: async ({ name }) => {
            const list = await listProfiles();
            const p = findByName(list, name || '');
            if (!p) return `No saved profile matches "${name}". Saved profiles: ${list.map(x => `${x.firstName} ${x.lastName}`).join(', ')}.`;
            if (p._id === profileId) return `${p.firstName} ${p.lastName} is already the active profile.`;
            writeActive(p._id);
            return `Switched the app to ${p.firstName} ${p.lastName}. You are now talking with ${p.firstName}: confirm in one short sentence using that name, and stop. Their chart reaches you right after, so do not describe it yet.`;
          },
          tarot: async args => {
            if (window.location.pathname !== READINGS.tarot[1]) navigate(READINGS.tarot[1]);
            pendingRef.current = 'tarot';
            return runOnPage('tarot', args);
          }
        },
        onModeChange: ({ mode: m }) => {
          if (textOnly) return;
          if (m === 'speaking' && stateRef.current !== 'speaking') startSpeech();
          if (m === 'listening' && stateRef.current === 'speaking') {
            speech.current.live = false;
            // let the last words land before the card goes
            clear('done'); timers.current.done = setTimeout(() => { clear('tick'); setCaption(null); if (stateRef.current === 'speaking') rest(); touch(); }, 700);
          }
        },
        // the SDK reports timings even for audio it drops after an interruption;
        // onAudio only fires for audio that plays, so captions wait for it
        onAudioAlignment: chunk => { align.current = chunk; },
        onAudio: () => {
          const chunk = align.current; align.current = null;
          if (!chunk) return;
          if (stateRef.current !== 'speaking') startSpeech();
          alignToWords(chunk, speech.current);
        },
        // the user talked over the answer: the SDK has cut the audio, so drop the captions too
        onInterruption: () => {
          align.current = null; speech.current.live = false;
          clear('done'); clear('tick'); setCaption(null);
          if (stateRef.current === 'speaking') rest();
        },
        onMessage: ({ message, role, source }) => {
          const fromUser = (role || source) === 'user';
          if (fromUser) {
            setInterim('');
            if (typed.current && typed.current === message.trim()) { typed.current = null; return; }
            if (message.trim() && message.trim() !== '...') pushHist({ role: 'user', text: message.trim() });
            clear('think'); set('thinking');
            timers.current.think = setTimeout(() => { if (stateRef.current === 'thinking') fail('offline'); }, THINK_TIMEOUT_MS);
            return;
          }
          if (repeating.current) repeating.current = false;
          else pushHist({ role: 'astro', text: message, ref: pendingRef.current });
          pendingRef.current = null;
          // no audio in text-only mode, or if alignment never came: pace the words instead
          if (textOnly || !speech.current.words.length) {
            clear('think'); set('speaking');
            speech.current = { words: pacedWords(message, SPEED[prefsRef.current.rate] / SPEED.normal), cursor: 0, t0: performance.now(), live: false };
            runCaption();
          }
        },
        onError: () => fail('offline'),
        onDisconnect: () => {
          conv.current = null; setOn(false);
          if (stateRef.current !== 'error') { clear('tick'); setCaption(null); setInterim(''); set('idle'); }
        }
      });
      if (!textOnly) session.setMicMuted(true);
      conv.current = session;
      mode.current = { textOnly, char: p.char, rate: p.rate };
      return session;
    })();

    try { return await opening.current; }
    finally { opening.current = null; }
  }, [end, fail, navigate, page, profileId, pushHist, runCaption, startSpeech, touch]);

  const kindOf = e => e.kind || (e.name === 'NotAllowedError' || e.name === 'NotFoundError' ? 'mic' : e.status === 503 ? 'setup' : 'offline');

  /* Voice needs the microphone granted; otherwise the reply arrives as text. */
  const voiceMode = () => prefsRef.current.voiceOn && prefsRef.current.micOk;

  const ask = useCallback(async text => {
    const q = (text || '').trim(); if (!q) return;
    clear('tick'); setCaption(null); setErr(null);
    pushHist({ role: 'user', text: q });
    set('thinking');
    try {
      const c = await open({ voice: voiceMode() });
      typed.current = q;
      c.sendUserMessage(q);
      clear('think'); timers.current.think = setTimeout(() => { if (stateRef.current === 'thinking') fail('offline'); }, THINK_TIMEOUT_MS);
    } catch (e) { fail(kindOf(e)); }
  }, [fail, open, pushHist]);

  /* The start/end switch: on = open mic, the agent answers whenever the
     user pauses; off = the session ends and nothing is heard. */
  const toggleLive = useCallback(async () => {
    if (liveRef.current) { await end(); clear('tick'); setCaption(null); set('idle'); return; }
    setErr(null); clear('tick'); setCaption(null);
    // opening a voice session takes a second or two; say so
    if (!conv.current) set('connecting');
    try {
      const session = await open({ voice: true });
      session.setMicMuted(false);
      setOn(true);
      if (stateRef.current !== 'speaking') set('listening');
    } catch (e) { fail(kindOf(e)); }
  }, [end, fail, open]);
  reliveRef.current = toggleLive;

  const greet = useCallback(async () => {
    set('thinking');
    try { await open({ voice: voiceMode(), greet: true }); }
    catch (e) { fail(kindOf(e)); }
  }, [fail, open]);

  /* Cuts the voice mid-answer; the next question opens a fresh session. */
  const stop = useCallback(async () => {
    await end(); setCaption(null); set('idle');
  }, [end]);

  /* The agent says its last answer again; with no session left, the text replays on its own. */
  const replay = useCallback(async () => {
    const last = [...hist].reverse().find(m => m.role === 'astro');
    if (!last) return;
    clear('tick'); setCaption(null); setErr(null);
    if (!conv.current) {
      set('speaking');
      speech.current = { words: pacedWords(last.text, SPEED[prefsRef.current.rate] / SPEED.normal), cursor: 0, t0: performance.now(), live: false };
      return runCaption();
    }
    const q = 'Please say your last answer again, word for word.';
    set('thinking'); repeating.current = true; typed.current = q;
    conv.current.sendUserMessage(q);
  }, [hist, runCaption]);

  const clearHist = useCallback(() => { setHist([]); clearHistory(); }, []);
  const reset = useCallback(() => { setErr(null); set('idle'); }, []);

  // a new active profile: finish the current sentence, then reconnect (see rest)
  const lastProfile = useRef(profileId);
  useEffect(() => {
    if (lastProfile.current && lastProfile.current !== profileId && conv.current) {
      stale.current = true;
      if (stateRef.current === 'listening' || stateRef.current === 'idle') rest();
    }
    lastProfile.current = profileId;
  }, [profileId]); // eslint-disable-line react-hooks/exhaustive-deps

  // a different astrologer, voice or speed needs a new session
  useEffect(() => { end(); }, [prefs.char, prefs.voiceOn, prefs.rate, end]);
  useEffect(() => () => { end(); }, [end]);

  return { aState, err, caption, interim, hist, live, ask, toggleLive, greet, stop, replay, clearHist, reset, fail };
}
