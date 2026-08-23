const express = require('express');
const router = express.Router();
const mandiController = require('../controllers/mandiController');

router.get('/', mandiController.getMandiPrices);

module.exports = router;
