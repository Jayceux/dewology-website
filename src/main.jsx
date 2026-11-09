import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Fonts are bundled with the site, so it looks the same offline.
import '@fontsource/cinzel/400.css';
import '@fontsource/cinzel/500.css';
import '@fontsource/cinzel/600.css';
import '@fontsource/montserrat/400.css';
import '@fontsource/montserrat/500.css';
import '@fontsource/montserrat/600.css';
import '@fontsource/poppins/600.css';
import '@fontsource/cormorant-garamond/400-italic.css';
import '@fontsource/cormorant-garamond/500-italic.css';
import '@fontsource/cormorant-garamond/700-italic.css';
import '@fontsource/dm-serif-text/400.css';
import 'lenis/dist/lenis.css';

import './styles/tokens.css';
import './styles/global.css';
import App from './App';
import { decideIntro } from './lib/intro';

// Decide before the first paint so nothing flashes in its final position.
decideIntro();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
