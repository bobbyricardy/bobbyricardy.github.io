import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const GEO = { lat: 1.2939, lon: 103.8461 };
// High-res NASA Blue Marble via three-globe's curated assets
const TEX = {
  day: 'https://unpkg.com/three-globe@2.28.0/example/img/earth-blue-marble.jpg',
  night: 'https://unpkg.com/three-globe@2.28.0/example/img/earth-night.jpg',
};

// ─── NODES & EDGES ────────────────────────────────────────────────────────────
// gc = grid-column (1–7), gr = grid-row (1–4)
// Layout: nav chain occupies row 2, cols 1–5
//         fan-out resources: col 6, rows 1–4
//         font (triggered by gh): col 7, row 4
const NODES = [
  {
    id: 'browser', label: 'Browser', sub: 'Chrome · js-base 4.8.1', type: 'browser',
    dur: null, start: null, gc: 1, gr: 2, nav: true,
    tip: { type: '—', dest: 'Singapore · 49.245.121.88', note: 'Browser type inferred — not in APM span data' }
  },

  {
    id: 'dns', label: 'DNS Lookup', sub: 'Domain resolution', type: 'dns',
    dur: 32, start: 3, gc: 2, gr: 2, nav: true,
    tip: { type: 'hard-navigation / browser-timing', id: '5daf84c9', dest: 'bobbyricardy.github.io' }
  },

  {
    id: 'tcp', label: 'TCP Connect', sub: 'Server connection', type: 'tcp',
    dur: 11, start: 45, gc: 3, gr: 2, nav: true,
    tip: { type: 'hard-navigation / browser-timing', id: 'c5275f2f', dest: 'bobbyricardy.github.io:443' }
  },

  {
    id: 'doc', label: 'Document', sub: 'Request + receive', type: 'doc',
    dur: 247, start: 56, gc: 4, gr: 2, nav: true,
    tip: { type: 'hard-navigation / browser-timing', id: 'cff82680', dest: 'bobbyricardy.github.io:443' }
  },

  {
    id: 'parse', label: 'DOM Parse', sub: 'Exec sync scripts', type: 'parse',
    dur: 276, start: 308, gc: 5, gr: 2, nav: true,
    tip: { type: 'hard-navigation / browser-timing', id: '01ff0dd4' }
  },

  {
    id: 'unpkg', label: 'unpkg.com', sub: 'elastic-apm-rum.min.js', type: 'fast',
    dur: 9.7, start: 310, gc: 6, gr: 1,
    tip: { type: 'resource / script', id: 'd67cabaa', dest: 'unpkg.com:443', size: 'cached (0 B transfer)' }
  },

  {
    id: 'goog', label: 'Google APIs', sub: 'jquery-3.1.1.min.js', type: 'fast',
    dur: 10.3, start: 310, gc: 6, gr: 2,
    tip: { type: 'resource / script', id: 'f5aee95c', dest: 'ajax.googleapis.com:443', size: '84.7 KB decoded' }
  },

  {
    id: 'cf', label: 'cdnjs · CF', sub: 'tether-1.4.0.min.js', type: 'fast',
    dur: 9.9, start: 310.2, gc: 6, gr: 3,
    tip: { type: 'resource / script', id: '0876b8ef', dest: 'cdnjs.cloudflare.com:443', size: '24.4 KB decoded' }
  },

  {
    id: 'gh', label: 'github.io', sub: '9 resources · avg 266 ms', type: 'slow',
    dur: 266, start: 310.2, gc: 6, gr: 4,
    tip: {
      type: 'resource / mixed (CSS + JS)', id: 'multiple', dest: 'bobbyricardy.github.io:443',
      size: '~376 KB decoded', note: 'bootstrap, cover.css, typed.js, fa, animate, portfolio_enhancements, ie10-bugfix'
    }
  },

  {
    id: 'font', label: 'FontAwesome', sub: 'webfont.woff2 (77 KB)', type: 'font',
    dur: 235.6, start: 592.8, gc: 7, gr: 4,
    tip: {
      type: 'resource / css (font)', id: '54466936', dest: 'bobbyricardy.github.io:443',
      size: '77.2 KB', note: 'Triggered by font-awesome.min.css'
    }
  },
];

