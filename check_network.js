import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log(`FAILED REQUEST: ${response.status()} ${response.url()}`);
    }
  });
  
  await page.goto('http://localhost:5174', { waitUntil: 'networkidle0' });
  await browser.close();
})();
