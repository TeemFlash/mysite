# Temirlan Zhumakpayev - my life

Bilingual React + TypeScript + Vite portfolio. English by default, Russian through the language selector. The site uses its existing light design, vinyl introduction, name animation and interactive cells.

## Local development

Use a current Node.js LTS release compatible with Vite (22.12+).

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:4173/. The root redirects to `/experience/`, retaining query parameters and anchors. The old Python source server is no longer the development command.

## Build and host

```sh
npm run build
npm run preview
```

The production site is in `dist/`. Vercel and Netlify configuration is included: build command `npm run build`, publish directory `dist`. Import the repository on either host. No server-side application or secrets are required.

For GitHub Pages under `/mysite/`:

```sh
npm run build:pages
```

`.github/workflows/deploy.yml` builds and publishes `dist/` on every push to `main`. GitHub Pages uses GitHub Actions as its deployment source. The live site is https://teemflash.github.io/mysite/. Both HTML entry points are built, so `/experience/` opens directly without SPA fallback rewrites. Vite adjusts imported image/font/CSS URLs for the configured base path ([official build documentation](https://vite.dev/guide/build.html)).

## Code layout

- `src/App.tsx`: React page composition.
- `src/components/Portfolio.tsx`: player, introduction, About, Skills, projects and contacts.
- `src/components/SceneCells.tsx`: synchronizes cells with scene visibility and language.
- `src/main.tsx`: imports styles in the accepted order and starts the existing controllers.
- `experience/`: existing styles, source assets and animation controllers.
- `assets/`: local Golos fonts and license.
- `docs/component-sources/`: supplied originals/references, not runtime code.
- `tests/`: Python Playwright checks; install Playwright and Chromium in your Python environment.

The `@/` import alias points to `src/`. Tailwind and shadcn are not installed; existing styling uses native CSS. Add them only when a chosen component requires them.

## Migration boundary

React renders every section and owns the interactive cells. The existing player, translation, contact morph and Canvas controllers attach once after the DOM commit. Their algorithms are intentionally retained, not rewritten into hooks. They own their respective DOM nodes for the lifetime of this page. Do not add React state updates inside those sections or SPA route unmounts without first migrating their event handlers/cleanup. Vite uses full-page reloads for component edits instead of React Fast Refresh, to avoid duplicate controller listeners.

## Checks

```sh
npm run typecheck
python tests/smoke.py
python tests/theme.py
python tests/name-murmuration.py
```

Tests default to http://127.0.0.1:4173. Set `SITE_URL` to check a production preview (including a base path). The name test injects a controllable clock into the unbundled module and therefore runs against the Vite development server.

Projects are illustrative placeholders. Music uses an external Apple Music preview; availability depends on that service.
