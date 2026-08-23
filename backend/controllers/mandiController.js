const mandiService = require('../services/mandiService');

async function getMandiPrices(req, res) {
  try {
    const { commodity, state, district, market, limit, offset } = req.query || {};

    const records = await mandiService.getMandiPrices({
      commodity,
      state,
      district,
      market,
      limit,
      offset
    });

    if (!records || records.length === 0) {
      return res.status(200).json({
        success: true,
        records: [],
        message: 'No records found'
      });
    }

    return res.status(200).json({
      success: true,
      records
    });

  } catch (error) {
    console.error('[MandiController] Error fetching mandi prices:', error.message);

    // Rate limiting or invalid key - do not leak the raw API error or key
    if (error.message === 'API_UNAVAILABLE_AUTH' || error.message === 'API_UNAVAILABLE') {
      return res.status(503).json({
        success: false,
        message: 'Mandi price service is temporarily unavailable'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'An unexpected server error occurred'
    });
  }
}

module.exports = {
  getMandiPrices
};
