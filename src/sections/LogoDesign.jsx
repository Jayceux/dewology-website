import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { logoDesign, chapters } from '../content';
import { useSite } from '../lib/site';
import useMediaQuery from '../lib/useMediaQuery';
import { MARK_PARTS } from '../lib/logoPaths';
import Section from '../components/Section';
import ChapterCard from '../components/ChapterCard';
import LogoMark from '../components/LogoMark';
import Wordmark from '../components/Wordmark';
import SketchCrop from '../components/SketchCrop';
import Swatches from '../components/Swatches';
import FontSpecimen from '../components/FontSpecimen';
import './LogoDesign.css';

// CT#1 Logo design: its own black-and-gold palette, Cinzel (Trajan stand-in) + Montserrat.
export default function LogoDesign() {
  return (
    <Section id="logo" stop={false} className="ct1" label={logoDesign.label}>
      <div className="section__inner">
        <ChapterCard id="chapter-logo" chapter={chapters.logo} />
        <Process />
        <FinalMarks />
        <Gestalt />
        <PaletteType />
      </div>
    </Section>
  );
}

// ── 1. The process: single drop → final mark ─────────────────

function OutlinedDrop() {
  return (
    <svg className="process__drop" viewBox="140 0 185 520" role="img" aria-label="A single outlined dewdrop">
      {/* drawn heavy enough to read from the back of the room, with a
          faint wash of the logo's gold inside */}
      <path d={MARK_PARTS.drop} fill="rgba(232, 199, 135, 0.28)" stroke="#9A6F45" strokeWidth="7" strokeLinejoin="round" />
    </svg>
  );
}

const STAGE_VISUALS = [
  { kind: 'drop' },
  { kind: 'sheet', n: 1 },
  { kind: 'crops', ids: ['redBlackDrop', 'pinkDrop', 'goldDrop'], source: 'Draft sketch 1' },
  { kind: 'crops', ids: ['wordmarkThin', 'wordmarkBold', 'wordmarkSerif'], source: 'Draft sketch 1' },
  { kind: 'sheet', n: 2 },
  { kind: 'crops', ids: ['facePurple', 'facePink', 'faceRed', 'faceGreen'], source: 'Draft sketch 2' },
];

// A whole draft sketch sheet, as the group drew it, matted like the crops
function SketchSheet({ n, alt }) {
  const src = `/assets/sketches/draft-sketch-${n}`;
  return (
    <img
      className="process__sheet"
      src={`${src}.png`}
      srcSet={`${src}.png 800w, ${src}@2x.png 1600w`}
      sizes="(min-width: 901px) 46vw, 90vw"
      width="800"
      height="450"
      alt={alt}
    />
  );
}

function StageVisual({ index }) {
  const v = STAGE_VISUALS[index];
  if (v.kind === 'drop') return <OutlinedDrop />;
  if (v.kind === 'sheet') return <SketchSheet n={v.n} alt={logoDesign.stages[index].alt} />;
  return (
    <div className="process__crops" style={{ '--n': v.ids.length }}>
      {v.ids.map((id) => (
        <SketchCrop key={id} id={id} className="process__crop" />
      ))}
    </div>
  );
}

function StageCopy({ index }) {
  const s = logoDesign.stages[index];
  const v = STAGE_VISUALS[index];
  return (
    <div className="stage__copy">
      <span className="stage__num">{index + 1}</span>
      <div>
        <h3 className="stage__title">{s.title}</h3>
        <p className="stage__text">
          {s.text}
          {v.source && <span className="stage__source"> From {v.source.toLowerCase()}.</span>}
        </p>
      </div>
    </div>
  );
}

// The sideways-sliding timeline is skipped for reduced motion (stacked instead).
function Process() {
  const wide = useMediaQuery('(min-width: 900px)');
  const reduce = useReducedMotion();
  return wide && !reduce ? <ProcessTimeline /> : <ProcessStack />;
}

const N = logoDesign.stages.length;
const HOLD = 0.07; // how long each stage stays still while scrolling (share of the scroll)

function smooth(t) {
  return t * t * (3 - 2 * t);
}

