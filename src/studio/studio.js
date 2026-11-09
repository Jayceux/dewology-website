// ─────────────────────────────────────────────────────────────
//  DEWOLOGY PRODUCT STUDIO (dev only)
//  Builds the five products (products.js) and the Starter Kit in 3D, lit
//  like a product photograph (the same light as the site: studioEnv.js),
//  and saves into public/assets/products/:
//   - the live 3D models, <id>.glb:            exportAllGLB() / exportGLB('serum')
//   - the pictures (lineup, Starter Kit and
//     the photo fallbacks), <id>.webp, kit-*:  "Render and save all" / renderAll()
//  Open http://localhost:5173/studio.html. Units are centimetres.
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import '@fontsource/montserrat/500.css';
import '@fontsource/montserrat/600.css';
import '@fontsource/cinzel/600.css';
import { studioEnvironment } from '../stage/studioEnv.js';
import { applyGlassLook } from '../stage/glassLook.js';
import { PRODUCTS, setLabelWidth } from './products.js';

const LOGO_SRC = '/assets/logo/secondary-logo.svg';
const NAME_INK = '#7a2436'; // deep rose print

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
  scene.environment = pmrem.fromScene(studioEnvironment(), 0.02).texture;
  pmrem.dispose();
  scene.environmentIntensity = 1.0;
  // the key light, high and slightly in front, so shadows fall short and behind
  const key = new THREE.DirectionalLight(0xfff1e0, 1.3);
  key.position.set(-9, 44, 16);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.radius = 12;
  key.shadow.blurSamples = 24;
  key.shadow.bias = -0.0005;
  Object.assign(key.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 140 });
  scene.add(key);
  scene.add(new THREE.HemisphereLight(0xfff4ec, 0x3a2418, 0.2));
  return scene;
}

// ── The Starter Kit box: board and its printed artwork ───────
const board = (color) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.78, sheen: 0.25, sheenColor: new THREE.Color(0xffffff) });

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

// Draws the artwork twice: colour (map) and foil mask (metalnessMap).
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

// ── Ground: shadows, and a soft dark pool right under a product ──
function shadowCatcher(opacity = 0.18) {
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(76, 76), new THREE.ShadowMaterial({ opacity }));
  plane.rotation.x = -Math.PI / 2;
  plane.receiveShadow = true;
  return plane;
}

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

function render(scene, camera, w, h) {
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.render(scene, camera);
}

// Glass casts no hard shadow (its light passes); the solid parts cast and
// receive them (the cap's shadow falls on the tube).
// three.js measures a liquid's depth (thickness) in the model's own units
// but how quickly it tints (attenuationDistance) in world units, so a
// product built in centimetres here would come out far deeper in colour than
// the same model on the site, where it is shown about 7 times smaller.
// The pictures use the site's tint.
const SITE_SCALE = 7;
function castShadows(obj) {
  obj.traverse((o) => {
    if (!o.isMesh) return;
    const solid = !(o.material.transmission > 0) && !o.material.userData.keepOpaque && o.name !== 'print';
    o.castShadow = solid;
    o.receiveShadow = solid;
    if (o.material.transmission > 0 && Number.isFinite(o.material.attenuationDistance)) o.material.attenuationDistance *= SITE_SCALE;
    applyGlassLook(o.material); // as on the site
  });
  return obj;
}

// Free everything a shot used: every texture, the shadow maps and the light
// (the graphics memory runs out by the fifth product otherwise)
function disposeAll(scene) {
  scene.traverse((o) => {
    if (o.isLight && o.shadow?.map) o.shadow.map.dispose();
    if (!o.isMesh) return;
    o.geometry.dispose();
    (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
      Object.values(m).forEach((v) => v?.isTexture && v.dispose());
      m.dispose();
    });
  });
  scene.environment?.dispose();
}

// ── Pictures with glass in them ──────────────────────────────
// Glass cannot be rendered onto "nothing": it shows what is behind it. So
// each picture is rendered twice, in front of black and in front of grey,
// and the difference says how much light every pixel lets through, per
// colour (difference matting). Tinted glass passes red more than blue, which
// one transparency value cannot hold, so the colour is worked out for the
// page it will sit on (the blush paper): over that paper the picture shows
// exactly what the glass would, highlights included.
const GREY = 0.6; // the light backdrop, kept inside the tone curve's straight part
function matteBackdrop() {
  // tone-mapped like everything seen through the glass, so the two match
  const mat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), mat);
  back.position.set(0, 0, -80);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), mat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.02;
  const g = new THREE.Group();
  g.add(back, floor);
  g.userData.mat = mat;
  return g;
}

