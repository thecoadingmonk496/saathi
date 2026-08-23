const axios = require('axios');
const MandiPriceCache = require('../models/MandiPriceCache');
const MandiRefreshProgress = require('../models/MandiRefreshProgress');

// In-memory cache map
const cache = new Map();
const CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutes

// Non-today ("latest available") results are cached more briefly so a genuinely
// newer same-day update is never blocked behind stale fallback data for long.
const FALLBACK_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Dataset resource IDs on data.gov.in:
// - Current-day mandi snapshot (only markets that reported today)
// - Historical variety-wise daily prices (all past reports, used for fallback)
const CURRENT_DAILY_RESOURCE_ID = '9ef84268-d588-465a-a308-a864a43d0070';
const HISTORICAL_DAILY_RESOURCE_ID = '35985678-0d79-46b4-9ed6-6f13308a1d24';

// How many calendar days the latest-available fallback searches across before
// concluding there is genuinely no recent data for a selection
const FALLBACK_WINDOW_DAYS = 10;

// Today's date formatted as DD/MM/YYYY (matches the API's arrival_date format)
function getTodayDateString() {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${now.getFullYear()}`;
}

// Convert DD/MM/YYYY into a comparable numeric key (null when unparseable)
function parseArrivalDateKey(dateStr) {
  const match = String(dateStr || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  return Number(`${match[3]}${String(match[2]).padStart(2, '0')}${String(match[1]).padStart(2, '0')}`);
}

// Most recent arrival_date string present among records (null when none parse)
function getMostRecentArrivalDate(records) {
  let latest = null;
  let latestKey = -Infinity;
  for (const record of records) {
    const key = parseArrivalDateKey(record.arrival_date);
    if (key !== null && key > latestKey) {
      latestKey = key;
      latest = record.arrival_date;
    }
  }
  return latest;
}

// Flag every record as "latest available" when none of them are from today,
// so the UI never mistakes older data for today's price.
function markLatestAvailable(records) {
  const todayStr = getTodayDateString();
  const hasTodayRecord = records.some(record => record.arrival_date === todayStr);
  if (hasTodayRecord) return records;
  return records.map(record => ({ ...record, isLatestAvailable: true }));
}

// True when arrival_date falls within the last `windowDays` calendar days
// (inclusive of today). Used to bound the fallback search window generically
// for every state/district/commodity combination.
function isWithinRecentWindow(dateStr, windowDays = FALLBACK_WINDOW_DAYS) {
  const key = parseArrivalDateKey(dateStr);
  if (key === null) return false;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - windowDays);
  const cutoffKey = Number(
    `${cutoff.getFullYear()}${String(cutoff.getMonth() + 1).padStart(2, '0')}${String(cutoff.getDate()).padStart(2, '0')}`
  );
  return key >= cutoffKey;
}

// Crop translations mapping to resolve regional names to canonical names
const cropTranslations = {
  wheat: ['wheat', 'गेहूं', 'गेहू', 'गहू', 'ਕਣਕ', 'গম', 'gadhuma', 'கோதுமை', 'godhuma'],
  paddy: ['paddy', 'rice', 'धान', 'चावल', 'भात', 'तांदूळ', 'ਝੋਨਾ', 'ধান', 'vari', 'அரிసి', 'நெல்'],
  maize: ['maize', 'corn', 'मक्का', 'मका', 'ਮੱਕੀ', 'ਭੁੱਟਾ', 'mokkajonna', 'சோளம்'],
  mustard: ['mustard', 'सरसों', 'राई', 'मोहरी', 'ਸਰ੍ਹੋਂ', 'ਸਰੀਸ਼า', 'aavalu', 'கடுகு'],
  chickpea: ['chickpea', 'gram', 'चना', 'हरभरा', 'ਛੋਲੇ', 'ছোলা', 'senagalu', 'கொண்டைக் கடலை'],
  onion: ['onion', 'प्याज', 'कांदा', 'ਪਿਆਜ਼', 'পেঁয়াজ', 'ullipaya', 'வெங்காயம்'],
  potato: ['potato', 'आलू', 'बटाटा', 'ਆਲੂ', 'আলु', 'bangaladumpa', 'உருளைக்கிழங்கு'],
  tomato: ['tomato', 'टमाटर', 'टोमॅटो', 'ਟਮਾਟਰ', 'টমেটো', 'தக்காளி'],
  soybean: ['soybean', 'सोयाबीन', 'ਸੋਇਆਬੀਨ', 'ਸੋਇਆਬੀਨ'],
  cotton: ['cotton', 'कपास', 'कापूस', 'ਕਪਾਹ', 'তুলা', 'prathi', 'பруத்தி'],
  sugarcane: ['sugarcane', 'गन्ना', 'ऊस', 'ਗੰਨਾ', 'ਆਖ', 'cheruku', 'கரும்பு']
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

  // Uttar Pradesh - Gorakhpur
  { state: 'Uttar Pradesh', district: 'Gorakhpur', market: 'Gorakhpur Mandi', commodity: 'Wheat', variety: 'Kalyansona', grade: 'FAQ', arrival_date: '21/08/2026', min_price: 2125, max_price: 2280, modal_price: 2200 },
  { state: 'Uttar Pradesh', district: 'Gorakhpur', market: 'Gorakhpur Mandi', commodity: 'Paddy', variety: 'Common', grade: 'FAQ', arrival_date: '21/08/2026', min_price: 2050, max_price: 2200, modal_price: 2125 },
  { state: 'Uttar Pradesh', district: 'Gorakhpur', market: 'Campierganj Mandi', commodity: 'Maize', variety: 'Yellow', grade: 'Medium', arrival_date: '20/08/2026', min_price: 1950, max_price: 2100, modal_price: 2020 },

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

// Numeric coercion that tolerates missing/invalid values
function toPriceNumber(value) {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
}

// Clean and normalize raw API/mock records to only include what the UI needs.
function normalizeMandiRecords(rawRecords) {
  return rawRecords.map(record => ({
    state: record.state || record.State || '',
    district: record.district || record.District || '',
    market: record.market || record.Market || '',
    commodity: record.commodity || record.Commodity || '',
    variety: record.variety || record.Variety || '',
    grade: record.grade || record.Grade || '',
    arrival_date: record.arrival_date || record.Arrival_Date || '',
    min_price: toPriceNumber(record.min_price ?? record.Min_Price),
    max_price: toPriceNumber(record.max_price ?? record.Max_Price),
    modal_price: toPriceNumber(record.modal_price ?? record.Modal_Price)
  }));
}

// Summarizes whether a result set represents "most recent available" data
function summarizeArrivalFreshness(records) {
  if (!Array.isArray(records) || records.length === 0) {
    return { isLatestAvailable: false, latestArrivalDate: null };
  }
  return {
    isLatestAvailable: records.some(record => record.isLatestAvailable),
    latestArrivalDate: getMostRecentArrivalDate(records)
  };
}

// Nightly refresh: pulls national mandi data and caches to MongoDB
async function refreshNationalMandiCache() {
  const apiKey = process.env.DATA_GOV_API_KEY;
  if (!apiKey || apiKey === 'mock_mandi_api_key_123456' || apiKey === 'your_data_gov_in_api_key') {
    console.log('[MandiService] Using mock API key, skipping national refresh.');
    return { success: false, message: 'Mock API key in use' };
  }

  const todayStr = getTodayDateString();
  console.log('[MandiService] Starting nightly national mandi cache refresh...');
  const limit = 1000;
  
  let progressRecord = await MandiRefreshProgress.findOne({ date: todayStr });
  if (!progressRecord) {
    progressRecord = new MandiRefreshProgress({ date: todayStr, lastOffset: 0, status: 'IN_PROGRESS' });
    await progressRecord.save();
  } else if (progressRecord.status === 'COMPLETED') {
    console.log('[MandiService] Cache refresh for today is already completed. Skipping restart.');
    return { success: true, message: 'Already completed today' };
  }

  let offset = progressRecord.lastOffset;
  let totalRecordsFetched = 0;
  let totalUpserted = 0;
  let failedPages = 0;
  let totalAvailable = progressRecord.totalRecords || null;

  try {
    while (true) {
      // CKAN API hard limits offsets to 10000.
      if (offset >= 10000) {
        console.log('[MandiService] Reached maximum CKAN pagination offset limit (10,000). Marking refresh as COMPLETED.');
        progressRecord.status = 'COMPLETED';
        await progressRecord.save();
        break;
      }

      let pageSuccess = false;
      let response = null;
      
      // Retry logic for this specific page
      for (let retry = 0; retry < 3; retry++) {
        try {
          response = await axios.get(`https://api.data.gov.in/resource/${CURRENT_DAILY_RESOURCE_ID}`, {
            params: { 'api-key': apiKey, format: 'json', limit, offset },
            timeout: 35000 // Increased timeout for flaky government API
          });
          
          if (!response.data || !Array.isArray(response.data.records)) {
            throw new Error('Invalid response format');
          }
          pageSuccess = true;
          break; // success, break retry loop
        } catch (err) {
          console.warn(`[MandiService] Page fetch failed at offset ${offset} (attempt ${retry + 1}): ${err.message}`);
          await new Promise(r => setTimeout(r, 2000));
        }
      }

      if (!pageSuccess) {
        failedPages++;
        offset += limit;
        if (failedPages > 5) {
          console.error('[MandiService] Too many consecutive failures across different pages, aborting refresh.');
          break;
        }
        continue; // Skip this page but don't abort yet
      }
      
      // Reset failedPages counter on success to avoid aborting for sparse failures
      failedPages = 0;

      if (totalAvailable === null) {
        totalAvailable = Number(response.data.total) || 0;
        progressRecord.totalRecords = totalAvailable;
        await progressRecord.save();
        console.log(`[MandiService] Total records available for today: ${totalAvailable}`);
      }

      const records = normalizeMandiRecords(response.data.records);
      if (records.length === 0) break;

      const bulkOps = records.map(record => ({
        updateOne: {
          filter: {
            state: record.state,
            district: record.district,
            market: record.market,
            commodity: record.commodity,
            variety: record.variety,
            arrival_date: record.arrival_date
          },
          update: { $set: { ...record, fetched_at: new Date() } },
          upsert: true
        }
      }));

      if (bulkOps.length > 0) {
        const result = await MandiPriceCache.bulkWrite(bulkOps);
        totalUpserted += result.upsertedCount + result.modifiedCount;
      }

      totalRecordsFetched += records.length;
      offset += limit;
      
      // Update progress
      progressRecord.lastOffset = offset;
      await progressRecord.save();

      if (totalAvailable > 0 && offset >= totalAvailable) {
        progressRecord.status = 'COMPLETED';
        await progressRecord.save();
        break;
      }
      if (records.length < limit) {
        progressRecord.status = 'COMPLETED';
        await progressRecord.save();
        break;
      }

      // Small delay to avoid hammering the API
      await new Promise(r => setTimeout(r, 500));
    }
    
    console.log(`[MandiService] Refresh run ended. Succeeded pages: ${totalRecordsFetched/limit}. Total fetched in this run: ${totalRecordsFetched}. Status: ${progressRecord.status}`);
    return { success: progressRecord.status === 'COMPLETED', fetched: totalRecordsFetched, upserted: totalUpserted, failedPages };
  } catch (error) {
    console.error('[MandiService] National refresh failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Fetch historical records from the historical variety-wise dataset as a fallback
async function fetchMostRecentAvailablePrices({ apiKey, cleanCommodity, cleanState, cleanDistrict, cleanMarket, cleanLimit, cleanOffset }) {
  try {
    const params = {
      'api-key': apiKey,
      format: 'json',
      limit: 500, // Fetch a reasonably sized window
      offset: 0
    };

    if (cleanState) params['filters[state.keyword]'] = cleanState;
    if (cleanDistrict) params['filters[district]'] = cleanDistrict;
    if (cleanMarket) params['filters[market]'] = cleanMarket;

    console.log('[MandiService] Querying historical dataset for fallback prices...');
    const response = await axios.get(
      `https://api.data.gov.in/resource/${HISTORICAL_DAILY_RESOURCE_ID}`,
      { params, timeout: 25000 }
    );

    if (!response.data || !Array.isArray(response.data.records)) return [];

    let records = normalizeMandiRecords(response.data.records);

    if (cleanState) records = records.filter(r => r.state.toLowerCase() === cleanState.toLowerCase());
    if (cleanDistrict) records = records.filter(r => r.district.toLowerCase() === cleanDistrict.toLowerCase());
    if (cleanMarket) records = records.filter(r => r.market.toLowerCase().includes(cleanMarket.toLowerCase()));
    if (cleanCommodity) records = records.filter(r => r.commodity.toLowerCase().includes(cleanCommodity.toLowerCase()));

    if (records.length === 0) return [];

    // Keep only records sharing the most recent arrival_date present
    const mostRecentDate = getMostRecentArrivalDate(records);
    records = records.filter(record => record.arrival_date === mostRecentDate);

    // Upsert these fallback records into MongoDB MandiPriceCache so they are cached locally
    const bulkOps = records.map(record => ({
      updateOne: {
        filter: {
          state: record.state,
          district: record.district,
          market: record.market,
          commodity: record.commodity,
          variety: record.variety,
          arrival_date: record.arrival_date
        },
        update: { $set: { ...record, fetched_at: new Date() } },
        upsert: true
      }
    }));

    try {
      if (bulkOps.length > 0) {
        await MandiPriceCache.bulkWrite(bulkOps);
        console.log(`[MandiService] Cached ${records.length} historical records for ${cleanState}/${cleanDistrict}`);
      }
    } catch (dbErr) {
      console.error('[MandiService] Failed to cache historical records in DB:', dbErr.message);
    }

    return records.slice(cleanOffset, cleanOffset + cleanLimit);
  } catch (fallbackError) {
    console.error('[MandiService] Historical dataset fallback query failed:', fallbackError.message);
    return [];
  }
}

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

  // Check in-memory cache
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    const effectiveTtl = cached.isFallback ? FALLBACK_CACHE_TTL_MS : CACHE_TTL_MS;
    if (Date.now() - cached.timestamp < effectiveTtl) {
      console.log(`[MandiService] Cache Hit for key: ${cacheKey}`);
      return cached.records;
    } else {
      cache.delete(cacheKey);
    }
  }

  // 3. Check MongoDB MandiPriceCache first
  const query = {};
  if (cleanState) query.state = new RegExp(`^${cleanState}$`, 'i');
  if (cleanDistrict) query.district = new RegExp(`^${cleanDistrict}$`, 'i');
  if (cleanMarket) query.market = new RegExp(cleanMarket, 'i');
  if (cleanCommodity) query.commodity = new RegExp(cleanCommodity, 'i');

  try {
    const todayStr = getTodayDateString();
    query.arrival_date = todayStr;
    
    // First, try to get today's data
    let dbRecords = await MandiPriceCache.find(query).skip(cleanOffset).limit(cleanLimit).lean();
    let latestStr = todayStr;

    // If zero records for today, fall back to the most recent date available in the cache
    if (dbRecords.length === 0) {
      delete query.arrival_date; // Remove date restriction
      const distinctDates = await MandiPriceCache.distinct('arrival_date', query);
      if (distinctDates.length > 0) {
        let latestKey = -Infinity;
        for (const d of distinctDates) {
          const key = parseArrivalDateKey(d);
          if (key !== null && key > latestKey) {
            latestKey = key;
            latestStr = d;
          }
        }
        
        if (latestStr && latestStr !== todayStr) {
          query.arrival_date = latestStr;
          dbRecords = await MandiPriceCache.find(query).skip(cleanOffset).limit(cleanLimit).lean();
        }
      }
    }

    if (dbRecords.length > 0) {
      console.log(`[MandiService] DB Cache hit for ${cleanState}/${cleanDistrict} - date: ${latestStr}`);
      let normalized = dbRecords.map(r => {
        const { _id, fetched_at, __v, ...rest } = r;
        return rest;
      });
      normalized = markLatestAvailable(normalized);
      const usedFallback = normalized.some(r => r.isLatestAvailable);
      
      cache.set(cacheKey, { records: normalized, timestamp: Date.now(), isFallback: usedFallback });
      return normalized;
    }
  } catch (dbErr) {
    console.error('[MandiService] DB cache query failed, falling back to live API:', dbErr.message);
  }

  // 4. Determine if using real data.gov.in API or local mock fallback
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

    const todayStr = getTodayDateString();
    const todaysRecords = records.filter(record => record.arrival_date === todayStr);

    let resultRecords;
    let usedFallback = false;
    if (todaysRecords.length > 0) {
      resultRecords = todaysRecords;
    } else if (records.length > 0) {
      const mostRecentDate = getMostRecentArrivalDate(records);
      resultRecords = records
        .filter(record => record.arrival_date === mostRecentDate)
        .map(record => ({ ...record, isLatestAvailable: true }));
      usedFallback = true;
    } else {
      resultRecords = [];
    }

    const paginatedRecords = resultRecords.slice(cleanOffset, cleanOffset + cleanLimit);
    cache.set(cacheKey, { records: paginatedRecords, timestamp: Date.now(), isFallback: usedFallback });
    return paginatedRecords;
  }

  // 5. Query external government API (Last resort fallback)
  try {
    const baseUrl = `https://api.data.gov.in/resource/${CURRENT_DAILY_RESOURCE_ID}`;
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

    console.log(`[MandiService] Querying data.gov.in API with filters (Live Fallback)...`);

    const response = await axios.get(baseUrl, { 
      params,
      timeout: 20000 // 20 seconds timeout
    });

    if (!response.data || !Array.isArray(response.data.records)) {
      console.warn('[MandiService] Unexpected response format from data.gov.in:', response.data);
      throw new Error('API_INVALID_RESPONSE');
    }

    let normalized = normalizeMandiRecords(response.data.records);
    let usedFallback = false;

    // Current-day snapshot has nothing for this selection - fall back to the
    // historical variety-wise dataset to find older data.
    if (normalized.length === 0) {
      normalized = await fetchMostRecentAvailablePrices({
        apiKey,
        cleanCommodity,
        cleanState,
        cleanDistrict,
        cleanMarket,
        cleanLimit,
        cleanOffset
      });
      usedFallback = normalized.length > 0;
    } else {
      // If we got current daily records, upsert them to MongoDB cache as well!
      const bulkOps = normalized.map(record => ({
        updateOne: {
          filter: {
            state: record.state,
            district: record.district,
            market: record.market,
            commodity: record.commodity,
            variety: record.variety,
            arrival_date: record.arrival_date
          },
          update: { $set: { ...record, fetched_at: new Date() } },
          upsert: true
        }
      }));
      try {
        if (bulkOps.length > 0) {
          await MandiPriceCache.bulkWrite(bulkOps);
          console.log(`[MandiService] Cached ${normalized.length} current daily records in DB for ${cleanState}/${cleanDistrict}`);
        }
      } catch (dbErr) {
        console.error('[MandiService] Failed to cache current records in DB:', dbErr.message);
      }
    }

    // Label non-today data explicitly so the UI can flag it as "latest available"
    normalized = markLatestAvailable(normalized);

    cache.set(cacheKey, { records: normalized, timestamp: Date.now(), isFallback: usedFallback });
    return normalized;

  } catch (error) {
    console.error('[MandiService] Error querying data.gov.in API:', error.message);
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      throw new Error('API_UNAVAILABLE_AUTH');
    }
    throw new Error('API_UNAVAILABLE');
  }
}

