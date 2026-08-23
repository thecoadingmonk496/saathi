const mongoose = require('mongoose');

const buyerListingSchema = new mongoose.Schema(
  {
    buyer_name: {
      type: String,
      required: true,
      trim: true
    },
    buyer_type: {
      type: String,
      required: true,
      trim: true
    },
    commodity: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },
    variety: {
      type: String,
      default: '',
      trim: true
    },
    offered_price: {
      type: Number,
      required: true
    },
    quantity_required: {
      type: String,
      required: true,
      trim: true
    },
    market: {
      type: String,
      required: true,
      trim: true
    },
    district: {
      type: String,
      required: true,
      trim: true
    },
    state: {
      type: String,
      required: true,
      trim: true
    },
    contact_note: {
      type: String,
      default: 'Contact via SAATHI messaging',
      trim: true
    },
    is_demo: {
      type: Boolean,
      default: true
    },
    created_at: {
      type: Date,
      default: Date.now
    }
  }
);

// Index for fast filters and retrieval (most recent first)
buyerListingSchema.index({ commodity: 1, state: 1, district: 1, created_at: -1 });

module.exports = mongoose.model('BuyerListing', buyerListingSchema);
