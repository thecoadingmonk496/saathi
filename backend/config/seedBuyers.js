/**
* HACKATHON DEMO & TRANSPARENCY NOTE:
 * The buyer listings generated and seeded by this script represent simulated/placeholder data
 * that mirrors SAATHI's production data model. In the final release, real retailers, wholesalers,
 * and exporters will register via a self-serve onboarding flow and post their own live listings.
 *
 * For the demo, this script pulls active markets and commodity prices dynamically from the
 * government mandi dataset (mandiService) to populate a realistic, internally consistent market.
 *
 * In addition to the dynamic listings, a small deterministic set of Uttar Pradesh demo listings
 * (Paddy + Wheat) is always ensured so the popular-filter combos (Paddy / Uttar Pradesh /
 * Gautam Buddha Nagar, Wheat + Uttar Pradesh) return results in the Buyer Discovery UI.
 */

const mongoose = require('mongoose');
const BuyerListing = require('../models/BuyerListing');
const mandiService = require('../services/mandiService');

const fictionalBuyers = [
  { name: 'Annapurna Agri Solutions', type: 'Wholesaler', qty: '50 quintals' },
  { name: 'Bharat Foods & Grains', type: 'Processing Unit', qty: '100 quintals' },
  { name: 'Vedic Agro Processing', type: 'Processing Unit', qty: '10 tonnes/week' },
  { name: 'Kisan Mitra Mandi Suppliers', type: 'Wholesaler', qty: '40 quintals' },
  { name: 'Green Earth Exporters', type: 'Exporter', qty: '20 tonnes' },
  { name: 'Om Shakti Grain Traders', type: 'Wholesaler', qty: '60 quintals' },
  { name: 'Standard Agro Foods', type: 'Processing Unit', qty: '150 quintals' },
  { name: 'Jai Kisan Warehouse Corp', type: 'Wholesaler', qty: '80 quintals' },
  { name: 'Hindustan Seed & Pulses', type: 'Wholesaler', qty: '30 tonnes/month' },
  { name: 'Apex Food Industries', type: 'Processing Unit', qty: '12 tonnes/week' },
  { name: 'Pioneer Spices & Crops', type: 'Exporter', qty: '5 tonnes' },
  { name: 'Rajat Grain Merchants', type: 'Wholesaler', qty: '45 quintals' },
  { name: 'Swastik Organic Farms', type: 'Retailer', qty: '20 quintals' },
  { name: 'Tirupati Agro Trading', type: 'Wholesaler', qty: '120 quintals' },
  { name: 'Gauri Shankar Flour Mills', type: 'Processing Unit', qty: '25 tonnes/week' },
  { name: 'Sai Baba Veg Distributors', type: 'Wholesaler', qty: '35 quintals' },
  { name: 'Golden Harvest Processing', type: 'Processing Unit', qty: '8 tonnes/week' },
  { name: 'Balaji Fruits & Vegetables', type: 'Wholesaler', qty: '50 quintals' },
  { name: 'Kalyani Oils & Seeds', type: 'Processing Unit', qty: '15 tonnes' },
  { name: 'National Agro Exports', type: 'Exporter', qty: '30 tonnes' },
  { name: 'Patel & Sons Veg Supply', type: 'Retailer', qty: '15 quintals' },
  { name: 'Maratha Agro Mills', type: 'Processing Unit', qty: '18 tonnes' },
  { name: 'Saraswati Rice Traders', type: 'Wholesaler', qty: '75 quintals' },
  { name: 'Ganga Valley Food Export', type: 'Exporter', qty: '25 tonnes' },
  { name: 'Punjab Grain Suppliers', type: 'Wholesaler', qty: '90 quintals' }
];

// Deterministic Uttar Pradesh listings covering the popular filter combos shown in the app:
// - Paddy / Uttar Pradesh / Gautam Buddha Nagar
// - Wheat + Uttar Pradesh
// Prices reflect realistic north-India mandi ranges (₹/quintal).
const uttarPradeshListings = [
  {
    buyer_name: 'Annapurna Agri Solutions',
    buyer_type: 'Wholesaler',
    commodity: 'paddy',
    variety: 'Common',
    offered_price: 2180,
    quantity_required: '120 quintals',
    market: 'Jewar Mandi',
    district: 'Gautam Buddha Nagar',
    state: 'Uttar Pradesh'
  },
  {
    buyer_name: 'Kisan Mitra Mandi Suppliers',
    buyer_type: 'Wholesaler',
    commodity: 'paddy',
    variety: 'Common',
    offered_price: 2215,
    quantity_required: '80 quintals',
    market: 'Dadri Mandi',
    district: 'Gautam Buddha Nagar',
    state: 'Uttar Pradesh'
  },
  {
    buyer_name: 'Bharat Foods & Grains',
    buyer_type: 'Processing Unit',
    commodity: 'paddy',
    variety: 'Basmati',
    offered_price: 3420,
    quantity_required: '150 quintals',
    market: 'Bilaspur Mandi',
    district: 'Gautam Buddha Nagar',
    state: 'Uttar Pradesh'
  },
  {
    buyer_name: 'Gauri Shankar Flour Mills',
    buyer_type: 'Processing Unit',
    commodity: 'wheat',
    variety: 'Sharbati',
    offered_price: 2650,
    quantity_required: '200 quintals',
    market: 'Dadri Mandi',
    district: 'Gautam Buddha Nagar',
    state: 'Uttar Pradesh'
  },
  {
    buyer_name: 'Rajat Grain Merchants',
    buyer_type: 'Wholesaler',
    commodity: 'wheat',
    variety: 'Common',
    offered_price: 2450,
    quantity_required: '100 quintals',
    market: 'Hapur Mandi',
    district: 'Hapur',
    state: 'Uttar Pradesh'
  },
  {
    buyer_name: 'Om Shakti Grain Traders',
    buyer_type: 'Wholesaler',
    commodity: 'wheat',
    variety: 'Common',
    offered_price: 2485,
    quantity_required: '90 quintals',
    market: 'Mawana Mandi',
    district: 'Meerut',
    state: 'Uttar Pradesh'
  },
  {
    buyer_name: 'National Agro Exports',
    buyer_type: 'Exporter',
    commodity: 'wheat',
    variety: 'Sharbati',
    offered_price: 2720,
    quantity_required: '300 quintals',
    market: 'Modinagar Mandi',
    district: 'Ghaziabad',
    state: 'Uttar Pradesh'
  }
];

