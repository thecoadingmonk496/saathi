require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const InventoryLot = require('../models/InventoryLot');
const PurchaseOrder = require('../models/PurchaseOrder');

const connectDB = require('../config/db');

const runMigration = async () => {
  await connectDB();
  console.log('Starting Phase 6.6 Semantic Migration...');
  
  try {
    // 1. Migrate Transactions
    const transactions = await Transaction.find({ sourceOrderId: { $exists: false } });
    console.log(`Found ${transactions.length} Transactions to migrate.`);
    let txUpdated = 0;
    
    for (const tx of transactions) {
      if (tx.sourceId && mongoose.Types.ObjectId.isValid(tx.sourceId)) {
        tx.sourceOrderId = new mongoose.Types.ObjectId(tx.sourceId);
        await tx.save();
        txUpdated++;
      }
    }
    console.log(`Successfully migrated ${txUpdated} Transactions.`);

    // 2. Migrate InventoryLots
    const lots = await InventoryLot.find({ transactionId: { $exists: false } });
    console.log(`Found ${lots.length} InventoryLots to migrate.`);
    let lotUpdated = 0;

    for (const lot of lots) {
      let updated = false;
      
      if (lot.batchId && !lot.farmerBatchId) {
        lot.farmerBatchId = lot.batchId;
        updated = true;
      }
      
      if (lot.originTransaction && !lot.transactionId) {
        lot.transactionId = lot.originTransaction;
        updated = true;
      }
      
      if (updated) {
        await lot.save();
        lotUpdated++;
      }
    }
    console.log(`Successfully migrated ${lotUpdated} InventoryLots.`);

    console.log('Migration Complete.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

runMigration();
