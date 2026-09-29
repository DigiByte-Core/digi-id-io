import { test, expect } from '@playwright/test';

test('Home → Start building → PHP code and repo link within 2 clicks', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Start building' }).first().click();
  await expect(page).toHaveURL(/\/developers\.html$/);

  const install = page.getByRole('tablist', { name: 'Install' });
  await install.getByRole('tab', { name: 'PHP' }).click();
  await expect(page.locator('#qs1-panel-php')).toBeVisible();
  await expect(page.locator('#qs1-panel-php')).toContainText('digiid-php');
  await expect(page.locator('#qs3-panel-php')).toBeVisible(); // language choice syncs across steps
  await expect(page.locator('#sdks').getByRole('link', { name: /Source on GitHub/ }).first()).toBeVisible();
});

test('code tabs are keyboard accessible', async ({ page }) => {
  await page.goto('/');
  const node = page.getByRole('tab', { name: 'Node.js' }).first();
  await node.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'PHP' }).first()).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tab', { name: 'PHP' }).first()).toBeFocused();
});

test('copy button copies the code sample', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'clipboard permissions are Chromium-only');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/developers.html');
  const block = page.locator('#qs2-panel-node [data-code-block]');
  await block.getByRole('button', { name: 'Copy Node.js code – Issue a challenge' }).click();
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toContain('/digiid/challenge');
});

test('playground verifies the published example', async ({ page }) => {
  await page.goto('/developers.html#playground');
  await page.getByRole('button', { name: 'Load example' }).click();
  await expect(page.locator('[data-playground-result]')).toContainText('Valid Digi-ID callback');
  await page.getByLabel('Address').fill('DAqGceHoc44KCmUKjA7XWinpLTSUMR4gBD');
  await page.getByRole('button', { name: 'Verify', exact: true }).click();
  await expect(page.locator('[data-playground-result]')).toContainText('Rejected');
});

test('legacy URLs redirect to their new homes', async ({ page }) => {
  for (const [from, to] of [
    ['/getstarted.html', /\/developers\.html#quickstart$/],
    ['/integration.html', /\/developers\.html#protocol$/],
    ['/faq.html', /\/documentation\.html#faq$/],
    ['/vendor-info.html', /\/documentation\.html#vendors$/],
    ['/pricing.html', /\/#free$/]
  ]) {
    await page.goto(from);
    await expect(page).toHaveURL(to);
  }
  await page.goto('/#implementations');
  await expect(page.locator('#implementations')).toBeVisible();
});
