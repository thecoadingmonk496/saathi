require('dotenv').config({ path: './backend/.env' });
const connectDB = require('../backend/config/db');
const { seedBuyerListings } = require('../backend/config/seedBuyers');

async function run() {
  console.log('--- RUNNING MANUAL BUYERS SEEDING SCRIPT ---');
  try {
    await connectDB();
    await seedBuyerListings();
    console.log('Seeding script completed successfully.');
  } catch (err) {
    console.error('Failed to run seed script:', err.message);
  } finally {
    process.exit(0);
  }
}

run();
