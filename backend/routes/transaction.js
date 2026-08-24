const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const { createTransaction, getTransaction, getCropJourney } = require('../controllers/transactionController');

const router = express.Router();

// Get the full Crop Journey (publicly accessible if batchId is known)
router.get('/journey/:batchId', getCropJourney);

// Get a specific transaction details
router.get('/:id', requireAuth, getTransaction);

// Create a new transaction (requires auth)
router.post('/', requireAuth, createTransaction);

module.exports = router;
