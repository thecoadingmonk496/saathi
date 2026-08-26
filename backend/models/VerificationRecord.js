const mongoose = require('mongoose');

const verificationRecordSchema = new mongoose.Schema(
  {
    recordType: {
      type: String,
      enum: ['SUPPLY_CHAIN', 'BUYER'],
      required: true,
    },
    referenceId: {
      type: String,
      required: true,
      index: true,
    },
    dataHash: {
      type: String,
      required: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    blockchain: {
      verified: { type: Boolean, default: false },
      status: { type: String, enum: ['verified', 'pending', 'failed'], default: 'pending' },
      network: { type: String, default: 'Polygon Amoy' },
      transactionHash: String,
      blockNumber: String,
      recordId: String,
      dataHash: String,
      error: String,
      timestamp: Date,
    },
  },
  { timestamps: true },
);

verificationRecordSchema.index({ recordType: 1, referenceId: 1 }, { unique: true });

module.exports = mongoose.model('VerificationRecord', verificationRecordSchema);
