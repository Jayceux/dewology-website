import { useEffect, useRef } from 'react';
import { useInView } from 'motion/react';
import { poster, chapters } from '../content';
import Section from '../components/Section';
import ChapterCard from '../components/ChapterCard';
import Swatches from '../components/Swatches';
import FontSpecimen from '../components/FontSpecimen';
import './Poster.css';

// CT#3 Promotional poster. Professor's rule: only the poster, its palette
// and its typography, with no explanation text.
// Monochromatic pink: #F3B6BE, #E98D97, #CF5B6E. DM Serif Text, Cormorant Garamond Italic and Montserrat.
export default function Poster() {
  const ref = useRef(null);
  const frameRef = useRef(null);
  const detailsRef = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.35 });

  // Laptop and TV: the palette-and-type column steps down as a whole when
  // the screen is not tall enough for it between the menu and the stop
  // counter's strip (as on the CT#2 frame)
  useEffect(() => {
    const frame = frameRef.current;
    const details = detailsRef.current;
    if (!frame || !details) return undefined;
    const wide = window.matchMedia('(min-width: 901px)');
    const measure = () => {
      details.style.setProperty('--details-fit', '1');
      if (!wide.matches) return;
      const cs = getComputedStyle(frame);
      const room = window.innerHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      details.style.setProperty('--details-fit', Math.max(0.6, Math.min(1, room / details.offsetHeight)).toFixed(3));
    };
    measure();
    window.addEventListener('resize', measure);
    document.fonts?.ready.then(measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  return (
    <Section id="poster" className="ct3" stop={false} label={poster.label}>
      <ChapterCard id="chapter-poster" chapter={chapters.poster} />
      <div className="section__inner ct3__layout frame" id="ct3-poster" data-stop="" ref={frameRef}>
        <figure className="ct3__poster" ref={ref} data-inview={inView}>
          <img
            src={poster.image}
            srcSet={`${poster.image} 549w, ${poster.imageLarge} 1098w`}
            sizes="(max-width: 900px) 90vw, 60vh"
            alt={poster.alt}
            width="1098"
            height="1350"
          />
        </figure>
        <div className="ct3__details" ref={detailsRef}>
          <Swatches swatches={poster.palette} />
          <FontSpecimen items={poster.typography} />
        </div>
      </div>
    </Section>
  );
}
