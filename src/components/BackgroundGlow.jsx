import { useEffect, useRef } from 'react';
import { motion, motionValue, useMotionValue } from 'motion/react';
import { hexToRgb, mixRgb, rgbString } from '../lib/color';
import './BackgroundGlow.css';

// Shared with the menu so its frosted background matches the page color.
export const pageRgb = motionValue([5, 4, 4]);

// Builds color "stops" from every <section data-bg>. Between two sections the
// color blends as the next one scrolls up. A section with data-via (the
// Business Concept) blends through extra colors: black → ember → bronze → blush.
function measureStops() {
  const sections = [...document.querySelectorAll('[data-bg]')];
  const vh = window.innerHeight;
  const stops = [];
  sections.forEach((el, i) => {
    const color = hexToRgb(el.dataset.bg);
    const top = el.getBoundingClientRect().top + window.scrollY;
    if (i === 0) {
      stops.push({ y: 0, c: color });
      return;
    }
    const prev = stops[stops.length - 1];
    const via = el.dataset.via ? el.dataset.via.split(',').map(hexToRgb) : [];
    const colors = [prev.c, ...via, color];
    let start;
    let end;
    let positions;
    if (via.length) {
      // The warm-up is tied to the section's top padding (its "runway"):
      // bronze arrives only after the hero text has left, and blush lands
      // just as the first line of the section reaches the lower third.
      const runway = parseFloat(getComputedStyle(el).paddingTop) || 0;
      start = Math.max(prev.y + 1, top - 0.45 * vh);
      end = Math.max(start + 0.3 * vh, top + runway - 0.7 * vh);
      positions = via.length === 2 ? [0, 0.5, 0.8, 1] : colors.map((_, k) => k / (colors.length - 1));
    } else {
      start = Math.max(prev.y + 1, top - 0.7 * vh);
      end = Math.max(start + 1, top - 0.2 * vh);
      positions = [0, 1];
    }
    // A short last section (the footer) must still finish its colour change
    // before the page runs out of scroll.
    const maxScroll = document.documentElement.scrollHeight - vh;
    if (end > maxScroll) {
      end = Math.max(prev.y + 2, maxScroll);
      start = Math.min(start, end - 1);
    }
    colors.forEach((c, k) => stops.push({ y: start + (end - start) * positions[k], c }));
  });
  return stops;
}

// Which two colours we are between, and how far (t = 0..1).
function segmentAt(stops, y) {
  if (!stops.length) return { a: [5, 4, 4], b: [5, 4, 4], t: 0 };
  if (y <= stops[0].y) return { a: stops[0].c, b: stops[0].c, t: 0 };
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1];
    const b = stops[i];
    if (y <= b.y) return { a: a.c, b: b.c, t: (y - a.y) / (b.y - a.y) };
  }
  const last = stops[stops.length - 1].c;
  return { a: last, b: last, t: 0 };
}

export default function BackgroundGlow() {
  const stopsRef = useRef([]);

  // Tint the phone's browser bar to the current page colour (a few times a second)
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return undefined;
    let timer = null;
    let latest = pageRgb.get();
    const apply = () => {
      timer = null;
      meta.setAttribute('content', rgbString(latest));
    };
    return pageRgb.on('change', (rgb) => {
      latest = rgb;
      if (!timer) timer = setTimeout(apply, 150);
    });
  }, []);

  // Performance: two solid layers. Only the top layer's opacity changes while
  // scrolling (GPU-composited); the colours themselves change only when a new
  // pair of sections takes over, so the screen is not repainted every frame.
  const baseColor = useMotionValue('rgb(5, 4, 4)');
  const topColor = useMotionValue('rgb(5, 4, 4)');
  const topOpacity = useMotionValue(0);

  // Read the real scroll position once per frame (works the same with
  // smooth scrolling, the scrollbar, keys, and instant jumps).
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const s = segmentAt(stopsRef.current, window.scrollY);
      baseColor.set(rgbString(s.a)); // same string = no style write
      topColor.set(rgbString(s.b));
      topOpacity.set(s.t);
      pageRgb.set(mixRgb(s.a, s.b, s.t));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const measure = () => {
      stopsRef.current = measureStops();
      update();
    };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    document.fonts?.ready.then(measure);
    return () => {
      window.removeEventListener('scroll', onScroll);
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [baseColor, topColor, topOpacity]);

  return (
    <div className="bg-glow" aria-hidden="true">
      <motion.div className="bg-glow__layer" style={{ backgroundColor: baseColor }} />
      <motion.div className="bg-glow__layer" style={{ backgroundColor: topColor, opacity: topOpacity }} />
    </div>
  );
}
