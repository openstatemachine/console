# Open State Machine — homepage

The public homepage for the **Open State Machine** project, served at
[openstatemachine.org](https://openstatemachine.org). It's a static
[Astro](https://astro.build) site — HTML/CSS at build time, no client-side JavaScript.

The interactive **OSML sandbox** is no longer part of this site. It now lives in the
**Statum console** at [sandbox.openstatemachine.org](https://sandbox.openstatemachine.org);
this site links out to it.

## Stack

- **Astro** (static output) — pages in `src/pages`, shared shell in `src/layouts`,
  reusable markup in `src/components`, global styles in `src/styles`.
- No framework runtime ships to the browser.

## Structure

```
site/
├─ astro.config.mjs
├─ public/               # static assets served at the site root (favicon, …)
└─ src/
   ├─ layouts/Layout.astro    # <head>, meta/OG tags, fonts, global CSS
   ├─ components/             # Nav.astro, Footer.astro
   ├─ pages/index.astro       # the homepage
   └─ styles/global.css       # design tokens + page styles
```

## Develop

```bash
cd site
npm install
npm run dev      # http://localhost:4321
```

## Build (static)

```bash
npm run build    # type-checks with `astro check`, then outputs to site/dist
npm run preview  # serve the production build locally
```

Deploy the contents of `site/dist` to any static host; the document root serves
`index.html`.
