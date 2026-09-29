import { chromium, devices } from '@playwright/test';

// Debug helper: screenshots a page at desktop and mobile sizes in both themes into test-results/.
const url = process.argv[2] || 'http://localhost:8080/';
const name = process.argv[3] || 'shot';
const browser = await chromium.launch();
for (const [label, options] of [['desktop', { viewport: { width: 1280, height: 860 } }], ['mobile', devices['Pixel 7']]]) {
  for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({ ...options, reducedMotion: 'reduce' });
    await context.addInitScript((t) => localStorage.setItem('theme', t), theme);
    const page = await context.newPage();
    await page.goto(url);
    await page.screenshot({ path: `test-results/${name}-${label}-${theme}.png`, fullPage: label === 'mobile' && theme === 'light' });
    await context.close();
  }
}
await browser.close();