function grab(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.drawImage(renderer.domElement, 0, 0);
  return ctx.getImageData(0, 0, w, h);
}

const toLin = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
const toSrgb = (v) => (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
// the blush paper the pictures sit on (the stage's paper colour), as the
// browser sees it (it blends see-through pictures in display colour)
const PAGE_S = [0.957, 0.824, 0.839];
const PAGE = PAGE_S.map(toLin);

function renderMatte(scene, camera, w, h, backdrop) {
  backdrop.userData.mat.color.setScalar(0);
  render(scene, camera, w, h);
  const K = grab(w, h);
  backdrop.userData.mat.color.setScalar(GREY);
  render(scene, camera, w, h);
  const G = grab(w, h);
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const ctx = out.getContext('2d');
  const img = ctx.createImageData(w, h);
  // the grey backdrop as it came out (top-left corner), the measure of
  // "everything passes"
  const full = [0, 1, 2].map((ch) => toLin(G.data[ch] / 255) - toLin(K.data[ch] / 255));
  for (let i = 0; i < K.data.length; i += 4) {
    const k = [0, 0, 0];
    const t = [0, 0, 0];
    for (let ch = 0; ch < 3; ch++) {
      k[ch] = toLin(K.data[i + ch] / 255);
      t[ch] = Math.min(1, Math.max(0, (toLin(G.data[i + ch] / 255) - k[ch]) / full[ch]));
    }
    // what passes untinted is transparency; the tinted rest becomes colour
    // (the faint residue of 8-bit rounding on the empty backdrop is cleared:
    // the clearest glass is still about 10% opaque)
    let a = 1 - Math.min(t[0], t[1], t[2]);
    if (a < 0.02) a = 0;
    // over the paper the glass shows k + t·paper (in light); the browser
    // blends in display colour, so the colour is solved there
    for (let ch = 0; ch < 3; ch++) {
      const target = toSrgb(Math.min(1, k[ch] + t[ch] * PAGE[ch]));
      const c = a > 0 ? (target - (1 - a) * PAGE_S[ch]) / a : 0;
      img.data[i + ch] = Math.round(255 * Math.min(1, Math.max(0, c)));
    }
    img.data[i + 3] = Math.round(255 * Math.min(1, Math.max(0, a)));
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

async function saveCanvas(name, c) {
  const blob = await new Promise((r) => c.toBlob(r, 'image/webp', 0.92));
  await fetch(`/__save-render?name=${name}`, { method: 'POST', body: blob });
  const img = document.createElement('img');
  img.src = URL.createObjectURL(blob);
  const fig = document.createElement('figure');
  const cap = document.createElement('figcaption');
  cap.textContent = `${name} (${c.width}×${c.height}, ${Math.round(blob.size / 1024)} KB)`;
  fig.append(img, cap);
  document.querySelector('#out').append(fig);
  return { name, kb: Math.round(blob.size / 1024) };
}

// ── The product shots: same camera for all, so relative sizes are true ──
async function renderProducts(only = null) {
  const W = 1000;
  const H = 1250;
  const results = [];
  for (const p of PRODUCTS.filter((x) => !only || only.includes(x.id))) {
    const scene = makeScene();
    const product = castShadows(await p.build(p));
    product.rotation.y = THREE.MathUtils.degToRad(-8);
    const backdrop = matteBackdrop();
    scene.add(backdrop, product, shadowCatcher(0.16), contactShadow(p.width * 1.7, p.width * 0.9, 0.42));
    const camera = new THREE.PerspectiveCamera(21, W / H, 1, 400);
    camera.position.set(0, 10, 66);
    camera.lookAt(0, 8.6, 0);
    results.push(await saveCanvas(`${p.id}.webp`, renderMatte(scene, camera, W, H, backdrop)));
    disposeAll(scene);
  }
  return results;
}

// ── Starter Kit box (rendered as layers so the site can open it) ──
async function kitParts() {
  const BW = 31;
  const BD = 10.5;
  const BH = 7.6;
  const T = 0.35;
  // a dusty rose board, in the bottles' pink family (it read as peach
  // under the warm key when it was 0xdcb0a4)
  const outside = board(0xd9a3ae);
  const inside = board(0xb9808c);
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

  // Travel-size products standing in the box, in routine order (tiny in
  // the picture, so their labels are drawn small: less graphics memory)
  const scale = 0.6;
  const gap = 1.2;
  const total = PRODUCTS.reduce((s, p) => s + p.width * scale, 0) + gap * (PRODUCTS.length - 1);
  let x = -total / 2;
  const bottles = [];
  setLabelWidth(512);
  for (const p of PRODUCTS) {
    const b = castShadows(await p.build(p));
    b.scale.setScalar(scale);
    b.rotation.y = THREE.MathUtils.degToRad(-8);
    b.position.set(x + (p.width * scale) / 2, T, 0.4);
    x += p.width * scale + gap;
    bottles.push({ id: p.id, obj: b, height: new THREE.Box3().setFromObject(b).max.y });
  }
  setLabelWidth(2048);
  return { back, front, lid, bottles, dims: { BW, BD, BH } };
}

async function renderKit() {
  const W = 1600;
  const H = 1100;
  const scene = makeScene();
  const parts = await kitParts();
  const catcher = shadowCatcher(0.26);
  const backdrop = matteBackdrop();
  scene.add(backdrop, catcher, parts.back, parts.front, parts.lid, ...parts.bottles.map((b) => b.obj));
  const camera = new THREE.PerspectiveCamera(22, W / H, 1, 400);
  camera.position.set(0, 27, 72);
  camera.lookAt(0, 6.5, 0);

  // Shadows need every object present to be cast, so layers that should
  // keep the box's shadow render with the catcher visible.
  const all = [catcher, parts.back, parts.front, parts.lid, ...parts.bottles.map((b) => b.obj)];
  const only = (...visible) => all.forEach((o) => (o.visible = visible.includes(o)));
  const results = [];
  only(catcher, parts.back);
  results.push(await saveCanvas('kit-back.webp', renderMatte(scene, camera, W, H, backdrop)));
  only(parts.front);
  results.push(await saveCanvas('kit-front.webp', renderMatte(scene, camera, W, H, backdrop)));
  only(parts.lid);
  results.push(await saveCanvas('kit-lid.webp', renderMatte(scene, camera, W, H, backdrop)));
  for (const b of parts.bottles) {
    only(b.obj);
    results.push(await saveCanvas(`kit-${b.id}.webp`, renderMatte(scene, camera, W, H, backdrop)));
  }

  // Where things land on screen, so the site can hide the bottles inside
  // the box before it opens (as fractions of the image height).
  const toY = (v) => (1 - v.clone().project(camera).y) / 2;
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
  disposeAll(scene);
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

// ── The live 3D models for the site (labels baked in as textures) ──
//   exportGLB()            → the Glow Serum
//   exportGLB('cleanser')  → one product;  exportAllGLB() → all five
async function exportGLB(id = 'serum') {
  const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
  await document.fonts.load('600 40px Montserrat');
  await document.fonts.load('500 40px Montserrat');
  const p = PRODUCTS.find((x) => x.id === id);
  const model = await p.build(p);
  model.name = p.name.replace(/\s+/g, '');
  const glb = await new GLTFExporter().parseAsync(model, { binary: true });
  await fetch(`/__save-render?name=${id}.glb`, { method: 'POST', body: glb });
  return { name: `${id}.glb`, kb: Math.round(glb.byteLength / 1024) };
}

async function exportAllGLB() {
  const out = [];
  for (const p of PRODUCTS) out.push(await exportGLB(p.id));
  return out;
}

window.renderAll = renderAll;
window.renderProducts = renderProducts;
window.renderKit = async () => {
  await document.fonts.load('600 40px Montserrat');
  await document.fonts.load('500 40px Montserrat');
  return renderKit();
};
window.exportGLB = exportGLB;
window.exportAllGLB = exportAllGLB;
document.querySelector('#render').addEventListener('click', renderAll);
