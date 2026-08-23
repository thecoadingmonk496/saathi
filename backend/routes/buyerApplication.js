const express = require('express');
const router = express.Router();
const {
  applyBuyer,
  getMyApplication,
  updateMyApplication,
  getVerifiedBuyers,
  getVerifiedBuyerById,
} = require('../controllers/buyerApplicationController');

// Public routes
router.post('/apply', applyBuyer);
router.get('/my-application', getMyApplication);
router.patch('/my-application/:id', updateMyApplication);
router.get('/verified', getVerifiedBuyers);
router.get('/verified/:id', getVerifiedBuyerById);

module.exports = router;