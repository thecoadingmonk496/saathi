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

const InventoryLot = require('../models/InventoryLot');
const BuyerListing = require('../models/BuyerListing');

/**
 * Internal function to mint a transaction exclusively from an approved PurchaseOrder.
 * This function bypasses HTTP `req`/`res` and directly manipulates the DB.
 */
async function mintTransactionFromOrder(order, session) {
  try {
    const transactionId = `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const batchId = `BATCH-${order._id}`; // UNIQUE per physical transaction/order

    const transaction = await Transaction.create([{
      transactionId,
      batchId, // DEPRECATED in Phase 6.6
      sourceType: 'PURCHASE_ORDER',
      sourceId: order._id, // DEPRECATED in Phase 6.6
      sourceOrderId: order._id,
      product: order.product,
      variety: '',
      quantity: order.quantity,
      unit: 'quintal', // Assuming quintal for this scope as seen in listing
      price: order.price,
      sellerId: order.sellerId,
      buyerId: order.buyerId,
      stage: order.stage || 'FARMER_TO_BUYER',
      location: order.location,
      status: 'PENDING',
      verificationStatus: 'UNVERIFIED',
    }], { session, ordered: true });

    let isDemo = false;
    if (order.listingId) {
      const listing = await BuyerListing.findById(order.listingId).session(session);
      isDemo = listing ? listing.is_demo : false;
    }

    if (order.stage === 'BUYER_TO_WHOLESALER' || order.stage === 'WHOLESALER_TO_DISTRIBUTOR' || order.stage === 'DISTRIBUTOR_TO_RETAILER' || order.stage === 'RETAILER_TO_CONSUMER') {
      // FIFO Deduction
      const lots = await InventoryLot.find({ ownerId: order.sellerId, crop: order.product, availableQuantity: { $gt: 0 } })
                                     .sort({ createdAt: 1, _id: 1 })
                                     .session(session);
      
      let remainingToDeduct = order.quantity;
      const downstreamLots = [];
      
      let newRole = 'WHOLESALER';
      if (order.stage === 'WHOLESALER_TO_DISTRIBUTOR') newRole = 'DISTRIBUTOR';
      if (order.stage === 'DISTRIBUTOR_TO_RETAILER') newRole = 'RETAILER';
      if (order.stage === 'RETAILER_TO_CONSUMER') newRole = 'CONSUMER';

      for (let lot of lots) {
        if (remainingToDeduct <= 0) break;

        console.log(`[FIFO] Evaluating lot ${lot._id}, lot.availableQuantity=${lot.availableQuantity}, remainingToDeduct=${remainingToDeduct}`);
        const deduction = Math.min(lot.availableQuantity, remainingToDeduct);
        
        // Atomic update checking availableQuantity condition
        const result = await InventoryLot.updateOne(
          { _id: lot._id, availableQuantity: { $gte: deduction } },
          { $inc: { availableQuantity: -deduction } },
          { session }
        );
        console.log(`[FIFO] updateOne result: modifiedCount=${result.modifiedCount}`);
        if (result.modifiedCount === 0) {
          throw new Error('Concurrent inventory modification detected.');
        }

        // Prepare new downstream lot preserving provenance
        downstreamLots.push({
          ownerId: order.buyerId,
          ownerRole: newRole,
          crop: order.product,
          variety: lot.variety,
          originalQuantity: deduction,
          availableQuantity: deduction,
          unit: lot.unit,
          location: order.location,
          batchId: lot.batchId, // DEPRECATED - maintain for backward compatibility
          farmerBatchId: lot.farmerBatchId || lot.batchId, // PRESERVE FARMER BATCH ID
          originTransaction: transaction[0]._id, // DEPRECATED
          transactionId: transaction[0]._id, // New downstream transaction
          originFarmer: lot.originFarmer,
          is_demo: lot.is_demo
        });

        remainingToDeduct -= deduction;
      }

      if (remainingToDeduct > 0) {
        throw new Error('Critical: Insufficient inventory during FIFO deduction.');
      }

      await InventoryLot.create(downstreamLots, { session, ordered: true });

    } else {
      // FARMER_TO_BUYER: Create Buyer's Inventory Lot
      await InventoryLot.create([{
        ownerId: order.buyerId,
        ownerRole: 'BUYER',
        crop: order.product,
        variety: '',
        originalQuantity: order.quantity,
        availableQuantity: order.quantity,
        unit: 'quintal',
        location: order.location,
        batchId: batchId, // DEPRECATED
        farmerBatchId: batchId,
        originTransaction: transaction[0]._id, // DEPRECATED
        transactionId: transaction[0]._id,
        originFarmer: order.sellerId,
        is_demo: isDemo
      }], { session, ordered: true });
    }

    return transaction[0];
  } catch (error) {
    console.error('[TransactionController] mintTransactionFromOrder error:', error.message);
    throw error;
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

const PurchaseOrder = require('../models/PurchaseOrder');

/**
 * Returns a structured Crop Journey response for a specific batchId
 * Groups all related farmer transactions from the same BuyerListing context.
 */
async function getCropJourney(req, res) {
  try {
    const { batchId } = req.params;
    
    // 1. Find the base transaction requested by the user
    const baseTransaction = await Transaction.findOne({ batchId });
    if (!baseTransaction) {
      return res.status(200).json({
        success: true,
        batchId,
        journey: {
          farmers: [],
          mandi: { status: 'government', data: null },
          wholesaler: { status: 'unavailable', data: null },
          distributor: { status: 'unavailable', data: null },
          retailer: { status: 'unavailable', data: null },
          consumer: { status: 'unavailable', data: null },
        },
      });
    }

    // 2. Discover context (listingId)
    let contextTransactions = [baseTransaction];
    
    if (baseTransaction.sourceType === 'PURCHASE_ORDER') {
      const baseOrder = await PurchaseOrder.findById(baseTransaction.sourceId);
      if (baseOrder && baseOrder.listingId) {
        // Find all accepted orders for this listing
        const relatedOrders = await PurchaseOrder.find({ 
          listingId: baseOrder.listingId, 
          status: 'ACCEPTED' 
        });
        
        const relatedOrderIds = relatedOrders.map(o => o._id);
        
        // Fetch all transactions originating from these orders
        contextTransactions = await Transaction.find({
          sourceType: 'PURCHASE_ORDER',
          $or: [
            { sourceOrderId: { $in: relatedOrderIds } },
            { sourceId: { $in: relatedOrderIds.map(id => id.toString()) } }
          ]
        })
        .sort({ transactionDate: 1 })
        .populate('sellerId', 'firstName lastName')
        .populate('buyerId', 'firstName lastName');

        // 3. Discover Downstream Transactions (Wholesaler and Distributor stages)
        const farmerBatchIds = contextTransactions.map(txn => txn.batchId);
        
        // Find Wholesaler, Distributor, Retailer, and Consumer InventoryLots derived from these farmer batches
        const downstreamLots = await InventoryLot.find({
          $or: [
            { farmerBatchId: { $in: farmerBatchIds } },
            { batchId: { $in: farmerBatchIds } }
          ],
          ownerRole: { $in: ['WHOLESALER', 'DISTRIBUTOR', 'RETAILER', 'CONSUMER'] }
        });

        if (downstreamLots.length > 0) {
          const downstreamTxnIds = [...new Set(downstreamLots.map(l => (l.transactionId || l.originTransaction).toString()))];
          const downstreamTransactions = await Transaction.find({ _id: { $in: downstreamTxnIds } })
            .sort({ transactionDate: 1 })
            .populate('sellerId', 'firstName lastName')
            .populate('buyerId', 'firstName lastName');
          
          contextTransactions = contextTransactions.concat(downstreamTransactions);
        }
      }
    }

    // Default response template
    const journey = {
      farmers: [],
      mandi: { status: 'government', data: null },
      wholesaler: { status: 'unavailable', data: null },
      distributor: { status: 'unavailable', data: null },
      retailer: { status: 'unavailable', data: null },
      consumer: { status: 'unavailable', data: null },
    };

    // Populate journey stages
    contextTransactions.forEach(txn => {
      const stageData = {
        transactionId: txn.transactionId,
        batchId: txn.batchId,
        price: txn.price,
        quantity: txn.quantity,
        unit: txn.unit,
        location: txn.location,
        date: txn.transactionDate,
        seller: txn.sellerId ? `${txn.sellerId.firstName} ${txn.sellerId.lastName}` : 'Unknown',
        buyer: txn.buyerId ? `${txn.buyerId.firstName} ${txn.buyerId.lastName}` : 'Unknown',
        verificationStatus: txn.verificationStatus,
        verificationRecordId: txn.verificationRecordId,
        stage: txn.stage,
      };

      if (txn.stage === 'FARMER_TO_BUYER') {
        journey.farmers.push({
          status: txn.verificationStatus.toLowerCase(),
          data: stageData
        });
      } else {
        const mappedStage = stageMapping[txn.stage];
        if (mappedStage && journey[mappedStage]) {
          journey[mappedStage] = {
            status: txn.verificationStatus.toLowerCase(),
            data: stageData
          };
        }
      }
    });

    return res.status(200).json({
      success: true,
      batchId,
      product: contextTransactions[0].product,
      journey,
    });
  } catch (error) {
    console.error('[TransactionController] getCropJourney error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error aggregating crop journey' });
  }
}

async function requestVerification(req, res) {
  try {
    const { id } = req.params;
    const transaction = await Transaction.findById(id);
    if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found' });
    
    // Ensure only participants can request verification
    const isParticipant = req.user.id === transaction.sellerId.toString() || req.user.id === transaction.buyerId.toString();
    if (!isParticipant && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (transaction.verificationStatus === 'VERIFIED') {
      return res.status(400).json({ success: false, message: 'Transaction is already verified' });
    }

    transaction.verificationStatus = 'PENDING';
    await transaction.save();

    return res.json({ success: true, message: 'Verification requested', transaction });
  } catch (error) {
    console.error('[TransactionController] requestVerification error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error requesting verification' });
  }
}

async function confirmVerification(req, res) {
  try {
    const { id } = req.params;
    const { status, verificationRecordId } = req.body; // status must be VERIFIED or FAILED

    if (!['VERIFIED', 'FAILED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const transaction = await Transaction.findById(id);
    if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found' });

    transaction.verificationStatus = status;
    if (status === 'VERIFIED' && verificationRecordId) {
      transaction.verificationRecordId = verificationRecordId;
    }
    
    await transaction.save();

    return res.json({ success: true, message: `Verification confirmed as ${status}`, transaction });
  } catch (error) {
    console.error('[TransactionController] confirmVerification error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error confirming verification' });
  }
}

module.exports = {
  mintTransactionFromOrder,
  getTransaction,
  getCropJourney,
  requestVerification,
  confirmVerification,
};
