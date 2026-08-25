import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useUser } from '../context/UserContext';
import { Store, CheckCircle, Package, MapPin } from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5001' : '')).replace(/\/$/, '') + '/api';

export default function RetailerDiscovery() {
  const { token, user } = useUser();
  const [retailers, setRetailers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedRetailer, setSelectedRetailer] = useState(null);
  const [selectedCrop, setSelectedCrop] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      const [rRes, iRes] = await Promise.all([
        axios.get(`${API_BASE}/retailers`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_BASE}/inventory`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setRetailers(rRes.data.retailers || []);
      setInventory(iRes.data.inventory || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const getAvailableCrops = () => {
    const crops = {};
    inventory.forEach(lot => {
      if (!crops[lot.crop]) crops[lot.crop] = 0;
      crops[lot.crop] += lot.availableQuantity;
    });
    return Object.entries(crops).map(([crop, qty]) => ({ crop, qty }));
  };

  const availableCrops = getAvailableCrops();
  const maxAvailable = availableCrops.find(c => c.crop === selectedCrop)?.qty || 0;

  const handlePropose = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (parseFloat(quantity) > maxAvailable) {
      setError(`Cannot propose more than available inventory (${maxAvailable}q)`);
      return;
    }

    try {
      await axios.post(`${API_BASE}/purchase-orders`, {
        targetBuyerId: selectedRetailer._id,
        quantity: parseFloat(quantity),
        product: selectedCrop,
        price: parseFloat(price),
        location: 'Distributor Location',
        stage: 'DISTRIBUTOR_TO_RETAILER'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess('Proposal sent successfully!');
      setTimeout(() => {
        setSuccess('');
        setSelectedRetailer(null);
        setSelectedCrop('');
        setQuantity('');
        setPrice('');
      }, 2000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to send proposal');
    }
  };

  if (loading) return <div className="p-8 text-center text-[var(--saathi-primary)] font-semibold text-lg animate-pulse">Loading retailers...</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-24">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-[var(--saathi-primary)] flex items-center justify-center shadow-lg shadow-md">
          <Store className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--saathi-primary)] tracking-tight">Retailer Network</h1>
          <p className="text-base font-semibold text-[var(--saathi-text-secondary)] mt-1.5">Connect and sell your inventory downstream to Retailers</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 font-medium">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 rounded-xl bg-[var(--saathi-surface-alt)] border border-[var(--saathi-border-light)] text-[var(--saathi-primary)] font-medium flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          {success}
        </div>
      )}

      {selectedRetailer ? (
        <div className="bg-white rounded-2xl shadow-sm border border-[var(--saathi-border-light)]/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-extrabold text-[var(--saathi-text)] tracking-tight">New Proposal to {selectedRetailer.firstName} {selectedRetailer.lastName}</h2>
            <button 
              onClick={() => setSelectedRetailer(null)}
              className="text-sm font-medium text-[var(--saathi-primary)] hover:opacity-80"
            >
              Back to List
            </button>
          </div>

          <form onSubmit={handlePropose} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-[var(--saathi-text-secondary)] mb-2">Select Crop from Inventory</label>
              <select 
                value={selectedCrop}
                onChange={(e) => setSelectedCrop(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-[var(--saathi-border-light)] focus:ring-2 focus:border-[var(--saathi-primary)]"
              >
                <option value="">Choose a crop...</option>
                {availableCrops.map(c => (
                  <option key={c.crop} value={c.crop}>{c.crop} ({c.qty}q available)</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[var(--saathi-text-secondary)] mb-2">Quantity (quintals)</label>
                <input 
                  type="number" 
                  step="0.01"
                  min="0.01"
                  max={maxAvailable || undefined}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-[var(--saathi-border-light)] focus:ring-2 focus:border-[var(--saathi-primary)]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[var(--saathi-text-secondary)] mb-2">Proposed Price (₹)</label>
                <input 
                  type="number"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-[var(--saathi-border-light)] focus:ring-2 focus:border-[var(--saathi-primary)]"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={!selectedCrop || parseFloat(quantity) > maxAvailable}
              className="w-full py-4 mt-4 bg-[var(--saathi-primary)] hover:bg-[var(--saathi-primary-hover)] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors shadow-lg shadow-md"
            >
              Propose Sale (Pending Retailer Approval)
            </button>
          </form>
        </div>
      ) : (
        <div className="grid gap-4">
          {retailers.length === 0 ? (
            <div className="p-8 text-center bg-[var(--saathi-surface-alt)] rounded-2xl border border-gray-100">
              <p className="text-[var(--saathi-text-muted)] font-medium">No retailers found in the network.</p>
            </div>
          ) : (
            retailers.map(r => (
              <div key={r._id} className="bg-white p-5 rounded-2xl shadow-sm border border-[var(--saathi-border-light)] hover:border-[var(--saathi-border)] transition-colors flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[var(--saathi-border-light)] flex items-center justify-center text-[var(--saathi-primary)] font-bold text-lg">
                    {r.firstName[0]}
                  </div>
                  <div>
                    <h3 className="font-bold text-[var(--saathi-text)] text-lg">{r.firstName} {r.lastName}</h3>
                    <div className="flex items-center gap-3 mt-1 text-sm text-[var(--saathi-text-muted)]">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" /> Retailer
                      </span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedRetailer(r)}
                  className="px-6 py-2.5 bg-[var(--saathi-surface-alt)] hover:bg-[var(--saathi-border-light)] text-[var(--saathi-primary)] font-semibold rounded-xl transition-colors"
                >
                  Propose Sale
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
