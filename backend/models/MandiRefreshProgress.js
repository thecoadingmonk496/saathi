const mongoose = require('mongoose');

const mandiRefreshProgressSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true },
  lastOffset: { type: Number, default: 0 },
  totalRecords: { type: Number, default: 0 },
  status: { type: String, enum: ['IN_PROGRESS', 'COMPLETED', 'FAILED'], default: 'IN_PROGRESS' },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MandiRefreshProgress', mandiRefreshProgressSchema);
