import { useId } from 'react';
import { MARK_PARTS, MARK_GRADIENTS, MARK_VIEWBOX, GOLD_STOPS } from '../lib/logoPaths';

// The gold Dewology mark as live SVG. Each shape is a <g data-part="...">
// so it can be animated or highlighted. Extra layers (masks, shine) can be
// passed in through `renderDefs` and `renderOverlay`.
export default function LogoMark({
  className,
  label = 'Dewology logo',
  viewBox = MARK_VIEWBOX,
  partProps = {},
  renderDefs,
  renderUnderlay,
  renderOverlay,
  decorative = false,
}) {
  const uid = useId().replace(/:/g, '');
  const gid = (part) => `${uid}-gold-${part}`;
  const a11y = decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': label };

  return (
    <svg className={className} viewBox={viewBox} overflow="visible" {...a11y}>
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
      {renderUnderlay?.(uid)}
      {['hair', 'face', 'drop'].map((part) => (
        <g key={part} data-part={part} {...(partProps[part] || {})}>
          <path d={MARK_PARTS[part]} fill={`url(#${gid(part)})`} />
        </g>
      ))}
      {renderOverlay?.(uid)}
    </svg>
  );
}
