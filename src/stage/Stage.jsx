import { useEffect, useRef } from 'react';
import { STOP_STAGE, MODELS } from './stops';
import './Stage.css';

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

// The stop the page is showing: the last one whose top has passed the
// upper part of the screen (works for full frames and for the invisible
// markers inside the pinned sections).
function currentStop() {
  const stops = [...document.querySelectorAll('[data-stop]')];
  const line = window.innerHeight * 0.38;
  let index = 0;
  stops.forEach((el, i) => {
    if (el.getBoundingClientRect().top <= line) index = i;
  });
  return { el: stops[index], index, total: stops.length };
}

// The paper, the paint, the falling dewdrop and the 3D products, behind
// the whole page (see engine.js). Without WebGL the page keeps its plain
// paper colour and the product photos.
// Decided before the page first paints, so the product photos never flash
// for a frame before the live 3D models take their place (Stage keeps the
// attribute in step afterwards, and drops it if the stage cannot load)
if (typeof window !== 'undefined' && hasWebGL()) {
  const wide = window.matchMedia('(min-width: 901px)').matches;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (wide && !still) document.documentElement.dataset.stage3d = 'on';
}

export default function Stage() {
  const ref = useRef(null);

  useEffect(() => {
    if (!hasWebGL()) return undefined;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const wide = window.matchMedia('(min-width: 901px)').matches;
    const products3d = wide && !reduce;
    let stage = null;
    let cancelled = false;
    let lastId = null;
    let raf = 0;

    // A chapter's words wait for the drop and are revealed where it lands.
    // They can never stay hidden: moving on, or 2.6 s passing, shows them
    // anyway.
    let waiting = null;
    let waitTimer = 0;
    const showHeadline = () => {
      clearTimeout(waitTimer);
      if (waiting) waiting.dataset.reveal = 'in';
      waiting = null;
    };
    // the drop has landed: the words are revealed outward from where it hit
    // (--drop-x / --drop-y, in the waiting element's own box)
    const landed = (spec) => {
      const hit = spec?.land && document.querySelector(spec.land.anchor);
      if (waiting && hit) {
        const a = hit.getBoundingClientRect();
        const w = waiting.getBoundingClientRect();
        waiting.style.setProperty('--drop-x', `${a.left + a.width * spec.land.at[0] - w.left}px`);
        waiting.style.setProperty('--drop-y', `${a.top + a.height * spec.land.at[1] - w.top}px`);
      }
      showHeadline();
    };
    const holdHeadline = (spec) => {
      showHeadline();
      if (reduce || !spec?.drop || !spec.reveal) return;
      const el = document.querySelector(spec.reveal);
      if (!el || el.dataset.reveal === 'in') return; // each headline waits only once
      el.dataset.reveal = 'wait';
      waiting = el;
      waitTimer = setTimeout(showHeadline, 2600);
    };

    const check = () => {
      raf = 0;
      if (!stage || document.documentElement.dataset.intro === 'play') return;
      const { el, index, total } = currentStop();
      if (!el || el.id === lastId) return;
      lastId = el.id;
      holdHeadline(STOP_STAGE[el.id]);
      stage.activate(STOP_STAGE[el.id] || null, el, index, total);
      document.documentElement.dataset.activeStop = el.id;
    };
    const queue = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };

    // the 3D products replace the photos from the very start (so the photo
    // never shows before the dewdrop brings the live serum); if the stage
    // cannot load, the photos come back
    if (products3d) document.documentElement.dataset.stage3d = 'on';
    import('./engine.js').then(({ createStage }) => {
      if (cancelled) return;
      stage = createStage(ref.current, {
        reduce,
        products3d,
        models: products3d ? MODELS : {},
        onLand: landed,
      });
      document.documentElement.dataset.stage = 'on';
      queue();
    }).catch(() => {
      delete document.documentElement.dataset.stage3d;
    });

    // start once the opening animation has finished
    const intro = new MutationObserver(queue);
    intro.observe(document.documentElement, { attributes: true, attributeFilter: ['data-intro'] });
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      showHeadline();
      intro.disconnect();
      window.removeEventListener('scroll', queue);
      window.removeEventListener('resize', queue);
      stage?.dispose();
      delete document.documentElement.dataset.stage3d;
      delete document.documentElement.dataset.stage;
    };
  }, []);

  return <div className="paint-stage" ref={ref} aria-hidden="true" />;
}
