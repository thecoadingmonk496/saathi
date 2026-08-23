const mongoose = require('mongoose');

const mandiPriceCacheSchema = new mongoose.Schema({
  state: { type: String, required: true },
  district: { type: String, required: true },
  market: { type: String, required: true },
  commodity: { type: String, required: true },
  variety: { type: String, required: true },
  grade: { type: String, required: true },
  arrival_date: { type: String, required: true }, // "DD/MM/YYYY"
  min_price: { type: Number, required: true },
  max_price: { type: Number, required: true },
  modal_price: { type: Number, required: true },
  fetched_at: { type: Date, required: true, default: Date.now }
});

// Index for fast lookups matching frontend queries
mandiPriceCacheSchema.index({ state: 1, district: 1, commodity: 1 });

// TTL index to automatically delete records older than 30 days (30 * 24 * 60 * 60 seconds)
mandiPriceCacheSchema.index({ fetched_at: 1 }, { expireAfterSeconds: 2592000 });

module.exports = mongoose.model('MandiPriceCache', mandiPriceCacheSchema);
