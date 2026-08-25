const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const { getTransaction, getCropJourney, getMyJourneys } = require('../controllers/transactionController');

const router = express.Router();

// Get the full Crop Journey (publicly accessible if batchId is known)
router.get('/journey/:batchId', getCropJourney);

// Get authenticated user's journeys
router.get('/user/my-journeys', requireAuth, getMyJourneys);

// Get a specific transaction details
router.get('/:id', requireAuth, getTransaction);

module.exports = router;
