import { useEffect, useState } from 'react';
import { nav, brand } from '../content';
import { useSite } from '../lib/site';
import Wordmark from './Wordmark';
import './Nav.css';

export default function Nav() {
  const { scrollTo, active } = useSite();
  const [open, setOpen] = useState(false);

  // The "Concept" link stays highlighted for all of its sub-parts.
  const currentId = active.id;

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const go = (e, id) => {
    e.preventDefault();
    setOpen(false);
    // Land on the section's first presentation stop (e.g. Concept → our story)
    scrollTo(document.querySelector(`#${id} [data-stop]`) || `#${id}`);
    // a mouse click lets go of the link, so no focus box is left behind it
    // (a keyboard Enter keeps focus where the visitor is)
    if (e.detail > 0) e.currentTarget.blur();
  };

  return (
    <header className="nav" data-open={open}>
      <a href="#home" className="nav__brand" onClick={(e) => go(e, 'home')} aria-label={`${brand.name}, back to top`}>
        <Wordmark className="nav__logo" label={null} />
      </a>

      <button
        type="button"
        className="nav__toggle"
        aria-expanded={open}
        aria-controls="site-menu"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? 'Close' : 'Menu'}
      </button>

      <nav id="site-menu" className="nav__links" aria-label="Sections">
        {nav.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            aria-current={currentId === item.id ? 'true' : undefined}
            onClick={(e) => go(e, item.id)}
          >
            {item.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
