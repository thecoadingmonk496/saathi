import dotenv from 'dotenv';
dotenv.config();

async function testGst(gstNumber) {
  const apiKey = process.env.RAPIDAPI_KEY;
  const apiHost = process.env.RAPIDAPI_HOST;
  console.log(`Testing GST: ${gstNumber}`);
  const url = `https://${apiHost}/free/gstin/${gstNumber}`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': apiHost
      }
    });
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

async function run() {
  console.log("=== Testing Real GST ===");
  await testGst('27AAACC1206D1ZG');
  
  console.log("\n=== Testing Fake GST ===");
  await testGst('22AAAAA0000A1Z5');
}

run();
