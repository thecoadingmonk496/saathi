import { mockCrops, mockPriceHistory, mockMandis } from '../utils/mockData';
import { calculateDistance } from '../utils/distanceUtils';

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5001' : '');
const apiBaseUrl = configuredBaseUrl.replace(/\/api\/auth\/?$/, '').replace(/\/$/, '');

export const marketService = {

  getGovernmentMandiPrices: async ({ commodity, state, district, market, limit = 50, offset = 0 } = {}) => {
    try {
      const params = new URLSearchParams();
      if (commodity) params.append('commodity', commodity);
      if (state) params.append('state', state);
      if (district) params.append('district', district);
      if (market) params.append('market', market);
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());

      const url = `${apiBaseUrl}/api/mandi-prices?${params.toString()}`;
      const response = await fetch(url).catch(() => null);
      if (!response || !response.ok) {
        console.warn(`Government Mandi API unavailable. Falling back to mock data.`);
        // Fallback mock data matching expected record format
        const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const records = mockCrops.map((crop, i) => {
          const mandi = mockMandis[i % mockMandis.length];
          const base = crop.basePrice;
          return {
            commodity: crop.name,
            variety: 'FAQ',
            market: market || mandi.name.replace(' Mandi', ''),
            district: district || mandi.district || 'Pune',
            state: state || mandi.state || 'Maharashtra',
            min_price: base - (base * 0.05),
            max_price: base + (base * 0.05),
            modal_price: base,
            arrival_date: today
          };
        });
        
        // Filter mock records if commodity was searched
        const filteredRecords = commodity ? records.filter(r => r.commodity.toLowerCase().includes(commodity.toLowerCase())) : records;
        
        return { success: true, records: filteredRecords };
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching government mandi prices:', error);
      return { success: false, records: [], message: error.message };
    }
  },

  getPriceHistory: async ({ commodity, district, state, market, days = 7 } = {}) => {
    try {
      const params = new URLSearchParams();
      if (commodity) params.append('commodity', commodity);
      if (district) params.append('district', district);
      if (state) params.append('state', state);
      if (market) params.append('market', market);
      params.append('days', days.toString());

      const url = `${apiBaseUrl}/api/price-history?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Price history API returned ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching price history:', error);
      return [];
    }
  },

  getGovernmentMandiStates: async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/mandi-prices/states`).catch(() => null);
      if (!response || !response.ok) {
        console.warn(`States API unavailable. Falling back to mock states.`);
        const states = [...new Set(mockMandis.map(m => m.state))].filter(Boolean);
        return states.length ? states : ['Maharashtra', 'Uttar Pradesh', 'Punjab'];
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching government mandi states:', error);
      return ['Maharashtra', 'Uttar Pradesh', 'Punjab'];
    }
  },

  getGovernmentMandiDistricts: async (state) => {
    try {
      if (!state) return [];
      const response = await fetch(`${apiBaseUrl}/api/mandi-prices/districts?state=${encodeURIComponent(state)}`).catch(() => null);
      if (!response || !response.ok) {
        console.warn(`Districts API unavailable. Falling back to mock districts.`);
        const districts = [...new Set(mockMandis.filter(m => m.state === state).map(m => m.district))].filter(Boolean);
        return districts.length ? districts : ['Pune', 'Nashik', 'Mumbai'];
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching government mandi districts:', error);
      return ['Pune', 'Nashik', 'Mumbai'];
    }
  },

  getMarketPrices: async (tab = 'Wholesale') => {

    return mockCrops.map(crop => {
      const history = mockPriceHistory.find(h => h.cropId === crop.id) || {};

      let price = null;
      if (tab === 'Retail') price = history.retail;
      else if (tab === 'MSP') price = history.msp;
      else price = history.wholesale; 

      const variation = price ? Math.max(50, Math.round((price * 0.05) / 10) * 10) : 0;

      const trend = crop.id % 3 === 0 ? 'down' : 'up'; 
      const trendPercent = crop.id % 3 === 0 ? -1.2 : 2.4;

      return {
        ...crop,
        currentPrice: price,
        minPrice: price ? price - variation : null,
        maxPrice: price ? price + variation : null,
        trend,
        trendPercent,
        updatedAt: history.date || new Date().toISOString().split('T')[0]
      };
    }).filter(c => c.currentPrice !== null && c.currentPrice !== undefined);
  },

  getPriceTrend: async (cropId) => {

    const currentPrice = mockPriceHistory.find(h => h.cropId === cropId)?.wholesale || 2000;
    const trend = [];
    const isUp = cropId % 3 !== 0;

    let tempPrice = isUp ? currentPrice - 150 : currentPrice + 100;

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      trend.push({
        date: date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        price: tempPrice
      });

      tempPrice += isUp ? Math.floor(Math.random() * 40) : -Math.floor(Math.random() * 30);
    }

    trend[6].price = currentPrice;

    return trend;
  },

  getNearbyMandis: async (cropId, lat, lng) => {
    if (!lat || !lng) return [];

    const crop = mockCrops.find(c => c.id === cropId);
    if (!crop) return [];

    const basePrice = mockPriceHistory.find(h => h.cropId === cropId)?.wholesale || crop.basePrice;

    const nearby = mockMandis.map(mandi => {
      const distance = calculateDistance(lat, lng, mandi.latitude, mandi.longitude);

      const priceVariation = Math.floor(Math.random() * 100) - 50; 

      return {
        ...mandi,
        distance,
        price: basePrice + priceVariation,
        updatedAt: 'Today'
      };
    });

    return nearby.sort((a, b) => a.distance - b.distance).slice(0, 4); 
  },

  getBuyerListings: async ({ commodity, state, district, limit = 20, offset = 0 } = {}) => {
    try {
      const params = new URLSearchParams();
      if (commodity) params.append('commodity', commodity);
      if (state) params.append('state', state);
      if (district) params.append('district', district);
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());

      const url = `${apiBaseUrl}/api/buyer-listings?${params.toString()}`;
      const response = await fetch(url).catch(() => null);
      
      if (!response || !response.ok) {
        console.warn(`Buyer listings API unavailable. Falling back to mock data.`);
        
        // Generate mock listings
        const mockListings = [];
        const cropsToUse = commodity ? [commodity] : ['Wheat', 'Paddy', 'Mustard', 'Cotton', 'Soyabean'];
        
        cropsToUse.forEach((crop, i) => {
          mockListings.push({
            _id: `mock-buyer-${i}`,
            buyer_name: `AgriCorp Regional Buyer ${i+1}`,
            buyer_type: 'Wholesaler',
            commodity: crop,
            variety: 'FAQ',
            market: 'Central Hub',
            district: district || 'Pune',
            state: state || 'Maharashtra',
            quantity_required: '500 quintals',
            remainingQuantity: 350,
            offered_price: 2150 + (i * 100),
            created_at: new Date().toISOString(),
            fulfillmentStatus: 'OPEN',
            is_demo: true
          });
        });

        return { success: true, listings: mockListings };
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching buyer listings:', error);
      return { success: false, listings: [], message: error.message };
    }
  }
};
