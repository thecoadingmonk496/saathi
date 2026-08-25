const express = require('express');
const { requireBlockchainWriter } = require('../middleware/blockchainAuth');
const {
  recordSupplyChain,
  verifyBuyerRecord,
  readSupplyChain,
  readBuyerVerification,
  compareSupplyChain,
} = require('../controllers/blockchainController');

const { getBlockchainStats } = require('../controllers/blockchainController');

const router = express.Router();

router.post('/supply-chain', requireBlockchainWriter, recordSupplyChain);
router.post('/verify-buyer', requireBlockchainWriter, verifyBuyerRecord);
router.get('/supply-chain/:recordId', readSupplyChain);
router.get('/supply-chain/:recordId/verify', compareSupplyChain);
router.get('/buyer/:buyerId', readBuyerVerification);
router.get('/stats', getBlockchainStats);

module.exports = router;
