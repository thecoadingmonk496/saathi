require('dotenv').config();
const connectDB = require('./config/db');
const Transaction = require('./models/Transaction');
require('./models/User');

async function test() {
  await connectDB();
  const userId = '6a8d3e30ce033c8701968b16';

  const transactions = await Transaction.find({
    $or: [{ sellerId: userId }, { buyerId: userId }],
    is_quarantined: { $ne: true }
  })
  .sort({ transactionDate: -1 })
  .populate('sellerId', 'firstName lastName')
  .populate('buyerId', 'firstName lastName')
  .lean();

  console.log('Found ' + transactions.length + ' transactions for user ' + userId);
  process.exit(0);
}
test();