const EDGES = [
  { f: 'browser', t: 'dns', dur: 32 },
  { f: 'dns', t: 'tcp', dur: 11 },
  { f: 'tcp', t: 'doc', dur: 247 },
  { f: 'doc', t: 'parse', dur: 276 },
  { f: 'parse', t: 'unpkg', dur: 9.7 },
  { f: 'parse', t: 'goog', dur: 10.3 },
  { f: 'parse', t: 'cf', dur: 9.9 },
  { f: 'parse', t: 'gh', dur: 266 },
  { f: 'gh', t: 'font', dur: 235.6 },
];

// ─── ICONS (dynamic text — gracefully handles any span type) ─────────────────
function detectBrowserAbbr() {
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return 'EDG';
  if (/Firefox\//.test(ua)) return 'FF';
  if (/OPR\/|Opera\//.test(ua)) return 'OPR';
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'SAF';
  if (/Chrome\//.test(ua)) return 'CR';
  return 'BR';
}

// Well-known type → short label. Unknown types fall back to first 4 chars of the type string.
const TYPE_TEXT = {
  browser: detectBrowserAbbr(),
  dns: 'DNS',
  tcp: 'TCP',
  doc: 'DOC',
  parse: 'JS',
  fast: 'CDN',
  slow: 'SRV',
  github: 'GH',
  font: 'TTF',
  // resource sub-types
  script: 'JS',
  link: 'CSS',
  xhr: 'XHR',
  fetch: 'API',
  websocket: 'WS',
};

function getIcon(type) {
  const text = TYPE_TEXT[type] ?? type.slice(0, 4).toUpperCase();
  return `<span style="font-size:10px;font-weight:800;letter-spacing:-.02em;color:inherit;font-family:monospace;line-height:1">${text}</span>`;
}

// ─── SOLAR EPHEMERIS (Jean Meeus) ─────────────────────────────────────────────
function sunSubsolar(date) {
  const JD = date.getTime() / 86400000 + 2440587.5;
  const n = JD - 2451545.0;
  const L0 = ((280.46646 + 0.9856474 * n) % 360 + 360) % 360;
  const M = ((357.52911 + 0.98560028 * n) % 360 + 360) % 360 * Math.PI / 180;
  const C = 1.9146 * Math.sin(M) + 0.019993 * Math.sin(2 * M) + 0.00029 * Math.sin(3 * M);
  const lam = ((L0 + C + 360) % 360) * Math.PI / 180;
  const eps = (23.439 - 4e-7 * n) * Math.PI / 180;
  const dec = Math.asin(Math.sin(eps) * Math.sin(lam));
  const RA = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam));
  const GAST = ((280.46061837 + 360.98564736629 * n) % 360 + 360) % 360;
  let lon = (RA * 180 / Math.PI - GAST + 360) % 360;
  if (lon > 180) lon -= 360;
  return { lat: dec * 180 / Math.PI, lon };
}

function ll2v(lat, lon) {
  const phi = (90 - lat) * Math.PI / 180, th = (lon + 180) * Math.PI / 180;
  return new THREE.Vector3(-Math.sin(phi) * Math.cos(th), Math.cos(phi), Math.sin(phi) * Math.sin(th));
}

// ─── THREE.JS ─────────────────────────────────────────────────────────────────
const glCanvas = document.getElementById('gl');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 500);
const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.06;
controls.minDistance = 1.35; controls.maxDistance = 8;