// Desktop: the drafts slide past horizontally as you scroll down.
function ProcessTimeline() {
  const ref = useRef(null);
  const trackRef = useRef(null);
  const offsets = useRef(new Array(N).fill(0));
  const version = useMotionValue(0);
  const { scrollTo } = useSite();
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });

  // Measure where each stage panel sits so each one can stop at the left edge
  useEffect(() => {
    const measure = () => {
      const track = trackRef.current;
      if (!track) return;
      const panels = [...track.children];
      // measure from the viewport box: the track itself is moved sideways
      const left = track.parentElement.getBoundingClientRect().left;
      // every stage stops at the same place, the left edge (only the
      // current one is visible, so nothing waits beside it)
      offsets.current = panels.map((p) => p.offsetLeft);
      version.set(version.get() + 1);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(trackRef.current);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [version]);

  const shiftAt = (p) => {
    const o = offsets.current;
    const seg = 1 / (N - 1);
    const i = Math.min(N - 2, Math.floor(p / seg));
    const local = (p - i * seg) / seg; // 0..1 between stage i and i+1
    const h = HOLD / seg;
    if (local <= h) return o[i];
    if (local >= 1 - h) return o[i + 1];
    return o[i] + (o[i + 1] - o[i]) * smooth((local - h) / (1 - 2 * h));
  };

  const transform = useTransform([scrollYProgress, version], ([p]) => `translate3d(${-shiftAt(p).toFixed(1)}px, 0, 0)`);
  const railFill = useTransform(scrollYProgress, (p) => `scaleX(${p.toFixed(4)})`);

  useMotionValueEvent(scrollYProgress, 'change', (p) => setActive(Math.round(p * (N - 1))));

  return (
    <div className="process" ref={ref} style={{ '--count': N }}>
      {logoDesign.stages.map((s, i) => (
        <span
          key={s.title}
          id={`ct1-stage-${i + 1}`}
          className="process__marker"
          data-stop=""
          data-label={`${logoDesign.stopLabels.process} · ${s.title}`}
          style={{ '--at': i / (N - 1) }}
        />
      ))}
      <div className="process__sticky">
        <div className="process__viewport">
          <motion.ol className="process__track" ref={trackRef} style={{ transform }}>
            {logoDesign.stages.map((s, i) => (
              <li key={s.title} className="stage" data-active={i === active} data-kind={STAGE_VISUALS[i].kind}>
                <StageCopy index={i} />
                <div className="stage__visual">
                  <StageVisual index={i} />
                </div>
              </li>
            ))}
          </motion.ol>
        </div>

        <nav className="process__rail" aria-label="Logo process stages">
          <span className="process__rail-line" aria-hidden="true">
            <motion.span className="process__rail-fill" style={{ transform: railFill }} />
          </span>
          <ol>
            {logoDesign.stages.map((s, i) => (
              <li key={s.title}>
                <button
                  type="button"
                  aria-current={i === active ? 'step' : undefined}
                  onClick={() => scrollTo(`#ct1-stage-${i + 1}`)}
                >
                  <span className="process__dot" aria-hidden="true" />
                  {s.title}
                </button>
              </li>
            ))}
          </ol>
        </nav>
      </div>
    </div>
  );
}

// Phone: the same stages, stacked.
function ProcessStack() {
  return (
    <ol className="process-stack">
      {logoDesign.stages.map((s, i) => (
        // each stage is its own stop (the same ids as the timeline's markers),
        // so with reduced motion the deck keeps all 30 stops
        <li
          key={s.title}
          id={`ct1-stage-${i + 1}`}
          className="stage stage--stacked frame"
          data-stop=""
          data-label={`${logoDesign.stopLabels.process} · ${s.title}`}
          data-active="true"
          data-kind={STAGE_VISUALS[i].kind}
        >
          <StageCopy index={i} />
          <div className="stage__visual">
            <StageVisual index={i} />
          </div>
        </li>
      ))}
    </ol>
  );
}

// ── 2. Final marks ───────────────────────────────────────────

function FinalMarks() {
  const markRef = useRef(null);
  return (
    <div className="marks" id="ct1-marks" data-stop="" data-label={logoDesign.stopLabels.marks}>
      {/* the process ends here: the final mark, as both logos */}
      <div className="marks__head">
        <h2 className="ct1__subheading">{logoDesign.marksHeading}</h2>
        <p className="marks__text">{logoDesign.marksText}</p>
      </div>
      <div className="marks__grid">
        <figure className="marks__card marks__card--primary">
          <div className="marks__art">
            <div className="marks__primary" ref={markRef}>
              <LogoMark label="Dewology primary logo" />
            </div>
          </div>
          <figcaption>
            <strong>{logoDesign.primary.title}</strong>
            <span>{logoDesign.primary.text}</span>
          </figcaption>
        </figure>
        <figure className="marks__card">
          <div className="marks__art marks__art--secondary">
            <Wordmark label="Dewology secondary logo: the mark as the D, followed by EWOLOGY" />
          </div>
          <figcaption>
            <strong>{logoDesign.secondary.title}</strong>
            <span>{logoDesign.secondary.text}</span>
          </figcaption>
        </figure>
      </div>
    </div>
  );
}

// ── 3. Gestalt explainer ─────────────────────────────────────
// Follows IT-WS06 Lesson 3.1:
//  Figure-ground: a form is seen as figure, its surroundings as ground;
//                 it uses negative space (the dark gaps draw the face).
//  Closure:       people fill in gaps to see a whole (3 shapes → 1 head).
//  Continuity:    the eye moves from one element and continues to the next
//                 (drop → hair → EWOLOGY, as in typography-based logos).

// The explainer's canvas: the mark plus room around it for labels.
const VB = { x: -150, y: -30, w: 640, h: 790 };
const VIEWBOX = `${VB.x} ${VB.y} ${VB.w} ${VB.h}`;
const LABEL = { fill: '#6D1D28', fontFamily: 'Montserrat', fontSize: 26, fontWeight: 600 };

// The dark gaps between the shapes, built from the logo's own outlines
// (face edge on one side, dewdrop or hair edge on the other) so they fit exactly.
const GAP_FACE_DROP =
  'M202.702 272.854 C202.702 272.854 216.87 295.594 223.303 308.936 C235.675 334.594 242.752 347.457 252.175 375.466 C261.323 402.655 266.311 440.153 266.311 459 C266.311 477.847 284.896 489.595 289.869 496.4 L298.715 507.453 C297.87 448.648 279.522 382.309 242.478 313.873 L221 275 Z';
const GAP_FACE_HAIR =
  'M174.167 207.478 C174.167 207.478 195.942 288.981 181.224 337.762 C169.237 377.493 123.54 427.01 123.54 427.01 C123.54 427.01 80.6358 476.063 65.0116 516.36 C52.2912 549.168 50.3374 570.98 54.8028 605.883 C59.4666 642.337 65.4933 665.588 89.6178 693.312 C106.09 712.242 141.656 731.006 141.656 731.006 L145.114 712.094 C145.114 712.094 116.785 709.458 100 694 C74.3099 670.34 63.706 631.732 61.6157 603.2 C58.2432 557.169 61.136 553.697 71.3024 524.409 C85.2499 484.23 135.17 436.195 135.17 436.195 C135.17 436.195 178.787 387.01 190.141 350.336 C202.702 309.763 202.702 272.854 202.702 272.854 Z';

// The whole head-and-dewdrop the eye completes across the gaps
// (drawn around the shapes in their eased-apart closure positions, with clear space)
const IMPLIED_WHOLE =
  'M206 -16 C262 -10 322 110 334 300 C340 400 326 470 316 500 L304 514 C296 540 292 562 286 590 C280 620 278 640 270 662 C240 726 190 762 125 760 C60 758 18 722 -4 678 C-28 630 -36 560 -20 494 C0 420 58 360 102 300 C128 262 144 232 148 200 C154 150 160 60 206 -16 Z';

function FigureGroundUnder({ uid }) {
  return (
    <g aria-hidden="true">
      <defs>
        <pattern id={`${uid}-hatch`} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="14" stroke="#E8C787" strokeOpacity="0.28" strokeWidth="2" />
        </pattern>
      </defs>
      <rect x={VB.x + 10} y={VB.y + 10} width={VB.w - 20} height={VB.h - 20} rx="18" fill={`url(#${uid}-hatch)`} />
    </g>
  );
}

function Pill({ x, y, w, children }) {
  return (
    <>
      <rect x={x} y={y} width={w} height="44" rx="22" fill="#FAE5E8" stroke="#6D1D28" strokeOpacity="0.5" />
      <text x={x + w / 2} y={y + 29} textAnchor="middle" {...LABEL}>
        {children}
      </text>
    </>
  );
}

function FigureGroundOver() {
  return (
    <g aria-hidden="true">
      {/* the gaps are ground: light them up */}
      <path className="gfig__gap" d={GAP_FACE_DROP} />
      <path className="gfig__gap" d={GAP_FACE_HAIR} />
      <g className="gfig__labels">
        <Pill x={-128} y={70} w={130}>{logoDesign.diagram.ground}</Pill>
        <line x1="300" y1="150" x2="372" y2="112" stroke="#6D1D28" strokeWidth="2.5" />
        <Pill x={372} y={90} w={110}>{logoDesign.diagram.figure}</Pill>
        <line x1="182" y1="326" x2="64" y2="306" stroke="#6D1D28" strokeWidth="2.5" />
        {logoDesign.diagram.gaps.map((line, i) => (
          <text key={line} x="-140" y={282 + i * 32} {...LABEL}>
            {line}
          </text>
        ))}
      </g>
    </g>
  );
}

function ClosureOver() {
  return (
    <g aria-hidden="true">
      <path className="gfig__whole" d={IMPLIED_WHOLE} />
      <g className="gfig__labels">
        <line x1="290" y1="130" x2="356" y2="104" stroke="#6D1D28" strokeOpacity="0.7" strokeWidth="2.5" />
        <text x="362" y="112" {...LABEL}>{logoDesign.diagram.dewdrop}</text>
        <line x1="250" y1="590" x2="356" y2="604" stroke="#6D1D28" strokeOpacity="0.7" strokeWidth="2.5" />
        <text x="362" y="612" {...LABEL}>{logoDesign.diagram.face}</text>
        <line x1="22" y1="560" x2="-58" y2="600" stroke="#6D1D28" strokeOpacity="0.7" strokeWidth="2.5" />
        <text x="-140" y="630" {...LABEL}>{logoDesign.diagram.hair}</text>
        <text x="362" y="720" {...LABEL} fill="#7E5733">
          {logoDesign.diagram.whole}
        </text>
      </g>
    </g>
  );
}

// Continuity is shown on the secondary logo (mark + EWOLOGY), 936 × 398.
// The line starts at the top of the dewdrop, sweeps down the hair, curves
// under the mark and runs on under the letters to the Y.
const FLOW_PATH = 'M100 6 C56 70 -8 200 -10 300 C-12 368 30 412 94 412 C150 412 184 362 210 338 L908 338';

function ContinuityFigure() {
  return (
    <svg className="gfig__wide" viewBox="-24 -16 960 448" role="img" aria-label="The Dewology secondary logo with a line flowing from the dewdrop, down the hair and into the word EWOLOGY">
      <Wordmark label={null} x="0" y="0" width="936" height="398" />
      <path className="gfig__flow" d={FLOW_PATH} pathLength="1" />
      <circle className="gfig__flow-start" cx="100" cy="6" r="9" />
      <path className="gfig__flow-head" d="M896 326 L920 338 L896 350 Z" />
    </svg>
  );
}

// One principle drawn on the logo. `active` starts its animation.
function GestaltFigure({ mode, active, withLens = false }) {
  const current = logoDesign.gestalt.find((g) => g.id === mode);
  if (mode === 'continuity') {
    return (
      <div className={`gfig gfig--wide${active ? ' is-active' : ''}`} data-mode={mode}>
        <ContinuityFigure />
      </div>
    );
  }
  return (
    <div className={`gfig${active ? ' is-active' : ''}`} data-mode={mode}>
      <LogoMark
        className="gfig__mark"
        viewBox={VIEWBOX}
        label={`Dewology logo showing ${current.title.toLowerCase()}`}
        partProps={{ drop: { className: 'gp gp--drop' }, face: { className: 'gp gp--face' }, hair: { className: 'gp gp--hair' } }}
        renderUnderlay={(uid) => (mode === 'figure-ground' ? <FigureGroundUnder uid={uid} /> : null)}
        renderOverlay={() => (mode === 'figure-ground' ? <FigureGroundOver /> : <ClosureOver />)}
      />
      {withLens && mode === 'figure-ground' && <Lens />}
    </div>
  );
}

function Gestalt() {
  const wide = useMediaQuery('(min-width: 900px)');
  return (
    <div className="gestalt" id="ct1-gestalt">
      {wide ? <GestaltSticky /> : <GestaltStack />}
    </div>
  );
}

const PRINCIPLES = logoDesign.gestalt;

// On the TV stops the headline is the principle being shown ("Figure-ground"),
// the rubric's own word; the stacked phone version keeps the general heading
function GestaltHead({ title = logoDesign.gestaltHeading }) {
  return (
    <div className="gestalt__head">
      <h2 className="ct1__subheading">{title}</h2>
      <p className="gestalt__intro">{logoDesign.gestaltIntro}</p>
    </div>
  );
}

// Desktop / TV: the figure stays put while scrolling (or → / Page Down)
// moves through the three principles, one presentation stop each.
function GestaltSticky() {
  const ref = useRef(null);
  const { scrollTo } = useSite();
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });

  useMotionValueEvent(scrollYProgress, 'change', (p) => setActive(Math.round(p * (PRINCIPLES.length - 1))));

  const mode = PRINCIPLES[active];

  return (
    <div className="gestalt-scroll" ref={ref} style={{ '--count': PRINCIPLES.length }}>
      {PRINCIPLES.map((g, i) => (
        <span
          key={g.id}
          id={`ct1-gestalt-${g.id}`}
          className="gestalt-scroll__marker"
          data-stop=""
          data-label={`${logoDesign.stopLabels.gestalt} · ${g.title}`}
          style={{ '--at': i / (PRINCIPLES.length - 1) }}
        />
      ))}
      <div className="gestalt-scroll__sticky">
        <div className="gestalt__stage">
          <AnimatePresence initial={false}>
            <motion.div
              key={mode.id}
              className="gestalt__layer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              transition={{ duration: reduce ? 0.15 : 0.25, ease: 'easeOut' }}
            >
              <GestaltFigure mode={mode.id} active withLens />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="gestalt__controls">
          <GestaltHead title={mode.title} />
          <div className="gestalt__buttons" role="group" aria-label="Gestalt principles">
            {PRINCIPLES.map((g) => (
              <button
                key={g.id}
                type="button"
                className="gestalt__button"
                aria-pressed={mode.id === g.id}
                onClick={() => scrollTo(`#ct1-gestalt-${g.id}`)}
              >
                {g.title}
              </button>
            ))}
          </div>
          <p className="gestalt__text" aria-live="polite">
            {mode.text}
          </p>
          {/* Always takes its space (hidden on the other principles), so the
              heading stays put when switching */}
          <p className="gestalt__hint" data-show={mode.id === 'figure-ground'} aria-hidden={mode.id !== 'figure-ground'}>
            {logoDesign.lensHint}
          </p>
        </div>
      </div>
    </div>
  );
}

