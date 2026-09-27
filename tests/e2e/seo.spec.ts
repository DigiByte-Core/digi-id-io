import { test, expect } from '@playwright/test';

test('unknown URLs show the branded 404 page', async ({ page }) => {
  const response = await page.goto('/does-not-exist.html');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText("This page doesn't exist.");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  await page.getByRole('main').getByRole('link', { name: 'Developer hub' }).click();
  await expect(page).toHaveURL(/\/developers\.html$/);
});

test('sitemap lists indexable pages only', async ({ request }) => {
  const xml = await (await request.get('/sitemap.xml')).text();
  expect(xml).toContain('<loc>https://www.digi-id.io/developers.html</loc>');
  expect(xml).toContain('<loc>https://www.digi-id.io/guides/web-app-login.html</loc>');
  expect(xml).not.toContain('404.html');
  expect(xml).not.toContain('getstarted.html');
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('Sitemap: https://www.digi-id.io/sitemap.xml');
});

test('icons, manifest and per-page social images resolve', async ({ page, request }) => {
  await page.goto('/developers.html');
  for (const selector of ['link[rel="icon"][type="image/svg+xml"]', 'link[rel="apple-touch-icon"]', 'link[rel="manifest"]']) {
    const href = await page.locator(selector).getAttribute('href');
    expect((await request.get(href!)).ok(), selector).toBe(true);
  }
  const manifest = await (await request.get('/site.webmanifest')).json();
  for (const icon of manifest.icons) expect((await request.get(icon.src)).ok(), icon.src).toBe(true);

  const og = await page.locator('meta[property="og:image"]').getAttribute('content');
  expect(og).toBe('https://www.digi-id.io/assets/images/og/developers.png');
  expect((await request.get(new URL(og!).pathname)).ok()).toBe(true);
});
