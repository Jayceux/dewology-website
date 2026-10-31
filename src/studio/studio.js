// ─────────────────────────────────────────────────────────────
//  DEWOLOGY PRODUCT STUDIO (dev only)
//  Builds the five products and the Starter Kit in 3D, lights them
//  like a studio product shot, and saves transparent WebP images to
//  public/assets/products/. Open http://localhost:5173/studio.html
//  and press "Render and save all" to re-render after changes.
//  Units are centimetres.
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import '@fontsource/montserrat/500.css';
import '@fontsource/montserrat/600.css';
import '@fontsource/cinzel/600.css';

const LOGO_SRC = '/assets/logo/secondary-logo.svg';
const MARK_SRC = '/assets/logo/primary-logo-mark.svg';
const NAME_INK = '#7a2436'; // deep rose text on the pink glass
const TUBE_PINK = '#eba2ac'; // soft-touch tube plastic

// ── Renderer, scene, light ───────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setClearColor(0x000000, 0);
// Khronos "Neutral" tone mapping keeps product colours true (ACES washes out pastels)
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 0.95;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap;

function makeScene() {
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.9;

  // Key light high and slightly in front, so shadows fall short and behind
  const key = new THREE.DirectionalLight(0xfff1e0, 2.3);
  key.position.set(-9, 44, 16);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.radius = 10;
  key.shadow.blurSamples = 20;
  key.shadow.bias = -0.0005;
  Object.assign(key.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 140 });
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xffe6c4, 2.2);
  rim.position.set(24, 18, -22);
  scene.add(rim);

  const fill = new THREE.HemisphereLight(0xfff4ec, 0x3a2418, 0.5);
  scene.add(fill);

  return scene;
}

// ── Materials ────────────────────────────────────────────────
const MAT = {
  glass: () =>
    new THREE.MeshPhysicalMaterial({
      color: 0xeba2ac,
      roughness: 0.3,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      sheen: 0.5,
      sheenColor: new THREE.Color(0xffe2e7),
      sheenRoughness: 0.45,
    }),
  white: () => new THREE.MeshPhysicalMaterial({ color: 0xf7f2ef, roughness: 0.26, clearcoat: 0.8, clearcoatRoughness: 0.12 }),
  rubber: () => new THREE.MeshPhysicalMaterial({ color: 0xfaf4f1, roughness: 0.55, sheen: 0.3 }),
  gold: () => new THREE.MeshStandardMaterial({ color: 0xd9ae68, metalness: 1, roughness: 0.22 }),
  board: (color) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.78, sheen: 0.25, sheenColor: new THREE.Color(0xffffff) }),
};

function enableShadows(obj) {
  obj.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  return obj;
}

// ── Shape helpers ────────────────────────────────────────────
function towards([x, y], [qx, qy], d) {
  const len = Math.hypot(qx - x, qy - y);
  const k = Math.min(d, len / 2) / len;
  return [x + (qx - x) * k, y + (qy - y) * k];
}

// Profile for a lathe: [[radius, height, cornerRounding], ...] from the
// bottom centre to the top centre.
function profile(pts) {
  const path = new THREE.Path();
  path.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    const [r, y, f = 0] = pts[i];
    if (f > 0 && i < pts.length - 1) {
      const a = towards([r, y], pts[i - 1], f);
      const b = towards([r, y], pts[i + 1], f);
      path.lineTo(a[0], a[1]);
      path.quadraticCurveTo(r, y, b[0], b[1]);
    } else {
      path.lineTo(r, y);
    }
  }
  return path.getPoints(16).map((p) => new THREE.Vector2(Math.max(0, p.x), p.y));
}

function lathe(pts, material) {
  return new THREE.Mesh(new THREE.LatheGeometry(profile(pts), 128), material);
}

// ── Labels (canvas textures with the real logo) ──────────────
const images = {};
async function loadImage(src) {
  if (images[src]) return images[src];
  const img = new Image();
  img.src = src;
  await img.decode();
  images[src] = img;
  return img;
}

