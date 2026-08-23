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
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Government Mandi API returned ${response.status}`);
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
      const response = await fetch(`${apiBaseUrl}/api/mandi-prices/states`);
      if (!response.ok) throw new Error(`States API returned ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching government mandi states:', error);
      return [];
    }
  },

  getGovernmentMandiDistricts: async (state) => {
    try {
      if (!state) return [];
      const response = await fetch(`${apiBaseUrl}/api/mandi-prices/districts?state=${encodeURIComponent(state)}`);
      if (!response.ok) throw new Error(`Districts API returned ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching government mandi districts:', error);
      return [];
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
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Buyer listings API returned ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching buyer listings:', error);
      return { success: false, listings: [], message: error.message };
    }
  }
};
