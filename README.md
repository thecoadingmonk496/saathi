# SAATHI

**Aapki Aawaz, Aapka Bazaar**

**Live Website:** [https://saathi-umber.vercel.app/](https://saathi-umber.vercel.app/)

SAATHI is a farmer-focused marketplace and information platform. It brings market prices, buyer discovery, crop journey information, government support, location services, and voice assistance together in one responsive web application. The platform now includes a full-stack backend with MongoDB Atlas, JWT authentication, a real registration and login system, and a dedicated admin panel.

---

## Project Overview

The application is designed to help farmers make faster, better-informed decisions about where to sell their crops and how to understand the market around them. Farmers can sign in with a mobile number, explore the dashboard, compare crop prices, find nearby buyers, and follow a crop through the agricultural supply chain.

The interface uses a shared agricultural field background, clear card-based information sections, responsive navigation, multilingual labels, and high-contrast controls designed for repeated use on desktop and mobile devices.

---

## Features

- **Dashboard:** Provides quick access to buyer discovery, market prices, market exploration, and government support.
- **Market Prices:** Search crops, switch between wholesale, retail, mandi, and MSP views, inspect current prices, compare price ranges, view seven-day trends, and see nearby mandis.
- **Market Explorer:** Search for a crop and view its complete journey from farmer to mandi, wholesaler, distributor, retailer, and consumer. The page also displays price progression, transport information, and nearby buyers.
- **Buyer Discovery:** Search and filter buyers by crop, buyer type, distance, match score, price, and quantity. Farmers can view buyer details, contact buyers, open directions, and use the map view.
- **Location services:** Detect a device location when permission is available, display the current region, refresh location data, or enter a location manually.
- **Voice assistance:** Open the Ask SAATHI assistant from supported pages for a voice-oriented interaction.
- **Multilingual interface:** Supports English, Hindi, Marathi, Punjabi, Bengali, Telugu, Tamil, Gujarati, Kannada, Malayalam, Odia, and Assamese through the translation utilities.
- **Authentication flow:** Real registration and login backed by MongoDB Atlas, bcrypt password hashing, and JWT tokens. Includes OTP-based mobile login, onboarding, and protected application routes.
- **Admin Panel:** A dedicated, credential-protected admin interface accessible only via `/admin-login`. Allows listing all registered users and permanently deleting any user record from MongoDB.
- **Responsive design:** Adapts navigation, cards, tables, filters, and supply-chain views for smaller screens.
- **Vercel serverless deployment:** Unified `api/index.js` Express entrypoint, connection caching for cold starts, and security headers via `vercel.json`.

---

## Technology Used

### Frontend
- **React 18** - Component-based user interface and page composition.
- **Vite** - Fast development server and production bundler.
- **React Router** - Client-side routing and protected page navigation.
- **Tailwind CSS** - Responsive styling, layout utilities, color systems, spacing, and states.
- **Heroicons** - Interface icons used throughout navigation and dashboard controls.

### Backend
- **Node.js and Express** - REST API server handling authentication, OTP, and admin operations.
- **MongoDB Atlas** - Cloud-hosted database storing user accounts and records.
- **Mongoose** - Schema definition, validation, and ODM for MongoDB.
- **bcryptjs** - Password hashing with salt rounds for secure credential storage.
- **jsonwebtoken (JWT)** - Stateless token-based authentication for users and the admin panel.
- **dotenv** - Environment variable management for secrets and configuration.

### Deployment
- **Vercel Functions** - Serverless API via `api/index.js`, routing all `/api/*` requests.
- **pnpm / npm** - Dependency installation and project scripts.

---

## Backend Architecture

### Entry Points

| File | Purpose |
|---|---|
| `api/index.js` | **Vercel serverless entrypoint.** Express app exported as a module, used in production on Vercel. Connects to MongoDB per request with caching. |
| `backend/server.js` | **Local development server.** Starts a traditional Express listener on `PORT` (default `5001`). |

### Folder Structure

```
backend/
+-- config/
¦   +-- db.js                  # MongoDB Atlas connection with serverless caching
+-- controllers/
¦   +-- authController.js      # Register, Login, Send OTP, Verify OTP
¦   +-- adminController.js     # Admin login, list users, delete user
+-- middleware/
¦   +-- blockchainAuth.js      # JWT verification middleware
+-- models/
¦   +-- User.js                # Mongoose user schema
¦   +-- VerificationRecord.js  # Blockchain verification records
+-- routes/
¦   +-- auth.js                # /api/auth/* routes
¦   +-- admin.js               # /api/admin/* routes (protected)
¦   +-- blockchain.js          # /api/blockchain/* routes
+-- services/                  # Business logic services
+-- .env                       # Local secrets (not committed)
+-- .env.example               # Environment variable template
+-- server.js                  # Local Express listener
api/
+-- index.js                   # Vercel serverless Express entrypoint
```

---

## API Reference

### Auth Routes - `/api/auth`

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register a new user | No |
| `POST` | `/api/auth/login` | Login with email and password | No |
| `POST` | `/api/auth/send-otp` | Send OTP to a registered mobile number | No |
| `POST` | `/api/auth/verify-otp` | Verify OTP and receive a JWT | No |

#### `POST /api/auth/register`
**Body:**
```json
{
  "firstName": "Aryan",
  "lastName": "Singh",
  "email": "aryan@example.com",
  "phone": "9876543210",
  "password": "mypassword"
}
```
**Response (201):**
```json
{
  "message": "User registered successfully",
  "token": "<JWT>",
  "user": { "id": "...", "firstName": "Aryan", "lastName": "Singh", "email": "...", "phone": "..." }
}
```
**Validations:**
- All five fields are required.
- Password must be at least 6 characters.
- Email and phone must be unique (returns specific error messages for duplicates).

#### `POST /api/auth/login`
**Body:**
```json
{ "email": "aryan@example.com", "password": "mypassword" }
```
**Response (200):** Returns JWT token and user object.

#### `POST /api/auth/send-otp`
**Body:** `{ "mobileNumber": "9876543210" }`
Verifies the number is registered. In development, OTP is always `123456`.

#### `POST /api/auth/verify-otp`
**Body:** `{ "mobileNumber": "9876543210", "otp": "123456" }`
Returns JWT token on success. OTP expires after 5 minutes.

---

### Admin Routes - `/api/admin`

> **Access is restricted to the dedicated admin credential only. Normal users cannot access these endpoints.**

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/admin/login` | Authenticate as admin | No |
| `GET` | `/api/admin/users` | Fetch all registered users | Admin JWT |
| `DELETE` | `/api/admin/users/:id` | Permanently delete a user by MongoDB ID | Admin JWT |

#### `POST /api/admin/login`
**Body:**
```json
{ "email": "ts7529614@gmail.com", "password": "Aryan@123" }
```
Returns an admin JWT token used to authorize subsequent admin requests.

#### `GET /api/admin/users` *(Protected)*
Returns an array of all users with `_id`, `firstName`, `lastName`, `email`, `phone`, and `createdAt`.

#### `DELETE /api/admin/users/:id` *(Protected)*
Permanently removes the user document from MongoDB by its `_id`.

---

## Database

**MongoDB Atlas** is used as the cloud database.

### User Schema (`backend/models/User.js`)

| Field | Type | Constraints |
|---|---|---|
| `firstName` | String | Required, trimmed |
| `lastName` | String | Required, trimmed |
| `email` | String | Required, unique, lowercase |
| `phone` | String | Required, unique |
| `password` | String | Required, bcrypt hashed, min 6 chars |
| `createdAt` | Date | Auto-generated (timestamps) |
| `updatedAt` | Date | Auto-generated (timestamps) |

### Serverless Connection Caching

`backend/config/db.js` caches the Mongoose connection across Vercel cold starts to prevent creating a new connection on every function invocation.

---

## Admin Panel

The admin panel is a separate, protected section of the frontend.

- **Login URL:** `/admin-login`
- **Panel URL:** `/admin` (redirected to after login)
- **Admin Email:** `ts7529614@gmail.com`
- **Admin Password:** `Aryan@123`
- **Capabilities:**
  - View a table of all registered users (name, email, phone, registration date).
  - Delete any user - this permanently removes their record from MongoDB Atlas.
- **Security:** The panel uses a separate admin JWT token. No regular user session grants access. The routes are not linked anywhere in the main app navigation.

---

## Environment Variables

Create a `.env` file inside the `backend/` folder for local development (see `backend/.env.example`):

```env
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/<dbname>?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_key
ADMIN_EMAIL=ts7529614@gmail.com
ADMIN_PASSWORD=Aryan@123
PORT=5001
```

For **Vercel production**, add the same variables in **Vercel Dashboard -> Project -> Settings -> Environment Variables**.

> Never commit `.env` to Git. It is listed in `.gitignore`.

---

## Application Structure

- `src/App.jsx` - Router, public routes, protected routes, shared providers. Includes `/admin-login` and `/admin` routes.
- `src/components/` - Reusable UI: layout, top navigation, dashboard hero, location panel, language popup, footer, voice modal.
- `src/pages/` - Route-level pages: dashboard, buyer discovery, market explorer, market prices, government support, login, register, onboarding, notifications, profile, AdminLogin, Admin.
- `src/context/` - User and location state shared across the application.
- `src/hooks/useTranslation.js` and `src/utils/translations.js` - Translation system.
- `src/utils/mockData.js` - Demo crops, prices, mandis, buyers, and supply-chain data.
- `src/api/marketService.js` - Market data access layer.

### Routes

**Public routes:**

| Path | Page |
|---|---|
| `/login` | Mobile OTP login |
| `/register` | New account registration |
| `/onboarding` | First-time onboarding |
| `/admin-login` | Admin panel login |

**Protected app routes (requires user JWT):**

| Path | Page |
|---|---|
| `/` or `/dashboard` | Dashboard |
| `/explorer` | Market Explorer |
| `/prices` | Market Prices |
| `/buyers` | Buyer Discovery |
| `/government` | Government Support |
| `/profile` | User Profile |
| `/notifications` | Notifications |
| `/admin` | Admin Panel (Admin JWT required) |

---

## Setup & Run Instructions

### 1. Requirements

- Node.js 18 or newer
- pnpm or npm
- Git, if you are cloning the repository
- A MongoDB Atlas account with a cluster

### 2. Clone the repository

```bash
git clone https://github.com/thecoadingmonk496/saathi.git
cd Saathi
```

### 3. Install frontend dependencies

```bash
pnpm install
```

Or using npm:

```bash
npm install
```

### 4. Install backend dependencies

```bash
cd backend
npm install
cd ..
```

### 5. Configure environment variables

```bash
# Copy the example file
cp backend/.env.example backend/.env
# Then edit backend/.env with your MongoDB URI, JWT secret, and admin credentials
```

### 6. Run the backend locally

```bash
cd backend
node server.js
```

The backend starts on `http://localhost:5001`.

### 7. Run the frontend locally

In a separate terminal, from the project root:

```bash
pnpm dev
```

Open `http://localhost:5173`.

### 8. Build and preview

```bash
pnpm build
pnpm preview
```

---

## Deployment

The project is deployed on **Vercel** with:

- **Framework preset:** Vite
- **Build command:** `pnpm build` or `npm run build`
- **Output directory:** `dist`
- **API functions:** `api/index.js` handles all `/api/*` serverless requests via Vercel Functions

### Vercel Configuration (`vercel.json`)

- All `/api/*` requests are routed to `api/index.js` (serverless Express).
- All other routes are rewritten to `index.html` for React Router SPA navigation.
- Security headers (CSP, X-Frame-Options, etc.) are applied globally.

### Deploy from CLI

```bash
pnpm install
pnpm build
npx vercel --prod
```

### Required Vercel Environment Variables

Set these in **Vercel Dashboard -> Project -> Settings -> Environment Variables**:

| Variable | Description |
|---|---|
| `MONGODB_URI` | Full MongoDB Atlas connection string |
| `JWT_SECRET` | Secret key for signing user JWTs |
| `ADMIN_EMAIL` | Admin panel login email |
| `ADMIN_PASSWORD` | Admin panel login password |

### MongoDB Atlas Network Access

To allow Vercel serverless functions to connect, add `0.0.0.0/0` (Allow from anywhere) to the **IP Access List** in MongoDB Atlas -> Network Access.

---

## Available Scripts

| Script | Description |
|---|---|
| `pnpm dev` | Starts the Vite frontend development server. |
| `pnpm build` | Builds the production frontend bundle in `dist/`. |
| `pnpm preview` | Serves the production build locally. |
| `node backend/server.js` | Starts the Express backend for local development. |

---

## Project Goal

SAATHI aims to make agricultural market information easier to access, understand, and act on. By combining price transparency, buyer access, location-aware information, government resources, voice interaction, a real authentication system, and an admin panel, the platform supports farmers throughout the selling and market discovery process.

---

## Blockchain Integration

### The Core Problem

In India's agricultural supply chain, a farmer sells wheat for Rs. 20/kg but the consumer buys it for Rs. 60/kg. Nobody knows where the money went, who handled the crop, or whether the buyer is genuine. There is zero transparency and zero trust.

**Blockchain is SAATHI's answer to that trust problem.**

---

### Why We Use Blockchain

| Problem in Agriculture | How Blockchain Solves It |
|---|---|
| Farmers do not know if a buyer is genuine | Buyer identity is verified on-chain — permanent, unfakeable proof |
| Supply chain data can be faked or tampered | Every stage (farm to mandi to distributor to retailer) is recorded on blockchain — immutable |
| Price manipulation is invisible | Any price record written on-chain cannot be changed retroactively |
| No accountability if something goes wrong | Every record has a transaction hash — traceable on public blockchain forever |

---

### What We Record on Blockchain

#### 1. Supply Chain Tracking

When a crop moves from one stage to another (Farmer to Mandi to Wholesaler to Distributor to Retailer), we record:

- Product name (e.g., Wheat)
- Stage (e.g., Mandi, Retailer)
- Data hash — a SHA-256 fingerprint of the full data
- Timestamp — when the event occurred
- Verifier address — who recorded it

If anyone tampers with the data later, the hash will not match the on-chain record — fraud is instantly detectable.

#### 2. Buyer Verification

Before a farmer connects with a buyer on SAATHI, that buyer's identity is written to blockchain:

- Buyer ID and type (trader, exporter, retailer)
- Verification status (verified / pending / failed)
- On-chain timestamp

Farmers can trust the buyer is real — it is not just a self-reported profile.

---

### Technical Choices

| Question | Answer |
|---|---|
| Which blockchain? | Polygon Amoy (Ethereum-compatible testnet) |
| Why Polygon? | Low gas fees, fast transactions, eco-friendly, EVM-compatible |
| Why not Ethereum mainnet? | Too expensive for high-frequency supply chain writes |
| Smart contract language | Solidity — deployed as the SaathiVerification contract |
| Backend connection | ethers.js — signs transactions with a wallet private key |
| Where is data stored? | Full data in MongoDB (fast and cheap), only the hash goes on blockchain (proof of integrity) |
| Is it public? | Yes — any transaction hash can be verified on Polygonscan Amoy |

---

### Architecture

```
Farmer sells crop
       |
SAATHI Backend records supply chain event
       |
       |---> Full data saved in MongoDB (fast access)
       |---> SHA-256 Hash of data written to Polygon Blockchain
                    |
              Transaction Hash returned
                    |
       Anyone can verify: was this data tampered?
       Compare live hash vs on-chain hash
```

---

### Blockchain API Endpoints

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| POST | /api/blockchain/supply-chain | Record a supply chain event on-chain | Service Key |
| POST | /api/blockchain/verify-buyer | Verify a buyer on-chain | Service Key |
| GET | /api/blockchain/supply-chain/:recordId | Read a supply chain record from chain | No |
| GET | /api/blockchain/supply-chain/:recordId/verify | Compare on-chain vs off-chain data | No |
| GET | /api/blockchain/buyer/:buyerId | Read buyer verification from chain | No |
| GET | /api/blockchain/stats | Get overall blockchain stats | No |

Write endpoints require the `x-blockchain-service-key` header with your `BLOCKCHAIN_SERVICE_KEY` value.

---

### Additional Environment Variables for Blockchain

Add these to `backend/.env` and to Vercel Environment Variables to activate blockchain features:

```env
POLYGON_AMOY_RPC_URL=https://rpc-amoy.polygon.technology/
BLOCKCHAIN_PRIVATE_KEY=your_wallet_private_key
SAATHI_CONTRACT_ADDRESS=0xYourDeployedContractAddress
BLOCKCHAIN_SERVICE_KEY=your_internal_api_secret_key
```

> If these variables are not set, the blockchain service operates in **pending mode** — all API calls return gracefully without crashing, and the rest of the application works normally. Full activation requires deploying the Solidity contract to Polygon Amoy and setting the environment variables above.

---

### One-Line Summary

SAATHI uses Polygon blockchain to create an immutable, transparent record of every supply chain transaction and buyer verification — so that for the first time, a farmer can cryptographically prove where their crop went and trust who they are selling to.
