/**
 * HACKATHON DEMO & TRANSPARENCY NOTE:
 * The buyer listings generated and seeded by this script represent simulated/placeholder data
 * that mirrors SAATHI's production data model. In the final release, real retailers, wholesalers,
 * and exporters will register via a self-serve onboarding flow and post their own live listings.
 * 
 * For the demo, this script pulls active markets and commodity prices dynamically from the 
 * government mandi dataset (mandiService) to populate a realistic, internally consistent market.
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

async function seedBuyerListings() {
  try {
    const existingCount = await BuyerListing.countDocuments({ is_demo: true });
    if (existingCount > 0) {
      console.log('[SeedBuyers] Demo buyer listings already seeded.');
      return;
    }

    console.log('[SeedBuyers] Seeding dynamic demo buyer listings...');
    await BuyerListing.deleteMany({ is_demo: true });

    // Fetch dynamic prices to use as real markets and price references
    const mandiPrices = await mandiService.getMandiPrices({ limit: 100 });
    if (!mandiPrices || mandiPrices.length === 0) {
      console.log('[SeedBuyers] No mandi prices fetched, skipping seeding.');
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
  } catch (err) {
    console.error('[SeedBuyers] Error seeding buyer listings:', err.message);
  }
}

module.exports = { seedBuyerListings };
