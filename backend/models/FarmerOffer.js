const mongoose = require('mongoose');

const farmerOfferSchema = new mongoose.Schema(
  {
    buyerRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BuyerRequest',
      required: true,
    },
    farmerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    counterOfferPrice: {
      type: Number,
      min: 0,
    },
    message: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'IGNORED', 'EXPIRED', 'COUNTERED_BY_BUYER', 'COUNTERED_BY_FARMER'],
      default: 'PENDING',
    },
    negotiationHistory: [
      {
        price: Number,
        message: String,
        byRole: { type: String, enum: ['BUYER', 'FARMER'] },
        date: { type: Date, default: Date.now }
      }
    ],
    respondedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FarmerOffer', farmerOfferSchema);