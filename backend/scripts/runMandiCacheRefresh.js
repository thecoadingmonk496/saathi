require('dotenv').config({ path: '../.env' }); // Make sure we load the env from backend dir
const connectDB = require('../config/db');
const mandiService = require('../services/mandiService');

async function runRefresh() {
  try {
    console.log('[Script] Connecting to database...');
    await connectDB();
    
    console.log('[Script] Triggering manual cache refresh...');
    const result = await mandiService.refreshNationalMandiCache();
    
    console.log('\n[Script] Result:');
    console.dir(result, { depth: null });
    
    process.exit(0);
  } catch (error) {
    console.error('[Script] Error:', error);
    process.exit(1);
  }
}

runRefresh();
