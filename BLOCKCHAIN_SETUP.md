# SAATHI — Blockchain Setup Guide

A complete guide to the blockchain trust-and-verification layer added to the SAATHI agricultural platform.

---

## 1. Architecture

```
React Frontend (Vite)
       │
       ▼
Node.js / Express Backend  ← MONGODB_URI, JWT_SECRET, BLOCKCHAIN_*
       │
       ├─────────────────────────────────┐
       ▼                                 ▼
   MongoDB Atlas                  Polygon Amoy (testnet)
   (primary database)             (verification layer)
       │                                 │
       │                        SaathiVerification.sol
       │                                 │
       └─────────────────┬───────────────┘
                         │
                Blockchain TX Hash
                stored in MongoDB
```

**Design principle:**
MongoDB is the source of truth for all application data. Polygon stores only
cryptographic _proofs_ (hashes + timestamps) confirming that a supply-chain
event or buyer verification happened and has not been tampered with.

---

## 2. Why Polygon Amoy?

| Reason | Detail |
|---|---|
| **EVM compatible** | Uses the same Solidity / ethers.js toolchain as Ethereum mainnet |
| **Low cost** | Testnet MATIC is free from faucets — zero real money involved |
| **Fast finality** | Blocks every ~2 seconds on Amoy |
| **Public explorer** | Transactions visible on https://www.oklink.com/amoy |
| **Production ready** | Polygon PoS mainnet uses the same contract once prototype is validated |

---

## 3. Smart Contract Purpose

**File:** `blockchain/contracts/SaathiVerification.sol`
**Contract:** `SaathiVerification` (inherits OpenZeppelin `Ownable`)

The contract stores two types of verification records:

### A. Supply-chain record
Proves that a farm-to-market journey step was recorded at a specific time.

```solidity
struct SupplyChainRecord {
    bytes32 dataHash;   // SHA-256 of the canonical MongoDB payload
    string  product;    // e.g. "Wheat"
    string  stage;      // e.g. "Farmer to Wholesaler"
    uint256 timestamp;  // block.timestamp at recording
    address verifier;   // backend wallet address
}
```

### B. Buyer verification record
Proves that a buyer was verified by the SAATHI field team.

```solidity
struct BuyerVerification {
    bytes32 dataHash;   // SHA-256 of buyerId + buyerType + source
    string  buyerType;  // e.g. "Wholesaler"
    bool    verified;   // always true when set
    uint256 timestamp;
    address verifier;
}
```

Only the **contract owner** (the backend deployment wallet) can write records.
Anyone can read them.

---

## 4. Installing Dependencies

### Prerequisites
- Node.js >= 18
- npm (or pnpm)
- A Polygon Amoy RPC URL (e.g., from Alchemy or Infura)
- A wallet private key with testnet MATIC

### Install all workspaces (from project root)

```bash
npm install
```

### Install blockchain sub-package

```bash
cd blockchain
npm install
```

### Install backend

```bash
cd backend
npm install
```

---

## 5. Compiling the Contract

```bash
cd blockchain
npx hardhat compile
```

Expected output:
```
Compiled 1 Solidity file successfully (evm target: paris).
```

The compiled artifacts land in `blockchain/artifacts/`.

---

## 6. Deploying the Contract

### Step 1 — Fund the deployer wallet

Get free testnet MATIC from the Polygon Amoy faucet:
https://faucet.polygon.technology/

### Step 2 — Set environment variables

```bash
cd backend
cp .env.example .env
# Edit .env — add real values for POLYGON_AMOY_RPC_URL and BLOCKCHAIN_PRIVATE_KEY
```

### Step 3 — Deploy

```bash
cd blockchain
npx hardhat run scripts/deploy.js --network amoy
```

Expected output:
```
Deploying with: 0xYourWalletAddress
SaathiVerification deployed to: 0xNewContractAddress
```

### Step 4 — Save the contract address

Add it to `backend/.env`:
```
SAATHI_CONTRACT_ADDRESS=0xNewContractAddress
```

---

## 7. Configuring Environment Variables

### `backend/.env` (server-side only — NEVER commit)

```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/saathi
JWT_SECRET=a_long_random_string_min_32_chars
PORT=5001
BLOCKCHAIN_SERVICE_KEY=another_long_random_secret_for_write_api
POLYGON_AMOY_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/YOUR_KEY
BLOCKCHAIN_PRIVATE_KEY=0xYOUR_PRIVATE_KEY
SAATHI_CONTRACT_ADDRESS=0xDEPLOYED_CONTRACT_ADDRESS
```

> IMPORTANT: BLOCKCHAIN_PRIVATE_KEY must NEVER be prefixed with VITE_ and must
> NEVER appear in the frontend build or Vercel frontend environment variables.

### Frontend (Vite) — no secrets here

In `.env.local` for local dev only:
```env
VITE_API_BASE_URL=http://localhost:5001
```

For production on Vercel, set `VITE_API_BASE_URL` to your backend host URL.

---

## 8. Running Locally

### Start backend

```bash
cd backend
npm run dev       # nodemon server.js — listens on port 5001
```

