const express = require('express');
const {
  adminLogin,
  getAllUsers,
  deleteUser,
  verifyAdminToken,
} = require('../controllers/adminController');
const {
  getAllApplications,
  getApplicationById,
  reviewApplication,
  approveApplication,
  rejectApplication,
  requestInformation,
} = require('../controllers/buyerApplicationController');

const BuyerRequest = require('../models/BuyerRequest');
const BuyerApplication = require('../models/BuyerApplication');

const router = express.Router();

// Public route to authenticate admin
router.post('/login', adminLogin);

// Protected routes (Requires valid Admin JWT token)
router.get('/users', verifyAdminToken, getAllUsers);
router.delete('/users/:id', verifyAdminToken, deleteUser);

// Buyer application admin routes (KYC / Onboarding)
router.get('/buyer-applications', verifyAdminToken, getAllApplications);
router.get('/buyer-applications/:id', verifyAdminToken, getApplicationById);
router.patch('/buyer-applications/:id/review', verifyAdminToken, reviewApplication);
router.patch('/buyer-applications/:id/approve', verifyAdminToken, approveApplication);
router.patch('/buyer-applications/:id/reject', verifyAdminToken, rejectApplication);
router.patch('/buyer-applications/:id/request-information', verifyAdminToken, requestInformation);

// Buyer publication / procurement requests admin routes
router.get('/buyer-requests', verifyAdminToken, async (req, res) => {
  try {
    const requests = await BuyerRequest.find()
      .populate('buyerId', 'firstName lastName phone email village district state')
      .sort({ createdAt: -1 });

    const populated = await Promise.all(
      requests.map(async (r) => {
        const phone = r.buyerId?.phone;
        const email = r.buyerId?.email;
        let app = null;
        if (phone) {
          app = await BuyerApplication.findOne({ phone }).sort({ createdAt: -1 });
        }
        if (!app && email) {
          app = await BuyerApplication.findOne({ email }).sort({ createdAt: -1 });
        }
        return {
          ...r.toObject(),
          buyerApplication: app || null,
        };
      })
    );

    res.status(200).json({ success: true, count: populated.length, data: populated });
  } catch (error) {
    console.error('Error fetching buyer requests:', error.message);
    res.status(500).json({ success: false, message: 'Server error while fetching buyer requests' });
  }
});

router.patch('/buyer-requests/:id/approve', verifyAdminToken, async (req, res) => {
  try {
    const request = await BuyerRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Buyer request not found' });
    }
    request.status = 'PUBLISHED';
    request.publishedAt = new Date();
    request.reviewedAt = new Date();
    request.reviewedBy = req.admin?.email || 'admin';
    request.adminRemarks = '';
    await request.save();
    res.status(200).json({ success: true, message: 'Buyer publication approved and published.', data: request });
  } catch (error) {
    console.error('Error approving buyer request:', error.message);
    res.status(500).json({ success: false, message: 'Server error while approving request' });
  }
});

const Deal = require('../models/Deal');

router.patch('/buyer-requests/:id/reject', verifyAdminToken, async (req, res) => {
  try {
    const { reason } = req.body || {};
    const request = await BuyerRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Buyer request not found' });
    }
    request.status = 'REJECTED';
    request.adminRemarks = (reason || '').trim() || 'Requirements do not meet Saathi verification criteria.';
    request.reviewedAt = new Date();
    request.reviewedBy = req.admin?.email || 'admin';
    await request.save();
    res.status(200).json({ success: true, message: 'Buyer publication rejected.', data: request });
  } catch (error) {
    console.error('Error rejecting buyer request:', error.message);
    res.status(500).json({ success: false, message: 'Server error while rejecting request' });
  }
});

// ── On-Ground Field Agent Inspections Admin Routes ──
router.get('/deals/inspections', verifyAdminToken, async (req, res) => {
  try {
    const deals = await Deal.find()
      .populate('farmerId', 'firstName lastName phone email village block district state')
      .populate('buyerId', 'firstName lastName phone email village block district state')
      .populate('buyerRequestId', 'crop quantity unit offeredPrice location description')
      .sort({ updatedAt: -1 });
    res.status(200).json({ success: true, count: deals.length, data: deals });
  } catch (error) {
    console.error('Error fetching inspections:', error.message);
    res.status(500).json({ success: false, message: 'Server error while fetching inspections' });
  }
});

// Admin taps "Verified" (Approve on-ground physical inspection)
router.patch('/deals/:id/verify', verifyAdminToken, async (req, res) => {
  try {
    const { notes } = req.body || {};
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ success: false, message: 'Deal not found' });

    deal.status = 'VERIFIED';
    deal.verifiedAt = new Date();

    if (deal.qualitySubmissions && deal.qualitySubmissions.length > 0) {
      const lastSub = deal.qualitySubmissions[deal.qualitySubmissions.length - 1];
      lastSub.humanStatus = 'APPROVED';
      lastSub.humanNotes = notes || 'Physical crop check verified on-ground by Saathi field agent.';
      lastSub.reviewedAt = new Date();
      lastSub.verifiedAt = new Date();
    }

    await deal.save();
    res.status(200).json({ success: true, message: 'Crop verified successfully! Contact and delivery details unlocked for both parties.', data: deal });
  } catch (error) {
    console.error('Error verifying deal:', error.message);
    res.status(500).json({ success: false, message: 'Server error while verifying deal' });
  }
});

// Admin taps "Unverified"
router.patch('/deals/:id/unverify', verifyAdminToken, async (req, res) => {
  try {
    const { reason } = req.body || {};
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ success: false, message: 'Deal not found' });

    deal.status = 'UNVERIFIED';

    if (deal.qualitySubmissions && deal.qualitySubmissions.length > 0) {
      const lastSub = deal.qualitySubmissions[deal.qualitySubmissions.length - 1];
      lastSub.humanStatus = 'REJECTED';
      lastSub.humanNotes = reason || 'Produce failed on-ground physical quality parameters.';
      lastSub.reviewedAt = new Date();
    }

    await deal.save();
    res.status(200).json({ success: true, message: 'Produce marked Unverified.', data: deal });
  } catch (error) {
    console.error('Error un-verifying deal:', error.message);
    res.status(500).json({ success: false, message: 'Server error while updating deal status' });
  }
});

// Admin taps "Mark Deal Completed" (after reviewing uploaded receipt & UTR)
router.patch('/deals/:id/complete', verifyAdminToken, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ success: false, message: 'Deal not found' });

    deal.status = 'COMPLETED';
    deal.completedAt = new Date();
    await deal.save();

    res.status(200).json({
      success: true,
      message: 'Deal marked as COMPLETED! Recorded successfully on farmer dashboard.',
      data: deal
    });
  } catch (error) {
    console.error('Error completing deal:', error.message);
    res.status(500).json({ success: false, message: 'Server error while completing deal' });
  }
});

module.exports = router;