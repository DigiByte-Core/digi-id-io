import { readFile, writeFile, mkdir, rm, cp, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import posthtml from 'posthtml';
import include from 'posthtml-include';
import expressions from 'posthtml-expressions';
import { createHighlighter } from 'shiki';
import * as esbuild from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, '_site');
const PARTIALS = path.join(SRC, 'partials');
const SITE_URL = 'https://www.digi-id.io';
// Set when the site is served from a subpath, e.g. "/digi-id-io" for a GitHub Pages project site.
const BASE_PATH = (process.env.BASE_PATH || '').replace(/\/+$/, '');

const SHIKI_LANGS = ['javascript', 'typescript', 'php', 'bash', 'json', 'http', 'html', 'text'];
const LANG_ALIASES = { js: 'javascript', node: 'javascript', ts: 'typescript', sh: 'bash', txt: 'text', wp: 'php' };
const LANG_NAMES = { javascript: 'JavaScript', typescript: 'TypeScript', php: 'PHP', bash: 'shell', http: 'HTTP', json: 'JSON', html: 'HTML' };

// Icons not shipped by lucide-static (brand marks were removed upstream).
const CUSTOM_ICONS = {
  github: '<path fill="currentColor" stroke="none" d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>',
  telegram: '<path fill="currentColor" stroke="none" d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>'
};

async function walk(dir) {
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full) : [full];
  }));
  return files.flat();
}

async function loadData() {
  const data = {};
  for (const file of await walk(path.join(SRC, 'data'))) {
    if (!file.endsWith('.json') || file.endsWith('.schema.json')) continue;
    const key = path.basename(file, '.json').replace(/-(\w)/g, (_, c) => c.toUpperCase());
    data[key] = JSON.parse(await readFile(file, 'utf8'));
  }
  return data;
}

function parseFrontMatter(source, file) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) throw new Error(`${file}: missing JSON front matter`);
  const meta = JSON.parse(match[1]);
  for (const key of ['title', 'description']) {
    if (!meta[key]) throw new Error(`${file}: front matter requires "${key}"`);
  }
  return { meta, body: source.slice(match[0].length) };
}

function outputPathFor(file) {
  const rel = path.relative(path.join(SRC, 'pages'), file);
  // Legacy redirect stubs are published at the site root under their original names.
  return rel.startsWith(`legacy${path.sep}`) ? rel.slice('legacy'.length + 1) : rel;
}

function toUrlPath(rel) {
  const url = '/' + rel.split(path.sep).join('/');
  return url === '/index.html' ? '/' : url;
}

function iconPlugin(used) {
  return (tree) => {
    tree.match({ tag: 'icon' }, (node) => {
      const { name, class: cls = '', label } = node.attrs || {};
      if (!name) throw new Error('<icon> requires a name attribute');
      used.add(name);
      const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': 'true', focusable: 'false' };
      return {
        tag: 'svg',
        attrs: { class: `icon ${cls}`.trim(), ...a11y },
        content: [{ tag: 'use', attrs: { href: `/assets/icons.svg#${name}` } }]
      };
    });
    return tree;
  };
}

function highlightPlugin(highlighter) {
  return async (tree) => {
    const tabNames = new Map();
    tree.match({ attrs: { role: 'tablist' } }, (list) => {
      const group = list.attrs['aria-label'];
      for (const tab of list.content || []) {
        if (tab?.attrs?.role !== 'tab') continue;
        const name = collectText(tab.content).trim();
        tabNames.set(tab.attrs.id, group ? `${name} code – ${group}` : `${name} code`);
      }
      return list;
    });
    tree.match({ attrs: { role: 'tabpanel' } }, (panel) => {
      const name = tabNames.get(panel.attrs['aria-labelledby']);
      for (const child of panel.content || []) {
        if (name && child?.tag === 'pre') child.attrs['data-copy-name'] = name;
      }
      return panel;
    });
    const jobs = [];
    tree.match({ tag: 'pre', attrs: { 'data-lang': /.+/ } }, (node) => {
      jobs.push(node);
      return node;
    });
    for (const node of jobs) {
      const rawLang = node.attrs['data-lang'];
      const lang = LANG_ALIASES[rawLang] || rawLang;
      if (!SHIKI_LANGS.includes(lang)) throw new Error(`Unsupported code language "${rawLang}"`);
      let code;
      if (node.attrs['data-src']) {
        code = await readFile(path.join(SRC, 'snippets', node.attrs['data-src']), 'utf8');
      } else {
        code = collectText(node.content).replace(/^\n/, '');
      }
      const html = highlighter.codeToHtml(code.trimEnd(), { lang, themes: { light: 'github-light-default', dark: 'github-dark-default' } });
      const label = node.attrs['data-label'];
      const copyName = node.attrs['data-copy-name'] || `${label || LANG_NAMES[lang] || lang} code`;
      node.tag = 'div';
      node.attrs = { class: 'code-block', 'data-code-block': '' };
      node.content = [
        ...(label ? [{ tag: 'div', attrs: { class: 'code-block__label' }, content: [label] }] : []),
        {
          tag: 'button',
          attrs: { type: 'button', class: 'code-block__copy', 'data-copy': '', 'aria-label': `Copy ${copyName}` },
          content: ['Copy']
        },
        html
      ];
    }
    return tree;
  };
}

