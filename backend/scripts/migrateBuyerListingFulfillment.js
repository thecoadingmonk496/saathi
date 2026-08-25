require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const BuyerListing = require('../models/BuyerListing');
const PurchaseOrder = require('../models/PurchaseOrder');

async function migrate() {
  console.log('--- STARTING BUYER LISTING FULFILLMENT MIGRATION ---');

  try {
    await connectDB();
    console.log('Connected to MongoDB via connectDB');

    const listings = await BuyerListing.find({});
    console.log(`Found ${listings.length} total listings.`);

    let updated = 0;
    let anomalies = 0;

    for (const listing of listings) {
      // Parse requested quantity
      const qtyMatch = listing.quantity_required.match(/\d+/);
      const requestedQuantity = qtyMatch ? parseInt(qtyMatch[0], 10) : Number.MAX_SAFE_INTEGER;

      // Aggregate accepted orders
      const acceptedOrders = await PurchaseOrder.find({
        listingId: listing._id,
        status: 'ACCEPTED'
      });

      const acceptedQuantity = acceptedOrders.reduce((sum, o) => sum + o.quantity, 0);

      // Report anomaly if over-fulfilled
      if (acceptedQuantity > requestedQuantity) {
        console.warn(`[ANOMALY] Listing ${listing._id} (${listing.quantity_required}) is over-fulfilled: ${acceptedQuantity} ACCEPTED!`);
        anomalies++;
      }

      // Update safely
      listing.fulfilledQuantity = acceptedQuantity;
      await listing.save();
      updated++;
    }

    console.log(`--- MIGRATION COMPLETE ---`);
    console.log(`Listings Updated: ${updated}`);
    console.log(`Over-fulfilled Anomalies Detected: ${anomalies}`);
    
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    mongoose.connection.close();
    process.exit(1);
  }
}

migrate();
