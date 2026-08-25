const User = require('../models/User');

async function getConsumers(req, res) {
  try {
    const consumers = await User.find({ role: 'CONSUMER' }).select('-password -__v');
    return res.status(200).json({
      success: true,
      consumers,
    });
  } catch (error) {
    console.error('[ConsumerController] getConsumers error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error fetching consumers' });
  }
}

module.exports = {
  getConsumers,
};
