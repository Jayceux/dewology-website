// What the stage does at each presentation stop. The world is morning
// dew: blush paper in soft studio light, glass dew beads resting on it,
// and still water that the products, the phone, the poster and the logo
// stand in.
//   light    soft pools of light (no edges): an element and point to pin
//            each to, its radius (as a share of the screen height), its
//            tint (LIGHTS) and optionally a squash or a weaker strength
//   beads    dew beads beside the words: an element, a point as fractions
//            of its text's LAST line (so [1.04, 0.5] sits just after the
//            last word), and a radius in px on a 1080 screen. They condense
//            one after another.
//   water    a sheet of still water: the element, the line things stand on
//            (at; atPhoto when the photo stands in for the 3D model), its
//            half width as a share of the element's width (w) and how deep
//            it looks from the front (sq). glowY / glowR place the light (low,
//            behind the bodies, not the caps); glow: false and shade: false turn off that light and
//            the contact shade (for a bare water floor).
//   product  a live 3D product standing in the water: the element, where
//            its base sits, how tall it is (share of the element), and the
//            height in cm that fills that (true sizes)
//   drop     true only on the opening, the four chapter cards and the
//            close: the dewdrop falls once the page is still, into the
//            water (land.water). Every other stop just brings up its
//            light, so the drop stays an event.
//   land     where the dewdrop lands, as an element and a point in its box
//   reveal   the headline that waits for the drop and appears as it lands
//   clear    the light and paint of earlier stops fade away entirely
//   paint    watercolour washes (PIGMENTS), no longer used on any stop
// A stop that is not listed keeps the stage as it is.

// Light tints: what each pool of light mixes the paper towards
export const LIGHTS = {
  soft: [0.988, 0.91, 0.922], // the studio light: a luminous blush, never near-white (white caps must read)
  rose: [0.95, 0.77, 0.81], // a deeper pink pool, for depth beside the light
  warm: [1.0, 0.94, 0.86], // warm and golden, for the logo chapter
  blush: [0.98, 0.88, 0.83], // CT#2's peach blush (#E4C7B9)
  pink: [0.97, 0.8, 0.84], // CT#3's light pink (#F3B6BE)
  // a deeper rose backdrop behind the tops of the products, like a studio
  // sweep: white caps, pumps and droppers read clearly against it
  shade: [0.88, 0.66, 0.73],
};

// Pigments, as the colour each lets through (multiplied onto the paper)
export const PIGMENTS = {
  bottle: [0.92, 0.66, 0.72],
  petal: [0.96, 0.76, 0.81],
  rose: [0.88, 0.6, 0.7],
  gold: [0.96, 0.87, 0.7],
};

export const MODELS = {
  cleanser: '/assets/products/cleanser.glb',
  toner: '/assets/products/toner.glb',
  serum: '/assets/products/serum.glb',
  moisturizer: '/assets/products/moisturizer.glb',
  sunscreen: '/assets/products/sunscreen.glb',
};

// every product stands in the same still water
const STEP_WATER = { anchor: '.steps__stage', at: [0.5, 0.86], w: 0.58, sq: 0.24 };
// Each product has its white part somewhere else, and the deeper backdrop
// sits behind it: the bottles' caps, pump and dropper at the top; the
// jar's lid half-way down; the tube's cap at the bottom, in the water.
// Where the white part is low, the bright light behind is left off.
const step = (id, { shadeAt = [0.5, 0.3], shadeR = 0.42, shadeSq = 1, glow = true } = {}) => ({
  land: { anchor: '.steps__stage', at: [0.5, 0.86] },
  clear: true,
  water: glow ? STEP_WATER : { ...STEP_WATER, glow: false },
  light: [{ anchor: '.steps__stage', at: shadeAt, r: shadeR, squash: shadeSq, tint: 'shade', strength: 0.85 }],
  product: { id, anchor: '.steps__stage', base: [0.5, 0.86], height: 0.78, ref: 20 },
});

