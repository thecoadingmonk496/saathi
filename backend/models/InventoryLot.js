const mongoose = require('mongoose');

const inventoryLotSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    ownerRole: {
      type: String,
      required: true,
      enum: ['FARMER', 'BUYER', 'WHOLESALER', 'DISTRIBUTOR', 'RETAILER', 'CONSUMER'],
    },
    crop: {
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
    originalQuantity: {
      type: Number,
      required: true,
      min: [0, 'originalQuantity cannot be negative'],
    },
    availableQuantity: {
      type: Number,
      required: true,
      min: [0, 'availableQuantity cannot be negative'],
      validate: {
        validator: function(v) {
          return v <= this.originalQuantity;
        },
        message: 'availableQuantity cannot exceed originalQuantity'
      }
    },
    unit: {
      type: String,
      default: 'quintal',
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    batchId: {
      type: String,
      required: true,
      index: true,
      // DEPRECATED in Phase 6.6: Use farmerBatchId
    },
    farmerBatchId: {
      type: String,
      index: true,
    },
    originTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      required: true,
      // DEPRECATED in Phase 6.6: Use transactionId
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
    },
    originFarmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    is_demo: {
      type: Boolean,
      default: false,
    },
    is_quarantined: {
      type: Boolean,
      default: false,
    }
  },
  { timestamps: true }
);

inventoryLotSchema.index({ ownerId: 1, availableQuantity: 1 });
inventoryLotSchema.index({ ownerId: 1, crop: 1, availableQuantity: 1 });

module.exports = mongoose.model('InventoryLot', inventoryLotSchema);
