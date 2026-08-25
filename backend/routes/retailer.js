const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const { getRetailers } = require('../controllers/retailerController');

const router = express.Router();

router.get('/', requireAuth, getRetailers);

module.exports = router;
