import { useEffect, useState } from 'react';
import { motion, useTransform } from 'motion/react';
import { nav, brand } from '../content';
import { useSite } from '../lib/site';
import { pageRgb } from './BackgroundGlow';
import './Nav.css';

export default function Nav() {
  const { scrollTo, active } = useSite();
  const [open, setOpen] = useState(false);
  const frosted = useTransform(pageRgb, ([r, g, b]) => `rgba(${r}, ${g}, ${b}, 0.78)`);

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
  };

  return (
    <motion.header className="nav" data-theme={active.theme} data-open={open} style={{ backgroundColor: frosted }}>
      <a href="#home" className="nav__brand" onClick={(e) => go(e, 'home')} aria-label={`${brand.name}, back to top`}>
        <img className="nav__logo nav__logo--gold" src="/assets/logo/secondary-logo.svg" alt="" width="132" height="56" />
        <img className="nav__logo nav__logo--ink" src="/assets/logo/secondary-logo-ink.svg" alt="" width="132" height="56" />
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
    </motion.header>
  );
}
