const { expect } = require('chai');
const hre = require('hardhat');
const crypto = require('crypto');

// Helper: produce a bytes32 hash the same way the backend does
function sha256Bytes32(value) {
  const hex = crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
  return `0x${hex}`;
}

// Helper: quick keccak hash for arbitrary strings
function hash(value) {
  return hre.ethers.keccak256(hre.ethers.toUtf8Bytes(value));
}

async function deployFixture() {
  const [owner, other] = await hre.ethers.getSigners();
  const factory = await hre.ethers.getContractFactory('SaathiVerification');
  const contract = await factory.deploy(owner.address);
  await contract.waitForDeployment();
  return { contract, owner, other };
}

// ─── CONTRACT DEPLOYMENT ──────────────────────────────────────────────────────
describe('SaathiVerification — Deployment', function () {
  it('deploys successfully and sets the correct owner', async function () {
    const { contract, owner } = await deployFixture();
    expect(await contract.owner()).to.equal(owner.address);
  });

  it('returns empty structs for unknown recordIds', async function () {
    const { contract } = await deployFixture();
    const record = await contract.getSupplyChainRecord('UNKNOWN');
    expect(record.timestamp).to.equal(0n);
  });

  it('returns empty struct for unknown buyerIds', async function () {
    const { contract } = await deployFixture();
    const record = await contract.getBuyerVerification('UNKNOWN');
    expect(record.timestamp).to.equal(0n);
    expect(record.verified).to.equal(false);
  });
});

// ─── SUPPLY-CHAIN RECORD CREATION ─────────────────────────────────────────────
describe('SaathiVerification — Supply Chain', function () {
  it(`records a supply-chain event and emits the correct event`, async function () {
    const { contract, owner } = await deployFixture();
    const dataHash = hash(`wheat|farmer-to-wholesaler|500`);

    // Emit is checked without strict timestamp arg (timestamp is block.timestamp, hard to predict exactly)
    await expect(contract.recordSupplyChain(`SC-1`, dataHash, `Wheat`, `Farmer to Wholesaler`))
      .to.emit(contract, `SupplyChainRecorded`);

    // Verify the stored data is correct
    const record = await contract.getSupplyChainRecord(`SC-1`);
    expect(record.dataHash).to.equal(dataHash);
    expect(record.product).to.equal(`Wheat`);
    expect(record.stage).to.equal(`Farmer to Wholesaler`);
    expect(record.verifier).to.equal(owner.address);
    expect(record.timestamp).to.be.greaterThan(0n);
  });

  it('reads back all fields of a supply-chain record', async function () {
    const { contract, owner } = await deployFixture();
    const dataHash = hash('wheat|farmer-to-wholesaler|500');

    const tx = await contract.recordSupplyChain('SC-1', dataHash, 'Wheat', 'Farmer to Wholesaler');
    const receipt = await tx.wait();
    const block = await hre.ethers.provider.getBlock(receipt.blockNumber);

    const record = await contract.getSupplyChainRecord('SC-1');
    expect(record.dataHash).to.equal(dataHash);
    expect(record.product).to.equal('Wheat');
    expect(record.stage).to.equal('Farmer to Wholesaler');
    expect(record.timestamp).to.equal(BigInt(block.timestamp));
    expect(record.verifier).to.equal(owner.address);
  });

  it('supports multiple independent supply-chain records', async function () {
    const { contract } = await deployFixture();
    const h1 = hash('wheat|500');
    const h2 = hash('rice|200');

    await contract.recordSupplyChain('SC-1', h1, 'Wheat', 'Farmer to Wholesaler');
    await contract.recordSupplyChain('SC-2', h2, 'Rice', 'Mandi');

    const r1 = await contract.getSupplyChainRecord('SC-1');
    const r2 = await contract.getSupplyChainRecord('SC-2');

    expect(r1.product).to.equal('Wheat');
    expect(r2.product).to.equal('Rice');
  });
});

