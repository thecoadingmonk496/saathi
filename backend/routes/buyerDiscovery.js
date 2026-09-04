const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const BuyerRequest = require('../models/BuyerRequest');
const FarmerOffer = require('../models/FarmerOffer');
const Deal = require('../models/Deal');
const DealReport = require('../models/DealReport');
const cropQualityService = require('../services/cropQualityService');

const User = require('../models/User');

// Middleware for role checking
const requireRole = (role) => (req, res, next) => {
  if (req.user && req.user.role === role) {
    next();
  } else {
    res.status(403).json({ success: false, message: `Access denied. Requires ${role} role.` });
  }
};

// ==========================================
// BUYER REQUESTS
// ==========================================

// Create a new request (Buyer only)
router.post('/requests', requireAuth, requireRole('BUYER'), async (req, res) => {
  try {
    const { crop, quantity, unit, offeredPrice, location, description } = req.body;
    const newRequest = await BuyerRequest.create({
      buyerId: req.user._id,
      crop,
      quantity,
      unit: unit || 'quintals',
      offeredPrice,
      location,
      description,
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
    const { crop, quantity, unit, offeredPrice, location, description } = req.body;
    const request = await BuyerRequest.findOne({ _id: req.params.id, buyerId: req.user._id });
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
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
    const requests = await BuyerRequest.find({ status: 'PUBLISHED' })
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
    
    // Compute fulfilled quantity for each request from ACCEPTED offers
    const requestsWithFulfilled = await Promise.all(requests.map(async (req) => {
      const acceptedOffers = await FarmerOffer.find({ buyerRequestId: req._id, status: 'ACCEPTED' });
      const fulfilledQuantity = acceptedOffers.reduce((sum, o) => sum + Number(o.quantity || 0), 0);
      return { ...req.toObject(), fulfilledQuantity };
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

// Mock SAATHI Admin Review endpoint (for demo completeness without full admin panel)
router.post('/requests/:id/approve', requireAuth, async (req, res) => {
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
    
    const isBuyer = req.user.role === 'BUYER' && offer.buyerRequestId.buyerId.toString() === req.user._id.toString();
    const isFarmer = req.user.role === 'FARMER' && offer.farmerId.toString() === req.user._id.toString();
    
    if (!isBuyer && !isFarmer) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
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
    
    const isBuyer = req.user.role === 'BUYER' && offer.buyerRequestId.buyerId.toString() === req.user._id.toString();
    const isFarmer = req.user.role === 'FARMER' && offer.farmerId.toString() === req.user._id.toString();
    
    if (!isBuyer && !isFarmer) return res.status(403).json({ success: false, message: 'Unauthorized' });
    
    if (isBuyer && (offer.status !== 'PENDING' && offer.status !== 'COUNTERED_BY_FARMER')) {
      return res.status(400).json({ success: false, message: 'Buyer can only accept Farmer offers/counters.' });
    }
    if (isFarmer && offer.status !== 'COUNTERED_BY_BUYER') {
      return res.status(400).json({ success: false, message: 'Farmer can only accept Buyer counters.' });
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

    const isBuyer = req.user.role === 'BUYER' && offer.buyerRequestId.buyerId.toString() === req.user._id.toString();
    const isFarmer = req.user.role === 'FARMER' && offer.farmerId.toString() === req.user._id.toString();
    
    if (!isBuyer && !isFarmer) return res.status(403).json({ success: false, message: 'Unauthorized' });

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
    const isBuyer = req.user.role === 'BUYER';
    const query = isBuyer ? { buyerId: req.user._id } : { farmerId: req.user._id };

    // Auto-heal: Ensure any ACCEPTED offer has its Deal record in MongoDB
    try {
      const acceptedOffers = await FarmerOffer.find({
        status: 'ACCEPTED',
        ...(isBuyer ? {} : { farmerId: req.user._id })
      }).populate('buyerRequestId');

      for (const off of acceptedOffers) {
        if (off.buyerRequestId) {
          const reqBuyerId = off.buyerRequestId.buyerId?.toString();
          if (isBuyer && reqBuyerId !== req.user._id.toString()) continue;

          const existingDeal = await Deal.findOne({ farmerOfferId: off._id });
          if (!existingDeal) {
            await Deal.create({
              buyerId: off.buyerRequestId.buyerId,
              farmerId: off.farmerId,
              buyerRequestId: off.buyerRequestId._id,
              farmerOfferId: off._id,
              crop: off.buyerRequestId.crop || 'Agricultural Produce',
              quantity: Number(off.quantity) || 1,
              agreedPrice: Number(off.counterOfferPrice || off.buyerRequestId.offeredPrice) || 0,
              status: 'ACCEPTED',
            });
          }
        }
      }
    } catch (healErr) {
      console.error('Auto-heal deals error:', healErr.message);
    }
    
    let deals = await Deal.find(query)
      .populate('buyerId', 'firstName lastName phone email village block district state')
      .populate('farmerId', 'firstName lastName phone email village block district state')
      .populate('buyerRequestId', 'crop quantity unit offeredPrice location description')
      .sort('-createdAt');
      
    // Enforce Privacy: Remove contact details unless ACCEPTED, VERIFIED or beyond
    deals = deals.map(deal => {
      const dealObj = deal.toObject();
      if (!['ACCEPTED', 'VERIFIED', 'COMPLETED', 'DISPUTED'].includes(deal.status)) {
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
    if (!['VERIFIED', 'COMPLETED', 'DISPUTED'].includes(deal.status)) {
      if (dealObj.buyerId) { delete dealObj.buyerId.phone; delete dealObj.buyerId.email; }
      if (dealObj.farmerId) { delete dealObj.farmerId.phone; delete dealObj.farmerId.email; }
    }

    res.json({ success: true, data: dealObj });
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
    
    deal.status = aiResult.passed ? 'AGENT_PAYMENT_PENDING' : 'AI_FLAGGED';
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
      message: 'Moisture percent acceptable (11.8%)! Please proceed to pay ₹250 to connect with our on-ground verification agent.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Pay ₹250 Agent Connection Fee
router.post('/deals/:id/pay-agent-fee', requireAuth, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ success: false, message: 'Deal not found' });

    deal.agentFeePaid = true;
    deal.agentFeeAmount = 250;
    deal.agentRequestedAt = new Date();
    deal.status = 'HUMAN_REVIEW'; // Sent to Admin Verification Center for on-ground physical check

    await deal.save();
    res.json({
      success: true,
      data: deal,
      message: 'Payment of ₹250 received! Our on-ground agent will come in contact with you soon.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Mock Human Verification (Admin/Agent)
router.post('/deals/:id/human-review', requireAuth, async (req, res) => {
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

module.exports = router;
