require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const BuyerListing = require('./models/BuyerListing');
const PurchaseOrder = require('./models/PurchaseOrder');
const Transaction = require('./models/Transaction');
const InventoryLot = require('./models/InventoryLot');
const connectDB = require('./config/db');
const axios = require('axios');

const API_BASE = 'http://localhost:5001/api';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function runTests() {
  console.log("--- PHASE 5.6 INTEGRATION TESTS ---");
  await connectDB();

  async function registerUser(email, role) {
    const res = await axios.post(`${API_BASE}/auth/register`, {
      firstName: 'Test',
      lastName: 'User',
      phone: `99999${Math.floor(Math.random() * 10000)}`,
      email,
      password: 'password123',
      role
    });
    return { token: res.data.token, user: res.data.user };
  }

  // 1. Get tokens
  const buyerLogin = await registerUser(`buyer_${Date.now()}@test.com`, 'BUYER');
  const buyerToken = buyerLogin.token;
  const buyerUser = buyerLogin.user;

  const f1Login = await registerUser(`f1_${Date.now()}@test.com`, 'FARMER');
  const f1Token = f1Login.token;
  
  const f2Login = await registerUser(`f2_${Date.now()}@test.com`, 'FARMER');
  const f2Token = f2Login.token;

  const f3Login = await registerUser(`f3_${Date.now()}@test.com`, 'FARMER');
  const f3Token = f3Login.token;

  const f4Login = await registerUser(`f4_${Date.now()}@test.com`, 'FARMER');
  const f4Token = f4Login.token;

  const f5Login = await registerUser(`f5_${Date.now()}@test.com`, 'FARMER');
  const f5Token = f5Login.token;

  const bHeaders = { headers: { Authorization: `Bearer ${buyerToken}` } };
  const f1Headers = { headers: { Authorization: `Bearer ${f1Token}` } };
  const f2Headers = { headers: { Authorization: `Bearer ${f2Token}` } };
  const f3Headers = { headers: { Authorization: `Bearer ${f3Token}` } };
  const f4Headers = { headers: { Authorization: `Bearer ${f4Token}` } };
  const f5Headers = { headers: { Authorization: `Bearer ${f5Token}` } };

  // 2. Create Listing directly in DB for testing
  const freshListing = await BuyerListing.create({
    buyerId: buyerUser.id,
    buyer_name: buyerUser.firstName + ' ' + buyerUser.lastName,
    buyer_type: 'Retail Chain',
    state: 'Uttar Pradesh',
    district: 'Agra',
    market: 'Agra Mandi',
    commodity: 'Wheat',
    quantity_required: '100 quintals',
    offered_price: 2300,
    status: 'Active',
    is_demo: false
  });
  let testListing = freshListing;
  console.log(`Created fresh listing for 100 quintals: ${freshListing._id}`);

  async function propose(tokenH, qty) {
    const res = await axios.post(`${API_BASE}/purchase-orders`, {
      listingId: testListing._id,
      quantity: qty,
      price: 2300,
      location: 'Test Location'
    }, tokenH);
    return res.data;
  }

  async function approve(orderId) {
    return axios.post(`${API_BASE}/purchase-orders/${orderId}/approve`, {}, bHeaders);
  }

  async function reject(orderId) {
    return axios.post(`${API_BASE}/purchase-orders/${orderId}/reject`, {}, bHeaders);
  }

  // --- TEST 1, 2, 3: Create proposals and approve them ---
  console.log("\nTEST 1, 2, 3: Multi-Farmer Fulfillment");
  const o1 = await propose(f1Headers, 30);
  const o2 = await propose(f2Headers, 40);
  const o3 = await propose(f3Headers, 30);
  
  await approve(o1.order._id);
  await approve(o2.order._id);
  await approve(o3.order._id);

  console.log("All 3 orders approved.");

  // --- TEST 4: Unique Batch Identities ---
  console.log("\nTEST 4: Unique Batch Identities");
  const txns = await Transaction.find({ sourceType: 'PURCHASE_ORDER', sourceId: { $in: [o1.order._id, o2.order._id, o3.order._id] } });
  
  if (txns.length !== 3) throw new Error("Expected 3 transactions");
  const batchIds = txns.map(t => t.batchId);
  const uniqueBatches = new Set(batchIds);
  if (uniqueBatches.size !== 3) throw new Error(`Batch IDs are not unique! ${batchIds}`);
  console.log("SUCCESS: 3 unique batch IDs generated.");

  // --- TEST 5: Farmer Origins Queryable ---
  console.log("\nTEST 5: Farmer Origins");
  const lots = await InventoryLot.find({ originTransaction: { $in: txns.map(t => t._id) } });
  if (lots.length !== 3) throw new Error("Expected 3 inventory lots");
  console.log("SUCCESS: 3 unique inventory lots created linking to farmers.");

  // --- TEST 6: Buyer Total Inventory = 100q ---
  console.log("\nTEST 6: Buyer Total Inventory");
  const totalInv = lots.reduce((acc, lot) => acc + lot.availableQuantity, 0);
  if (totalInv !== 100) throw new Error(`Total inventory should be 100, got ${totalInv}`);
  console.log(`SUCCESS: Total buyer inventory is exactly ${totalInv}q`);

  // --- TEST 7: Attempt unauthorized inventory write ---
  console.log("\nTEST 7: Unauthorized Inventory Endpoint");
  try {
    await axios.post(`${API_BASE}/inventory`, { quantity: 1000 }, bHeaders);
    throw new Error("Should have failed, endpoint should not exist");
  } catch(e) {
    if(e.response && e.response.status === 404) {
      console.log("SUCCESS: No direct POST /api/inventory exists.");
    } else {
      throw e;
    }
  }

  // --- TEST 8 & 9: Schema bounds enforcement ---
  console.log("\nTEST 8 & 9: Mongoose Bounds");
  const lot = lots[0];
  try {
    lot.availableQuantity = 50; // original is 30
    await lot.save();
    throw new Error("Should not allow available > original");
  } catch (e) {
    if (!e.message.includes('cannot exceed originalQuantity')) throw e;
    console.log("SUCCESS: Blocked availableQuantity > originalQuantity");
  }

  try {
    lot.availableQuantity = -5;
    await lot.save();
    throw new Error("Should not allow negative available");
  } catch (e) {
    if (!e.message.includes('negative')) throw e;
    console.log("SUCCESS: Blocked negative availableQuantity");
  }

  // --- TEST 10 & 11: Pending/Rejected do not create inventory ---
  console.log("\nTEST 10 & 11: Pending/Rejected");
  const fresh2 = await BuyerListing.create({
    buyerId: buyerUser.id,
    buyer_name: buyerUser.firstName,
    buyer_type: 'Retail',
    state: 'UP',
    district: 'Agra',
    market: 'Test Mandi',
    commodity: 'Wheat',
    quantity_required: '50 quintals',
    offered_price: 2300,
    status: 'Active',
    is_demo: false
  });
  testListing = fresh2;

  const pendingOrder = await propose(f1Headers, 10);
  const rejectOrder = await propose(f2Headers, 10);
  await reject(rejectOrder.order._id);
  
  const pendingTxn = await Transaction.findOne({ sourceId: pendingOrder.order._id });
  const pendingLot = await InventoryLot.findOne({ originFarmer: pendingOrder.order.sellerId, originalQuantity: 10, batchId: `BATCH-${pendingOrder.order._id}` });
  
  const rejectTxn = await Transaction.findOne({ sourceId: rejectOrder.order._id });
  const rejectLot = await InventoryLot.findOne({ batchId: `BATCH-${rejectOrder.order._id}` });

  if (pendingTxn || pendingLot || rejectTxn || rejectLot) {
    throw new Error("Inventory or Transaction created for pending/rejected orders!");
  }
  console.log("SUCCESS: PENDING/REJECTED orders do not mint records.");

  // --- TEST 12: Duplicate Approval ---
  console.log("\nTEST 12: Duplicate Approval");
  const dupOrder = await propose(f1Headers, 10);
  await approve(dupOrder.order._id);
  try {
    await approve(dupOrder.order._id);
  } catch(e) {
    if (e.response.status !== 400) throw e;
  }
  const dupLots = await InventoryLot.find({ batchId: `BATCH-${dupOrder.order._id}` });
  if (dupLots.length !== 1) throw new Error("Duplicate approval created multiple lots!");
  console.log("SUCCESS: Duplicate approval protected.");

  // --- TEST 13: Crop Journey Array Mapping ---
  console.log("\nTEST 13: Crop Journey Array Mapping");
  // Querying Crop Journey with batchId of o1 (from the first listing)
  const journeyRes = await axios.get(`${API_BASE}/transactions/journey/${batchIds[0]}`);
  const journey = journeyRes.data.journey;
  if (!journey.farmers || !Array.isArray(journey.farmers)) throw new Error("journey.farmers is not an array");
  if (journey.farmers.length !== 3) throw new Error(`Expected 3 farmers in journey context, got ${journey.farmers.length}`);
  console.log("SUCCESS: Crop Journey correctly grouped 3 farmers into the array without overwriting.");

  console.log("\n--- ALL PHASE 5.6 TESTS PASSED ---");
  process.exit(0);
}

runTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
