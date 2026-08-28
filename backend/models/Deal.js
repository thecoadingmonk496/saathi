const mongoose = require('mongoose');

const qualitySubmissionSchema = new mongoose.Schema({
  imageUrls: [{
    type: String, // Stored as Base64 data URLs
    required: true,
  }],
  aiStatus: {
    type: String,
    enum: ['PENDING', 'PASSED', 'FLAGGED'],
    default: 'PENDING',
  },
  aiFindings: {
    type: String,
  },
  humanStatus: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_REVIEW'],
    default: 'PENDING',
  },
  humanReviewerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  humanNotes: {
    type: String,
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
  reviewedAt: {
    type: Date,
  },
  verifiedAt: {
    type: Date,
  },
}, { _id: true }); // True to easily reference subdoc

const dealSchema = new mongoose.Schema(
  {
    buyerRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BuyerRequest',
      required: true,
    },
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    farmerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    farmerOfferId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FarmerOffer',
      required: true,
    },
    crop: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    agreedPrice: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: [
        'ACCEPTED',
        'PHOTO_PENDING',
        'AI_REVIEW',
        'AI_FLAGGED',
        'AI_PASSED',
        'HUMAN_REVIEW',
        'VERIFIED',
        'COMPLETED',
        'DISPUTED',
        'CANCELLED'
      ],
      default: 'ACCEPTED',
    },
    qualitySubmissions: [qualitySubmissionSchema],
    transactionReceiptUrl: {
      type: String, // Base64 data URL
    },
    receiptUploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Deal', dealSchema);
