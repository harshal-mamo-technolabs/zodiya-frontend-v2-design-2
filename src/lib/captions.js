/* Caption timing for the astrologer's answers. Run `node src/lib/captions.check.mjs` after changing it. */

/* Words of a spoken answer with their start time (ms from when the voice
   began), built from ElevenLabs' per-character alignment chunks. A chunk can
   end mid-word, so `s.open` carries the unfinished word into the next one. */
export function alignToWords(chunk, s) {
  let cur = s.open ? s.words[s.words.length - 1] : null;
  chunk.chars.forEach((ch, i) => {
    if (/\s/.test(ch)) { cur = null; return; }
    if (cur) cur.w += ch;
    else { cur = { w: ch, t: s.cursor + chunk.char_start_times_ms[i] }; s.words.push(cur); }
  });
  const last = chunk.chars.length - 1;
  if (last < 0) return;
  s.open = !!cur;
  s.cursor += chunk.char_start_times_ms[last] + chunk.char_durations_ms[last];
}

/* Text without audio (voice off, or typed-only) still reads out word by word. */
export const pacedWords = (text, rate) => {
  const ms = 60000 / (170 * rate);
  return text.split(/\s+/).filter(Boolean).map((w, i) => ({ w, t: i * ms }));
};
