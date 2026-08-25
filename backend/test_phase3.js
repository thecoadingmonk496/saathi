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
  const token = regData.token;
  if (!token) {
    console.error('Failed to register farmer:', regData);
    return;
  }
  console.log('Farmer registered and logged in.');

  console.log('2. Fetching buyer listings...');
  const listRes = await fetch(`${baseUrl}/buyer-listings?limit=1`);
  const listData = await listRes.json();
  if (!listData.listings || listData.listings.length === 0) {
    console.error('No buyer listings found.');
    return;
  }
  const listing = listData.listings[0];
  console.log(`Found listing by ${listing.buyer_name} for ${listing.commodity}`);

  console.log('3. Accepting the offer (creating transaction)...');
  const txnRes = await fetch(`${baseUrl}/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      batchId: `BATCH-${listing._id}`,
      sourceId: listing._id,
      product: listing.commodity,
      quantity: 50,
      price: listing.offered_price,
      buyerId: listing.buyerId,
      stage: 'FARMER_TO_BUYER',
      location: `${listing.market}, ${listing.district}, ${listing.state}`
    })
  });
  const txnData = await txnRes.json();
  console.log('Transaction response:', txnData);
  if (!txnData.success) {
    console.error('Failed to create transaction.');
    return;
  }

  console.log('4. Testing duplicate processing (Idempotency check)...');
  const dupRes = await fetch(`${baseUrl}/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      batchId: `BATCH-${listing._id}`,
      sourceId: listing._id,
      product: listing.commodity,
      quantity: 50,
      price: listing.offered_price,
      buyerId: listing.buyerId,
      stage: 'FARMER_TO_BUYER',
      location: `${listing.market}, ${listing.district}, ${listing.state}`
    })
  });
  const dupData = await dupRes.json();
  console.log('Duplicate Transaction response (expected to fail):', dupData);

  console.log('5. Fetching Crop Journey...');
  const journeyRes = await fetch(`${baseUrl}/transactions/journey/BATCH-${listing._id}`);
  const journeyData = await journeyRes.json();
  console.log('Crop Journey response:', JSON.stringify(journeyData, null, 2));
}

runTest();
