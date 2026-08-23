const express = require('express');
const cronRoutes = require('./routes/cron');
process.env.CRON_SECRET = 'my-secret';
const app = express();
app.use('/api/cron', cronRoutes);
app.listen(5002, () => console.log('Test server ready on 5002'));