// Starfield
{
  const geo = new THREE.BufferGeometry(), pos = [];
  for (let i = 0; i < 9000; i++) {
    const t = Math.acos(2 * Math.random() - 1), p = Math.random() * 6.283, r = 90 + Math.random() * 20;
    pos.push(r * Math.sin(t) * Math.cos(p), r * Math.cos(t), r * Math.sin(t) * Math.sin(p));
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: .17, sizeAttenuation: true, transparent: true, opacity: .8 })));
}

// ── Earth shaders ─────────────────────────────────────────────────────────────
const eVS = `varying vec2 vUv;varying vec3 vN;varying vec3 vP;
void main(){vUv=uv;vN=normalize(mat3(modelMatrix)*normal);
vP=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;

const eFS = `uniform sampler2D uDay;uniform sampler2D uNight;uniform sampler2D uCloud;uniform vec3 uSun;
varying vec2 vUv;varying vec3 vN;varying vec3 vP;
void main(){
  vec3 N=normalize(vN);vec3 S=normalize(uSun);
  float ca=dot(N,S);
  float day=smoothstep(-.1,.22,ca);
  vec4 dc=texture2D(uDay,vUv);vec4 nc=texture2D(uNight,vUv);vec4 cc=texture2D(uCloud,vUv);
  vec4 surf=mix(nc*.7,dc,day);
  float cl=cc.r;
  surf.rgb=mix(surf.rgb,mix(vec3(.03,.05,.1)*cl,vec3(1.)*cl,day),cl*.78);
  vec3 V=normalize(-vP);vec3 H=normalize(S+V);
  surf.rgb+=vec3(.85,.93,1.)*pow(max(dot(N,H),.0),55.)*.11*day;
  float rim=pow(1.-max(dot(N,V),.0),3.0);
  surf.rgb+=vec3(.22,.52,1.)*rim*day*.5+vec3(.04,.07,.22)*rim*(1.-day)*.35;
  gl_FragColor=vec4(surf.rgb,1.);}`;

const aFS = `uniform vec3 uSun;varying vec3 vN;varying vec3 vP;
void main(){vec3 N=normalize(vN);vec3 V=normalize(-vP);
  float rim=pow(1.-max(dot(N,V),.0),2.0);
  float d=max(dot(N,normalize(uSun)),.0);
  gl_FragColor=vec4(mix(vec3(.07,.11,.28),vec3(.26,.58,1.),d)*rim,rim*.5);}`;

const sunU = { value: new THREE.Vector3(1, 0, 0) };
const earthU = { uDay: { value: null }, uNight: { value: null }, uCloud: { value: null }, uSun: sunU };

const tl = new THREE.TextureLoader();
tl.load(TEX.day, t => { t.colorSpace = THREE.SRGBColorSpace; earthU.uDay.value = t; });
tl.load(TEX.night, t => { t.colorSpace = THREE.SRGBColorSpace; earthU.uNight.value = t; });

const aVS = `varying vec3 vN;varying vec3 vP;void main(){
  vN=normalize(mat3(modelMatrix)*normal);vP=(modelMatrix*vec4(position,1.)).xyz;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;

scene.add(new THREE.Mesh(new THREE.SphereGeometry(1, 72, 72),
  new THREE.ShaderMaterial({ uniforms: earthU, vertexShader: eVS, fragmentShader: eFS })));
scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.018, 64, 64),
  new THREE.ShaderMaterial({
    uniforms: { uSun: sunU }, vertexShader: aVS, fragmentShader: aFS,
    transparent: true, side: THREE.BackSide, depthWrite: false
  })));

// Singapore pin + pulse rings  (50% smaller, maroon)
const MARKER_COLOR = 0xeb0400;
const sgV = ll2v(GEO.lat, GEO.lon);
const pin = new THREE.Mesh(new THREE.SphereGeometry(.0065, 8, 8), new THREE.MeshBasicMaterial({ color: MARKER_COLOR }));
pin.position.copy(sgV.clone().multiplyScalar(1.012));
scene.add(pin);

