const mongoose = require('mongoose');
const dotenv = require('dotenv');
const InventoryLot = require('../models/InventoryLot');
const Transaction = require('../models/Transaction');
const PurchaseOrder = require('../models/PurchaseOrder');
const connectDB = require('../config/db');

dotenv.config();

async function runReconciliation() {
  try {
    await connectDB();
    console.log('--- STARTING INVENTORY RECONCILIATION AUDIT ---');

    let errorsFound = 0;
    const reportError = (msg) => {
      console.error(`[ERROR] ${msg}`);
      errorsFound++;
    };

    const lots = await InventoryLot.find({ is_quarantined: { $ne: true } }).lean();
    console.log(`Auditing ${lots.length} InventoryLots...`);

    for (const lot of lots) {
      const lotId = lot._id.toString();
      
      // 1. Basic quantity sanity
      if (lot.availableQuantity < 0) {
        reportError(`Lot ${lotId}: Negative available quantity (${lot.availableQuantity})`);
      }
      if (lot.availableQuantity > lot.originalQuantity) {
        reportError(`Lot ${lotId}: Available (${lot.availableQuantity}) > Original (${lot.originalQuantity})`);
      }

      // 2. Orphaned Lots check
      if (!lot.originFarmer) {
        reportError(`Lot ${lotId}: Missing originFarmer`);
      }
      if (!lot.farmerBatchId) {
        reportError(`Lot ${lotId}: Missing farmerBatchId`);
      }

      // Check origin transaction reference
      const txnRef = lot.transactionId || lot.originTransaction;
      if (!txnRef) {
        reportError(`Lot ${lotId}: Missing transactionId / originTransaction reference`);
      } else {
        const originTxn = await Transaction.findById(txnRef).lean();
        if (!originTxn) {
          reportError(`Lot ${lotId}: Orphaned lot - transaction ${txnRef} not found`);
        } else {
          // Verify batch lineage matches origin transaction
          if (originTxn.batchId !== lot.farmerBatchId && originTxn.batchId !== lot.batchId) {
             if (lot.ownerRole === 'BUYER' && originTxn.batchId !== lot.farmerBatchId) {
               reportError(`Lot ${lotId}: Lineage break. Txn batchId ${originTxn.batchId} != Lot farmerBatchId ${lot.farmerBatchId}`);
             }
          }
        }
      }
    }

    // Aggregate Reconciliation (Per Owner, Per Crop)
    console.log(`Auditing aggregate owner balances...`);
    const ownerCropGroups = await InventoryLot.aggregate([
      { $match: { is_quarantined: { $ne: true } } },
      { $group: {
          _id: { ownerId: "$ownerId", crop: "$crop", is_demo: "$is_demo" },
          totalOriginal: { $sum: "$originalQuantity" },
          totalAvailable: { $sum: "$availableQuantity" }
      }}
    ]);

    for (const group of ownerCropGroups) {
      const { ownerId, crop, is_demo } = group._id;
      const totalOriginal = group.totalOriginal;
      const totalAvailable = group.totalAvailable;

      // Find all transactions where this user SOLD this crop
      // Need to filter out demo if group is not demo
      const soldTxns = await Transaction.find({ sellerId: ownerId, product: crop }).lean();
      
      // We must match demo status. For simplicity, just sum all quantities of the transactions that this user sold.
      // Wait, Transaction doesn't have is_demo field directly, it has batchId which might contain 'DEMO'.
      const groupDemoStatus = is_demo || false;
      
      const relevantTxns = soldTxns.filter(txn => {
        const isTxnDemo = txn.transactionId && txn.transactionId.includes('DEMO');
        return isTxnDemo === groupDemoStatus;
      });

      const totalSold = relevantTxns.reduce((sum, txn) => sum + txn.quantity, 0);

      const diff = Math.abs(totalOriginal - (totalAvailable + totalSold));
      if (diff > 0.001) {
         reportError(`Owner ${ownerId} Crop ${crop} (Demo: ${groupDemoStatus}): Inventory mismatch! Original (${totalOriginal}) != Available (${totalAvailable}) + Sold (${totalSold})`);
      }
    }

    // Transactions check
    console.log(`Auditing Transactions...`);
    const txns = await Transaction.find({ is_quarantined: { $ne: true } }).lean();
    for (const txn of txns) {
      const txnId = txn._id.toString();
      if (!txn.sourceOrderId) {
        if (txn.sourceType === 'PURCHASE_ORDER' && !txn.sourceOrderId) {
          reportError(`Transaction ${txnId}: Missing sourceOrderId`);
        }
      } else {
        const order = await PurchaseOrder.findById(txn.sourceOrderId).lean();
        if (!order) {
           reportError(`Transaction ${txnId}: Missing source PurchaseOrder ${txn.sourceOrderId}`);
        }
      }
    }

    console.log('--- RECONCILIATION COMPLETE ---');
    if (errorsFound > 0) {
      console.log(`\n❌ Found ${errorsFound} inconsistencies. Requires manual investigation.`);
      process.exit(1);
    } else {
      console.log(`\n✅ All inventory and transactions are mathematically consistent and structurally sound.`);
      process.exit(0);
    }

  } catch (error) {
    console.error('Fatal error during reconciliation:', error);
    process.exit(1);
  } finally {
    mongoose.connection.close();
  }
}

runReconciliation();
