import { MARK_PARTS, WORDMARK_LETTERS, WORDMARK_MARK_SCALE } from '../lib/logoPaths';
import './WordmarkBuild.css';

// The "logo builds itself" layers for <Wordmark>, shared by the hero intro
// and the closing frame: the drop falls into the "D", the face and hair
// pour in, EWOLOGY is written in, and one gold shine sweeps across.
//   id = a short name that keeps each copy's masks separate ('hero', 'end')

// Curves (Emil Kowalski): a gravity curve for the falling drop,
// ease-in-out for the pour, an even pace for the writing.
const EASE_OUT = [0.23, 1, 0.32, 1];
const EASE_IN_OUT = [0.77, 0, 0.175, 1];
const GRAVITY = [0.55, 0, 0.9, 0.45];
const WRITE = [0.45, 0, 0.25, 1];

// Props to spread onto <Wordmark>
export function buildLayers(id) {
  return {
    partProps: {
      drop: { className: 'wm-drop' },
      face: { mask: `url(#${id}-reveal-mask)` },
      hair: { mask: `url(#${id}-reveal-mask)` },
      letters: { mask: `url(#${id}-letters-mask)` },
    },
    renderDefs: () => (
      <>
        {/* Face and hair pour in from the top (mark space) */}
        <linearGradient id={`${id}-reveal-grad`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.85" stopColor="#fff" />
          <stop offset="1" stopColor="#000" />
        </linearGradient>
        <mask id={`${id}-reveal-mask`} maskUnits="userSpaceOnUse" x="-60" y="-60" width="475" height="852">
          <rect className="wm-reveal" x="-60" y="-1000" width="475" height="1000" fill={`url(#${id}-reveal-grad)`} />
        </mask>
        {/* EWOLOGY is written in from the left, with a soft edge */}
        <linearGradient id={`${id}-letters-grad`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.85" stopColor="#fff" />
          <stop offset="1" stopColor="#000" />
        </linearGradient>
        <mask id={`${id}-letters-mask`} maskUnits="userSpaceOnUse" x="180" y="190" width="780" height="150">
          <rect className="wm-letters-reveal" x="-820" y="190" width="1000" height="150" fill={`url(#${id}-letters-grad)`} />
        </mask>
        {/* The shine only lights the gold shapes */}
        <clipPath id={`${id}-shine-clip`}>
          {Object.values(MARK_PARTS).map((d) => (
            <path key={d.slice(0, 12)} d={d} transform={`scale(${WORDMARK_MARK_SCALE})`} />
          ))}
          <path d={WORDMARK_LETTERS} />
        </clipPath>
        <linearGradient id={`${id}-shine-grad`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#FFF8E7" stopOpacity="0" />
          <stop offset="0.5" stopColor="#FFF8E7" stopOpacity="0.92" />
          <stop offset="1" stopColor="#FFF8E7" stopOpacity="0" />
        </linearGradient>
      </>
    ),
    renderOverlay: () => (
      <g clipPath={`url(#${id}-shine-clip)`} aria-hidden="true">
        <g transform="rotate(20 468 199)">
          <rect className="wm-shine" x="-450" y="-500" width="180" height="1400" fill={`url(#${id}-shine-grad)`} />
        </g>
      </g>
    ),
  };
}

// Animation steps for Motion's useAnimate sequence, starting at `at` seconds.
//   q = finds an element inside the animated scope
// 0.00  a small gold drop falls from above
// 0.58  it lands, squashes, and swells into the dewdrop of the "D"
// 0.95  the face and hair pour in from the top down
// 1.30  EWOLOGY is written in from left to right
// 1.80  a single gold shine sweeps across the whole name
export function buildSteps(q, at = 0) {
  return [
    [q('.wm-drop'), { transform: ['translateY(-900px) scale(0.26, 0.14)', 'translateY(0px) scale(0.22, 0.2)'] }, { duration: 0.58, ease: GRAVITY, at }],
    [q('.wm-drop'), { transform: ['translateY(0px) scale(0.22, 0.2)', 'translateY(0px) scale(0.34, 0.12)', 'translateY(0px) scale(1, 1)'] }, { duration: 0.6, times: [0, 0.18, 1], ease: ['easeOut', EASE_OUT], at: at + 0.58 }],
    [q('.wm-reveal'), { transform: ['translateY(0px)', 'translateY(1000px)'] }, { duration: 0.7, ease: EASE_IN_OUT, at: at + 0.95 }],
    [q('.wm-letters-reveal'), { transform: ['translateX(0px)', 'translateX(1000px)'] }, { duration: 0.85, ease: WRITE, at: at + 1.3 }],
    [q('.wm-shine'), { transform: ['translateX(0px)', 'translateX(1500px)'] }, { duration: 1.0, ease: [0.4, 0, 0.2, 1], at: at + 1.8 }],
  ];
}

