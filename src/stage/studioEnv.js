// ─────────────────────────────────────────────────────────────
//  The product-photography light the bottles reflect, as in a real
//  shoot: a warm blush room, one big softbox up front left (the broad
//  soft highlight down the left of each bottle), a soft strip behind on
//  the right (a gentle bright edge), a large soft top light (shoulders,
//  caps) and a faint fill. Softboxes are brightest in the middle and fall
//  off towards their edges and ends, so their reflections are soft
//  gradient bands, never hard lines. Turned into an environment map with
//  PMREMGenerator.fromScene(studioEnvironment(), 0.02).
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three';

// a softbox's glow: a soft bell across its width, easing off at both ends
let softTexture = null;
function softbox() {
  if (softTexture) return softTexture;
  const W = 128;
  const H = 256;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(W, H);
  const smooth = (a, b, t) => {
    const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
    return x * x * (3 - 2 * x);
  };
  for (let y = 0; y < H; y++) {
    const v = y / (H - 1);
    const ends = smooth(0, 0.18, v) * smooth(1, 0.82, v);
    for (let x = 0; x < W; x++) {
      const u = x / (W - 1) - 0.5;
      const across = Math.exp(-Math.pow(u / 0.26, 2) * 1.6); // diffusion fabric: hot centre, soft edges
      const g = Math.round(255 * across * ends);
      const o = (y * W + x) * 4;
      img.data[o] = img.data[o + 1] = img.data[o + 2] = g;
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  softTexture = new THREE.CanvasTexture(c); // linear: the values are light, not colour
  return softTexture;
}

function panel(w, h, intensity, color = 0xffffff) {
  const m = new THREE.MeshBasicMaterial({ map: softbox(), side: THREE.DoubleSide, toneMapped: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  m.color.set(color).multiplyScalar(intensity);
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
}

export function studioEnvironment() {
  const scene = new THREE.Scene();

  // the room: brighter above, blush at the horizon, deeper pink below,
  // and darker towards the sides, as a studio falls off away from its lights
  const room = new THREE.SphereGeometry(30, 96, 48);
  const pos = room.attributes.position;
  const colors = [];
  const top = new THREE.Color(1.0, 0.96, 0.94).multiplyScalar(0.55);
  const mid = new THREE.Color(0.96, 0.8, 0.82).multiplyScalar(0.36);
  const low = new THREE.Color(0.8, 0.5, 0.56).multiplyScalar(0.2);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const t = pos.getY(i) / 30; // -1 … 1
    if (t > 0) c.copy(mid).lerp(top, Math.pow(t, 0.8));
    else c.copy(mid).lerp(low, Math.pow(-t, 0.7));
    // the sides, beyond the lights, sit deeper
    const side = Math.abs(pos.getX(i)) / 30;
    c.multiplyScalar(1 - 0.35 * Math.pow(side, 2));
    colors.push(c.r, c.g, c.b);
  }
  room.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  scene.add(new THREE.Mesh(room, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, toneMapped: false })));

  const place = (mesh, x, y, z) => {
    mesh.position.set(x, y, z);
    mesh.lookAt(0, 0, 0);
    scene.add(mesh);
  };
  // key: a very large softbox close up front on the left. On a round
  // bottle a reflection is squeezed sideways, so only a source this wide
  // gives the broad, soft highlight of a product photograph
  place(panel(30, 26, 16, 0xfff4ec), -14, 4, 12);
  // a soft strip behind on the right: the gentle bright edge
  place(panel(7, 26, 9, 0xfff7f2), 15, 2, -7);
  // a large soft top light: shoulders, collars and caps
  place(panel(16, 12, 3.5, 0xfffaf6), 0, 20, 3);
  // a faint broad fill on the right, so that side never goes muddy
  place(panel(14, 18, 0.9, 0xfff2ee), 13, 0, 12);
  return scene;
}
