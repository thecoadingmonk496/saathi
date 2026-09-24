const mongoose = require('mongoose');

const adminWalletSchema = new mongoose.Schema(
  {
    balance: {
      type: Number,
      default: 0,
    },
    totalReceived: {
      type: Number,
      default: 0,
    },
    totalForwarded: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AdminWallet', adminWalletSchema);
