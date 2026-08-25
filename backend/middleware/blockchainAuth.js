function requireBlockchainWriter(req, res, next) {
  const serviceKey = process.env.BLOCKCHAIN_SERVICE_KEY;
  const suppliedKey = req.get('x-blockchain-service-key');

  if (!serviceKey || suppliedKey !== serviceKey) {
    return res.status(403).json({ success: false, message: 'Blockchain writer authorization required' });
  }

  return next();
}

module.exports = { requireBlockchainWriter };
