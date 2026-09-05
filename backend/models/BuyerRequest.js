const mongoose = require('mongoose');

const buyerRequestSchema = new mongoose.Schema(
  {
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    crop: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unit: {
      type: String,
      required: true,
      default: 'quintals',
    },
    offeredPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    cropImage: { type: String, trim: true },
    location: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['PENDING_REVIEW', 'APPROVED', 'REJECTED', 'PUBLISHED', 'CLOSED', 'REMOVED'],
      default: 'PENDING_REVIEW',
    },
    publishedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
    },
    adminRemarks: {
      type: String,
      default: '',
      trim: true,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewedBy: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BuyerRequest', buyerRequestSchema);
