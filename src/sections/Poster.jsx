import { useRef } from 'react';
import { useInView } from 'motion/react';
import { poster } from '../content';
import Section from '../components/Section';
import CtBadge from '../components/CtBadge';
import Swatches from '../components/Swatches';
import FontSpecimen from '../components/FontSpecimen';
import './Poster.css';

// CT#3 Promotional poster. Professor's rule: only the poster, its palette
// and its typography, with no explanation text.
// Monochromatic pink: #F3B6BE, #E98D97, #CF5B6E. Tinos + Montserrat.
export default function Poster() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.35 });
  return (
    <Section id="poster" bg="#F3B6BE" theme="light" className="ct3" label="CT#3 Promotional poster">
      <div className="section__inner ct3__layout">
        <figure className="ct3__poster" ref={ref} data-inview={inView}>
          <img
            src={poster.image}
            srcSet={`${poster.image} 453w, ${poster.imageLarge} 1220w`}
            sizes="(max-width: 900px) 90vw, 53vh"
            alt={poster.alt}
            width="1220"
            height="2160"
          />
        </figure>
        <div className="ct3__details">
          <CtBadge className="ct3__label" label={poster.label} />
          <Swatches swatches={poster.palette} />
          <FontSpecimen items={poster.typography} />
        </div>
      </div>
    </Section>
  );
}
