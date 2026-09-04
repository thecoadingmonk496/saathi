const express = require('express');
const cors = require('cors');
const connectDB = require('../backend/config/db');

// Route imports — mirrors backend/server.js
const authRoutes = require('../backend/routes/auth');
const adminRoutes = require('../backend/routes/admin');
const mandiRoutes = require('../backend/routes/mandi');
const priceHistoryRoutes = require('../backend/routes/priceHistory');
const buyerRoutes = require('../backend/routes/buyer');
const buyerApplicationRoutes = require('../backend/routes/buyerApplication');
const transactionRoutes = require('../backend/routes/transaction');
const orderRoutes = require('../backend/routes/order');
const cronRoutes = require('../backend/routes/cron');
const wholesalerRoutes = require('../backend/routes/wholesaler');
const inventoryRoutes = require('../backend/routes/inventory');
const distributorRoutes = require('../backend/routes/distributor');
const retailerRoutes = require('../backend/routes/retailer');
const consumerRoutes = require('../backend/routes/consumer');
const buyerDiscoveryRoutes = require('../backend/routes/buyerDiscovery');

// Direct controller imports for alias routes
const { sendOtp, verifyOtp } = require('../backend/controllers/authController');

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serverless DB connection middleware
app.use(async (req, res, next) => {
  try {
    await connectDB();
  } catch (error) {
    console.error('Serverless MongoDB Connection Error:', error.message);
    return res.status(503).json({
      success: false,
      message: 'Database connection unavailable. Please check MongoDB Atlas Network Access and MONGODB_URI.',
    });
  }
  next();
});

// All API routes — must match backend/server.js
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/mandi-prices', mandiRoutes);
app.use('/api/price-history', priceHistoryRoutes);
app.use('/api/buyer-listings', buyerRoutes);
app.use('/api/buyers', buyerApplicationRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/purchase-orders', orderRoutes);
app.use('/api/cron', cronRoutes);
app.use('/api/wholesalers', wholesalerRoutes);
app.use('/api/distributors', distributorRoutes);
app.use('/api/retailers', retailerRoutes);
app.use('/api/consumers', consumerRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/buyer-discovery', buyerDiscoveryRoutes);

// Direct alias routes for backward compatibility
app.post('/api/send-otp', sendOtp);
app.post('/api/verify-otp', verifyOtp);

app.get('/api', (req, res) => {
  res.json({ message: 'Saathi API is running on live serverless Vercel' });
});

module.exports = app;
