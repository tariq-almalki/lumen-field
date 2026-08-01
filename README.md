# Lumen Field

An original Angular + Three.js landing page for a speculative archive of light, weather, and memory.

## Local setup

```bash
npm install
npm start
```

Open `http://localhost:4200/` in a browser.

## Production build

```bash
npm run build
```

The static output is generated in `dist/lumen-field/browser`.

## Deploy to Vercel

Import the project into Vercel. The included `vercel.json` rewrites client-side routes to `index.html`; Vercel can use `npm run build` and the generated Angular output directory.

## Deploy to Netlify

Import the repository into Netlify. The included `netlify.toml` sets the build command, publish directory, and SPA fallback redirect.
