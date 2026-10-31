// Where each draft sits inside the original sketch files (in the SVG's own
// units), measured from public/assets/sketches/*.svg. Used to show each draft
// on its own in the CT#1 timeline without redrawing anything.

export const SKETCHES = {
  one: { src: '/assets/sketches/draft-sketch-1.svg', w: 1920, h: 1080, paper: '#ffffff' },
  two: { src: '/assets/sketches/draft-sketch-2.svg', w: 1804, h: 1025, paper: '#B8ADAD' },
};

export const CROPS = {
  // Stage 2: colour tests
  redBlackDrop: { sketch: 'one', box: [932, 221, 248, 344], alt: 'Red and black drop draft' },
  pinkDrop: { sketch: 'one', box: [1509, 216, 256, 344], alt: 'Pink drop draft' },
  goldDrop: { sketch: 'one', box: [1509, 566, 256, 344], alt: 'Gold drop draft' },
  // Stage 3: three DEWOLOGY wordmarks
  wordmarkThin: { sketch: 'one', box: [36, 228, 340, 430], alt: 'Draft with a thin, spaced DEWOLOGY wordmark' },
  wordmarkBold: { sketch: 'one', box: [450, 219, 340, 430], alt: 'Draft with a bold DEWOLOGY wordmark and red O letters' },
  wordmarkSerif: { sketch: 'one', box: [901, 220, 340, 430], alt: 'Draft with a serif DEWOLOGY wordmark' },
  // Stage 4: face-profile versions
  facePurple: { sketch: 'two', box: [70, 160, 411, 800], alt: 'Purple face-profile draft' },
  facePink: { sketch: 'two', box: [480, 160, 411, 800], alt: 'Pink and black face-profile draft' },
  faceRed: { sketch: 'two', box: [890, 160, 411, 800], alt: 'Black and red face-profile draft' },
  faceGreen: { sketch: 'two', box: [1300, 160, 411, 800], alt: 'Green face-profile draft' },
};
