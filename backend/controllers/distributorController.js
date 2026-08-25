const User = require('../models/User');

/**
 * Returns a list of authenticated, discoverable distributors
 * Used by Wholesalers to propose downstream sales.
 */
async function getDistributors(req, res) {
  try {
    const distributors = await User.find({ role: 'DISTRIBUTOR' })
      .select('-password -__v')
      .lean();

    return res.status(200).json({
      success: true,
      distributors,
    });
  } catch (error) {
    console.error('[DistributorController] getDistributors error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch distributors' });
  }
}

module.exports = {
  getDistributors,
};
