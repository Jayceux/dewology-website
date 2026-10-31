import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

// Dev-only helper for the product studio (studio.html): it POSTs each
// rendered product image here and it is saved into public/assets/products/.
// Not part of the built website.
function saveRenders() {
  const outDir = path.resolve('public/assets/products');
  return {
    name: 'dewology-save-renders',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__save-render', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end();
          return;
        }
        const name = new URL(req.url, 'http://localhost').searchParams.get('name') || '';
        if (!/^[a-z0-9-]+\.(webp|png|json|glb)$/.test(name)) {
          res.statusCode = 400;
          res.end('bad name');
          return;
        }
        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => {
          // Images go to public/; layout data (JSON) goes to src/data/ so the site can import it
          const dir = name.endsWith('.json') ? path.resolve('src/data') : outDir;
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(path.join(dir, name), Buffer.concat(chunks));
          res.end('saved');
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), saveRenders()],
  server: { port: 5173, host: true },
  preview: { port: 4173 },
  // three.js (the hero's 3D bottle) is a ~620 kB chunk loaded on demand, never up front
  build: { chunkSizeWarningLimit: 700 },
});
