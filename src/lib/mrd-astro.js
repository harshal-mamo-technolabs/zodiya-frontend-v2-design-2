/* The animated astrologer figure, ported from the design's astrologer.js.
   <mrd-astro char="aries|…|pisces" state="idle|listening|thinking|speaking|error" reduced="true|false" framing="full|face">
   The figure is drawn in thin horizontal strips; each strip is offset/scaled so the body sways from the feet,
   breathes at the chest and the head nods, tilts and bobs above the neck. Without its portrait
   (public/astrologers/<id>.png) it draws the sign's glyph in the same light instead. */
import { CHARACTERS, byId } from './astrologers.js';

const IDS = CHARACTERS.map(c => c.id);
const COL = { idle: [226, 184, 101], listening: [127, 224, 210], thinking: [185, 166, 255], speaking: [255, 217, 138], error: [255, 142, 142] };
const TARGET = {
  idle: { lean: 0, tilt: 0, nodUp: 0, sink: 0, dots: 0, sat: 1, energy: 1 },
  listening: { lean: 0.035, tilt: 0.09, nodUp: -0.01, sink: 0, dots: 0, sat: 1, energy: 1.2 },
  thinking: { lean: -0.015, tilt: -0.08, nodUp: 0.025, sink: 0, dots: 1, sat: 1, energy: 0.8 },
  speaking: { lean: 0.012, tilt: 0, nodUp: 0, sink: 0, dots: 0, sat: 1, energy: 1.4 },
  error: { lean: 0.05, tilt: 0.06, nodUp: -0.03, sink: 0.015, dots: 0, sat: 0.45, energy: 0.4 }
};

const IMG = {};
function loadImg(id) {
  if (IMG[id]) return IMG[id];
  return (IMG[id] = new Promise((res, rej) => {
    const im = new Image(); im.decoding = 'async';
    im.onload = () => {
      // head centre from the top 10% of opaque pixels
      const w = im.naturalWidth, h = im.naturalHeight, c = document.createElement('canvas'); c.width = w; c.height = Math.round(h * 0.1);
      const x = c.getContext('2d'); x.drawImage(im, 0, 0);
      let sx = 0, n = 0;
      try { const d = x.getImageData(0, 0, w, c.height).data; for (let j = 0; j < c.height; j++) for (let i = 0; i < w; i++) if (d[(j * w + i) * 4 + 3] > 128) { sx += i; n++; } } catch (e) {}
      res({ im, w, h, hx: n ? sx / n / w : 0.5 });
    };
    im.onerror = rej; im.src = `/astrologers/${id}.png`;
  }));
}

let dialCv = null;
function dial() {
  if (dialCv) return dialCv;
  const S = 512, c = S / 2, cv = document.createElement('canvas'); cv.width = cv.height = S; const x = cv.getContext('2d');
  x.strokeStyle = '#fff'; x.fillStyle = '#fff';
  x.lineWidth = 3; x.beginPath(); x.arc(c, c, c * 0.97, 0, 7); x.stroke();
  x.lineWidth = 1.5; x.beginPath(); x.arc(c, c, c * 0.74, 0, 7); x.stroke();
  x.globalAlpha = 0.5; x.beginPath(); x.arc(c, c, c * 0.45, 0, 7); x.stroke(); x.globalAlpha = 1;
  for (let i = 0; i < 72; i++) { const a = i / 72 * Math.PI * 2, l = i % 6 ? 0.03 : 0.07; x.lineWidth = i % 6 ? 1.2 : 2.5; x.beginPath(); x.moveTo(c + Math.cos(a) * c * 0.97, c + Math.sin(a) * c * 0.97); x.lineTo(c + Math.cos(a) * c * (0.97 - l), c + Math.sin(a) * c * (0.97 - l)); x.stroke(); }
  x.font = '34px "Noto Sans Symbols","Segoe UI Symbol","Apple Symbols",serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  CHARACTERS.forEach((ch, i) => { const a = (i + 0.5) / 12 * Math.PI * 2; x.save(); x.translate(c + Math.cos(a) * c * 0.855, c + Math.sin(a) * c * 0.855); x.rotate(a + Math.PI / 2); x.fillText(ch.glyph + '︎', 0, 0); x.restore(); });
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; x.lineWidth = 1.2; x.beginPath(); x.moveTo(c + Math.cos(a) * c * 0.45, c + Math.sin(a) * c * 0.45); x.lineTo(c + Math.cos(a) * c * 0.74, c + Math.sin(a) * c * 0.74); x.stroke(); }
  return (dialCv = cv);
}

