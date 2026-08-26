import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  const routes = [
    '/',
    '/login',
    '/prices',
    '/mandis',
    '/buyers',
    '/wholesalers',
    '/crop-journey'
  ];

  for (const route of routes) {
    console.log(`\nTesting ${route}`);
    page.removeAllListeners('console');
    page.removeAllListeners('pageerror');
    
    page.on('console', msg => {
      if (msg.type() === 'error') console.log(`[CONSOLE ERROR ${route}]:`, msg.text());
    });
    page.on('pageerror', err => console.error(`[PAGE ERROR ${route}]:`, err.toString()));
    
    try {
      await page.goto(`http://localhost:5174${route}`, { waitUntil: 'networkidle2' });
      // wait a bit for react to render
      await new Promise(r => setTimeout(r, 500));
      const html = await page.content();
      if (html.includes('vite Error Overlay')) {
         console.log(`Vite Error Overlay found on ${route}`);
      }
    } catch (e) {
      console.log(`Navigation failed for ${route}:`, e.message);
    }
  }
  
  await browser.close();
})();
