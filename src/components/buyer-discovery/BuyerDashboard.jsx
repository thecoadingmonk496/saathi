import { useState, useEffect } from 'react';
import { useUser } from '../../context/UserContext';
import DealTracker from './DealTracker';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5001' : '')).replace(/\/$/, '') + '/api';

export default function BuyerDashboard() {
  const { user } = useUser();
  const [requests, setRequests] = useState([]);
  const [deals, setDeals] = useState([]);
  const [newRequest, setNewRequest] = useState({ crop: '', quantity: '', offeredPrice: '', location: '', description: '' });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('requests'); // 'requests', 'deals'
  const [activeOffers, setActiveOffers] = useState(null); // Which request's offers to show

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const reqRes = await fetch(`${API_BASE}/buyer-discovery/requests/mine`, {
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

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/buyer-discovery/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...newRequest, unit: 'quintals' })
    });
    const data = await res.json();
    if (data.success) {
      setNewRequest({ crop: '', quantity: '', offeredPrice: '', location: '', description: '' });
      fetchData();
    } else {
      alert(data.message || 'Error creating request');
    }
  };

  const loadOffers = async (requestId) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/buyer-discovery/requests/${requestId}/offers`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success) {
      setActiveOffers({ requestId, offers: data.data });
    }
  };

  const handleOfferAction = async (offerId, action) => { // action: 'accept', 'reject', 'ignore'
    const token = localStorage.getItem('token');
    await fetch(`${API_BASE}/buyer-discovery/offers/${offerId}/${action}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    // refresh
    if (activeOffers) {
      loadOffers(activeOffers.requestId);
    }
    fetchData();
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING_REVIEW': return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-md text-xs">Pending Review</span>;
      case 'PUBLISHED': return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-md text-xs">Published</span>;
      default: return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-md text-xs">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex border-b border-[var(--saathi-border-light)]">
        <button 
          className={`px-4 py-2 ${activeTab === 'requests' ? 'border-b-2 border-[var(--saathi-primary)] font-bold text-[var(--saathi-primary)]' : 'text-gray-500'}`}
          onClick={() => setActiveTab('requests')}
        >
          My Requests & Offers
        </button>
        <button 
          className={`px-4 py-2 ${activeTab === 'deals' ? 'border-b-2 border-[var(--saathi-primary)] font-bold text-[var(--saathi-primary)]' : 'text-gray-500'}`}
          onClick={() => setActiveTab('deals')}
        >
          Active Deals ({deals.length})
        </button>
      </div>

      {activeTab === 'requests' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Create Request Form */}
          <div className="bg-white p-6 rounded-lg shadow border border-[var(--saathi-border-light)]">
            <h2 className="text-xl font-bold mb-4">Post a Crop Request</h2>
            <form onSubmit={handleCreateRequest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium">Crop Type</label>
                <input required type="text" className="w-full mt-1 p-2 border rounded" value={newRequest.crop} onChange={e => setNewRequest({...newRequest, crop: e.target.value})} placeholder="e.g. Wheat" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium">Quantity (qtl)</label>
                  <input required type="number" min="1" className="w-full mt-1 p-2 border rounded" value={newRequest.quantity} onChange={e => setNewRequest({...newRequest, quantity: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium">Offer Price (₹/qtl)</label>
                  <input required type="number" min="1" className="w-full mt-1 p-2 border rounded" value={newRequest.offeredPrice} onChange={e => setNewRequest({...newRequest, offeredPrice: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium">Delivery Location</label>
                <input required type="text" className="w-full mt-1 p-2 border rounded" value={newRequest.location} onChange={e => setNewRequest({...newRequest, location: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium">Details/Requirements</label>
                <textarea className="w-full mt-1 p-2 border rounded" value={newRequest.description} onChange={e => setNewRequest({...newRequest, description: e.target.value})} />
              </div>
              <button type="submit" className="w-full bg-[var(--saathi-primary)] text-white py-2 rounded-lg font-bold hover:brightness-110">Submit Request</button>
            </form>
          </div>

          {/* List of Requests & Offers */}
          <div className="bg-white p-6 rounded-lg shadow border border-[var(--saathi-border-light)] overflow-y-auto" style={{ maxHeight: '600px' }}>
            <h2 className="text-xl font-bold mb-4">My Requests</h2>
            {loading ? <p>Loading...</p> : requests.length === 0 ? <p>No requests posted yet.</p> : (
              <div className="space-y-4">
                {requests.map(req => (
                  <div key={req._id} className="border p-4 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg">{req.crop} - {req.quantity} qtl</h3>
                        <p className="text-sm text-gray-500">₹{req.offeredPrice}/qtl • {req.location}</p>
                      </div>
                      {getStatusBadge(req.status)}
                    </div>
                    {req.status === 'PUBLISHED' && (
                      <button 
                        onClick={() => loadOffers(req._id)}
                        className="mt-3 text-sm text-[var(--saathi-accent)] font-semibold hover:underline"
                      >
                        View Farmer Offers
                      </button>
                    )}

                    {/* Offers Panel */}
                    {activeOffers && activeOffers.requestId === req._id && (
                      <div className="mt-4 pt-4 border-t bg-gray-50 p-3 rounded">
                        <h4 className="font-bold mb-2">Farmer Offers</h4>
                        {activeOffers.offers.length === 0 && <p className="text-sm text-gray-500">No offers yet.</p>}
                        {activeOffers.offers.map(offer => (
                          <div key={offer._id} className="mb-3 p-3 bg-white border rounded shadow-sm">
                            <p><strong>{offer.farmerId?.firstName} {offer.farmerId?.lastName}</strong></p>
                            <p className="text-sm">Offered: {offer.quantity} qtl at ₹{offer.counterOfferPrice || req.offeredPrice}/qtl</p>
                            {offer.message && <p className="text-sm italic">"{offer.message}"</p>}
                            
                            {offer.status === 'PENDING' ? (
                              <div className="flex gap-2 mt-2">
                                <button onClick={() => handleOfferAction(offer._id, 'accept')} className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700">Accept</button>
                                <button onClick={() => handleOfferAction(offer._id, 'reject')} className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">Reject</button>
                                <button onClick={() => handleOfferAction(offer._id, 'ignore')} className="px-3 py-1 bg-gray-300 text-gray-800 rounded text-sm hover:bg-gray-400">Ignore</button>
                              </div>
                            ) : (
                              <span className="mt-2 inline-block text-xs font-bold px-2 py-1 bg-gray-200 rounded">{offer.status}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'deals' && (
        <div className="space-y-6">
          {deals.length === 0 ? <p className="bg-white p-6 rounded shadow text-center">No active deals.</p> : 
            deals.map(deal => <DealTracker key={deal._id} deal={deal} userRole="BUYER" onRefresh={fetchData} />)
          }
        </div>
      )}
    </div>
  );
}
