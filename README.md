# Temirlan Zhumakpayev — my life

Current bilingual portfolio prototype. English by default; Russian via the language selector.

## Run

From this directory:

```sh
python -m http.server 4173 --bind 127.0.0.1
```

Open http://127.0.0.1:4173/ . The root redirects to `/experience/` and preserves query parameters and anchors.
No npm, React build, or node_modules are required.

## Layout

- `experience/`: current page, styles, native JavaScript, player and heart assets.
- `experience/base.css`: shared base stylesheet formerly stored in concept-02.
- `experience/vendor/trail-shader.js`: runtime lightning shader.
- `assets/`: local Golos fonts and their license.
- `docs/`: current sources, cleanup manifest and verification results.
- `docs/component-sources/`: reference component originals and licenses; not runtime modules.
- `tests/`: browser smoke test (Python + Playwright + Chromium required).
- `graphify-out/`: dependency graph and report.
- `.specify/`, `.agents/`: retained Spec Kit configuration and project skills.

Edit content in `experience/index.html`; translations also live in scene.js, profile.js, language.js and contact.js. Projects are illustrative placeholders. Music streams an Apple Music preview after interaction; no track is bundled.
