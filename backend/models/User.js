const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      enum: ['FARMER', 'BUYER', 'WHOLESALER', 'DISTRIBUTOR', 'RETAILER', 'CONSUMER', 'USER', 'ADMIN'],
      default: 'USER'
    },
    farmerId: { type: String, trim: true },
    village: { type: String, trim: true },
    block: { type: String, trim: true },
    district: { type: String, trim: true },
    state: { type: String, trim: true },
    profileImage: { type: String },
    landHolding: { type: String, trim: true },
    primaryCrops: { type: String, trim: true },
    irrigation: { type: String, trim: true },
    farmingType: { type: String, trim: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model('User', userSchema);
