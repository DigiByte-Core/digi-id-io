import { test, expect } from '@playwright/test';

// Slow CPUs run scripts after first paint; this catches layout shifts that only show up there (e.g. CI Lighthouse).
for (const url of ['/', '/developers.html', '/demo.html']) {
  test(`no layout shift on slow CPUs: ${url}`, async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'CPU throttling needs Chromium DevTools');
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
    await page.addInitScript(() => {
      (window as any).__cls = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as any[]) if (!e.hadRecentInput) (window as any).__cls += e.value;
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.goto(url);
    await page.waitForTimeout(2500);
    expect(await page.evaluate(() => (window as any).__cls)).toBeLessThan(0.1);
  });

  test(`no layout shift when web fonts arrive late: ${url}`, async ({ page }) => {
    await page.route(/\.woff2?$/, async (route) => {
      await new Promise((r) => setTimeout(r, 1200));
      await route.continue();
    });
    await page.addInitScript(() => {
      (window as any).__cls = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as any[]) if (!e.hadRecentInput) (window as any).__cls += e.value;
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.goto(url);
    await page.waitForTimeout(2500);
    expect(await page.evaluate(() => (window as any).__cls)).toBeLessThan(0.1);
  });
}