function spaced(ctx, text, x, y, spacing) {
  // Draw text centred at x with letter spacing (canvas letterSpacing fallback)
  if ('letterSpacing' in ctx) {
    ctx.letterSpacing = `${spacing}px`;
    ctx.fillText(text, x + spacing / 2, y);
    ctx.letterSpacing = '0px';
    return;
  }
  ctx.fillText(text, x, y);
}

// Draws the label artwork twice: colour (map) and foil mask (metalnessMap).
function labelCanvases(w, h, draw) {
  const color = document.createElement('canvas');
  const foil = document.createElement('canvas');
  color.width = foil.width = w;
  color.height = foil.height = h;
  const c = color.getContext('2d');
  const f = foil.getContext('2d');
  f.fillStyle = '#000';
  f.fillRect(0, 0, w, h);
  draw(c, f);
  const map = new THREE.CanvasTexture(color);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  const metal = new THREE.CanvasTexture(foil);
  return { map, metal };
}

// Gold foil image + white copy of it on the foil mask
function drawFoil(c, f, img, x, y, w, h) {
  c.drawImage(img, x, y, w, h);
  const tmp = document.createElement('canvas');
  tmp.width = Math.ceil(w);
  tmp.height = Math.ceil(h);
  const t = tmp.getContext('2d');
  t.drawImage(img, 0, 0, w, h);
  t.globalCompositeOperation = 'source-in';
  t.fillStyle = '#fff';
  t.fillRect(0, 0, w, h);
  f.drawImage(tmp, x, y);
}

async function bottleLabel({ name, step }, widthCm, heightCm) {
  const logo = await loadImage(LOGO_SRC);
  const W = 1024;
  const H = Math.round((W * heightCm) / widthCm);
  return labelCanvases(W, H, (c, f) => {
    // Layout block = logo + name + rule + step. Shrink it to fit short labels (jar).
    const base = W * 0.6;
    const blockAt = (s) => (base * s * logo.height) / logo.width + W * 0.29 * s;
    const s = Math.min(1, (H * 0.86) / blockAt(1));
    const logoW = base * s;
    const logoH = (logoW * logo.height) / logo.width;
    const top = H * 0.2 * s + (H - blockAt(s) - H * 0.2 * s) * (s < 1 ? 0.5 : 0);
    drawFoil(c, f, logo, (W - logoW) / 2, top, logoW, logoH);
    c.textAlign = 'center';
    c.textBaseline = 'alphabetic';
    c.fillStyle = NAME_INK;
    c.font = `600 ${Math.round(W * 0.056 * s)}px Montserrat`;
    spaced(c, name.toUpperCase(), W / 2, top + logoH + W * 0.15 * s, W * 0.012 * s);
    // thin gold rule
    const ruleY = top + logoH + W * 0.2 * s;
    c.fillStyle = '#c99b55';
    c.fillRect(W * 0.42, ruleY, W * 0.16, Math.max(2, W * 0.003));
    f.fillStyle = '#fff';
    f.fillRect(W * 0.42, ruleY, W * 0.16, Math.max(2, W * 0.003));
    c.fillStyle = NAME_INK;
    c.font = `500 ${Math.round(W * 0.04 * s)}px Montserrat`;
    spaced(c, `STEP 0${step}`, W / 2, top + logoH + W * 0.27 * s, W * 0.014 * s);
  });
}

