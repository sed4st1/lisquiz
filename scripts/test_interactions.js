const puppeteer = require('puppeteer');

(async () => {
  const mode = process.argv[2] || 'drawer';
  const outputPath = process.argv[3] || `/tmp/${mode}.png`;

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 440, height: 920, deviceScaleFactor: 2 });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2600));

  if (mode === 'drawer') {
    // Click on the drawer handle bar
    const bar = await page.$('div[title*="развернуть"]');
    if (bar) {
      await bar.click();
      await new Promise(r => setTimeout(r, 600));
    }
  } else if (mode === 'water') {
    // Click watering button
    const waterBtn = await page.$('div[title*="поливает"]');
    if (waterBtn) {
      await waterBtn.click();
      await new Promise(r => setTimeout(r, 500));
    }
  }

  const phoneElement = await page.$('.app-container');
  if (phoneElement) {
    await phoneElement.screenshot({ path: outputPath });
  } else {
    await page.screenshot({ path: outputPath });
  }

  console.log(`Saved screenshot to ${outputPath}`);
  await browser.close();
})();
