const VerificationRecord = require('../models/VerificationRecord');
const { sha256Hex, toBytes32Hash } = require('../services/canonicalHash');
const blockchainService = require('../services/blockchainService');

function supplyChainPayload(body) {
  return {
    product: body.product,
    farmerId: body.farmerId,
    buyerId: body.buyerId || null,
    quantity: Number(body.quantity),
    price: Number(body.price),
    stage: body.stage,
  };
}

async function recordSupplyChain(req, res) {
  try {
    const { product, farmerId, buyerId, quantity, price, stage } = req.body || {};
    if (!product || !farmerId || !stage || !Number.isFinite(Number(quantity)) || !Number.isFinite(Number(price))) {
      return res.status(400).json({ success: false, message: 'product, farmerId, quantity, price, and stage are required' });
    }

    const payload = supplyChainPayload({ product, farmerId, buyerId, quantity, price, stage });
    const recordId = `SC-${farmerId}-${Date.now()}`;
    const dataHash = sha256Hex(payload);
    const blockchain = await blockchainService.recordSupplyChainEvent({
      recordId,
      dataHash: toBytes32Hash(dataHash),
      product,
      stage,
    });

    const saved = await VerificationRecord.create({
      recordType: 'SUPPLY_CHAIN',
      referenceId: recordId,
      dataHash,
      payload,
      blockchain: { ...blockchain, dataHash },
    });

    return res.status(201).json({
      success: true,
      databaseSaved: true,
      blockchainVerified: blockchain.verified,
      transactionHash: blockchain.transactionHash || null,
      recordId: saved.referenceId,
      dataHash,
      blockchain,
    });
  } catch (error) {
    console.error('Supply-chain verification error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to record supply-chain verification' });
  }
}

async function verifyBuyerRecord(req, res) {
  try {
    const { buyerId, buyerType, buyerName, verificationSource } = req.body || {};
    if (!buyerId || !buyerType || !buyerName || !verificationSource) {
      return res.status(400).json({ success: false, message: 'buyerId, buyerType, buyerName, and verificationSource are required' });
    }

    const payload = { buyerId, buyerType, buyerName, verificationSource };
    const dataHash = sha256Hex(payload);
    const blockchain = await blockchainService.verifyBuyer({
      buyerId,
      dataHash: toBytes32Hash(dataHash),
      buyerType,
    });

    const saved = await VerificationRecord.findOneAndUpdate(
      { recordType: 'BUYER', referenceId: buyerId },
      { recordType: 'BUYER', referenceId: buyerId, dataHash, payload, blockchain: { ...blockchain, dataHash } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    return res.status(201).json({
      success: true,
      databaseSaved: true,
      blockchainVerified: blockchain.verified,
      transactionHash: blockchain.transactionHash || null,
      recordId: saved.referenceId,
      dataHash,
      blockchain,
    });
  } catch (error) {
    console.error('Buyer verification error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to record buyer verification' });
  }
}

async function readSupplyChain(req, res) {
  const record = await VerificationRecord.findOne({ recordType: 'SUPPLY_CHAIN', referenceId: req.params.recordId }).lean();
  const chain = await blockchainService.getSupplyChainRecord(req.params.recordId);
  return res.json({ success: true, record: record || null, blockchain: chain });
}

async function readBuyerVerification(req, res) {
  const record = await VerificationRecord.findOne({ recordType: 'BUYER', referenceId: req.params.buyerId }).lean();
  const blockchain = await blockchainService.getBuyerVerification(req.params.buyerId);
  return res.json({ success: true, record: record || null, blockchain });
}

async function compareSupplyChain(req, res) {
  const record = await VerificationRecord.findOne({ recordType: 'SUPPLY_CHAIN', referenceId: req.params.recordId }).lean();
  if (!record) return res.status(404).json({ success: false, message: 'Database record not found' });

  const currentHash = sha256Hex(record.payload);
  const chain = await blockchainService.getSupplyChainRecord(req.params.recordId);
  const matches = chain.verified && toBytes32Hash(currentHash).toLowerCase() === chain.dataHash.toLowerCase();
  return res.json({ success: true, verified: matches, databaseHash: currentHash, blockchain: chain });
}

async function getBlockchainStats(req, res) {
  const [supplyChainEvents, verifiedBuyers] = await Promise.all([
    VerificationRecord.countDocuments({ recordType: 'SUPPLY_CHAIN', 'blockchain.verified': true }),
    VerificationRecord.countDocuments({ recordType: 'BUYER', 'blockchain.verified': true }),
  ]);

  return res.json({
    success: true,
    network: 'Polygon Amoy',
    hasRecords: supplyChainEvents + verifiedBuyers > 0,
    supplyChainEvents,
    verifiedBuyers,
  });
}

module.exports = { recordSupplyChain, verifyBuyerRecord, readSupplyChain, readBuyerVerification, compareSupplyChain, getBlockchainStats };
