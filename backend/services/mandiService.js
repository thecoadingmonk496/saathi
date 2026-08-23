const axios = require('axios');

// In-memory cache map
const cache = new Map();
const CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutes

// Crop translations mapping to resolve regional names to canonical names
const cropTranslations = {
  wheat: ['wheat', 'गेहूं', 'गेहू', 'गहू', 'ਕਣਕ', 'গম', 'gadhuma', 'கோதுமை', 'godhuma'],
  paddy: ['paddy', 'rice', 'धान', 'चावल', 'भात', 'तांदूळ', 'ਝੋਨਾ', 'ধান', 'vari', 'அரிసి', 'நெல்'],
  maize: ['maize', 'corn', 'मक्का', 'मका', 'ਮੱਕੀ', 'ਭੁੱਟਾ', 'mokkajonna', 'சோளம்'],
  mustard: ['mustard', 'सरसों', 'राई', 'मोहरी', 'ਸਰ੍ਹੋਂ', 'ਸਰੀਸ਼ਾ', 'aavalu', 'கடுகு'],
  chickpea: ['chickpea', 'gram', 'चना', 'हरभरा', 'ਛੋਲੇ', 'ছোলা', 'senagalu', 'கொண்டைக் கடலை'],
  onion: ['onion', 'प्याज', 'कांदा', 'ਪਿਆਜ਼', 'পেঁয়াজ', 'ullipaya', 'வெங்காயம்'],
  potato: ['potato', 'आलू', 'बटाटा', 'ਆਲੂ', 'আলু', 'bangaladumpa', 'உருளைக்கிழங்கு'],
  tomato: ['tomato', 'टमाटर', 'टोमॅटो', 'ਟਮਾਟਰ', 'টমেটো', 'தக்காளி'],
  soybean: ['soybean', 'सोयाबीन', 'ਸੋਇਆਬੀਨ', 'ਸੋਇਆਬੀਨ'],
  cotton: ['cotton', 'कपास', 'कापूस', 'ਕਪਾਹ', 'তুলা', 'prathi', 'பруத்தி'],
  sugarcane: ['sugarcane', 'गन्ना', 'ऊस', 'ਗੰਨਾ', 'আখ', 'cheruku', 'கரும்பு']
};

function getCanonicalCommodityName(query) {
  if (!query) return '';
  const cleanedQuery = query.toLowerCase().trim();
  for (const [canonical, aliases] of Object.entries(cropTranslations)) {
    if (aliases.some(alias => cleanedQuery.includes(alias.toLowerCase()))) {
      return canonical.charAt(0).toUpperCase() + canonical.slice(1);
    }
  }
  return query; // Default to raw query if no translation found
}

