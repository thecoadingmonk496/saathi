const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const {
  createOrder,
  getPendingOrders,
  approveOrder,
  rejectOrder,
} = require('../controllers/orderController');

const router = express.Router();

router.post('/', requireAuth, createOrder);
router.get('/pending', requireAuth, getPendingOrders);
router.post('/:id/approve', requireAuth, approveOrder);
router.post('/:id/reject', requireAuth, rejectOrder);

module.exports = router;
