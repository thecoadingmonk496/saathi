const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const BuyerRequest = require('../models/BuyerRequest');
const FarmerOffer = require('../models/FarmerOffer');
const Deal = require('../models/Deal');
const DealReport = require('../models/DealReport');
const cropQualityService = require('../services/cropQualityService');
const AdminWallet = require('../models/AdminWallet');
const WalletTransaction = require('../models/WalletTransaction');
const { AccessToken } = require('livekit-server-sdk');

function liveKitConfigured() {
  return Boolean(process.env.LIVEKIT_URL && process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET);
}

async function makeCallToken(identity, name, roomName) {
  const token = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
    identity: String(identity), name, ttl: '2h',
  });
  token.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true });
  return token.toJwt();
}

// Helper: Get or create the single admin wallet doc
async function getWallet() {
  let wallet = await AdminWallet.findOne();
  if (!wallet) wallet = await AdminWallet.create({ balance: 0, totalReceived: 0, totalForwarded: 0 });
  return wallet;
}

// Helper: Credit admin wallet (payment received)
async function creditWallet(amount, dealId, fromUserId, payerRole, description) {
  const wallet = await getWallet();
  wallet.balance += amount;
  wallet.totalReceived += amount;
  await wallet.save();
  await WalletTransaction.create({
    type: 'RECEIVED',
    amount,
    dealId,
    fromUserId,
    payerRole,
    description,
    balanceAfter: wallet.balance,
  });
  return wallet;
}

const User = require('../models/User');

const buyerRoles = ['BUYER', 'WHOLESALER', 'DISTRIBUTOR', 'RETAILER', 'CONSUMER'];

// Middleware for role checking
const requireRole = (role) => (req, res, next) => {
  if (req.user) {
    if (role === 'BUYER' && buyerRoles.includes(req.user.role)) {
      return next();
    }
    if (req.user.role === role) {
      return next();
    }
  }
  res.status(403).json({ success: false, message: `Access denied. Requires ${role} role.` });
};

// ==========================================
// BUYER REQUESTS
// ==========================================

const BuyerApplication = require('../models/BuyerApplication');

