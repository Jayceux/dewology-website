import { useEffect, useState } from 'react';
import { useAnimate } from 'motion/react';
import { brand, hero } from '../content';
import { useSite } from '../lib/site';
import { markIntroSeen } from '../lib/intro';
import Section from '../components/Section';
import Wordmark from '../components/Wordmark';
import { buildLayers, buildSteps } from '../components/WordmarkBuild';
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
// Then the watercolour stage drops the first dew: a wash blooms on the
// right and the live 3D Glow Serum rises in it (see src/stage).
function introSequence(q, nav, progress) {
  return [
    ...buildSteps(q, 0),
    [q('.hero__line:nth-child(2) .hero__line-inner'), { transform: ['translateY(108%)', 'translateY(0%)'] }, { duration: 0.75, ease: EASE_OUT, at: 1.45 }],
    [q('.hero__line:nth-child(3) .hero__line-inner'), { transform: ['translateY(108%)', 'translateY(0%)'] }, { duration: 0.75, ease: EASE_OUT, at: 1.53 }],
    [q('.hero__intro'), { opacity: [0, 1], transform: ['translateY(10px)', 'translateY(0px)'], filter: ['blur(4px)', 'blur(0px)'] }, { duration: 0.5, ease: EASE_OUT, at: 1.85 }],
    [q('.hero__cta'), { opacity: [0, 1], transform: ['translateY(10px)', 'translateY(0px)'], filter: ['blur(4px)', 'blur(0px)'] }, { duration: 0.5, ease: EASE_OUT, at: 1.93 }],
    [nav, { opacity: [0, 1] }, { duration: 0.5, ease: 'easeOut', at: 2.0 }],
    [progress, { opacity: [0, 1] }, { duration: 0.5, ease: 'easeOut', at: 2.1 }],
    [q('.hero__skip'), { opacity: [1, 0] }, { duration: 0.2, at: 2.3 }],
  ].filter(([el]) => el);
}

export default function Hero() {
  const { scrollTo } = useSite();
  const [scope, animate] = useAnimate();
  const [playing, setPlaying] = useState(() => document.documentElement.dataset.intro === 'play');
  const lines = brand.taglineLines;

  useEffect(() => {
    if (document.documentElement.dataset.intro !== 'play') return undefined;
    // Arriving mid-page (e.g. refresh after scrolling): skip straight to the end.
    if (window.scrollY > 40) {
      markIntroSeen();
      setPlaying(false);
      return undefined;
    }

    const q = (sel) => scope.current?.querySelector(sel);
    const controls = animate(introSequence(q, document.querySelector('.nav'), document.querySelector('.stop-counter')));
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
    <Section id="home" className="hero" label={brand.name}>
      <div ref={scope} className="hero__stage">
        <div className="hero__inner">
          <div className="hero__copy">
            <h1 className="hero__brand">
              <Wordmark
                className="hero__wordmark"
                label={null}
                {...LOGO}
              />
              {/* the logo already reads "Dewology"; the name is kept for screen readers only */}
              <span className="visually-hidden">{brand.name}</span>
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

          {/* The live 3D serum stands here (drawn by the stage); the photo is
              the fallback without WebGL or with reduced motion */}
          <div className="hero__product hero-product">
            <img className="hero-product__photo" src="/assets/products/serum.webp" alt={hero.productAlt} width="1000" height="1250" />
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
