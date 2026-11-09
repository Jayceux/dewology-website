// ─────────────────────────────────────────────────────────────
//  DEWOLOGY PRODUCTS (dev only, built by the studio: studio.js)
//  The five products, built to look photographed:
//   - toner and serum are glass filled with liquid: a filled lower
//     body (glass and liquid seen as one tinted volume), a clear air
//     gap at the shoulder, the liquid's surface and its bright
//     meniscus line; the serum's glass dropper shows inside
//   - the cleanser is frosted PET with pink gel and its dip tube faintly
//     seen through it; the moisturizer a thick frosted-glass jar with
//     the cream inside; the sunscreen a soft-touch tube
//   - ribbed caps and collars, a brushed-gold collar, labels printed
//     matte on gloss (ink is rougher than the glass, the logo is foil),
//     and a faint unevenness in every surface, as real objects have
//  Units are centimetres. Parts that sit inside glass are marked
//  userData.keepOpaque: they must stay opaque so the glass can show them.
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const LOGO_SRC = '/assets/logo/secondary-logo.svg';
const NAME_INK = '#7a2436';
const GOLD_RULE = '#c99b55';
const TUBE_PINK = '#eba2ac';

// label texture width: full detail for the live models and product shots,
// smaller for the Starter Kit picture, where the bottles are tiny
let LABEL_W = 2048;
export function setLabelWidth(w) {
  LABEL_W = w;
}

// ── Shape helpers ────────────────────────────────────────────
function towards([x, y], [qx, qy], d) {
  const len = Math.hypot(qx - x, qy - y);
  const k = Math.min(d, len / 2) / len;
  return [x + (qx - x) * k, y + (qy - y) * k];
}

// [[radius, height, cornerRounding], ...] from the bottom centre up
function profilePoints(pts, divisions = 20) {
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
  return path.getPoints(divisions).map((p) => new THREE.Vector2(Math.max(0, p.x), p.y));
}

// Split a profile at a height: the part below and the part above
function splitAt(points, y) {
  const lo = [];
  const hi = [];
  points.forEach((p, i) => {
    if (i > 0) {
      const q = points[i - 1];
      if ((q.y - y) * (p.y - y) < 0) {
        const t = (y - q.y) / (p.y - q.y);
        const m = new THREE.Vector2(q.x + (p.x - q.x) * t, y);
        lo.push(m);
        hi.push(m.clone());
      }
    }
    if (p.y <= y) lo.push(p);
    else hi.push(p);
  });
  return [lo, hi];
}

// the radius of a profile at a height
function radiusAt(points, y) {
  for (let i = 1; i < points.length; i++) {
    const q = points[i - 1];
    const p = points[i];
    if ((q.y - y) * (p.y - y) <= 0 && p.y !== q.y) return q.x + ((p.x - q.x) * (y - q.y)) / (p.y - q.y);
  }
  return points[0].x;
}

const lathe = (points, material, segments = 160) => new THREE.Mesh(new THREE.LatheGeometry(points, segments), material);

// Fine vertical ribs around a round part (caps, collars, the jar lid)
function knurl(geo, count, depth, y0, y1) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y < y0 || y > y1) continue;
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x, z);
    if (r < 1e-3) continue;
    const th = Math.atan2(x, z);
    const rib = Math.pow(0.5 + 0.5 * Math.cos(th * count), 0.7);
    const k = (r + depth * rib) / r;
    pos.setX(i, x * k);
    pos.setZ(i, z * k);
  }
  geo.computeVertexNormals();
  return geo;
}

// ── Textures ─────────────────────────────────────────────────
function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// A faint, soft unevenness (a roughness map: 1 = the material's roughness)
const noiseCache = {};
function unevenness(seed = 1, low = 0.72) {
  const key = `${seed}-${low}`;
  if (noiseCache[key]) return noiseCache[key];
  const S = 256;
  const c = canvas(S, S);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(S, S);
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  // a few octaves of smooth value noise, tiling
  const grid = (n) => Array.from({ length: n * n }, rnd);
  const octaves = [[4, 0.5], [9, 0.3], [23, 0.2]].map(([n, w]) => ({ n, w, g: grid(n) }));
  const smooth = (t) => t * t * (3 - 2 * t);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      let v = 0;
      for (const { n, w, g } of octaves) {
        const fx = (x / S) * n;
        const fy = (y / S) * n;
        const ix = Math.floor(fx);
        const iy = Math.floor(fy);
        const tx = smooth(fx - ix);
        const ty = smooth(fy - iy);
        const at = (a, b) => g[((b % n) + n) % n * n + (((a % n) + n) % n)];
        const top = at(ix, iy) * (1 - tx) + at(ix + 1, iy) * tx;
        const bot = at(ix, iy + 1) * (1 - tx) + at(ix + 1, iy + 1) * tx;
        v += (top * (1 - ty) + bot * ty) * w;
      }
      const g8 = Math.round(255 * (low + (1 - low) * v));
      const o = (y * S + x) * 4;
      img.data[o] = img.data[o + 1] = img.data[o + 2] = g8;
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  noiseCache[key] = t;
  return t;
}

