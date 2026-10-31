// ─────────────────────────────────────────────────────────────
//  The live 3D Glow Serum in the hero.
//  Loaded on demand (three.js is a big library), so the rest of the
//  page never waits for it. The model is the same one the product
//  studio renders: public/assets/products/serum.glb (made with
//  studio.html → exportGLB()).
//
//  Motion, all gentle and always on while the hero is on screen:
//   - it spins into place once when it appears
//   - it floats up and down and slowly turns left and right
//   - with a mouse, it leans towards the pointer
//   - scrolling away turns it a little further
//   - small gold dew lights drift upwards around it
//   - it casts a soft contact shadow on a faint pool of gold light
//  The loop stops whenever the hero is off screen.
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const BASE_TURN = -0.28; // same three-quarter view as the product photos
const VIEW_HEIGHT = 16.5; // world units (cm) visible top to bottom
const FOV = 22;

// Small helpers
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const easeOutCubic = (t) => 1 - (1 - t) ** 3;
// Frame-rate independent smoothing towards a target (a soft spring feel)
const follow = (current, target, speed, dt) => current + (target - current) * (1 - Math.exp(-speed * dt));

// ── Gold dew lights ──────────────────────────────────────────
// Drawn by a tiny shader so their drift and twinkle cost nothing per frame.
function makeDew(count) {
  const positions = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const speed = new Float32Array(count);
  const phase = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const far = i % 4 === 0; // a few large, soft, out-of-focus ones
    positions[i * 3] = (Math.random() * 2 - 1) * 7.5;
    positions[i * 3 + 1] = Math.random() * 22;
    positions[i * 3 + 2] = far ? -6 - Math.random() * 6 : (Math.random() * 2 - 1) * 5;
    size[i] = far ? 1.6 + Math.random() * 1.4 : 0.35 + Math.random() * 0.45;
    speed[i] = 0.18 + Math.random() * 0.32;
    phase[i] = Math.random() * Math.PI * 2;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uScale: { value: 400 },
      uFade: { value: 0 },
      uColor: { value: new THREE.Color(0.97, 0.88, 0.68) },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uScale;
      attribute float aSize;
      attribute float aSpeed;
      attribute float aPhase;
      varying float vAlpha;
      void main() {
        vec3 p = position;
        float span = 22.0;
        float y = mod(p.y + uTime * aSpeed, span);
        p.y = y - 11.0;
        p.x += sin(uTime * 0.25 + aPhase) * 0.6;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * uScale / -mv.z;
        float k = y / span;
        float edges = smoothstep(0.0, 0.18, k) * (1.0 - smoothstep(0.7, 1.0, k));
        // fade out near the canvas border so no light pops at the box edge
        vec2 ndc = gl_Position.xy / gl_Position.w;
        edges *= (1.0 - smoothstep(0.72, 0.96, abs(ndc.x))) * (1.0 - smoothstep(0.72, 0.96, abs(ndc.y)));
        float twinkle = 0.55 + 0.45 * sin(uTime * (0.8 + aSpeed * 2.0) + aPhase * 5.0);
        vAlpha = edges * twinkle * (aSize > 1.0 ? 0.22 : 0.85);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uFade;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float a = pow(clamp(1.0 - d, 0.0, 1.0), 1.8);
        gl_FragColor = vec4(uColor, a * vAlpha * uFade);
      }
    `,
  });
  const points = new THREE.Points(geo, material);
  points.frustumCulled = false;
  return points;
}

// ── Floor ────────────────────────────────────────────────────
// The page is black, so a plain shadow would be invisible. Instead the
// bottle floats over a faint pool of gold light, with a dark contact
// shadow in the middle that softens and fades as the bottle rises.
function makeFloor(size) {
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    premultipliedAlpha: true,
    uniforms: {
      uGold: { value: new THREE.Color(0.91, 0.78, 0.53) },
      uPool: { value: 0.42 }, // strength of the light pool
      uCore: { value: 0 }, // strength of the contact shadow
      uSpread: { value: 0.24 }, // contact shadow radius (share of the floor)
      uFade: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec2 vNdc;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        vNdc = gl_Position.xy / gl_Position.w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uGold;
      uniform float uPool;
      uniform float uCore;
      uniform float uSpread;
      uniform float uFade;
      varying vec2 vUv;
      varying vec2 vNdc;
      void main() {
        float d = length(vUv - 0.5) * 2.0;
        float pool = pow(1.0 - smoothstep(0.0, 1.0, d), 1.7) * uPool;
        float core = (1.0 - smoothstep(0.0, uSpread, d)) * uCore;
        // fade out near the canvas border, like the dew lights
        float edge = (1.0 - smoothstep(0.78, 0.97, abs(vNdc.x))) * (1.0 - smoothstep(0.78, 0.97, abs(vNdc.y)));
        // dark contact shadow laid over the light pool (premultiplied alpha)
        vec4 c = vec4(uGold * pool * (1.0 - core), pool * (1.0 - core) + core);
        gl_FragColor = c * edge * uFade;
      }
    `,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(size, size), material);
  floor.rotation.x = -Math.PI / 2;
  floor.renderOrder = -1;
  return floor;
}

