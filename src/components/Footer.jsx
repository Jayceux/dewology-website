import { useEffect, useState } from 'react';
import { useAnimate, useInView, useReducedMotion } from 'motion/react';
import { brand, footer, owners } from '../content';
import Section from './Section';
import Wordmark from './Wordmark';
import { buildLayers, buildSteps } from './WordmarkBuild';
import './Footer.css';

const EASE_OUT = [0.23, 1, 0.32, 1];
const LOGO = buildLayers('end');

// The closing frame. The page ends where it began: when it comes into
// view, the logo builds itself again (the same drop, pour and writing as
// the intro), then the tagline and the people who made it settle in.
// It plays once per visit; with reduced motion everything is simply shown.
function closingSequence(q) {
  const names = [...(q.all('.footer__names li') || [])];
  return [
    // the drop stays hidden until it starts to fall
    [q('.wm-drop'), { opacity: [0, 1] }, { duration: 0.12, at: 0 }],
    ...buildSteps(q, 0),
    [q('.footer__tagline'), { opacity: [0, 1], transform: ['translateY(12px)', 'translateY(0px)'], filter: ['blur(4px)', 'blur(0px)'] }, { duration: 0.7, ease: EASE_OUT, at: 1.55 }],
    // a thin gold line draws out from the middle, then the names settle in
    [q('.footer__rule'), { transform: ['scaleX(0)', 'scaleX(1)'] }, { duration: 0.7, ease: EASE_OUT, at: 1.8 }],
    ...names.map((li, i) => [li, { opacity: [0, 1], transform: ['translateY(8px)', 'translateY(0px)'] }, { duration: 0.5, ease: EASE_OUT, at: 1.95 + i * 0.08 }]),
    [q('.footer__group'), { opacity: [0, 1] }, { duration: 0.5, ease: 'easeOut', at: 2.35 }],
  ].filter(([el]) => el);
}

export default function Footer() {
  const reduce = useReducedMotion();
  const [scope, animate] = useAnimate();
  const inView = useInView(scope, { once: true, amount: 0.6 });
  const [phase, setPhase] = useState('ready'); // ready → (plays) → done

  useEffect(() => {
    if (reduce) setPhase('done');
  }, [reduce]);

  useEffect(() => {
    if (!inView || reduce || phase !== 'ready') return undefined;
    const q = (sel) => scope.current?.querySelector(sel);
    q.all = (sel) => scope.current?.querySelectorAll(sel);
    const controls = animate(closingSequence(q));
    let stopped = false;
    Promise.resolve(controls.finished ?? controls).then(() => {
      if (!stopped) setPhase('done');
    });
    return () => {
      stopped = true;
      controls.stop();
    };
  }, [inView, reduce, phase, animate, scope]);

  return (
    <Section id="footer" bg="#050404" theme="dark" className="footer" label="Footer">
      <footer className="footer__inner" ref={scope} data-reform={phase}>
        <div className="footer__close">
          <Wordmark className="footer__logo" label={footer.name} {...LOGO} />
          <p className="footer__tagline">{brand.tagline}</p>
          <div className="footer__credits">
            <span className="footer__rule" aria-hidden="true" />
            <ul className="footer__names">
              {owners.people.map((person) => (
                <li key={person.name}>{person.name}</li>
              ))}
            </ul>
            <p className="footer__group">{footer.group}</p>
          </div>
        </div>
        <div className="footer__meta">
          <span>{footer.name}</span>
          <a href={footer.instagram.url} target="_blank" rel="noreferrer">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" />
            </svg>
            {footer.instagram.label}
            <span className="visually-hidden">{footer.instagramNote}</span>
          </a>
        </div>
      </footer>
    </Section>
  );
}