const live = new Set(); let running = false;
// rAF with a timer fallback (rAF can stall in background tabs)
let rafId = 0, toId = 0;
const next = () => {
  const fire = now => { cancelAnimationFrame(rafId); clearTimeout(toId); loop(typeof now === 'number' ? now : performance.now()); };
  rafId = requestAnimationFrame(fire); toId = setTimeout(fire, document.hidden ? 200 : 80);
};
function loop(now) {
  if (!live.size) { running = false; return; }
  next();
  live.forEach(el => { if (el._ready && el._vis) { try { el._draw(now); } catch (e) { if (!el._err) { el._err = 1; console.warn('mrd-astro', e); } } } });
}
const rgba = (c, a) => 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a.toFixed(3) + ')';

class Astro extends HTMLElement {
  static get observedAttributes() { return ['char', 'framing']; }
  connectedCallback() {
    if (!this._cv) {
      const s = this.style; if (!s.display) s.display = 'block'; if (!s.width) s.width = '100%'; if (!s.height) s.height = '100%'; if (!s.position) s.position = 'relative';
      this._cv = document.createElement('canvas'); this._cv.style.cssText = 'position:absolute;inset:0;display:block;width:100%;height:100%;';
      this.appendChild(this._cv); this._ctx = this._cv.getContext('2d'); this.setAttribute('role', 'img');
      this._cur = Object.assign({}, TARGET.idle, { talk: 0, nod: 0 }); this._col = COL.idle.slice();
      this._t0 = performance.now() - Math.random() * 6000; this._last = performance.now();
      this._dust = Array.from({ length: 26 }, () => ({ x: Math.random(), y: Math.random(), s: 0.4 + Math.random(), v: 0.02 + Math.random() * 0.05, p: Math.random() * 6.28 }));
    }
    this._vis = true;
    this._io = new IntersectionObserver(es => { this._vis = es[es.length - 1].isIntersecting; }); this._io.observe(this);
    live.add(this); this._load();
    if (!running) { running = true; next(); }
  }
  disconnectedCallback() { live.delete(this); if (this._io) this._io.disconnect(); }
  attributeChangedCallback(n, o, v) { if (o !== v && n === 'char' && this._cv) this._load(); }
  _load() {
    let id = this.getAttribute('char') || 'virgo'; if (!IDS.includes(id)) id = 'virgo';
    this._id = id; this.setAttribute('aria-label', byId(id).name + ', your AI astrologer');
    this._a = null; this._ready = true;
    loadImg(id).then(a => { if (this._id === id) this._a = a; }).catch(() => {});
  }
  _draw(now) {
    const cv = this._cv, x = this._ctx, a = this._a, dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = Math.round(this.clientWidth * dpr), H = Math.round(this.clientHeight * dpr); if (!W || !H) return;
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    const dt = Math.min(0.1, (now - this._last) / 1000); this._last = now;
    const t = (now - this._t0) / 1000, c = this._cur;
    const st = TARGET[this.getAttribute('state')] ? this.getAttribute('state') : 'idle';
    const red = (this.getAttribute('reduced') || 'false') !== 'false', mo = red ? 0 : 1;
    const tg = TARGET[st], k = 1 - Math.exp(-dt * 5);
    for (const key in tg) c[key] += (tg[key] - c[key]) * k;
    const talkT = st === 'speaking' ? (red ? 0.4 : Math.max(0, Math.sin(t * 10.7) * Math.sin(t * 3.9 + 1)) * 0.8 + 0.2 * Math.abs(Math.sin(t * 17))) : 0;
    c.talk += (talkT - c.talk) * (1 - Math.exp(-dt * 16));
    const col = this._col, tc = COL[st]; for (let i = 0; i < 3; i++) col[i] += (tc[i] - col[i]) * k;
    const face = this.getAttribute('framing') === 'face';
    x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, W, H);