// Fine vertical ridges (a normal map): the crimped end of the tube
function ridgesNormal(count = 90) {
  const W = 512;
  const H = 8;
  const c = canvas(W, H);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(W, H);
  for (let x = 0; x < W; x++) {
    const nx = Math.sin((x / W) * Math.PI * 2 * count) * 0.55;
    const nz = Math.sqrt(1 - nx * nx);
    for (let y = 0; y < H; y++) {
      const o = (y * W + x) * 4;
      img.data[o] = Math.round((nx * 0.5 + 0.5) * 255);
      img.data[o + 1] = 128;
      img.data[o + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return new THREE.CanvasTexture(c);
}

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
  if ('letterSpacing' in ctx) {
    ctx.letterSpacing = `${spacing}px`;
    ctx.fillText(text, x + spacing / 2, y);
    ctx.letterSpacing = '0px';
    return;
  }
  ctx.fillText(text, x, y);
}

// The label artwork in three layers: colour (with alpha), foil (where the
// logo and rule are gold) and roughness (matte ink, smoother foil)
function labelLayers(w, h, draw, background = null) {
  const color = canvas(w, h);
  const foil = canvas(w, h);
  const rough = canvas(w, h);
  const c = color.getContext('2d');
  const f = foil.getContext('2d');
  const r = rough.getContext('2d');
  f.fillStyle = '#000';
  f.fillRect(0, 0, w, h);
  r.fillStyle = background ? background.rough : '#6e6e6e';
  r.fillRect(0, 0, w, h);
  if (background) {
    c.fillStyle = background.color;
    c.fillRect(0, 0, w, h);
  }
  draw({ c, f, r });
  const map = new THREE.CanvasTexture(color);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  const metal = new THREE.CanvasTexture(foil);
  const roughMap = new THREE.CanvasTexture(rough);
  return { map, metal, rough: roughMap };
}

// gold foil: the image in colour, white on the foil layer, smooth on the roughness layer
function drawFoil({ c, f, r }, img, x, y, w, h) {
  c.drawImage(img, x, y, w, h);
  const tmp = canvas(Math.ceil(w), Math.ceil(h));
  const t = tmp.getContext('2d');
  t.drawImage(img, 0, 0, w, h);
  t.globalCompositeOperation = 'source-in';
  t.fillStyle = '#fff';
  t.fillRect(0, 0, w, h);
  f.drawImage(tmp, x, y);
  t.fillStyle = '#3c3c3c';
  t.fillRect(0, 0, w, h);
  r.drawImage(tmp, x, y);
}

function ink(layers, draw) {
  layers.c.fillStyle = NAME_INK;
  draw(layers.c);
  // matte ink on the roughness layer
  layers.r.fillStyle = '#9a9a9a';
  draw(layers.r);
}

async function bottleLabel({ name, step }, widthCm, heightCm, background = null) {
  const logo = await loadImage(LOGO_SRC);
  const W = LABEL_W;
  const H = Math.round((W * heightCm) / widthCm);
  return labelLayers(
    W,
    H,
    (L) => {
      const base = W * 0.6;
      const blockAt = (s) => (base * s * logo.height) / logo.width + W * 0.29 * s;
      const s = Math.min(1, (H * 0.86) / blockAt(1));
      const logoW = base * s;
      const logoH = (logoW * logo.height) / logo.width;
      const top = H * 0.2 * s + (H - blockAt(s) - H * 0.2 * s) * (s < 1 ? 0.5 : 0);
      drawFoil(L, logo, (W - logoW) / 2, top, logoW, logoH);
      ink(L, (ctx) => {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.font = `600 ${Math.round(W * 0.056 * s)}px Montserrat`;
        spaced(ctx, name.toUpperCase(), W / 2, top + logoH + W * 0.15 * s, W * 0.012 * s);
        ctx.font = `500 ${Math.round(W * 0.04 * s)}px Montserrat`;
        spaced(ctx, `STEP 0${step}`, W / 2, top + logoH + W * 0.27 * s, W * 0.014 * s);
      });
      // the thin gold rule
      const ruleY = top + logoH + W * 0.2 * s;
      const rule = [W * 0.42, ruleY, W * 0.16, Math.max(3, W * 0.003)];
      L.c.fillStyle = GOLD_RULE;
      L.c.fillRect(...rule);
      L.f.fillStyle = '#fff';
      L.f.fillRect(...rule);
      L.r.fillStyle = '#3c3c3c';
      L.r.fillRect(...rule);
    },
    background,
  );
}

function printMaterial({ map, metal, rough }) {
  return new THREE.MeshPhysicalMaterial({
    map,
    metalnessMap: metal,
    metalness: 1,
    roughnessMap: rough,
    roughness: 1,
    transparent: true,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
}

// A label printed straight onto a round body
async function addPrint(group, product, radius, y0, y1, arcDeg) {
  const arc = THREE.MathUtils.degToRad(arcDeg);
  const tex = await bottleLabel(product, radius * arc, y1 - y0);
  const geo = new THREE.CylinderGeometry(radius, radius, y1 - y0, 160, 1, true, -arc / 2, arc);
  const mesh = new THREE.Mesh(geo, printMaterial(tex));
  mesh.position.y = (y0 + y1) / 2;
  mesh.name = 'print';
  group.add(mesh);
}

// ── Materials ────────────────────────────────────────────────
const tint = (r, g, b) => new THREE.Color(r, g, b);

const MAT = {
  // the filled part of a bottle: glass and liquid as one tinted volume
  filled: ({ att, dist, thickness, color = 0xffffff, ior = 1.45, reflColor }) =>
    Object.assign(
      new THREE.MeshPhysicalMaterial({
        color,
        roughness: 0.035,
        roughnessMap: unevenness(3, 0.6),
        transmission: 1,
        thickness,
        ior,
        attenuationColor: att,
        attenuationDistance: dist,
        specularIntensity: 1,
      }),
      { userData: { reflColor } },
    ),
  // the clear glass above the liquid line
  clearGlass: ({ att, dist = 6, thickness = 0.35, reflColor }) =>
    Object.assign(
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        roughness: 0.03,
        roughnessMap: unevenness(4, 0.6),
        transmission: 1,
        thickness,
        ior: 1.5,
        attenuationColor: att,
        attenuationDistance: dist,
      }),
      { userData: { reflColor } },
    ),
  // frosted (sand-blasted) glass or PET: the light passes, blurred
  frosted: ({ color, att, dist, thickness, roughness = 0.42, ior = 1.48, reflColor }) =>
    Object.assign(
      new THREE.MeshPhysicalMaterial({
        color,
        roughness,
        roughnessMap: unevenness(5, 0.85),
        transmission: 1,
        thickness,
        ior,
        attenuationColor: att,
        attenuationDistance: dist,
        sheen: 0.25,
        sheenColor: tint(1, 0.93, 0.94),
        sheenRoughness: 0.6,
      }),
      { userData: { reflColor } },
    ),
  // things inside the glass, kept opaque so the glass can show them
  inside: (color, roughness = 0.1, extra = {}) =>
    Object.assign(new THREE.MeshPhysicalMaterial({ color, roughness, ...extra }), { userData: { keepOpaque: true } }),
  // white polypropylene caps and pumps: a soft gloss, never mirror-like
  whitePP: () =>
    new THREE.MeshPhysicalMaterial({
      color: tint(0.95, 0.92, 0.9),
      roughness: 0.3,
      roughnessMap: unevenness(6, 0.75),
      clearcoat: 0.35,
      clearcoatRoughness: 0.18,
      sheen: 0.15,
      sheenColor: tint(1, 1, 1),
    }),
  silicone: () =>
    new THREE.MeshPhysicalMaterial({
      color: tint(0.96, 0.93, 0.92),
      roughness: 0.55,
      roughnessMap: unevenness(7, 0.8),
      sheen: 0.55,
      sheenColor: tint(1, 0.97, 0.96),
      sheenRoughness: 0.5,
      specularIntensity: 0.6,
    }),
  brushedGold: () =>
    new THREE.MeshPhysicalMaterial({
      color: tint(0.8, 0.57, 0.29),
      metalness: 1,
      roughness: 0.32,
      roughnessMap: unevenness(8, 0.8),
      anisotropy: 0.75,
      clearcoat: 0.2,
      clearcoatRoughness: 0.2,
    }),
};

// ── The five products ────────────────────────────────────────
// A bottle of glass and liquid: the filled body below `fill`, clear glass
// above it, the liquid's surface and the bright meniscus where it meets
// the glass
function filledBottle(g, shape, fill, look) {
  const pts = profilePoints(shape);
  const [lo, hi] = splitAt(pts, fill);
  g.add(lathe(lo, MAT.filled(look.filled)));
  g.add(lathe(hi, MAT.clearGlass(look.glass)));
  const rIn = radiusAt(pts, fill) - look.wall;
  const surface = new THREE.Mesh(new THREE.CircleGeometry(rIn, 96), MAT.inside(look.surface, 0.04, { clearcoat: 1, clearcoatRoughness: 0.02 }));
  surface.rotation.x = -Math.PI / 2;
  surface.position.y = fill - 0.02;
  g.add(surface);
  const meniscus = new THREE.Mesh(new THREE.TorusGeometry(rIn, 0.06, 10, 160), MAT.inside(look.meniscus, 0.08));
  meniscus.rotation.x = Math.PI / 2;
  meniscus.position.y = fill;
  g.add(meniscus);
  return pts;
}

async function cleanser(p) {
  const g = new THREE.Group();
  // frosted PET with the pink gel inside, read as one blurred volume
  g.add(
    lathe(
      profilePoints([[0, 0], [2.95, 0, 0.45], [2.95, 12.2, 1.7], [1.05, 13.9, 0.3], [1.05, 14.6], [0, 14.6]]),
      MAT.frosted({ color: tint(1, 0.85, 0.88), att: tint(0.94, 0.38, 0.5), dist: 1.0, thickness: 5.4, roughness: 0.36, reflColor: '#e89aa6' }),
    ),
  );
  // the dip tube, faintly seen through the frosting
  const tube = lathe(profilePoints([[0, 0.5], [0.22, 0.5], [0.22, 14.2], [0, 14.2]], 2), MAT.inside(tint(0.97, 0.9, 0.9), 0.3), 48);
  g.add(tube);
  // ribbed screw collar
  const collar = lathe(profilePoints([[0, 14.0], [1.36, 14.0, 0.12], [1.36, 15.4, 0.18], [0, 15.4]]), MAT.whitePP(), 360);
  knurl(collar.geometry, 64, 0.045, 14.15, 15.25);
  g.add(collar);
  // the pump: stem, lock ring, actuator and nozzle
  g.add(lathe(profilePoints([[0, 15.3], [0.34, 15.3], [0.34, 16.7], [0, 16.7]], 2), MAT.whitePP(), 64));
  g.add(lathe(profilePoints([[0, 15.35], [0.62, 15.35, 0.1], [0.62, 15.7, 0.1], [0, 15.7]]), MAT.whitePP(), 96));
  const head = new THREE.Mesh(new RoundedBoxGeometry(2.1, 1.3, 2.1, 8, 0.45), MAT.whitePP());
  head.position.y = 17.25;
  g.add(head);
  const nozzle = new THREE.Mesh(new RoundedBoxGeometry(2.4, 0.6, 0.72, 8, 0.27), MAT.whitePP());
  nozzle.position.set(1.7, 17.45, 0);
  g.add(nozzle);
  // the outlet at the nozzle's tip
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.13, 24), new THREE.MeshStandardMaterial({ color: 0x8a6a66, roughness: 0.8 }));
  hole.rotation.y = Math.PI / 2;
  hole.position.set(2.905, 17.45, 0);
  g.add(hole);
  await addPrint(g, p, 2.965, 2.3, 10.6, 128);
  g.userData.caustic = { strength: 0.45, color: [1, 0.62, 0.7] };
  return g;
}