// Phone: the three principles stacked, each with its own figure.
function GestaltStack() {
  return (
    <>
      <GestaltHead />
      <ol className="gestalt-stack">
        {PRINCIPLES.map((g) => (
          <GestaltStackItem key={g.id} principle={g} />
        ))}
      </ol>
    </>
  );
}

function GestaltStackItem({ principle }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  return (
    <li className="gestalt-stack__item" ref={ref}>
      <h3 className="gestalt-stack__title">{principle.title}</h3>
      <p className="gestalt__text">{principle.text}</p>
      <div className="gestalt__stage">
        <GestaltFigure mode={principle.id} active={inView} withLens />
      </div>
    </li>
  );
}

// A dew-drop magnifier you can drag over the logo (mouse, touch or arrow keys).
const ZOOM = 2.3;

// When the figure-ground stop opens, the lens tours both gaps once on its
// own, so the demo works hands-free while presenting (logo units).
const TOUR = [
  { x: 410, y: 560 }, // rest: parked on the paper beside the chin (on the head it read as headphones)
  { x: 178, y: 345, hold: 650 }, // over to the gap between hair and face
  { x: 250, y: 388, hold: 750 }, // across to the gap between face and dewdrop
  { x: 410, y: 560 }, // back to rest
];
const TOUR_MOVES = [1100, 900, 1200]; // ms for each move
const TOUR_DELAY = 600; // let the stop settle first

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

