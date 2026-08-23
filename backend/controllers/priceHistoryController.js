const PriceHistory = require('../models/PriceHistory');

async function getPriceHistory(req, res) {
  try {
    const { commodity, district, state, market, days } = req.query || {};

    if (!commodity || !district || !state) {
      return res.status(400).json({
        success: false,
        message: 'Commodity, district, and state are required parameters'
      });
    }

    const daysCount = parseInt(days, 10) || 7;

    const filter = {
      commodity: commodity.toLowerCase(),
      district,
      state
    };

    if (market) {
      filter.market = market;
    }

    // Find the latest history points sorted by recorded_at desc
    const historyRecords = await PriceHistory.find(filter)
      .sort({ recorded_at: -1 })
      .limit(daysCount);

    // Map to simple JSON format and sort chronologically (oldest -> newest)
    const formattedRecords = historyRecords
      .map(r => ({
        date: r.arrival_date,
        modal_price: r.modal_price,
        recorded_at: r.recorded_at
      }))
      .sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));

    // Return the array directly as requested in the format spec
    return res.status(200).json(formattedRecords);

  } catch (error) {
    console.error('[PriceHistoryController] Error fetching price history:', error.message);
    return res.status(500).json({
      success: false,
      message: 'An unexpected server error occurred'
    });
  }
}

module.exports = {
  getPriceHistory
};
