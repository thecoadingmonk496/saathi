const express = require('express');
const router = express.Router();
const priceHistoryController = require('../controllers/priceHistoryController');

router.get('/', priceHistoryController.getPriceHistory);

module.exports = router;
