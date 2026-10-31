import { useEffect, useRef, useState } from 'react';
import './Swatches.css';

// Palette swatches. Click one to copy its hex code.
//  swatches: [{ name, hex, gradientFrom? }]
export default function Swatches({ swatches, className = '' }) {
  const [copied, setCopied] = useState(null);
  const timer = useRef();

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async (s) => {
    const text = s.gradientFrom ? `${s.gradientFrom} → ${s.hex}` : s.hex;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* clipboard blocked (e.g. no https): still show the code */
    }
    setCopied(s.hex);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(null), 1400);
  };

  return (
    <ul className={`swatches ${className}`}>
      {swatches.map((s) => {
        const fill = s.gradientFrom ? `linear-gradient(135deg, ${s.gradientFrom}, ${s.hex})` : s.hex;
        const isCopied = copied === s.hex;
        return (
          <li key={s.name}>
            <button type="button" className="swatch" data-copied={isCopied} onClick={() => copy(s)}>
              <span className="swatch__chip" style={{ background: fill }} />
              <span className="swatch__name">{s.name}</span>
              <span className="swatch__hex">
                {s.gradientFrom ? `${s.gradientFrom} → ${s.hex}` : s.hex}
              </span>
              <span className="swatch__hint" aria-live="polite">
                {isCopied ? 'Copied' : 'Click to copy'}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
