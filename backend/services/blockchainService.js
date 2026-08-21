const { ethers } = require('ethers');
const abi = require('./saathiVerificationAbi');

const NETWORK = 'Polygon Amoy';

function getConfig() {
  return {
    rpcUrl: process.env.POLYGON_AMOY_RPC_URL,
    privateKey: process.env.BLOCKCHAIN_PRIVATE_KEY,
    contractAddress: process.env.SAATHI_CONTRACT_ADDRESS,
  };
}

function getContract(readOnly = false) {
  const { rpcUrl, privateKey, contractAddress } = getConfig();
  if (!rpcUrl || !contractAddress || (!readOnly && !privateKey)) return null;

  const provider = new ethers.JsonRpcProvider(rpcUrl, 80002, { staticNetwork: true });
  const signerOrProvider = readOnly ? provider : new ethers.Wallet(privateKey, provider);
  return new ethers.Contract(contractAddress, abi, signerOrProvider);
}

function pendingResult(recordId, reason = 'Blockchain configuration is pending') {
  return {
    verified: false,
    status: 'pending',
    network: NETWORK,
    recordId,
    error: reason,
  };
}

async function waitForTransaction(transaction, recordId) {
  const receipt = await transaction.wait();
  return {
    verified: true,
    status: receipt.status === 1 ? 'verified' : 'failed',
    network: NETWORK,
    transactionHash: receipt.hash,
    blockNumber: receipt.blockNumber?.toString(),
    recordId,
    timestamp: new Date(),
  };
}

async function recordSupplyChainEvent({ recordId, dataHash, product, stage }) {
  const contract = getContract();
  if (!contract) return pendingResult(recordId);

  try {
    const transaction = await contract.recordSupplyChain(recordId, dataHash, product, stage);
    return waitForTransaction(transaction, recordId);
  } catch (error) {
    console.error('Supply-chain blockchain write failed:', error.message);
    return { ...pendingResult(recordId, error.message), status: 'failed' };
  }
}

async function verifyBuyer({ buyerId, dataHash, buyerType }) {
  const contract = getContract();
  if (!contract) return pendingResult(buyerId);

  try {
    const transaction = await contract.verifyBuyer(buyerId, dataHash, buyerType);
    return waitForTransaction(transaction, buyerId);
  } catch (error) {
    console.error('Buyer blockchain write failed:', error.message);
    return { ...pendingResult(buyerId, error.message), status: 'failed' };
  }
}

async function getSupplyChainRecord(recordId) {
  const contract = getContract(true);
  if (!contract) return pendingResult(recordId);

  try {
    const record = await contract.getSupplyChainRecord(recordId);
    if (record.timestamp === 0n) return pendingResult(recordId, 'No blockchain record found');
    return {
      verified: true,
      status: 'verified',
      network: NETWORK,
      recordId,
      dataHash: record.dataHash,
      product: record.product,
      stage: record.stage,
      timestamp: new Date(Number(record.timestamp) * 1000),
      verifier: record.verifier,
    };
  } catch (error) {
    console.error('Supply-chain blockchain read failed:', error.message);
    return { ...pendingResult(recordId, error.message), status: 'failed' };
  }
}

async function getBuyerVerification(buyerId) {
  const contract = getContract(true);
  if (!contract) return pendingResult(buyerId);

  try {
    const record = await contract.getBuyerVerification(buyerId);
    if (record.timestamp === 0n) return pendingResult(buyerId, 'No blockchain record found');
    return {
      verified: record.verified,
      status: record.verified ? 'verified' : 'failed',
      network: NETWORK,
      recordId: buyerId,
      dataHash: record.dataHash,
      buyerType: record.buyerType,
      timestamp: new Date(Number(record.timestamp) * 1000),
      verifier: record.verifier,
    };
  } catch (error) {
    console.error('Buyer blockchain read failed:', error.message);
    return { ...pendingResult(buyerId, error.message), status: 'failed' };
  }
}

module.exports = {
  NETWORK,
  recordSupplyChainEvent,
  verifyBuyer,
  getSupplyChainRecord,
  getBuyerVerification,
};
