require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Transaction = require('./models/Transaction');

async function migrate() {
  try {
    await connectDB();
    console.log('Connected to DB');

    // Wipe out old demo transactions
    await Transaction.deleteMany({});
    console.log('Cleared old transactions');

    // Mongoose automatically drops and rebuilds indexes on restart or we can manually sync
    await Transaction.syncIndexes();
    console.log('Indexes synced');

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

migrate();
