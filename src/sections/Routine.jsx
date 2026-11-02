import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react';
import { brand, routine, starterKit } from '../content';
import { useSite } from '../lib/site';
import useMediaQuery from '../lib/useMediaQuery';
import kitMeta from '../data/kit-meta.json';
import Section from '../components/Section';
import './Routine.css';

const EASE_OUT = [0.23, 1, 0.32, 1];
const products = routine.products;

// Sample products: the 5-step routine, then the Starter Kit.
// A darker "studio" so the pink glass and gold foil glow.
export default function Routine() {
  const headRef = useRef(null);
  const headInView = useInView(headRef, { once: true, amount: 0.5 });
  return (
    <Section id="routine" navId="concept" stop={false} label={routine.label}>
      <div className="section__inner">
        <header className="routine__head frame" id="routine-intro" data-stop="" ref={headRef} data-inview={headInView}>
          <h2 className="routine__heading">
            {/* keep hyphenated words like "five-step" on one line */}
            {routine.heading.split(' ').map((word, i) => (
              <span key={i} style={word.includes('-') ? { whiteSpace: 'nowrap' } : undefined}>
                {i > 0 && ' '}
                {word}
              </span>
            ))}
          </h2>
          <p className="routine__intro">{routine.intro}</p>
          {/* All five products side by side, at their real relative sizes
              (the renders share one camera), standing on one floor */}
          <ul className="routine__lineup" aria-label={`The five ${brand.name} products`}>
            {products.map((p, i) => (
              <li key={p.id} style={{ '--i': i }}>
                <img src={p.image} alt={`${brand.name} ${p.name}`} width="1000" height="1250" decoding="async" />
              </li>
            ))}
          </ul>
        </header>
        <Steps />
        <StarterKit />
      </div>
    </Section>
  );
}

function Steps() {
  const wide = useMediaQuery('(min-width: 900px)');
  return wide ? <StickySteps /> : <StackedSteps />;
}

// Desktop: the product stays pinned while scrolling moves through steps 1–5.
function StickySteps() {
  const ref = useRef(null);
  const { scrollTo } = useSite();
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });

  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    setActive(Math.min(products.length - 1, Math.max(0, Math.floor(p * products.length))));
  });

  // Warm the cache so switching steps never shows a blank frame
  useEffect(() => {
    products.forEach((p) => {
      const img = new Image();
      img.src = p.image;
    });
  }, []);

  const product = products[active];
  // Enter 300ms, leave faster (180ms): it fires on every step change.
  const enter = reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(16px)', filter: 'blur(6px)' };
  const shown = reduce ? { opacity: 1 } : { opacity: 1, transform: 'translateY(0px)', filter: 'blur(0px)' };
  const leave = reduce
    ? { opacity: 0, transition: { duration: 0.15 } }
    : { opacity: 0, transform: 'translateY(-8px)', filter: 'blur(6px)', transition: { duration: 0.18, ease: EASE_OUT } };

  return (
    <div className="steps" ref={ref} style={{ '--count': products.length }}>
      {/* Invisible markers: where each step starts (for clicks and presentation keys) */}
      {products.map((p, i) => (
        <span
          key={p.id}
          id={`step-${p.step}`}
          className="steps__marker"
          data-stop=""
          style={{ '--at': (i + 0.12) / products.length }}
        />
      ))}

      <div className="steps__sticky">
        <div className="steps__stage">
          <AnimatePresence initial={false}>
            <motion.span
              key={`n-${product.step}`}
              className="steps__bignum"
              aria-hidden="true"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {product.step}
            </motion.span>
          </AnimatePresence>
          <AnimatePresence initial={false}>
            <motion.img
              key={product.id}
              className="steps__product"
              src={product.image}
              alt={`Dewology ${product.name}`}
              width="1000"
              height="1250"
              initial={enter}
              animate={shown}
              exit={leave}
              transition={{ duration: 0.3, ease: EASE_OUT }}
            />
          </AnimatePresence>
        </div>

        <ol className="steps__list">
          {products.map((p, i) => (
            <li key={p.id}>
              <button
                type="button"
                className="step"
                aria-current={i === active ? 'step' : undefined}
                onClick={() => scrollTo(`#step-${p.step}`)}
              >
                <span className="step__num">{p.step}</span>
                <span className="step__body">
                  <span className="step__name">{p.name}</span>
                  {/* only the current step's description is open */}
                  <span className="step__more">
                    <span className="step__text">{p.text}</span>
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

// Phone: a simple vertical list, no pinning.
function StackedSteps() {
  return (
    <ol className="stack">
      {products.map((p) => (
        <li key={p.id} className="stack__item" id={`step-${p.step}`}>
          <div className="stack__stage">
            <img className="stack__product" src={p.image} alt={`Dewology ${p.name}`} width="1000" height="1250" loading="lazy" />
          </div>
          <div className="stack__copy">
            <span className="step__num">{p.step}</span>
            <span className="step__name">{p.name}</span>
            <span className="step__text">{p.text}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

// ── Starter Kit: the box opens and the five products rise out ──
const LIFT = 0.22; // how far the products rise when the box opens (share of image height)

function StarterKit() {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (inView) setOpen(true);
  }, [inView]);

  const clipBottom = `${((1 - kitMeta.boxBottom) * 100).toFixed(2)}%`;

  return (
    <div className="kit" id="starter-kit" data-stop="" ref={ref}>
      <div className="kit__copy">
        <h3 className="kit__name">{starterKit.name}</h3>
        <p className="kit__text">{starterKit.text}</p>
        <button type="button" className="button kit__toggle" onClick={() => setOpen((o) => !o)} aria-pressed={open}>
          {open ? starterKit.closeButton : starterKit.openButton}
        </button>
      </div>

      <div className="kit__stage" data-open={open}>
        <img className="kit__layer" src="/assets/products/kit-back.webp" alt="" width="1600" height="1100" />
        <div className="kit__bottles" style={{ clipPath: `inset(-50% 0 ${clipBottom} 0)` }}>
          {kitMeta.bottles.map((b, i) => {
            const hidden = Math.max(0, kitMeta.rimFront - b.top) + 0.03;
            const name = products.find((p) => p.id === b.id)?.name;
            return (
              <motion.img
                key={b.id}
                className="kit__layer"
                src={`/assets/products/kit-${b.id}.webp`}
                alt={open ? `Dewology ${name}` : ''}
                width="1600"
                height="1100"
                initial={false}
                animate={{ transform: `translateY(${((open ? -LIFT : hidden) * 100).toFixed(2)}%)` }}
                transition={
                  reduce
                    ? { duration: 0 }
                    : open
                      ? { duration: 0.9, ease: EASE_OUT, delay: 0.28 + i * 0.07 }
                      : { duration: 0.45, ease: [0.77, 0, 0.175, 1], delay: (kitMeta.bottles.length - 1 - i) * 0.04 }
                }
              />
            );
          })}
        </div>
        <img className="kit__layer" src="/assets/products/kit-front.webp" alt={`${starterKit.name} box`} width="1600" height="1100" />
        <motion.img
          className="kit__layer kit__lid"
          src="/assets/products/kit-lid.webp"
          alt=""
          width="1600"
          height="1100"
          initial={false}
          animate={open ? { opacity: 0, transform: 'translateY(-18%) rotate(-3deg)' } : { opacity: 1, transform: 'translateY(0%) rotate(0deg)' }}
          transition={reduce ? { duration: 0 } : open ? { duration: 0.6, ease: EASE_OUT } : { duration: 0.45, ease: EASE_OUT, delay: 0.35 }}
        />
      </div>
    </div>
  );
}
