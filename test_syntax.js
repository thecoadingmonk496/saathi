const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => {
        console.error('PAGE ERROR:', err.toString());
        process.exit(1);
    });
    await page.goto('http://localhost:8000');
    console.log("No syntax errors on load!");
    await browser.close();
})();
