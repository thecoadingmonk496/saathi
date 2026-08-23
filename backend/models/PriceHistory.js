const mongoose = require('mongoose');

const priceHistorySchema = new mongoose.Schema(
  {
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
    modal_price: {
      type: Number,
      required: true
    },
    arrival_date: {
      type: String,
      required: true
    },
    recorded_at: {
      type: Date,
      default: Date.now
    }
  }
);

// Index for fast lookups by commodity, region, and sorted date
priceHistorySchema.index({ commodity: 1, district: 1, state: 1, recorded_at: -1 });

// Unique compound index to prevent duplicate entries for the same daily arrival date
priceHistorySchema.index(
  { commodity: 1, variety: 1, market: 1, district: 1, state: 1, arrival_date: 1 },
  { unique: true }
);

module.exports = mongoose.model('PriceHistory', priceHistorySchema);
