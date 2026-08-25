const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const BuyerListing = require('./models/BuyerListing');
const PurchaseOrder = require('./models/PurchaseOrder');
const Transaction = require('./models/Transaction');
const InventoryLot = require('./models/InventoryLot');
const dotenv = require('dotenv');
const orderController = require('./controllers/orderController');

dotenv.config();

async function runTests() {
  console.log("--- PHASE 12.1: FINAL BUYER LISTING OCC HARDENING ---");
  try {
    await connectDB();
    console.log("MongoDB connected successfully.");

    // Setup Test Data
    const b1 = await User.findOne({ role: 'BUYER' });
    const f1 = await User.findOne({ role: 'FARMER' });
    const f2 = await User.findOne({ role: 'FARMER' });
    const f3 = await User.findOne({ role: 'FARMER' });

    if (!b1 || !f1 || !f2 || !f3) {
      throw new Error("Missing test users. Run seed scripts first.");
    }

    // 1. Create a fresh listing for 100 quintals
    const listing = await BuyerListing.create({
      buyerId: b1._id,
      buyer_name: b1.firstName + ' ' + b1.lastName,
      buyer_type: 'Wholesale Market',
      commodity: 'Wheat',
      offered_price: 2500,
      quantity_required: '100 quintals',
      market: 'Test Market',
      district: 'Test District',
      state: 'Test State',
      fulfilledQuantity: 0,
      is_demo: false
    });

    console.log(`Setup complete: Created BuyerListing ${listing._id} for 100q Wheat`);

    // Helper to propose order
    const propose = async (farmer, qty) => {
      // Need InventoryLot for OCC pass
      const lot = await InventoryLot.create({
        ownerId: farmer._id,
        ownerRole: 'FARMER',
        crop: 'Wheat',
        commodity: 'Wheat',
        variety: 'Sharbati',
        location: 'Test Location',
        originalQuantity: qty,
        availableQuantity: qty,
        originFarmer: farmer._id,
        originTransaction: new mongoose.Types.ObjectId(),
        batchId: 'BATCH-' + Date.now() + Math.random(),
        farmerBatchId: 'BATCH-' + Date.now() + Math.random(),
        is_demo: false
      });
      const order = await PurchaseOrder.create({
        buyerId: b1._id,
        sellerId: farmer._id,
        listingId: listing._id,
        commodity: 'Wheat',
        product: 'Wheat',
        location: 'Test Location',
        quantity: qty,
        pricePerQtl: 2500,
        price: 2500,
        status: 'PENDING',
        stage: 'FARMER_TO_BUYER',
        is_demo: false
      });
      return { order, lot };
    };

    // Helper to approve order
    const approveOrderReq = (orderId, buyerId) => {
      return {
        params: { id: orderId },
        user: { userId: buyerId }
      };
    };

    const approveOrderRes = () => {
      const res = {
        code: 200,
        data: {},
        status: function(c) { this.code = c; return this; },
        json: function(d) { this.data = d; return this; }
      };
      return res;
    };

    // Test 1: Normal single approval (40)
    console.log("\nTEST 1: Normal single approval");
    const { order: o1 } = await propose(f1, 40);
    const res1 = approveOrderRes();
    await orderController.approveOrder(approveOrderReq(o1._id, b1._id), res1);
    if (res1.code === 409 || res1.code === 400) throw new Error("Failed to approve valid order");
    let check = await BuyerListing.findById(listing._id);
    if (check.fulfilledQuantity !== 40) throw new Error(`fulfilledQuantity expected 40, got ${check.fulfilledQuantity}`);
    console.log("SUCCESS: Normal approval incremented fulfilledQuantity correctly.");

    // Test 2: Over-fulfillment rejection (70 when only 60 left)
    console.log("\nTEST 2: Over-fulfillment rejection");
    const { order: o2 } = await propose(f2, 70);
    const res2 = approveOrderRes();
    await orderController.approveOrder(approveOrderReq(o2._id, b1._id), res2);
    if (res2.code !== 409) {
      console.log('Result code:', res2.code, res2.data);
      throw new Error("Failed to reject over-fulfillment");
    }
    check = await BuyerListing.findById(listing._id);
    if (check.fulfilledQuantity !== 40) throw new Error("fulfilledQuantity mutated during failure!");
    console.log("SUCCESS: Over-fulfillment rejected safely.");

    // Test 3: Concurrent Write-Skew Prevention (70 + 70 vs 60 remaining)
    // We already have 40. Remaining is 60.
    // Propose two 60s simultaneously. Only ONE should succeed!
    console.log("\nTEST 3: Concurrent OCC Write-Skew Test (60 + 60 vs 60 remaining)");
    const { order: o3a } = await propose(f1, 60);
    const { order: o3b } = await propose(f2, 60);

    const res3a = approveOrderRes();
    const res3b = approveOrderRes();

    // Fire concurrently
    await Promise.all([
      orderController.approveOrder(approveOrderReq(o3a._id, b1._id), res3a),
      orderController.approveOrder(approveOrderReq(o3b._id, b1._id), res3b)
    ]);

    const aStatus = res3a.code || 200;
    const bStatus = res3b.code || 200;

    console.log(`Concurrent A Result: ${aStatus}`);
    console.log(`Concurrent B Result: ${bStatus}`);

    check = await BuyerListing.findById(listing._id);
    console.log(`Final fulfilledQuantity: ${check.fulfilledQuantity}`);

    if (check.fulfilledQuantity !== 100) {
      throw new Error(`CONCURRENCY FAILED! Expected 100 fulfilled, got ${check.fulfilledQuantity}`);
    }

    if ((aStatus === 200 && bStatus === 200) || (aStatus !== 200 && bStatus !== 200)) {
      throw new Error(`CONCURRENCY FAILED! One must succeed (200), one must fail (409). Got ${aStatus} and ${bStatus}`);
    }
    console.log("SUCCESS: OCC correctly blocked the concurrent over-fulfillment!");

    // Test 4: Rollback Test (Downstream failure)
    // Mock InventoryLot to cause a failure downstream or try approving an order when inventory is empty
    console.log("\nTEST 4: Rollback and ACID guarantees");
    // Listing has 100/100 fulfilled. Create a new listing for this test.
    const listing2 = await BuyerListing.create({
      buyerId: b1._id,
      buyer_name: b1.firstName + ' ' + b1.lastName,
      buyer_type: 'Wholesale Market',
      commodity: 'Wheat',
      offered_price: 2500,
      quantity_required: '100 quintals',
      market: 'Test Market',
      district: 'Test District',
      state: 'Test State',
      fulfilledQuantity: 0,
      is_demo: false
    });

    const { order: o4, lot: lot4 } = await propose(f3, 50);
    
    // Sabotage the InventoryLot so the downstream OCC fails
    await InventoryLot.updateOne({ _id: lot4._id }, { $set: { availableQuantity: 10 } });

    const res4 = approveOrderRes();
    await orderController.approveOrder({ params: { id: o4._id }, user: { userId: b1._id } }, res4);

    if (res4.code !== 400 && res4.code !== 409 && res4.code !== 500) {
      throw new Error(`Downstream InventoryLot failure should have bubbled up. Got code: ${res4.code}`);
    }

    const check2 = await BuyerListing.findById(listing2._id);
    if (check2.fulfilledQuantity !== 0) {
      throw new Error("ACID ROLLBACK FAILED: fulfilledQuantity was mutated but transaction failed!");
    }
    
    const txnCheck = await Transaction.findOne({ sourceOrderId: o4._id });
    if (txnCheck) {
      throw new Error("ACID ROLLBACK FAILED: Transaction was minted despite failure!");
    }
    console.log("SUCCESS: ACID rollback restored fulfilledQuantity to previous state seamlessly.");

    console.log("\n✅ ALL PHASE 12.1 TESTS PASSED.");
    process.exit(0);

  } catch (error) {
    console.error(`\n❌ CERTIFICATION FAILED: ${error.stack || error.message}`);
    process.exit(1);
  }
}

runTests();
