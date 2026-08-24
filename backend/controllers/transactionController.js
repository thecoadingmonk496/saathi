const Transaction = require('../models/Transaction');
const User = require('../models/User');

/**
 * Maps standard supply chain stages to Crop Journey stages
 */
const stageMapping = {
  FARMER_TO_BUYER: 'farmer',
  BUYER_TO_WHOLESALER: 'wholesaler',
  WHOLESALER_TO_DISTRIBUTOR: 'distributor',
  DISTRIBUTOR_TO_RETAILER: 'retailer',
  RETAILER_TO_CONSUMER: 'consumer'
};

async function createTransaction(req, res) {
  try {
    const { batchId, product, variety, quantity, unit, price, buyerId, stage, location, status } = req.body || {};

    if (!batchId || !product || !quantity || !price || !buyerId || !stage || !location) {
      return res.status(400).json({ success: false, message: 'Missing required transaction fields' });
    }

    const transactionId = `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const transaction = await Transaction.create({
      transactionId,
      batchId,
      product,
      variety,
      quantity,
      unit,
      price,
      sellerId: req.user.userId,
      buyerId,
      stage,
      location,
      status: status || 'PENDING',
      verificationStatus: 'UNVERIFIED',
    });

    return res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      transaction,
    });
  } catch (error) {
    console.error('[TransactionController] createTransaction error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error creating transaction' });
  }
}

async function getTransaction(req, res) {
  try {
    const { id } = req.params;
    const transaction = await Transaction.findOne({ transactionId: id })
      .populate('sellerId', 'firstName lastName')
      .populate('buyerId', 'firstName lastName');

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    return res.status(200).json({
      success: true,
      transaction,
    });
  } catch (error) {
    console.error('[TransactionController] getTransaction error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error fetching transaction' });
  }
}

/**
 * Returns a structured Crop Journey response for a specific batchId
 * This respects the data contract required by the frontend, ensuring missing
 * downstream stages are reported as 'unavailable' instead of hallucinated.
 */
async function getCropJourney(req, res) {
  try {
    const { batchId } = req.params;
    
    // Fetch all transactions for this batch, sorted chronologically
    const transactions = await Transaction.find({ batchId })
      .sort({ transactionDate: 1 })
      .populate('sellerId', 'firstName lastName')
      .populate('buyerId', 'firstName lastName');

    // Default response template where everything is unavailable except mandi which is government
    const journey = {
      farmer: { status: 'unavailable', data: null },
      mandi: { status: 'government', data: null },
      wholesaler: { status: 'unavailable', data: null },
      distributor: { status: 'unavailable', data: null },
      retailer: { status: 'unavailable', data: null },
      consumer: { status: 'unavailable', data: null },
    };

    // If there are no transactions, just return the default unavailable template
    if (transactions.length === 0) {
      return res.status(200).json({
        success: true,
        batchId,
        journey,
      });
    }

    // Populate journey stages based on real transactions
    transactions.forEach(txn => {
      const mappedStage = stageMapping[txn.stage];
      if (mappedStage && journey[mappedStage]) {
        journey[mappedStage] = {
          status: txn.verificationStatus === 'VERIFIED' ? 'verified' : 'unverified',
          data: {
            transactionId: txn.transactionId,
            price: txn.price,
            quantity: txn.quantity,
            unit: txn.unit,
            location: txn.location,
            date: txn.transactionDate,
            seller: txn.sellerId ? `${txn.sellerId.firstName} ${txn.sellerId.lastName}` : 'Unknown',
            buyer: txn.buyerId ? `${txn.buyerId.firstName} ${txn.buyerId.lastName}` : 'Unknown',
          }
        };
      }
    });

    return res.status(200).json({
      success: true,
      batchId,
      product: transactions[0].product,
      journey,
    });
  } catch (error) {
    console.error('[TransactionController] getCropJourney error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error aggregating crop journey' });
  }
}

module.exports = {
  createTransaction,
  getTransaction,
  getCropJourney,
};
