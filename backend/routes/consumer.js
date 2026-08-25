const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const { getConsumers } = require('../controllers/consumerController');

const router = express.Router();

router.get('/', requireAuth, getConsumers);

module.exports = router;
