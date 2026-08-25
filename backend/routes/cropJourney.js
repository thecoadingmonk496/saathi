const express = require('express');
const router = express.Router();
const { getJourney } = require('../controllers/cropJourneyController');

router.get('/', getJourney);

module.exports = router;
