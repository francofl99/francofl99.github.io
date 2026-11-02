# Franco Fernández Lorio · Portfolio

Static portfolio served by GitHub Pages at <https://francofl99.github.io/>.

## Architecture

- `index.html`: complete Spanish HTML, readable without JavaScript.
- `assets/styles.css`: local responsive styling and the approved petrol/cyan/emerald palette.
- `assets/content.js`: Spanish/English copy and eight project case descriptions.
- `assets/app.js`: language/theme preferences, filters and the native project dialog.
- `public/profile.jpeg`: the original portrait, reused locally without a media provider.

There is **no production framework, build step, CDN, analytics, backend or MagicPath dependency**. Node dependencies are for formatting and tests only. The implementation follows the approved Engineering Studio design, revision `467798675628892160`.

### Behavior and accessibility

- ES/EN switches update copy, accessible labels, document language and metadata without replacing the page or losing focus.
- Theme and language use the existing published keys `portfolio-theme` and `portfolio-language`. Prototype keys are accepted as a fallback. Blocked storage does not break the controls.
- The portrait, role and user-supplied experience figures appear once in the header: **15 years programming / 6 years in the industry**. These are editorial values, not inferred start dates or automatically incrementing counters; review them when updating the biography.
- About includes the technical stack and AI-assisted software development, not unsupported claims about model research or training.
- Each project has a semantic article and a single stretched case button. Filters announce the number of visible cases. Cases do not require publishing repository links.
- Native dialog centering is explicit, including with CSS resets. Its header stays visible while content scrolls. Escape, close button and backdrop work; interior padding and selection drags do not dismiss it. Focus and page position are restored.
- Contact uses actual email, LinkedIn and GitHub links, not a simulated form. Without JavaScript, contact links and page content remain usable; unavailable enhancement controls stay disabled.
- The previous `#services` URL fragment is retained as an alias for `#approach`. Other published section fragments remain valid.

## Local preview

No installation is required to serve the production files:

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

Open <http://127.0.0.1:8080/>. Use HTTP rather than `file://` because the enhancement script is a JavaScript module.

For the same files in a static web server container:

```sh
docker build -t franco-portfolio .
docker run --rm -p 127.0.0.1:8080:80 franco-portfolio
```

## Validation

```sh
npm ci
npm run check
npm test
git diff --check
```

The Node/jsdom suite checks content, both translations, preference compatibility, filters, all eight cases, dialog lifecycle, focus restoration, scroll/style cleanup, safe text rendering, links and deployable assets. Native layout/dialog behavior must also be checked in a real browser, including both themes, ES/EN, keyboard interaction and 320px/mobile/tablet/desktop widths. jsdom does **not** provide visual proof.

`.github/workflows/validate.yml` runs checks on Node 22/24 and tests the Docker artifact. The existing GitHub Pages configuration continues publishing `/` from `main`; this PR does not change hosting settings.

## Editing

Copy elements use `data-i18n` (and equivalent accessible-attribute keys). Update their entries in `assets/content.js` and the default Spanish HTML together; the tests verify they agree. Keep project descriptions accurate about supported providers, beta status and safety boundaries. Never add unsourced savings, usage or reliability metrics.

The design export's prototype-only labels and discarded layouts are not part of production. The prior site's unverified generic impact metrics were replaced with the user-approved biography and concrete projects.

## Release / rollback

Merge only the tested PR head after CI passes. Wait for GitHub Pages deployment to complete, then verify the public HTML marker `engineering-studio-v1`, local asset responses and actual browser interactions. A successful merge alone is not deployment proof. Rollback is a normal Git revert of the redesign commit; no database or irreversible migration is involved.