const rings = [];
for (let i = 0; i < 3; i++) {
  const m = new THREE.Mesh(new THREE.RingGeometry(.008, .011, 32),
    new THREE.MeshBasicMaterial({ color: MARKER_COLOR, transparent: true, opacity: .7, side: THREE.DoubleSide }));
  m.position.copy(pin.position); m.lookAt(0, 0, 0); m._ph = i * (Math.PI * 2 / 3);
  rings.push(m); scene.add(m);
}

// Initial zoom-in animation
const animDuration = 2800; // ms
let animStartTime = null;
const startPos = new THREE.Vector3(0, 1.5, 5); // Start further out
const endPos = sgV.clone().multiplyScalar(2.3);

controls.enabled = false; // Disable controls for intro animation
camera.position.copy(startPos);
camera.lookAt(0, 0, 0);
controls.target.set(0, 0, 0);
controls.update();

// ─── FLOW GRAPH ──────────────────────────────────────────────────────────────
const gw = document.getElementById('gw'), gsvg = document.getElementById('gsvg'),
  gcan = document.getElementById('gcan'), gctx = gcan.getContext('2d'),
  nodegrid = document.getElementById('nodegrid');
const npos = {}, parts = [];
const isMobile = () => innerWidth <= 768;

function durClass(ms) { return ms === null ? '' : ms < 50 ? 'df' : ms < 200 ? 'dm' : 'ds'; }
function fmtDur(ms) {
  if (ms === null) return '';
  return ms < 1000 ? ms.toFixed(1) + ' ms' : (ms / 1000).toFixed(2) + ' s';
}
function durRgb(ms) { return ms < 50 ? [52, 211, 153] : ms < 200 ? [251, 191, 36] : [251, 113, 133]; }

// ── Read node centres from rendered DOM (works with any layout) ───────────────
function updateNpos() {
  const gwRect = gw.getBoundingClientRect();
  NODES.forEach(n => {
    const el = document.getElementById('fn-' + n.id);
    if (!el) return;
    const r = el.getBoundingClientRect();
    npos[n.id] = { x: r.left - gwRect.left + r.width / 2, y: r.top - gwRect.top + r.height / 2 };
  });
}

// ── Shared node builder (desktop + mobile) ────────────────────────────────────
function makeNode(n, mobile) {
  const iType = n.type === 'fast' ? 'fast' : n.type === 'slow' ? 'slow' : n.type;
  const dc = durClass(n.dur);
  const el = document.createElement('div');
  el.className = 'fn'; el.id = 'fn-' + n.id;
  // On desktop: explicit grid-column / grid-row from node data
  if (!mobile) el.style.cssText = `grid-column:${n.gc};grid-row:${n.gr}`;
  el.innerHTML = `<div class="ni ${iType}">${getIcon(iType)}</div>
      <div class="ntop">${n.label}</div>
      <div class="nlbl">${n.sub}</div>
      ${n.dur !== null ? `<div class="ndur ${dc}">${fmtDur(n.dur)}</div>` : ''}`;
  if (mobile) {
    el.addEventListener('click', e => showTip(e, n));
  } else {
    el.addEventListener('mouseenter', e => showTip(e, n));
    el.addEventListener('mouseleave', hideTip);
    el.addEventListener('mousemove', moveTip);
  }
  return el;
}

// ── Desktop waterfall ─────────────────────────────────────────────────────────
function buildDesktop() {
  gsvg.style.display = '';
  gcan.style.display = '';
  nodegrid.innerHTML = '';
  parts.length = 0; // clear until rAF fires
  NODES.forEach(n => nodegrid.appendChild(makeNode(n, false)));
  // Read real DOM positions after layout, then draw edges + particles
  requestAnimationFrame(() => {
    const W = gw.clientWidth, H = gw.clientHeight;
    gcan.width = W; gcan.height = H;
    updateNpos();
    drawEdges(W, H);
    initParts();
  });
}