function collectText(content = []) {
  return content.map((c) => (typeof c === 'string' ? decodeEntities(c) : collectText(c.content))).join('');
}

const NAMED_ENTITIES = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'", nbsp: '\u00a0', hellip: '…', mdash: '—', ndash: '–', rarr: '→' };

function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return NAMED_ENTITIES[e.toLowerCase()] ?? m;
  });
}

function currentLinkPlugin(urlPath) {
  return (tree) => {
    tree.match({ tag: 'a', attrs: { 'data-nav': true } }, (node) => {
      if (node.attrs.href === urlPath) node.attrs['aria-current'] = 'page';
      delete node.attrs['data-nav'];
      return node;
    });
    return tree;
  };
}

function textOf(node) {
  return collectText(typeof node === 'string' ? [node] : node.content).replace(/\s+/g, ' ').trim();
}

// FAQ entries come from <section data-faq>: each <details> (summary = question), or each h3 followed by its answer siblings.
function faqEntries(tree) {
  const entries = [];
  tree.match({ tag: 'section', attrs: { 'data-faq': true } }, (section) => {
    let current = null;
    for (const child of section.content || []) {
      if (typeof child !== 'object') continue;
      if (child.tag === 'details') {
        const parts = (child.content || []).filter((c) => typeof c === 'object');
        const summary = parts.find((c) => c.tag === 'summary');
        const answer = parts.filter((c) => ['p', 'ul', 'ol', 'table'].includes(c.tag)).map(textOf);
        if (summary) entries.push({ question: textOf(summary), answer });
        current = null;
      } else if (child.tag === 'h3') {
        current = { question: textOf(child), answer: [] };
        entries.push(current);
      } else if (current && ['p', 'ul', 'ol', 'table'].includes(child.tag)) {
        current.answer.push(textOf(child));
      }
    }
    delete section.attrs['data-faq'];
    return section;
  });
  return entries.filter((e) => e.answer.length);
}

function structuredDataPlugin(page, urlPath, data) {
  return (tree) => {
    const org = {
      '@type': 'Organization',
      name: 'Digi-ID',
      url: SITE_URL + '/',
      logo: `${SITE_URL}/assets/images/icons/icon-512.png`,
      sameAs: [data.site.github, 'https://www.digibyte.org/', data.site.repo]
    };
    const graph = [];
    if (urlPath === '/') {
      graph.push({ ...org, '@id': `${SITE_URL}/#org` });
      graph.push({ '@type': 'WebSite', '@id': `${SITE_URL}/#website`, name: 'Digi-ID', url: `${SITE_URL}/`, publisher: { '@id': `${SITE_URL}/#org` } });
    }
    if (page.schema === 'TechArticle') {
      graph.push({
        '@type': 'TechArticle',
        headline: page.title.replace(/\s+[–-]\s+Digi-ID$/, '').replace(/^Guide:\s*/, ''),
        description: page.description,
        url: page.url,
        image: SITE_URL + page.ogImage,
        author: org,
        publisher: org
      });
    }
    const faq = faqEntries(tree);
    if (faq.length) {
      graph.push({
        '@type': 'FAQPage',
        mainEntity: faq.map((e) => ({ '@type': 'Question', name: e.question, acceptedAnswer: { '@type': 'Answer', text: e.answer.join(' ') } }))
      });
    }
    if (!graph.length) return tree;
    const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
    tree.match({ tag: 'head' }, (head) => {
      head.content = [...(head.content || []), { tag: 'script', attrs: { type: 'application/ld+json' }, content: [json] }, '\n'];
      return head;
    });
    return tree;
  };
}

