// ─────────────────────────────────────────────────────────────
//  The watercolour stage: one WebGL canvas behind the whole page.
//   - the paper, soft pools of light, dew beads resting on it and the
//     water, all drawn by one shader (watercolour washes remain possible)
//   - every wash is pinned to a part of the page, so it scrolls with
//     the content it belongs to
//   - at each chapter opening one glass dewdrop falls, sends a few
//     water rings across the paper, and the paint blooms
//   - the products stand in a sheet of still water: lit from behind,
//     reflected in it, and setting off rings as they touch down
//  Loaded on demand (three.js is large), after the first paint.
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PIGMENTS, LIGHTS } from './stops';
import { studioEnvironment } from './studioEnv';
import { applyGlassLook } from './glassLook';

const MAX_WASHES = 12;
const MAX_BEADS = 8;
const FOV = 30;
const CAM_Z = 10;
const PAPER_Z = -2;
const H0 = Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * CAM_Z; // half view height at z = 0

const clamp01 = (v) => Math.min(1, Math.max(0, v));

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

const fragment = /* glsl */ `
  #define MAX ${MAX_WASHES}
  uniform float uAspect;
  uniform float uTime;
  uniform float uWarm;
  uniform int uCount;
  uniform vec2 uPos[MAX];
  uniform float uR[MAX];
  uniform float uAmt[MAX];
  uniform float uSeed[MAX];
  uniform float uWet[MAX];
  uniform float uSq[MAX];
  uniform vec3 uCol[MAX];
  uniform float uLight[MAX]; // 1 = a pool of light rather than a wash of paint
  uniform vec4 uBead[${MAX_BEADS}];  // dew beads: where (xy), radius (z), how present (w)
  uniform float uWaterShade; // the contact shade of something standing in the water
  uniform vec4 uWater;     // the water sheet: centre (xy), half width and half depth (zw)
  uniform float uWaterAmt;
  uniform float uWaterSeed;
  uniform vec4 uGlow;      // the light behind a product: centre (xy), radius (z), strength (w)
  uniform float uCheap;    // 1 while drawn for glass to look through: no fine grain or washes
  uniform float uCaus;     // a caustic: light focused through a glass product onto the water
  uniform vec3 uCausCol;   // … in the colour of what is inside it
  uniform vec4 uRip[2];    // rings: where (xy), how long ago (z, < 0 = none), squash (w, < 1 = on the water)
  uniform float uRipS[2];  // the size of what made them
  varying vec2 vUv;

  float hash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0); // quintic: no lattice creases
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  // each octave is rotated, so no crease of the noise lattice lines up
  // into a straight edge in the paint
  const mat2 ROT = mat2(1.6, 1.2, -1.2, 1.6);
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p = ROT * p + 17.1; a *= 0.5; }
    return v;
  }

  void main() {
    vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
    // cold-press paper, warming a touch as the presentation goes on
    // blush paper in the bottle's hue, deepening a touch as the presentation goes on
    vec3 paper = mix(vec3(0.957, 0.824, 0.839), vec3(0.945, 0.792, 0.812), uWarm);
    // (seen through glass, the paper's grain and the washes are lost in the
    // refraction, so that copy of the page skips them: it is drawn every frame)
    float tooth = 0.5;
    if (uCheap < 0.5) {
      tooth = fbm(p * 140.0);
      float fibre = noise(vec2(p.x * 900.0, p.y * 40.0));
      paper *= 0.972 + 0.04 * tooth + 0.01 * fibre;
    }
    // the edges of the sheet sit a little deeper, out of the light
    paper *= 1.0 - 0.075 * smoothstep(0.35, 1.2, length(p * vec2(0.75, 1.0)));
    vec3 col = paper;

    for (int i = 0; i < MAX; i++) {
      if (i >= uCount || uCheap > 0.5) break;
      if (uAmt[i] < 0.002) continue;
      vec2 q = p - uPos[i];
      q.y /= max(uSq[i], 0.05);
      float r = max(uR[i], 0.001);
      if (length(q) > r * 1.7) continue; // far outside this wash
      if (uLight[i] > 0.5) {
        // a pool of light: no edge at all, just a soft falloff in its tint
        float g = length(q) / r;
        col = mix(col, uCol[i], exp(-g * g * 1.7) * 0.62 * uAmt[i]);
        continue;
      }
      float s = uSeed[i];
      // the shape is set the moment the paint lands: edges never crawl
      float warp = fbm(q * 2.6 + s) - 0.5;
      float fine = fbm(q * 11.0 + s * 3.1) - 0.5;
      float d = length(q) / r + warp * 0.62 + fine * 0.14;
      float inside = 1.0 - smoothstep(0.9, 1.0, d);
      float rim = smoothstep(0.62, 0.97, d) * inside;
      // a hard dried tide-line right at the edge
      float tide = smoothstep(0.9, 0.975, d) * (1.0 - smoothstep(0.975, 1.0, d));
      float pool = smoothstep(0.15, 0.75, fbm(q * 3.4 + s * 1.7));
      float dens = inside * (0.34 + 0.22 * pool) + rim * 0.2 + tide * 0.12;
      // backruns: paler cauliflower blooms with a darker frill where water crept back
      vec2 qb = q * (1.7 / r) + s * 2.3;
      qb += vec2(fbm(qb * 0.9 + 3.1), fbm(qb * 0.9 + 8.7)) * 1.1; // warp: cauliflower, never facets
      float b = fbm(qb);
      float back = smoothstep(0.55, 0.64, b) * inside;
      float frill = (smoothstep(0.5, 0.56, b) - smoothstep(0.58, 0.64, b)) * inside;
      dens = dens * (1.0 - 0.32 * back) + frill * 0.1;
      dens *= 0.82 + 0.36 * noise(p * 300.0 + s) * (0.6 + 0.4 * tooth);
      dens *= uAmt[i];
      col *= mix(vec3(1.0), uCol[i], clamp(dens, 0.0, 1.0));
    }

    // Soft studio light behind a product
    if (uGlow.w > 0.002) {
      float gd = length((p - uGlow.xy) * vec2(1.0, 0.85)) / uGlow.z;
      // a luminous blush, never near-white: white caps must still read against it
      col = mix(col, vec3(0.985, 0.905, 0.918), exp(-gd * gd * 1.7) * 0.55 * uGlow.w);
    }

    // Dew beads resting on the sheet. Seen through one, the paper is a
    // little deeper; its rim is darker (most of all at the top, where it
    // bends the light away); light focused through it makes a bright
    // crescent low inside; a window highlight sits top left; it casts a
    // soft shadow down and to the right.
    for (int i = 0; i < ${MAX_BEADS}; i++) {
      if (uCheap > 0.5) break;
      vec4 B = uBead[i];
      if (B.w < 0.003) continue;
      vec2 q = (p - B.xy) / B.z;
      q.y *= q.y > 0.0 ? 1.1 : 0.94; // a touch heavier at the bottom
      float r = length(q);
      if (r > 1.6) continue;
      float inB = 1.0 - smoothstep(0.92, 1.0, r);
      float sh = 1.0 - smoothstep(0.75, 1.35, length(q - vec2(0.16, -0.26)));
      col *= 1.0 - 0.11 * sh * (1.0 - inB) * B.w;
      float rimD = smoothstep(0.45, 1.0, r) * (0.55 + 0.45 * smoothstep(-0.6, 0.8, q.y));
      vec3 seen = col * mix(vec3(0.985, 0.962, 0.968), vec3(0.85, 0.72, 0.77), rimD);
      float caus = exp(-pow((r - 0.56) / 0.2, 2.0)) * smoothstep(0.05, -0.7, q.y);
      seen += vec3(1.0, 0.97, 0.97) * caus * 0.17;
      float hl = exp(-pow(length((q - vec2(-0.32, 0.4)) * vec2(1.0, 1.4)) / 0.2, 2.0));
      float hl2 = exp(-pow(length(q - vec2(0.36, -0.42)) / 0.09, 2.0));
      seen = mix(seen, vec3(1.0), clamp(hl * 0.92 + hl2 * 0.35, 0.0, 1.0));
      col = mix(col, seen, inB * B.w);
    }

    // A sheet of still water the product stands in, seen low and from the
    // front: wet paper, a touch deeper in tone, whose far side mirrors the
    // light behind. A fine bright edge at the back; in front it simply
    // fades out. Mostly it is the reflection and the rings that say water.
    float poolIn = 0.0;
    if (uWaterAmt > 0.002) {
      vec2 d = (p - uWater.xy) / uWater.zw;
      if (d.y < 0.0) d.y /= 2.2; // it reaches further towards us than behind the product
      else d.y *= 1.0 + 0.35 * (1.0 - min(d.x * d.x, 1.0)); // a flatter back edge, lying low
      float r = length(d) + (fbm(d * vec2(1.4, 2.2) + uWaterSeed) - 0.5) * 0.1;
      float far = smoothstep(-1.0, 1.0, d.y);
      float soft = mix(0.03, 0.5, 1.0 - far);
      float inWater = 1.0 - smoothstep(1.0 - soft, 1.0, r);
      vec3 water = col * vec3(0.962, 0.93, 0.945);
      // (only a little: a white cap standing in the water must keep its edge)
      water = mix(water, vec3(0.99, 0.94, 0.95), 0.2 * far * far);
      // faint, long glints on the surface
      float streak = noise(vec2(d.x * 1.6 + uWaterSeed, d.y * 9.0));
      water += smoothstep(0.7, 0.95, streak) * 0.012 * far;
      // the meniscus: the back edge catches the light only behind the
      // product, in broken pieces, fading away towards the sides
      float rim = smoothstep(0.9, 0.98, r) * (1.0 - smoothstep(0.98, 1.0, r));
      rim *= smoothstep(0.85, 0.15, abs(d.x)) * smoothstep(0.3, 0.75, noise(vec2(d.x * 7.0 + uWaterSeed, 0.5)));
      water += rim * 0.08 * far;
      col = mix(col, water, inWater * uWaterAmt);
      // a soft contact shade where the product stands
      float cs = exp(-pow(d.x / 0.28, 2.0) - pow((d.y - 0.2) / 0.1, 2.0));
      col *= 1.0 - cs * 0.16 * uWaterAmt * uWaterShade;
      poolIn = inWater * uWaterAmt;
      // Light focused through a glass product lands on the water in front of
      // it, away from the key light (front right): a soft glow in the colour
      // of what is inside, with a brighter core near the base. In these
      // water coordinates a round spot already lies flat in perspective.
      if (uCaus > 0.002) {
        vec2 c = (p - uWater.xy) / uWater.zw - vec2(0.14, -0.06);
        float a = -0.45;
        c = mat2(cos(a), -sin(a), sin(a), cos(a)) * c;
        float spread = exp(-dot(c / vec2(0.26, 0.13), c / vec2(0.26, 0.13)) * 1.6);
        vec2 k = c - vec2(-0.05, 0.05);
        float core = exp(-dot(k / vec2(0.1, 0.035), k / vec2(0.1, 0.035)) * 1.4);
        float ripple = 0.85 + 0.3 * noise(c * vec2(18.0, 30.0) + uWaterSeed); // caustic net
        col += uCausCol * (spread * 0.13 + core * 0.22 * ripple) * uCaus * inWater;
      }
    }

    // Water rings: a short train of low waves running out and fading,
    // drawn as light on a wet surface (bright on the side facing the
    // light, a soft shade on the other), never as lines. On the water
    // sheet they lie flat in perspective and stay inside it.
    for (int k = 0; k < 2; k++) {
      vec4 R = uRip[k];
      if (R.z < 0.0 || R.z > 1.8) continue;
      float t = R.z;
      vec2 dq = p - R.xy;
      dq.y /= R.w;
      float r = length(dq);
      float S = uRipS[k];
      float front = S * (0.7 + 7.0 * (1.0 - exp(-t * 1.6)));  // fast, then slowing
      float lam = S * (0.55 + 0.35 * t);                         // rings spread apart
      float x = r - front;
      float env = exp(-pow(x / (S * (1.1 + 1.4 * t)), 2.0));   // only a few rings
      env *= smoothstep(0.0, 0.08, t) * exp(-t * 2.2);           // in, then dying away
      env *= smoothstep(S * 0.5, S * 1.4, r);                    // clear where the drop sits
      if (R.w < 0.99) env *= poolIn;
      float slope = cos(x / lam * 6.2832) * env;
      vec2 dir = r > 0.0001 ? dq / r : vec2(0.0);
      float lit = slope * (0.35 + 0.65 * dot(dir, normalize(vec2(-0.6, 0.8))));
      col += vec3(1.0, 0.97, 0.97) * max(lit, 0.0) * 0.16;
      col *= 1.0 - max(-lit, 0.0) * 0.06;
    }
    // The copy glass looks through holds light, not display colour: the
    // glass shades it (exposure 0.82, the Neutral curve) and encodes it for
    // the screen again, so it is handed over undone, and clear glass then
    // shows the paper at its true colour instead of a paler, milky one
    if (uCheap > 0.5) col = (pow(col, vec3(2.2)) + 0.04) / 0.82;
    gl_FragColor = vec4(col, 1.0);
  }
`;

