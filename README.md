# digi-id-io

Source for [www.digi-id.io](https://www.digi-id.io) — the home of Digi-ID, passwordless authentication powered by DigiByte.

The site is static HTML built with Tailwind CSS, PostHTML partials and small ES modules, and is deployed to GitHub Pages from `_site/`.

## Develop

Requires Node.js 22+.

```sh
npm ci
npm run dev        # build, watch and serve at http://localhost:8080
npm run build      # production build -> _site/
npm test           # data lint + unit tests (packages/digiid-core)
npm run test:e2e   # Playwright + axe against _site/ (run `npx playwright install chromium` once)
npm run lighthouse # Lighthouse budgets for / and /developers.html
npm run verify     # every launch gate above, in order
npm run images     # regenerate app icons and social preview images after title or logo changes
```

| Path | What it is |
| --- | --- |
| `src/pages/` | Pages (JSON front matter + HTML). `legacy/` holds redirect stubs published at the site root. |
| `src/partials/` | Layout, head, header, footer and shared blocks |
| `src/snippets/` | Code samples, highlighted at build time |
| `src/data/` | `sdks.json`, `guides.json`, `use-cases.json`, `ecosystem.json` (+ schema), `site.json` |
| `src/js/` | Browser modules (`site.js`, `demo.js`, `playground.js`) |
| `src/css/app.css` | Tailwind entry with brand tokens and light/dark themes |
| `packages/digiid-core/` | Digi-ID URI, key derivation, signing and verification (used by the demo and playground; published to npm as `digiid-core` by tagging `digiid-core-v<version>`) |

## Add your project to the ecosystem

Open an [ecosystem submission issue](../../issues/new?template=ecosystem-submission.yml), or add an entry to `src/data/ecosystem.json` with a logo in `assets/images/ecosystem/` and open a pull request. CI validates entries against `src/data/ecosystem.schema.json`.