// ── Scene ────────────────────────────────────────────────────
export async function startHeroScene({ stage, model, onReady }) {
  const canvas = document.createElement('canvas');
  canvas.className = 'hero-product__canvas';
  canvas.setAttribute('aria-hidden', 'true');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  // Khronos "Neutral" tone mapping keeps the pink true (same as the studio)
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04);
  pmrem.dispose();
  scene.environment = env.texture;
  scene.environmentIntensity = 0.85;

  const key = new THREE.DirectionalLight(0xfff1e0, 2.2);
  key.position.set(-9, 30, 22);
  scene.add(key);
  // Warm gold rim from behind, so the bottle separates from the night background
  const rim = new THREE.DirectionalLight(0xffd9a0, 3.2);
  rim.position.set(18, 10, -20);
  scene.add(rim);
  const rimLeft = new THREE.DirectionalLight(0xe8c787, 1.4);
  rimLeft.position.set(-20, 4, -14);
  scene.add(rimLeft);
  scene.add(new THREE.HemisphereLight(0xfff4ec, 0x3a2418, 0.45));

  const camera = new THREE.PerspectiveCamera(FOV, 1, 1, 200);

  // The bottle, centred on a pivot so it turns around its middle
  const gltf = await new GLTFLoader().parseAsync(await model, '');
  const bottle = gltf.scene;
  const box = new THREE.Box3().setFromObject(bottle);
  bottle.position.sub(box.getCenter(new THREE.Vector3()));
  bottle.traverse((o) => {
    // The label sits a hair above the glass; the model file drops this setting
    if (o.isMesh && o.material.map && o.material.transparent) {
      o.material.polygonOffset = true;
      o.material.polygonOffsetFactor = -2;
      o.renderOrder = 1;
    }
  });
  const pivot = new THREE.Group();
  pivot.add(bottle);
  scene.add(pivot);

  // Floor just below the lowest point of the float (and the tilt)
  const size = box.getSize(new THREE.Vector3());
  const floor = makeFloor(size.x * 3.6);
  floor.position.y = -size.y / 2 - 0.65;
  scene.add(floor);

  const dew = makeDew(window.matchMedia('(max-width: 720px)').matches ? 26 : 44);
  scene.add(dew);

  // ── Size: fit the bottle's height to the box it lives in ──
  const resize = () => {
    const w = Math.max(1, stage.clientWidth);
    const h = Math.max(1, stage.clientHeight);
    const ratio = Math.min(window.devicePixelRatio || 1, 1.75);
    renderer.setPixelRatio(ratio);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Distance that shows VIEW_HEIGHT; step back further if the box is narrow
    const fitH = VIEW_HEIGHT / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const fitW = 9 / 2 / (Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * camera.aspect);
    camera.position.set(0, 1.2, Math.max(fitH, fitW));
    camera.lookAt(0, 0.2, 0);
    camera.updateProjectionMatrix();
    dew.material.uniforms.uScale.value = (h * ratio) / 2;
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(stage);

  // ── Pointer: lean towards it (mouse only) ──
  const pointer = { x: 0, y: 0 };
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const onMove = (e) => {
    const r = stage.getBoundingClientRect();
    pointer.x = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2)));
    pointer.y = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2)));
  };
  const onLeave = () => {
    pointer.x = 0;
    pointer.y = 0;
  };
  if (finePointer) {
    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
  }

  // ── Loop ──
  const now = { t: 0, last: 0 };
  const cur = { x: 0, y: 0, scroll: 0 };
  let raf = 0;
  let ready = false;
  let appeared = -1; // time the bottle appeared (for the one-time spin in)

  const frame = (ms) => {
    raf = requestAnimationFrame(frame);
    const dt = now.last ? Math.min(0.05, (ms - now.last) / 1000) : 0;
    now.last = ms;
    now.t += dt;
    const t = now.t;

    cur.x = follow(cur.x, pointer.x, 3.2, dt);
    cur.y = follow(cur.y, pointer.y, 3.2, dt);
    cur.scroll = follow(cur.scroll, clamp01(window.scrollY / window.innerHeight), 6, dt);

    if (appeared < 0) appeared = t;
    const intro = 1 - easeOutCubic(clamp01((t - appeared) / 1.8));

    pivot.rotation.y = BASE_TURN + Math.sin(t * 0.32) * 0.42 + cur.x * 0.38 + cur.scroll * 0.9 + intro * 1.6;
    pivot.rotation.x = 0.05 + cur.y * 0.14;
    pivot.rotation.z = -0.09 + Math.sin(t * 0.5) * 0.03 - cur.x * 0.05;
    pivot.position.y = Math.sin(t * 0.8) * 0.32 + cur.scroll * 1.6 - intro * 1.4;

    // Higher bottle → wider, fainter contact shadow
    const lift = Math.max(0, pivot.position.y + 0.32);
    const fl = floor.material.uniforms;
    fl.uCore.value = 0.9 * Math.max(0, 1 - lift * 0.45);
    fl.uSpread.value = 0.24 * (1 + lift * 0.35);
    fl.uFade.value = (1 - intro) ** 3;

    dew.material.uniforms.uTime.value = t;
    dew.material.uniforms.uFade.value = 1 - intro;
    renderer.render(scene, camera);
  };

  // Only animate while the hero is on screen
  let onScreen = true;
  const io = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    if (onScreen && !raf && ready) {
      now.last = 0;
      raf = requestAnimationFrame(frame);
    } else if (!onScreen && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  });
  io.observe(stage);

  // Compile shaders off the main thread where the browser allows it,
  // then add the canvas and start
  await renderer.compileAsync(scene, camera);
  stage.appendChild(canvas);
  ready = true;
  if (onScreen) raf = requestAnimationFrame(frame);
  onReady?.();

  return function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
    io.disconnect();
    ro.disconnect();
    window.removeEventListener('pointermove', onMove);
    document.documentElement.removeEventListener('pointerleave', onLeave);
    scene.traverse((o) => {
      if (!o.isMesh && !o.isPoints) return;
      o.geometry.dispose();
      for (const m of [].concat(o.material)) {
        for (const value of Object.values(m)) if (value?.isTexture) value.dispose();
        m.dispose();
      }
    });
    env.dispose();
    renderer.dispose();
    canvas.remove();
  };
}
