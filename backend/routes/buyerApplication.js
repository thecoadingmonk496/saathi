const express = require('express');
const router = express.Router();
const {
  applyBuyer,
  getMyApplication,
  updateMyApplication,
  getVerifiedBuyers,
  getVerifiedBuyerById,
} = require('../controllers/buyerApplicationController');

const { requireAuth } = require('../middleware/authMiddleware');

// Public routes
router.post('/apply', applyBuyer);
router.get('/my-application', requireAuth, getMyApplication);
router.patch('/my-application/:id', requireAuth, updateMyApplication);
router.get('/verified', getVerifiedBuyers);
router.get('/verified/:id', getVerifiedBuyerById);

module.exports = router;