function bezier(p0, p1, t) {
  const dx = p1.x - p0.x, cp1 = { x: p0.x + dx * .44, y: p0.y }, cp2 = { x: p1.x - dx * .44, y: p1.y }, mt = 1 - t;
  return {
    x: mt * mt * mt * p0.x + 3 * mt * mt * t * cp1.x + 3 * mt * t * t * cp2.x + t * t * t * p1.x,
    y: mt * mt * mt * p0.y + 3 * mt * mt * t * cp1.y + 3 * mt * t * t * cp2.y + t * t * t * p1.y
  };
}

function drawEdges(W, H) {
  gsvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  EDGES.forEach(e => {
    const f = npos[e.f], t = npos[e.t]; if (!f || !t) return;
    const dx = t.x - f.x, cx1 = f.x + dx * .44, cx2 = t.x - dx * .44;
    const w = Math.max(1, Math.min(4, Math.log2(e.dur + 2) * .55));
    const op = .28 + Math.min(.35, e.dur / 900);
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', `M${f.x},${f.y}C${cx1},${f.y} ${cx2},${t.y} ${t.x},${t.y}`);
    p.setAttribute('fill', 'none'); p.setAttribute('stroke', `rgba(99,102,241,${op})`);
    p.setAttribute('stroke-width', String(w)); p.setAttribute('marker-end', 'url(#arr)');
    gsvg.appendChild(p);
  });
}

// ── Mobile grid ───────────────────────────────────────────────────────────────
function buildMobile() {
  gsvg.style.display = 'none';
  gcan.style.display = 'none';
  nodegrid.innerHTML = '';
  parts.length = 0;
  // All nodes (including browser) rendered as stacked grid cards via .fn CSS
  NODES.forEach(n => nodegrid.appendChild(makeNode(n, true)));
}

// ── Particles ─────────────────────────────────────────────────────────────────
class Particle {
  constructor(e) {
    this.e = e; this.t = Math.random();
    this.speed = .0015 + .018 / Math.log(e.dur + 3);
    this.sz = 2 + Math.random() * 1.2; this.al = .55 + Math.random() * .45;
  }
  update() { this.t += this.speed; if (this.t > 1) this.t = 0; }
  pos() { const f = npos[this.e.f], t = npos[this.e.t]; if (!f || !t) return null; return bezier(f, t, this.t); }
}

function initParts() {
  parts.length = 0;
  EDGES.forEach(e => {
    const cnt = Math.max(3, Math.min(14, Math.round(e.dur / 22)));
    for (let i = 0; i < cnt; i++)parts.push(new Particle(e));
  });
}

function tickParts() {
  gctx.clearRect(0, 0, gcan.width, gcan.height);
  for (const p of parts) {
    p.update(); const pos = p.pos(); if (!pos) continue;
    const [r, g, b] = durRgb(p.e.dur);
    const g2 = gctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, p.sz * 2.8);
    g2.addColorStop(0, `rgba(${r},${g},${b},${(p.al * .4).toFixed(2)})`);
    g2.addColorStop(1, `rgba(${r},${g},${b},0)`);
    gctx.beginPath(); gctx.arc(pos.x, pos.y, p.sz * 2.8, 0, Math.PI * 2);
    gctx.fillStyle = g2; gctx.fill();
    gctx.beginPath(); gctx.arc(pos.x, pos.y, p.sz, 0, Math.PI * 2);
    gctx.fillStyle = `rgba(${r},${g},${b},${p.al.toFixed(2)})`; gctx.fill();
  }
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
const ttEl = document.getElementById('tt');
function showTip(ev, n) {
  const tp = n.tip || {};
  let h = `<div class="tn">${n.label}</div>`;
  if (n.sub) h += `<div class="tr"><span>Resource</span><span>${n.sub}</span></div>`;
  if (n.dur !== null) h += `<div class="tr"><span>Duration</span><span>${fmtDur(n.dur)}</span></div>`;
  if (n.start !== null) h += `<div class="tr"><span>Start</span><span>+${fmtDur(n.start)}</span></div>`;
  if (tp.type) h += `<div class="tr"><span>Span type</span><span>${tp.type}</span></div>`;
  if (tp.dest) h += `<div class="tr"><span>Destination</span><span>${tp.dest}</span></div>`;
  if (tp.size) h += `<div class="tr"><span>Transfer</span><span>${tp.size}</span></div>`;
  if (tp.id) h += `<div class="tr"><span>Span ID</span><span>${tp.id}…</span></div>`;
  if (tp.note) h += `<div class="tr" style="margin-top:5px;color:#475569;font-size:.64rem">${tp.note}</div>`;
  ttEl.innerHTML = h; ttEl.style.display = 'block'; moveTip(ev);
}
function hideTip() { ttEl.style.display = 'none'; }
function moveTip(ev) {
  ttEl.style.left = Math.min(ev.clientX + 14, innerWidth - 290) + 'px';
  ttEl.style.top = Math.max(ev.clientY - 12, 10) + 'px';
}
document.addEventListener('click', e => { if (!e.target.closest('.fn')) hideTip(); });