// A dewdrop: round below, drawn up to a point at the top (origin at the bottom)
function dropGeometry() {
  const pts = [];
  const n = 48;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI;
    pts.push(new THREE.Vector2(Math.max(0.0001, 0.4 * Math.sin(t) * Math.pow(Math.sin(t / 2), 1.6)), 0.52 * Math.cos(t)));
  }
  const geo = new THREE.LatheGeometry(pts.reverse(), 96);
  geo.translate(0, 0.52, 0);
  return geo;
}

// Where an anchor point is on screen, in CSS pixels
function anchorPoint(el, [fx, fy]) {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (!r.width && !r.height) return null;
  return { x: r.left + r.width * fx, y: r.top + r.height * fy, w: r.width, h: r.height };
}

export function createStage(container, { reduce = false, products3d = true, models = {}, onLand } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  // the waterline cuts products (and their reflections) as they rise out of it
  renderer.localClippingEnabled = true;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  // softer than a dark stage: on paper, strong light washes the pink to white
  renderer.toneMappingExposure = 0.82;
  // glass only ever shows the soft paper behind it, so the copy of the page
  // it looks through can be drawn at half resolution (and cheaply: uCheap)
  if ('transmissionResolutionScale' in renderer) renderer.transmissionResolutionScale = 0.5;
  const canvas = renderer.domElement;
  canvas.className = 'paint-stage__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  container.appendChild(canvas);

  const scene = new THREE.Scene();
  // the products (glass and liquid) are lit like a product photograph: soft
  // boxes and tall strip lights (see studioEnv.js), with a little direct light
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(studioEnvironment(), 0.02);
  scene.environment = env.texture;
  scene.environmentIntensity = 1.0;
  const key = new THREE.DirectionalLight(0xfff4ee, 1.1);
  key.position.set(-4, 8, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 1.2);
  rim.position.set(5, 3, -4);
  scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xf3c6cc, 0.2));

  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
  camera.position.set(0, 0, CAM_Z);
  camera.lookAt(0, 0, 0);

  // ── Paper and paint ──
  const u = {
    uAspect: { value: 1 },
    uTime: { value: 0 },
    uWarm: { value: 0 },
    uCount: { value: 0 },
    uPos: { value: Array.from({ length: MAX_WASHES }, () => new THREE.Vector2()) },
    uR: { value: new Array(MAX_WASHES).fill(0) },
    uAmt: { value: new Array(MAX_WASHES).fill(0) },
    uSeed: { value: new Array(MAX_WASHES).fill(0) },
    uWet: { value: new Array(MAX_WASHES).fill(0) },
    uSq: { value: new Array(MAX_WASHES).fill(1) },
    uCol: { value: Array.from({ length: MAX_WASHES }, () => new THREE.Color(1, 1, 1)) },
    uWater: { value: new THREE.Vector4(0, 0, 1, 1) },
    uWaterAmt: { value: 0 },
    uWaterSeed: { value: 0 },
    uGlow: { value: new THREE.Vector4(0, 0, 1, 0) },
    uCheap: { value: 0 },
    uCaus: { value: 0 },
    uCausCol: { value: new THREE.Color(1, 0.6, 0.68) },
    uRip: { value: [new THREE.Vector4(0, 0, -1, 1), new THREE.Vector4(0, 0, -1, 1)] },
    uLight: { value: new Array(MAX_WASHES).fill(0) },
    uBead: { value: Array.from({ length: MAX_BEADS }, () => new THREE.Vector4(0, 0, 0.01, 0)) },
    uWaterShade: { value: 1 },
    uRipS: { value: [0.03, 0.03] },
  };
  const paper = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.ShaderMaterial({ uniforms: u, vertexShader: vertex, fragmentShader: fragment, toneMapped: false }),
  );
  paper.position.z = PAPER_Z;
  scene.add(paper);
  // drawn into a render target, the paper is the copy glass looks through:
  // the cheap version (see uCheap)
  paper.onBeforeRender = (r) => {
    u.uCheap.value = r.getRenderTarget() ? 1 : 0;
    paper.material.uniformsNeedUpdate = true;
  };

  let vw = 1;
  let vh = 1;
  const toWorld = (x, y) => [((x / vw - 0.5) * 2 * H0 * vw) / vh, (0.5 - y / vh) * 2 * H0];

  // live washes and lights: { el, at, r, col, light, seed, born, amt, target, sq, dying }
  const washes = [];
  // dew beads: { el, at, r (px on a 1080 screen), born, amt, dying }
  const beads = [];
  // beads sit right after the last word, so they are placed against the
  // last line of the text itself, not the (often wider) box around it
  function textBox(el) {
    if (!el) return null;
    const rg = document.createRange();
    rg.selectNodeContents(el);
    const lines = rg.getClientRects();
    const b = lines.length ? lines[lines.length - 1] : rg.getBoundingClientRect();
    return b.width || b.height ? b : el.getBoundingClientRect();
  }
  let clock = 0;

  function addWash(el, w, delay = 0) {
    washes.push({
      el,
      at: w.at,
      r: w.r,
      col: new THREE.Color(...(w.tint ? LIGHTS[w.tint] : PIGMENTS[w.pigment])),
      light: Boolean(w.tint),
      seed: Math.random() * 50,
      born: clock + delay + (w.delay || 0),
      amt: 0,
      target: w.strength ?? 1,
      sq: w.squash ?? 1,
      dying: false,
    });
    // too many: the oldest dry washes fade away first
    const alive = washes.filter((x) => !x.dying);
    if (alive.length > MAX_WASHES - 2) alive.slice(0, alive.length - (MAX_WASHES - 2)).forEach((x) => (x.dying = true));
  }

  // ── The dewdrop ──
  const drop = new THREE.Mesh(
    dropGeometry(),
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 1,
      thickness: 1.3,
      roughness: 0.02,
      ior: 1.42,
      // tinted like the bottle glass, so it reads as a pink bead of water
      attenuationColor: new THREE.Color(0.98, 0.52, 0.62),
      attenuationDistance: 0.55,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      iridescence: 0.25,
      iridescenceIOR: 1.3,
    }),
  );
  drop.material.envMapIntensity = 1.8;
  // what makes it read as glass on paper: a bright specular glint, a small
  // second glint, and a faint rose rim around the edge
  const glint = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false });
  const g1 = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), glint);
  g1.scale.set(0.06, 0.13, 0.02);
  g1.position.set(-0.14, 0.44, 0.34);
  g1.rotation.z = 0.35;
  const g2 = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), glint);
  g2.scale.setScalar(0.028);
  g2.position.set(0.15, 0.2, 0.36);
  // a soft rose edge that fades in towards the silhouette (fresnel), so the
  // rim is smooth at any size instead of a hard outline
  const rimShell = new THREE.Mesh(
    drop.geometry,
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uColor: { value: new THREE.Color(0.66, 0.24, 0.34) } },
      vertexShader: `varying vec3 vN; varying vec3 vV;
        void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform vec3 uColor; varying vec3 vN; varying vec3 vV;
        void main() { float f = pow(1.0 - max(dot(normalize(vN), normalize(vV)), 0.0), 2.2); gl_FragColor = vec4(uColor, f * 0.6); }`,
    }),
  );
  rimShell.renderOrder = 2;
  drop.add(g1, g2, rimShell);
  drop.visible = false;
  scene.add(drop);

  // water rings: where something touched the water or the paper (two at once at most)
  const ripples = [];
  function addRipple(r) {
    ripples.push(r);
    if (ripples.length > 2) ripples.shift();
  }

  // the sheet of water a product stands in: one at a time, the old one
  // drains away before the next one fills
  let water = null; // { spec, amt, want, seed }
  // the light behind the product, eased from place to place (each product
  // has its own, so it glides rather than jumps from step to step)
  const glow = { x: 0, y: 0, r: 0.3, w: 0 };
  let waterNext = null;
  const newWater = (spec) => ({ spec, amt: reduce ? 1 : 0, want: 1, seed: Math.random() * 40 });
  function setWater(spec) {
    if (spec && water && water.spec.anchor === spec.anchor) {
      water.spec = spec;
      water.want = 1;
      waterNext = null;
    } else if (water) {
      water.want = 0;
      waterNext = spec;
    } else if (spec) {
      water = newWater(spec);
    }
  }
  // where the water is on screen, in CSS pixels: the line the product
  // stands on (x, y), its half width (W) and half depth (D)
  function waterBox(spec) {
    const at = (!products3d && spec.atPhoto) || spec.at;
    const p = anchorPoint(document.querySelector(spec.anchor), at);
    if (!p) return null;
    const W = p.w * spec.w;
    return { x: p.x, y: p.y, W, D: W * spec.sq };
  }

  // The drop is an event, not a fixture: it only exists while it falls.
  // away → wait (until the page stops moving) → fall → splash → away
  const fall = { state: 'away', t0: 0, x0: 0, y0: 0, spec: null, el: null, still: 0, lastY: 0 };
  const dropPx = () => ((1.04 * (drop.userData.size || 1)) / (2 * H0)) * vh;

  // ── Products ──
  const loader = new GLTFLoader();
  const productModels = {};
  let productWanted = null; // { id, el, base, height }
  // where the dewdrop reveals the product (the opening), it waits under the
  // water until the drop lands, then rises out of the rings
  let riseNext = false;
  let productShown = null; // { id, group, show }
  const fading = [];

  function loadModel(id) {
    if (productModels[id] || !models[id]) return productModels[id];
    productModels[id] = { ready: false };
    loader.load(models[id], (gltf) => {
      const model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(new THREE.Vector3(center.x, box.min.y, center.z));
      // the waterline: the product shows only above it, its reflection only
      // below it (moved to the water every frame; far away until then)
      const clip = { up: new THREE.Plane(new THREE.Vector3(0, 1, 0), 1e6), down: new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e6) };
      model.traverse((o) => {
        if (!o.isMesh) return;
        o.material.clippingPlanes = [clip.up];
        if (o.material.map && o.material.transparent) {
          o.material.polygonOffset = true;
          o.material.polygonOffsetFactor = -2;
          o.renderOrder = 1;
        }
        // what sits inside glass (liquid, cream, the dropper) stays opaque,
        // so the glass can show it; it turns see-through only to fade
        o.material.transparent = !o.material.userData.keepOpaque;
        // glass gets its photographed look: dark edges, focused light
        applyGlassLook(o.material);
      });
      const group = new THREE.Group();
      group.add(model);
      group.visible = false;
      group.userData.h = size.y;
      scene.add(group);
      // glass products bring their caustic (set in the studio)
      let caustic = null;
      model.traverse((o) => {
        if (o.userData.caustic) caustic = o.userData.caustic;
      });
      productModels[id] = { ready: true, group, clip, caustic, ...reflectionOf(model, clip.down) };
    });
    return productModels[id];
  }
  if (products3d) Object.keys(models).forEach(loadModel);

  // The product mirrored in the water: it fades out with depth below the
  // waterline and sways a little, as a reflection on water does.
  function reflectionOf(model, clipDown) {
    const ru = {
      uWaterY: { value: 0 },
      uFade: { value: 1 },
      uWobA: { value: 0 },
      uWobF: { value: 1 },
      uTime: u.uTime,
    };
    const copy = model.clone(true);
    copy.traverse((o) => {
      if (!o.isMesh) return;
      o.material = o.material.clone();
      // glass in the reflection: a faint tinted shape is enough (and cheap)
      if (o.material.transmission > 0) {
        o.material.transmission = 0;
        o.material.color.set(o.material.userData.reflColor || '#eba2ac');
        o.material.roughness = Math.max(o.material.roughness, 0.2);
      }
      o.material.transparent = true;
      o.material.depthWrite = false;
      o.material.clippingPlanes = [clipDown];
      o.renderOrder = -2;
      o.material.onBeforeCompile = (sh) => {
        Object.assign(sh.uniforms, ru);
        sh.vertexShader = sh.vertexShader
          .replace('#include <common>', '#include <common>\nvarying float vWY;\nuniform float uWobA;\nuniform float uWobF;\nuniform float uTime;')
          .replace(
            '#include <project_vertex>',
            '#include <project_vertex>\nvec4 wpos = modelMatrix * vec4(transformed, 1.0);\nvWY = wpos.y;\nmvPosition.x += sin(wpos.y * uWobF + uTime * 1.7) * uWobA;\ngl_Position = projectionMatrix * mvPosition;',
          );
        sh.fragmentShader = sh.fragmentShader
          .replace('#include <common>', '#include <common>\nvarying float vWY;\nuniform float uWaterY;\nuniform float uFade;')
          .replace(
            '#include <dithering_fragment>',
            '#include <dithering_fragment>\ngl_FragColor.rgb *= 0.93;\ngl_FragColor.a *= 1.0 - smoothstep(0.0, uFade, uWaterY - vWY);',
          );
      };
    });
    const refl = new THREE.Group();
    refl.add(copy);
    refl.visible = false;
    scene.add(refl);
    return { refl, ru };
  }

  function setOpacity(group, a) {
    group.traverse((o) => {
      if (!o.isMesh) return;
      o.material.opacity = a;
      if (o.material.userData.keepOpaque) o.material.transparent = a < 0.995;
    });
  }

  // ── Size ──
  function resize() {
    vw = Math.max(1, container.clientWidth);
    vh = Math.max(1, container.clientHeight);
    renderer.setSize(vw, vh, false);
    camera.aspect = vw / vh;
    camera.updateProjectionMatrix();
    u.uAspect.value = vw / vh;
    const ph = Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * (CAM_Z - PAPER_Z);
    paper.scale.set(ph * 2 * camera.aspect, ph * 2, 1);
    // about 130px tall on a 1080p TV, a small bead inside the phone header
    drop.userData.size = vw < 720 ? 0.34 : 0.62 * Math.min(1, vh / 900);
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  // ── Stops ──
  function landAt(spec, el) {
    // the stop paints: earlier paint steps back so the new wash leads
    // (and clears away entirely where a product stands in its water)
    // a light that the next stop wants exactly as it is stays lit (the
    // backdrop behind the products holds steady from step to step)
    const lightKey = (w) => `${w.anchor}|${w.at}|${w.r}|${w.tint}|${w.squash ?? 1}|${w.strength ?? 1}`;
    const wanted = new Set((spec.light || []).map(lightKey));
    const kept = new Set();
    washes.forEach((w) => {
      if (w.light && !w.dying && wanted.has(w.key)) {
        kept.add(w.key);
        return;
      }
      w.target = Math.min(w.target, 0.3);
      if (spec.clear || w.light) w.dying = true;
    });
    (spec.paint || []).forEach((w) => addWash(document.querySelector(w.anchor) || el, w, reduce ? -10 : 0));
    (spec.light || [])
      .filter((w) => !kept.has(lightKey(w)))
      .forEach((w) => {
        addWash(document.querySelector(w.anchor) || el, w, reduce ? -10 : 0);
        washes[washes.length - 1].key = lightKey(w);
      });
    // the dew condenses one bead after another
    beads.forEach((b) => (b.dying = true));
    (spec.beads || []).forEach((b, i) =>
      beads.push({ el: document.querySelector(b.anchor), at: b.at, r: b.r, born: clock + (reduce ? -10 : 0.25 + i * 0.14), amt: 0, dying: false }),
    );
  }

  function activate(spec, el, index, total) {
    u.uWarm.value = total > 1 ? index / (total - 1) : 0;
    productWanted = spec?.product && products3d ? { ...spec.product } : null;
    riseNext = Boolean(spec?.drop && productWanted && !reduce);
    if (productShown?.hold && !riseNext) productShown.hold = false;
    // a new stop replaces any drop still on its way
    fall.state = 'away';
    setWater(spec?.water || null);
    if (!spec) return;
    // with no live product to set down (the kit, or the photos), the water
    // still stirs once as it arrives
    if (!reduce && spec.water && !(spec.product && products3d) && !spec.drop) {
      addRipple({ el: document.querySelector(spec.water.anchor), at: spec.water.at, pad: 0, t0: clock + 0.3, S: 0, water: true });
    }
    // inside a chapter, or with reduced motion: the wash simply blooms
    if (reduce || !spec.drop) {
      landAt(spec, el);
      return;
    }
    // a chapter opening: wait for the page to stop moving, then drop
    fall.spec = spec;
    fall.el = el;
    fall.t0 = clock;
    fall.still = 0;
    fall.lastY = window.scrollY;
    fall.state = 'wait';
  }

  // ── Loop ──
  let raf = 0;
  let last = 0;
  function frame(ms) {
    raf = requestAnimationFrame(frame);
    const dt = last ? Math.min(0.05, (ms - last) / 1000) : 0.016;
    last = ms;
    clock += dt;
    u.uTime.value = clock;
    const size = drop.userData.size || 1;

    // drop
    if (fall.state === 'wait') {
      // the page has to be still for a few frames (or 1.2 s at most), so
      // the drop never chases content that is still scrolling into place
      const y = window.scrollY;
      fall.still = Math.abs(y - fall.lastY) < 0.5 ? fall.still + 1 : 0;
      fall.lastY = y;
      if (fall.still >= 5 || clock - fall.t0 > 1.2) {
        const target = anchorPoint(document.querySelector(fall.spec.land?.anchor) || fall.el, fall.spec.land?.at || [0.5, 0.5]);
        fall.x0 = target ? target.x : vw / 2;
        fall.pad = dropPx() + 8; // never lands half off the screen
        fall.y0 = -dropPx() - 12; // from just above the screen
        fall.t0 = clock;
        fall.state = 'fall';
      }
      drop.visible = false;
    } else if (fall.state === 'fall') {
      const target = anchorPoint(document.querySelector(fall.spec.land?.anchor) || fall.el, fall.spec.land?.at || [0.5, 0.5]);
      const tx = Math.min(vw - fall.pad, Math.max(fall.pad, target ? target.x : fall.x0));
      const ty = target ? target.y : vh * 0.6;
      const T = 0.34 + 0.3 * clamp01((ty - fall.y0) / vh);
      const k = clamp01((clock - fall.t0) / T);
      // straight down, gathering speed like a real drop
      const [wx, wy] = toWorld(tx, fall.y0 + (ty - fall.y0) * k * k);
      drop.position.set(wx, wy, 0);
      drop.scale.set(size * 0.9, size * 1.15, size * 0.9);
      drop.visible = true;
      if (k >= 1) {
        fall.state = 'splash';
        fall.t0 = clock;
        addRipple({
          el: document.querySelector(fall.spec.land?.anchor) || fall.el,
          at: fall.spec.land?.at || [0.5, 0.5],
          pad: fall.pad,
          t0: clock,
          S: dropPx() * 0.42,
          water: Boolean(fall.spec.land?.water && water),
        });
        landAt(fall.spec, fall.el);
        // the product it brings rises out of the rings
        riseNext = false;
        if (productShown?.hold) {
          productShown.hold = false;
          productShown.rise = true;
          productShown.rippled = true;
          productShown.t0 = clock;
        }
        onLand?.(fall.spec);
      }
    } else if (fall.state === 'splash') {
      const k = clamp01((clock - fall.t0) / 0.28);
      const flat = 1 - k;
      drop.scale.set(size * (1.3 * flat + 0.001), size * (0.4 * flat * flat + 0.001), size * (1.3 * flat + 0.001));
      if (k >= 1) fall.state = 'away';
    } else {
      drop.visible = false;
    }

    // the water sheet and the light behind the product
    if (water) {
      water.amt += (water.want - water.amt) * Math.min(1, dt * (water.want ? 2.2 : 5));
      if (!water.want && water.amt < 0.01) {
        water = waterNext ? newWater(waterNext) : null;
        waterNext = null;
      }
    }
    const wb = water ? waterBox(water.spec) : null;
    const toP = (x, y) => [(x / vw - 0.5) * (vw / vh), 0.5 - y / vh];
    if (wb) {
      const [cx, cy] = toP(wb.x, wb.y + 0.2 * wb.D); // the product stands towards the back
      u.uWater.value.set(cx, cy, wb.W / vh, wb.D / vh);
      u.uWaterAmt.value = water.amt;
      u.uWaterSeed.value = water.seed;
      // the contact shade belongs to something standing there: none while
      // the water is still empty, waiting for the drop to bring the product
      const standing = productWanted ? (productShown && !productShown.hold ? Math.min(1, productShown.show) : 0) : 1;
      u.uWaterShade.value = (water.spec.shade === false ? 0 : 1) * standing;
      // the light behind sits low, behind the bodies and the water, never
      // behind the caps (white on near-white would vanish)
      const [gx, gy] = toP(wb.x, wb.y - (water.spec.glowY ?? 0.55) * wb.W);
      const gr = ((water.spec.glowR ?? 1.0) * wb.W) / vh;
      const gw = water.spec.glow === false ? 0 : water.amt;
      const k = glow.w < 0.01 ? 1 : Math.min(1, dt * 3); // a glow that is just appearing starts in place
      glow.x += (gx - glow.x) * k;
      glow.y += (gy - glow.y) * k;
      glow.r += (gr - glow.r) * k;
      glow.w += (gw - glow.w) * Math.min(1, dt * 3);
      u.uGlow.value.set(glow.x, glow.y, glow.r, glow.w);
      // the caustic of the glass product standing here, easing in with it
      const caus = productShown && !productShown.hold ? productModels[productShown.id]?.caustic : null;
      if (caus) u.uCausCol.value.setRGB(...caus.color);
      const cw = caus ? caus.strength * Math.min(1, productShown.show) * water.amt : 0;
      u.uCaus.value += (cw - u.uCaus.value) * Math.min(1, dt * 3);
    } else {
      u.uWaterAmt.value = 0;
      glow.w = 0;
      u.uGlow.value.w = 0;
      u.uCaus.value = 0;
    }

    // water rings, pinned to where they started
    for (let i = ripples.length - 1; i >= 0; i--) if (clock - ripples[i].t0 > 1.8) ripples.splice(i, 1);
    for (let k = 0; k < 2; k++) {
      const r = ripples[k];
      const rp = r ? anchorPoint(r.el, r.at) : null;
      if (!rp || (r.water && !wb)) {
        u.uRip.value[k].z = -1;
        continue;
      }
      const x = Math.min(vw - r.pad, Math.max(r.pad, rp.x));
      const [rx, ry] = toP(x, rp.y);
      u.uRip.value[k].set(rx, ry, clock - r.t0, r.water ? water.spec.sq : 1);
      u.uRipS.value[k] = (r.S || wb.W * 0.16) / vh;
    }

    // washes: pinned to their part of the page; spread while wet, then dry
    for (let i = washes.length - 1; i >= 0; i--) {
      const w = washes[i];
      if (w.dying) w.target = 0;
      w.amt += (w.target - w.amt) * Math.min(1, dt * (w.dying ? 2 : 1.4));
      if (w.dying && w.amt < 0.004) washes.splice(i, 1);
    }
    const n = Math.min(washes.length, MAX_WASHES);
    // washes are sized to the screen height; on tall narrow screens they shrink
    const rScale = Math.min(1, vw / vh / 1.3);
    u.uCount.value = n;
    for (let i = 0; i < n; i++) {
      const w = washes[washes.length - n + i];
      const p = anchorPoint(w.el, w.at);
      const age = clock - w.born;
      // wet-in-wet: the paint blooms quickly, then stays put
      const grow = 1 - Math.pow(1 - clamp01(age / 1.2), 4);
      if (p) u.uPos.value[i].set((p.x / vw - 0.5) * (vw / vh), 0.5 - p.y / vh);
      else u.uPos.value[i].set(99, 99);
      u.uR.value[i] = age < 0 ? 0 : w.r * rScale * (0.45 + 0.55 * grow);
      u.uAmt.value[i] = age < 0 ? 0 : w.amt * (0.55 + 0.45 * grow);
      u.uSeed.value[i] = w.seed;
      u.uWet.value[i] = 1 - clamp01((age - 1.5) / 3);
      u.uSq.value[i] = w.sq;
      u.uCol.value[i].copy(w.col);
      u.uLight.value[i] = w.light ? 1 : 0;
    }

    // dew beads
    for (let i = beads.length - 1; i >= 0; i--) {
      const b = beads[i];
      const age = clock - b.born;
      const want = b.dying ? 0 : age > 0 ? 1 : 0;
      b.amt += (want - b.amt) * Math.min(1, dt * (b.dying ? 6 : 3.5));
      if (b.dying && b.amt < 0.01) beads.splice(i, 1);
    }
    for (let i = 0; i < MAX_BEADS; i++) {
      const b = beads[beads.length - Math.min(beads.length, MAX_BEADS) + i];
      const box = b ? textBox(b.el) : null;
      if (!b || !box) {
        u.uBead.value[i].w = 0;
        continue;
      }
      const [bx, by] = toP(box.left + box.width * b.at[0], box.top + box.height * b.at[1]);
      // a bead swells as it condenses
      u.uBead.value[i].set(bx, by, (b.r / 1080) * (0.7 + 0.3 * b.amt), b.amt);
    }

    // products: one at a time, pinned to its place in the layout
    const wantId = productWanted?.id ?? null;
    // the same product can be wanted somewhere else (the hero serum, then
    // step 3): it is the same model, so it moves and is set down again
    const moved = productShown && productWanted && productShown.id === wantId && productShown.spec.anchor !== productWanted.anchor;
    if ((productShown?.id ?? null) !== wantId || moved) {
      if (productShown && !moved) fading.push(productShown);
      const m = wantId && productModels[wantId];
      productShown = m?.ready
        ? { id: wantId, group: m.group, refl: m.refl, ru: m.ru, clip: m.clip, show: 0, spec: productWanted, t0: clock, hold: riseNext }
        : null;
    }
    const place = (item) => {
      const el = document.querySelector(item.spec.anchor);
      const p = anchorPoint(el, item.spec.base || [0.5, 0.92]);
      if (!p) return false;
      const [x, y] = toWorld(p.x, p.y);
      const worldH = ((p.h * (item.spec.height || 0.8)) / vh) * 2 * H0;
      // true sizes: the element's height stands for spec.ref cm of product
      const scale = worldH / (item.spec.ref || item.group.userData.h);
      // it is set down gently onto the water (a moment's lift, then rest),
      // or, where the drop brought it, rises up out of the water
      const age = clock - item.t0;
      const lift = reduce || item.rise ? 0 : worldH * 0.06 * (1 - Math.min(1, age / 0.55)) ** 3;
      const sink = item.rise ? worldH * 1.04 * (1 - Math.min(1, age / 1.3)) ** 3 : 0;
      // a slow sway shows it is real; it sways about the front, so the
      // label faces the room
      const turn = -0.06 + Math.sin(clock * 0.4) * 0.26;
      item.group.scale.setScalar(scale);
      item.group.position.set(x, y + lift - sink, 0);
      if (item.clip) {
        item.clip.up.constant = wb ? -y : 1e6;
        item.clip.down.constant = wb ? y : 1e6;
      }
      item.group.rotation.y = turn;
      if (!item.rippled && age > 0.5 && wb && !reduce) {
        item.rippled = true;
        addRipple({ el, at: item.spec.base, pad: 0, t0: clock, S: 0, water: true });
      }
      // its reflection, mirrored about the waterline
      if (item.refl) {
        item.refl.visible = Boolean(wb);
        if (wb) {
          item.refl.scale.set(scale, -scale, scale);
          item.refl.position.set(x, y - lift + sink, 0);
          item.refl.rotation.y = turn;
          const px = (2 * H0) / vh; // one CSS pixel in world units
          item.ru.uWaterY.value = y;
          item.ru.uFade.value = wb.D * 2 * px;
          item.ru.uWobA.value = worldH * 0.005;
          item.ru.uWobF.value = (Math.PI * 2 * 4) / worldH;
        }
      }
      return true;
    };
    const fadeRefl = (item, a) => item.refl && setOpacity(item.refl, a * 0.45 * (water ? water.amt : 0));
    if (productShown?.hold) {
      productShown.group.visible = false;
      if (productShown.refl) productShown.refl.visible = false;
    } else if (productShown) {
      // rising out of the water it is solid at once; set down, it fades in
      productShown.show += (1 - productShown.show) * Math.min(1, dt * (productShown.rise ? 8 : 2.4));
      productShown.group.visible = place(productShown);
      if (productShown.refl && !productShown.group.visible) productShown.refl.visible = false;
      setOpacity(productShown.group, productShown.show);
      fadeRefl(productShown, productShown.show);
    }
    for (let i = fading.length - 1; i >= 0; i--) {
      const f = fading[i];
      f.show -= dt * 3;
      if (f.show <= 0 || (productShown && f.group === productShown.group)) {
        if (!productShown || f.group !== productShown.group) {
          f.group.visible = false;
          if (f.refl) f.refl.visible = false;
        }
        fading.splice(i, 1);
        continue;
      }
      place(f);
      setOpacity(f.group, Math.max(0, f.show));
      fadeRefl(f, Math.max(0, f.show));
    }

    renderer.render(scene, camera);
  }

  // only draw while the tab is visible
  const onVis = () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else if (!raf) {
      last = 0;
      raf = requestAnimationFrame(frame);
    }
  };
  document.addEventListener('visibilitychange', onVis);
  raf = requestAnimationFrame(frame);

  return {
    activate,
    dispose() {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis);
      ro.disconnect();
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
