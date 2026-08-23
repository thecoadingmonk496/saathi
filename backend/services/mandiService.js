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
  'Telangana': ['Adilabad', 'Bhadradri Kothagudem', 'Hyderabad', 'Jagtial', 'Jangaon', 'Jayashankar Bhupalpally', 'Jogulamba Gadwal', 'Kamareddy', 'Karimnagar', 'Khammam', 'Komaram Bheem Asifabad', 'Mahabubabad', 'Mahabubnagar', 'Mancherial', 'Medak', 'Medchal-Malkajgiri', 'Mulugu', 'Nagarkurnool', 'Nalgonda', 'Narayanpet', 'Nirmal', 'Nizamabad', 'Peddapalli', 'Rajanna Sircilla', 'Rangareddy', 'Sangareddy', 'Siddipet', 'Suryapet', 'Vikarabad', 'Wanaparthy', 'Warangal Rural', 'Warangal Urban', 'Yadadri Bhuvanagiri'],
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
  getMandiDistricts
};

