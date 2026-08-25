const mongoose = require('mongoose');
require('dotenv').config();

async function runTest() {
  const baseUrl = 'http://localhost:5001/api';

  console.log('--- PHASE 5 INTEGRATION TEST ---');

  // Helper to register farmers
  async function registerFarmer(num) {
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'F',
        lastName: `${num}`,
        phone: `88888${Math.floor(Math.random() * 10000)}`,
        email: `f${num}_${Date.now()}@test.com`,
        password: 'password123',
        role: 'FARMER'
      })
    });
    const data = await res.json();
    return data.token;
  }

  // 1. Get Demobuyer token
  const buyerRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demobuyer@saathi.com', password: 'demopass123' })
  });
  const buyerToken = (await buyerRes.json()).token;

  // 2. We need a listing with exactly 100. Let's find one or use existing
  const listRes = await fetch(`${baseUrl}/buyer-listings?limit=10`);
  const listings = (await listRes.json()).listings;
  
  // Create a specific 100 quintal listing directly in the DB using the demo buyer to ensure predictable testing
  const BuyerListing = require('./models/BuyerListing');
  const User = require('./models/User');
  await require('./config/db')();
  const demoBuyer = await User.findOne({ email: 'demobuyer@saathi.com' });
  
  const testListing = await BuyerListing.create({
    buyerId: demoBuyer._id,
    buyer_name: 'Test Fulfillment Buyer',
    buyer_type: 'Wholesaler',
    commodity: 'Wheat',
    offered_price: 2500,
    quantity_required: '100 quintals',
    market: 'Test Market',
    district: 'Test District',
    state: 'Test State',
    is_demo: true
  });
  console.log(`Created test listing for 100 quintals: ${testListing._id}`);

  // Create 5 farmers
  const f1 = await registerFarmer(1);
  const f2 = await registerFarmer(2);
  const f3 = await registerFarmer(3);
  const f4 = await registerFarmer(4);
  const f5 = await registerFarmer(5);

  async function propose(token, qty) {
    const res = await fetch(`${baseUrl}/purchase-orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ listingId: testListing._id, quantity: qty })
    });
    return res.json();
  }

  async function approve(orderId) {
    const res = await fetch(`${baseUrl}/purchase-orders/${orderId}/approve`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${buyerToken}` }
    });
    return res.json();
  }
  
  async function reject(orderId) {
    const res = await fetch(`${baseUrl}/purchase-orders/${orderId}/reject`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${buyerToken}` }
    });
    return res.json();
  }

  // TEST 1: First fulfillment (30)
  console.log('Test 1: Approving 30...');
  const o1 = await propose(f1, 30);
  await approve(o1.order._id);

  // TEST 2: Second fulfillment (40)
  console.log('Test 2: Approving 40...');
  const o2 = await propose(f2, 40);
  await approve(o2.order._id);

  // Check state
  const check1 = await fetch(`${baseUrl}/buyer-listings?commodity=Wheat`);
  const listingsAfter = (await check1.json()).listings;
  const currentListing = listingsAfter.find(l => l._id === testListing._id.toString());
  console.log(`State: Requested=${currentListing.requestedQuantity}, Accepted=${currentListing.acceptedQuantity}, Remaining=${currentListing.remainingQuantity}, Status=${currentListing.fulfillmentStatus}`);
  
  if (currentListing.remainingQuantity !== 30) throw new Error('Remaining quantity should be 30');

  // TEST 3: Over-fulfillment (Propose 40 when 30 remains)
  console.log('Test 3: Over-fulfillment check...');
  const o3 = await propose(f3, 40);
  if (!o3.success) {
      console.log('Successfully blocked by frontend/createOrder logic:', o3.message);
  } else {
      // If it bypasses propose, try to approve
      const a3 = await approve(o3.order._id);
      console.log('Approve result for over-fulfillment:', a3);
      if (a3.success) throw new Error('Over-fulfillment allowed!');
  }

  // TEST 6: Rejected doesn't impact
  console.log('Test 6: Rejecting order...');
  const o6 = await propose(f4, 10);
  await reject(o6.order._id);

  // TEST 9: Concurrent approvals (Write Skew test)
  console.log('Test 9: Concurrent Approvals...');
  // Remaining is 30. Let's propose two 20s. Sum = 40. Should block one.
  const o9a = await propose(f1, 20);
  const o9b = await propose(f5, 20);

  // Fire simultaneously
  const [res9a, res9b] = await Promise.all([
    approve(o9a.order._id),
    approve(o9b.order._id)
  ]);
  console.log('Concurrent A:', res9a.message);
  console.log('Concurrent B:', res9b.message);
  
  const check2 = await fetch(`${baseUrl}/buyer-listings?commodity=Wheat`);
  const finalListing = (await check2.json()).listings.find(l => l._id === testListing._id.toString());
  console.log(`Final State: Accepted=${finalListing.acceptedQuantity}, Remaining=${finalListing.remainingQuantity}, Status=${finalListing.fulfillmentStatus}`);

  if (finalListing.acceptedQuantity > 100) {
      throw new Error('CONCURRENCY FAILED: Total accepted exceeds requested quantity!');
  } else {
      console.log('CONCURRENCY SAFE: Over-fulfillment prevented.');
  }

  process.exit(0);
}

runTest();
