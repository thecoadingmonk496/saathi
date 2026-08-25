const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    batchId: {
      type: String,
      required: true,
      index: true,
      // DEPRECATED in Phase 6.6: Use 'transactionId' for transfer event, 'farmerBatchId' for lineage
    },
    sourceType: {
      type: String,
      enum: ['PURCHASE_ORDER'],
      default: 'PURCHASE_ORDER',
    },
    sourceId: {
      type: String, // Legacy text field
      sparse: true,
    },
    sourceOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
    },
    product: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    variety: {
      type: String,
      trim: true,
      default: '',
    },
    quantity: {
      type: Number,
      required: true,
      min: 0.001,
    },
    unit: {
      type: String,
      default: 'quintal',
    },
    price: {
      type: Number,
      required: true,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    stage: {
      type: String,
      required: true,
      enum: ['FARMER_TO_BUYER', 'BUYER_TO_WHOLESALER', 'WHOLESALER_TO_DISTRIBUTOR', 'DISTRIBUTOR_TO_RETAILER', 'RETAILER_TO_CONSUMER'],
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'CANCELLED'],
      default: 'PENDING',
    },
    verificationStatus: {
      type: String,
      enum: ['UNVERIFIED', 'PENDING', 'VERIFIED', 'FAILED'],
      default: 'UNVERIFIED',
    },
    verificationRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VerificationRecord',
    },
    transactionDate: {
      type: Date,
      default: Date.now,
    },
    is_quarantined: {
      type: Boolean,
      default: false,
    }
  },
  { timestamps: true },
);

// Indexes for faster lookups
transactionSchema.index({ batchId: 1, transactionDate: 1 });
transactionSchema.index({ sellerId: 1 });
transactionSchema.index({ buyerId: 1 });
transactionSchema.index({ product: 1, stage: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