function labelMaterial({ map, metal }) {
  return new THREE.MeshPhysicalMaterial({
    map,
    metalnessMap: metal,
    metalness: 1,
    roughness: 0.28,
    transparent: true,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
}

// A curved label wrapped around the front of a round body
async function addLabel(group, product, radius, y0, y1, arcDeg) {
  const arc = THREE.MathUtils.degToRad(arcDeg);
  const tex = await bottleLabel(product, radius * arc, y1 - y0);
  const geo = new THREE.CylinderGeometry(radius, radius, y1 - y0, 96, 1, true, -arc / 2, arc);
  const mesh = new THREE.Mesh(geo, labelMaterial(tex));
  mesh.position.y = (y0 + y1) / 2;
  group.add(mesh);
}

// ── The five products ────────────────────────────────────────
async function cleanser(p) {
  const g = new THREE.Group();
  g.add(lathe([[0, 0], [2.95, 0, 0.45], [2.95, 12.2, 1.7], [1.05, 13.9, 0.3], [1.05, 14.6], [0, 14.6]], MAT.glass()));
  g.add(lathe([[0, 14.0], [1.32, 14.0, 0.15], [1.32, 15.4, 0.2], [0, 15.4]], MAT.white()));
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.4, 48), MAT.white());
  stem.position.y = 16.0;
  g.add(stem);
  const head = new THREE.Mesh(new RoundedBoxGeometry(2.1, 1.3, 2.1, 6, 0.4), MAT.white());
  head.position.y = 17.25;
  g.add(head);
  const nozzle = new THREE.Mesh(new RoundedBoxGeometry(2.4, 0.6, 0.7, 6, 0.26), MAT.white());
  nozzle.position.set(1.7, 17.45, 0);
  g.add(nozzle);
  await addLabel(g, p, 2.97, 2.3, 10.6, 128);
  return g;
}

async function toner(p) {
  const g = new THREE.Group();
  g.add(lathe([[0, 0], [2.8, 0, 0.5], [2.8, 13.4, 1.9], [1.0, 15.2, 0.25], [1.0, 16.0], [0, 16.0]], MAT.glass()));
  g.add(lathe([[0, 15.5], [1.4, 15.5, 0.15], [1.4, 19.0, 0.5], [0, 19.0]], MAT.white()));
  await addLabel(g, p, 2.82, 2.0, 11.4, 130);
  return g;
}

async function serum(p) {
  const g = new THREE.Group();
  g.add(lathe([[0, 0], [1.85, 0, 0.4], [1.85, 7.2, 1.2], [0.75, 8.4, 0.15], [0.75, 8.9], [0, 8.9]], MAT.glass()));
  g.add(lathe([[0, 8.5], [1.02, 8.5, 0.12], [1.02, 9.9, 0.12], [0, 9.9]], MAT.gold()));
  // Rounded rubber bulb: a straight sleeve topped by a dome
  const dome = Array.from({ length: 10 }, (_, i) => {
    const a = ((i + 1) / 10) * (Math.PI / 2);
    return [0.88 * Math.cos(a), 11.5 + 0.95 * Math.sin(a)];
  });
  g.add(lathe([[0, 9.9], [0.8, 9.9, 0.1], [0.88, 10.3], [0.88, 11.5], ...dome], MAT.rubber()));
  await addLabel(g, p, 1.87, 1.0, 6.4, 140);
  return g;
}

async function moisturizer(p) {
  const g = new THREE.Group();
  g.add(lathe([[0, 0], [3.9, 0, 0.7], [4.0, 4.4, 0.3], [3.5, 4.6], [3.5, 5.0], [0, 5.0]], MAT.glass()));
  g.add(lathe([[0, 4.55], [4.14, 4.55, 0.2], [4.14, 6.9, 0.55], [0, 6.9]], MAT.white()));
  await addLabel(g, p, 4.02, 0.7, 4.0, 118);
  return g;
}

