import { motion, useReducedMotion, useScroll, useSpring, useTransform, useVelocity } from 'motion/react';
import './ProgressDrop.css';

// How the drop reacts to the page moving: it stretches with the speed of
// the scroll (most on a → press), and a loose spring lets it overshoot
// into a small squash when the page stops, so each → lands like a drip.
const STRETCH_PER_SPEED = 1 / 6000; // px per second → extra height
const MAX_STRETCH = 0.38;
const DRIP = { stiffness: 420, damping: 11, mass: 0.6 };

// The gold dewdrop on the left edge: it slides down as you scroll the page.
export default function ProgressDrop() {
  const reduce = useReducedMotion();
  const { scrollY, scrollYProgress } = useScroll();
  const transform = useTransform(
    scrollYProgress,
    (p) => `translateY(calc(${p.toFixed(4)} * (var(--rail-height) - 24px)))`,
  );

  const speed = useVelocity(scrollY);
  const stretch = useSpring(
    useTransform(speed, (v) => Math.min(MAX_STRETCH, Math.abs(v) * STRETCH_PER_SPEED)),
    DRIP,
  );
  const scaleY = useTransform(stretch, (s) => 1 + s);
  const scaleX = useTransform(stretch, (s) => 1 - s * 0.4);

  return (
    <div className="progress-drop" aria-hidden="true">
      <div className="progress-drop__rail" />
      <motion.div className="progress-drop__drop" style={{ transform }}>
        <motion.svg viewBox="0 0 16 24" style={reduce ? undefined : { scaleX, scaleY }}>
          <defs>
            <linearGradient id="progress-drop-gold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#F3DFAE" />
              <stop offset="1" stopColor="#B8894A" />
            </linearGradient>
          </defs>
          <path d="M8 0C8 0 0 11 0 16a8 8 0 0 0 16 0C16 11 8 0 8 0Z" fill="url(#progress-drop-gold)" />
        </motion.svg>
      </motion.div>
    </div>
  );
}