const fallbackStatesAndDistricts = {
  'Andhra Pradesh': ['Anantapur', 'Chittoor', 'East Godavari', 'Guntur', 'Krishna', 'Kurnool', 'Nellore', 'Prakasam', 'Srikakulam', 'Visakhapatnam', 'Vizianagaram', 'West Godavari', 'YSR Kadapa'],
  'Arunachal Pradesh': ['Changlang', 'Dibang Valley', 'East Kameng', 'East Siang', 'Kurung Kumey', 'Lohit', 'Longding', 'Lower Dibang Valley', 'Lower Subansiri', 'Namsai', 'Papum Pare', 'Tawang', 'Tirap', 'Upper Siang', 'Upper Subansiri', 'West Kameng', 'West Siang'],
  'Assam': ['Baksa', 'Barpeta', 'Biswanath', 'Bongaigaon', 'Cachar', 'Charaideo', 'Chirang', 'Darrang', 'Dhemaji', 'Dhubri', 'Dibrugarh', 'Dima Hasao', 'Goalpara', 'Golaghat', 'Hailakandi', 'Hojai', 'Jorhat', 'Kamrup', 'Kamrup Metropolitan', 'Karbi Anglong', 'Karimganj', 'Kokrajhar', 'Lakhimpur', 'Majuli', 'Morigaon', 'Nagaon', 'Nalbari', 'Sivasagar', 'Sonitpur', 'South Salmara-Mankachar', 'Tinsukia', 'Udalguri', 'West Karbi Anglong'],
  'Bihar': ['Araria', 'Arwal', 'Aurangabad', 'Banka', 'Begusarai', 'Bhagalpur', 'Bhojpur', 'Buxar', 'Darbhanga', 'East Champaran', 'Gaya', 'Gopalganj', 'Jamui', 'Jehanabad', 'Kaimur', 'Katihar', 'Khagaria', 'Kishanganj', 'Lakhisarai', 'Madhepura', 'Madhubani', 'Munger', 'Muzaffarpur', 'Nalanda', 'Nawada', 'Patna', 'Purnia', 'Rohtas', 'Saharsa', 'Samastipur', 'Saran', 'Sheikhpura', 'Sheohar', 'Sitamarhi', 'Siwan', 'Supaul', 'Vaishali', 'West Champaran'],
  'Chhattisgarh': ['Balod', 'Baloda Bazar', 'Balrampur', 'Bastar', 'Bemetara', 'Bijapur', 'Bilaspur', 'Dantewada', 'Dhamtari', 'Durg', 'Gariaband', 'Janjgir-Champa', 'Jashpur', 'Kabirdham', 'Kanker', 'Kondagaon', 'Korba', 'Korea', 'Mahasamund', 'Mungeli', 'Narayanpur', 'Raigarh', 'Raipur', 'Rajnandgaon', 'Sukma', 'Surajpur', 'Surguja'],
  'Goa': ['North Goa', 'South Goa'],
  'Gujarat': ['Ahmedabad', 'Amreli', 'Anand', 'Aravalli', 'Banaskantha', 'Bharuch', 'Bhavnagar', 'Botad', 'Chhota Udepur', 'Dahod', 'Dang', 'Devbhumy Dwarka', 'Gandhinagar', 'Gir Somnath', 'Jamnagar', 'Junagadh', 'Kheda', 'Kutch', 'Mahisagar', 'Mehsana', 'Morbi', 'Narmada', 'Navsari', 'Panchmahal', 'Patan', 'Porbandar', 'Rajkot', 'Sabarkantha', 'Surat', 'Surendranagar', 'Tapi', 'Vadodara', 'Valsad'],
  'Haryana': ['Ambala', 'Bhiwani', 'Charkhi Dadri', 'Faridabad', 'Fatehabad', 'Gurugram', 'Hisar', 'Jhajjar', 'Jind', 'Kaithal', 'Karnal', 'Kurukshetra', 'Mahendragarh', 'Nuh', 'Palwal', 'Panchkula', 'Panipat', 'Rewari', 'Rohtak', 'Sirsa', 'Sonipat', 'Yamunanagar'],
  'Himachal Pradesh': ['Bilaspur', 'Chamba', 'Hamirpur', 'Kangra', 'Kinnaur', 'Kullu', 'Lahaul and Spiti', 'Mandi', 'Shimla', 'Sirmaur', 'Solan', 'Una'],
  'Jammu and Kashmir': ['Anantnag', 'Bandipora', 'Baramulla', 'Budgam', 'Doda', 'Ganderbal', 'Jammu', 'Kathua', 'Kishtwar', 'Kulgam', 'Kupwara', 'Mandy', 'Poonch', 'Pulwama', 'Rajouri', 'Ramban', 'Reasi', 'Samba', 'Shopian', 'Srinagar', 'Udhampur'],
  'Jharkhand': ['Bokaro', 'Chatra', 'Deoghar', 'Dhanbad', 'Dumka', 'East Singhbhum', 'Garhwa', 'Giridih', 'Godda', 'Gumla', 'Hazaribagh', 'Jamtara', 'Khunti', 'Koderma', 'Latehar', 'Lohardaga', 'Pakur', 'Palamu', 'Ramgarh', 'Ranchi', 'Sahibganj', 'Seraikela Kharsawan', 'Simdega', 'West Singhbhum'],
  'Karnataka': ['Bagalkot', 'Ballari', 'Belagavi', 'Bengaluru Rural', 'Bengaluru Urban', 'Bidar', 'Chamarajanagar', 'Chikkaballapur', 'Chikkamagaluru', 'Chitradurga', 'Dakshina Kannada', 'Davanagere', 'Dharwad', 'Gadag', 'Hassan', 'Haveri', 'Kalaburagi', 'Kodagu', 'Kolar', 'Koppal', 'Mandya', 'Mysuru', 'Raichur', 'Ramanagara', 'Shivamogga', 'Tumakuru', 'Udupi', 'Uttara Kannada', 'Vijayapura', 'Yadgir'],
  'Kerala': ['Alappuzha', 'Ernakulam', 'Idukki', 'Kannur', 'Kasaragod', 'Kollam', 'Kottayam', 'Kozhikode', 'Malappuram', 'Palakkad', 'Pathanamthitta', 'Thiruvananthapuram', 'Thrissur', 'Wayanad'],
  'Madhya Pradesh': ['Agar Malwa', 'Alirajpur', 'Anuppur', 'Ashoknagar', 'Balaghat', 'Barwani', 'Betul', 'Bhind', 'Bhopal', 'Burhanpur', 'Chhatarpur', 'Chhindwara', 'Damoh', 'Datia', 'Dewas', 'Dhar', 'Dindori', 'Guna', 'Gwalior', 'Harda', 'Hoshangabad', 'Indore', 'Jabalpur', 'Jhabua', 'Katni', 'Khandwa', 'Khargone', 'Mandla', 'Mandsaur', 'Morena', 'Narsinghpur', 'Neemuch', 'Panna', 'Raisen', 'Rajgarh', 'Ratlam', 'Rewa', 'Sagar', 'Satna', 'Sehore', 'Seoni', 'Shahdol', 'Shajapur', 'Sheopur', 'Shivpuri', 'Sidhi', 'Singrauli', 'Tikamgarh', 'Ujjain', 'Umaria', 'Vidisha'],
  'Maharashtra': ['Ahmednagar', 'Akola', 'Amravati', 'Aurangabad', 'Beed', 'Bhandara', 'Buldhana', 'Chandrapur', 'Dhule', 'Gadchiroli', 'Gondia', 'Hingoli', 'Jalgaon', 'Jalna', 'Kolhapur', 'Latur', 'Mumbai City', 'Mumbai Suburban', 'Nagpur', 'Nanded', 'Nandurbar', 'Nashik', 'Osmanabad', 'Palghar', 'Parbhani', 'Pune', 'Raigad', 'Ratnagiri', 'Sangli', 'Satara', 'Sindhudurg', 'Solapur', 'Thane', 'Wardha', 'Washim', 'Yavatmal'],
  'Manipur': ['Bishnupur', 'Chandel', 'Churachandpur', 'Imphal East', 'Imphal West', 'Jiribam', 'Kakching', 'Kamjong', 'Kangpokpi', 'Noney', 'Pherzawl', 'Senapati', 'Tamenglong', 'Tengnoupal', 'Thoubal', 'Ukhrul'],
  'Meghalaya': ['East Garo Hills', 'East Jaintia Hills', 'East Khasi Hills', 'North Garo Hills', 'Ri Bhoi', 'South Garo Hills', 'South West Garo Hills', 'South West Khasi Hills', 'West Garo Hills', 'West Jaintia Hills', 'West Khasi Hills'],
  'Mizoram': ['Aizawl', 'Champhai', 'Kolasib', 'Lawngtlai', 'Lunglei', 'Mamit', 'Saiha', 'Serchhip'],
  'Nagaland': ['Dimapur', 'Kiphire', 'Kohima', 'Longleng', 'Mokokchung', 'Mon', 'Peren', 'Phek', 'Tuensang', 'Wokha', 'Zunheboto'],
  'Odisha': ['Angul', 'Balangir', 'Balasore', 'Bargarh', 'Bhadrak', 'Boudh', 'Cuttack', 'Deogarh', 'Dhenkanal', 'Gajapati', 'Ganjam', 'Jagatsinghpur', 'Jajpur', 'Jharsuguda', 'Kalahandi', 'Kandhamal', 'Kendrapara', 'Kendujhar', 'Khordha', 'Koraput', 'Malkangiri', 'Mayurbhanj', 'Nabarangpur', 'Nayagarh', 'Nuapada', 'Puri', 'Rayagada', 'Sambalpur', 'Subarnapur', 'Sundargarh'],
  'Punjab': ['Amritsar', 'Barnala', 'Bathinda', 'Faridkot', 'Fatehgarh Sahib', 'Fazilka', 'Ferozepur', 'Gurdaspur', 'Hoshiarpur', 'Jalandhar', 'Kapurthala', 'Ludhiana', 'Mansa', 'Moga', 'Muktsar', 'Pathankot', 'Patiala', 'Rupnagar', 'Sahibzada Ajit Singh Nagar', 'Sangrur', 'Shahid Bhagat Singh Nagar', 'Sri Muktsar Sahib', 'Tarn Taran'],
  'Rajasthan': ['Ajmer', 'Alwar', 'Banswara', 'Baran', 'Barmer', 'Bharatpur', 'Bhilwara', 'Bikaner', 'Bundi', 'Chittorgarh', 'Churu', 'Dausa', 'Dholpur', 'Dungarpur', 'Hanumangarh', 'Jaipur', 'Jaisalmer', 'Jalore', 'Jhalawar', 'Jhunjhunu', 'Jodhpur', 'Karauli', 'Kota', 'Nagaur', 'Pali', 'Pratapgarh', 'Rajsamand', 'Sawai Madhopur', 'Sikar', 'Sirohi', 'Sri Ganganagar', 'Tonk', 'Udaipur'],
  'Sikkim': ['East Sikkim', 'North Sikkim', 'South Sikkim', 'West Sikkim'],
  'Tamil Nadu': ['Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore', 'Dharmapuri', 'Dindigul', 'Erode', 'Kallakurichi', 'Kanchipuram', 'Kanyakumari', 'Karur', 'Krishnagiri', 'Madurai', 'Mayiladuthurai', 'Nagapattinam', 'Namakkal', 'Nilgiris', 'Perambalur', 'Pudukkottai', 'Ramanathapuram', 'Ranipet', 'Salem', 'Sivaganga', 'Tenkasi', 'Thanjavur', 'Theni', 'Thoothukudi', 'Tiruchirappalli', 'Tirunelveli', 'Tirupathur', 'Tiruppur', 'Tiruvallur', 'Tiruvannamalai', 'Tiruvarur', 'Vellore', 'Viluppuram', 'Virudhunagar'],
  'Telangana': ['Adilabad', 'Bhadradri Kothagudem', 'Hyderabad', 'Jagtial', 'Jangaon', 'Jayashankar Bhupalpally', 'Jogulamba Gadwal', 'Kamareddy', 'Karimnagar', 'Khammam', 'Komaram Bheem Asifabad', 'Medak', 'Medchal-Malkajgiri', 'Mulugu', 'Nagarkurnool', 'Nalgonda', 'Narayanpet', 'Nirmal', 'Nizamabad', 'Peddapalli', 'Rajanna Sircilla', 'Rangareddy', 'Medak', 'Medchal-Malkajgiri', 'Mulugu', 'Nagarkurnool', 'Nalgonda', 'Narayanpet', 'Nirmal', 'Nizamabad', 'Peddapalli', 'Rajanna Sircilla', 'Rangareddy', 'Sangareddy', 'Siddipet', 'Suryapet', 'Vikarabad', 'Wanaparthy', 'Warangal Rural', 'Warangal Urban', 'Yadadri Bhuvanagiri'],
  'Tripura': ['Dhalai', 'Gomati', 'Khowai', 'North Tripura', 'Sepahijala', 'South Tripura', 'Unakoti', 'West Tripura'],
  'Uttar Pradesh': ['Agra', 'Aligarh', 'Allahabad', 'Ambedkar Nagar', 'Amethi', 'Amroha', 'Auraiya', 'Azamgarh', 'Baghpat', 'Bahraich', 'Ballia', 'Balrampur', 'Banda', 'Barabanki', 'Bareilly', 'Basti', 'Bhadohi', 'Bijnor', 'Budaun', 'Bulandshahr', 'Chandauli', 'Chitrakoot', 'Deoria', 'Etah', 'Etawah', 'Ayodhya', 'Farrukhabad', 'Fatehpur', 'Firozabad', 'Gautam Buddha Nagar', 'Ghaziabad', 'Ghazipur', 'Gonda', 'Gorakhpur', 'Hamirpur', 'Hapur', 'Hardoi', 'Hathras', 'Jalaun', 'Jaunpur', 'Jhansi', 'Kannauj', 'Kanpur Dehat', 'Kanpur Nagar', 'Kasganj', 'Kaushambi', 'Kheri', 'Kushinagar', 'Lalitpur', 'Lucknow', 'Maharajganj', 'Mahoba', 'Mainpuri', 'Mathura', 'Mau', 'Meerut', 'Mirzapur', 'Moradabad', 'Muzaffarnagar', 'Pilibhit', 'Pratapgarh', 'Raebareli', 'Rampur', 'Saharanpur', 'Sambhal', 'Sant Kabir Nagar', 'Shahjahanpur', 'Shamli', 'Shravasti', 'Siddharthnagar', 'Sitapur', 'Sonbhadra', 'Sultanpur', 'Unnao', 'Varanasi'],
  'Uttarakhand': ['Almora', 'Bageshwar', 'Chamoli', 'Champawat', 'Dehradun', 'Haridwar', 'Nainital', 'Pauri Garhwal', 'Pithoragarh', 'Rudraprayag', 'Tehri Garhwal', 'Udham Singh Nagar', 'Uttarkashi'],
  'West Bengal': ['Alipurduar', 'Bankura', 'Birbhum', 'Cooch Behar', 'Dakshin Dinajpur', 'Darjeeling', 'Hooghly', 'Howrah', 'Jalpaiguri', 'Jhargram', 'Kalimpong', 'Kolkata', 'Malda', 'Murshidabad', 'Nadia', 'North 24 Parganas', 'Paschim Medinipur', 'Paschim Bardhaman', 'Purba Bardhaman', 'Purba Medinipur', 'Purulia', 'South 24 Parganas', 'Uttar Dinajpur']
};

