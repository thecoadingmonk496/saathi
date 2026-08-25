const PurchaseOrder = require('../models/PurchaseOrder');
const BuyerListing = require('../models/BuyerListing');
const User = require('../models/User');
const { mintTransactionFromOrder } = require('./transactionController');
const mongoose = require('mongoose');

async function createOrder(req, res) {
  try {
    const { listingId, targetBuyerId, quantity, product, price, location, stage } = req.body || {};
    const sellerId = req.user.userId;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid quantity' });
    }

    const seller = await User.findById(sellerId);
    if (!seller) return res.status(404).json({ success: false, message: 'Seller not found' });

    let finalBuyerId = targetBuyerId;
    let finalProduct = product;
    let finalPrice = price;
    let finalLocation = location;
    const finalStage = stage || 'FARMER_TO_BUYER';

    if (finalStage === 'FARMER_TO_BUYER') {
      if (seller.role !== 'FARMER' && seller.role !== 'ADMIN') {
        return res.status(403).json({ success: false, message: 'Only FARMERS can propose a sale to buyers' });
      }
      if (!listingId) return res.status(400).json({ success: false, message: 'listingId required for FARMER_TO_BUYER' });
      
      const listing = await BuyerListing.findById(listingId);
      if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });
      
      finalBuyerId = listing.buyerId;
      finalProduct = listing.commodity;
      finalPrice = listing.offered_price;
      finalLocation = `${listing.market}, ${listing.district}, ${listing.state}`;

      // Calculate remaining quantity for listing
      const qtyMatch = listing.quantity_required.match(/\d+/);
      const requestedQuantity = qtyMatch ? parseInt(qtyMatch[0], 10) : Number.MAX_SAFE_INTEGER;
      const acceptedOrders = await PurchaseOrder.find({ listingId: listing._id, status: 'ACCEPTED' });
      const acceptedQuantity = acceptedOrders.reduce((sum, o) => sum + o.quantity, 0);
      const remainingQuantity = Math.max(0, requestedQuantity - acceptedQuantity);

      if (quantity > remainingQuantity) {
        return res.status(400).json({ success: false, message: 'Insufficient remaining quantity for this buyer request.' });
      }
    } else if (finalStage === 'BUYER_TO_WHOLESALER') {
      if (seller.role !== 'BUYER' && seller.role !== 'ADMIN') {
        return res.status(403).json({ success: false, message: 'Only BUYERS can propose a sale to wholesalers' });
      }
      if (!finalBuyerId || !finalProduct || !finalPrice || !finalLocation) {
        return res.status(400).json({ success: false, message: 'targetBuyerId, product, price, and location are required' });
      }

      const targetBuyer = await User.findById(finalBuyerId);
      if (!targetBuyer || targetBuyer.role !== 'WHOLESALER') {
        return res.status(400).json({ success: false, message: 'Target user must be a WHOLESALER' });
      }

      // Check available inventory for the buyer
      const InventoryLot = require('../models/InventoryLot');
      const lots = await InventoryLot.find({ ownerId: sellerId, crop: finalProduct, availableQuantity: { $gt: 0 } });
      const totalAvailable = lots.reduce((sum, lot) => sum + lot.availableQuantity, 0);

      if (quantity > totalAvailable) {
        return res.status(400).json({ success: false, message: `Insufficient inventory. You only have ${totalAvailable} available.` });
      }
    } else if (finalStage === 'WHOLESALER_TO_DISTRIBUTOR') {
      if (seller.role !== 'WHOLESALER' && seller.role !== 'ADMIN') {
        return res.status(403).json({ success: false, message: 'Only WHOLESALERS can propose a sale to distributors' });
      }
      if (!finalBuyerId || !finalProduct || !finalPrice || !finalLocation) {
        return res.status(400).json({ success: false, message: 'targetBuyerId, product, price, and location are required' });
      }

      const targetBuyer = await User.findById(finalBuyerId);
      if (!targetBuyer || targetBuyer.role !== 'DISTRIBUTOR') {
        return res.status(400).json({ success: false, message: 'Target user must be a DISTRIBUTOR' });
      }

      // Check available inventory for the wholesaler
      const InventoryLot = require('../models/InventoryLot');
      const lots = await InventoryLot.find({ ownerId: sellerId, crop: finalProduct, availableQuantity: { $gt: 0 } });
      const totalAvailable = lots.reduce((sum, lot) => sum + lot.availableQuantity, 0);

      if (quantity > totalAvailable) {
        return res.status(400).json({ success: false, message: `Insufficient inventory. You only have ${totalAvailable} available.` });
      }
    } else if (finalStage === 'DISTRIBUTOR_TO_RETAILER') {
      if (seller.role !== 'DISTRIBUTOR' && seller.role !== 'ADMIN') {
        return res.status(403).json({ success: false, message: 'Only DISTRIBUTORS can propose a sale to retailers' });
      }
      if (!finalBuyerId || !finalProduct || !finalPrice || !finalLocation) {
        return res.status(400).json({ success: false, message: 'targetBuyerId, product, price, and location are required' });
      }

      const targetBuyer = await User.findById(finalBuyerId);
      if (!targetBuyer || targetBuyer.role !== 'RETAILER') {
        return res.status(400).json({ success: false, message: 'Target user must be a RETAILER' });
      }

      // Check available inventory for the distributor
      const InventoryLot = require('../models/InventoryLot');
      const lots = await InventoryLot.find({ ownerId: sellerId, crop: finalProduct, availableQuantity: { $gt: 0 } });
      const totalAvailable = lots.reduce((sum, lot) => sum + lot.availableQuantity, 0);

      if (quantity > totalAvailable) {
        return res.status(400).json({ success: false, message: `Insufficient inventory. You only have ${totalAvailable} available.` });
      }
    } else if (finalStage === 'RETAILER_TO_CONSUMER') {
      if (seller.role !== 'RETAILER' && seller.role !== 'ADMIN') {
        return res.status(403).json({ success: false, message: 'Only RETAILERS can propose a sale to consumers' });
      }
      if (!finalBuyerId || !finalProduct || !finalPrice || !finalLocation) {
        return res.status(400).json({ success: false, message: 'targetBuyerId, product, price, and location are required' });
      }

      const targetBuyer = await User.findById(finalBuyerId);
      if (!targetBuyer || targetBuyer.role !== 'CONSUMER') {
        return res.status(400).json({ success: false, message: 'Target user must be a CONSUMER' });
      }

      // Check available inventory for the retailer
      const InventoryLot = require('../models/InventoryLot');
      const lots = await InventoryLot.find({ ownerId: sellerId, crop: finalProduct, availableQuantity: { $gt: 0 } });
      const totalAvailable = lots.reduce((sum, lot) => sum + lot.availableQuantity, 0);

      if (quantity > totalAvailable) {
        return res.status(400).json({ success: false, message: `Insufficient inventory. You only have ${totalAvailable} available.` });
      }
    } else {
      return res.status(400).json({ success: false, message: 'Invalid stage' });
    }

    if (sellerId.toString() === finalBuyerId.toString()) {
      return res.status(400).json({ success: false, message: 'Seller and buyer cannot be the same user' });
    }

    const order = await PurchaseOrder.create({
      buyerId: finalBuyerId,
      sellerId,
      listingId: listingId || null,
      product: finalProduct,
      quantity,
      price: finalPrice,
      location: finalLocation,
      status: 'PENDING',
      stage: finalStage
    });

    return res.status(201).json({
      success: true,
      message: 'Proposal sent successfully',
      order,
    });
  } catch (error) {
    console.error('[OrderController] createOrder error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error creating order' });
  }
}

