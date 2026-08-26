import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useUser } from '../context/UserContext';
import { Check, X, ShoppingBag } from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5001' : '')).replace(/\/$/, '') + '/api';

export default function ConsumerOrders() {
  const { token } = useUser();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    fetchOrders();
  }, [token]);

  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${API_BASE}/purchase-orders/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(res.data.orders || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch incoming orders');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (orderId, action) => {
    try {
      await axios.post(`${API_BASE}/purchase-orders/${orderId}/${action}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.message || `Failed to ${action} order`);
    }
  };

  if (loading) return <div className="p-8 text-center text-[var(--saathi-primary)] font-semibold animate-pulse">Loading orders...</div>;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 pb-24">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-[var(--saathi-primary)] flex items-center justify-center shadow-lg shadow-md">
          <ShoppingBag className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--saathi-primary)] tracking-tight">Your Purchases</h1>
          <p className="text-base font-semibold text-[var(--saathi-text-secondary)] mt-1.5">Review and approve purchases from Retailers</p>
        </div>
      </div>

      {error && <div className="mb-6 text-red-600 font-medium p-4 bg-red-50 rounded-xl">{error}</div>}

      <div className="space-y-4">
        {orders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm text-[var(--saathi-text-muted)] font-medium">
            No pending purchases found.
          </div>
        ) : (
          orders.map(order => (
            <div key={order._id} className="bg-white rounded-2xl shadow-sm border border-[var(--saathi-border-light)]/50 p-5 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition-shadow">
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 flex-1">
                <div>
                  <p className="text-xs text-[var(--saathi-text-muted)] font-medium mb-1">Seller (Retailer)</p>
                  <p className="font-semibold text-[var(--saathi-text)]">{order.sellerId?.firstName} {order.sellerId?.lastName}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--saathi-text-muted)] font-medium mb-1">Product</p>
                  <p className="font-semibold text-[var(--saathi-text)]">{order.product}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--saathi-text-muted)] font-medium mb-1">Quantity</p>
                  <p className="font-semibold text-[var(--saathi-primary)]">{order.quantity} q</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--saathi-text-muted)] font-medium mb-1">Total Price</p>
                  <p className="font-semibold text-[var(--saathi-text)]">₹{order.price * order.quantity}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-gray-100">
                <button
                  onClick={() => handleAction(order._id, 'approve')}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--saathi-primary)] text-white font-semibold shadow-lg shadow-md hover:bg-[var(--saathi-primary)] transition-colors"
                >
                  <Check className="w-4 h-4" /> Confirm Purchase
                </button>
                <button
                  onClick={() => handleAction(order._id, 'reject')}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-red-50 text-red-600 font-semibold hover:bg-red-100 transition-colors"
                >
                  <X className="w-4 h-4" /> Cancel
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