// Helper to sanitize input strings
function sanitizeInput(val) {
  if (val === undefined || val === null) return '';
  return String(val)
    .replace(/[<>'"&;]/g, '') // remove HTML special characters
    .trim();
}

// Mock mandi price records for local testing and fallback
const mockMandiRecords = [
  // Uttar Pradesh - Gautam Buddha Nagar
  { state: 'Uttar Pradesh', district: 'Gautam Buddha Nagar', market: 'Noida Mandi', commodity: 'Wheat', variety: 'Kalyansona', grade: 'FAQ', arrival_date: '23/08/2026', min_price: 2150, max_price: 2300, modal_price: 2225 },
  { state: 'Uttar Pradesh', district: 'Gautam Buddha Nagar', market: 'Noida Mandi', commodity: 'Paddy', variety: 'Common', grade: 'FAQ', arrival_date: '23/08/2026', min_price: 2100, max_price: 2250, modal_price: 2180 },
  { state: 'Uttar Pradesh', district: 'Gautam Buddha Nagar', market: 'Dadri Mandi', commodity: 'Wheat', variety: 'Lok-1', grade: 'FAQ', arrival_date: '23/08/2026', min_price: 2200, max_price: 2350, modal_price: 2275 },
  { state: 'Uttar Pradesh', district: 'Gautam Buddha Nagar', market: 'Dadri Mandi', commodity: 'Maize', variety: 'Yellow', grade: 'Medium', arrival_date: '23/08/2026', min_price: 2000, max_price: 2150, modal_price: 2080 },
  { state: 'Uttar Pradesh', district: 'Gautam Buddha Nagar', market: 'Dadri Mandi', commodity: 'Potato', variety: 'Deshi', grade: 'FAQ', arrival_date: '23/08/2026', min_price: 1100, max_price: 1300, modal_price: 1200 },
  { state: 'Uttar Pradesh', district: 'Gautam Buddha Nagar', market: 'Noida Mandi', commodity: 'Onion', variety: 'Red', grade: 'FAQ', arrival_date: '23/08/2026', min_price: 1700, max_price: 1900, modal_price: 1800 },
  { state: 'Uttar Pradesh', district: 'Gautam Buddha Nagar', market: 'Noida Mandi', commodity: 'Tomato', variety: 'Hybrid', grade: 'Medium', arrival_date: '23/08/2026', min_price: 2200, max_price: 2600, modal_price: 2400 },

  // Uttar Pradesh - Chandauli
  { state: 'Uttar Pradesh', district: 'Chandauli', market: 'Chakia Mandi', commodity: 'Wheat', variety: 'Kalyansona', grade: 'FAQ', arrival_date: '23/08/2026', min_price: 2180, max_price: 2310, modal_price: 2240 },
  { state: 'Uttar Pradesh', district: 'Chandauli', market: 'Chakia Mandi', commodity: 'Paddy', variety: 'Common', grade: 'FAQ', arrival_date: '23/08/2026', min_price: 2120, max_price: 2280, modal_price: 2200 },
  { state: 'Uttar Pradesh', district: 'Chandauli', market: 'Mughalsarai Mandi', commodity: 'Wheat', variety: 'Lok-1', grade: 'FAQ', arrival_date: '23/08/2026', min_price: 2190, max_price: 2340, modal_price: 2260 },
  { state: 'Uttar Pradesh', district: 'Chandauli', market: 'Mughalsarai Mandi', commodity: 'Mustard', variety: 'Common', grade: 'FAQ', arrival_date: '23/08/2026', min_price: 5350, max_price: 5750, modal_price: 5500 },

  // Maharashtra - Pune
  { state: 'Maharashtra', district: 'Pune', market: 'Pune Mandi', commodity: 'Onion', variety: 'Red', grade: 'Large', arrival_date: '23/08/2026', min_price: 1800, max_price: 2200, modal_price: 2000 },
  { state: 'Maharashtra', district: 'Pune', market: 'Pune Mandi', commodity: 'Tomato', variety: 'Local', grade: 'Medium', arrival_date: '23/08/2026', min_price: 2000, max_price: 2500, modal_price: 2250 },
  { state: 'Maharashtra', district: 'Pune', market: 'Pune Mandi', commodity: 'Potato', variety: 'Jyoti', grade: 'FAQ', arrival_date: '23/08/2026', min_price: 1300, max_price: 1600, modal_price: 1450 },

  // Punjab - Ludhiana
  { state: 'Punjab', district: 'Ludhiana', market: 'Ludhiana Mandi', commodity: 'Wheat', variety: 'Lok-1', grade: 'FAQ', arrival_date: '23/08/2026', min_price: 2250, max_price: 2400, modal_price: 2320 },
  { state: 'Punjab', district: 'Ludhiana', market: 'Ludhiana Mandi', commodity: 'Paddy', variety: 'Basmati', grade: 'FAQ', arrival_date: '23/08/2026', min_price: 3200, max_price: 3600, modal_price: 3400 },
  
  // Madhya Pradesh - Bhopal
  { state: 'Madhya Pradesh', district: 'Bhopal', market: 'Bhopal Mandi', commodity: 'Soybean', variety: 'Yellow', grade: 'FAQ', arrival_date: '23/08/2026', min_price: 4100, max_price: 4500, modal_price: 4300 },
  { state: 'Madhya Pradesh', district: 'Bhopal', market: 'Bhopal Mandi', commodity: 'Wheat', variety: 'Sharbati', grade: 'FAQ', arrival_date: '23/08/2026', min_price: 2300, max_price: 2500, modal_price: 2400 },

  // Haryana - Gurugram
  { state: 'Haryana', district: 'Gurugram', market: 'Gurugram Mandi', commodity: 'Mustard', variety: 'Common', grade: 'FAQ', arrival_date: '23/08/2026', min_price: 5400, max_price: 5800, modal_price: 5600 },
  { state: 'Haryana', district: 'Gurugram', market: 'Gurugram Mandi', commodity: 'Wheat', variety: 'Common', grade: 'FAQ', arrival_date: '23/08/2026', min_price: 2150, max_price: 2280, modal_price: 2210 }
];

async function getMandiPrices({ commodity, state, district, market, limit = 50, offset = 0 }) {
  // 1. Sanitize & Translate parameters
  let cleanCommodity = sanitizeInput(commodity);
  if (cleanCommodity) {
    cleanCommodity = getCanonicalCommodityName(cleanCommodity);
  }
  const cleanState = sanitizeInput(state);
  const cleanDistrict = sanitizeInput(district);
  const cleanMarket = sanitizeInput(market);
  
  let cleanLimit = parseInt(limit, 10);
  if (isNaN(cleanLimit) || cleanLimit <= 0) cleanLimit = 50;
  if (cleanLimit > 1000) cleanLimit = 1000;

  let cleanOffset = parseInt(offset, 10);
  if (isNaN(cleanOffset) || cleanOffset < 0) cleanOffset = 0;

  // 2. Generate cache key
  const cacheKeyObj = {
    commodity: cleanCommodity,
    state: cleanState,
    district: cleanDistrict,
    market: cleanMarket,
    limit: cleanLimit,
    offset: cleanOffset
  };
  const cacheKey = JSON.stringify(cacheKeyObj);

  // Check cache
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
      console.log(`[MandiService] Cache Hit for key: ${cacheKey}`);
      return cached.records;
    } else {
      cache.delete(cacheKey);
    }
  }

  // 3. Determine if using real data.gov.in API or local mock fallback
  const apiKey = process.env.DATA_GOV_API_KEY;
  const isMockKey = !apiKey || apiKey === 'mock_mandi_api_key_123456' || apiKey === 'your_data_gov_in_api_key';

  if (isMockKey) {
    console.log('[MandiService] Using local mock records fallback');
    
    // Filter locally
    let records = [...mockMandiRecords];
    if (cleanCommodity) {
      records = records.filter(r => r.commodity.toLowerCase().includes(cleanCommodity.toLowerCase()));
    }
    if (cleanState) {
      records = records.filter(r => r.state.toLowerCase() === cleanState.toLowerCase());
    }
    if (cleanDistrict) {
      records = records.filter(r => r.district.toLowerCase() === cleanDistrict.toLowerCase());
    }
    if (cleanMarket) {
      records = records.filter(r => r.market.toLowerCase().includes(cleanMarket.toLowerCase()));
    }

    const paginatedRecords = records.slice(cleanOffset, cleanOffset + cleanLimit);

    // Save to cache
    cache.set(cacheKey, { records: paginatedRecords, timestamp: Date.now() });
    return paginatedRecords;
  }

  // 4. Query external government API
  try {
    const baseUrl = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';
    const params = {
      'api-key': apiKey,
      format: 'json',
      limit: cleanLimit,
      offset: cleanOffset
    };

    if (cleanCommodity) params['filters[commodity]'] = cleanCommodity;
    if (cleanState) params['filters[state.keyword]'] = cleanState;
    if (cleanDistrict) params['filters[district]'] = cleanDistrict;
    if (cleanMarket) params['filters[market]'] = cleanMarket;

    console.log(`[MandiService] Querying data.gov.in API with filters...`);

    const response = await axios.get(baseUrl, { 
      params,
      timeout: 12000 // 12 seconds timeout
    });

    if (!response.data || !Array.isArray(response.data.records)) {
      console.warn('[MandiService] Unexpected response format from data.gov.in:', response.data);
      throw new Error('API_INVALID_RESPONSE');
    }

    // Clean and normalize response records to only include what UI needs
    const normalized = response.data.records.map(record => ({
      state: record.state || '',
      district: record.district || '',
      market: record.market || '',
      commodity: record.commodity || '',
      variety: record.variety || '',
      grade: record.grade || '',
      arrival_date: record.arrival_date || '',
      min_price: record.min_price ? Number(record.min_price) : 0,
      max_price: record.max_price ? Number(record.max_price) : 0,
      modal_price: record.modal_price ? Number(record.modal_price) : 0
    }));

    // Cache the normalized records
    cache.set(cacheKey, { records: normalized, timestamp: Date.now() });
    return normalized;

  } catch (error) {
    console.error('[MandiService] Error querying data.gov.in API:', error.message);
    
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      throw new Error('API_UNAVAILABLE_AUTH');
    }
    
    throw new Error('API_UNAVAILABLE');
  }
}

module.exports = {
  getMandiPrices
};