async function sunscreen(p) {
  const g = new THREE.Group();
  // Flip cap (the tube stands on it)
  g.add(lathe([[0, 0], [1.72, 0, 0.35], [1.72, 2.5, 0.25], [1.05, 2.85], [0, 2.85]], MAT.white()));

  // Tube body: a cylinder squeezed flat towards the crimped top
  const R = 1.85;
  const L = 13.2;
  const geo = new THREE.CylinderGeometry(R, R, L, 128, 80, true, Math.PI, Math.PI * 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = (y + L / 2) / L;
    const s = THREE.MathUtils.smoothstep(t, 0.38, 1.0);
    pos.setX(i, pos.getX(i) * (1 + 0.52 * s));
    pos.setZ(i, pos.getZ(i) * (1 - 0.93 * s));
  }
  geo.computeVertexNormals();

  const logo = await loadImage(LOGO_SRC);
  const W = 1024;
  const H = Math.round((W * L) / (2 * Math.PI * R));
  const tex = labelCanvases(W, H, (c, f) => {
    c.fillStyle = TUBE_PINK;
    c.fillRect(0, 0, W, H);
    const lw = W * 0.24;
    const lh = (lw * logo.height) / logo.width;
    const top = H * 0.46;
    drawFoil(c, f, logo, (W - lw) / 2, top, lw, lh);
    c.textAlign = 'center';
    c.fillStyle = NAME_INK;
    c.font = `600 ${Math.round(W * 0.022)}px Montserrat`;
    spaced(c, p.name.toUpperCase(), W / 2, top + lh + W * 0.05, W * 0.005);
    c.font = `500 ${Math.round(W * 0.016)}px Montserrat`;
    spaced(c, `STEP 0${p.step}`, W / 2, top + lh + W * 0.082, W * 0.006);
  });
  const tube = new THREE.Mesh(
    geo,
    new THREE.MeshPhysicalMaterial({ map: tex.map, metalnessMap: tex.metal, metalness: 1, roughness: 0.36, clearcoat: 0.6, clearcoatRoughness: 0.2, side: THREE.DoubleSide }),
  );
  tube.position.y = 2.75 + L / 2;
  g.add(tube);

  const crimp = new THREE.Mesh(new RoundedBoxGeometry(R * 2 * 1.52 + 0.1, 1.1, 0.34, 4, 0.12), new THREE.MeshPhysicalMaterial({ color: TUBE_PINK, roughness: 0.45, clearcoat: 0.4 }));
  crimp.position.y = 2.75 + L - 0.35;
  g.add(crimp);
  return g;
}

const PRODUCTS = [
  { id: 'cleanser', name: 'Gentle Cleanser', step: 1, build: cleanser, width: 6.2 },
  { id: 'toner', name: 'Balancing Toner', step: 2, build: toner, width: 5.8 },
  { id: 'serum', name: 'Glow Serum', step: 3, build: serum, width: 3.9 },
  { id: 'moisturizer', name: 'Barrier Moisturizer', step: 4, build: moisturizer, width: 8.4 },
  { id: 'sunscreen', name: 'Daily Sunscreen', step: 5, build: sunscreen, width: 5.7 },
];

// ── Rendering helpers ────────────────────────────────────────
function shadowCatcher(opacity = 0.18) {
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(76, 76), new THREE.ShadowMaterial({ opacity }));
  plane.rotation.x = -Math.PI / 2;
  plane.receiveShadow = true;
  return plane;
}

// Soft dark pool right under a product, so it sits on the ground
function contactShadow(width, depth, strength = 0.5) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, `rgba(30, 12, 8, ${strength})`);
  g.addColorStop(0.45, `rgba(30, 12, 8, ${strength * 0.45})`);
  g.addColorStop(1, 'rgba(30, 12, 8, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.02;
  return m;
}

async function save(name, w, h) {
  const blob = await new Promise((r) => renderer.domElement.toBlob(r, 'image/webp', 0.92));
  await fetch(`/__save-render?name=${name}`, { method: 'POST', body: blob });
  const img = document.createElement('img');
  img.src = URL.createObjectURL(blob);
  const fig = document.createElement('figure');
  const cap = document.createElement('figcaption');
  cap.textContent = `${name} (${w}×${h}, ${Math.round(blob.size / 1024)} KB)`;
  fig.append(img, cap);
  document.querySelector('#out').append(fig);
  return { name, kb: Math.round(blob.size / 1024) };
}

function render(scene, camera, w, h) {
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.render(scene, camera);
}

// Single product shots: same camera for all, so relative sizes are true.
async function renderProducts() {
  const W = 1000;
  const H = 1250;
  const results = [];
  for (const p of PRODUCTS) {
    const scene = makeScene();
    const product = enableShadows(await p.build(p));
    product.rotation.y = THREE.MathUtils.degToRad(-16);
    scene.add(product, shadowCatcher(), contactShadow(p.width * 1.7, p.width * 0.9));
    const camera = new THREE.PerspectiveCamera(21, W / H, 1, 400);
    camera.position.set(0, 10, 66);
    camera.lookAt(0, 8.6, 0);
    render(scene, camera, W, H);
    results.push(await save(`${p.id}.webp`, W, H));
    dispose(scene);
  }
  return results;
}

