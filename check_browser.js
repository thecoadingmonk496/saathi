import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.error('BROWSER ERROR:', err.toString()));
  
  console.log("Navigating to http://localhost:5174 ...");
  await page.goto('http://localhost:5174', { waitUntil: 'networkidle2' }).catch(e => console.error(e));
  
  await page.screenshot({ path: 'screenshot.png' });
  console.log("Saved screenshot to screenshot.png");
  
  await browser.close();
})();
