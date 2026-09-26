import { test, expect } from '@playwright/test';

test.describe('sandbox demo', () => {
  test('approve → verified, with no network requests and nothing scannable', async ({ page }) => {
    await page.goto('/demo.html');
    await expect(page.locator('[data-demo][data-ready]')).toBeAttached();

    const requests: string[] = [];
    page.on('request', (r) => requests.push(r.url()));

    await expect(page.locator('[data-demo-uri]')).toContainText('digiid://www.digi-id.io/demo?x=');
    await expect(page.locator('a[href^="digiid:"]')).toHaveCount(0);
    await expect(page.locator('[data-demo] canvas')).toHaveCount(0);

    const started = Date.now();
    await page.getByRole('button', { name: 'Approve' }).click();
    await expect(page.locator('[data-demo-status]')).toContainText(/Verified as D[1-9A-HJ-NP-Za-km-z]{25,34}/);
    expect(Date.now() - started).toBeLessThan(30_000);

    await page.getByRole('button', { name: 'Replay the request' }).click();
    await expect(page.locator('[data-demo-status]')).toContainText('replay blocked');
    await page.getByRole('button', { name: 'Tamper with the nonce' }).click();
    await expect(page.locator('[data-demo-status]')).toContainText('bad signature');

    expect(requests.filter((u) => !u.includes('/assets/icons.svg'))).toEqual([]);
  });

  test('decline signs nothing', async ({ page }) => {
    await page.goto('/demo.html');
    await page.getByRole('button', { name: 'Decline' }).click();
    await expect(page.locator('[data-demo-status]')).toContainText('Nothing was signed');
  });

  test('challenge expires and can be regenerated', async ({ page }) => {
    await page.clock.install();
    await page.goto('/demo.html');
    const first = await page.locator('[data-demo-uri]').textContent();
    await page.clock.fastForward(91_000);
    await expect(page.locator('[data-demo-status]')).toContainText('expired');
    await expect(page.getByRole('button', { name: 'Approve' })).toBeDisabled();
    await page.getByRole('button', { name: 'New challenge' }).click();
    await expect(page.locator('[data-demo-uri]')).not.toHaveText(first!);
    await expect(page.getByRole('button', { name: 'Approve' })).toBeEnabled();
  });
});