const User = require('../models/User');
const bcrypt = require('bcryptjs');

async function getDemoBuyerUser() {
  let buyer = await User.findOne({ email: 'demobuyer@saathi.com' });
  if (!buyer) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('demopass123', salt);
    buyer = await User.create({
      firstName: 'Demo',
      lastName: 'Buyer',
      phone: '0000000001',
      email: 'demobuyer@saathi.com',
      password: hashedPassword,
      role: 'BUYER',
      language: 'en'
    });
  }
  return buyer;
}

async function seedUttarPradeshListings(buyerId) {
  try {
    const existing = await BuyerListing.countDocuments({
      state: { $regex: '^Uttar Pradesh$', $options: 'i' },
      is_demo: true
    });

    if (existing > 0) {
      console.log('[SeedBuyers] Uttar Pradesh demo listings already present.');
      return;
    }

    const now = new Date();
    const payload = uttarPradeshListings.map((listing, i) => ({
      ...listing,
      buyerId,
      contact_note: 'Contact via SAATHI messaging',
      is_demo: true,
      created_at: new Date(now.getTime() - (i * 2 * 60 * 60 * 1000))
    }));

    await BuyerListing.insertMany(payload);
    console.log(
      `[SeedBuyers] Seeded ${payload.length} Uttar Pradesh demo buyer listings (Paddy + Wheat).`
    );
  } catch (err) {
    console.error('[SeedBuyers] Error seeding Uttar Pradesh listings:', err.message);
  }
}

async function seedBuyerListings() {
  try {
    const demoBuyer = await getDemoBuyerUser();
    const buyerId = demoBuyer._id;

    const force =
      process.env.FORCE_SEED === '1' || process.env.FORCE_SEED === 'true';

    const existingCount = await BuyerListing.countDocuments({ is_demo: true });
    if (existingCount > 0 && !force) {
      console.log('[SeedBuyers] Demo buyer listings already seeded.');
      await seedUttarPradeshListings(buyerId);
      return;
    }

    if (force) {
      console.log('[SeedBuyers] FORCE_SEED enabled — clearing existing demo listings...');
      await BuyerListing.deleteMany({ is_demo: true });
    }

    console.log('[SeedBuyers] Seeding dynamic demo buyer listings...');
    await BuyerListing.deleteMany({ is_demo: true });

    // Fetch dynamic prices to use as real markets and price references
    const mandiPrices = await mandiService.getMandiPrices({ limit: 100 });
    if (!mandiPrices || mandiPrices.length === 0) {
      console.log('[SeedBuyers] No mandi prices fetched, skipping dynamic seeding.');
      await seedUttarPradeshListings();
      return;
    }

    const seededListings = [];
    let buyerIndex = 0;

    for (const record of mandiPrices) {
      if (seededListings.length >= 25) break;

      const buyerTemplate = fictionalBuyers[buyerIndex % fictionalBuyers.length];
      buyerIndex++;

      // Offered price sits close to the real modal_price (+/- random delta)
      const offeredPrice = Math.round(record.modal_price * (0.95 + Math.random() * 0.1));

      seededListings.push({
        buyer_name: buyerTemplate.name,
        buyerId,
        buyer_type: buyerTemplate.type,
        commodity: record.commodity,
        variety: record.variety || 'Common',
        offered_price: offeredPrice,
        quantity_required: buyerTemplate.qty,
        market: record.market,
        district: record.district,
        state: record.state,
        contact_note: 'Contact via SAATHI messaging',
        is_demo: true,
        created_at: new Date(Date.now() - (seededListings.length * 2 * 60 * 60 * 1000))
      });
    }

    await BuyerListing.insertMany(seededListings);
    console.log(`[SeedBuyers] Seeded ${seededListings.length} demo buyer listings across dynamic markets.`);

    await seedUttarPradeshListings(buyerId);
  } catch (err) {
    console.error('[SeedBuyers] Error seeding buyer listings:', err.message);
  }
}

module.exports = { seedBuyerListings };