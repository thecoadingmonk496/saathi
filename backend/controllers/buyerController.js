const BuyerListing = require('../models/BuyerListing');

async function getBuyerListings(req, res) {
  try {
    const { commodity, state, district, limit = 20, offset = 0 } = req.query || {};

    const query = {};
    if (commodity) {
      // Fuzzy/casing match for commodity (same as mandi search)
      query.commodity = { $regex: new RegExp(commodity.trim(), 'i') };
    }
    if (state) {
      query.state = { $regex: new RegExp('^' + state.trim() + '$', 'i') };
    }
    if (district) {
      query.district = { $regex: new RegExp('^' + district.trim() + '$', 'i') };
    }

    const cleanLimit = parseInt(limit, 10) || 20;
    const cleanOffset = parseInt(offset, 10) || 0;

    const listings = await BuyerListing.find(query)
      .sort({ created_at: -1 })
      .skip(cleanOffset)
      .limit(cleanLimit);

    return res.status(200).json({
      success: true,
      listings
    });
  } catch (error) {
    console.error('[BuyerController] Error fetching listings:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
}

module.exports = {
  getBuyerListings
};
