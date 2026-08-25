const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireBlockchainWriter } = require('../middleware/blockchainAuth');
const { getTransaction, getCropJourney, requestVerification, confirmVerification } = require('../controllers/transactionController');

const router = express.Router();

// Get the full Crop Journey (publicly accessible if batchId is known)
router.get('/journey/:batchId', getCropJourney);

// Get a specific transaction details
router.get('/:id', requireAuth, getTransaction);

// Verification endpoints
router.post('/:id/request-verification', requireAuth, requestVerification);
router.post('/:id/confirm-verification', requireBlockchainWriter, confirmVerification);

module.exports = router;
