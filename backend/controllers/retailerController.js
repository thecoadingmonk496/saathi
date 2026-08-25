const User = require('../models/User');

async function getRetailers(req, res) {
  try {
    const retailers = await User.find({ role: 'RETAILER' }).select('-password -__v');
    return res.status(200).json({
      success: true,
      retailers,
    });
  } catch (error) {
    console.error('[RetailerController] getRetailers error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error fetching retailers' });
  }
}

module.exports = {
  getRetailers,
};
