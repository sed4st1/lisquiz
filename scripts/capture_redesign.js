const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 440, height: 920, deviceScaleFactor: 2 });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2600));

  const phoneElement = await page.$('.app-container');

  // 1. World Scene
  await phoneElement.screenshot({ path: '/tmp/redesign_grove.png' });
  console.log('Saved /tmp/redesign_grove.png');

  // 2. Click "Баланс" Tab
  const balanceTab = await page.$('nav button:nth-child(2)');
  if (balanceTab) {
    await balanceTab.click();
    await new Promise(r => setTimeout(r, 600));
    await phoneElement.screenshot({ path: '/tmp/redesign_liebig.png' });
    console.log('Saved /tmp/redesign_liebig.png');
  }

  // 3. Click "Рейтинг" Tab
  const ratingTab = await page.$('nav button:nth-child(3)');
  if (ratingTab) {
    await ratingTab.click();
    await new Promise(r => setTimeout(r, 600));
    await phoneElement.screenshot({ path: '/tmp/redesign_leaderboard.png' });
    console.log('Saved /tmp/redesign_leaderboard.png');
  }

  // 4. Click "Карточки" Tab
  const gachaTab = await page.$('nav button:nth-child(4)');
  if (gachaTab) {
    await gachaTab.click();
    await new Promise(r => setTimeout(r, 600));
    await phoneElement.screenshot({ path: '/tmp/redesign_gacha.png' });
    console.log('Saved /tmp/redesign_gacha.png');
  }

  // 5. Click "Роща" Tab to return to world
  const groveTab = await page.$('nav button:nth-child(1)');
  if (groveTab) {
    await groveTab.click();
    await new Promise(r => setTimeout(r, 500));
  }

  // 6. Open Dev Sandbox
  const devBtn = await page.$('header button[title*="разработчика"]');
  if (devBtn) {
    await devBtn.click();
    await new Promise(r => setTimeout(r, 600));
    await phoneElement.screenshot({ path: '/tmp/redesign_dev.png' });
    console.log('Saved /tmp/redesign_dev.png');
  }

  await browser.close();
  console.log('Finished capturing all tabs!');
})();
