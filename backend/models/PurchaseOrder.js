const mongoose = require('mongoose');

const purchaseOrderSchema = new mongoose.Schema(
  {
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BuyerListing',
      required: false,
    },
    product: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [0.001, 'Quantity must be greater than zero'],
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'Price cannot be negative'],
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'ERROR'],
      default: 'PENDING',
    },
    stage: {
      type: String,
      enum: ['FARMER_TO_BUYER', 'BUYER_TO_WHOLESALER', 'WHOLESALER_TO_DISTRIBUTOR', 'DISTRIBUTOR_TO_RETAILER', 'RETAILER_TO_CONSUMER'],
      default: 'FARMER_TO_BUYER',
    }
  },
  { timestamps: true },
);
purchaseOrderSchema.index({ sellerId: 1, status: 1 });
purchaseOrderSchema.index({ buyerId: 1, status: 1 });
purchaseOrderSchema.index({ listingId: 1, status: 1 });
module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