async function toner(p) {
  const g = new THREE.Group();
  filledBottle(g, [[0, 0], [2.8, 0, 0.5], [2.8, 13.4, 1.9], [1.0, 15.2, 0.25], [1.0, 16.0], [0, 16.0]], 11.9, {
    filled: { att: tint(0.97, 0.56, 0.66), dist: 1.0, thickness: 5.2, color: tint(1, 0.93, 0.95), ior: 1.4, reflColor: '#ef9fae' },
    glass: { att: tint(0.98, 0.86, 0.9), dist: 8, thickness: 0.3, reflColor: '#f6d2d8' },
    wall: 0.22,
    surface: tint(0.97, 0.66, 0.72),
    meniscus: tint(1, 0.9, 0.92),
  });
  // ribbed screw cap
  const cap = lathe(profilePoints([[0, 15.5], [1.44, 15.5, 0.12], [1.44, 19.0, 0.5], [0, 19.0]]), MAT.whitePP(), 360);
  knurl(cap.geometry, 72, 0.05, 15.62, 18.55);
  g.add(cap);
  await addPrint(g, p, 2.815, 2.0, 11.0, 130);
  g.userData.caustic = { strength: 1, color: [1, 0.6, 0.68] };
  return g;
}

async function serum(p) {
  const g = new THREE.Group();
  // rose glass with the serum inside
  filledBottle(g, [[0, 0], [1.85, 0, 0.4], [1.85, 7.2, 1.2], [0.75, 8.4, 0.15], [0.75, 8.9], [0, 8.9]], 6.1, {
    filled: { att: tint(0.88, 0.28, 0.42), dist: 0.75, thickness: 3.4, color: tint(1, 0.9, 0.92), ior: 1.47, reflColor: '#d97a90' },
    glass: { att: tint(0.92, 0.55, 0.64), dist: 1.2, thickness: 0.3, reflColor: '#eaa6b4' },
    wall: 0.2,
    surface: tint(0.86, 0.42, 0.52),
    meniscus: tint(0.98, 0.78, 0.82),
  });
  // the glass dropper inside, under the collar
  g.add(lathe(profilePoints([[0, 1.0], [0.1, 1.0], [0.27, 1.7, 0.1], [0.29, 2.1], [0.29, 9.2], [0, 9.2]]), MAT.inside(tint(0.96, 0.84, 0.86), 0.06, { clearcoat: 1, clearcoatRoughness: 0.03 }), 64));
  // brushed-gold collar with a slim bead at its base
  g.add(lathe(profilePoints([[0, 8.5], [1.04, 8.5, 0.1], [1.06, 8.68, 0.05], [1.02, 8.82, 0.05], [1.02, 9.9, 0.12], [0, 9.9]]), MAT.brushedGold(), 192));
  // the silicone bulb: a straight sleeve with a soft dome
  const dome = Array.from({ length: 12 }, (_, i) => {
    const a = ((i + 1) / 12) * (Math.PI / 2);
    return [0.88 * Math.cos(a), 11.5 + 0.95 * Math.sin(a)];
  });
  g.add(lathe(profilePoints([[0, 9.9], [0.8, 9.9, 0.1], [0.88, 10.3], [0.88, 11.5], ...dome], 12), MAT.silicone(), 128));
  await addPrint(g, p, 1.865, 1.0, 5.9, 140);
  g.userData.caustic = { strength: 1, color: [1, 0.45, 0.58] };
  return g;
}

