const express = require('express');
const router = express.Router();
const mandiController = require('../controllers/mandiController');

router.get('/', mandiController.getMandiPrices);
router.get('/states', mandiController.getMandiStates);
router.get('/districts', mandiController.getMandiDistricts);

module.exports = router;

