const express = require('express');
const cors = require('cors');
const connectDB = require('../backend/config/db');
const authRoutes = require('../backend/routes/auth');
const blockchainRoutes = require('../backend/routes/blockchain');
const adminRoutes = require('../backend/routes/admin');
const mandiRoutes = require('../backend/routes/mandi');
const priceHistoryRoutes = require('../backend/routes/priceHistory');
const buyerRoutes = require('../backend/routes/buyer');
const { sendOtp, verifyOtp } = require('../backend/controllers/authController');




const app = express();

app.use(cors());
app.use(express.json());

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

// Mounted Routes
app.use('/api/auth', authRoutes);
app.use('/api/blockchain', blockchainRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/mandi-prices', mandiRoutes);
app.use('/api/price-history', priceHistoryRoutes);
app.use('/api/buyer-listings', buyerRoutes);



// Direct alias routes for backward compatibility
app.post('/api/send-otp', sendOtp);
app.post('/api/verify-otp', verifyOtp);

app.get('/api', (req, res) => {
  res.json({ message: 'Saathi API is running on live serverless Vercel' });
});

module.exports = app;
