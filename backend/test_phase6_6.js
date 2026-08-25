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
  console.log("--- PHASE 6.6 ATOMICITY & CONCURRENCY TESTS ---");
  let wholesaler2, w2Headers;
  let buyer, bHeaders;
  let listing, po1, pOrderId;
  try {
    await connectDB();
    console.log("MongoDB connected successfully");

    // 1. Setup Accounts
    const ts = Date.now();
    const registerUser = async (email, role) => {
      const res = await axios.post(`${API_BASE}/auth/register`, {
        firstName: 'Test', lastName: role, phone: `999${Math.floor(Math.random() * 1000000)}`, email, password: 'password123', role
      });
      return { token: res.data.token, user: res.data.user };
    };

    const farmer = await registerUser(`f_${ts}@test.com`, 'FARMER');
    buyer = await registerUser(`b_${ts}@test.com`, 'BUYER');
    const wholesaler1 = await registerUser(`w1_${ts}@test.com`, 'WHOLESALER');
    wholesaler2 = await registerUser(`w2_${ts}@test.com`, 'WHOLESALER');

    const fHeaders = { headers: { Authorization: `Bearer ${farmer.token}` } };
    bHeaders = { headers: { Authorization: `Bearer ${buyer.token}` } };
    const w1Headers = { headers: { Authorization: `Bearer ${wholesaler1.token}` } };
    w2Headers = { headers: { Authorization: `Bearer ${wholesaler2.token}` } };

    // 2. Setup Farmer -> Buyer
    listing = await BuyerListing.create({
      buyerId: buyer.user.id, buyer_name: 'Test', buyer_type: 'Retail', state: 'UP', district: 'Agra', market: 'Test Mandi',
      commodity: 'Wheat', quantity_required: '100 quintals', offered_price: 2300, status: 'Active'
    });

    po1 = await axios.post(`${API_BASE}/purchase-orders`, { listingId: listing._id, quantity: 100 }, fHeaders);
    await axios.post(`${API_BASE}/purchase-orders/${po1.data.order._id}/approve`, {}, bHeaders);

    // Verify 100q inventory
    const lots = await InventoryLot.find({ ownerId: buyer.user.id, crop: 'Wheat' });
    if (lots.length !== 1 || lots[0].availableQuantity !== 100) throw new Error("Setup failed");
    console.log("Setup complete: Buyer has 100q Wheat");

    // 3. Test Concurrent Approvals
    console.log("\nTEST: Concurrent over-approval should be blocked by OCC");
    const dPO1 = await axios.post(`${API_BASE}/purchase-orders`, {
      targetBuyerId: wholesaler1.user.id, quantity: 70, product: 'Wheat', price: 2400, location: 'Loc', stage: 'BUYER_TO_WHOLESALER'
    }, bHeaders);
    
    const dPO2 = await axios.post(`${API_BASE}/purchase-orders`, {
      targetBuyerId: wholesaler2.user.id, quantity: 70, product: 'Wheat', price: 2400, location: 'Loc', stage: 'BUYER_TO_WHOLESALER'
    }, bHeaders);

    const [res1, res2] = await Promise.allSettled([
      axios.post(`${API_BASE}/purchase-orders/${dPO1.data.order._id}/approve`, {}, w1Headers),
      axios.post(`${API_BASE}/purchase-orders/${dPO2.data.order._id}/approve`, {}, w2Headers)
    ]);

    const successes = [res1, res2].filter(r => r.status === 'fulfilled');
    const failures = [res1, res2].filter(r => r.status === 'rejected');

    if (successes.length !== 1) throw new Error(`Expected exactly 1 success, got ${successes.length}`);
    if (failures.length !== 1) throw new Error(`Expected exactly 1 failure, got ${failures.length}`);
    if (failures[0].reason.response.status !== 409) throw new Error(`Expected 409 Conflict, got ${failures[0].reason.response.status}`);
    
    console.log("SUCCESS: OCC correctly blocked the concurrent over-approval!");

    // Verify remaining inventory is 30q
    const bLots = await InventoryLot.find({ ownerId: buyer.user.id });
    if (bLots[0].availableQuantity !== 30) throw new Error(`Buyer inventory is ${bLots[0].availableQuantity}, expected 30`);
    console.log("SUCCESS: Buyer inventory is strictly 30q.");

    // Verify Semantics
    console.log("\nTEST: Semantics and Lineage");
    const wLots = await InventoryLot.find({ ownerRole: 'WHOLESALER', ownerId: { $in: [wholesaler1.user.id, wholesaler2.user.id] } });
    if (wLots.length !== 1) throw new Error(`Expected 1 Wholesaler lot, got ${wLots.length}`);
    if (!wLots[0].farmerBatchId) throw new Error("farmerBatchId is missing");
    if (!wLots[0].transactionId) throw new Error("transactionId is missing");
    console.log("SUCCESS: Wholesaler lot has explicit farmerBatchId and transactionId.");

    // Verify Crop Journey
    console.log("\nTEST: Crop Journey with new semantics");
    const cj = await axios.get(`${API_BASE}/transactions/journey/${wLots[0].farmerBatchId}`);
    if (cj.data.journey.farmers.length === 0 || cj.data.journey.wholesaler.status === 'unavailable') {
      throw new Error("Crop journey could not reconstruct lineage.");
    }
    console.log("SUCCESS: Crop Journey successfully tracked lineage using explicit fields.");

    console.log("\n--- ALL PHASE 6.6 TESTS PASSED ---");
    process.exit(0);
  } catch (err) {
    console.error("Test failed:", err);
    process.exit(1);
  }
}

runTests();
