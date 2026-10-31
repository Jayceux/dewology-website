import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';
import './GoldGlow.css';

const SIZE = 720;

// A soft gold light. It rests behind `anchorRef` (the logo) and, on devices
// with a mouse, drifts after the pointer with a spring so it feels alive.
//   follow = false keeps it fixed behind the anchor (the hero: the light
//   stays on the bottle, which already leans towards the mouse)
export default function GoldGlow({ anchorRef, className = '', follow = true }) {
  const ref = useRef(null);
  const reduceMotion = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const spring = { stiffness: 70, damping: 20, mass: 0.9 };
  const sx = useSpring(x, spring);
  const sy = useSpring(y, spring);
  const transform = useTransform([sx, sy], ([a, b]) => `translate3d(${a - SIZE / 2}px, ${b - SIZE / 2}px, 0)`);

  useEffect(() => {
    const glow = ref.current;
    const section = glow?.parentElement;
    const anchor = anchorRef?.current;
    if (!section) return undefined;

    const rest = () => {
      const s = section.getBoundingClientRect();
      if (!anchor) return { x: s.width * 0.75, y: s.height * 0.5 };
      const a = anchor.getBoundingClientRect();
      return { x: a.left - s.left + a.width / 2, y: a.top - s.top + a.height * 0.42 };
    };

    const goRest = (instant) => {
      const r = rest();
      x.set(r.x);
      y.set(r.y);
      if (instant) {
        sx.jump(r.x);
        sy.jump(r.y);
      }
    };
    goRest(true);

    const ro = new ResizeObserver(() => goRest(true));
    ro.observe(section);

    const canFollow = follow && window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reduceMotion;
    const onMove = (e) => {
      const s = section.getBoundingClientRect();
      x.set(e.clientX - s.left);
      y.set(e.clientY - s.top);
    };
    const onLeave = () => goRest(false);
    if (canFollow) {
      section.addEventListener('pointermove', onMove);
      section.addEventListener('pointerleave', onLeave);
    }
    return () => {
      ro.disconnect();
      section.removeEventListener('pointermove', onMove);
      section.removeEventListener('pointerleave', onLeave);
    };
  }, [anchorRef, follow, reduceMotion, x, y, sx, sy]);

  return <motion.div ref={ref} className={`gold-glow ${className}`} aria-hidden="true" style={{ transform }} />;
}
