import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { logoVariants, pageSlug } from './build.mjs';

// Renders PNG app icons and per-page 1200x630 social preview images. Run after changing page titles or the logo; commit the output.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGES = path.join(ROOT, 'src', 'pages');
const ICONS = path.join(ROOT, 'assets', 'images', 'icons');
const OG = path.join(ROOT, 'assets', 'images', 'og');

const dataUrl = async (file, type) => `data:${type};base64,${(await readFile(file)).toString('base64')}`;
const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

async function listPages(dir = PAGES) {
  const { readdir } = await import('node:fs/promises');
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'legacy') out.push(...(await listPages(full)));
    } else if (entry.name.endsWith('.html') && entry.name !== '404.html') {
      const meta = JSON.parse((await readFile(full, 'utf8')).match(/^---\r?\n([\s\S]*?)\r?\n---/)[1]);
      out.push({ rel: path.relative(PAGES, full), meta });
    }
  }
  return out;
}

const { dark, badge } = logoVariants(await readFile(path.join(ROOT, 'assets', 'scenarium', 'logo.svg'), 'utf8'));
const fonts = {
  roboto400: await dataUrl(path.join(ROOT, 'node_modules/@fontsource/roboto/files/roboto-latin-400-normal.woff2'), 'font/woff2'),
  roboto500: await dataUrl(path.join(ROOT, 'node_modules/@fontsource/roboto/files/roboto-latin-500-normal.woff2'), 'font/woff2'),
  nexaBold: await dataUrl(path.join(ROOT, 'assets/fonts/text/nexa/NexaBold.woff'), 'font/woff')
};

const browser = await chromium.launch();
const page = await browser.newPage();

async function renderIcon(file, size, { background = 'transparent', padding = 0 }) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:${background};display:grid;place-items:center;width:${size}px;height:${size}px">
    <div style="width:${size * (1 - padding * 2)}px;height:${size * (1 - padding * 2)}px">${badge.replace('width="64" height="64"', 'width="100%" height="100%"')}</div></body></html>`);
  await page.screenshot({ path: path.join(ICONS, file), omitBackground: background === 'transparent' });
}

await mkdir(ICONS, { recursive: true });
await renderIcon('favicon-32.png', 32, {});
await renderIcon('icon-192.png', 192, {});
await renderIcon('icon-512.png', 512, {});
await renderIcon('apple-touch-icon.png', 180, { background: '#ffffff', padding: 0.1 });
await renderIcon('icon-maskable-512.png', 512, { background: '#002451', padding: 0.2 });

await mkdir(OG, { recursive: true });
await page.setViewportSize({ width: 1200, height: 630 });
for (const { rel, meta } of await listPages()) {
  const title = (meta.ogTitle || meta.title).replace(/\s+[–-]\s+Digi-ID$/, '').replace(/^Digi-ID\s+[–-]\s+/, '');
  const description = meta.description.length > 150 ? meta.description.slice(0, 147).trimEnd() + '…' : meta.description;
  await page.setContent(`<html><head><style>
    @font-face { font-family: Roboto; font-weight: 400; src: url(${fonts.roboto400}); }
    @font-face { font-family: Roboto; font-weight: 500; src: url(${fonts.roboto500}); }
    @font-face { font-family: Nexa; font-weight: 700; src: url(${fonts.nexaBold}); }
    body { margin: 0; width: 1200px; height: 630px; font-family: Roboto, sans-serif; color: #cbd5e1;
      background: radial-gradient(700px 400px at 90% 0%, rgba(0,209,178,.28), transparent), radial-gradient(600px 400px at 0% 100%, rgba(3,155,229,.25), transparent), #001633; }
    .wrap { box-sizing: border-box; height: 100%; padding: 64px 72px; display: flex; flex-direction: column; }
    .logo svg { height: 64px; width: auto; }
    h1 { font-family: Nexa, Roboto, sans-serif; font-weight: 700; color: #fff; font-size: ${title.length > 42 ? 58 : 68}px; line-height: 1.1; margin: auto 0 20px; max-width: 1000px; }
    p { font-size: 28px; line-height: 1.4; margin: 0; max-width: 980px; }
    footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 22px; font-weight: 500; }
    .accent { color: #00d1b2; }
  </style></head><body><div class="wrap">
    <div class="logo">${dark.replace('width="5920" height="2230"', 'height="64" width="170"')}</div>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(description)}</p>
    <footer><span class="accent">www.digi-id.io</span><span>Passwordless login · Powered by DigiByte</span></footer>
  </div></body></html>`);
  await page.evaluate(() => document.fonts.ready);
  const out = path.join(OG, `${pageSlug(rel)}.png`);
  await page.screenshot({ path: out });
  console.log('wrote', path.relative(ROOT, out));
}

await browser.close();
