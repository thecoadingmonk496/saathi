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
  console.log("--- PHASE 7: WHOLESALER TO DISTRIBUTOR TESTS ---");
  let buyer, bHeaders;
  let wholesaler, wHeaders;
  let dist1, d1Headers;
  let dist2, d2Headers;
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

    const farmer1 = await registerUser(`f1_${ts}@test.com`, 'FARMER');
    const farmer2 = await registerUser(`f2_${ts}@test.com`, 'FARMER');
    buyer = await registerUser(`b_${ts}@test.com`, 'BUYER');
    wholesaler = await registerUser(`w_${ts}@test.com`, 'WHOLESALER');
    dist1 = await registerUser(`d1_${ts}@test.com`, 'DISTRIBUTOR');
    dist2 = await registerUser(`d2_${ts}@test.com`, 'DISTRIBUTOR');

    const f1Headers = { headers: { Authorization: `Bearer ${farmer1.token}` } };
    const f2Headers = { headers: { Authorization: `Bearer ${farmer2.token}` } };
    bHeaders = { headers: { Authorization: `Bearer ${buyer.token}` } };
    wHeaders = { headers: { Authorization: `Bearer ${wholesaler.token}` } };
    d1Headers = { headers: { Authorization: `Bearer ${dist1.token}` } };
    d2Headers = { headers: { Authorization: `Bearer ${dist2.token}` } };

    // 2. Setup Farmer -> Buyer -> Wholesaler
    const listing = await BuyerListing.create({
      buyerId: buyer.user.id, buyer_name: 'Test', buyer_type: 'Retail', state: 'UP', district: 'Agra', market: 'Test Mandi',
      commodity: 'Wheat', quantity_required: '100 quintals', offered_price: 2300, status: 'Active'
    });

    const po1 = await axios.post(`${API_BASE}/purchase-orders`, { listingId: listing._id, quantity: 30 }, f1Headers);
    await axios.post(`${API_BASE}/purchase-orders/${po1.data.order._id}/approve`, {}, bHeaders);

    const po2 = await axios.post(`${API_BASE}/purchase-orders`, { listingId: listing._id, quantity: 40 }, f2Headers);
    await axios.post(`${API_BASE}/purchase-orders/${po2.data.order._id}/approve`, {}, bHeaders);

    const po3 = await axios.post(`${API_BASE}/purchase-orders`, { targetBuyerId: wholesaler.user.id, quantity: 70, product: 'Wheat', price: 2400, location: 'Loc', stage: 'BUYER_TO_WHOLESALER' }, bHeaders);
    await axios.post(`${API_BASE}/purchase-orders/${po3.data.order._id}/approve`, {}, wHeaders);

    // Verify wholesaler has 70q from two lots
    const lots = await InventoryLot.find({ ownerId: wholesaler.user.id, crop: 'Wheat' }).sort({ createdAt: 1, _id: 1 });
    if (lots.length !== 2) throw new Error("Setup failed: expected 2 lots for wholesaler");
    if (lots[0].availableQuantity !== 30 || lots[1].availableQuantity !== 40) throw new Error("Setup failed: incorrect lot quantities");
    console.log("Setup complete: Wholesaler has 70q Wheat from 2 farmers (30q, 40q)");

    // 3. Test Distributor Discovery
    console.log("\nTEST 1: Wholesaler can discover Distributors");
    const distRes = await axios.get(`${API_BASE}/distributors`, wHeaders);
    if (!distRes.data.distributors.some(d => d._id === dist1.user.id)) throw new Error("Distributor not discovered");
    console.log("SUCCESS: Discovered distributor");

    // 4. Test Self Dealing Rejection
    console.log("\nTEST 2: Self-dealing / Role mismatch is rejected");
    try {
      await axios.post(`${API_BASE}/purchase-orders`, { targetBuyerId: wholesaler.user.id, quantity: 10, product: 'Wheat', price: 2500, location: 'Loc', stage: 'WHOLESALER_TO_DISTRIBUTOR' }, wHeaders);
      throw new Error("Should have rejected self dealing");
    } catch (e) {
      if (e.response.status !== 400 || !e.response.data.message.includes('Target user must be a DISTRIBUTOR')) throw e;
      console.log("SUCCESS: Self-dealing / Role mismatch rejected");
    }

    // 5. Test Quantity > Inventory is rejected
    console.log("\nTEST 3: Quantity > inventory is rejected");
    try {
      await axios.post(`${API_BASE}/purchase-orders`, { targetBuyerId: dist1.user.id, quantity: 80, product: 'Wheat', price: 2500, location: 'Loc', stage: 'WHOLESALER_TO_DISTRIBUTOR' }, wHeaders);
      throw new Error("Should have rejected oversell");
    } catch (e) {
      if (e.response.status !== 400 || !e.response.data.message.includes('Insufficient inventory')) throw e;
      console.log("SUCCESS: Oversell rejected");
    }

    // 6. Wholesaler proposes to Dist1
    console.log("\nTEST 4: Create valid proposal (60q)");
    const dPO = await axios.post(`${API_BASE}/purchase-orders`, { targetBuyerId: dist1.user.id, quantity: 60, product: 'Wheat', price: 2500, location: 'Loc', stage: 'WHOLESALER_TO_DISTRIBUTOR' }, wHeaders);
    console.log("SUCCESS: Proposal created");

    // 7. Wrong Distributor cannot approve
    console.log("\nTEST 5: Wrong Distributor cannot approve");
    try {
      await axios.post(`${API_BASE}/purchase-orders/${dPO.data.order._id}/approve`, {}, d2Headers);
      throw new Error("Should have rejected wrong distributor");
    } catch (e) {
      if (e.response.status !== 403) throw e;
      console.log("SUCCESS: Wrong distributor rejected");
    }

    // 8. Distributor approval succeeds
    console.log("\nTEST 6: Distributor approval succeeds & FIFO");
    await axios.post(`${API_BASE}/purchase-orders/${dPO.data.order._id}/approve`, {}, d1Headers);
    
    // Verify inventory changes
    const wLots = await InventoryLot.find({ ownerId: wholesaler.user.id, crop: 'Wheat' }).sort({ createdAt: 1, _id: 1 });
    if (wLots[0].availableQuantity !== 0 || wLots[1].availableQuantity !== 10) throw new Error(`FIFO Failed: wLots is ${wLots.map(l => l.availableQuantity)}`);
    console.log("SUCCESS: FIFO correct on Wholesaler side");

    const dLots = await InventoryLot.find({ ownerId: dist1.user.id, crop: 'Wheat' }).sort({ createdAt: 1, _id: 1 });
    if (dLots.length !== 2) throw new Error("Expected 2 distributor lots for lineage");
    if (dLots[0].availableQuantity !== 30 || dLots[1].availableQuantity !== 30) throw new Error("Incorrect distributor quantities");
    if (dLots[0].farmerBatchId !== lots[0].farmerBatchId || dLots[1].farmerBatchId !== lots[1].farmerBatchId) throw new Error("Provenance lineage lost");
    console.log("SUCCESS: Provenance preserved with exact lineage matching");

    // 9. Verify Crop Journey
    console.log("\nTEST 7: Crop Journey integration");
    const cj = await axios.get(`${API_BASE}/transactions/journey/${dLots[0].farmerBatchId}`);
    if (cj.data.journey.farmers.length !== 2) throw new Error("Should show 2 farmers");
    if (cj.data.journey.wholesaler.status === 'unavailable') throw new Error("Should show wholesaler");
    if (cj.data.journey.distributor.status === 'unavailable') throw new Error("Should show distributor");
    console.log("SUCCESS: Crop Journey shows complete multi-source tree");

    console.log("\n--- ALL PHASE 7 TESTS PASSED ---");

  } catch (error) {
    console.error("Test failed:", error);
    process.exit(1);
  } finally {
    mongoose.disconnect();
  }
}

runTests();
