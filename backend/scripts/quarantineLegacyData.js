const mongoose = require('mongoose');
const InventoryLot = require('../models/InventoryLot');
const Transaction = require('../models/Transaction');
const connectDB = require('../config/db');
const dotenv = require('dotenv');

dotenv.config();

async function quarantineLegacyData() {
  try {
    await connectDB();
    console.log('--- STARTING LEGACY DATA QUARANTINE ---');

    // Quarantine demo lots
    const lotsRes = await InventoryLot.updateMany(
      { is_demo: true },
      { $set: { is_quarantined: true } }
    );
    console.log(`Quarantined ${lotsRes.modifiedCount} legacy/demo InventoryLots`);

    // Quarantine demo transactions
    // In legacy data, demo transactions often didn't have sourceOrderId or had 'DEMO' in their transactionId
    const txnsRes = await Transaction.updateMany(
      { 
        $or: [
          { transactionId: { $regex: /DEMO/i } },
          { sourceOrderId: { $exists: false } }
        ]
      },
      { $set: { is_quarantined: true } }
    );
    console.log(`Quarantined ${txnsRes.modifiedCount} legacy/demo Transactions`);

    console.log('--- QUARANTINE COMPLETE ---');
    process.exit(0);
  } catch (error) {
    console.error('Fatal error during quarantine:', error);
    process.exit(1);
  }
}

quarantineLegacyData();
