import { test, expect } from '@playwright/test';

test('back-to-top appears after scrolling and returns to the top', async ({ page }) => {
  await page.goto('/developers.html');
  const button = page.getByRole('link', { name: 'Back to top' });
  await expect(button).not.toHaveAttribute('data-visible');

  await page.evaluate(() => scrollTo(0, 2000));
  await expect(button).toHaveAttribute('data-visible', '');
  await button.click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await expect(page.locator('.skip-link')).toBeFocused();
});
