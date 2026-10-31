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
  const [active, setActive] = useState({ id: 'home', theme: 'dark' });

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
      const top = Math.round(el.getBoundingClientRect().top + window.scrollY);
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
            setActive({ id: el.dataset.nav || el.id, theme: el.dataset.theme || 'dark', bg: el.dataset.bg });
          }
        });
      },
      { rootMargin: '-48% 0px -48% 0px' },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  // The page scrollbar takes the current section's colour (thin, bronze
  // thumb), so a plain grey bar never shows at the edge of the TV
  useEffect(() => {
    if (active.bg) document.documentElement.style.setProperty('--page-bg', active.bg);
  }, [active.bg]);

  usePresentationKeys(scrollTo);

  return (
    <SiteContext.Provider value={{ scrollTo, active, reduceMotion }}>{children}</SiteContext.Provider>
  );
}

// Close match to cubic-bezier(0.23, 1, 0.32, 1), the site's strong ease-out
function easeOutStrong(t) {
  return 1 - Math.pow(1 - t, 5);
}

// Presentation keys: → / Page Down = next stop, ← / Page Up = previous stop.
// "Stops" are any element with a data-stop attribute, in page order.
function usePresentationKeys(scrollTo) {
  const last = useRef(null); // the stop we last sent the page to, and when
  useEffect(() => {
    function onKey(e) {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const t = e.target;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;

      const forward = e.key === 'ArrowRight' || e.key === 'PageDown';
      const back = e.key === 'ArrowLeft' || e.key === 'PageUp';
      if (!forward && !back) return;

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
