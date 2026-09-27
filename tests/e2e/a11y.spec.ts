import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const SITE = path.resolve('_site');

function pages(dir = SITE): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return name === 'assets' ? [] : pages(full);
    if (!name.endsWith('.html') || readFileSync(full, 'utf8').includes('http-equiv="refresh"')) return [];
    return ['/' + path.relative(SITE, full).split(path.sep).join('/')];
  });
}

for (const url of pages()) {
  for (const theme of ['light', 'dark']) {
    test(`a11y ${url} (${theme})`, async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
      await page.goto(url);
      // content-visibility defers off-screen layout; force it so axe measures the real rendered colours.
      await page.addStyleTag({ content: '* { content-visibility: visible !important; }' });
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual([]);
    });
  }
}
