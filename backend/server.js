require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const blockchainRoutes = require('./routes/blockchain');
const adminRoutes = require('./routes/admin');
const mandiRoutes = require('./routes/mandi');
const priceHistoryRoutes = require('./routes/priceHistory');
const buyerRoutes = require('./routes/buyer');
const buyerApplicationRoutes = require('./routes/buyerApplication');
const transactionRoutes = require('./routes/transaction');
const orderRoutes = require('./routes/order');
const { seedPriceHistory } = require('./config/seed');
const { seedBuyerListings } = require('./config/seedBuyers');
const cronRoutes = require('./routes/cron');
const wholesalerRoutes = require('./routes/wholesaler');
const inventoryRoutes = require('./routes/inventory');
const distributorRoutes = require('./routes/distributor');
const retailerRoutes = require('./routes/retailer');
const consumerRoutes = require('./routes/consumer');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/blockchain', blockchainRoutes);
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



app.get("/", (req, res) => {
  res.json({
    message: "Saathi backend is running",
  });
});

const PORT = process.env.PORT || 5001;

async function startServer() {
  try {
    await connectDB();
    await seedPriceHistory();
    await seedBuyerListings();
    app.listen(PORT, () => {

      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

startServer();