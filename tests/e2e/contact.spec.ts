import { test, expect } from '@playwright/test';

const ENDPOINT = 'https://api.web3forms.com/submit';

async function fill(page) {
  await page.getByLabel('Your name').fill('Ada Lovelace');
  await page.getByLabel('Email').fill('ada@example.com');
  await page.getByLabel("I'm interested in").selectOption('Wallet support');
  await page.getByLabel('Tell us a bit more').fill('We want to add Digi-ID to our wallet.');
}

test('contact form sends to Web3Forms with the access key and shows success', async ({ page }) => {
  let body = '';
  await page.route(ENDPOINT, async (route) => {
    body = route.request().postData() ?? '';
    await route.fulfill({ json: { success: true } });
  });
  await page.goto('/contact.html');
  await fill(page);
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.locator('[data-contact-status]')).toContainText('on its way');
  expect(body).toContain('e7b77a7b-6a9e-47a6-96c8-67ead259e659');
  expect(body).toContain('Wallet support');
  expect(body).toContain('ada@example.com');
  await expect(page.getByLabel('Your name')).toHaveValue('');
});

test('contact form reports errors and validates required fields', async ({ page }) => {
  let calls = 0;
  await page.route(ENDPOINT, async (route) => {
    calls++;
    await route.fulfill({ status: 400, json: { success: false, message: 'Invalid access key' } });
  });
  await page.goto('/contact.html');
  await page.getByRole('button', { name: 'Send message' }).click();
  expect(calls).toBe(0);
  await fill(page);
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.locator('[data-contact-status]')).toContainText('Invalid access key');
});

test('contact page makes no third-party requests until submit', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (r) => {
    if (!r.url().startsWith('http://localhost')) external.push(r.url());
  });
  await page.goto('/contact.html');
  await page.waitForLoadState('networkidle');
  expect(external).toEqual([]);
});
