const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await page.type('#chat-input', 'laptop');
  await page.click('#send-button');
  await page.waitForTimeout(2000);
  await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle0' });
  await page.waitForTimeout(2000);
  await browser.close();
})();
