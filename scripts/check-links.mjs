import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';

// Offline check that every root-relative href/src in _site points at an existing file.
const ROOT = '_site';
const BASE_PATH = (process.env.BASE_PATH || '').replace(/\/+$/, '');
const pages = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else if (full.endsWith('.html')) pages.push(full);
  }
})(ROOT);

const missing = new Set();
for (const page of pages) {
  for (const [, url] of readFileSync(page, 'utf8').matchAll(/(?:href|src)="(\/[^"#?]*)/g)) {
    if (BASE_PATH && url !== BASE_PATH && !url.startsWith(BASE_PATH + '/')) {
      missing.add(`${page} -> ${url} (missing base path ${BASE_PATH})`);
      continue;
    }
    const local = BASE_PATH ? url.slice(BASE_PATH.length) || '/' : url;
    let target = path.join(ROOT, decodeURI(local));
    if (local.endsWith('/')) target = path.join(target, 'index.html');
    if (!existsSync(target)) missing.add(`${page} -> ${url}`);
  }
}

console.log(`${pages.length} pages checked`);
if (missing.size) {
  console.error([...missing].join('\n'));
  process.exit(1);
}
console.log('No missing internal links or assets');
