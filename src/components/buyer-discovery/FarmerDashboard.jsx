import { useState, useEffect } from 'react';
import { useUser } from '../../context/UserContext';
import DealTracker from './DealTracker';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5001' : '')).replace(/\/$/, '') + '/api';

export default function FarmerDashboard() {
  const { user } = useUser();
  const [requests, setRequests] = useState([]);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('browse'); // 'browse', 'deals'
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [offerForm, setOfferForm] = useState({ quantity: '', counterOfferPrice: '', message: '' });

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const reqRes = await fetch(`${API_BASE}/buyer-discovery/requests/published`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const reqData = await reqRes.json();
      if (reqData.success) setRequests(reqData.data);

      const dealRes = await fetch(`${API_BASE}/buyer-discovery/deals`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const dealData = await dealRes.json();
      if (dealData.success) setDeals(dealData.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleMakeOffer = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/buyer-discovery/requests/${selectedRequest._id}/offers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(offerForm)
    });
    const data = await res.json();
    if (data.success) {
      setSelectedRequest(null);
      setOfferForm({ quantity: '', counterOfferPrice: '', message: '' });
      alert('Offer submitted successfully! Waiting for buyer to accept.');
    } else {
      alert(data.message || 'Error submitting offer');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex border-b border-[var(--saathi-border-light)]">
        <button 
          className={`px-4 py-2 ${activeTab === 'browse' ? 'border-b-2 border-[var(--saathi-primary)] font-bold text-[var(--saathi-primary)]' : 'text-gray-500'}`}
          onClick={() => setActiveTab('browse')}
        >
          Browse Market
        </button>
        <button 
          className={`px-4 py-2 ${activeTab === 'deals' ? 'border-b-2 border-[var(--saathi-primary)] font-bold text-[var(--saathi-primary)]' : 'text-gray-500'}`}
          onClick={() => setActiveTab('deals')}
        >
          My Deals ({deals.length})
        </button>
      </div>

      {activeTab === 'browse' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow border border-[var(--saathi-border-light)]">
            <h2 className="text-xl font-bold mb-4">Current Buyer Requests</h2>
            {loading ? <p>Loading...</p> : requests.length === 0 ? <p>No active requests found.</p> : (
              <div className="space-y-4">
                {requests.map(req => (
                  <div key={req._id} className="border p-4 rounded-lg hover:shadow-md transition">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg text-[var(--saathi-primary)]">{req.crop} - {req.quantity} qtl</h3>
                        <p className="text-sm font-semibold">Offer: ₹{req.offeredPrice}/qtl</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Buyer: {req.buyerId?.firstName} {req.buyerId?.lastName?.charAt(0)}. <br/>
                          Location: {req.location || req.buyerId?.district || 'Not specified'}
                        </p>
                        <p className="text-sm mt-2">{req.description}</p>
                      </div>
                      <button 
                        onClick={() => { setSelectedRequest(req); setOfferForm({ quantity: req.quantity, counterOfferPrice: req.offeredPrice, message: '' }); }}
                        className="bg-[var(--saathi-accent)] text-white px-3 py-1 rounded text-sm hover:brightness-110"
                      >
                        Make Offer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedRequest && (
            <div className="bg-white p-6 rounded-lg shadow border border-[var(--saathi-border-light)] sticky top-4">
              <h2 className="text-xl font-bold mb-4">Submit Offer for {selectedRequest.crop}</h2>
              <form onSubmit={handleMakeOffer} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium">Quantity you can supply (qtl)</label>
                  <input required type="number" min="1" max={selectedRequest.quantity} className="w-full mt-1 p-2 border rounded" value={offerForm.quantity} onChange={e => setOfferForm({...offerForm, quantity: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium">Your Price (₹/qtl)</label>
                  <input required type="number" min="1" className="w-full mt-1 p-2 border rounded" value={offerForm.counterOfferPrice} onChange={e => setOfferForm({...offerForm, counterOfferPrice: e.target.value})} />
                  <p className="text-xs text-gray-500 mt-1">Buyer is offering ₹{selectedRequest.offeredPrice}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium">Message to Buyer</label>
                  <textarea className="w-full mt-1 p-2 border rounded" value={offerForm.message} onChange={e => setOfferForm({...offerForm, message: e.target.value})} placeholder="E.g. Fresh harvest, ready to transport tomorrow." />
                </div>
                <div className="flex gap-3">
                  <button type="submit" className="flex-1 bg-[var(--saathi-primary)] text-white py-2 rounded-lg font-bold">Submit</button>
                  <button type="button" onClick={() => setSelectedRequest(null)} className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg font-bold">Cancel</button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {activeTab === 'deals' && (
        <div className="space-y-6">
          {deals.length === 0 ? <p className="bg-white p-6 rounded shadow text-center">No active deals.</p> : 
            deals.map(deal => <DealTracker key={deal._id} deal={deal} userRole="FARMER" onRefresh={fetchData} />)
          }
        </div>
      )}
    </div>
  );
}
