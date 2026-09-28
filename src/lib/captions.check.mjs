// node src/lib/captions.check.mjs — throws if caption timing breaks
import assert from 'node:assert/strict';
import { alignToWords, pacedWords } from './captions.js';

const s = { words: [], cursor: 0, open: false };
// "Your house" split mid-word across two audio chunks, as ElevenLabs does
alignToWords({ chars: [...'Your ho'], char_start_times_ms: [0, 50, 100, 150, 200, 250, 300], char_durations_ms: [50, 50, 50, 50, 50, 50, 50] }, s);
alignToWords({ chars: [...'use is'], char_start_times_ms: [0, 50, 100, 150, 200, 250], char_durations_ms: [50, 50, 50, 50, 50, 50] }, s);
assert.deepEqual(s.words.map(w => w.w), ['Your', 'house', 'is']);
assert.deepEqual(s.words.map(w => w.t), [0, 250, 350 + 200]);
assert.equal(s.cursor, 350 + 300);

const paced = pacedWords('one two  three', 1);
assert.deepEqual(paced.map(w => w.w), ['one', 'two', 'three']);
assert.ok(paced[2].t > paced[1].t);
console.log('captions ok');
