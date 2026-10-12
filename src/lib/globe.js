/* The astrocartography globe: three.js Earth with Natural Earth coastlines
   (world-atlas, drawn with d3-geo) and the planetary lines. Loaded on demand
   by the Astrocartography page, so three.js stays out of the main bundle. */
import * as T from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { geoEquirectangular, geoGraticule, geoPath } from 'd3-geo';
import { feature, mesh } from 'topojson-client';

const D2R = Math.PI / 180;
const CREAM = '#F4ECDC', OCEAN = '#141B2D', GOLD = '#B4933F';
const SYM = "'Noto Sans Symbols','Segoe UI Symbol','Apple Symbols',serif";
const pos = (lat, lon, r) => { const p = lat * D2R, l = lon * D2R; return [r * Math.cos(p) * Math.cos(l), r * Math.sin(p), -r * Math.cos(p) * Math.sin(l)]; };
const VERT = 'varying vec3 vN; varying vec3 vE; void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vE = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }';
const RIM = 'uniform vec3 c; varying vec3 vN; varying vec3 vE; void main(){ float f = pow(1.0 - max(dot(vN, vE), 0.0), 3.5); gl_FragColor = vec4(c * f * 0.5, f * 0.5); }';
const HALO = 'uniform vec3 c; varying vec3 vN; varying vec3 vE; void main(){ float d = max(0.0, -dot(normalize(vN), vec3(0.0, 0.0, 1.0))); float i = pow(d, 1.7) * 2.6; gl_FragColor = vec4(c * i, i); }';
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export class Globe {
  /** host: the sized element the canvas fills. onPick({ lat, lon }) fires on a tap; onLoaded once the
      coastlines are drawn; onInteract on the first drag, zoom or tap. */
  constructor(canvas, host, { onPick, onLoaded, onInteract, reducedMotion = false }) {
    Object.assign(this, { canvas, host, onPick, onLoaded, onInteract });
    this._lineObjs = []; this._labels = []; this._rings = []; this._hidden = new Set();
    this._auto = !reducedMotion; this._idleAt = 0; this._vis = true; this._placed = false;

    const R = this.renderer = new T.WebGLRenderer({ canvas, alpha: true, antialias: true });
    R.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); R.setClearColor(0, 0); R.outputColorSpace = T.SRGBColorSpace;
    const scene = this.scene = new T.Scene();
    const cam = this.camera = new T.PerspectiveCamera(30, 1, .1, 50); cam.position.set(1.2, 1.1, 2.8).setLength(4.6); scene.add(cam); // the whole Earth in view, with a margin (fov 30°: it just fits from 4.3)
    scene.add(new T.AmbientLight(0xffffff, 1.15));
    const key = new T.DirectionalLight(0xfff4e0, 1.5); key.position.set(-3, 2.5, 4); cam.add(key);
    const ctl = this.controls = new OrbitControls(cam, canvas);
    Object.assign(ctl, { enablePan: false, enableDamping: true, dampingFactor: .07, rotateSpeed: .55, zoomSpeed: .5, minDistance: 1.75, maxDistance: 6, autoRotate: this._auto, autoRotateSpeed: .32 });
    ctl.addEventListener('start', () => { this._touched(); this._idleAt = performance.now() + 7000; this._fly = null; canvas.style.cursor = 'grabbing'; });
    ctl.addEventListener('end', () => { this._idleAt = performance.now() + 7000; canvas.style.cursor = 'grab'; });

    this.map = document.createElement('canvas'); this.map.width = 3072; this.map.height = 1536;
    const mx = this.map.getContext('2d'); mx.fillStyle = OCEAN; mx.fillRect(0, 0, this.map.width, this.map.height);
    const tex = this.tex = new T.CanvasTexture(this.map); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = R.capabilities.getMaxAnisotropy();
    this.globe = new T.Mesh(new T.SphereGeometry(1, 96, 64), new T.MeshStandardMaterial({ map: tex, roughness: 1, metalness: 0 })); scene.add(this.globe);
    const sh = (frag, col, extra) => new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: { c: { value: new T.Color(col) } }, vertexShader: VERT, fragmentShader: frag, ...extra });
    scene.add(new T.Mesh(new T.SphereGeometry(1.004, 96, 64), sh(RIM, CREAM)));
    scene.add(new T.Mesh(new T.SphereGeometry(1.09, 96, 64), sh(HALO, GOLD, { side: T.BackSide })));
    this.lines = new T.Group(); scene.add(this.lines);
    this.marks = new T.Group(); scene.add(this.marks);
    this.ray = new T.Raycaster();

    this._ro = new ResizeObserver(() => this._resize()); this._ro.observe(host); this._resize();
    this._io = new IntersectionObserver(es => { this._vis = es[es.length - 1].isIntersecting; }); this._io.observe(host);
    this._bindPick();
    this._loadWorld().catch(e => console.warn('world geometry failed', e));
    this._last = performance.now();
    this._raf = requestAnimationFrame(t => this._loop(t));
  }

  destroy() {
    this._dead = true; cancelAnimationFrame(this._raf);
    this._ro.disconnect(); this._io.disconnect(); this.controls.dispose();
    this.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } });
    this.renderer.dispose();
  }

  _resize() {
    const w = this.host.clientWidth || 320, h = this.host.clientHeight || 320;
    this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this._res = [w, h]; this._lineObjs.forEach(o => o.material.resolution.set(w, h));
  }

  async _loadWorld() {
    // bundled as separate chunks; only fetched when the globe opens
    const [land110, countries] = await Promise.all([import('world-atlas/land-110m.json'), import('world-atlas/countries-110m.json')]);
    if (this._dead) return;
    const W = this.map.width, H = this.map.height, x = this.map.getContext('2d');
    const path = geoPath(geoEquirectangular().scale(W / (2 * Math.PI)).translate([W / 2, H / 2]), x);
    x.fillStyle = OCEAN; x.fillRect(0, 0, W, H);
    x.lineWidth = 1; x.strokeStyle = 'rgba(244,236,220,.09)'; x.beginPath(); path(geoGraticule().step([15, 15])()); x.stroke();
    x.lineWidth = 1.4; x.strokeStyle = 'rgba(180,147,63,.45)'; x.beginPath(); path({ type: 'LineString', coordinates: [[-180, 0], [-90, 0], [0, 0], [90, 0], [180, 0]] }); x.stroke();
    [23.4365, -23.4365].forEach(t => { x.lineWidth = 1; x.strokeStyle = 'rgba(180,147,63,.22)'; x.beginPath(); path({ type: 'LineString', coordinates: [[-180, t], [-90, t], [0, t], [90, t], [180, t]] }); x.stroke(); });
    const landTopo = land110.default || land110, countryTopo = countries.default || countries;
    const land = feature(landTopo, landTopo.objects.land), borders = mesh(countryTopo, countryTopo.objects.countries, (a, b) => a !== b);
    x.fillStyle = 'rgba(244,236,220,.16)'; x.beginPath(); path(land); x.fill();
    x.lineWidth = .9; x.strokeStyle = 'rgba(244,236,220,.26)'; x.beginPath(); path(borders); x.stroke();
    x.lineWidth = 1.7; x.strokeStyle = 'rgba(244,236,220,.72)'; x.beginPath(); path(land); x.stroke();
    this.tex.needsUpdate = true;
    if (this.onLoaded) this.onLoaded();
  }

  _label(glyph, code, color) {
    const c = document.createElement('canvas'); c.width = 128; c.height = 160; const x = c.getContext('2d');
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = 'rgba(10,14,24,.95)'; x.shadowBlur = 10;
    x.fillStyle = color; x.font = '600 78px ' + SYM; x.fillText(glyph + '︎', 64, 66);
    x.font = "500 30px 'IBM Plex Mono',monospace"; x.fillStyle = CREAM; x.fillText(code, 64, 132);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace;
    const s = new T.Sprite(new T.SpriteMaterial({ map: t, transparent: true, depthWrite: false })); s.scale.set(.11, .1375, 1); return s;
  }

  _marker(color, size) {
    const g = new T.Group();
    g.add(new T.Mesh(new T.SphereGeometry(size, 16, 12), new T.MeshBasicMaterial({ color })));
    const ring = new T.Mesh(new T.RingGeometry(size * 1.8, size * 2.3, 48), new T.MeshBasicMaterial({ color, transparent: true, opacity: .8, side: T.DoubleSide, depthWrite: false }));
    g.add(ring); this._rings.push(ring); return g;
  }
  _place(obj, lat, lon, r) { const [x, y, z] = pos(lat, lon, r); obj.position.set(x, y, z); obj.lookAt(0, 0, 0); }

  setLines(lines, birth) {
    this.lines.clear(); this._lineObjs = []; this._labels = []; this._rings = []; this.marks.clear(); this._selMark = null;
    const [w, h] = this._res || [300, 300];
    lines.forEach(l => {
      const flat = []; l.points.forEach(p => flat.push(...pos(p[0], p[1], 1.012)));
      const geo = new LineGeometry().setPositions(flat);
      const mk = (lw, op, add) => {
        const m = new LineMaterial({ color: new T.Color(l.color).getHex(), linewidth: lw, dashed: l.dashed, dashSize: .035, gapSize: .024, transparent: true, opacity: op, depthWrite: !add, blending: add ? T.AdditiveBlending : T.NormalBlending });
        m.resolution.set(w, h);
        const o = new Line2(geo, m); o.computeLineDistances(); o.userData.planet = l.planet; o.visible = !this._hidden.has(l.planet);
        this.lines.add(o); this._lineObjs.push(o);
      };
      mk(2, .95, false); mk(9, .13, true);
      const s = this._label(l.glyph, l.angle, l.color); const [x, y, z] = pos(l.label[0], l.label[1], 1.045);
      s.position.set(x, y, z); s.userData.planet = l.planet; s.visible = !this._hidden.has(l.planet); this.lines.add(s); this._labels.push(s);
    });
    if (birth) {
      const m = this._marker(GOLD, .011); this._place(m, birth.lat, birth.lon, 1.006); this.marks.add(m);
      // open facing the birthplace
      if (!this._placed) { this._placed = true; const d = this.camera.position.length(); const [x, y, z] = pos(birth.lat, birth.lon, 1); this.camera.position.set(x * d, y * d, z * d); this.controls.update(); }
    }
  }
  setHidden(list) { this._hidden = new Set(list); [...this._lineObjs, ...this._labels].forEach(o => { o.visible = !this._hidden.has(o.userData.planet); }); }
  setSelected(lat, lon) {
    if (this._selMark) { this.marks.remove(this._selMark); this._rings = this._rings.filter(r => r.parent !== this._selMark); this._selMark = null; }
    if (lat == null) return;
    const m = this._selMark = this._marker(CREAM, .013); this._place(m, lat, lon, 1.006); this.marks.add(m);
  }
  _touched() { if (this.onInteract) { this.onInteract(); this.onInteract = null; } }
  /** The +/- buttons: closer below 1, further above, within the scroll-zoom limits. */
  zoom(factor) {
    this._touched(); this._fly = null; this._idleAt = performance.now() + 7000;
    const d = Math.min(this.controls.maxDistance, Math.max(this.controls.minDistance, this.camera.position.length() * factor));
    this.camera.position.setLength(d); this.controls.update();
  }
  flyTo(lat, lon, ms = 1100) {
    const from = this.camera.position.clone(), d0 = from.length(), d1 = Math.min(d0, 3.4); // closer for a city, but the region stays readable
    const a = from.clone().normalize(), b = new T.Vector3(...pos(lat, lon, 1));
    this._fly = { t0: performance.now(), ms, a, q: new T.Quaternion().setFromUnitVectors(a, b), d0, d1 };
    this._idleAt = performance.now() + ms + 7000;
  }

  _bindPick() {
    let down = null;
    this.canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
    this.canvas.addEventListener('pointerup', e => {
      if (!down) return; const dx = e.clientX - down.x, dy = e.clientY - down.y, dt = performance.now() - down.t; down = null;
      // a drag turns the globe; only a short, still tap picks a place
      if (dx * dx + dy * dy > 36 || dt > 600) return;
      const r = this.canvas.getBoundingClientRect(), nd = new T.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      this.ray.setFromCamera(nd, this.camera);
      const hit = this.ray.intersectObject(this.globe, false)[0]; if (!hit) return;
      const p = hit.point, len = p.length();
      this._idleAt = performance.now() + 9000;
      this._touched();
      if (this.onPick) this.onPick({ lat: Math.asin(p.y / len) / D2R, lon: Math.atan2(-p.z, p.x) / D2R });
    });
  }

  _loop(now) {
    if (this._dead) return;
    this._raf = requestAnimationFrame(t => this._loop(t));
    this._last = now;
    if (!this._vis) return;
    if (this._fly) {
      const f = this._fly, k = Math.min(1, (now - f.t0) / f.ms), e = ease(k);
      const q = new T.Quaternion().slerp(f.q, e), p = f.a.clone().applyQuaternion(q).multiplyScalar(f.d0 + (f.d1 - f.d0) * e);
      this.camera.position.copy(p); if (k >= 1) this._fly = null;
    }
    this.controls.autoRotate = this._auto && !this._fly && now > this._idleAt;
    this.controls.update();
    const ph = (now / 1600) % 1;
    this._rings.forEach(r => { r.scale.setScalar(1 + ph * .9); r.material.opacity = .85 * (1 - ph); });
    this.renderer.render(this.scene, this.camera);
  }
}
