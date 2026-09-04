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
    res.status(200).json({ success: true, count: requests.length, data: requests });
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

module.exports = router;