async function moisturizer(p) {
  const g = new THREE.Group();
  // a thick frosted-glass jar
  g.add(
    lathe(
      profilePoints([[0, 0], [3.9, 0, 0.7], [4.0, 4.4, 0.3], [3.5, 4.6], [3.5, 5.0], [0, 5.0]]),
      MAT.frosted({ color: tint(1, 0.82, 0.86), att: tint(0.93, 0.42, 0.52), dist: 0.7, thickness: 1.9, roughness: 0.46, ior: 1.5, reflColor: '#e89aa6' }),
    ),
  );
  // the cream inside, soft through the frosting
  g.add(lathe(profilePoints([[0, 0.95], [3.25, 0.95, 0.3], [3.25, 4.0, 0.3], [0, 4.25]]), MAT.inside(tint(0.98, 0.9, 0.9), 0.5, { sheen: 0.4, sheenColor: tint(1, 1, 1) }), 96));
  // the lid, ribbed round its side
  const lid = lathe(profilePoints([[0, 4.55], [4.16, 4.55, 0.18], [4.16, 6.9, 0.55], [0, 6.9]]), MAT.whitePP(), 480);
  knurl(lid.geometry, 120, 0.04, 4.75, 6.4);
  g.add(lid);
  await addPrint(g, p, 4.015, 0.75, 3.95, 118);
  g.userData.caustic = { strength: 0.4, color: [1, 0.66, 0.72] };
  return g;
}

