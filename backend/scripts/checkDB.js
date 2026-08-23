require('dotenv').config({ path: '../.env' });
const connectDB = require('../config/db');
const MandiPriceCache = require('../models/MandiPriceCache');

async function check() {
  await connectDB();
  const count = await MandiPriceCache.countDocuments();
  console.log('Total document count:', count);
  const sample = await MandiPriceCache.find().limit(5).lean();
  console.log('Sample docs:', sample.map(d => ({ state: d.state, district: d.district, commodity: d.commodity, arrival_date: d.arrival_date, modal_price: d.modal_price })));
  const states = await MandiPriceCache.distinct('state');
  console.log('States present:', states);
  process.exit(0);
}
check();
