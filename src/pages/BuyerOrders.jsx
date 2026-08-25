const API_BASE = (import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5001' : '')).replace(/\/$/, '') + '/api';

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { CheckCircle, XCircle, PackageOpen } from 'lucide-react';

export default function BuyerOrders() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('saathi_token');
      const res = await fetch('${API_BASE}/api/purchase-orders/pending', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    }
    setLoading(false);
  };

  const handleAction = async (orderId, action) => {
    try {
      const token = localStorage.getItem('saathi_token');
      const res = await fetch(`${API_BASE}/api/purchase-orders/${orderId}/${action}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        if (action === 'approve') {
          alert('Transaction recorded successfully!');
          navigate(`/explorer?batchId=${data.transaction.batchId}`);
        } else {
          alert('Order rejected.');
          fetchOrders(); // Refresh list
        }
      } else {
        alert(data.message || 'Action failed.');
      }
    } catch (err) {
      alert('Error performing action.');
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[var(--saathi-surface-alt)] pt-24 px-6 text-center">Loading pending orders...</div>;
  }

  return (
    <div className="min-h-screen bg-[var(--saathi-surface-alt)] pt-24 pb-12">
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="text-3xl font-black text-[var(--saathi-text)] mb-2">Pending Proposals</h1>
        <p className="text-[var(--saathi-text-muted)] mb-8">Review incoming sales proposals from farmers.</p>

        {orders.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-[var(--saathi-border-light)] text-center shadow-sm">
            <PackageOpen className="mx-auto h-16 w-16 text-slate-300 mb-4" />
            <h2 className="text-xl font-bold text-[var(--saathi-text-secondary)]">No pending proposals</h2>
            <p className="text-[var(--saathi-text-muted)] mt-2">You currently have no incoming proposals for your listings.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map(order => (
              <div key={order._id} className="bg-white p-6 rounded-3xl border border-[var(--saathi-border-light)] shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full uppercase tracking-wider">
                      {order.status}
                    </span>
                    {order.listingId?.is_demo && (
                      <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-bold rounded-full uppercase tracking-wider">
                        DEMO LISTING
                      </span>
                    )}
                  </div>
                  
                  <h3 className="text-xl font-black text-[var(--saathi-text)]">{order.product}</h3>
                  <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-[var(--saathi-text-muted)] font-semibold uppercase text-[10px]">Farmer</p>
                      <p className="font-bold text-[var(--saathi-text)]">{order.sellerId?.firstName} {order.sellerId?.lastName}</p>
                    </div>
                    <div>
                      <p className="text-[var(--saathi-text-muted)] font-semibold uppercase text-[10px]">Price</p>
                      <p className="font-bold text-[var(--saathi-primary)]">₹{order.price.toLocaleString('en-IN')}/qtl</p>
                    </div>
                    <div>
                      <p className="text-[var(--saathi-text-muted)] font-semibold uppercase text-[10px]">Location</p>
                      <p className="font-bold text-[var(--saathi-text)] truncate" title={order.location}>{order.location}</p>
                    </div>
                  </div>

                  {/* Fulfillment Context block */}
                  <div className="mt-4 bg-[var(--saathi-surface-alt)] border border-[var(--saathi-border-light)] rounded-2xl p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--saathi-text-muted)] mb-2">Order Fulfillment Context</p>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                      <div>
                        <span className="text-[var(--saathi-text-muted)]">Requested: </span>
                        <span className="font-bold text-[var(--saathi-text)]">{order.listingId?.requestedQuantity} qtl</span>
                      </div>
                      <div>
                        <span className="text-[var(--saathi-text-muted)]">Already Fulfilled: </span>
                        <span className="font-bold text-[var(--saathi-primary)]">{order.listingId?.acceptedQuantity} qtl</span>
                      </div>
                      <div>
                        <span className="text-[var(--saathi-text-muted)]">Remaining: </span>
                        <span className="font-bold text-amber-600">{order.listingId?.remainingQuantity} qtl</span>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-[var(--saathi-border-light)]">
                      <span className="text-sm font-semibold text-[var(--saathi-text-secondary)]">Proposed Quantity: </span>
                      <span className="text-lg font-black text-[var(--saathi-text)]">{order.quantity} qtl</span>
                      {order.quantity > (order.listingId?.remainingQuantity || 0) && (
                        <span className="ml-2 text-xs font-bold text-red-600 uppercase">⚠️ Exceeds Remaining</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-row md:flex-col gap-3 w-full md:w-48 shrink-0">
                  <button
                    onClick={() => handleAction(order._id, 'approve')}
                    disabled={order.quantity > (order.listingId?.remainingQuantity || 0)}
                    className="flex-1 flex items-center justify-center gap-2 bg-[var(--saathi-primary)] text-white py-3 px-4 rounded-xl font-bold hover:bg-[var(--saathi-primary-hover)] transition disabled:bg-slate-300 disabled:cursor-not-allowed"
                  >
                    <CheckCircle className="h-5 w-5" /> Approve
                  </button>
                  <button
                    onClick={() => handleAction(order._id, 'reject')}
                    className="flex-1 flex items-center justify-center gap-2 bg-white border border-rose-200 text-rose-600 py-3 px-4 rounded-xl font-bold hover:bg-rose-50 transition"
                  >
                    <XCircle className="h-5 w-5" /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
