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
        'BANK_DETAILS_PENDING',
        'ESCROW_PENDING',
        'FARMER_PHOTOS_UPLOADED',
        'ADMIN_PRE_SHIPMENT_VERIFIED',
        'BUYER_DELIVERY_UPLOADED',
        'ADMIN_FINAL_APPROVED',
        'ADMIN_FINAL_REJECTED',
        'PHOTO_PENDING',
        'AI_REVIEW',
        'AI_FLAGGED',
        'AI_PASSED',
        'AGENT_PAYMENT_PENDING',
        'HUMAN_REVIEW',
        'VERIFIED',
        'UNVERIFIED',
        'RECEIPT_SUBMITTED',
        'COMPLETED',
        'CANCELLED',
        'DISPUTED',
      ],
      default: 'ACCEPTED',
    },
    escrowStatus: {
      type: String,
      enum: ['PENDING', 'FUNDED', 'RELEASED', 'REFUNDED'],
      default: 'PENDING',
    },
    farmerBankAccount: {
      type: String,
    },
    deliverySubmissions: [{
      type: String,
    }],
    moisturePercent: {
      type: Number,
      default: 11.8,
    },
    agentFeePaid: {
      type: Boolean,
      default: false,
    },
    agentFeeAmount: {
      type: Number,
      default: 250,
    },
    agentRequestedAt: {
      type: Date,
      default: null,
    },
    qualitySubmissions: [qualitySubmissionSchema],
    transactionReceiptUrl: {
      type: String, // Base64 data URL
    },
    utrNumber: {
      type: String,
      default: '',
    },
    receiptUploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    receiptUploadedAt: {
      type: Date,
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
