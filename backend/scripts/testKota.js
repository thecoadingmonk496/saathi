require('dotenv').config({ path: '../.env' });
const connectDB = require('../config/db');
const mandiService = require('../services/mandiService');

async function testKota() {
  await connectDB();
  for(let i=1; i<=3; i++) {
    const start = Date.now();
    const result = await mandiService.getMandiPrices({ state: 'Rajasthan', district: 'Kota' });
    const elapsed = Date.now() - start;
    const isFallback = result.some(r => r.isLatestAvailable);
    console.log(`[Run ${i}] Found ${result.length} records. Took ${elapsed}ms. Cached/Live? DB has data so it should be DB. isLatestAvailable: ${isFallback}`);
    if (result.length > 0) {
      console.log(`  Dates returned: ${[...new Set(result.map(r => r.arrival_date))].join(', ')}`);
    }
  }
  process.exit(0);
}
testKota();
