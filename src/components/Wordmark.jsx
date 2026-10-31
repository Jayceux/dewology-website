import { useId } from 'react';
import {
  MARK_PARTS,
  MARK_GRADIENTS,
  GOLD_STOPS,
  WORDMARK_VIEWBOX,
  WORDMARK_MARK_SCALE,
  WORDMARK_LETTERS,
} from '../lib/logoPaths';

// The Dewology secondary logo as live SVG: the gold mark is the "D",
// followed by EWOLOGY. Each shape is a <g data-part="..."> so the hero
// intro can animate it. Extra layers (masks, shine) come in through
// `renderDefs` and `renderOverlay` (drawn in the 936 × 398 logo space).
//   label = null hides the logo from screen readers (when the name is
//   already written out as text next to it)
export default function Wordmark({ className, label = 'Dewology', partProps = {}, renderDefs, renderOverlay }) {
  const uid = useId().replace(/:/g, '');
  const gid = (part) => `${uid}-gold-${part}`;
  const a11y = label === null ? { 'aria-hidden': 'true' } : { role: 'img', 'aria-label': label };

  return (
    <svg className={className} viewBox={WORDMARK_VIEWBOX} overflow="visible" {...a11y}>
      <defs>
        {Object.entries(MARK_GRADIENTS).map(([part, g]) => (
          <linearGradient key={part} id={gid(part)} gradientUnits="userSpaceOnUse" {...g}>
            {GOLD_STOPS.map((s) => (
              <stop key={s.offset} offset={s.offset} stopColor={s.color} stopOpacity={0.9} />
            ))}
          </linearGradient>
        ))}
        {renderDefs?.(uid)}
      </defs>
      <g transform={`scale(${WORDMARK_MARK_SCALE})`}>
        {['hair', 'face', 'drop'].map((part) => (
          <g key={part} data-part={part} {...(partProps[part] || {})}>
            <path d={MARK_PARTS[part]} fill={`url(#${gid(part)})`} />
          </g>
        ))}
      </g>
      <g data-part="letters" {...(partProps.letters || {})}>
        <path d={WORDMARK_LETTERS} fill="#E8C787" />
      </g>
      {renderOverlay?.(uid)}
    </svg>
  );
}