// ─── BUYER VERIFICATION ───────────────────────────────────────────────────────
describe('SaathiVerification — Buyer Verification', function () {
  it('records a buyer verification and emits the correct event', async function () {
    const { contract, owner } = await deployFixture();
    const dataHash = hash('B-204|Wholesaler|Field Team');

    await expect(contract.verifyBuyer('B-204', dataHash, 'Wholesaler'))
      .to.emit(contract, 'BuyerVerified');

    const record = await contract.getBuyerVerification('B-204');
    expect(record.dataHash).to.equal(dataHash);
    expect(record.buyerType).to.equal('Wholesaler');
    expect(record.verified).to.equal(true);
    expect(record.verifier).to.equal(owner.address);
  });

  it('stores the correct verifier address', async function () {
    const { contract, owner } = await deployFixture();
    await contract.verifyBuyer('B-1', hash('data'), 'Retailer');
    const record = await contract.getBuyerVerification('B-1');
    expect(record.verifier).to.equal(owner.address);
  });

  it('supports multiple independent buyer verifications', async function () {
    const { contract } = await deployFixture();
    await contract.verifyBuyer('B-1', hash('b1'), 'Wholesaler');
    await contract.verifyBuyer('B-2', hash('b2'), 'Retailer');

    const b1 = await contract.getBuyerVerification('B-1');
    const b2 = await contract.getBuyerVerification('B-2');
    expect(b1.buyerType).to.equal('Wholesaler');
    expect(b2.buyerType).to.equal('Retailer');
  });
});

// ─── ACCESS CONTROL ───────────────────────────────────────────────────────────
describe('SaathiVerification — Access Control', function () {
  it('rejects supply-chain write from non-owner', async function () {
    const { contract, other } = await deployFixture();
    await expect(
      contract.connect(other).recordSupplyChain('SC-X', hash('data'), 'Rice', 'Mandi')
    ).to.be.revertedWithCustomError(contract, 'OwnableUnauthorizedAccount');
  });

  it('rejects buyer verification write from non-owner', async function () {
    const { contract, other } = await deployFixture();
    await expect(
      contract.connect(other).verifyBuyer('B-X', hash('data'), 'Wholesaler')
    ).to.be.revertedWithCustomError(contract, 'OwnableUnauthorizedAccount');
  });
});

// ─── DUPLICATE PREVENTION ─────────────────────────────────────────────────────
describe('SaathiVerification — Duplicate Prevention', function () {
  it('rejects duplicate supply-chain recordId', async function () {
    const { contract } = await deployFixture();
    const dataHash = hash('record');
    await contract.recordSupplyChain('SC-DUP', dataHash, 'Rice', 'Mandi');
    await expect(
      contract.recordSupplyChain('SC-DUP', dataHash, 'Rice', 'Mandi')
    ).to.be.revertedWith('Record already exists');
  });

  it('rejects duplicate buyer buyerId', async function () {
    const { contract } = await deployFixture();
    const dataHash = hash('buyer');
    await contract.verifyBuyer('B-DUP', dataHash, 'Wholesaler');
    await expect(
      contract.verifyBuyer('B-DUP', dataHash, 'Wholesaler')
    ).to.be.revertedWith('Buyer already verified');
  });
});

// ─── HASH GENERATION UTILITY ─────────────────────────────────────────────────
describe('Hash generation', function () {
  it('produces a deterministic SHA-256 hash for the same payload', function () {
    const payload = { product: 'Wheat', farmerId: 'F102', quantity: 500, price: 2500, stage: 'Farmer to Wholesaler', buyerId: null };
    const h1 = sha256Bytes32(payload);
    const h2 = sha256Bytes32(payload);
    expect(h1).to.equal(h2);
    expect(h1).to.match(/^0x[0-9a-f]{64}$/);
  });

  it('produces different hashes for different payloads', function () {
    const p1 = { product: 'Wheat', quantity: 500 };
    const p2 = { product: 'Rice', quantity: 500 };
    expect(sha256Bytes32(p1)).to.not.equal(sha256Bytes32(p2));
  });
});

// Helper to avoid strict timestamp matching in event args (use afterEach window)
async function latestTimestamp() {
  const block = await hre.ethers.provider.getBlock('latest');
  return block.timestamp;
}

