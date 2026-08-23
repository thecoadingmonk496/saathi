require('dotenv').config({ path: '../.env' });
const connectDB = require('../config/db');
const mandiService = require('../services/mandiService');

async function testLakshadweep() {
  await connectDB();
  const start = Date.now();
  const result = await mandiService.getMandiPrices({ state: 'Lakshadweep', district: 'Lakshadweep' });
  const elapsed = Date.now() - start;
  console.log(`[Lakshadweep] Found ${result.length} records. Took ${elapsed}ms.`);
  process.exit(0);
}
testLakshadweep();
