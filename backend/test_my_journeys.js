require('dotenv').config();
const mongoose = require('mongoose');
const Transaction = require('./models/Transaction');
const connectDB = require('./config/db');

async function test() {
  await connectDB();
  console.log("Connected to MongoDB");

  const batchId = 'BATCH-6a8d3e32ce033c8701968b1f';
  const txns = await Transaction.find({ batchId }).lean();
  console.log(`Found ${txns.length} txns for ${batchId}`);
  
  if (txns.length === 0) {
    console.log("Batch not found.");
    process.exit(0);
  }

  // Pick the first transaction's buyer
  const buyerId = txns[0].buyerId;
  const sellerId = txns[0].sellerId;
  
  console.log("BuyerId:", buyerId, "Type:", typeof buyerId, "Constructor:", buyerId.constructor.name);
  console.log("SellerId:", sellerId, "Type:", typeof sellerId, "Constructor:", sellerId.constructor.name);
  
  // Now simulate the getMyJourneys query with string ID
  const stringId = buyerId.toString();
  
  const resultsString = await Transaction.find({
    $or: [{ sellerId: stringId }, { buyerId: stringId }]
  }).lean();
  
  console.log(`Querying with string ID '${stringId}' found: ${resultsString.length} txns`);
  
  const resultsObjectId = await Transaction.find({
    $or: [{ sellerId: new mongoose.Types.ObjectId(stringId) }, { buyerId: new mongoose.Types.ObjectId(stringId) }]
  }).lean();
  
  console.log(`Querying with ObjectId '${stringId}' found: ${resultsObjectId.length} txns`);
  
  process.exit(0);
}

test();