### Start frontend (separate terminal from project root)

```bash
npm run dev       # vite — listens on port 5173
```

The frontend calls `http://localhost:5001/api/*` automatically in dev mode.

---

## 9. Running Tests

### Smart contract tests

```bash
cd blockchain
npx hardhat test
```

Tests cover:
- Supply-chain event recording and reading
- Buyer verification recording and reading
- Unauthorized write rejection (non-owner)
- Duplicate record prevention
- Hash generation utility

### Frontend build test

```bash
# from project root
npm run build
```

Build must complete with exit code 0.

---

## 10. Frontend to Backend Connection

The frontend never talks to the blockchain directly.

```
src/api/blockchainService.js
  ↓  HTTP GET (no authentication needed for reads)
/api/blockchain/supply-chain/:recordId   — MongoDB + Polygon read
/api/blockchain/buyer/:buyerId           — MongoDB + Polygon read
/api/blockchain/stats                    — MongoDB count aggregation

  ↓  HTTP POST (requires x-blockchain-service-key header)
/api/blockchain/supply-chain             — record supply-chain event
/api/blockchain/verify-buyer             — verify a buyer
```

---

## 11. How MongoDB and Blockchain Work Together

Every time a supply-chain event is recorded:

1. Canonical payload built (sorted-key JSON: product, farmerId, stage, etc.)
2. SHA-256 hash of payload computed (`services/canonicalHash.js`)
3. Hash submitted to Polygon Amoy as `bytes32` via `recordSupplyChain()`
4. MongoDB document saved with full payload + transactionHash + blockNumber

Verification flow:
```
GET /api/blockchain/supply-chain/:recordId/verify
  ↓
Fetch MongoDB document → recompute hash → fetch on-chain hash → compare
  ↓
MATCH   → { verified: true }
MISMATCH → { verified: false, message: "Data tampered" }
```

---

## 12. Verifying a Transaction on the Explorer

Copy the `transactionHash` from an API response and check it at:

- https://amoy.polygonscan.com/tx/0xYOUR_TX_HASH
- https://www.oklink.com/amoy/tx/0xYOUR_TX_HASH

You will see the `SupplyChainRecorded` or `BuyerVerified` event logs with the
data hash, product, stage, and timestamp.

---

## 13. Deploying to Vercel

The React frontend is deployed to Vercel as a Vite static site.
The backend runs separately (Railway, Render, Fly.io, etc.).

### Vercel — frontend environment variable

In Vercel → Project Settings → Environment Variables:

| Variable | Value |
|---|---|
| `VITE_API_BASE_URL` | `https://your-backend.railway.app` |

### Backend host environment variables

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Random secret, min 32 chars |
| `PORT` | Usually auto-set by host |
| `BLOCKCHAIN_SERVICE_KEY` | Internal API key for write endpoints |
| `POLYGON_AMOY_RPC_URL` | Alchemy / Infura Amoy endpoint |
| `BLOCKCHAIN_PRIVATE_KEY` | Deployer wallet private key |
| `SAATHI_CONTRACT_ADDRESS` | Deployed contract address |

DO NOT add BLOCKCHAIN_PRIVATE_KEY or MONGODB_URI to Vercel.

---

## 14. Security Considerations

| Rule | Implementation |
|---|---|
| Private key server-side only | BLOCKCHAIN_PRIVATE_KEY in backend .env, never in Vite |
| Secrets never committed | Root .gitignore covers .env* |
| Write endpoints protected | requireBlockchainWriter middleware checks x-blockchain-service-key header |
| No personal data on-chain | Only hashes + product type stored on Polygon |
| Input validation | Controller validates all required fields before hashing |
| Duplicate prevention | Contract reverts if a recordId or buyerId already exists |
| Graceful degradation | If Polygon is down, MongoDB save still succeeds; UI shows "Verification Pending" |
| No real money | Polygon Amoy testnet only; no payments or NFTs |

---

## 15. Hackathon Demo Flow

1. Open Dashboard — see "Blockchain Transparency" section
   - Live counts from MongoDB (supply-chain events + verified buyers)
   - Shows "No blockchain records yet" if nothing recorded yet

2. Open Market Explorer — select any crop — scroll down
   - "View Blockchain Verification" button
   - Status badge: Verified / Pending / No record

3. Open Buyer Discovery — select any buyer
   - "Blockchain Verified" badge
   - "View Verification" expandable panel with TX hash and data hash

4. Record a supply-chain event via API call:

```bash
curl -X POST http://localhost:5001/api/blockchain/supply-chain \
  -H "Content-Type: application/json" \
  -H "x-blockchain-service-key: YOUR_BLOCKCHAIN_SERVICE_KEY" \
  -d "{\"product\":\"Wheat\",\"farmerId\":\"F102\",\"quantity\":500,\"price\":2500,\"stage\":\"Farmer to Wholesaler\"}"
```

5. Copy the transactionHash from the response and verify it on:
   https://amoy.polygonscan.com

---

*SAATHI Blockchain Layer — agricultural supply-chain transparency on Polygon Amoy*
