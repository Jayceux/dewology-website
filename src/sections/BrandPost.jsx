import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { brandPost, chapters } from '../content';
import useMediaQuery from '../lib/useMediaQuery';
import Section from '../components/Section';
import ChapterCard from '../components/ChapterCard';
import Swatches from '../components/Swatches';
import FontSpecimen from '../components/FontSpecimen';
import './BrandPost.css';

// CT#2 First brand post: its own palette (blush #E4C7B9, terracotta #8B2E16)
// and fonts (Poppins SemiBold, Cormorant Garamond Italic).
//
// Laptop and TV: two presentation stops. Stop 1 shows the whole post with its
// palette and type; on stop 2 the phone zooms in until the exact caption fills
// the middle of the screen, readable from the back of the room. Phones keep
// one simple stacked layout (the caption is readable in the hand).
export default function BrandPost() {
  const ref = useRef(null);
  const scrollRef = useRef(null);
  const stageRef = useRef(null);
  const zoomRef = useRef(null);
  const captionRef = useRef(null);
  const wide = useMediaQuery('(min-width: 901px)');
  const mouse = useMediaQuery('(hover: hover) and (pointer: fine)');
  // Reveal once the frame is mostly on screen (by then the page has turned
  // blush, so the terracotta text is never shown on a half-dark background)
  const inView = useInView(ref, wide ? { once: true, amount: 0.85 } : { once: true, margin: '0px 0px -20% 0px' });
  const [zoomed, setZoomed] = useState(false);
  const { scrollYProgress } = useScroll({ target: scrollRef, offset: ['start start', 'end end'] });

  useMotionValueEvent(scrollYProgress, 'change', (p) => setZoomed(wide && p > 0.5));
  useEffect(() => {
    if (!wide) setZoomed(false);
  }, [wide]);

  // Work out the zoom that puts the caption in the middle of the screen
  useEffect(() => {
    if (!wide) return undefined;
    const measure = () => {
      const stage = stageRef.current;
      const zoom = zoomRef.current;
      const caption = captionRef.current;
      if (!stage || !zoom || !caption) return;
      // positions from layout offsets, so the current zoom does not skew them
      const within = (el) => {
        let x = 0;
        let y = 0;
        for (let n = el; n && n !== stage; n = n.offsetParent) {
          x += n.offsetLeft;
          y += n.offsetTop;
        }
        return { x, y };
      };
      const o = within(zoom);
      const c = within(caption);
      const cw = caption.offsetWidth;
      const ch = caption.offsetHeight;
      const nav = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 88;
      const s = Math.min(2.4, (stage.clientWidth * 0.72) / cw, (stage.clientHeight - nav - 96) / ch);
      const gx = stage.clientWidth / 2;
      const gy = (stage.clientHeight + nav) / 2;
      const cx = c.x + cw / 2;
      const cy = c.y + ch / 2;
      zoom.style.setProperty('--zs', s.toFixed(3));
      zoom.style.setProperty('--zx', `${(gx - o.x - s * (cx - o.x)).toFixed(1)}px`);
      zoom.style.setProperty('--zy', `${(gy - o.y - s * (cy - o.y)).toFixed(1)}px`);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(stageRef.current);
    document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, [wide]);

  return (
    <Section id="brand-post" className="ct2" stop={false} label={brandPost.label}>
      <ChapterCard id="chapter-brand-post" chapter={chapters.brandPost} />
      <div className="ct2-scroll" ref={scrollRef}>
        {/* Invisible markers: the two presentation stops */}
        <span id="ct2-post" className="ct2-scroll__marker" data-stop="" style={{ '--at': 0 }} />
        {wide && <span id="ct2-caption" className="ct2-scroll__marker" data-stop="" style={{ '--at': 1 }} />}
        <div className="ct2-scroll__sticky" ref={stageRef}>
          <div className="section__inner ct2__layout" ref={ref} data-inview={inView} data-zoom={zoomed}>
            <header className="ct2__intro">
              <h2 className="ct2__heading">{brandPost.heading}</h2>
              <p className="ct2__tagline">{brandPost.tagline}</p>
            </header>

            <div className="ct2__phone-col">
              <div className="ct2__zoom" ref={zoomRef}>
                <Phone captionRef={captionRef} />
              </div>
              <p className="ct2__hint">{mouse ? brandPost.hint : brandPost.hintTouch}</p>
            </div>

            <div className="ct2__details" id="ct2-palette">
              <Swatches swatches={brandPost.palette} />
              <FontSpecimen items={brandPost.typography} />
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

// ── Phone with the post ──────────────────────────────────────

function Phone({ captionRef }) {
  return (
    <div className="phone">
      <div className="phone__screen">
        <StatusBar />
        <Post captionRef={captionRef} />
      </div>
    </div>
  );
}

function StatusBar() {
  return (
    <div className="phone__status" aria-hidden="true">
      <span className="phone__time">10:10</span>
      <span className="phone__island" />
      <span className="phone__icons">
        <svg viewBox="0 0 18 12" width="18" height="12">
          <rect x="0" y="8" width="3" height="4" rx="1" />
          <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
          <rect x="10" y="3" width="3" height="9" rx="1" />
          <rect x="15" y="0" width="3" height="12" rx="1" />
        </svg>
        <svg viewBox="0 0 16 12" width="16" height="12">
          <path d="M8 2.2c2.4 0 4.6.9 6.2 2.5l1.3-1.3A10.6 10.6 0 0 0 8 .3 10.6 10.6 0 0 0 .5 3.4l1.3 1.3A8.7 8.7 0 0 1 8 2.2Zm0 3.7c1.4 0 2.7.5 3.6 1.4l1.4-1.3A7 7 0 0 0 8 4a7 7 0 0 0-5 2l1.4 1.3c.9-.9 2.2-1.4 3.6-1.4Zm0 3.6c.5 0 1 .2 1.3.5L8 11.7 6.7 10c.3-.3.8-.5 1.3-.5Z" />
        </svg>
        <svg viewBox="0 0 27 12" width="27" height="12">
          <rect x="0.5" y="0.5" width="23" height="11" rx="3.5" fill="none" stroke="currentColor" opacity="0.4" />
          <rect x="2" y="2" width="17" height="8" rx="2" />
          <rect x="24.5" y="4" width="2" height="4" rx="1" opacity="0.4" />
        </svg>
      </span>
    </div>
  );
}

// Outline icons drawn for the mockup (no app logos are used)
const Icon = {
  heart: (
    <path d="M12 20.3s-7.6-4.6-9.4-9.3C1.4 7.8 3.3 4.7 6.6 4.5c2-.1 3.6 1 4.4 2.5.8-1.5 2.5-2.6 4.4-2.5 3.3.2 5.2 3.3 4 6.5-1.8 4.7-9.4 9.3-9.4 9.3Z" />
  ),
  comment: <path d="M20.6 16.8A9 9 0 1 0 17 20.4L21 21.5Z" />,
  share: (
    <>
      <path d="M21.5 3 3 10.2l7.2 2.6L21.5 3Z" />
      <path d="M21.5 3 13.8 21l-3.6-8.2" />
    </>
  ),
  save: <path d="M19 21.5 12 16l-7 5.5V4a1.5 1.5 0 0 1 1.5-1.5h11A1.5 1.5 0 0 1 19 4Z" />,
  more: (
    <>
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </>
  ),
};

function Post({ captionRef }) {
  const reduce = useReducedMotion();
  const [liked, setLiked] = useState(false);
  const [bursts, setBursts] = useState([]); // big hearts on the photo
  const lastTap = useRef(0);

  const likeFromPhoto = () => {
    setLiked(true);
    const id = Date.now();
    setBursts((b) => [...b, id]);
    setTimeout(() => setBursts((b) => b.filter((x) => x !== id)), 750);
  };

  // Double-tap (touch) or double-click (mouse) on the photo
  const onPhotoPointerUp = (e) => {
    if (e.pointerType === 'mouse') return; // mouse uses onDoubleClick
    const now = e.timeStamp;
    if (now - lastTap.current < 320) {
      likeFromPhoto();
      lastTap.current = 0;
    } else {
      lastTap.current = now;
    }
  };

  const count = brandPost.likes + (liked ? 1 : 0);

  return (
    <article className="post" aria-label={`Instagram post by ${brandPost.account}`}>
      <header className="post__header">
        <span className="post__avatar" aria-hidden="true">
          <img src="/assets/logo/primary-logo-mark.svg" alt="" width="355" height="732" />
        </span>
        <span className="post__account">{brandPost.account}</span>
        <svg className="post__more" viewBox="0 0 24 24" aria-hidden="true">
          {Icon.more}
        </svg>
      </header>

      <div className="post__photo" onDoubleClick={likeFromPhoto} onPointerUp={onPhotoPointerUp}>
        <img
          src={brandPost.image}
          srcSet={`${brandPost.image} 800w, ${brandPost.imageLarge} 1600w`}
          sizes="390px"
          alt="Dewology's first brand post: Glowy Skin made natural. Every drop. Every step. Matters."
          width="800"
          height="800"
          draggable="false"
        />
        <AnimatePresence>
          {bursts.map((id) => (
            <motion.svg
              key={id}
              className="post__burst"
              viewBox="0 0 24 24"
              aria-hidden="true"
              initial={{ opacity: 0, transform: reduce ? 'scale(1)' : 'scale(0.4)' }}
              animate={{ opacity: 1, transform: 'scale(1)' }}
              exit={{ opacity: 0, transform: reduce ? 'scale(1)' : 'scale(1.12)', transition: { duration: 0.2, ease: [0.23, 1, 0.32, 1] } }}
              transition={reduce ? { duration: 0.15 } : { type: 'spring', duration: 0.45, bounce: 0.45 }}
            >
              {Icon.heart}
            </motion.svg>
          ))}
        </AnimatePresence>
      </div>

      <div className="post__actions">
        <motion.button
          type="button"
          className="post__icon post__like"
          aria-pressed={liked}
          aria-label={liked ? 'Unlike' : 'Like'}
          onClick={() => setLiked((l) => !l)}
          animate={liked && !reduce ? { transform: ['scale(1)', 'scale(1.28)', 'scale(1)'] } : { transform: 'scale(1)' }}
          transition={{ duration: 0.32, ease: [0.23, 1, 0.32, 1] }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            {Icon.heart}
          </svg>
        </motion.button>
        <span className="post__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">{Icon.comment}</svg>
        </span>
        <span className="post__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">{Icon.share}</svg>
        </span>
        <span className="post__icon post__save" aria-hidden="true">
          <svg viewBox="0 0 24 24">{Icon.save}</svg>
        </span>
      </div>

      <p className="post__likes" aria-live="polite">
        <AnimatedCount value={count} /> likes
      </p>

      <Caption outerRef={captionRef} />
    </article>
  );
}

// The like number rolls up/down by one
function AnimatedCount({ value }) {
  const reduce = useReducedMotion();
  return (
    <span className="count">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={value}
          className="count__digit"
          initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(60%)' }}
          animate={{ opacity: 1, transform: 'translateY(0%)' }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(-60%)' }}
          transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
        >
          {value.toLocaleString('en-US')}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

// Caption lines brighten one by one as the post scrolls into view.
function Caption({ outerRef }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const lines = brandPost.caption.split('\n');
  // Fully revealed by the time the caption's last line is on screen
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 1', 'end 0.96'] });

  return (
    <div
      className="post__caption"
      ref={(el) => {
        ref.current = el;
        if (outerRef) outerRef.current = el;
      }}
    >
      {lines.map((line, i) => (
        <CaptionLine key={i} index={i} total={lines.length} progress={scrollYProgress} reduce={reduce}>
          {i === 0 && <strong className="post__caption-account">{brandPost.account} </strong>}
          {line.startsWith('#') ? <span className="post__tag">{line}</span> : line}
        </CaptionLine>
      ))}
    </div>
  );
}

function CaptionLine({ index, total, progress, reduce, children }) {
  const start = index / total;
  const end = (index + 1) / total;
  const opacity = useTransform(progress, [start, end], [0.15, 1], { clamp: true });
  const transform = useTransform(progress, [start, end], ['translateY(8px)', 'translateY(0px)'], { clamp: true });
  if (reduce) {
    return <p className="post__caption-line">{children}</p>;
  }
  return (
    <motion.p className="post__caption-line" style={{ opacity, transform }}>
      {children}
    </motion.p>
  );
}
