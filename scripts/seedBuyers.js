import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import connectDB from '../backend/config/db.js';
import { seedBuyerListings } from '../backend/config/seedBuyers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load backend/.env relative to the script location so this works from any CWD
dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });

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