// ─────────────────────────────────────────────────────────────
//  DEWOLOGY SITE CONTENT
//  Every piece of text on the website lives in this one file.
//  Edit the words between the quotes, save, and the site updates.
//  Keep the quotes and commas; only change the text inside them.
// ─────────────────────────────────────────────────────────────

export const brand = {
  name: 'Dewology',
  tagline: 'Start smart. Glow naturally.',
  handle: 'dewology.ph',
};

// Menu at the top of the page (id = the section it jumps to)
export const nav = [
  { id: 'concept', label: 'Concept' },
  { id: 'logo', label: 'Logo' },
  { id: 'brand-post', label: 'Brand post' },
  { id: 'poster', label: 'Poster' },
];

export const hero = {
  intro: 'Five essentials. One easy routine. Skincare made by students, for students.',
  button: 'See the routine',
  skip: 'Skip intro',
  // Read aloud by screen readers for the 3D bottle (and the photo fallback)
  productAlt: 'Dewology Glow Serum: a pink glass dropper bottle with a gold collar',
};

// ── 1. BUSINESS CONCEPT ──────────────────────────────────────

// Badges: the words before the colon go in the filled pill.
export const story = {
  label: 'Business concept: Our history',
  // The "loud" things that get crossed out
  loud: ['10-step routines', 'Viral hacks', 'Pricey bottles'],
  heading: 'Made by students, for students.',
  body: 'Skincare got loud. Four BSIT 4D students saw how hard it was just to start. So we built Dewology: five essentials, one easy routine, packed into a single Starter Kit.',
};

export const mission = {
  label: 'Mission',
  text: 'To offer accessible, budget-friendly skincare that builds healthy habits.',
};

export const vision = {
  label: 'Vision',
  text: 'To become the go-to essentials brand for skincare beginners.',
};

// Photos go in public/assets/owners/ with these exact file names.
// If a photo is missing, the site shows the initials instead.
export const owners = {
  heading: 'The founders',
  intro: 'Four BSIT 4D students who wanted skincare to feel simple again.',
  people: [
    { name: 'Azhlee Kyree S. Badua', initials: 'AB', photo: '/assets/owners/azhlee-badua.jpg' },
    { name: 'Ross Christian F. Gundran', initials: 'RG', photo: '/assets/owners/ross-gundran.jpg' },
    { name: 'Jc O. Luy', initials: 'JL', photo: '/assets/owners/jc-luy.jpg' },
    { name: 'Michaella Nicole A. Ramos', initials: 'MR', photo: '/assets/owners/michaella-ramos.jpg' },
  ],
};

export const routine = {
  label: 'Business concept: Sample products',
  heading: 'The five-step routine',
  intro: 'Day and night, all skin types. Each step does one job, in this order.',
  products: [
    { id: 'cleanser', step: 1, name: 'Gentle Cleanser', text: 'Washes away dirt without stripping skin.', image: '/assets/products/cleanser.webp' },
    { id: 'toner', step: 2, name: 'Balancing Toner', text: 'Preps and balances skin.', image: '/assets/products/toner.webp' },
    { id: 'serum', step: 3, name: 'Glow Serum', text: 'For a natural, dewy glow.', image: '/assets/products/serum.webp' },
    { id: 'moisturizer', step: 4, name: 'Barrier Moisturizer', text: 'Locks in hydration.', image: '/assets/products/moisturizer.webp' },
    { id: 'sunscreen', step: 5, name: 'Daily Sunscreen', text: 'Everyday protection.', image: '/assets/products/sunscreen.webp' },
  ],
};

export const starterKit = {
  name: 'Dewology Starter Kit',
  text: 'All five steps in one box. Day and night, all skin types.',
  openButton: 'Open the box',
  closeButton: 'Close the box',
};

// ── 2. LOGO DESIGN (CT#1) ────────────────────────────────────