async function sunscreen(p) {
  const g = new THREE.Group();
  // the flip cap, with its hinge line
  g.add(lathe(profilePoints([[0, 0], [1.74, 0, 0.35], [1.74, 1.86, 0.04], [1.69, 1.92], [1.74, 1.98, 0.04], [1.74, 2.5, 0.25], [1.05, 2.85], [0, 2.85]]), MAT.whitePP(), 192));

  // the tube: a cylinder squeezed flat towards the crimped end
  const R = 1.85;
  const L = 13.2;
  const geo = new THREE.CylinderGeometry(R, R, L, 160, 90, true, Math.PI, Math.PI * 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getY(i) + L / 2) / L;
    const s = THREE.MathUtils.smoothstep(t, 0.38, 1.0);
    pos.setX(i, pos.getX(i) * (1 + 0.52 * s));
    pos.setZ(i, pos.getZ(i) * (1 - 0.93 * s));
  }
  geo.computeVertexNormals();

  // soft-touch pink with the print on it
  const logo = await loadImage(LOGO_SRC);
  const W = LABEL_W;
  const H = Math.round((W * L) / (2 * Math.PI * R));
  const tex = labelLayers(
    W,
    H,
    (Lr) => {
      const lw = W * 0.24;
      const lh = (lw * logo.height) / logo.width;
      const top = H * 0.46;
      drawFoil(Lr, logo, (W - lw) / 2, top, lw, lh);
      ink(Lr, (ctx) => {
        ctx.textAlign = 'center';
        ctx.font = `600 ${Math.round(W * 0.022)}px Montserrat`;
        spaced(ctx, p.name.toUpperCase(), W / 2, top + lh + W * 0.05, W * 0.005);
        ctx.font = `500 ${Math.round(W * 0.016)}px Montserrat`;
        spaced(ctx, `STEP 0${p.step}`, W / 2, top + lh + W * 0.082, W * 0.006);
      });
    },
    { color: TUBE_PINK, rough: '#a8a8a8' },
  );
  const tube = new THREE.Mesh(
    geo,
    new THREE.MeshPhysicalMaterial({
      map: tex.map,
      metalnessMap: tex.metal,
      metalness: 1,
      roughnessMap: tex.rough,
      roughness: 1,
      sheen: 0.6,
      sheenColor: tint(1, 0.86, 0.88),
      sheenRoughness: 0.55,
      // one-sided: its open ends are hidden by the cap and the crimp (and a
      // two-sided part that casts shadows renders dark in the studio)
      side: THREE.FrontSide,
    }),
  );
  tube.position.y = 2.75 + L / 2;
  g.add(tube);

  // the crimped end: fine ridges pressed into it
  const ridges = ridgesNormal(70);
  const crimp = new THREE.Mesh(
    new RoundedBoxGeometry(R * 2 * 1.52 + 0.1, 1.1, 0.34, 4, 0.12),
    new THREE.MeshPhysicalMaterial({ color: TUBE_PINK, roughness: 0.5, normalMap: ridges, normalScale: new THREE.Vector2(0.9, 0.9), sheen: 0.4, sheenColor: tint(1, 0.88, 0.9) }),
  );
  crimp.position.y = 2.75 + L - 0.35;
  g.add(crimp);
  return g;
}

export const PRODUCTS = [
  { id: 'cleanser', name: 'Gentle Cleanser', step: 1, build: cleanser, width: 6.2 },
  { id: 'toner', name: 'Balancing Toner', step: 2, build: toner, width: 5.8 },
  { id: 'serum', name: 'Glow Serum', step: 3, build: serum, width: 3.9 },
  { id: 'moisturizer', name: 'Barrier Moisturizer', step: 4, build: moisturizer, width: 8.4 },
  { id: 'sunscreen', name: 'Daily Sunscreen', step: 5, build: sunscreen, width: 5.7 },
];
