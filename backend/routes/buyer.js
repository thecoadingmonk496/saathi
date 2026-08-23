const express = require('express');
const router = express.Router();
const buyerController = require('../controllers/buyerController');

router.get('/', buyerController.getBuyerListings);

module.exports = router;