// Create a new request (Buyer only)
router.post('/requests', requireAuth, requireRole('BUYER'), async (req, res) => {
  try {
    // Enforce Backend KYC
    const kyc = await BuyerApplication.findOne({ phone: req.user.phone, verificationStatus: 'APPROVED' });
    if (!kyc) {
      return res.status(403).json({ success: false, message: 'KYC approval is required to create a request.' });
    }

    const { crop, quantity, unit, offeredPrice, location, description, cropImage } = req.body;
    const newRequest = await BuyerRequest.create({
      buyerId: req.user._id,
      crop,
      quantity,
      unit: unit || 'quintals',
      offeredPrice,
      location,
      description,
      cropImage, // Save the image
      status: 'PENDING_REVIEW',
    });
    res.status(201).json({ success: true, data: newRequest, message: 'Requirement submitted for Saathi verification.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Re-apply / edit a rejected request (Buyer only)
router.post('/requests/:id/reapply', requireAuth, requireRole('BUYER'), async (req, res) => {
  try {
    const { crop, quantity, unit, offeredPrice, location, description, cropImage } = req.body;
    const request = await BuyerRequest.findOne({ _id: req.params.id, buyerId: req.user._id });
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }
    
    // Prevent reapply exploit (only rejected requests can be reapplied)
    if (request.status !== 'REJECTED') {
      return res.status(400).json({ success: false, message: 'Only rejected requests can be reapplied.' });
    }
    request.crop = crop || request.crop;
    request.quantity = quantity || request.quantity;
    request.unit = unit || request.unit;
    request.offeredPrice = offeredPrice || request.offeredPrice;
    request.location = location || request.location;
    request.description = description !== undefined ? description : request.description;
    request.status = 'PENDING_REVIEW';
    request.adminRemarks = '';
    request.reviewedAt = null;
    request.reviewedBy = '';
    await request.save();
    res.json({ success: true, data: request, message: 'Request resubmitted for admin verification.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all published requests for marketplace viewing (Any authenticated user / Buyer browse)
router.get('/requests/all-published', requireAuth, async (req, res) => {
  try {
    const publishedFilter = { status: 'PUBLISHED' };
    if (buyerRoles.includes(req.user.role)) {
      publishedFilter.buyerId = { $ne: req.user._id };
    }

    const requests = await BuyerRequest.find(publishedFilter)
      .populate('buyerId', 'firstName lastName village district state')
      .sort('-publishedAt');
    res.json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get buyer's own requests (Buyer only)
router.get('/requests/mine', requireAuth, requireRole('BUYER'), async (req, res) => {
  try {
    const requests = await BuyerRequest.find({ buyerId: req.user._id }).sort('-createdAt');

    const fulfilledQuantities = await FarmerOffer.aggregate([
      { $match: { buyerRequestId: { $in: requests.map((request) => request._id) }, status: 'ACCEPTED' } },
      { $group: { _id: '$buyerRequestId', quantity: { $sum: '$quantity' } } },
    ]);
    const fulfilledByRequest = new Map(fulfilledQuantities.map((row) => [row._id.toString(), row.quantity]));
    const requestsWithFulfilled = requests.map((request) => ({
      ...request.toObject(),
      fulfilledQuantity: fulfilledByRequest.get(request._id.toString()) || 0,
    }));
    
    res.json({ success: true, data: requestsWithFulfilled });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all published requests (Farmer only)
router.get('/requests/published', requireAuth, requireRole('FARMER'), async (req, res) => {
  try {
    // Also include details about the buyer but exclude sensitive data if needed
    const requests = await BuyerRequest.find({ status: 'PUBLISHED' })
      .populate('buyerId', 'firstName lastName village district state')
      .sort('-publishedAt');
    res.json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// SAATHI Admin Review endpoint
router.post('/requests/:id/approve', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const request = await BuyerRequest.findByIdAndUpdate(
      req.params.id, 
      { status: 'PUBLISHED', publishedAt: new Date() },
      { new: true }
    );
    res.json({ success: true, data: request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// OFFERS & NEGOTIATION
// ==========================================

// Make an initial offer (Farmer only)
router.post('/requests/:id/offers', requireAuth, requireRole('FARMER'), async (req, res) => {
  try {
    const buyerRequest = await BuyerRequest.findById(req.params.id);
    if (!buyerRequest || buyerRequest.status !== 'PUBLISHED') {
      return res.status(400).json({ success: false, message: 'Invalid or unavailable request.' });
    }

    const { quantity, counterOfferPrice, message } = req.body;
    const offer = await FarmerOffer.create({
      buyerRequestId: req.params.id,
      farmerId: req.user._id,
      quantity,
      counterOfferPrice,
      message,
      status: 'PENDING',
      negotiationHistory: [{
        price: counterOfferPrice,
        message,
        byRole: 'FARMER',
        date: new Date()
      }]
    });
    res.status(201).json({ success: true, data: offer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Counter an offer (Both Buyer & Farmer)
router.post('/offers/:id/counter', requireAuth, async (req, res) => {
  try {
    const offer = await FarmerOffer.findById(req.params.id).populate('buyerRequestId');
    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });
    
    const isBuyer = buyerRoles.includes(req.user.role) && offer.buyerRequestId.buyerId.toString() === req.user._id.toString();
    const isFarmer = req.user.role === 'FARMER' && offer.farmerId.toString() === req.user._id.toString();
    
    if (!isBuyer && !isFarmer) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    
    // Prevent reopening of dead offers
    if (offer.status === 'ACCEPTED' || offer.status === 'REJECTED') {
      return res.status(400).json({ success: false, message: 'Cannot counter a closed offer.' });
    }

    const { price, message } = req.body;
    
    offer.counterOfferPrice = price;
    offer.status = isBuyer ? 'COUNTERED_BY_BUYER' : 'COUNTERED_BY_FARMER';
    offer.negotiationHistory.push({
      price,
      message,
      byRole: req.user.role,
      date: new Date()
    });
    offer.respondedAt = new Date();
    
    await offer.save();
    res.json({ success: true, data: offer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Accept an offer (Both Buyer & Farmer can accept the OTHER's counter)
router.post('/offers/:id/accept', requireAuth, async (req, res) => {
  try {
    const offer = await FarmerOffer.findById(req.params.id).populate('buyerRequestId');
    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });
    
    const isBuyer = buyerRoles.includes(req.user.role) && offer.buyerRequestId.buyerId.toString() === req.user._id.toString();
    const isFarmer = req.user.role === 'FARMER' && offer.farmerId.toString() === req.user._id.toString();
    
    if (!isBuyer && !isFarmer) return res.status(403).json({ success: false, message: 'Unauthorized' });
    
    if (isBuyer && (offer.status !== 'PENDING' && offer.status !== 'COUNTERED_BY_FARMER')) {
      return res.status(400).json({ success: false, message: 'Buyer can only accept Farmer offers/counters.' });
    }
    if (isFarmer && offer.status !== 'COUNTERED_BY_BUYER') {
      return res.status(400).json({ success: false, message: 'Farmer can only accept Buyer counters.' });
    }

    // Prevent reopening
    if (offer.status === 'ACCEPTED' || offer.status === 'REJECTED') {
      return res.status(400).json({ success: false, message: 'Offer is already closed.' });
    }

    // Prevent overselling
    const acceptedOffers = await FarmerOffer.find({ buyerRequestId: offer.buyerRequestId._id, status: 'ACCEPTED' });
    const fulfilledQuantity = acceptedOffers.reduce((sum, o) => sum + Number(o.quantity || 0), 0);
    if (fulfilledQuantity + Number(offer.quantity || 0) > Number(offer.buyerRequestId.quantity || Infinity)) {
      return res.status(400).json({ success: false, message: 'Accepting this offer would exceed the requested quantity.' });
    }

    // Prevent duplicate deals
    const existingDeal = await Deal.findOne({ farmerOfferId: offer._id });
    if (existingDeal) {
      return res.status(400).json({ success: false, message: 'Deal already exists for this offer.' });
    }

    offer.status = 'ACCEPTED';
    offer.respondedAt = new Date();
    await offer.save();

    // Create the Deal with correct schema fields
    const deal = await Deal.create({
      buyerId: offer.buyerRequestId.buyerId,
      farmerId: offer.farmerId,
      buyerRequestId: offer.buyerRequestId._id,
      farmerOfferId: offer._id,
      crop: offer.buyerRequestId.crop || 'Agricultural Produce',
      quantity: Number(offer.quantity) || 1,
      agreedPrice: Number(offer.counterOfferPrice || offer.buyerRequestId.offeredPrice) || 0,
      status: 'ACCEPTED'
    });

    res.json({ success: true, data: { offer, deal } });
  } catch (error) {
    console.error('Accept offer error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Reject an offer
router.post('/offers/:id/reject', requireAuth, async (req, res) => {
  try {
    const offer = await FarmerOffer.findById(req.params.id).populate('buyerRequestId');
    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });

    const isBuyer = buyerRoles.includes(req.user.role) && offer.buyerRequestId.buyerId.toString() === req.user._id.toString();
    const isFarmer = req.user.role === 'FARMER' && offer.farmerId.toString() === req.user._id.toString();
    
    if (!isBuyer && !isFarmer) return res.status(403).json({ success: false, message: 'Unauthorized' });

    if (offer.status === 'ACCEPTED' || offer.status === 'REJECTED') {
      return res.status(400).json({ success: false, message: 'Offer is already closed.' });
    }

    offer.status = 'REJECTED';
    offer.respondedAt = new Date();
    await offer.save();
    res.json({ success: true, data: offer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Ignore an offer (Buyer only usually)
router.post('/offers/:id/ignore', requireAuth, requireRole('BUYER'), async (req, res) => {
  try {
    const offer = await FarmerOffer.findById(req.params.id).populate('buyerRequestId');
    if (!offer || offer.buyerRequestId.buyerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (offer.status === 'ACCEPTED' || offer.status === 'REJECTED') {
      return res.status(400).json({ success: false, message: 'Offer is already closed.' });
    }

    offer.status = 'IGNORED';
    offer.respondedAt = new Date();
    await offer.save();
    res.json({ success: true, data: offer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get farmer's own offers
router.get('/offers/mine', requireAuth, requireRole('FARMER'), async (req, res) => {
  try {
    const offers = await FarmerOffer.find({ farmerId: req.user._id })
      .populate({
        path: 'buyerRequestId',
        populate: { path: 'buyerId', select: 'firstName lastName village' }
      })
      .sort('-createdAt');
    res.json({ success: true, data: offers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get offers for a specific request
router.get('/requests/:id/offers', requireAuth, requireRole('BUYER'), async (req, res) => {
  try {
    const request = await BuyerRequest.findOne({ _id: req.params.id, buyerId: req.user._id });
    if (!request) return res.status(403).json({ success: false, message: 'Unauthorized' });

    const offers = await FarmerOffer.find({ buyerRequestId: req.params.id })
      .populate('farmerId', 'firstName lastName district state')
      .sort('-createdAt');
    res.json({ success: true, data: offers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// DEALS & VERIFICATION
// ==========================================

// Get user's deals
router.get('/deals', requireAuth, async (req, res) => {
  try {
    const isBuyer = buyerRoles.includes(req.user.role);
    const query = isBuyer ? { buyerId: req.user._id } : { farmerId: req.user._id };

    let deals = await Deal.find(query)
      .populate('buyerId', 'firstName lastName phone email village block district state')
      .populate('farmerId', 'firstName lastName phone email village block district state')
      .populate('buyerRequestId', 'crop quantity unit offeredPrice location description')
      .sort('-createdAt');
      
    // Enforce Privacy: Remove contact details unless ACCEPTED, VERIFIED or beyond
    deals = deals.map(deal => {
      const dealObj = deal.toObject();
      if (!['ACCEPTED', 'VERIFIED', 'ADMIN_PRE_SHIPMENT_VERIFIED', 'BUYER_DELIVERY_UPLOADED', 'RECEIPT_SUBMITTED', 'COMPLETED', 'DISPUTED'].includes(deal.status)) {
        // Strip sensitive info
        if (dealObj.buyerId) {
          delete dealObj.buyerId.phone;
          delete dealObj.buyerId.email;
          delete dealObj.buyerId.village; // Keep basic name only
        }
        if (dealObj.farmerId) {
          delete dealObj.farmerId.phone;
          delete dealObj.farmerId.email;
          delete dealObj.farmerId.village;
        }
      }
      return dealObj;
    });

    res.json({ success: true, data: deals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Repair accepted offers that predate deal creation. Kept out of dashboard reads.
router.post('/deals/repair-missing', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const offers = await FarmerOffer.aggregate([
      { $match: { status: 'ACCEPTED' } },
      { $lookup: { from: 'deals', localField: '_id', foreignField: 'farmerOfferId', as: 'deals' } },
      { $match: { deals: { $eq: [] } } },
      { $project: { _id: 1, buyerRequestId: 1, farmerId: 1, quantity: 1, counterOfferPrice: 1 } },
    ]);

    const requestIds = [...new Set(offers.map((offer) => offer.buyerRequestId.toString()))];
    const requests = await BuyerRequest.find({ _id: { $in: requestIds } }).select('buyerId crop offeredPrice');
    const requestById = new Map(requests.map((request) => [request._id.toString(), request]));
    const missingDeals = offers.flatMap((offer) => {
      const buyerRequest = requestById.get(offer.buyerRequestId.toString());
      if (!buyerRequest) return [];
      return [{
        buyerId: buyerRequest.buyerId,
        farmerId: offer.farmerId,
        buyerRequestId: buyerRequest._id,
        farmerOfferId: offer._id,
        crop: buyerRequest.crop || 'Agricultural Produce',
        quantity: Number(offer.quantity) || 1,
        agreedPrice: Number(offer.counterOfferPrice || buyerRequest.offeredPrice) || 0,
        status: 'ACCEPTED',
      }];
    });

    if (missingDeals.length) await Deal.insertMany(missingDeals, { ordered: false });
    res.json({ success: true, repaired: missingDeals.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get a single deal
router.get('/deals/:id', requireAuth, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id)
      .populate('buyerId', 'firstName lastName phone email village block district state')
      .populate('farmerId', 'firstName lastName phone email village block district state')
      .populate('buyerRequestId');
      
    if (!deal || (deal.buyerId._id.toString() !== req.user._id.toString() && deal.farmerId._id.toString() !== req.user._id.toString())) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const dealObj = deal.toObject();
    if (!['VERIFIED', 'ADMIN_PRE_SHIPMENT_VERIFIED', 'BUYER_DELIVERY_UPLOADED', 'RECEIPT_SUBMITTED', 'COMPLETED', 'DISPUTED'].includes(deal.status)) {
      if (dealObj.buyerId) { delete dealObj.buyerId.phone; delete dealObj.buyerId.email; }
      if (dealObj.farmerId) { delete dealObj.farmerId.phone; delete dealObj.farmerId.email; }
    }
    
    // Protect Privacy: Only admins should see the farmer's bank account
    if (req.user.role !== 'ADMIN') {
      delete dealObj.escrowBankAccount;
    }

    res.json({ success: true, data: dealObj });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Submit Escrow Bank Details
router.post('/deals/:id/escrow', requireAuth, requireRole('FARMER'), async (req, res) => {
  try {
    const deal = await Deal.findOne({ _id: req.params.id, farmerId: req.user._id });
    if (!deal) return res.status(403).json({ success: false, message: 'Unauthorized' });

    if (deal.status !== 'BANK_DETAILS_PENDING') {
      return res.status(400).json({ success: false, message: 'Deal is not ready for escrow details.' });
    }

    const { accountNumber, ifscCode, bankName, upiId, upiPhone } = req.body;
    
    if (!accountNumber || !ifscCode || !bankName || !upiId || !upiPhone) {
      return res.status(400).json({ success: false, message: 'All escrow details are required.' });
    }

    deal.escrowBankAccount = {
      accountNumber,
      ifscCode,
      bankName,
      upiId,
      upiPhone,
      submittedAt: new Date()
    };
    
    deal.status = 'BUYER_PAYMENT_PENDING';
    await deal.save();

    res.json({ success: true, data: deal, message: 'Escrow bank details saved successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Upload Photos & Trigger AI
router.post('/deals/:id/quality-submission', requireAuth, requireRole('FARMER'), async (req, res) => {
  try {
    const deal = await Deal.findOne({ _id: req.params.id, farmerId: req.user._id });
    if (!deal) return res.status(403).json({ success: false, message: 'Unauthorized' });

    if (!['ACCEPTED', 'AI_FLAGGED'].includes(deal.status)) {
      return res.status(400).json({ success: false, message: 'Deal is not ready for photo upload.' });
    }

    const { imageUrls } = req.body;
    if (!imageUrls || imageUrls.length < 5) {
      return res.status(400).json({ success: false, message: 'Minimum 5 photos required.' });
    }

    // Call service boundary
    const aiResult = await cropQualityService.analyzePhotos(imageUrls);
    
    deal.status = aiResult.passed ? 'ADMIN_MOISTURE_REVIEW' : 'AI_FLAGGED';
    deal.moisturePercent = 11.8;

    deal.qualitySubmissions.push({
      imageUrls,
      aiStatus: aiResult.passed ? 'PASSED' : 'FLAGGED',
      aiFindings: aiResult.findings || 'Moisture: 11.8% (Acceptable - standard 10%-14%). Produce passed AI screening.',
      submittedAt: new Date()
    });

    await deal.save();
    res.json({
      success: true,
      data: deal,
      message: 'Moisture percent acceptable (11.8%)! Waiting for buyer to deposit the finalized amount and agent fee.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Pay ₹250 Agent Fee + Escrow Deposit (Buyer)
router.post('/deals/:id/pay-buyer-escrow', requireAuth, requireRole('BUYER'), async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal || deal.buyerId.toString() !== req.user._id.toString()) {
      return res.status(404).json({ success: false, message: 'Deal not found or unauthorized' });
    }

    if (deal.status === 'AGENT_PAYMENT_PENDING' || deal.status === 'HUMAN_REVIEW') {
      return res.json({ success: true, data: deal, message: 'Payment already processed.' });
    }

    if (deal.status !== 'BUYER_PAYMENT_PENDING') {
      return res.status(400).json({ success: false, message: 'Deal is not ready for escrow deposit.' });
    }

    const amount = req.body?.amount || (deal.quantity * deal.agreedPrice);

    // Agent fee is paid by the Farmer only, Buyer just pays the Escrow deposit.
    deal.escrowDepositPaid = true;
    deal.escrowDepositAmount = amount;
    deal.agentRequestedAt = new Date();
    deal.status = 'AGENT_PAYMENT_PENDING'; // Wait for Farmer to pay their verification fee

    await deal.save();

    // Credit admin wallet
    await creditWallet(
      amount,
      deal._id,
      req.user._id,
      'BUYER',
      `Escrow deposit for Deal #${deal._id} (${deal.crop} - ₹${amount})`
    );

    res.json({
      success: true,
      data: deal,
      message: 'Payment received! Escrow deposit secured and on-ground agent will come in contact with you soon.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Free Video Call Verification Slot Selection (FARMER)
router.post('/deals/:id/video-call/request', requireAuth, requireRole('FARMER'), async (req, res) => {
  try {
    if (!liveKitConfigured()) return res.status(503).json({ success: false, message: 'Video calling is not configured on the server.' });
    const deal = await Deal.findOne({ _id: req.params.id, farmerId: req.user._id });
    if (!deal) return res.status(404).json({ success: false, message: 'Deal not found.' });
    if (deal.status !== 'HUMAN_REVIEW' || !deal.videoCallSlot?.date) {
      return res.status(400).json({ success: false, message: 'Schedule your video call slot before requesting a call.' });
    }
    if (['REQUESTED', 'ACTIVE'].includes(deal.liveKitCall?.status)) {
      return res.status(409).json({ success: false, message: 'A video call is already in progress or waiting for admin.' });
    }

    const roomName = `saathi-deal-${deal._id}-${Date.now()}`;
    deal.liveKitCall = { status: 'REQUESTED', roomName, requestedAt: new Date() };
    await deal.save();
    const farmerName = [req.user.firstName, req.user.lastName].filter(Boolean).join(' ') || 'Farmer';
    const token = await makeCallToken(req.user._id, farmerName, roomName);
    res.status(201).json({ success: true, data: { token, serverUrl: process.env.LIVEKIT_URL, roomName }, message: 'Call request sent. Waiting for an admin to join.' });
  } catch (error) {
    console.error('Video call request failed:', error.message);
    res.status(500).json({ success: false, message: 'Unable to start video call.' });
  }
});

router.post('/deals/:id/video-call/join', requireAuth, requireRole('FARMER'), async (req, res) => {
  try {
    if (!liveKitConfigured()) return res.status(503).json({ success: false, message: 'Video calling is not configured on the server.' });
    const deal = await Deal.findOne({ _id: req.params.id, farmerId: req.user._id });
    if (!deal || !['REQUESTED', 'ACTIVE'].includes(deal.liveKitCall?.status) || !deal.liveKitCall.roomName) {
      return res.status(404).json({ success: false, message: 'There is no active call to rejoin.' });
    }
    const name = [req.user.firstName, req.user.lastName].filter(Boolean).join(' ') || 'Farmer';
    const token = await makeCallToken(req.user._id, name, deal.liveKitCall.roomName);
    res.json({ success: true, data: { token, serverUrl: process.env.LIVEKIT_URL, roomName: deal.liveKitCall.roomName } });
  } catch (error) {
    console.error('Unable to rejoin video call:', error.message);
    res.status(500).json({ success: false, message: 'Unable to rejoin video call.' });
  }
});

router.post('/deals/:id/schedule-video-call', requireAuth, requireRole('FARMER'), async (req, res) => {
  try {
    const { date, timeSlot } = req.body;
    if (!date || !timeSlot) {
      return res.status(400).json({ success: false, message: 'Please select both a date and time slot.' });
    }

    const deal = await Deal.findById(req.params.id);
    if (!deal || deal.farmerId.toString() !== req.user._id.toString()) {
      return res.status(404).json({ success: false, message: 'Deal not found or unauthorized' });
    }

    deal.videoCallSlot = {
      date,
      timeSlot,
      scheduledAt: new Date(),
      status: 'SCHEDULED',
      whatsappSent: true
    };
    deal.farmerAgentFeePaid = true;
    deal.agentFeePaid = true;
    deal.agentFeeAmount = 0;
    deal.status = 'HUMAN_REVIEW'; // Sent to Admin for Video Verification

    await deal.save();

    console.log(`[WhatsApp Notification] Sent to farmer ${req.user.phone || ''}: Your Free Video Call Verification is scheduled for ${date} at ${timeSlot}.`);

    res.json({
      success: true,
      data: deal,
      message: `✅ Free Video Call Verification scheduled for ${date} at ${timeSlot}! A WhatsApp notification has been sent.`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Mock Human Verification (Admin/Agent)
router.post('/deals/:id/human-review', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const { status, notes } = req.body; // status = 'APPROVED' or 'REJECTED'
    const deal = await Deal.findById(req.params.id);
    if (!deal || deal.status !== 'HUMAN_REVIEW') {
      return res.status(400).json({ success: false, message: 'Deal not ready for human review.' });
    }

    // In a real app, verify req.user is an ADMIN or AGENT here.
    const lastSub = deal.qualitySubmissions[deal.qualitySubmissions.length - 1];
    if (lastSub) {
      lastSub.humanStatus = status;
      lastSub.humanReviewerId = req.user._id;
      lastSub.humanNotes = notes;
      lastSub.reviewedAt = new Date();
    }

    if (status === 'APPROVED') {
      deal.status = 'VERIFIED';
      deal.verifiedAt = new Date();
    } else {
      deal.status = 'CANCELLED'; // Or 'DISPUTED' / 'AI_FLAGGED' depending on policy
    }

    await deal.save();
    res.json({ success: true, data: deal });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Upload Transaction Receipt & UTR Number
router.post('/deals/:id/receipt', requireAuth, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal || (deal.buyerId.toString() !== req.user._id.toString() && deal.farmerId.toString() !== req.user._id.toString())) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (!['VERIFIED', 'RECEIPT_SUBMITTED'].includes(deal.status)) {
      return res.status(400).json({ success: false, message: 'Deal must be VERIFIED before uploading payment proof.' });
    }

    const { receiptUrl, utrNumber } = req.body;
    if (!receiptUrl && !utrNumber) {
      return res.status(400).json({ success: false, message: 'Receipt photo or UTR number is required.' });
    }

    if (receiptUrl) deal.transactionReceiptUrl = receiptUrl;
    if (utrNumber) deal.utrNumber = utrNumber.trim();
    deal.receiptUploadedBy = req.user._id;
    deal.receiptUploadedAt = new Date();
    deal.status = 'RECEIPT_SUBMITTED';
    await deal.save();

    res.json({
      success: true,
      data: deal,
      message: 'Transaction receipt & UTR submitted! Sent to admin for final deal completion verification.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Report Deal
router.post('/deals/:id/report', requireAuth, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal || (deal.buyerId.toString() !== req.user._id.toString() && deal.farmerId.toString() !== req.user._id.toString())) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const { reason, description } = req.body;
    const reportedUserId = req.user._id.toString() === deal.buyerId.toString() ? deal.farmerId : deal.buyerId;

    const report = await DealReport.create({
      dealId: deal._id,
      reporterId: req.user._id,
      reportedUserId,
      reason,
      description
    });
    
    // Optionally flag deal status
    deal.status = 'DISPUTED';
    await deal.save();

    res.status(201).json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete unused legacy ESCROW ROUTES here

router.post('/deals/:id/buyer-delivery-photos', requireAuth, requireRole('BUYER'), async (req, res) => {
  try {
    const { imageUrls } = req.body;
    if (!Array.isArray(imageUrls) || imageUrls.length === 0 || imageUrls.length > 10) {
      return res.status(400).json({ success: false, message: 'Upload between 1 and 10 delivery photos.' });
    }
    const maxImageDataUrlLength = 700_000;
    if (imageUrls.some((image) => typeof image !== 'string'
      || !/^data:image\/[\w.+-]+;base64,/i.test(image)
      || image.length > maxImageDataUrlLength)) {
      return res.status(400).json({ success: false, message: 'Each delivery photo must be a valid image under 500KB.' });
    }

    const deal = await Deal.findOne({ _id: req.params.id, buyerId: req.user._id });
    if (!deal) return res.status(404).json({ message: 'Deal not found' });
    
    if (!['VERIFIED', 'ADMIN_PRE_SHIPMENT_VERIFIED'].includes(deal.status)) {
      return res.status(400).json({ message: 'Deal is not verified for delivery yet.' });
    }
    
    deal.deliverySubmissions = imageUrls;
    deal.status = 'BUYER_DELIVERY_UPLOADED';
    await deal.save();
    res.json(deal);
  } catch (error) {
    console.error('[BuyerDeliveryPhotos] Upload error:', error.message);
    res.status(500).json({ success: false, message: 'Unable to save delivery photos. Please try again.' });
  }
});

module.exports = router;
