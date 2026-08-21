module.exports = [
  'function recordSupplyChain(string recordId, bytes32 dataHash, string product, string stage)',
  'function verifyBuyer(string buyerId, bytes32 dataHash, string buyerType)',
  'function getSupplyChainRecord(string recordId) view returns (bytes32 dataHash, string product, string stage, uint256 timestamp, address verifier)',
  'function getBuyerVerification(string buyerId) view returns (bytes32 dataHash, string buyerType, bool verified, uint256 timestamp, address verifier)',
];
