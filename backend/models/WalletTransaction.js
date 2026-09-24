const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['RECEIVED', 'FORWARDED'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    dealId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Deal',
    },
    fromUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    toUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    description: {
      type: String,
      trim: true,
    },
    // Who paid: BUYER (escrow) or FARMER (agent fee)
    payerRole: {
      type: String,
      enum: ['BUYER', 'FARMER'],
    },
    // Receipt data for FORWARDED transactions
    receiptData: {
      receiptNumber: String,
      farmerName: String,
      farmerBank: String,
      farmerIfsc: String,
      farmerUpi: String,
      crop: String,
      quantity: Number,
      agreedPrice: Number,
      totalAmount: Number,
      paidAt: Date,
      generatedReceiptUrl: String, // Base64 encoded PDF/HTML receipt
    },
    balanceAfter: {
      type: Number,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);
