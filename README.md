# Dewology

Brand portfolio website for **Dewology**, a skincare starter brand made by students, for students.
Final requirement of **BSIT 4D, Group 2**.

> Start smart. Glow naturally.

## What's inside

The site walks through the four graded parts, in order:

| Part | What it shows |
|---|---|
| Business concept | Our history, mission and vision, the founders, the five sample products and the Starter Kit |
| CT#1 Logo design | From a single drop through draft sketches 1 and 2 to the final mark; primary and secondary logos; Gestalt figure-ground, closure and continuity; palette and type |
| CT#2 First brand post | The Instagram post with its exact caption, palette and type |
| CT#3 Promotional poster | The poster, palette and type |

## Presenting

Made for a laptop connected to a TV (1920 × 1080).

- **→** or **Page Down**: next stop. **←** or **Page Up**: previous stop.
- The opening animation plays once per visit. Add `?intro` to the address to play it again.
- Turning on "reduce motion" on the computer shows everything without animation.

## Run it on your computer

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

`npm run build` makes the finished site in `dist/`. `npm run present-offline` builds it and opens it without needing the internet.

## Editing

- **All the words** on the site are in [`src/content.js`](src/content.js). Change the text between the quotes and save.
- **Founder photos** go in [`public/assets/owners/`](public/assets/owners/) with these names: `azhlee-badua.jpg`, `ross-gundran.jpg`, `jc-luy.jpg`, `michaella-ramos.jpg`. Until a photo is there, the site shows the person's initials.
- **Colours, fonts and sizes** are in [`src/styles/tokens.css`](src/styles/tokens.css).

## How it's built

| Folder | What's in it |
|---|---|
| `src/sections/` | One file per part of the page: `Hero`, `Concept`, `Routine`, `LogoDesign`, `BrandPost`, `Poster` |
| `src/components/` | Shared pieces: menu, footer (closing frame), progress drop, logo, badges, swatches, type specimens |
| `src/lib/` | Presentation keys and smooth scrolling (`site.jsx`), the live 3D Glow Serum (`heroScene.js`), logo shapes |
| `src/studio/` + `studio.html` | The product studio that rendered the bottle images and the 3D model |
| `public/assets/` | The group's own artwork: logos, sketches, product renders, brand post, poster |

Built with [Vite](https://vite.dev), [React](https://react.dev), [Motion](https://motion.dev), [Lenis](https://lenis.dev) and [three.js](https://threejs.org).

## Group 2

Azhlee Kyree S. Badua · Ross Christian F. Gundran · Jc O. Luy · Michaella Nicole A. Ramos

Instagram: [@jayceux](https://www.instagram.com/jayceux/)
