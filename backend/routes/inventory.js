const express = require('express');
const InventoryLot = require('../models/InventoryLot');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const lots = await InventoryLot.find({ ownerId: req.user.userId, availableQuantity: { $gt: 0 } });
    return res.status(200).json({ success: true, inventory: lots });
  } catch (error) {
    console.error('Inventory fetch error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