let locationCache = null;
let locationCacheTimestamp = 0;
const LOCATION_CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

async function populateLocationCache() {
  const apiKey = process.env.DATA_GOV_API_KEY;
  const isMockKey = !apiKey || apiKey === 'mock_mandi_api_key_123456' || apiKey === 'your_data_gov_in_api_key';

  const statesSet = new Set(Object.keys(fallbackStatesAndDistricts));
  const districtsMap = {};
  for (const [state, districts] of Object.entries(fallbackStatesAndDistricts)) {
    districtsMap[state] = new Set(districts);
  }

  if (!isMockKey) {
    try {
      console.log('[MandiService] Querying data.gov.in API for dynamic location list...');
      const response = await axios.get('https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070', {
        params: {
          'api-key': apiKey,
          format: 'json',
          limit: 2000
        },
        timeout: 10000
      });

      if (response.data && Array.isArray(response.data.records)) {
        for (const record of response.data.records) {
          if (record.state) {
            const state = sanitizeInput(record.state);
            statesSet.add(state);
            if (!districtsMap[state]) {
              districtsMap[state] = new Set();
            }
            if (record.district) {
              districtsMap[state].add(sanitizeInput(record.district));
            }
          }
        }
        console.log('[MandiService] Live location options successfully parsed.');
      }
    } catch (err) {
      console.error('[MandiService] Error fetching dynamic locations, falling back to static map:', err.message);
    }
  } else {
    // Merge mock records
    for (const record of mockMandiRecords) {
      if (record.state) {
        statesSet.add(record.state);
        if (!districtsMap[record.state]) {
          districtsMap[record.state] = new Set();
        }
        if (record.district) {
          districtsMap[record.state].add(record.district);
        }
      }
    }
  }

  const states = Array.from(statesSet).sort();
  const districts = {};
  for (const [state, distSet] of Object.entries(districtsMap)) {
    districts[state] = Array.from(distSet).sort();
  }

  locationCache = { states, districts };
  locationCacheTimestamp = Date.now();
}

async function getMandiStates() {
  if (!locationCache || Date.now() - locationCacheTimestamp > LOCATION_CACHE_TTL_MS) {
    await populateLocationCache();
  }
  return locationCache.states;
}

async function getMandiDistricts(state) {
  if (!locationCache || Date.now() - locationCacheTimestamp > LOCATION_CACHE_TTL_MS) {
    await populateLocationCache();
  }
  const cleanState = sanitizeInput(state);
  const matchedKey = Object.keys(locationCache.districts).find(
    key => key.toLowerCase() === cleanState.toLowerCase()
  );
  return matchedKey ? locationCache.districts[matchedKey] : [];
}

module.exports = {
  getMandiPrices,
  getMandiStates,
  getMandiDistricts,
  summarizeArrivalFreshness,
  refreshNationalMandiCache
};