// A chapter card: the drop falls onto the title and the words are revealed
// outward from where it hits (see ChapterCard.css), in that chapter's
// light, with dew beside the title
const chapter = (id, tint) => ({
  drop: true,
  reveal: `#${id} .chapter__words`,
  clear: true,
  land: { anchor: `#${id} .chapter__title`, at: [0.3, 0.5] },
  light: [
    { anchor: `#${id} .chapter__title`, at: [0.45, 0.5], r: 0.55, tint },
    { anchor: `#${id} .chapter__num`, at: [0.5, 0.5], r: 0.5, tint: 'rose', strength: 0.55 },
  ],
  beads: [
    { anchor: `#${id} .chapter__title`, at: [1.045, 0.55], r: 17 },
    { anchor: `#${id} .chapter__title`, at: [1.095, 0.18], r: 6.5 },
    { anchor: `#${id} .chapter__title`, at: [1.035, 0.02], r: 4 },
  ],
});

export const STOP_STAGE = {
  home: {
    drop: true,
    // the drop falls into the empty water where the serum stands, and the
    // serum rises out of the rings
    land: { anchor: '.hero__product', at: [0.5, 0.86], water: true },
    clear: true,
    water: { anchor: '.hero__product', at: [0.5, 0.86], atPhoto: [0.5, 0.835], w: 0.58, sq: 0.24 },
    light: [{ anchor: '.hero__product', at: [0.5, 0.3], r: 0.42, tint: 'shade', strength: 0.85 }],
    product: { id: 'serum', anchor: '.hero__product', base: [0.5, 0.86], height: 0.66, ref: 12.6 },
  },
  'chapter-concept': chapter('chapter-concept', 'soft'),
  story: {
    clear: true,
    light: [
      { anchor: '.story__answer', at: [0.4, 0.4], r: 0.5, tint: 'soft' },
      { anchor: '.story__loud', at: [0.45, 0.62], r: 0.42, tint: 'rose', strength: 0.7 },
    ],
    beads: [
      { anchor: '.story__heading', at: [1.05, 0.5], r: 16 },
      { anchor: '.story__heading', at: [1.11, 0.12], r: 6.7 },
      { anchor: '.story__heading', at: [1.04, -0.05], r: 4 },
    ],
  },
  mission: {
    light: [
      { anchor: '.mv', at: [0.35, 0.3], r: 0.5, tint: 'soft' },
      { anchor: '.mv', at: [0.72, 0.78], r: 0.4, tint: 'rose', strength: 0.7 },
    ],
    beads: [
      { anchor: '.mv__text', at: [1.04, 0.5], r: 13.3 },
      { anchor: '.mv__text', at: [1.09, 0.1], r: 5.3 },
    ],
  },
  founders: {
    light: [{ anchor: '.founders__list', at: [0.5, 0.5], r: 0.6, tint: 'soft' }],
  },
  'routine-intro': {
    clear: true,
    // the five products stand in a row in the water, which stirs as they arrive
    // (its back edge fades softly: a crisp line behind a row reads as a table edge)
    water: { anchor: '.routine__lineup', at: [0.5, 0.97], w: 0.46, sq: 0.12, shade: false, glowY: 0.35, glowR: 0.9, back: 0.45 },
    // behind the headline only, so the paper around the caps stays pink
    light: [
      { anchor: '.routine__heading', at: [0.4, 0.5], r: 0.36, tint: 'soft' },
      { anchor: '.routine__lineup', at: [0.5, 0.18], r: 0.4, squash: 0.55, tint: 'shade', strength: 0.7 },
      // and low, behind the jar's lid and the tube's cap
      { anchor: '.routine__lineup', at: [0.7, 0.78], r: 0.3, squash: 0.4, tint: 'shade', strength: 0.55 },
    ],
    beads: [
      { anchor: '.routine__heading', at: [1.05, 0.5], r: 14.6 },
      { anchor: '.routine__heading', at: [1.1, 0.12], r: 6 },
    ],
  },
  'step-1': step('cleanser'),
  'step-2': step('toner'),
  'step-3': step('serum'),
  'step-4': step('moisturizer', { shadeAt: [0.5, 0.6], shadeR: 0.34, shadeSq: 0.75, glow: false }),
  'step-5': step('sunscreen', { shadeAt: [0.5, 0.8], shadeR: 0.3, shadeSq: 0.55, glow: false }),
  'starter-kit': {
    land: { anchor: '.kit__stage', at: [0.5, 0.776] },
    clear: true,
    // a wide, shallow sheet under the box
    water: { anchor: '.kit__stage', at: [0.5, 0.776], w: 0.56, sq: 0.18, glowY: 0.3, glowR: 0.9 },
    light: [{ anchor: '.kit__stage', at: [0.5, 0.42], r: 0.36, squash: 0.7, tint: 'shade', strength: 0.6 }],
  },
  'chapter-logo': chapter('chapter-logo', 'warm'),
  'ct1-stage-1': {
    clear: true,
    light: [{ anchor: '.process__viewport', at: [0.3, 0.5], r: 0.55, tint: 'warm' }],
  },
  'ct1-marks': {
    // each mark in its own warm light
    light: [
      { anchor: '.marks__primary svg', at: [0.5, 0.5], r: 0.38, tint: 'warm' },
      { anchor: '.marks__art--secondary svg', at: [0.5, 0.5], r: 0.4, tint: 'warm' },
    ],
  },
  'ct1-gestalt-figure-ground': {
    light: [{ anchor: '.gestalt__stage', at: [0.5, 0.5], r: 0.5, tint: 'soft' }],
  },
  'ct1-palette': {
    light: [
      { anchor: '.ct1-palette .swatches', at: [0.5, 0.45], r: 0.4, tint: 'warm' },
      { anchor: '.ct1-palette .specimen', at: [0.5, 0.6], r: 0.4, tint: 'soft', strength: 0.8 },
    ],
    beads: [
      { anchor: '.ct1-palette .ct1__subheading', at: [1.05, 0.5], r: 12 },
      { anchor: '.ct1-palette .ct1__subheading', at: [1.1, 0.12], r: 5.3 },
    ],
  },
  'chapter-brand-post': chapter('chapter-brand-post', 'blush'),
  'ct2-post': {
    clear: true,
    // the phone stands in the water
    water: { anchor: '.phone', at: [0.5, 1.0], w: 0.75, sq: 0.16, glow: false },
    light: [
      { anchor: '.ct2__phone-col', at: [0.5, 0.45], r: 0.55, tint: 'blush' },
      { anchor: '.ct2__heading', at: [0.5, 0.5], r: 0.4, tint: 'soft', strength: 0.8 },
    ],
    beads: [
      { anchor: '.ct2__heading', at: [1.04, 0.45], r: 13.3 },
      { anchor: '.ct2__heading', at: [1.085, 0.1], r: 5.3 },
    ],
  },
  'ct2-caption': {
    light: [{ anchor: '.ct2-scroll__sticky', at: [0.5, 0.55], r: 0.6, tint: 'blush' }],
  },
  'chapter-poster': chapter('chapter-poster', 'pink'),
  'ct3-poster': {
    clear: true,
    // the poster stands in the water
    water: { anchor: '.ct3__poster', at: [0.5, 1.0], w: 0.72, sq: 0.16, glow: false },
    light: [
      { anchor: '.ct3__poster', at: [0.5, 0.45], r: 0.6, tint: 'soft' },
      { anchor: '.ct3 .swatches', at: [0.5, 0.5], r: 0.35, tint: 'pink', strength: 0.8 },
    ],
    beads: [
      { anchor: '.ct3__poster', at: [1.045, 0.06], r: 12 },
      { anchor: '.ct3__poster', at: [1.075, 0.1], r: 4.7 },
    ],
  },
  footer: {
    // the finale: the last drop falls into the water at the logo's feet,
    // and the logo rises out of the rings (see Footer.jsx)
    drop: true,
    reveal: '.finale',
    clear: true,
    water: { anchor: '.finale__rise', at: [0.5, 1.0], w: 0.62, sq: 0.12, glow: false, shade: false },
    land: { anchor: '.finale__rise', at: [0.5, 1.05], water: true },
    light: [
      { anchor: '.finale__rise', at: [0.5, 0.5], r: 0.55, tint: 'warm' },
      { anchor: '.finale__tagline', at: [0.5, 0.5], r: 0.4, tint: 'soft', strength: 0.7 },
    ],
  },
};
