const express = require('express');
const { getWholesalers } = require('../controllers/wholesalerController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', requireAuth, getWholesalers);

module.exports = router;
