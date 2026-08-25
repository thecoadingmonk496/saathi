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
  console.log("--- PHASE 9: RETAILER TO CONSUMER TESTS ---");
  let buyer, wholesaler, dist1, ret1, con1, con2;
  let bHeaders, wHeaders, d1Headers, r1Headers, c1Headers, c2Headers;
  
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
    ret1 = await registerUser(`r1_${ts}@test.com`, 'RETAILER');
    con1 = await registerUser(`c1_${ts}@test.com`, 'CONSUMER');
    con2 = await registerUser(`c2_${ts}@test.com`, 'CONSUMER');

    const f1Headers = { headers: { Authorization: `Bearer ${farmer1.token}` } };
    const f2Headers = { headers: { Authorization: `Bearer ${farmer2.token}` } };
    bHeaders = { headers: { Authorization: `Bearer ${buyer.token}` } };
    wHeaders = { headers: { Authorization: `Bearer ${wholesaler.token}` } };
    d1Headers = { headers: { Authorization: `Bearer ${dist1.token}` } };
    r1Headers = { headers: { Authorization: `Bearer ${ret1.token}` } };
    c1Headers = { headers: { Authorization: `Bearer ${con1.token}` } };
    c2Headers = { headers: { Authorization: `Bearer ${con2.token}` } };

    // 2. Flow to Retailer (100q total: 60q F1, 40q F2)
    const listing = await BuyerListing.create({
      buyerId: buyer.user.id, buyer_name: 'Test', buyer_type: 'Retail', state: 'UP', district: 'Agra', market: 'Test Mandi',
      commodity: 'Wheat', quantity_required: '100 quintals', offered_price: 2300, status: 'Active'
    });

    const po1 = await axios.post(`${API_BASE}/purchase-orders`, { listingId: listing._id, quantity: 60 }, f1Headers);
    await axios.post(`${API_BASE}/purchase-orders/${po1.data.order._id}/approve`, {}, bHeaders);

    const po2 = await axios.post(`${API_BASE}/purchase-orders`, { listingId: listing._id, quantity: 40 }, f2Headers);
    await axios.post(`${API_BASE}/purchase-orders/${po2.data.order._id}/approve`, {}, bHeaders);

    const po3 = await axios.post(`${API_BASE}/purchase-orders`, { targetBuyerId: wholesaler.user.id, quantity: 100, product: 'Wheat', price: 2400, location: 'Loc', stage: 'BUYER_TO_WHOLESALER' }, bHeaders);
    await axios.post(`${API_BASE}/purchase-orders/${po3.data.order._id}/approve`, {}, wHeaders);

    const po4 = await axios.post(`${API_BASE}/purchase-orders`, { targetBuyerId: dist1.user.id, quantity: 100, product: 'Wheat', price: 2500, location: 'Loc', stage: 'WHOLESALER_TO_DISTRIBUTOR' }, wHeaders);
    await axios.post(`${API_BASE}/purchase-orders/${po4.data.order._id}/approve`, {}, d1Headers);
    
    const po5 = await axios.post(`${API_BASE}/purchase-orders`, { targetBuyerId: ret1.user.id, quantity: 100, product: 'Wheat', price: 2600, location: 'Loc', stage: 'DISTRIBUTOR_TO_RETAILER' }, d1Headers);
    await axios.post(`${API_BASE}/purchase-orders/${po5.data.order._id}/approve`, {}, r1Headers);

    const rLots = await InventoryLot.find({ ownerId: ret1.user.id, crop: 'Wheat' }).sort({ createdAt: 1, _id: 1 });
    if (rLots.length !== 2 || rLots[0].availableQuantity !== 60 || rLots[1].availableQuantity !== 40) throw new Error("Setup failed: retailer missing lots");
    console.log("Setup complete: Retailer has 100q Wheat from 2 farmers (60q, 40q)");

    // 3. Test Consumer Discovery
    console.log("\nTEST 1: Retailer can discover Consumers");
    const conRes = await axios.get(`${API_BASE}/consumers`, r1Headers);
    if (!conRes.data.consumers.some(c => c._id === con1.user.id)) throw new Error("Consumer not discovered");
    console.log("SUCCESS: Discovered consumer");

    // 4. Invalid Role Rejection
    console.log("\nTEST 2: Invalid Consumer target rejected");
    try {
      await axios.post(`${API_BASE}/purchase-orders`, { targetBuyerId: dist1.user.id, quantity: 10, product: 'Wheat', price: 2700, location: 'Loc', stage: 'RETAILER_TO_CONSUMER' }, r1Headers);
      throw new Error("Should have rejected invalid consumer target");
    } catch (e) {
      if (e.response.status !== 400 || !e.response.data.message.includes('Target user must be a CONSUMER')) throw e;
      console.log("SUCCESS: Invalid consumer target rejected");
    }

    // 5. Quantity > Inventory Rejection
    console.log("\nTEST 3: Quantity > inventory is rejected");
    try {
      await axios.post(`${API_BASE}/purchase-orders`, { targetBuyerId: con1.user.id, quantity: 110, product: 'Wheat', price: 2700, location: 'Loc', stage: 'RETAILER_TO_CONSUMER' }, r1Headers);
      throw new Error("Should have rejected oversell");
    } catch (e) {
      if (e.response.status !== 400 || !e.response.data.message.includes('Insufficient inventory')) throw e;
      console.log("SUCCESS: Oversell rejected");
    }

    // 6. Test Concurrent Double Spend (70q + 70q > 100q)
    console.log("\nTEST 4: Concurrent approvals cannot oversell");
    const cPO1 = await axios.post(`${API_BASE}/purchase-orders`, { targetBuyerId: con1.user.id, quantity: 70, product: 'Wheat', price: 2700, location: 'Loc', stage: 'RETAILER_TO_CONSUMER' }, r1Headers);
    const cPO2 = await axios.post(`${API_BASE}/purchase-orders`, { targetBuyerId: con2.user.id, quantity: 70, product: 'Wheat', price: 2700, location: 'Loc', stage: 'RETAILER_TO_CONSUMER' }, r1Headers);

    const [res1, res2] = await Promise.allSettled([
      axios.post(`${API_BASE}/purchase-orders/${cPO1.data.order._id}/approve`, {}, c1Headers),
      axios.post(`${API_BASE}/purchase-orders/${cPO2.data.order._id}/approve`, {}, c2Headers)
    ]);

    const successes = [res1, res2].filter(r => r.status === 'fulfilled');
    const failures = [res1, res2].filter(r => r.status === 'rejected');

    if (successes.length !== 1) throw new Error(`Expected exactly 1 success, got ${successes.length}`);
    if (failures.length !== 1) throw new Error(`Expected exactly 1 failure, got ${failures.length}`);
    if (failures[0].reason.response.status !== 409) throw new Error(`Expected 409 Conflict, got ${failures[0].reason.response.status}`);
    
    console.log("SUCCESS: OCC correctly blocked the concurrent over-approval!");

    // Verify inventory changes (100q - 70q = 30q left for retailer)
    const rLotsAfter = await InventoryLot.find({ ownerId: ret1.user.id, crop: 'Wheat' }).sort({ createdAt: 1, _id: 1 });
    if (rLotsAfter[0].availableQuantity !== 0 || rLotsAfter[1].availableQuantity !== 30) throw new Error(`FIFO Failed: rLots is ${rLotsAfter.map(l => l.availableQuantity)}`);
    console.log("SUCCESS: FIFO correct on Retailer side (0q, 30q)");

    // Determine which consumer won
    const winnerId = successes[0].value.config.url.includes(cPO1.data.order._id) ? con1.user.id : con2.user.id;
    const cLots = await InventoryLot.find({ ownerId: winnerId, crop: 'Wheat' }).sort({ createdAt: 1, _id: 1 });
    if (cLots.length !== 2) throw new Error("Expected 2 consumer lots for lineage");
    if (cLots[0].availableQuantity !== 60 || cLots[1].availableQuantity !== 10) throw new Error("Incorrect consumer quantities");
    if (cLots[0].farmerBatchId !== rLots[0].farmerBatchId || cLots[1].farmerBatchId !== rLots[1].farmerBatchId) throw new Error("Provenance lineage lost");
    console.log("SUCCESS: Provenance preserved with exact lineage matching (60q from F1, 10q from F2)");

    // 7. Verify Crop Journey reaches Consumer
    console.log("\nTEST 5: Crop Journey includes CONSUMER");
    const cj = await axios.get(`${API_BASE}/transactions/journey/${cLots[0].farmerBatchId}`);
    if (cj.data.journey.farmers.length !== 2) throw new Error("Should show 2 farmers");
    if (cj.data.journey.wholesaler.status === 'unavailable') throw new Error("Should show wholesaler");
    if (cj.data.journey.distributor.status === 'unavailable') throw new Error("Should show distributor");
    if (cj.data.journey.retailer.status === 'unavailable') throw new Error("Should show retailer");
    if (cj.data.journey.consumer.status === 'unavailable') throw new Error("Should show consumer");
    console.log("SUCCESS: Crop Journey shows complete multi-source tree all the way to Consumer");

    console.log("\n--- ALL PHASE 9 TESTS PASSED ---");

  } catch (error) {
    console.error("Test failed:", error);
    process.exit(1);
  } finally {
    mongoose.disconnect();
  }
}

runTests();
