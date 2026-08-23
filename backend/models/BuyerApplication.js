const mongoose = require('mongoose');

const commoditySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, lowercase: true },
  minimumQuantity: { type: Number, default: null },
  maximumQuantity: { type: Number, default: null },
  unit: { type: String, enum: ['quintal', 'ton', 'kg'], default: 'quintal' },
  purchaseFrequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'seasonal', 'as_required'], default: 'as_required' },
  offerPrice: { type: Number, default: null },
  offerUnit: { type: String, default: 'quintal' },
  offerQuantity: { type: Number, default: null },
  priceUpdatedAt: { type: Date, default: null },
}, { _id: false });

const buyerApplicationSchema = new mongoose.Schema({
  applicantName: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true, index: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  profilePhoto: { type: String, default: '' },
  buyerType: {
    type: String,
    required: true,
    enum: ['Wholesaler', 'Retailer', 'Trader', 'Processor / Manufacturer', 'FPO / Farmer Producer Organization', 'Collection Center', 'Distributor', 'Other'],
    index: true,
  },
  otherBuyerType: { type: String, default: '', trim: true },
  business: {
    name: { type: String, required: true, trim: true },
    businessType: { type: String, required: true, enum: ['Individual', 'Proprietorship', 'Partnership', 'Company', 'FPO', 'Other'] },
    yearEstablished: { type: Number, default: null },
    address: { type: String, required: true, trim: true },
  },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [] },
  },
  address: {
    villageCity: { type: String, required: true, trim: true },
    tehsilBlock: { type: String, required: true, trim: true },
    district: { type: String, required: true, trim: true, index: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
  },
  commodities: { type: [commoditySchema], default: [] },
  preferredPurchaseRadius: { type: String, enum: ['within_10_km', 'within_25_km', 'within_50_km', 'any_location'], default: 'within_25_km' },
  documents: {
    identityProof: { type: String, default: '' },
    businessProof: { type: String, default: '' },
    addressProof: { type: String, default: '' },
    gstCertificate: { type: String, default: '' },
    udyamRegistration: { type: String, default: '' },
    fssaiLicense: { type: String, default: '' },
    otherDocument: { type: String, default: '' },
  },
  verificationStatus: { type: String, enum: ['PENDING', 'UNDER_REVIEW', 'ACTION_REQUIRED', 'APPROVED', 'REJECTED'], default: 'PENDING', index: true },
  verified: { type: Boolean, default: false },
  adminRemarks: { type: String, default: '' },
  submittedAt: { type: Date, default: Date.now },
  reviewedAt: { type: Date, default: null },
  reviewedBy: { type: String, default: '' },
}, { timestamps: true });

// GIS 2dsphere index for future buyer matching
buyerApplicationSchema.index({ location: '2dsphere' });

// Useful indexes for filtering and matching
buyerApplicationSchema.index({ verificationStatus: 1, submittedAt: -1 });
buyerApplicationSchema.index({ buyerType: 1, verificationStatus: 1 });
buyerApplicationSchema.index({ 'address.district': 1, verificationStatus: 1 });
buyerApplicationSchema.index({ 'commodities.name': 1, verificationStatus: 1 });

module.exports = mongoose.model('BuyerApplication', buyerApplicationSchema);