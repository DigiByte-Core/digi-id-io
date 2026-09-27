import { test, expect } from '@playwright/test';

test('hero phone mock never covers the login card content', async ({ page }) => {
  await page.goto('/');
  const overlap = await page.evaluate(() => {
    const figure = document.querySelector('figure')!;
    const phone = [...figure.children].find((el) => el.textContent?.includes('wants you to sign in'))!.getBoundingClientRect();
    // Measure rendered text/image extents, not full-width block boxes.
    const extent = (el: Element) => {
      if (el.tagName === 'IMG') return el.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(el);
      return range.getBoundingClientRect();
    };
    const covered = [...figure.querySelectorAll('p, img')]
      .filter((el) => !el.closest('.w-56, .sm\\:w-60'))
      .map(extent)
      .filter((r) => !(r.right <= phone.left || r.left >= phone.right || r.bottom <= phone.top || r.top >= phone.bottom));
    return covered.length;
  });
  expect(overlap).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
});
