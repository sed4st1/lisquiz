const puppeteer = require('puppeteer');

(async () => {
  const url = process.argv[2] || 'http://localhost:3000/';
  const outputPath = process.argv[3] || '/tmp/lisquiz_screen.png';
  const width = parseInt(process.argv[4] || '440', 10);
  const height = parseInt(process.argv[5] || '920', 10);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 2 });

  await page.goto(url, { waitUntil: 'networkidle0' });

  // Wait for splash screen to disappear (if present)
  await new Promise(r => setTimeout(r, 2600));

  // If specific selector requested, can clip to .app-container
  const phoneElement = await page.$('.app-container');
  if (phoneElement) {
    await phoneElement.screenshot({ path: outputPath });
  } else {
    await page.screenshot({ path: outputPath });
  }

  console.log(`Screenshot saved to ${outputPath}`);
  await browser.close();
})();
