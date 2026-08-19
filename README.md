# SAATHI

**Aapki Aawaz, Aapka Bazaar**

**Live Website:** [https://saathi-umber.vercel.app/](https://saathi-umber.vercel.app/)

SAATHI is a farmer-focused marketplace and information platform. It brings market prices, buyer discovery, crop journey information, government support, location services, and voice assistance together in one responsive web application.

## Project Overview

The application is designed to help farmers make faster, better-informed decisions about where to sell their crops and how to understand the market around them. Farmers can sign in with a mobile number, explore the dashboard, compare crop prices, find nearby buyers, and follow a crop through the agricultural supply chain.

The interface uses a shared agricultural field background, clear card-based information sections, responsive navigation, multilingual labels, and high-contrast controls designed for repeated use on desktop and mobile devices.

## Features

- **Dashboard:** Provides quick access to buyer discovery, market prices, market exploration, and government support.
- **Market Prices:** Search crops, switch between wholesale, retail, mandi, and MSP views, inspect current prices, compare price ranges, view seven-day trends, and see nearby mandis.
- **Market Explorer:** Search for a crop and view its complete journey from farmer to mandi, wholesaler, distributor, retailer, and consumer. The page also displays price progression, transport information, and nearby buyers.
- **Buyer Discovery:** Search and filter buyers by crop, buyer type, distance, match score, price, and quantity. Farmers can view buyer details, contact buyers, open directions, and use the map view.
- **Location services:** Detect a device location when permission is available, display the current region, refresh location data, or enter a location manually.
- **Voice assistance:** Open the Ask SAATHI assistant from supported pages for a voice-oriented interaction.
- **Multilingual interface:** Supports English, Hindi, Marathi, Punjabi, Bengali, Telugu, Tamil, Gujarati, Kannada, Malayalam, Odia, and Assamese through the translation utilities.
- **Authentication flow:** Includes mobile-number login, registration, onboarding, OTP verification, and protected application routes.
- **Responsive design:** Adapts navigation, cards, tables, filters, and supply-chain views for smaller screens.
- **Vercel deployment:** Configured for Vite builds, React Router refreshes, serverless API functions, and security headers.

## Technology Used

- **React 18:** Component-based user interface and page composition.
- **Vite:** Fast development server and production bundler.
- **React Router:** Client-side routing and protected page navigation.
- **Tailwind CSS:** Responsive styling, layout utilities, color systems, spacing, and states.
- **Heroicons:** Interface icons used throughout navigation and dashboard controls.
- **Node.js and Express:** Local server support and project runtime utilities.
- **Vercel Functions:** Serverless endpoints for the demo OTP flow.
- **pnpm:** Dependency installation and project scripts. `npm` can also be used when required by deployment settings.

## Implementation

### Application structure

- `src/App.jsx` defines the router, public routes, protected routes, and shared providers.
- `src/components/` contains reusable UI such as the layout, top navigation, dashboard hero, location panel, language popup, footer, and voice modal.
- `src/pages/` contains route-level experiences including the dashboard, buyer discovery, market explorer, market prices, government support, login, registration, onboarding, notifications, and profile pages.
- `src/context/` stores user and location state shared across the application.
- `src/hooks/useTranslation.js` and `src/utils/translations.js` provide the translation system.
- `src/utils/mockData.js` provides the demo crops, prices, mandis, buyers, and supply-chain data.
- `src/api/marketService.js` provides the market data access layer and calculates price ranges, trends, nearby mandis, and distances.
- `api/` contains Vercel serverless functions for sending and verifying the demo OTP.

### Routing and protected pages

Public routes include `/login`, `/register`, and `/onboarding`. Application routes are wrapped by the user context and protected so unauthenticated users are redirected to login. Main application routes include:

- `/` and `/dashboard`
- `/explorer`
- `/prices`
- `/buyers`
- `/government`
- `/profile`
- `/notifications`

`vercel.json` rewrites client-side routes to `index.html`, allowing React Router to handle direct navigation and page refreshes in production.

### Data and demo behavior

The current application uses local mock data for market and buyer experiences. The OTP endpoints are also configured as a development/demo flow:

- Use a valid ten-digit Indian mobile number.
- Use OTP `123456` for verification.

The market service derives price ranges and trend values from the mock price history, while location-aware buyer and mandi results use the shared location context and distance calculations.

## Setup & Run Instructions

### 1. Requirements

- Node.js 18 or newer
- pnpm or npm
- Git, if you are cloning the repository

### 2. Clone the repository

```bash
git clone https://github.com/thecoadingmonk496/saathi.git
cd Saathi
```

### 3. Install dependencies

Using pnpm:

```bash
pnpm install
```

Or using npm:

```bash
npm install
```

### 4. Run the project locally

Using pnpm:

```bash
pnpm dev
```

Or using npm:

```bash
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

### 5. Build and preview locally

Create a production build:

```bash
pnpm build
```

Or:

```bash
npm run build
```

Preview the production build locally:

```bash
pnpm preview
```

Or:

```bash
npm run preview
```

The demo login flow accepts a valid ten-digit Indian mobile number and OTP `123456`.

## Deployment

The project is configured for Vercel with:

- Framework preset: Vite
- Build command: `pnpm build` or `npm run build`
- Output directory: `dist`
- SPA rewrites and security headers in `vercel.json`

To deploy from the command line:

```bash
pnpm install
pnpm build
npx vercel --prod
```

For more detailed Vercel configuration and route checks, see [DEPLOYMENT.md](DEPLOYMENT.md).

## Available Scripts

| Script | Description |
| --- | --- |
| `pnpm dev` | Starts the Vite development server. |
| `pnpm build` | Builds the production bundle in `dist`. |
| `pnpm preview` | Serves the production build locally. |

## Project Goal

SAATHI aims to make agricultural market information easier to access, understand, and act on. By combining price transparency, buyer access, location-aware information, government resources, and voice interaction, the platform supports farmers throughout the selling and market discovery process.