// Free GPU memory between shots (the software renderer runs out otherwise)
function dispose(scene) {
  scene.traverse((o) => {
    if (!o.isMesh) return;
    o.geometry.dispose();
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach((m) => {
      ['map', 'metalnessMap'].forEach((k) => m[k]?.dispose());
      m.dispose();
    });
  });
  scene.environment?.dispose();
}

// ── Starter Kit box (rendered as layers so the site can open it) ──
async function kitParts() {
  const BW = 31;
  const BD = 10.5;
  const BH = 7.6;
  const T = 0.35;
  const outside = MAT.board(0xdcb0a4);
  const inside = MAT.board(0xbd8b80);
  const mk = (w, h, d, mat, x, y, z) => {
    const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.06), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };

  const back = new THREE.Group();
  back.add(mk(BW, T, BD, inside, 0, T / 2, 0));
  back.add(mk(BW, BH, T, outside, 0, BH / 2, -BD / 2 + T / 2));
  back.add(mk(T, BH, BD, outside, -BW / 2 + T / 2, BH / 2, 0));
  back.add(mk(T, BH, BD, outside, BW / 2 - T / 2, BH / 2, 0));

  // Front wall with the logo and "Starter Kit"
  const front = new THREE.Group();
  front.add(mk(BW, BH, T, outside, 0, BH / 2, BD / 2 - T / 2));
  const logo = await loadImage(LOGO_SRC);
  const fw = 1536;
  const fh = Math.round((fw * BH) / BW);
  const frontTex = labelCanvases(fw, fh, (c, f) => {
    const lw = fw * 0.26;
    const lh = (lw * logo.height) / logo.width;
    drawFoil(c, f, logo, (fw - lw) / 2, fh * 0.2, lw, lh);
    c.textAlign = 'center';
    c.fillStyle = NAME_INK;
    c.font = `600 ${Math.round(fw * 0.022)}px Montserrat`;
    spaced(c, 'STARTER KIT', fw / 2, fh * 0.2 + lh + fw * 0.05, fw * 0.008);
    c.font = `500 ${Math.round(fw * 0.014)}px Montserrat`;
    spaced(c, '5 STEPS · DAY AND NIGHT · ALL SKIN TYPES', fw / 2, fh * 0.2 + lh + fw * 0.08, fw * 0.004);
  });
  const frontLabel = new THREE.Mesh(new THREE.PlaneGeometry(BW - 0.4, BH - 0.4), labelMaterial(frontTex));
  frontLabel.position.set(0, BH / 2, BD / 2 + 0.01);
  front.add(frontLabel);

  // Lid (closed position) with the mark on top
  const lid = new THREE.Group();
  const LW = BW + 0.5;
  const LD = BD + 0.5;
  const LH = 1.9;
  const lidY = BH - LH + 0.5;
  lid.add(mk(LW, T, LD, outside, 0, lidY + LH - T / 2, 0));
  lid.add(mk(LW, LH, T, outside, 0, lidY + LH / 2, LD / 2 - T / 2));
  lid.add(mk(LW, LH, T, outside, 0, lidY + LH / 2, -LD / 2 + T / 2));
  lid.add(mk(T, LH, LD, outside, -LW / 2 + T / 2, lidY + LH / 2, 0));
  lid.add(mk(T, LH, LD, outside, LW / 2 - T / 2, lidY + LH / 2, 0));
  const lidTex = labelCanvases(1536, Math.round((1536 * LD) / LW), (c, f) => {
    const lw = 1536 * 0.3;
    const lh = (lw * logo.height) / logo.width;
    drawFoil(c, f, logo, (1536 - lw) / 2, (c.canvas.height - lh) / 2, lw, lh);
  });
  const lidTop = new THREE.Mesh(new THREE.PlaneGeometry(LW - 0.4, LD - 0.4), labelMaterial(lidTex));
  lidTop.rotation.x = -Math.PI / 2;
  lidTop.position.set(0, lidY + LH + 0.01, 0);
  lid.add(lidTop);

  // Travel-size products standing in the box, in routine order
  const scale = 0.6;
  const gap = 1.2;
  const total = PRODUCTS.reduce((s, p) => s + p.width * scale, 0) + gap * (PRODUCTS.length - 1);
  let x = -total / 2;
  const bottles = [];
  for (const p of PRODUCTS) {
    const b = enableShadows(await p.build(p));
    b.scale.setScalar(scale);
    b.rotation.y = THREE.MathUtils.degToRad(-8);
    b.position.set(x + (p.width * scale) / 2, T, 0.4);
    x += p.width * scale + gap;
    bottles.push({ id: p.id, obj: b, height: new THREE.Box3().setFromObject(b).max.y });
  }
  return { back, front, lid, bottles, dims: { BW, BD, BH } };
}