function basePathPlugin() {
  const prefix = (url) => (url.startsWith('/') && !url.startsWith('//') ? BASE_PATH + url : url);
  return (tree) => {
    if (!BASE_PATH) return tree;
    tree.walk((node) => {
      if (!node.attrs) return node;
      for (const attr of ['href', 'src', 'action']) {
        if (typeof node.attrs[attr] === 'string') node.attrs[attr] = prefix(node.attrs[attr]);
      }
      if (node.tag === 'meta' && node.attrs['http-equiv'] === 'refresh') {
        node.attrs.content = node.attrs.content.replace(/url=(\/[^\s]*)/, (_, u) => `url=${prefix(u)}`);
      }
      return node;
    });
    return tree;
  };
}

async function buildPages({ highlighter, data, usedIcons }) {
  const layout = await readFile(path.join(PARTIALS, 'layout.html'), 'utf8');
  const pages = (await walk(path.join(SRC, 'pages'))).filter((f) => f.endsWith('.html'));
  const built = [];
  for (const file of pages) {
    const { meta, body } = parseFrontMatter(await readFile(file, 'utf8'), file);
    const rel = outputPathFor(file);
    const urlPath = toUrlPath(rel);
    const page = {
      scripts: [],
      redirect: '',
      noindex: false,
      ogImage: ogImageFor(rel),
      bodyClass: '',
      ...meta,
      url: SITE_URL + (meta.canonical || urlPath),
      path: urlPath
    };
    const locals = { ...data, page, year: new Date().getFullYear() };
    const source = meta.layout === false ? body : layout.replace('<!-- @content -->', body);
    const result = await posthtml([
      expressions({ locals }),
      include({ root: PARTIALS, posthtmlExpressionsOptions: { locals } }),
      iconPlugin(usedIcons),
      highlightPlugin(highlighter),
      currentLinkPlugin(urlPath),
      structuredDataPlugin(page, urlPath, data),
      basePathPlugin()
    ]).process(source, { from: file });
    const dest = path.join(OUT, rel);
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, result.html);
    built.push({ rel, urlPath, page });
  }
  return built;
}

export function pageSlug(rel) {
  return rel.replace(/\.html$/, '').split(path.sep).join('-');
}

function ogImageFor(rel) {
  const file = `assets/images/og/${pageSlug(rel)}.png`;
  return existsSync(path.join(ROOT, file)) ? `/${file}` : '/assets/images/og/index.png';
}

