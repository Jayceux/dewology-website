import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import Lenis from 'lenis';

const SiteContext = createContext(null);

export function useSite() {
  return useContext(SiteContext);
}

// Smooth scrolling only for mouse wheels on desktop, and never when
// the visitor has asked their device for reduced motion.
function shouldSmoothScroll(reduceMotion) {
  if (reduceMotion) return false;
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

export function SiteProvider({ children }) {
  const reduceMotion = useReducedMotion();
  const lenisRef = useRef(null);
  const [active, setActive] = useState({ id: 'home' });

  // Lenis smooth scrolling
  useEffect(() => {
    if (!shouldSmoothScroll(reduceMotion)) return undefined;
    const lenis = new Lenis({ autoRaf: true, lerp: 0.12, anchors: false });
    lenisRef.current = lenis;
    return () => {
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [reduceMotion]);

  // Scroll to an element (or selector). Quick, so the presenter never waits.
  const scrollTo = useCallback(
    (target) => {
      const el = typeof target === 'string' ? document.querySelector(target) : target;
      if (!el) return;
      // Absolute page position from the real scroll offset, so it stays
      // correct even after scrollbar drags or other native scrolling.
      // on phones, stop below the fixed menu (scroll-margin-top in global.css)
      const margin = window.matchMedia('(max-width: 900px)').matches ? parseFloat(getComputedStyle(el).scrollMarginTop) || 0 : 0;
      const top = Math.round(el.getBoundingClientRect().top + window.scrollY - margin);
      if (lenisRef.current) {
        // Short and strong ease-out: keyboard-driven, so it must feel immediate,
        // but the audience still sees where the page went.
        lenisRef.current.scrollTo(top, { duration: 0.55, easing: easeOutStrong, force: true });
      } else {
        window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
      }
    },
    [reduceMotion],
  );

  // Which section is in the middle of the screen (drives the menu colors)
  useEffect(() => {
    const sections = [...document.querySelectorAll('[data-section]')];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target;
            setActive({ id: el.dataset.nav || el.id });
          }
        });
      },
      { rootMargin: '-48% 0px -48% 0px' },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  usePresentationKeys(scrollTo);
  useWheelSettle(scrollTo);

  return (
    <SiteContext.Provider value={{ scrollTo, active, reduceMotion }}>{children}</SiteContext.Provider>
  );
}

// Close match to cubic-bezier(0.23, 1, 0.32, 1), the site's strong ease-out
function easeOutStrong(t) {
  return 1 - Math.pow(1 - t, 5);
}

// Presentation keys: → / ↓ / Page Down = next stop, ← / ↑ / Page Up = previous stop.
// "Stops" are any element with a data-stop attribute, in page order.
function usePresentationKeys(scrollTo) {
  const last = useRef(null); // the stop we last sent the page to, and when
  useEffect(() => {
    function onKey(e) {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const t = e.target;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;

      const forward = e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown';
      const back = e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp';
      if (!forward && !back) return;

      // The page moves on, so a link or button clicked earlier lets go of
      // focus: otherwise the browser's focus box stays drawn around it
      // (e.g. on "Concept" in the menu) after the presenter has moved on
      const held = document.activeElement;
      if (held && held !== document.body && held.matches('a, button')) held.blur();

      const stops = [...document.querySelectorAll('[data-stop]')];
      let index;
      // A quick second press while the page is still moving counts on from
      // where it is heading, so fast presses are never swallowed
      const heading = last.current && performance.now() - last.current.at < 650 ? stops.indexOf(last.current.el) : -1;
      if (heading >= 0) {
        index = forward ? heading + 1 : heading - 1;
      } else {
        const tops = stops.map((s) => s.getBoundingClientRect().top);
        const tolerance = 8;
        if (forward) {
          index = tops.findIndex((top) => top > tolerance);
        } else {
          index = -1;
          tops.forEach((top, i) => {
            if (top < -tolerance) index = i;
          });
        }
      }
      if (index < 0 || index >= stops.length) return;
      e.preventDefault();
      last.current = { el: stops[index], at: performance.now() };
      scrollTo(stops[index]);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [scrollTo]);
}

// The presenter also scrolls with the mouse. When a wheel or touchpad scroll
// comes to rest between two stops (most often inside the pinned sections:
// the steps, the logo process, Gestalt), the page eases on to the nearest
// stop, so a frame is never left half-slid. Keys and scrollbar drags are left
// alone, and phones scroll freely.
function useWheelSettle(scrollTo) {
  useEffect(() => {
    const wide = window.matchMedia('(min-width: 901px)');
    let wheeled = false;
    let idle = 0;
    const settle = () => {
      if (!wheeled || !wide.matches) return;
      wheeled = false;
      let best = null;
      document.querySelectorAll('[data-stop]').forEach((el) => {
        const d = Math.abs(el.getBoundingClientRect().top);
        if (!best || d < best.d) best = { el, d };
      });
      // already resting on a stop: nothing to do
      if (best && best.d > 3) scrollTo(best.el);
    };
    const onWheel = () => {
      wheeled = true;
      clearTimeout(idle);
      idle = setTimeout(settle, 200);
    };
    // smooth scrolling keeps the page moving after the last wheel tick:
    // wait until it has come to rest
    const onScroll = () => {
      if (!wheeled) return;
      clearTimeout(idle);
      idle = setTimeout(settle, 200);
    };
    // a key press takes over (the presentation keys move the page themselves)
    const onKey = () => {
      wheeled = false;
      clearTimeout(idle);
    };
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(idle);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('keydown', onKey);
    };
  }, [scrollTo]);
}
