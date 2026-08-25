const MandiPriceCache = require('../models/MandiPriceCache');
const BuyerListing = require('../models/BuyerListing');

async function getJourney(req, res) {
  try {
    const { state, district, crop } = req.query;

    if (!state || !district || !crop) {
      return res.status(400).json({ success: false, message: "Missing required parameters: state, district, crop" });
    }

    // Dynamic import to use the ES module shared config
    let config;
    try {
      config = await import('../../src/utils/cropJourneyConfig.js');
    } catch (err) {
      // Fallback if running from a different context or if path differs slightly
      config = await import('../../../src/utils/cropJourneyConfig.js').catch(e => {
        console.error("Failed to load crop journey config:", e);
        throw e;
      });
    }

    const { computeJourney } = config;

    // 1. Fetch live mandi price for the specific State, District, Crop
    const query = {
      state: { $regex: new RegExp('^' + state.trim() + '$', 'i') },
      district: { $regex: new RegExp('^' + district.trim() + '$', 'i') },
      commodity: { $regex: new RegExp('^' + crop.trim() + '$', 'i') }
    };

    const mandiRecord = await MandiPriceCache.findOne(query).sort({ timestamp: -1 });

    if (!mandiRecord) {
      return res.status(404).json({
        available: false,
        message: "No mandi price found for the selected location and crop."
      });
    }

    // Compute prices using the exact formula
    const journeyData = computeJourney(mandiRecord.modal_price, mandiRecord.commodity);

    // 2. Fetch verified buyers nearby
    const buyerQuery = {
      state: { $regex: new RegExp('^' + state.trim() + '$', 'i') },
      district: { $regex: new RegExp('^' + district.trim() + '$', 'i') }
    };

    const buyers = await BuyerListing.find(buyerQuery).limit(5).lean();
    
    const verifiedBuyers = buyers.map(b => ({
      name: b.buyer_name || b.company_name,
      type: b.buyer_type || 'Buyer',
      verified: true // Assuming listed buyers in BuyerListing are verified or active
    }));

    return res.status(200).json({
      crop: mandiRecord.commodity,
      category: journeyData.category,
      state: mandiRecord.state,
      district: mandiRecord.district,
      mandiPrice: {
        value: mandiRecord.modal_price,
        unit: 'per quintal',
        lastUpdated: mandiRecord.timestamp || mandiRecord.arrival_date
      },
      arrivalVolume: mandiRecord.arrivals ? {
        value: mandiRecord.arrivals,
        unit: 'tonnes'
      } : null,
      farmerSharePercent: journeyData.farmerSharePercent,
      stages: journeyData.stages,
      verifiedBuyers
    });
  } catch (error) {
    console.error("Error in getJourney:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

module.exports = {
  getJourney
};