function Lens() {
  const lensRef = useRef(null);
  const reduce = useReducedMotion();
  const inView = useInView(lensRef, { amount: 0.9 });
  const [pos, setPos] = useState(null); // lens centre in px, inside the stage
  const [size, setSize] = useState({ w: 0, h: 0, r: 80 });
  const drag = useRef(null);
  const toured = useRef(false);
  const grabbed = useRef(false); // once someone moves the lens, no more touring
  const stopTour = useRef(() => {});
  const mark = useMemo(() => <LogoMark viewBox={VIEWBOX} decorative />, []);

  const toPx = (p, w, h) => ({ x: ((p.x - VB.x) / VB.w) * w, y: ((p.y - VB.y) / VB.h) * h });

  useEffect(() => {
    const stage = lensRef.current?.parentElement;
    if (!stage) return undefined;
    const measure = () => {
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      const r = Math.round(Math.min(90, Math.max(56, w * 0.14)));
      setSize({ w, h, r });
      // start parked beside the face, below the labels on the right
      setPos((p) => p ?? toPx(TOUR[0], w, h));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);

  // The hands-free tour: once per visit, skipped for reduced motion,
  // and stopped the moment someone grabs the lens
  useEffect(() => {
    if (!inView || reduce || grabbed.current || toured.current || size.w === 0) return undefined;
    toured.current = true;
    let done = false;
    const moves = [];
    let at = TOUR_DELAY;
    for (let i = 0; i < TOUR.length - 1; i++) {
      moves.push({ from: toPx(TOUR[i], size.w, size.h), to: toPx(TOUR[i + 1], size.w, size.h), start: at, end: at + TOUR_MOVES[i] });
      at += TOUR_MOVES[i] + (TOUR[i + 1].hold || 0);
    }
    const t0 = performance.now();
    let raf = 0;
    const step = (now) => {
      const t = now - t0;
      let p = moves[moves.length - 1].to;
      for (const m of moves) {
        if (t < m.start) {
          p = m.from;
          break;
        }
        if (t <= m.end) {
          const k = easeInOut((t - m.start) / (m.end - m.start));
          p = { x: m.from.x + (m.to.x - m.from.x) * k, y: m.from.y + (m.to.y - m.from.y) * k };
          break;
        }
      }
      setPos(p);
      if (t < at) raf = requestAnimationFrame(step);
      else done = true;
    };
    raf = requestAnimationFrame(step);
    stopTour.current = () => cancelAnimationFrame(raf);
    return () => {
      cancelAnimationFrame(raf);
      if (!done) toured.current = false; // interrupted (not by a person): may run again
    };
  }, [inView, reduce, size.w, size.h]);

  // A drag that is interrupted (window switch) never leaves the lens stuck
  useEffect(() => {
    const release = () => {
      drag.current = null;
    };
    window.addEventListener('blur', release);
    return () => window.removeEventListener('blur', release);
  }, []);

  const clamp = (p) => ({ x: Math.max(0, Math.min(size.w, p.x)), y: Math.max(0, Math.min(size.h, p.y)) });

  // A click or drag never gives the lens keyboard focus, so → / ← always
  // keep moving the presentation. Keyboard users reach it with Tab.
  const letGo = () => {
    drag.current = null;
    if (document.activeElement === lensRef.current) lensRef.current.blur();
  };
  const onPointerDown = (e) => {
    if (drag.current) return; // a second finger never takes over the drag
    e.preventDefault();
    grabbed.current = true;
    stopTour.current();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, start: pos };
  };
  const onPointerMove = (e) => {
    if (!drag.current || e.pointerId !== drag.current.id) return;
    const { sx, sy, start } = drag.current;
    setPos(clamp({ x: start.x + e.clientX - sx, y: start.y + e.clientY - sy }));
  };
  const onPointerEnd = (e) => {
    if (drag.current && e.pointerId !== drag.current.id) return;
    letGo();
  };
  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.currentTarget.blur(); // hand the arrow keys back to the presentation
      return;
    }
    const step = e.shiftKey ? 40 : 14;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!d) return;
    e.preventDefault();
    grabbed.current = true;
    stopTour.current();
    setPos((p) => clamp({ x: p.x + d[0], y: p.y + d[1] }));
  };

  const ready = pos && size.w > 0;
  const { r } = size;

  return (
    <div
      ref={lensRef}
      className="lens"
      role="slider"
      tabIndex={0}
      aria-label={logoDesign.lensLabel}
      aria-valuetext={ready ? `${Math.round((pos.x / size.w) * 100)}% across, ${Math.round((pos.y / size.h) * 100)}% down` : undefined}
      style={ready ? { width: r * 2, height: r * 2, transform: `translate3d(${pos.x - r}px, ${pos.y - r}px, 0)` } : { opacity: 0 }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onLostPointerCapture={onPointerEnd}
      onKeyDown={onKeyDown}
    >
      {ready && (
        <div
          className="lens__inner"
          style={{ width: size.w * ZOOM, height: size.h * ZOOM, transform: `translate3d(${r - pos.x * ZOOM}px, ${r - pos.y * ZOOM}px, 0)` }}
        >
          {mark}
        </div>
      )}
      <span className="lens__shine" aria-hidden="true" />
    </div>
  );
}

// ── 4. Palette and type ──────────────────────────────────────

function PaletteType() {
  return (
    <div className="ct1-palette frame" id="ct1-palette" data-stop="" data-label={logoDesign.stopLabels.palette}>
      <h2 className="ct1__subheading">{logoDesign.paletteHeading}</h2>
      <Swatches swatches={logoDesign.palette} />
      <FontSpecimen items={logoDesign.typography} />
    </div>
  );
}