async function writeSeoFiles(pages) {
  const indexable = pages.filter(({ page }) => !page.redirect && !page.noindex);
  const today = new Date().toISOString().slice(0, 10);
  const urls = indexable
    .map(({ urlPath }) => `  <url><loc>${SITE_URL}${urlPath}</loc><lastmod>${today}</lastmod></url>`)
    .join('\n');
  await writeFile(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
  await writeFile(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
  const manifest = {
    name: 'Digi-ID',
    short_name: 'Digi-ID',
    description: 'Passwordless login secured by the DigiByte blockchain.',
    start_url: `${BASE_PATH}/`,
    scope: `${BASE_PATH}/`,
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#002451',
    icons: [
      { src: `${BASE_PATH}/assets/images/icons/icon-192.png`, sizes: '192x192', type: 'image/png' },
      { src: `${BASE_PATH}/assets/images/icons/icon-512.png`, sizes: '512x512', type: 'image/png' },
      { src: `${BASE_PATH}/assets/images/icons/icon-maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  };
  await writeFile(path.join(OUT, 'site.webmanifest'), JSON.stringify(manifest, null, 2));
}

async function buildIcons(used) {
  const symbols = [];
  for (const name of [...used].sort()) {
    let inner = CUSTOM_ICONS[name];
    if (!inner) {
      const file = path.join(ROOT, 'node_modules', 'lucide-static', 'icons', `${name}.svg`);
      if (!existsSync(file)) throw new Error(`Unknown icon "${name}"`);
      const svg = await readFile(file, 'utf8');
      inner = svg.replace(/<!--[\s\S]*?-->/g, '').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').trim();
    }
    symbols.push(`<symbol id="${name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</symbol>`);
  }
  await mkdir(path.join(OUT, 'assets'), { recursive: true });
  await writeFile(path.join(OUT, 'assets', 'icons.svg'), `<svg xmlns="http://www.w3.org/2000/svg">${symbols.join('')}</svg>`);
}

export async function buildJs({ minify = true } = {}) {
  const entries = (await walk(path.join(SRC, 'js'))).filter((f) => path.dirname(f) === path.join(SRC, 'js') && f.endsWith('.js'));
  if (!entries.length) return;
  await esbuild.build({
    entryPoints: entries,
    outdir: path.join(OUT, 'assets', 'js'),
    bundle: true,
    format: 'esm',
    splitting: true,
    // Bundle digiid-core from its TypeScript source instead of the published dist/ build.
    conditions: ['source'],
    target: 'es2022',
    minify,
    sourcemap: !minify,
    logLevel: 'warning'
  });
}

async function copyAssets() {
  const copies = [
    ['assets/scenarium', 'assets/scenarium'],
    ['assets/digidocs', 'assets/digidocs'],
    ['assets/images', 'assets/images'],
    ['assets/fonts/text/nexa/NexaBold.woff2', 'assets/fonts/nexa-bold.woff2'],
    ['assets/fonts/text/nexa/NexaLight.woff2', 'assets/fonts/nexa-light.woff2']
  ];
  for (const weight of [400, 500, 700]) {
    copies.push([`node_modules/@fontsource/roboto/files/roboto-latin-${weight}-normal.woff2`, `assets/fonts/roboto-${weight}.woff2`]);
  }
  for (const [from, to] of copies) {
    const src = path.join(ROOT, from);
    if (!existsSync(src)) continue;
    await cp(src, path.join(OUT, to), { recursive: (await stat(src)).isDirectory() });
  }
  await writeLogoVariants();
  await writeFile(path.join(OUT, '.nojekyll'), '');
}

async function writeLogoVariants() {
  const { light, dark, badge } = logoVariants(await readFile(path.join(ROOT, 'assets', 'scenarium', 'logo.svg'), 'utf8'));
  await writeFile(path.join(OUT, 'assets', 'images', 'logo-light.svg'), light);
  await writeFile(path.join(OUT, 'assets', 'images', 'logo-dark.svg'), dark);
  await writeFile(path.join(OUT, 'favicon.svg'), badge);
}

export function logoVariants(source) {
  // The source canvas is mostly empty space; crop to the artwork bounds (measured via getBBox) so it renders crisp at small sizes.
  const light = source
    .replace(/\swidth="[^"]*"\s+height="[^"]*"/, ' width="5920" height="2230"')
    .replace(/viewBox="[^"]*"/, 'viewBox="45 575 5920 2230"')
    .replace(/\senable-background="[^"]*"/, '');
  let seen = 0;
  // The first navy fill is the badge background; the rest form the wordmark, which must turn white on dark surfaces.
  const dark = light.replace(/fill="#002352"/g, (m) => (seen++ === 0 ? m : 'fill="#FFFFFF"'));
  // Badge only (no wordmark): the circle spans roughly x 75-2244, y 605-2775 in the source.
  const badge = light.replace(/\swidth="[^"]*"\s+height="[^"]*"/, ' width="64" height="64"').replace(/viewBox="[^"]*"/, 'viewBox="70 600 2180 2180"');
  return { light, dark, badge };
}

export async function build({ clean = true, minify = true } = {}) {
  const started = Date.now();
  if (clean) await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  const highlighter = await createHighlighter({ themes: ['github-light-default', 'github-dark-default'], langs: SHIKI_LANGS });
  const data = await loadData();
  const usedIcons = new Set();
  const built = await buildPages({ highlighter, data, usedIcons });
  await writeSeoFiles(built);
  for (const file of await walk(path.join(SRC, 'js'))) {
    for (const [, name] of (await readFile(file, 'utf8')).matchAll(/icons\.svg#([a-z0-9-]+)/g)) usedIcons.add(name);
  }
  await buildIcons(usedIcons);
  await buildJs({ minify });
  if (clean) await copyAssets();
  highlighter.dispose();
  console.log(`Built ${built.length} pages in ${Date.now() - started} ms${BASE_PATH ? ` (base path ${BASE_PATH})` : ''}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  build().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
