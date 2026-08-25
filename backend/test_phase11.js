const mongoose = require('mongoose');
const User = require('./models/User');
const BuyerListing = require('./models/BuyerListing');
const PurchaseOrder = require('./models/PurchaseOrder');
const Transaction = require('./models/Transaction');
const InventoryLot = require('./models/InventoryLot');
const VerificationRecord = require('./models/VerificationRecord');
const { mintTransactionFromOrder, requestVerification, confirmVerification } = require('./controllers/transactionController');
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
      InventoryLot.deleteMany({ crop: 'phase11crop' }),
      VerificationRecord.deleteMany({ recordType: 'SUPPLY_CHAIN' })
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
    
    // Check initial verification status
    const txn1 = await Transaction.findOne({ sourceOrderId: order1Id });
    if (txn1.verificationStatus !== 'UNVERIFIED') {
      throw new Error(`Expected UNVERIFIED, got ${txn1.verificationStatus}`);
    }
    console.log('SUCCESS: Minted transaction is UNVERIFIED initially');

    // 3. Request Verification (as farmer)
    let reqVerRes = {};
    const mockRes = {
      json: (data) => { reqVerRes = data; return { code: 200, data }; },
      status: (code) => ({ json: (data) => { reqVerRes = data; return { code, data }; } })
    };
    await requestVerification(
      { params: { id: txn1._id }, user: { id: farmer._id.toString(), userId: farmer._id.toString(), role: 'FARMER' } },
      mockRes
    );
    if (!reqVerRes.transaction) throw new Error(`Request ver failed: ${JSON.stringify(reqVerRes)}`);
    if (reqVerRes.transaction.verificationStatus !== 'PENDING') throw new Error('Failed to set PENDING');
    console.log('SUCCESS: verificationStatus transitions to PENDING');

    // 4. Request Verification (Unauthorized)
    let unauthorizedRes = {};
    await requestVerification(
      { params: { id: txn1._id }, user: { id: wholesaler._id.toString(), userId: wholesaler._id.toString(), role: 'WHOLESALER' } },
      { status: (code) => ({ json: (data) => { unauthorizedRes = { code, data }; return { code, data }; } }) }
    );
    if (unauthorizedRes.code !== 403) throw new Error('Unauthorized user was able to request verification');
    console.log('SUCCESS: Unauthorized verification request blocked');

    // 5. Confirm Verification (Mocking Blockchain Writer)
    const verRecord = await VerificationRecord.create({
      recordType: 'SUPPLY_CHAIN',
      referenceId: txn1.transactionId,
      dataHash: 'hash',
      payload: { test: true },
      blockchain: { verified: true, status: 'verified' }
    });

    let confVerRes = {};
    const mockResConf = {
      json: (data) => { confVerRes = data; return { code: 200, data }; },
      status: (code) => ({ json: (data) => { confVerRes = data; return { code, data }; } })
    };
    await confirmVerification(
      { params: { id: txn1._id }, body: { status: 'VERIFIED', verificationRecordId: verRecord._id } },
      mockResConf
    );
    if (confVerRes.transaction.verificationStatus !== 'VERIFIED') throw new Error('Failed to set VERIFIED');
    if (confVerRes.transaction.verificationRecordId.toString() !== verRecord._id.toString()) throw new Error('verificationRecordId not set');
    console.log('SUCCESS: verificationStatus transitions to VERIFIED with Record ID');

    // 6. Test Invalid confirm Verification payload
    let badConfRes = {};
    await confirmVerification(
      { params: { id: txn1._id }, body: { status: 'SUPER_VERIFIED' } },
      { status: (code) => ({ json: (data) => { badConfRes = { code, data }; return { code, data }; } }) }
    );
    if (badConfRes.code !== 400) throw new Error('Accepted invalid status');
    console.log('SUCCESS: Invalid verification status rejected');

    console.log('--- ALL PHASE 11 TESTS PASSED ---');
    process.exit(0);
  } catch (error) {
    console.error('TEST FAILED:', error);
    process.exit(1);
  }
}

runTests();
