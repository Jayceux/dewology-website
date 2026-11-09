// ─────────────────────────────────────────────────────────────
//  The product-photography light the bottles reflect: a warm blush
//  room with one big soft box up front left, two tall strip lights
//  behind the product (the long bright edges that make glass and
//  gloss read as real), a thin strip in front right, a top light and
//  a pink bounce from the floor. Turned into an environment map with
//  PMREMGenerator.fromScene(studioEnvironment(), 0.02).
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three';

function panel(w, h, intensity, color = 0xffffff) {
  const m = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false });
  m.color.set(color).multiplyScalar(intensity);
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
}

export function studioEnvironment() {
  const scene = new THREE.Scene();

  // the room: brighter above, blush at the horizon, deeper pink below
  const room = new THREE.SphereGeometry(30, 64, 32);
  const pos = room.attributes.position;
  const colors = [];
  const top = new THREE.Color(1.0, 0.96, 0.94).multiplyScalar(0.95);
  const mid = new THREE.Color(0.96, 0.8, 0.82).multiplyScalar(0.55);
  const low = new THREE.Color(0.86, 0.56, 0.62).multiplyScalar(0.32);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const t = pos.getY(i) / 30; // -1 … 1
    if (t > 0) c.copy(mid).lerp(top, Math.pow(t, 0.8));
    else c.copy(mid).lerp(low, Math.pow(-t, 0.7));
    colors.push(c.r, c.g, c.b);
  }
  room.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  scene.add(new THREE.Mesh(room, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, toneMapped: false })));

  const place = (mesh, x, y, z) => {
    mesh.position.set(x, y, z);
    mesh.lookAt(0, 0, 0);
    scene.add(mesh);
  };
  // Glass and gloss reflect only about 4% of the light head on, so the
  // strips are very bright (as in a real product shoot) but narrow: crisp
  // highlights without flooding everything with light.
  // key: a big soft box up front, high on the left (most of the soft light)
  place(panel(12, 12, 3.0, 0xfff3ea), -14, 12, 13);
  // two strips in front, left and right: the long highlights down the front
  place(panel(1.5, 20, 22, 0xfff8f4), -10, 3, 14);
  place(panel(1.1, 18, 13), 11, 3, 13);
  // two tall strips behind: the bright edges that outline glass
  place(panel(2.0, 24, 24, 0xfff7f2), -16, 2, -5);
  place(panel(2.0, 24, 20, 0xfff7f2), 16, 2, -5);
  // a top light: highlights along caps, collars and shoulders
  place(panel(14, 8, 4.0, 0xfffaf6), 0, 20, 2);
  // two deep-rose flags at the sides (no black in the brand): the dark
  // bands down the sides of glass and gloss that give them their shape
  place(panel(7, 26, 0.05, 0x5a1a28), -18, 1, 6);
  place(panel(9, 26, 0.04, 0x5a1a28), 17, 1, 8);
  // the floor bounces a little pink back up
  const floor = panel(40, 40, 0.42, 0xf2a6b2);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -12;
  scene.add(floor);
  return scene;
}