async function renderKit() {
  const W = 1600;
  const H = 1100;
  const scene = makeScene();
  const parts = await kitParts();
  const catcher = shadowCatcher(0.26);
  scene.add(catcher, parts.back, parts.front, parts.lid, ...parts.bottles.map((b) => b.obj));
  const camera = new THREE.PerspectiveCamera(22, W / H, 1, 400);
  camera.position.set(0, 27, 72);
  camera.lookAt(0, 6.5, 0);
  camera.aspect = W / H;
  camera.updateProjectionMatrix();

  const all = [catcher, parts.back, parts.front, parts.lid, ...parts.bottles.map((b) => b.obj)];
  const only = (...visible) => all.forEach((o) => (o.visible = visible.includes(o)));
  const results = [];

  // Shadows need every object present to be cast, so layers that should
  // keep the box's shadow render with the catcher visible.
  only(catcher, parts.back);
  render(scene, camera, W, H);
  results.push(await save('kit-back.webp', W, H));

  only(parts.front);
  render(scene, camera, W, H);
  results.push(await save('kit-front.webp', W, H));

  only(parts.lid);
  render(scene, camera, W, H);
  results.push(await save('kit-lid.webp', W, H));

  for (const b of parts.bottles) {
    only(b.obj);
    render(scene, camera, W, H);
    results.push(await save(`kit-${b.id}.webp`, W, H));
  }

  // Where things land on screen, so the site can hide the bottles inside
  // the box before it opens (as fractions of the image height).
  const toY = (v) => ((1 - v.clone().project(camera).y) / 2);
  const { BD, BH } = parts.dims;
  const meta = {
    width: W,
    height: H,
    boxBottom: toY(new THREE.Vector3(0, 0, BD / 2)),
    rimFront: toY(new THREE.Vector3(0, BH, BD / 2)),
    bottles: parts.bottles.map((b) => ({ id: b.id, top: toY(new THREE.Vector3(b.obj.position.x, b.height, b.obj.position.z)) })),
  };
  await fetch('/__save-render?name=kit-meta.json', { method: 'POST', body: JSON.stringify(meta, null, 2) });
  results.push({ name: 'kit-meta.json', meta });
  return results;
}

async function renderAll() {
  const status = document.querySelector('#status');
  status.textContent = 'Rendering…';
  await document.fonts.load('600 40px Montserrat');
  await document.fonts.load('500 40px Montserrat');
  const out = [...(await renderProducts()), ...(await renderKit())];
  status.textContent = `Saved ${out.length} files.`;
  return out;
}

// Live 3D for the website hero: export the Glow Serum as a .glb model
// (labels baked in as textures). Saved to public/assets/products/serum.glb.
async function exportGLB() {
  const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
  await document.fonts.load('600 40px Montserrat');
  await document.fonts.load('500 40px Montserrat');
  const p = PRODUCTS.find((x) => x.id === 'serum');
  const model = await p.build(p);
  model.name = 'GlowSerum';
  const glb = await new GLTFExporter().parseAsync(model, { binary: true });
  await fetch('/__save-render?name=serum.glb', { method: 'POST', body: glb });
  return { name: 'serum.glb', kb: Math.round(glb.byteLength / 1024) };
}

window.renderAll = renderAll;
window.exportGLB = exportGLB;
document.querySelector('#render').addEventListener('click', renderAll);
