import { chromium, devices } from '@playwright/test';

// Finds elements wider than the mobile viewport on a page (debug helper for layout overflow).
const url = process.argv[2] || 'http://localhost:8080/developers.html';
const browser = await chromium.launch();
const page = await browser.newPage({ ...devices['Pixel 7'] });
await page.goto(url);
const result = await page.evaluate(() => {
  const vw = document.documentElement.clientWidth;
  const offenders = [...document.querySelectorAll('body *')]
    .filter((el) => el.getBoundingClientRect().right > vw + 1)
    .filter((el) => !el.parentElement || el.parentElement.getBoundingClientRect().right <= vw + 1)
    .slice(0, 10)
    .map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].slice(0, 4).join('.')} right=${Math.round(el.getBoundingClientRect().right)}`);
  return { vw, scrollWidth: document.documentElement.scrollWidth, offenders };
});
console.log(JSON.stringify(result, null, 2));
await browser.close();
