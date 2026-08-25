const BuyerListing = require('../models/BuyerListing');
const PurchaseOrder = require('../models/PurchaseOrder'); // Need this to fetch accepted quantities

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

    const listingsDocs = await BuyerListing.find(query)
      .sort({ created_at: -1 })
      .skip(cleanOffset)
      .limit(cleanLimit)
      .lean(); // Use lean so we can append dynamic properties

    // Calculate dynamic fulfillment context
    const listings = listingsDocs.map((listing) => {
      // 1. Parse requestedQuantity from the string (e.g. "50 quintals" -> 50)
      const qtyMatch = listing.quantity_required.match(/\d+/);
      const requestedQuantity = qtyMatch ? parseInt(qtyMatch[0], 10) : Number.MAX_SAFE_INTEGER; // Fallback to infinity if unparseable

      // 2. Use atomic fulfilled quantity
      const acceptedQuantity = listing.fulfilledQuantity || 0;
      const remainingQuantity = Math.max(0, requestedQuantity - acceptedQuantity);

      // 3. Determine status
      let fulfillmentStatus = 'UNFULFILLED';
      if (acceptedQuantity >= requestedQuantity) {
        fulfillmentStatus = 'FULLY_FULFILLED';
      } else if (acceptedQuantity > 0) {
        fulfillmentStatus = 'PARTIALLY_FULFILLED';
      }

      return {
        ...listing,
        requestedQuantity,
        acceptedQuantity,
        remainingQuantity,
        fulfillmentStatus
      };
    });

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