// ── Axis ──────────────────────────────────────────────────────────────────────
function buildAxis() {
  const axis = document.getElementById('axis'), W = gw.clientWidth;
  axis.innerHTML = [0, 100, 200, 300, 400, 500, 600, 700, 800].map(ms => {
    const pct = (ms / 830 * (W - 36) / W * 100).toFixed(1);
    return `<span style="position:absolute;left:${pct}%;transform:translateX(-50%)">${ms}ms</span>`;
  }).join('');
}

// ── Time / solar UI ───────────────────────────────────────────────────────────
let lastTick = 0;
const tzName = Intl.DateTimeFormat().resolvedOptions().timeZone;

function updateUI() {
  const now = new Date();
  // Local time
  const localTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const localDate = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  const tzShort = now.toLocaleTimeString([], { timeZoneName: 'short' }).split(' ').pop();
  document.getElementById('local-time').textContent = localTime;
  document.getElementById('tz-lbl').textContent = localDate;
  document.getElementById('tz-name').textContent = `${tzName} (${tzShort})`;
  // UTC
  const utcStr = now.toUTCString(); // e.g. "Thu, 05 Mar 2026 09:30:54 GMT"
  const utcTime = utcStr.slice(17, 22);
  document.getElementById('utcv').textContent = 'UTC: ' + utcTime;
  // Solar
  const s = sunSubsolar(now);
  sunU.value.copy(ll2v(s.lat, s.lon));
}

// ── Resize / responsive ───────────────────────────────────────────────────────
function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  if (isMobile()) { buildMobile(); }
  else { buildDesktop(); buildAxis(); }
}
window.addEventListener('resize', onResize);

// ── Animate ───────────────────────────────────────────────────────────────────
let pulseT = 0;
function animate(t) {
  if (animStartTime === null) animStartTime = t;
  requestAnimationFrame(animate);

  // Intro zoom animation
  const elapsed = t - animStartTime;
  if (elapsed < animDuration) {
    const progress = 1 - Math.pow(1 - Math.min(1, elapsed / animDuration), 4); // ease-out
    camera.position.lerpVectors(startPos, endPos, progress);
  } else if (controls.enabled === false) {
    // Animation finished, lock to final position and enable controls
    camera.position.copy(endPos);
    controls.enabled = true;
  }

  controls.update();
  if (t - lastTick > 1000) { updateUI(); lastTick = t; }
  pulseT += .022;
  rings.forEach(r => {
    const s = .85 + .6 * ((Math.sin(pulseT + r._ph) + 1) / 2);
    r.scale.setScalar(s);
    r.material.opacity = Math.max(0, .7 - (s - .85) / .6 * .7);
  });
  if (!isMobile()) tickParts();
  renderer.render(scene, camera);
}

// ── Boot ──────────────────────────────────────────────────────────────────────
updateUI();
if (isMobile()) { buildMobile(); }
else { buildDesktop(); buildAxis(); }
animate(0);
