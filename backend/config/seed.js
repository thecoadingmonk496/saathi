const PriceHistory = require('../models/PriceHistory');

async function seedPriceHistory() {
  try {
    const count = await PriceHistory.countDocuments();
    if (count > 0) {
      console.log('[Seed] Price history already seeded.');
      return;
    }

    console.log('[Seed] Seeding default mock price history...');
    
    const baseCrops = [
      { commodity: 'wheat', variety: 'Kalyansona', market: 'Noida Mandi', district: 'Gautam Buddha Nagar', state: 'Uttar Pradesh', basePrice: 2200 },
      { commodity: 'paddy', variety: 'Common', market: 'Noida Mandi', district: 'Gautam Buddha Nagar', state: 'Uttar Pradesh', basePrice: 2100 },
      { commodity: 'tomato', variety: 'Hybrid', market: 'Noida Mandi', district: 'Gautam Buddha Nagar', state: 'Uttar Pradesh', basePrice: 2400 },
      { commodity: 'onion', variety: 'Red', market: 'Pune Mandi', district: 'Pune', state: 'Maharashtra', basePrice: 2000 },
      { commodity: 'tomato', variety: 'Local', market: 'Pune Mandi', district: 'Pune', state: 'Maharashtra', basePrice: 2200 },
      { commodity: 'wheat', variety: 'Lok-1', market: 'Ludhiana Mandi', district: 'Ludhiana', state: 'Punjab', basePrice: 2300 }
    ];

    const seedRecords = [];
    // Set base date matching local metadata (2026-08-23)
    const baseDate = new Date('2026-08-23T12:00:00');

    for (const crop of baseCrops) {
      for (let i = 7; i >= 0; i--) {
        const currentDate = new Date(baseDate.getTime());
        currentDate.setDate(currentDate.getDate() - i);

        const day = String(currentDate.getDate()).padStart(2, '0');
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const year = currentDate.getFullYear();
        const arrivalDateStr = `${day}/${month}/${year}`;

        // Generate smooth fluctuations using sine wave + alternate offsets
        const changeFactor = Math.sin(i * 0.9) * 75 + (i % 2 === 0 ? 30 : -20);
        const modalPrice = Math.round((crop.basePrice + changeFactor) / 10) * 10;

        seedRecords.push({
          commodity: crop.commodity,
          variety: crop.variety,
          market: crop.market,
          district: crop.district,
          state: crop.state,
          modal_price: modalPrice,
          arrival_date: arrivalDateStr,
          recorded_at: currentDate
        });
      }
    }

    await PriceHistory.insertMany(seedRecords);
    console.log(`[Seed] Seeded ${seedRecords.length} records into PriceHistory database successfully.`);
  } catch (err) {
    console.error('[Seed] Error seeding PriceHistory:', err.message);
  }
}

module.exports = {
  seedPriceHistory
};
