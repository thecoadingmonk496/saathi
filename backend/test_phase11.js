const mongoose = require('mongoose');
const User = require('./models/User');
const BuyerListing = require('./models/BuyerListing');
const PurchaseOrder = require('./models/PurchaseOrder');
const Transaction = require('./models/Transaction');
const InventoryLot = require('./models/InventoryLot');
const { mintTransactionFromOrder } = require('./controllers/transactionController');
const orderController = require('./controllers/orderController');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();

async function runTests() {
  try {
    await connectDB();
    console.log('MongoDB connected successfully');
    
    // Cleanup previous runs
    await Promise.all([
      User.deleteMany({ email: { $regex: /phase11_test/ } }),
      BuyerListing.deleteMany({ product: 'Phase11Crop' }),
      PurchaseOrder.deleteMany({ product: 'Phase11Crop' }),
      Transaction.deleteMany({ product: 'Phase11Crop' }),
      InventoryLot.deleteMany({ crop: 'phase11crop' })
    ]);

    // Setup Users
    const farmer = await User.create({ firstName: 'Farmer', lastName: '11', email: 'farmer_phase11_test@example.com', phone: '1234567890', password: 'password123', role: 'FARMER', isVerified: true });
    const buyer = await User.create({ firstName: 'Buyer', lastName: '11', email: 'buyer_phase11_test@example.com', phone: '1234567891', password: 'password123', role: 'BUYER', isVerified: true });
    const wholesaler = await User.create({ firstName: 'Wholesaler', lastName: '11', email: 'wholesaler_phase11_test@example.com', phone: '1234567892', password: 'password123', role: 'WHOLESALER', isVerified: true });
    
    // Create BuyerListing (Farmer -> Buyer)
    const listing = await BuyerListing.create({
      buyerId: buyer._id,
      buyer_name: 'Buyer 11',
      buyer_type: 'Wholesaler',
      commodity: 'Phase11Crop',
      quantity_required: 100,
      offered_price: 2000,
      state: 'TestState',
      district: 'TestDistrict',
      market: 'TestMarket',
      is_active: true
    });

    // 1. Farmer proposes sale to Buyer
    const reqCreate = {
      user: { userId: farmer._id, role: 'FARMER' },
      body: { listingId: listing._id, quantity: 50, location: 'Farm 11' }
    };
    let orderRes = {};
    await orderController.createOrder(reqCreate, {
      status: (code) => ({ json: (data) => { orderRes = data; return { code, data }; } })
    });
    if (!orderRes.order) throw new Error(`Create order failed: ${JSON.stringify(orderRes)}`);
    const order1Id = orderRes.order._id;

    // 2. Buyer approves
    const reqApprove = {
      user: { userId: buyer._id, role: 'BUYER' },
      params: { id: order1Id }
    };
    let approveRes = {};
    await orderController.approveOrder(reqApprove, {
      status: (code) => ({ json: (data) => { approveRes = data; return { code, data }; } })
    });
    
    console.log('--- ALL PHASE 11 TESTS PASSED ---');
    process.exit(0);
  } catch (error) {
    console.error('TEST FAILED:', error);
    process.exit(1);
  }
}

runTests();