    // figure placement; without a portrait, a square the glyph is drawn in
    let fh, fx, fy;
    const ar = a ? a.w / a.h : 1;
    if (face) { fh = a ? H * 3.1 : H * 0.8; fx = W / 2 - (a ? a.hx : 0.5) * fh * ar; fy = a ? H * 0.5 - fh * 0.105 : H * 0.1; }
    else { fh = Math.min(H * 0.84, (W * 0.9) / ar) * (a ? 1 : 0.7); fx = W / 2 - fh * ar / 2; fy = H * 0.9 - fh - (a ? 0 : H * 0.08); }
    const fw = fh * ar, feetY = fy + fh, cx = W / 2;
    const float = mo * Math.sin(t * 1.4) * fh * 0.006;
    const ro = st === 'listening' ? 0.45 + 0.4 * (red ? 0.6 : Math.sin(t * 5) * 0.5 + 0.5) : st === 'speaking' ? 0.5 + c.talk * 0.35 : st === 'error' ? 0.25 : 0.45;

    // backdrop glow
    const gy = face ? H * 0.5 : fy + fh * 0.35, gr = face ? W * 0.62 : Math.max(W, fh) * 0.55;
    const g = x.createRadialGradient(cx, gy, 0, cx, gy, gr);
    g.addColorStop(0, rgba(col, 0.22 + ro * 0.2)); g.addColorStop(0.55, rgba(col, 0.07)); g.addColorStop(1, rgba(col, 0));
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    // floor dial, shadow and light column
    if (!face) {
      const dw = Math.min(W * 0.92, fh * 0.95 / (a ? 1 : 0.7)), dh = dw * 0.26, dialY = a ? feetY - fh * 0.005 : H * 0.88;
      x.save(); x.translate(cx, dialY); x.scale(1, dh / dw);
      x.rotate(red ? 0 : t * (st === 'thinking' ? 0.45 : 0.06));
      x.globalAlpha = 0.35 + ro * 0.45; x.globalCompositeOperation = 'lighter';
      x.drawImage(dial(), -dw / 2, -dw / 2, dw, dw);
      x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
      x.restore();
      if (a) {
        const sh = x.createRadialGradient(cx, feetY, 0, cx, feetY, fw * 0.55);
        sh.addColorStop(0, 'rgba(0,0,0,.55)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
        x.save(); x.translate(0, feetY); x.scale(1, 0.22); x.translate(0, -feetY); x.fillStyle = sh; x.fillRect(cx - fw, feetY - fw, fw * 2, fw * 2); x.restore();
      }
      const bm = x.createLinearGradient(0, dialY, 0, fy);
      bm.addColorStop(0, rgba(col, 0.1 + ro * 0.08)); bm.addColorStop(1, rgba(col, 0));
      x.fillStyle = bm; x.beginPath(); x.ellipse(cx, dialY, dw * 0.42, dh * 0.42, 0, 0, Math.PI); x.lineTo(cx - dw * 0.36, fy); x.lineTo(cx + dw * 0.36, fy); x.closePath(); x.fill();
    }
    // stardust behind
    x.globalCompositeOperation = 'lighter';
    this._dust.forEach(d => {
      const yy = ((d.y - (red ? 0 : t * d.v)) % 1 + 1) % 1, al = Math.sin(yy * Math.PI) * (0.35 + 0.35 * Math.sin(t * 2 + d.p));
      const px = d.x * W, py = yy * H, r = d.s * dpr * (face ? 1 : 1.3);
      x.fillStyle = 'rgba(255,241,208,' + Math.max(0, al).toFixed(3) + ')'; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill();
    });
    x.globalCompositeOperation = 'source-over';

    const sway = mo * Math.sin(t * 0.9) * 0.012 * c.energy + c.lean;
    const breath = mo * (Math.sin(t * 2.2) * 0.5 + 0.5);
    const nodS = st === 'speaking' ? mo * (Math.sin(t * 5.8) * 0.018 + c.talk * 0.014) : 0;

    if (!a) {
      // the sign's glyph, breathing and nodding with the same state machine
      const size = fh * (1 + breath * 0.02 + (st === 'speaking' ? c.talk * 0.05 : 0));
      x.save(); x.translate(cx + sway * fh * 0.4, fy + fh / 2 - float + (c.nodUp + nodS) * fh);
      x.rotate(c.tilt * 0.5);
      if (c.sat < 0.99) x.globalAlpha = 0.6;
      x.font = `${Math.round(size * 0.78)}px "Noto Sans Symbols","Segoe UI Symbol","Apple Symbols",serif`;
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.shadowColor = rgba(col, 0.9); x.shadowBlur = size * 0.18;
      x.fillStyle = rgba([255, 241, 208], 0.95); x.fillText(byId(this._id).glyph + '︎', 0, 0);
      x.restore();
    } else {
      // warped figure
      const neck = 0.215, chestA = 0.24, chestB = 0.52;
      const headTilt = c.tilt + mo * Math.sin(t * 0.7) * 0.025;
      const headTurn = mo * Math.sin(t * 0.43) * 0.012 + (st === 'thinking' ? -0.012 : 0);
      const sink = c.sink * fh;
      if (c.sat < 0.99) x.filter = 'saturate(' + c.sat.toFixed(2) + ') brightness(' + (0.75 + c.sat * 0.25).toFixed(2) + ')';
      const N = Math.max(40, Math.min(140, Math.round(fh / (2.2 * dpr))));
      const sh = a.h / N, dh = fh / N;
      for (let i = 0; i < N; i++) {
        const y = (i + 0.5) / N, fromFeet = 1 - y;
        let dx = sway * Math.pow(fromFeet, 1.35) * fh;
        let sx = 1, dy = -float * fromFeet - sink * Math.pow(fromFeet, 2);
        // breathing: widen chest, lift shoulders a hair
        if (y > chestA && y < chestB) sx += breath * 0.012 * Math.sin((y - chestA) / (chestB - chestA) * Math.PI);
        if (y < chestB) dy -= breath * 0.0025 * fh * (1 - y / chestB);
        let hs = 1;
        if (y < neck) {
          const u = (neck - y) / neck; // 0 at neck, 1 at crown
          dx += (headTilt + headTurn) * u * neck * fh * 1.2;
          dy += (c.nodUp + nodS) * u * fh * 0.9;
          hs = 1 + (st === 'speaking' ? c.talk * 0.012 : 0);
          dy -= (hs - 1) * u * neck * fh;
        }
        const sy = i * sh, py = fy + i * dh + dy, w = fw * sx, px = fx + dx - (w - fw) * 0.5;
        x.drawImage(a.im, 0, sy, a.w, sh + 0.6, px, py, w, dh * hs + 0.9);
      }
      x.filter = 'none';
      // rim light in the state colour, over the figure only
      x.save(); x.globalCompositeOperation = 'source-atop';
      const rim = x.createLinearGradient(fx - fw * 0.1, 0, fx + fw * 1.1, 0);
      rim.addColorStop(0, rgba(col, 0.28 * ro)); rim.addColorStop(0.3, rgba(col, 0)); rim.addColorStop(0.75, rgba(col, 0)); rim.addColorStop(1, rgba(col, 0.2 * ro));
      x.fillStyle = rim; x.fillRect(fx - fw, fy - fh * 0.1, fw * 3, fh * 1.1); x.restore();
    }
    const hx = a ? fx + a.hx * fw : cx;
    // thinking motes
    if (c.dots > 0.02) {
      const hy = face ? H * 0.12 : fy - fh * 0.04;
      x.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) {
        const an = i / 3 * Math.PI * 2 + (red ? 0 : t * 2.4), rx = (face ? W * 0.18 : fw * 0.28), ry = rx * 0.3;
        const px = hx + Math.cos(an) * rx, py = hy + Math.sin(an) * ry, r = (face ? W * 0.025 : fh * 0.014) * (0.8 + 0.3 * Math.sin(an));
        const dg = x.createRadialGradient(px, py, 0, px, py, r * 3); dg.addColorStop(0, 'rgba(230,220,255,' + c.dots + ')'); dg.addColorStop(1, 'rgba(185,166,255,0)');
        x.fillStyle = dg; x.fillRect(px - r * 3, py - r * 3, r * 6, r * 6);
      }
      x.globalCompositeOperation = 'source-over';
    }
    // listening ripple
    if (st === 'listening' && !red) {
      const p = (t * 0.8) % 1, hy = face ? H * 0.5 : fy + fh * (a ? 0.12 : 0.5), rr = (face ? W * 0.3 : fw * 0.4) * (1 + p * 0.8);
      x.strokeStyle = rgba(col, 0.5 * (1 - p)); x.lineWidth = 1.5 * dpr; x.beginPath(); x.arc(hx, hy, rr, 0, 7); x.stroke();
    }
  }
}

if (!customElements.get('mrd-astro')) customElements.define('mrd-astro', Astro);
