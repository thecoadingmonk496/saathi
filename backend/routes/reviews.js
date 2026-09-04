const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const { createReview, getAllReviews, getUserReviews, getReviewableUsers } = require('../controllers/reviewController');

router.post('/', requireAuth, createReview);
router.get('/users/reviewable', requireAuth, getReviewableUsers);
router.get('/', getAllReviews);
router.get('/user/:userId', getUserReviews);

module.exports = router;
