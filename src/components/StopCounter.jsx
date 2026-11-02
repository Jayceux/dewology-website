import { useEffect, useState } from 'react';
import './StopCounter.css';

// Every presentation stop has an address in the corner: "07 / 30" and the
// requirement it answers ("CT#1 · Logo design", "Business concept · Sample
// products"), like a slide footer, so the presenter always knows where they
// are and the class always knows what is being shown. The words come from
// the stop's own data-label, or else its section's label (content.js).
const where = (el) => {
  const section = el?.closest('[data-section]');
  if (!section || section.id === 'home' || section.id === 'footer') return [];
  const label = el.dataset.label || section.getAttribute('aria-label') || '';
  const m = /^(CT#\d+)\s*(.*)$/.exec(label) || /^([^:]+):\s*(.+)$/.exec(label);
  return m ? [m[1], m[2]] : label ? [label] : [];
};

export default function StopCounter() {
  const [state, setState] = useState({ n: 1, total: 1, parts: [] });

  useEffect(() => {
    let raf = 0;
    const check = () => {
      raf = 0;
      const stops = [...document.querySelectorAll('[data-stop]')];
      const line = window.innerHeight * 0.38;
      let index = 0;
      stops.forEach((el, i) => {
        if (el.getBoundingClientRect().top <= line) index = i;
      });
      const parts = where(stops[index]);
      setState((s) =>
        s.n === index + 1 && s.total === stops.length && s.parts.join('|') === parts.join('|')
          ? s
          : { n: index + 1, total: stops.length, parts },
      );
    };
    const queue = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    queue();
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', queue);
      window.removeEventListener('resize', queue);
    };
  }, []);

  const pad = (v) => String(v).padStart(2, '0');
  return (
    <p className="stop-counter" aria-hidden="true">
      <b>{pad(state.n)}</b> / {pad(state.total)}
      {state.parts.length > 0 && (
        <span className="stop-counter__where">
          <strong>{state.parts[0]}</strong>
          {state.parts[1] && <span>{state.parts[1]}</span>}
        </span>
      )}
    </p>
  );
}
