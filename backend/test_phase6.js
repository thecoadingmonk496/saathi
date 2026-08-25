require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');
const axios = require('axios');
const User = require('./models/User');
const BuyerListing = require('./models/BuyerListing');
const PurchaseOrder = require('./models/PurchaseOrder');
const Transaction = require('./models/Transaction');
const InventoryLot = require('./models/InventoryLot');

const API_BASE = 'http://localhost:5001/api';

const connectDB = require('./config/db');

async function runTests() {
  console.log("--- PHASE 6 INTEGRATION TESTS ---");

  try {
    await connectDB();
    console.log("MongoDB connected successfully");
  } catch (err) {
    console.error("MongoDB connection failed:", err);
    process.exit(1);
  }

  try {
    // 1. Setup Data: Register Farmer, Buyer, Wholesaler
    async function registerUser(email, role) {
      const res = await axios.post(`${API_BASE}/auth/register`, {
        firstName: 'Test',
        lastName: role,
        phone: `99999${Math.floor(Math.random() * 10000)}`,
        email,
        password: 'password123',
        role
      });
      return { token: res.data.token, user: res.data.user };
    }

    const ts = Date.now();
    const farmer1 = await registerUser(`f1_${ts}@test.com`, 'FARMER');
    const farmer2 = await registerUser(`f2_${ts}@test.com`, 'FARMER');
    const buyer = await registerUser(`buyer_${ts}@test.com`, 'BUYER');
    const wholesaler1 = await registerUser(`ws1_${ts}@test.com`, 'WHOLESALER');
    const wholesaler2 = await registerUser(`ws2_${ts}@test.com`, 'WHOLESALER');

    const f1Headers = { headers: { Authorization: `Bearer ${farmer1.token}` } };
    const f2Headers = { headers: { Authorization: `Bearer ${farmer2.token}` } };
    const bHeaders = { headers: { Authorization: `Bearer ${buyer.token}` } };
    const w1Headers = { headers: { Authorization: `Bearer ${wholesaler1.token}` } };

    // 2. Setup Farmer -> Buyer Transactions to give Buyer 100q
    const listing = await BuyerListing.create({
      buyerId: buyer.user.id,
      buyer_name: buyer.user.firstName,
      buyer_type: 'Retail',
      state: 'UP',
      district: 'Agra',
      market: 'Test Mandi',
      commodity: 'Wheat',
      quantity_required: '100 quintals',
      offered_price: 2300,
      status: 'Active',
      is_demo: false
    });

    const po1 = await axios.post(`${API_BASE}/purchase-orders`, {
      listingId: listing._id,
      quantity: 30
    }, f1Headers);

    const po2 = await axios.post(`${API_BASE}/purchase-orders`, {
      listingId: listing._id,
      quantity: 40
    }, f2Headers);

    const po3 = await axios.post(`${API_BASE}/purchase-orders`, {
      listingId: listing._id,
      quantity: 30
    }, f1Headers);

    await axios.post(`${API_BASE}/purchase-orders/${po1.data.order._id}/approve`, {}, bHeaders);
    await axios.post(`${API_BASE}/purchase-orders/${po2.data.order._id}/approve`, {}, bHeaders);
    await axios.post(`${API_BASE}/purchase-orders/${po3.data.order._id}/approve`, {}, bHeaders);

    // Verify buyer inventory is 100q
    const lots = await InventoryLot.find({ ownerId: buyer.user.id, crop: 'Wheat' }).sort({ createdAt: 1 });
    let totalBuyerInv = lots.reduce((sum, l) => sum + l.availableQuantity, 0);
    if (totalBuyerInv !== 100) throw new Error("Setup failed, buyer does not have 100q");
    console.log("Setup complete: Buyer has 100q (3 lots: 30q, 40q, 30q)");

    // --- TEST 1: Buyer creates downstream proposal (Pending) ---
    console.log("\nTEST 1 & 8: Pending downstream order does not deduct inventory");
    const dOrderRes = await axios.post(`${API_BASE}/purchase-orders`, {
      targetBuyerId: wholesaler1.user.id,
      quantity: 60,
      product: 'Wheat',
      price: 2400,
      location: 'Test Location',
      stage: 'BUYER_TO_WHOLESALER'
    }, bHeaders);
    
    if (dOrderRes.data.order.status !== 'PENDING') throw new Error("Order not pending");
    
    const checkLots1 = await InventoryLot.find({ ownerId: buyer.user.id });
    const sum1 = checkLots1.reduce((sum, l) => sum + l.availableQuantity, 0);
    if (sum1 !== 100) throw new Error("Inventory was deducted prematurely!");
    console.log("SUCCESS: Pending order created, no deduction.");

    // --- TEST 2, 6, 7: Wholesaler Approves & FIFO & Provenance ---
    console.log("\nTEST 2, 6, 7: Wholesaler Approval (FIFO & Provenance)");
    const approveRes = await axios.post(`${API_BASE}/purchase-orders/${dOrderRes.data.order._id}/approve`, {}, w1Headers);
    if (!approveRes.data.success) throw new Error("Approval failed");

    // Check Buyer Inventory
    const checkLots2 = await InventoryLot.find({ ownerId: buyer.user.id }).sort({ createdAt: 1 });
    const sum2 = checkLots2.reduce((sum, l) => sum + l.availableQuantity, 0);
    if (sum2 !== 40) throw new Error(`Buyer inventory should be 40q, got ${sum2}`);
    
    // Check FIFO
    if (checkLots2[0].availableQuantity !== 0) throw new Error("First lot not fully consumed");
    if (checkLots2[1].availableQuantity !== 10) throw new Error("Second lot should have 10q remaining (40 - 30)");
    if (checkLots2[2].availableQuantity !== 30) throw new Error("Third lot should have 30q remaining");

    // Check Wholesaler Inventory & Provenance
    const wLots = await InventoryLot.find({ ownerId: wholesaler1.user.id }).sort({ createdAt: 1 });
    if (wLots.length !== 2) throw new Error("Wholesaler should have 2 lots due to split");
    if (wLots[0].originalQuantity !== 30 || wLots[1].originalQuantity !== 30) throw new Error("Wholesaler lots quantities are wrong");
    if (wLots[0].originFarmer.toString() !== farmer1.user.id || wLots[1].originFarmer.toString() !== farmer2.user.id) {
      throw new Error("Provenance originFarmer not preserved");
    }
    console.log("SUCCESS: FIFO consumed correctly. Buyer has 40q remaining. Wholesaler has 60q across 2 lots with preserved provenance.");

    // --- TEST 3 & 12: Duplicate/Self Approval ---
    console.log("\nTEST 3 & 12: Duplicate & Self Approval");
    try {
      await axios.post(`${API_BASE}/purchase-orders/${dOrderRes.data.order._id}/approve`, {}, w1Headers);
      throw new Error("Duplicate approval should fail");
    } catch (e) { if (e.response.status !== 400) throw e; }

    try {
      await axios.post(`${API_BASE}/purchase-orders/${dOrderRes.data.order._id}/approve`, {}, bHeaders);
      throw new Error("Self/Buyer approval should fail");
    } catch (e) { if (e.response.status !== 403) throw e; }
    console.log("SUCCESS: Duplicate and unauthorized approvals blocked.");

    // --- TEST 4: Propose more than available ---
    console.log("\nTEST 4: Over-proposal");
    try {
      await axios.post(`${API_BASE}/purchase-orders`, {
        targetBuyerId: wholesaler1.user.id,
        quantity: 50, // Buyer only has 40 left
        product: 'Wheat',
        price: 2400,
        location: 'Test Location',
        stage: 'BUYER_TO_WHOLESALER'
      }, bHeaders);
      throw new Error("Should not allow 50q proposal when only 40q available");
    } catch (e) { if (e.response.status !== 400) throw e; }
    console.log("SUCCESS: Prevented proposing more than available inventory.");

    // --- TEST 5: Overlapping Approvals ---
    console.log("\nTEST 5: Overlapping Approvals");
    const pA = await axios.post(`${API_BASE}/purchase-orders`, {
      targetBuyerId: wholesaler1.user.id,
      quantity: 30, product: 'Wheat', price: 2400, location: 'Loc', stage: 'BUYER_TO_WHOLESALER'
    }, bHeaders);
    const pB = await axios.post(`${API_BASE}/purchase-orders`, {
      targetBuyerId: wholesaler1.user.id,
      quantity: 20, product: 'Wheat', price: 2400, location: 'Loc', stage: 'BUYER_TO_WHOLESALER'
    }, bHeaders);
    
    await axios.post(`${API_BASE}/purchase-orders/${pA.data.order._id}/approve`, {}, w1Headers);
    try {
      await axios.post(`${API_BASE}/purchase-orders/${pB.data.order._id}/approve`, {}, w1Headers);
      throw new Error("Should fail approval because only 10q remains");
    } catch (e) { if (e.response.status !== 400) throw e; }
    console.log("SUCCESS: Prevented second approval due to lack of inventory.");

    // --- TEST 10: Unauthorized Farmer attempt ---
    console.log("\nTEST 10: Unauthorized Farmer Downstream");
    try {
      await axios.post(`${API_BASE}/purchase-orders`, {
        targetBuyerId: wholesaler1.user.id,
        quantity: 10, product: 'Wheat', price: 2400, location: 'Loc', stage: 'BUYER_TO_WHOLESALER'
      }, f1Headers);
      throw new Error("Farmer should not create downstream order");
    } catch (e) { if (e.response.status !== 403) throw e; }
    console.log("SUCCESS: Blocked farmer.");

    // --- TEST 15: Crop Journey downstream inclusion ---
    console.log("\nTEST 15: Crop Journey Wholesaler Stage");
    const farmerBatchId = lots[0].batchId; // First farmer -> buyer batch
    const journeyRes = await axios.get(`${API_BASE}/transactions/journey/${farmerBatchId}`);
    
    if (journeyRes.data.journey.farmers.length !== 3) throw new Error("Journey missing farmers");
    if (journeyRes.data.journey.wholesaler.status === 'unavailable') {
      throw new Error("Wholesaler stage not populated in journey");
    }
    if (!journeyRes.data.journey.wholesaler.data) throw new Error("Wholesaler data missing");
    console.log("SUCCESS: Crop Journey correctly populated Wholesaler stage via Provenance links.");

    console.log("\n--- ALL PHASE 6 TESTS PASSED ---");
    process.exit(0);
  } catch (err) {
    console.error("Test failed:", err);
    process.exit(1);
  }
}

runTests();
