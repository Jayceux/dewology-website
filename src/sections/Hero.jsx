import { useEffect, useRef, useState } from 'react';
import { useAnimate } from 'motion/react';
import { brand, hero } from '../content';
import { useSite } from '../lib/site';
import { markIntroSeen } from '../lib/intro';
import Section from '../components/Section';
import Wordmark from '../components/Wordmark';
import { buildLayers, buildSteps } from '../components/WordmarkBuild';
import HeroProduct from '../components/HeroProduct';
import GoldGlow from '../components/GoldGlow';
import './Hero.css';

// Strong ease-out for things arriving (Emil Kowalski)
const EASE_OUT = [0.23, 1, 0.32, 1];
const LOGO = buildLayers('hero');

// The intro, about 2.5 seconds:
// 0.00  the logo builds itself (WordmarkBuild): the drop falls into the
//       "D" (0.58 it swells), the face and hair pour in (0.95),
//       EWOLOGY is written in (1.30)
// 1.45  the tagline rises in, line by line
// 1.80  a single gold shine sweeps across the whole name
// 1.85  intro text, button, menu and glow settle in
// 1.95  the plain word "Dewology" settles in under the logo, so the
//       name reads even from the back of the room
// Then the 3D Glow Serum spins up into place (see HeroProduct).
function introSequence(q, nav, progress) {
  return [
    ...buildSteps(q, 0),
    [q('.gold-glow'), { opacity: [0, 1] }, { duration: 0.9, ease: 'easeOut', at: 1.1 }],
    [q('.hero__line:nth-child(2) .hero__line-inner'), { transform: ['translateY(108%)', 'translateY(0%)'] }, { duration: 0.75, ease: EASE_OUT, at: 1.45 }],
    [q('.hero__line:nth-child(3) .hero__line-inner'), { transform: ['translateY(108%)', 'translateY(0%)'] }, { duration: 0.75, ease: EASE_OUT, at: 1.53 }],
    [q('.hero__intro'), { opacity: [0, 1], transform: ['translateY(10px)', 'translateY(0px)'], filter: ['blur(4px)', 'blur(0px)'] }, { duration: 0.5, ease: EASE_OUT, at: 1.85 }],
    [q('.hero__cta'), { opacity: [0, 1], transform: ['translateY(10px)', 'translateY(0px)'], filter: ['blur(4px)', 'blur(0px)'] }, { duration: 0.5, ease: EASE_OUT, at: 1.93 }],
    // the letters draw together as they settle
    [q('.hero__name'), { opacity: [0, 1], letterSpacing: ['0.7em', '0.42em'], filter: ['blur(4px)', 'blur(0px)'] }, { duration: 0.9, ease: EASE_OUT, at: 1.95 }],
    [nav, { opacity: [0, 1] }, { duration: 0.5, ease: 'easeOut', at: 2.0 }],
    [progress, { opacity: [0, 1] }, { duration: 0.5, ease: 'easeOut', at: 2.1 }],
    [q('.hero__skip'), { opacity: [1, 0] }, { duration: 0.2, at: 2.3 }],
  ].filter(([el]) => el);
}

export default function Hero() {
  const { scrollTo } = useSite();
  const productRef = useRef(null);
  const [scope, animate] = useAnimate();
  const [playing, setPlaying] = useState(() => document.documentElement.dataset.intro === 'play');
  const lines = brand.tagline.split(/(?<=\.)\s+/);

  useEffect(() => {
    if (document.documentElement.dataset.intro !== 'play') return undefined;
    // Arriving mid-page (e.g. refresh after scrolling): skip straight to the end.
    if (window.scrollY > 40) {
      markIntroSeen();
      setPlaying(false);
      return undefined;
    }

    const q = (sel) => scope.current?.querySelector(sel);
    const controls = animate(introSequence(q, document.querySelector('.nav'), document.querySelector('.progress-drop')));
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      controls.complete();
      // Hand the shine over to its CSS loop (a finished intro animation
      // would otherwise hold it in place)
      q('.wm-shine')
        ?.getAnimations()
        .forEach((anim) => {
          if (!(anim instanceof CSSAnimation)) anim.cancel();
        });
      markIntroSeen();
      setPlaying(false);
      removeSkip();
    };
    // Any click, key, scroll or touch skips to the end.
    const skip = (e) => {
      if (e.type === 'keydown') e.preventDefault();
      finish();
    };
    const opts = { capture: true };
    const passive = { capture: true, passive: true };
    window.addEventListener('keydown', skip, opts);
    window.addEventListener('pointerdown', skip, opts);
    window.addEventListener('wheel', skip, passive);
    window.addEventListener('touchstart', skip, passive);
    function removeSkip() {
      window.removeEventListener('keydown', skip, opts);
      window.removeEventListener('pointerdown', skip, opts);
      window.removeEventListener('wheel', skip, passive);
      window.removeEventListener('touchstart', skip, passive);
    }
    Promise.resolve(controls.finished ?? controls).then(finish);

    return () => {
      removeSkip();
      if (!finished) {
        finished = true; // so a stopped run never marks the intro as seen
        controls.stop();
      }
    };
  }, [animate, scope]);

  return (
    <Section id="home" bg="#050404" theme="dark" className="hero" label={brand.name}>
      <div ref={scope} className="hero__stage">
        <GoldGlow anchorRef={productRef} follow={false} />

        <div className="hero__inner">
          <div className="hero__copy">
            <h1 className="hero__brand">
              <Wordmark
                className="hero__wordmark"
                label={null}
                {...LOGO}
              />
              <span className="hero__name">{brand.name}</span>
            </h1>
            <p className="hero__tagline">
              <span className="visually-hidden">{brand.tagline}</span>
              {lines.map((line) => (
                <span className="hero__line" key={line} aria-hidden="true">
                  <span className="hero__line-inner">{line}</span>
                </span>
              ))}
            </p>
            <p className="hero__intro">{hero.intro}</p>
            <a
              className="button hero__cta"
              href="#routine-intro"
              onClick={(e) => {
                e.preventDefault();
                scrollTo('#routine-intro');
              }}
            >
              {hero.button}
            </a>
          </div>

          <div className="hero__product" ref={productRef}>
            <HeroProduct start={!playing} />
          </div>
        </div>

        {playing && (
          <button type="button" className="hero__skip">
            {hero.skip}
          </button>
        )}
      </div>
    </Section>
  );
}