async function getPendingOrders(req, res) {
  try {
    const buyerId = req.user.userId;
    
    const ordersDocs = await PurchaseOrder.find({ buyerId, status: 'PENDING' })
      .populate('sellerId', 'firstName lastName phone')
      .populate('listingId', 'quantity_required is_demo fulfilledQuantity')
      .sort({ createdAt: -1 })
      .lean();

    const orders = ordersDocs.map((order) => {
      if (order.listingId) {
        const qtyMatch = order.listingId.quantity_required.match(/\d+/);
        const requestedQuantity = qtyMatch ? parseInt(qtyMatch[0], 10) : Number.MAX_SAFE_INTEGER;
        
        const acceptedQuantity = order.listingId.fulfilledQuantity || 0;
        
        order.listingId.requestedQuantity = requestedQuantity;
        order.listingId.acceptedQuantity = acceptedQuantity;
        order.listingId.remainingQuantity = Math.max(0, requestedQuantity - acceptedQuantity);
      }
      return order;
    });

    return res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error('[OrderController] getPendingOrders error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error fetching orders' });
  }
}

async function approveOrder(req, res) {
  console.log(`[approveOrder] Start id=${req.params.id}`);
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const buyerId = req.user.userId;

    const order = await PurchaseOrder.findById(id).session(session);
    if (!order) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.buyerId.toString() !== buyerId.toString()) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ success: false, message: 'Not authorized to approve this order' });
    }

    if (order.status !== 'PENDING') {
      await session.abortTransaction();
      session.endSession();
      return res.status(409).json({ success: false, message: `Order is already ${order.status}` });
    }

    if (order.stage === 'FARMER_TO_BUYER') {
      const initialListing = await BuyerListing.findById(order.listingId).session(session);

      if (!initialListing) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ success: false, message: 'Listing not found.' });
      }

      // Parse requested quantity
      const qtyMatch = initialListing.quantity_required.match(/\d+/);
      const requestedQuantity = qtyMatch ? parseInt(qtyMatch[0], 10) : Number.MAX_SAFE_INTEGER;

      // ATOMIC UPDATE FOR OCC: 
      // Only increment if fulfilledQuantity + order.quantity <= requestedQuantity
      const updatedListing = await BuyerListing.findOneAndUpdate(
        { 
          _id: order.listingId,
          $expr: {
            $lte: [
              { $add: ["$fulfilledQuantity", order.quantity] },
              requestedQuantity
            ]
          }
        },
        { 
          $inc: { fulfilledQuantity: order.quantity }
        },
        { 
          session, 
          new: true 
        }
      );

      if (!updatedListing) {
        await session.abortTransaction();
        session.endSession();
        return res.status(409).json({ success: false, message: 'Insufficient remaining quantity for this buyer request or listing modified.' });
      }

      order.status = 'ACCEPTED';
      await order.save({ session });

      const transaction = await mintTransactionFromOrder(order, session);

      await session.commitTransaction();
      session.endSession();
      return res.status(200).json({ success: true, message: 'Order approved and Transaction recorded', transaction });

    } else if (order.stage === 'BUYER_TO_WHOLESALER' || order.stage === 'WHOLESALER_TO_DISTRIBUTOR' || order.stage === 'DISTRIBUTOR_TO_RETAILER' || order.stage === 'RETAILER_TO_CONSUMER') {
      console.log(`[approveOrder] ${order.stage} branch`);
      // Validate Seller's total available inventory (Optimistic check inside transaction)
      const InventoryLot = require('../models/InventoryLot');
      const lots = await InventoryLot.find({ ownerId: order.sellerId, crop: order.product, availableQuantity: { $gt: 0 } }).session(session);
      const totalAvailable = lots.reduce((sum, lot) => sum + lot.availableQuantity, 0);

      console.log(`[approveOrder] totalAvailable=${totalAvailable}, requested=${order.quantity}`);
      if (order.quantity > totalAvailable) {
        console.log(`[approveOrder] Aborting: requested > totalAvailable`);
        await session.abortTransaction();
        session.endSession();
        return res.status(409).json({ success: false, message: 'Seller has insufficient inventory to fulfill this order.' });
      }

      order.status = 'ACCEPTED';
      await order.save({ session });

      console.log(`[approveOrder] Calling mintTransactionFromOrder`);
      const transaction = await mintTransactionFromOrder(order, session);

      console.log(`[approveOrder] Committing transaction`);
      await session.commitTransaction();
      session.endSession();
      console.log(`[approveOrder] Success`);
      return res.status(200).json({ success: true, message: 'Order approved and Transaction recorded', transaction });
    } else {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Invalid order stage' });
    }
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('[OrderController] approveOrder error:', error.message);
    
    if (error.message.includes('Write conflict') || error.message.includes('Concurrent inventory modification detected')) {
      return res.status(409).json({ success: false, message: 'Concurrent inventory conflict. Please try again.' });
    }
    
    return res.status(500).json({ success: false, message: 'Server error approving order' });
  }
}

async function rejectOrder(req, res) {
  try {
    const { id } = req.params;
    const buyerId = req.user.userId;

    const order = await PurchaseOrder.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.buyerId.toString() !== buyerId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to reject this order' });
    }

    if (order.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: `Order is already ${order.status}` });
    }

    order.status = 'REJECTED';
    await order.save();

    return res.status(200).json({
      success: true,
      message: 'Order rejected',
    });
  } catch (error) {
    console.error('[OrderController] rejectOrder error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error rejecting order' });
  }
}

module.exports = {
  createOrder,
  getPendingOrders,
  approveOrder,
  rejectOrder,
};
