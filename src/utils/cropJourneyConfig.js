// Shared configuration for Crop Journey logic (used by Backend API and Frontend UI)

const markups = {
  commissionPercent: 4,
  wholesalerMarkupPercent: 10,
  logisticsMarkupPercent: 6,
  retailMarkupMin: 5
};

const cropCategoryMap = {
  'wheat': 'cereal',
  'paddy': 'cereal',
  'rice': 'cereal',
  'maize': 'cereal',
  'bajra': 'cereal',
  'jowar': 'cereal',
  
  'chana': 'pulse',
  'gram': 'pulse',
  'moong': 'pulse',
  'masoor': 'pulse',
  'urad': 'pulse',
  'tur': 'pulse',
  'arhar': 'pulse',
  
  'mustard': 'oilseed',
  'soyabean': 'oilseed',
  'groundnut': 'oilseed',
  'sunflower': 'oilseed',
  'sesame': 'oilseed',
  
  'onion': 'fruit_vegetable',
  'tomato': 'fruit_vegetable',
  'potato': 'fruit_vegetable',
  'apple': 'fruit_vegetable',
  'banana': 'fruit_vegetable',
  'mango': 'fruit_vegetable',
  'garlic': 'fruit_vegetable',
  'cabbage': 'fruit_vegetable'
};

const targetFarmerShareByCategory = {
  'cereal': 59.5,         // Midpoint of 52-67%
  'pulse': 63.0,          // Midpoint of 60-66%
  'oilseed': 53.5,        // Midpoint of 52-55%
  'fruit_vegetable': 51.5 // Midpoint of 40-63%
};

/**
 * Computes the supply chain journey prices and markup percentages.
 * @param {number} mandiPrice - The live anchor price from Mandi
 * @param {string} cropName - Name of the crop
 * @returns {Object} Computed journey stages and metadata
 */
function computeJourney(mandiPrice, cropName) {
  if (!mandiPrice || mandiPrice <= 0) {
    throw new Error("Invalid mandi price");
  }

  const category = cropCategoryMap[(cropName || '').toLowerCase()] || 'cereal';
  const targetShare = targetFarmerShareByCategory[category];

  // 1. Farmer Price
  const farmerPrice = mandiPrice * (1 - (markups.commissionPercent / 100));

  // 2. Target Consumer Price (to hit the target farmer share)
  const targetConsumerPrice = farmerPrice / (targetShare / 100);

  // 3. Wholesaler Price
  const wholesalerPrice = mandiPrice * (1 + (markups.wholesalerMarkupPercent / 100));

  // 4. Logistics Price
  const logisticsPrice = wholesalerPrice * (1 + (markups.logisticsMarkupPercent / 100));

  // 5. Retail Price (solved backwards from target consumer price)
  let retailMarkupPercent = ((targetConsumerPrice / logisticsPrice) - 1) * 100;
  
  // Clamp retail markup to a minimum of 5%
  if (retailMarkupPercent < markups.retailMarkupMin) {
    retailMarkupPercent = markups.retailMarkupMin;
  }

  const retailPrice = logisticsPrice * (1 + (retailMarkupPercent / 100));
  
  // 6. Consumer Price
  const consumerPrice = retailPrice; // Retail price is the price consumer pays

  // Re-calculate the actual farmer share based on final consumer price (in case of clamping)
  const actualFarmerSharePercent = (farmerPrice / consumerPrice) * 100;

  // Round values for presentation
  const round = (val) => Math.round(val);

  return {
    category,
    farmerSharePercent: round(actualFarmerSharePercent),
    stages: [
      {
        stage: "Farmer",
        price: round(farmerPrice),
        changePercent: -markups.commissionPercent,
        note: "Net after typical mandi commission"
      },
      {
        stage: "Mandi",
        price: round(mandiPrice),
        changePercent: 0,
        note: "Live APMC auction price, government regulated"
      },
      {
        stage: "Wholesaler",
        price: round(wholesalerPrice),
        changePercent: markups.wholesalerMarkupPercent,
        note: "Licensed trader margin"
      },
      {
        stage: "Logistics",
        price: round(logisticsPrice),
        changePercent: markups.logisticsMarkupPercent,
        note: "Transport & distribution"
      },
      {
        stage: "Retail",
        price: round(retailPrice),
        changePercent: round(retailMarkupPercent),
        note: "Local shop / mandi retail"
      },
      {
        stage: "Consumer",
        price: round(consumerPrice),
        changePercent: 0,
        note: "Final purchase price by consumer"
      }
    ]
  };
}

export {
  markups,
  cropCategoryMap,
  targetFarmerShareByCategory,
  computeJourney
};
