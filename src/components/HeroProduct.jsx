import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { hero } from '../content';
import './HeroProduct.css';

const MODEL_URL = '/assets/products/serum.glb';
const PHOTO_SRC = '/assets/products/serum.webp';

// Start downloading the model as early as possible (network only, no work
// on the page), so it is usually ready by the time the intro ends.
let modelRequest = null;
function requestModel() {
  modelRequest ??= fetch(MODEL_URL).then((r) => {
    if (!r.ok) throw new Error(`model ${r.status}`);
    return r.arrayBuffer();
  });
  return modelRequest;
}

let webgl = null;
function hasWebGL() {
  if (webgl === null) {
    try {
      const c = document.createElement('canvas');
      webgl = Boolean(c.getContext('webgl2') || c.getContext('webgl'));
    } catch {
      webgl = false;
    }
  }
  return webgl;
}

// The Glow Serum in the hero: live 3D when the device can, otherwise
// (reduced motion, no WebGL, or a failed load) the studio photo.
//   start = false while the intro plays, so 3D never stutters the intro
export default function HeroProduct({ start = true }) {
  const stageRef = useRef(null);
  const reduceMotion = useReducedMotion();
  const [mode, setMode] = useState('waiting'); // waiting | live | photo
  const canLive = !reduceMotion && typeof window !== 'undefined' && hasWebGL();

  useEffect(() => {
    if (canLive) requestModel().catch(() => {});
  }, [canLive]);

  useEffect(() => {
    if (!canLive) {
      setMode('photo');
      return undefined;
    }
    if (!start) return undefined;

    let cancelled = false;
    let stop = null;
    // Slow connection: show the photo meanwhile; 3D still takes over when ready
    const slow = setTimeout(() => setMode((m) => (m === 'waiting' ? 'photo' : m)), 5000);

    import('../lib/heroScene.js')
      .then(({ startHeroScene }) =>
        startHeroScene({
          stage: stageRef.current,
          model: requestModel(),
          onReady: () => !cancelled && setMode('live'),
        }),
      )
      .then((fn) => {
        if (cancelled) fn();
        else stop = fn;
      })
      .catch((err) => {
        console.warn('Hero 3D unavailable, showing the photo instead.', err);
        if (!cancelled) setMode('photo');
      });

    return () => {
      cancelled = true;
      clearTimeout(slow);
      stop?.();
    };
  }, [canLive, start]);

  return (
    <div className="hero-product" data-mode={mode}>
      <img className="hero-product__photo" src={PHOTO_SRC} alt={mode === 'live' ? '' : hero.productAlt} width="1000" height="1250" />
      <div className="hero-product__stage" ref={stageRef} role={mode === 'live' ? 'img' : undefined} aria-label={mode === 'live' ? hero.productAlt : undefined} />
    </div>
  );
}
