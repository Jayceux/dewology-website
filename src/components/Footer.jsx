import { brand, footer } from '../content';
import Section from './Section';
import Wordmark from './Wordmark';
import './Footer.css';

// The closing frame. The last dewdrop falls into the water (drawn by the
// stage behind the page); the logo rises out of the rings with its
// reflection opening beneath it, then the tagline the presentation opened
// on rises in, line by line, over the class credit. The stage marks
// `.finale` with data-reveal as the drop lands (see src/stage); without the
// stage, or with reduced motion, everything is simply shown.
export default function Footer() {
  return (
    <Section id="footer" className="footer" label="Footer">
      <footer className="footer__inner">
        <div className="finale">
          <div className="finale__rise">
            <Wordmark className="finale__logo" label={footer.name} />
          </div>
          <div className="finale__mirror" aria-hidden="true">
            <Wordmark className="finale__logo finale__logo--mirror" label={null} />
          </div>
          <p className="finale__tagline">
            <span className="visually-hidden">{brand.tagline}</span>
            {brand.taglineLines.map((line, i) => (
              <span key={line} className="finale__line" style={{ '--i': i }} aria-hidden="true">
                {line}
              </span>
            ))}
          </p>
          <p className="finale__group">{footer.group}</p>
        </div>
        {/* one signature line: the menu at the top already carries the logo
            and the chapters, so the footer only adds the year and the handle */}
        <p className="footer__meta">
          <span>{footer.copyright}</span>
          <span className="footer__dot" aria-hidden="true">
            ·
          </span>
          <a href={footer.instagram.url} target="_blank" rel="noreferrer">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" />
            </svg>
            {footer.instagram.label}
            <span className="visually-hidden">{footer.instagramNote}</span>
          </a>
        </p>
      </footer>
    </Section>
  );
}
