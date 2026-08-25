const User = require('../models/User');

async function getWholesalers(req, res) {
  try {
    const wholesalers = await User.find({ role: 'WHOLESALER' }).select('firstName lastName email phone _id');
    return res.status(200).json({ success: true, wholesalers });
  } catch (error) {
    console.error('[WholesalerController] getWholesalers error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching wholesalers' });
  }
}

module.exports = {
  getWholesalers
};
