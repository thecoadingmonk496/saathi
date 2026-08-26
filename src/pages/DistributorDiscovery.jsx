import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useUser } from '../context/UserContext';
import { Truck, CheckCircle, Package, MapPin } from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5001' : '')).replace(/\/$/, '') + '/api';

export default function DistributorDiscovery() {
  const { token, user } = useUser();
  const [distributors, setDistributors] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedDistributor, setSelectedDistributor] = useState(null);
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
      const [dRes, iRes] = await Promise.all([
        axios.get(`${API_BASE}/distributors`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_BASE}/inventory`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setDistributors(dRes.data.distributors || []);
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
        targetBuyerId: selectedDistributor._id,
        quantity: parseFloat(quantity),
        product: selectedCrop,
        price: parseFloat(price),
        location: 'Wholesaler Location',
        stage: 'WHOLESALER_TO_DISTRIBUTOR'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess('Proposal sent successfully!');
      setTimeout(() => {
        setSuccess('');
        setSelectedDistributor(null);
        setSelectedCrop('');
        setQuantity('');
        setPrice('');
      }, 2000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to send proposal');
    }
  };

  if (loading) return <div className="p-8 text-center text-[var(--saathi-primary)] font-semibold text-lg animate-pulse">Loading distributors...</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-24">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-[var(--saathi-primary)] flex items-center justify-center shadow-lg shadow-md">
          <Truck className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--saathi-primary)] tracking-tight">Distributor Network</h1>
          <p className="text-base font-semibold text-[var(--saathi-text-secondary)] mt-1.5">Connect and sell your inventory downstream</p>
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

      {selectedDistributor ? (
        <div className="bg-white rounded-2xl shadow-sm border border-[var(--saathi-border-light)]/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-extrabold text-[var(--saathi-text)] tracking-tight">New Proposal to {selectedDistributor.firstName} {selectedDistributor.lastName}</h2>
            <button 
              onClick={() => setSelectedDistributor(null)}
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
                  required
                  min="0.1"
                  step="0.1"
                  max={maxAvailable}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[var(--saathi-border-light)] focus:ring-2 focus:border-[var(--saathi-primary)]"
                  placeholder="e.g. 50"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[var(--saathi-text-secondary)] mb-2">Proposed Price (₹/q)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[var(--saathi-border-light)] focus:ring-2 focus:border-[var(--saathi-primary)]"
                  placeholder="e.g. 2400"
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full mt-6 bg-[var(--saathi-primary)] text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-md hover:shadow-xl hover:shadow-md transition-all active:scale-[0.98]"
            >
              Send Proposal
            </button>
          </form>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {distributors.length === 0 ? (
            <div className="col-span-2 text-center py-12 text-[var(--saathi-text-muted)] font-medium">No distributors found.</div>
          ) : (
            distributors.map(d => (
              <div key={d._id} className="bg-white rounded-2xl shadow-sm border border-[var(--saathi-border-light)]/50 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-[var(--saathi-text)]">{d.firstName} {d.lastName}</h3>
                    <p className="text-sm text-[var(--saathi-primary)] font-medium mt-0.5">Distributor</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-[var(--saathi-surface-alt)] flex items-center justify-center text-[var(--saathi-primary)] font-bold">
                    {d.firstName[0]}{d.lastName[0]}
                  </div>
                </div>
                
                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-sm text-[var(--saathi-text-secondary)]">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>State Distributor</span>
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedDistributor(d)}
                  className="w-full py-2.5 rounded-xl border-2 border-[var(--saathi-primary)] text-[var(--saathi-primary)] font-semibold hover:bg-[var(--saathi-surface-alt)] transition-colors"
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