export const logoDesign = {
  label: 'CT#1 Logo design',
  heading: 'From a single drop.',
  intro: 'How the Dewology mark was made, draft by draft, from draft sketches 1 and 2.',
  stages: [
    { title: 'A single drop', text: 'Where it started: one simple dewdrop.' },
    { title: 'Color tests', text: 'Red and black, pink, then gold.' },
    { title: 'Three wordmarks', text: 'Three “DEWOLOGY” type options.' },
    { title: 'Face profiles', text: 'Purple, pink and black, black and red, green.' },
    { title: 'Final mark', text: 'A dewdrop and a woman’s profile in one gold gradient.' },
  ],
  marksHeading: 'The final marks',
  primary: { title: 'Primary logo', text: 'Gold dewdrop and face mark on black.' },
  secondary: { title: 'Secondary logo', text: 'The mark becomes the “D”, followed by “EWOLOGY”.' },
  gestaltHeading: 'How the mark works',
  gestaltIntro: 'Three Gestalt principles, each shown on the logo.',
  lensHint: 'The gaps are lit up here. Drag the dew drop over one to see it as it really is.',
  // Words drawn on the Gestalt diagrams
  diagram: {
    ground: 'Ground',
    figure: 'Figure',
    gaps: ['Gaps = ground,', 'they draw', 'the face'],
    dewdrop: '1 Dewdrop',
    face: '2 Face',
    hair: '3 Hair',
    whole: '= one head',
  },
  // Read aloud for the magnifier (screen readers)
  lensLabel: 'Magnifying dew drop. Drag it, or use the arrow keys, to look closer. Escape lets go of it.',
  paletteHeading: 'Palette and type',
  // Wording follows the IT-WS06 Lesson 3.1 definitions.
  gestalt: [
    {
      id: 'figure-ground',
      title: 'Figure-ground',
      text: 'The eye separates the gold shapes (the figure) from the dark background (the ground). The thin dark gaps between the shapes are ground too, and they draw the outline of the face.',
    },
    {
      id: 'closure',
      title: 'Closure',
      text: 'The mark is three separate shapes: a dewdrop, a face and a sweep of hair. The eye fills in the gaps between them and sees one whole head and one dewdrop.',
    },
    {
      id: 'continuity',
      title: 'Continuity',
      text: 'The curve flows from the top of the dewdrop, down through the hair, and carries the eye straight into “EWOLOGY”, so the mark is read as the letter D.',
    },
  ],
  palette: [
    { name: 'Black', hex: '#050404' },
    { name: 'Gold', hex: '#E8C787' },
    { name: 'Gold gradient', hex: '#B8894A', gradientFrom: '#E8C787' },
  ],
  typography: [
    { name: 'Trajan Pro', role: 'Logo wordmark', sample: 'DEWOLOGY', fromLogo: true, note: 'Shown from the logo artwork.' },
    { name: 'Montserrat', role: 'Handle and body', sample: 'dewology.ph', family: 'Montserrat' },
  ],
};

// ── 3. FIRST BRAND POST (CT#2) ───────────────────────────────

export const brandPost = {
  label: 'CT#2 First brand post',
  heading: 'Our first post.',
  tagline: 'Every drop. Every step. Matters.',
  image: '/assets/brand-post/ct2-brand-post.png',
  imageLarge: '/assets/brand-post/ct2-brand-post@2x.png',
  account: 'dewology.ph',
  likes: 248, // starting like count in the mockup
  // Shown under the phone: mouse and trackpad, then touch screens
  hint: 'Double-click the photo to like it.',
  hintTouch: 'Double-tap the photo to like it.',
  // Keep the line breaks and emojis exactly as they are.
  caption: `The secret to that "lit from within" glow? ✨
Meet the Dewology Skincare Kit, your everyday essentials for skin that looks fresh, hydrated, and naturally radiant. From tired to dewy, our simple routine is made for all skin types, day and night, to give your skin the care it deserves without the complicated steps.
Dewology—Glowy Skin, Made Natural. 🌿💧
#Dewology`,
  palette: [
    { name: 'Blush / peach', hex: '#E4C7B9' },
    { name: 'Terracotta', hex: '#8B2E16' },
  ],
  typography: [
    { name: 'Poppins SemiBold', role: 'Headline', sample: 'Glowy Skin made natural', family: 'Poppins', weight: 600 },
    { name: 'Cormorant Garamond Italic', role: 'Tagline', sample: 'Every drop. Every step. Matters.', family: 'Cormorant Garamond', italic: true },
  ],
};

// ── 4. PROMOTIONAL POSTER (CT#3) ─────────────────────────────
// Professor's rule: only the poster, palette and typography. No explanation text.

export const poster = {
  label: 'CT#3 Promotional poster',
  image: '/assets/poster/ct3-poster.png',
  imageLarge: '/assets/poster/ct3-poster@2x.png',
  alt: 'Dewology 10.10 Beauty Sale poster: up to 40% off, dewology.ph',
  palette: [
    { name: 'Light pink', hex: '#F3B6BE' },
    { name: 'Pink', hex: '#E98D97' },
    { name: 'Deep pink', hex: '#CF5B6E' },
  ],
  typography: [
    { name: 'Tinos', role: 'Headline and offer', sample: '10.10 Beauty Sale, up to 40% off', family: 'Tinos', weight: 700 },
    { name: 'Montserrat', role: 'Brand handle', sample: 'dewology.ph', family: 'Montserrat' },
  ],
};

// ── FOOTER ───────────────────────────────────────────────────

// The closing frame: the logo builds itself again, then the tagline and
// the group (names come from the founders list above).
export const footer = {
  name: 'Dewology',
  group: 'BSIT 4D · Group 2',
  instagram: { label: '@jayceux', url: 'https://www.instagram.com/jayceux/' },
  // Read aloud after the handle (screen readers)
  instagramNote: ' on Instagram (opens in a new tab)',
};
