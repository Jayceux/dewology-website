import { useRef, useState } from 'react';
import { useInView } from 'motion/react';
import { story, mission, vision, owners, chapters } from '../content';
import Section from '../components/Section';
import ChapterCard from '../components/ChapterCard';
import './Concept.css';

// Business Concept: story, mission and vision, founders.
// The page warms from night to blush on the way in (the "glow-up").
export default function Concept() {
  return (
    <Section id="concept" stop={false} label="Business concept">
      <div className="section__inner concept">
        <ChapterCard id="chapter-concept" chapter={chapters.concept} />
        <Story />
        <MissionVision />
        <Founders />
      </div>
    </Section>
  );
}

function Story() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -20% 0px' });
  return (
    <div id="story" className="story frame" data-stop="" data-label={story.label} ref={ref} data-inview={inView}>
      <div className="story__loud">
        <ul className="story__list" aria-label="What skincare got loud with">
          {story.loud.map((item, i) => (
            <li key={item} style={{ '--i': i }}>
              <span className="story__struck">{item}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="story__answer">
        <h2 className="story__heading">{story.heading}</h2>
        <p className="story__body">
          <span className="story__lead">{story.lead}</span> {story.body}
        </p>
      </div>
    </div>
  );
}

function MissionVision() {
  return (
    <div id="mission" className="mv frame" data-stop="" data-label={mission.stopLabel}>
      <figure className="mv__item">
        <figcaption className="mv__label">
          <Drop /> {mission.label}
        </figcaption>
        <blockquote className="mv__text">{mission.text}</blockquote>
      </figure>
      <figure className="mv__item mv__item--offset">
        <figcaption className="mv__label">
          <Drop /> {vision.label}
        </figcaption>
        <blockquote className="mv__text">{vision.text}</blockquote>
      </figure>
    </div>
  );
}

function Drop() {
  return (
    <svg className="mv__drop" viewBox="0 0 16 24" aria-hidden="true">
      <path d="M8 0C8 0 0 11 0 16a8 8 0 0 0 16 0C16 11 8 0 8 0Z" fill="currentColor" />
    </svg>
  );
}

function Founders() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -15% 0px' });
  return (
    <div id="founders" className="founders frame" data-stop="" data-label={owners.stopLabel} ref={ref} data-inview={inView}>
      <h2 className="founders__heading">{owners.heading}</h2>
      <ul className="founders__list">
        {owners.people.map((person, i) => (
          <li key={person.name} className="founder" style={{ '--i': i }}>
            <Portrait person={person} />
            <p className="founder__name">{person.name}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Shows the photo when it exists; otherwise a gold monogram in the drop.
function Portrait({ person }) {
  const [loaded, setLoaded] = useState(false);
  const [missing, setMissing] = useState(false);
  return (
    <div className="founder__frame">
      <div className="founder__fill">
        <span className="founder__initials" aria-hidden={loaded}>
          {person.initials}
        </span>
        {!missing && (
          <img
            className="founder__photo"
            src={person.photo}
            alt={`Portrait of ${person.name}`}
            data-loaded={loaded}
            onLoad={() => setLoaded(true)}
            onError={() => setMissing(true)}
            loading="lazy"
            decoding="async"
          />
        )}
        <span className="founder__sheen" aria-hidden="true" />
      </div>
    </div>
  );
}
