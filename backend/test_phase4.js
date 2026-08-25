// using native fetch

async function runTest() {
  const baseUrl = 'http://localhost:5001/api';

  console.log('1. Registering a test farmer...');
  const regRes = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firstName: 'Test',
      lastName: 'Farmer',
      phone: `99999${Math.floor(Math.random() * 10000)}`,
      email: `farmer${Math.floor(Math.random() * 10000)}@test.com`,
      password: 'password123',
      role: 'FARMER'
    })
  });
  const regData = await regRes.json();
  const farmerToken = regData.token;
  if (!farmerToken) {
    console.error('Failed to register farmer:', regData);
    return;
  }
  console.log('Farmer registered.');

  console.log('2. Logging in as Demo Buyer...');
  const buyerRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demobuyer@saathi.com', password: 'demopass123' })
  });
  const buyerData = await buyerRes.json();
  const buyerToken = buyerData.token;
  if (!buyerToken) {
    console.error('Failed to login demo buyer:', buyerData);
    return;
  }
  console.log('Buyer logged in.');

  console.log('3. Fetching buyer listings for the farmer...');
  const listRes = await fetch(`${baseUrl}/buyer-listings?limit=1`);
  const listData = await listRes.json();
  const listing = listData.listings[0];
  console.log(`Found listing by ${listing.buyer_name}`);

  console.log('4. Farmer proposes sale (creates PurchaseOrder)...');
  const orderRes = await fetch(`${baseUrl}/purchase-orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${farmerToken}`
    },
    body: JSON.stringify({
      listingId: listing._id,
      quantity: 50
    })
  });
  const orderData = await orderRes.json();
  console.log('Order creation response:', orderData);
  const orderId = orderData.order._id;

  console.log('5. Farmer tries to create transaction directly (Should Fail/404)...');
  const txnRes = await fetch(`${baseUrl}/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${farmerToken}`
    },
    body: JSON.stringify({ batchId: 'BATCH-FAKE', product: 'Wheat', quantity: 10, price: 100, buyerId: listing.buyerId, stage: 'FARMER_TO_BUYER', location: 'Test' })
  });
  console.log('Direct transaction response status:', txnRes.status);

  console.log('6. Buyer views pending orders...');
  const pendingRes = await fetch(`${baseUrl}/purchase-orders/pending`, {
    headers: { 'Authorization': `Bearer ${buyerToken}` }
  });
  const pendingData = await pendingRes.json();
  console.log(`Buyer has ${pendingData.orders.length} pending orders.`);

  console.log('7. Buyer approves the order...');
  const approveRes = await fetch(`${baseUrl}/purchase-orders/${orderId}/approve`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${buyerToken}` }
  });
  const approveData = await approveRes.json();
  console.log('Approve response:', approveData);
  const transaction = approveData.transaction;

  console.log('8. Buyer tries to approve again (Idempotency check)...');
  const approveRes2 = await fetch(`${baseUrl}/purchase-orders/${orderId}/approve`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${buyerToken}` }
  });
  const approveData2 = await approveRes2.json();
  console.log('Second approve response:', approveData2);

  console.log('9. Fetching Crop Journey...');
  const journeyRes = await fetch(`${baseUrl}/transactions/journey/${transaction.batchId}`);
  const journeyData = await journeyRes.json();
  console.log('Crop Journey response:', JSON.stringify(journeyData, null, 2));
}

runTest();
