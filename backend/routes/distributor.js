const express = require('express');
const { getDistributors } = require('../controllers/distributorController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', requireAuth, getDistributors);

module.exports = router;
