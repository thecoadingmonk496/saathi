const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, 'backend', '.env') });
const Deal = require('./backend/models/Deal');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const deals = await Deal.find({ status: 'HUMAN_REVIEW' });
    for (let deal of deals) {
      deal.status = 'AGENT_PAYMENT_PENDING';
      deal.farmerAgentFeePaid = false;
      await deal.save();
      console.log(`Updated deal ${deal._id} back to AGENT_PAYMENT_PENDING`);
    }
    console.log("Done.");
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
