import { useState, useEffect } from 'react';
import { useUser } from '../../context/UserContext';
import DealTracker from './DealTracker';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5001' : '')).replace(/\/$/, '') + '/api';

/* ── tiny helpers ── */
function Badge({ children, variant = 'default' }) {
  const styles = {
    accepted: 'bg-green-100 text-green-800 border border-green-300',
    pending: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
    countered: 'bg-red-100 text-red-800 border border-red-300',
    default: 'bg-gray-100 text-gray-700 border border-gray-200',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${styles[variant] || styles.default}`}>
      ● {children}
    </span>
  );
}


const CROP_IMAGES = {
  wheat: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600&q=80',
  paddy: 'https://images.unsplash.com/photo-1536054428027-3b9fc70cb2d3?w=600&q=80',
  rice: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&q=80',
  maize: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=600&q=80',
  corn: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=600&q=80',
  soybean: 'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=600&q=80',
  cotton: 'https://images.unsplash.com/photo-1601593346740-925612772716?w=600&q=80',
  sugarcane: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600&q=80',
  tomato: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&q=80',
  onion: 'https://images.unsplash.com/photo-1569870499705-504209102861?w=600&q=80',
  potato: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&q=80',
  default: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=80',
};

const formatTimeAgo = (dateString) => {
  if (!dateString) return 'recently';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears} year${diffInYears > 1 ? 's' : ''} ago`;
};

const getCropImage = (pub) => {
  if (pub.cropImage) return pub.cropImage;
  if (!pub.crop) return CROP_IMAGES.default;
  const key = pub.crop.toLowerCase().split(' ')[0];
  return CROP_IMAGES[key] || CROP_IMAGES.default;
};

/* ════════════════════════════════════════════════════════════ */
export default function FarmerDashboard() {
  const { user } = useUser();
  const [requests, setRequests] = useState([]);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('browse');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [offerForm, setOfferForm] = useState({ quantity: '', counterOfferPrice: '', message: '', declaration: false });
  const [myOffers, setMyOffers] = useState([]);
  const [showAllOffers, setShowAllOffers] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [sortOrder, setSortOrder] = useState('recent');
  const [browseSortOrder, setBrowseSortOrder] = useState('recent');
  const [searchQuery, setSearchQuery] = useState('');

  
  const [counterForms, setCounterForms] = useState({});

  const handleOfferAction = async (offerId, action, payload = null) => {
    const token = localStorage.getItem('token');
    const options = {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    };
    if (payload) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(payload);
    }
    const res = await fetch(`${API_BASE}/buyer-discovery/offers/${offerId}/${action}`, options);
    const data = await res.json();
    if (data.success) {
      fetchData();
      setCounterForms({ ...counterForms, [offerId]: null }); // close form
    } else {
      alert(data.message || 'Error processing action');
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const reqRes = await fetch(`${API_BASE}/buyer-discovery/requests/published`, { headers: { Authorization: `Bearer ${token}` } });
      const reqData = await reqRes.json();
      if (reqData.success) setRequests(reqData.data);

      const dealRes = await fetch(`${API_BASE}/buyer-discovery/deals`, { headers: { Authorization: `Bearer ${token}` } });
      const dealData = await dealRes.json();
      if (dealData.success) setDeals(dealData.data);

      const offerRes = await fetch(`${API_BASE}/buyer-discovery/offers/mine`, { headers: { Authorization: `Bearer ${token}` } });
      const offerData = await offerRes.json();
      if (offerData.success) setMyOffers(offerData.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleMakeOffer = async (e) => {
    e.preventDefault();
    if (!offerForm.declaration) {
      alert('Please accept the Quality Assurance Declaration.');
      return;
    }
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/buyer-discovery/requests/${selectedRequest._id}/offers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ quantity: offerForm.quantity, counterOfferPrice: offerForm.counterOfferPrice, message: offerForm.message }),
    });
    const data = await res.json();
    if (data.success) {
      setSelectedRequest(null);
      setOfferForm({ quantity: '', counterOfferPrice: '', message: '', declaration: false });
      fetchData();
    } else {
      alert(data.message || 'Error submitting offer');
    }
  };

  const selectRequest = (req) => {
    setSelectedRequest(req);
    setOfferForm({ quantity: '', counterOfferPrice: '', message: '', declaration: false });
  };

  /* ── render ── */
  return (
    <div className="space-y-6">
      {/* ─── Tabs ─── */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {[
          { key: 'browse', label: 'Browse Requests' },
          { key: 'deals', label: `My Deals (${deals.length})` },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-5 py-3 text-sm font-bold transition-colors border-b-2 ${
              activeTab === t.key
                ? 'border-red-700 text-red-800'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ════════ Browse Requests Tab ════════ */}
      {activeTab === 'browse' && (
        <>
          {loading ? (
            <p className="text-center text-gray-400 py-10">Loading requests…</p>
          ) : selectedRequest ? (
            /* ── Buyer Request Details View ── */
            <div className="space-y-6">
              <button onClick={() => setSelectedRequest(null)} className="text-sm font-bold text-[#1a3a2a] hover:underline flex items-center gap-2">
                <span>←</span> Back to all requests
              </button>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* LEFT COLUMN: Request Details + Make Offer */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Request Details Card */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col md:flex-row gap-6 shadow-sm">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <span className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                          📄 BUYER REQUEST #{selectedRequest._id?.slice(-6).toUpperCase()}
                        </span>

                      </div>
                      
                      <h2 className="text-3xl font-extrabold text-gray-900 mb-2">{selectedRequest.crop}</h2>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                        <span className="flex items-center gap-1">👤 {selectedRequest.buyerId?.firstName} {selectedRequest.buyerId?.lastName}</span>
                        <span className="flex items-center gap-1">📍 {selectedRequest.location || 'India'}</span>
                      </div>
                      
                      {selectedRequest.description && (
                        <p className="text-sm text-gray-500 italic mb-6">"{selectedRequest.description}"</p>
                      )}

                      <div className="flex flex-wrap gap-4 mt-6">
                        <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3 flex-1 min-w-[140px]">
                          <span className="text-2xl">📦</span>
                          <div>
                            <p className="text-base font-extrabold text-gray-900 leading-tight">{Number(selectedRequest.quantity).toLocaleString('en-IN')} Quintals</p>
                            <p className="text-[11px] text-gray-500 leading-tight">Required Quantity</p>
                          </div>
                        </div>
                        <div className="bg-green-50 rounded-xl p-3 flex items-center gap-3 flex-1 min-w-[140px]">
                          <span className="text-2xl">₹</span>
                          <div>
                            <p className="text-base font-extrabold text-[#1a3a2a] leading-tight">₹{Number(selectedRequest.offeredPrice).toLocaleString('en-IN')} / Quintal</p>
                            <p className="text-[11px] text-gray-500 leading-tight">Target Price</p>
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3 flex-1 min-w-[140px]">
                          <span className="text-2xl">📅</span>
                          <div>
                            <p className="text-sm font-extrabold text-gray-900 leading-tight">Posted {formatTimeAgo(selectedRequest.publishedAt || selectedRequest.createdAt)}</p>
                            <p className="text-[11px] text-gray-500 leading-tight">Last updated {formatTimeAgo(selectedRequest.updatedAt || selectedRequest.createdAt)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="w-full md:w-56 h-48 md:h-auto rounded-xl overflow-hidden shrink-0">
                      <img src={getCropImage(selectedRequest)} alt={selectedRequest.crop} className="w-full h-full object-cover" />
                    </div>
                  </div>

                  {/* Make Your Offer Form */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-700 text-xl">
                        📦
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">Make Your Offer</h3>
                        <p className="text-sm text-gray-500 mt-0.5">Tell the buyer how much you can supply and at what price.</p>
                      </div>
                    </div>

                    <form onSubmit={handleMakeOffer} className="space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Quantity to Sell (Quintals) <span className="text-red-500">*</span></label>
                          <div className="relative flex items-center">
                            <span className="absolute left-3 text-gray-400">📦</span>
                            <input
                              required type="number" min="1" max={selectedRequest.quantity}
                              placeholder="e.g. 100"
                              className="w-full pl-9 pr-12 py-3 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none"
                              value={offerForm.quantity}
                              onChange={e => setOfferForm({ ...offerForm, quantity: e.target.value })}
                            />
                            <span className="absolute right-3 text-gray-500 text-sm bg-gray-100 px-2 py-0.5 rounded font-medium">Qtl</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Price (per Quintal) <span className="text-red-500">*</span></label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                            <input
                              required type="number" min="1"
                              placeholder="e.g. 2750"
                              className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none"
                              value={offerForm.counterOfferPrice}
                              onChange={e => setOfferForm({ ...offerForm, counterOfferPrice: e.target.value })}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1.5">Buyer target: ₹{Number(selectedRequest.offeredPrice).toLocaleString('en-IN')} / Quintal</p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Message (Optional)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-3 text-gray-400">💬</span>
                          <textarea
                            rows={3}
                            placeholder="e.g. Fresh harvest, ready to transport tomorrow."
                            className="w-full pl-9 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none resize-none"
                            value={offerForm.message}
                            onChange={e => setOfferForm({ ...offerForm, message: e.target.value })}
                          />
                          <div className="text-right text-xs text-gray-400 mt-1">{offerForm.message?.length || 0}/300</div>
                        </div>
                      </div>

                      <label className="flex items-center gap-3 bg-green-50/50 border border-green-100 rounded-lg p-3 cursor-pointer">
                        <input
                          type="checkbox"
                          required
                          checked={offerForm.declaration}
                          onChange={e => setOfferForm({ ...offerForm, declaration: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-300 text-[#1a3a2a] focus:ring-[#1a3a2a]"
                        />
                        <span className="text-sm text-gray-700">
                          <span className="font-bold text-[#1a3a2a]">I confirm</span> that the quantity and price entered are accurate.
                        </span>
                      </label>

                      <button
                        type="submit"
                        className="px-6 py-3 bg-[#1a3a2a] text-white font-bold rounded-lg hover:bg-[#142e21] transition text-sm flex items-center gap-2 w-auto"
                      >
                        <span>🚀</span> Submit Offer
                      </button>
                    </form>
                  </div>
                </div>

                {/* RIGHT COLUMN: Info Sidebars */}
                <div className="lg:col-span-1 space-y-6">
                  




                  {/* Recent Offers (Retained from old design as requested) */}
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                        <span className="text-gray-400">📝</span> Recent Offers
                      </h3>
                      <button type="button" onClick={() => setShowAllOffers(!showAllOffers)} className="text-xs font-bold text-[#1a3a2a] hover:underline">{showAllOffers ? "Show Less" : "View All"}</button>
                    </div>

                    {myOffers.length === 0 ? (
                      <p className="text-sm text-gray-400 italic py-4">No offers submitted yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {(showAllOffers ? myOffers : myOffers.slice(0, 5)).map(offer => {
                          const statusVariant =
                            offer.status === 'ACCEPTED' ? 'accepted' :
                            offer.status === 'REJECTED' ? 'countered' : // Use red variant
                            'pending';
                          
                          const cropName = offer.buyerRequestId?.crop || 'Unknown Crop';
                          
                          return (
                            <div key={offer._id} className="border border-slate-200 rounded-xl p-3.5 hover:shadow-md hover:-translate-y-0.5 hover:border-green-200 bg-gradient-to-br from-white to-slate-50/50 transition-all duration-300">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <p className="text-sm font-bold text-gray-900">{cropName}</p>
                                  <p className="text-xs text-gray-500 mt-0.5">Current: ₹{Number(offer.counterOfferPrice).toLocaleString('en-IN')}/Q</p>
                                </div>
                                <div className="text-right">
                                  <Badge variant={statusVariant}>{offer.status.replace(/_/g, ' ')}</Badge>
                                  <p className="text-sm font-bold text-gray-700 mt-1.5">{offer.quantity} Q</p>
                                </div>
                              </div>
                              
                              {/* Negotiation History */}
                              {offer.negotiationHistory && offer.negotiationHistory.length > 1 && (
                                <div className="bg-white border border-gray-100 rounded-lg p-2 mb-3 max-h-32 overflow-y-auto space-y-1.5">
                                  {offer.negotiationHistory.map((hist, idx) => (
                                    <div key={idx} className={`text-xs p-1.5 rounded ${hist.byRole === 'FARMER' ? 'bg-green-50 text-green-800 ml-4' : 'bg-gray-100 text-gray-800 mr-4'}`}>
                                      <span className="font-bold">{hist.byRole}:</span> ₹{hist.price}/Q
                                      {hist.message && <p className="mt-0.5 opacity-80">{hist.message}</p>}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Action Buttons for Farmer */}
                              {offer.status === 'COUNTERED_BY_BUYER' && (
                                <div className="space-y-2 mt-2 pt-3 border-t border-gray-100">
                                  {!counterForms[offer._id] ? (
                                    <div className="flex gap-2">
                                      <button onClick={() => handleOfferAction(offer._id, 'accept')} className="flex-1 py-1.5 bg-[#1a3a2a] text-white text-xs font-bold rounded-lg">Accept</button>
                                      <button onClick={() => setCounterForms({ ...counterForms, [offer._id]: { price: offer.counterOfferPrice, message: '' } })} className="flex-1 py-1.5 border border-[#1a3a2a] text-[#1a3a2a] text-xs font-bold rounded-lg">Counter</button>
                                      <button onClick={() => handleOfferAction(offer._id, 'reject')} className="flex-1 py-1.5 bg-gray-200 text-gray-700 text-xs font-bold rounded-lg">Reject</button>
                                    </div>
                                  ) : (
                                    <div className="bg-white p-2 border border-green-100 rounded-lg shadow-sm">
                                      <input type="number" className="w-full text-xs p-1.5 border border-gray-200 rounded mb-1.5" placeholder="Your Counter Price" value={counterForms[offer._id].price} onChange={(e) => setCounterForms({ ...counterForms, [offer._id]: { ...counterForms[offer._id], price: e.target.value } })} />
                                      <input type="text" className="w-full text-xs p-1.5 border border-gray-200 rounded mb-2" placeholder="Message (Optional)" value={counterForms[offer._id].message} onChange={(e) => setCounterForms({ ...counterForms, [offer._id]: { ...counterForms[offer._id], message: e.target.value } })} />
                                      <div className="flex gap-2">
                                        <button onClick={() => handleOfferAction(offer._id, 'counter', counterForms[offer._id])} className="flex-1 py-1 bg-[#1a3a2a] text-white text-xs font-bold rounded">Send Counter</button>
                                        <button onClick={() => setCounterForms({ ...counterForms, [offer._id]: null })} className="py-1 px-2 text-gray-500 text-xs">Cancel</button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>
              </div>
            </div>
          ) : (
            /* ── Request List (Browse) ── */
            <div className="space-y-4">
              {/* Browse Actions: Search & Sort */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                <div className="relative w-full sm:w-96">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                  <input 
                    type="text"
                    placeholder="Search by crop or location..."
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none shadow-sm transition"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <div className="relative flex items-center border border-gray-300 rounded-xl bg-white hover:bg-gray-50 shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-green-500 w-full sm:w-auto shrink-0">
                  <span className="text-gray-400 pl-3 shrink-0">↕️</span>
                  <span className="text-sm text-gray-700 pl-2 whitespace-nowrap">Sort by:</span>
                  <select 
                    className="text-sm font-semibold text-gray-900 bg-transparent py-2.5 pl-1 pr-8 outline-none appearance-none cursor-pointer w-full"
                    value={browseSortOrder}
                    onChange={(e) => setBrowseSortOrder(e.target.value)}
                  >
                    <option value="recent">Most Recent</option>
                    <option value="oldest">Oldest</option>
                    <option value="price-high">Highest Price</option>
                    <option value="price-low">Lowest Price</option>
                    <option value="qty-high">Highest Quantity</option>
                    <option value="qty-low">Lowest Quantity</option>
                  </select>
                  <span className="absolute right-3 text-gray-400 pointer-events-none text-xs">⌄</span>
                </div>
              </div>

              {(() => {
                const filteredAndSortedRequests = [...requests]
                  .filter(req => {
                    if (!searchQuery) return true;
                    const q = searchQuery.toLowerCase();
                    return (req.crop?.toLowerCase().includes(q) || req.location?.toLowerCase().includes(q) || req.buyerId?.district?.toLowerCase().includes(q));
                  })
                  .sort((a, b) => {
                    if (browseSortOrder === 'recent') {
                       return new Date(b.createdAt || b.publishedAt || 0) - new Date(a.createdAt || a.publishedAt || 0);
                    } else if (browseSortOrder === 'oldest') {
                       return new Date(a.createdAt || a.publishedAt || 0) - new Date(b.createdAt || b.publishedAt || 0);
                    } else if (browseSortOrder === 'price-high') {
                       return Number(b.offeredPrice) - Number(a.offeredPrice);
                    } else if (browseSortOrder === 'price-low') {
                       return Number(a.offeredPrice) - Number(b.offeredPrice);
                    } else if (browseSortOrder === 'qty-high') {
                       return Number(b.quantity) - Number(a.quantity);
                    } else if (browseSortOrder === 'qty-low') {
                       return Number(a.quantity) - Number(b.quantity);
                    }
                    return 0;
                  });

                if (filteredAndSortedRequests.length === 0) {
                  return (
                    <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
                      <p className="text-gray-400 font-semibold">No active buyer requests found.</p>
                      <p className="text-gray-400 text-sm mt-1">Try adjusting your search or check back later.</p>
                    </div>
                  );
                }
                
                return filteredAndSortedRequests.map(req => (
                  <div
                    key={req._id}
                    className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition flex flex-col xl:flex-row gap-8"
                  >
                    {/* Left: Image */}
                    <div className="w-full xl:w-80 h-48 xl:h-auto shrink-0 rounded-xl overflow-hidden relative">
                      <img src={getCropImage(req)} alt={req.crop} className="w-full h-full object-cover" />
                    </div>
                    
                    {/* Middle: Details */}
                    <div className="flex-1 flex flex-col justify-center py-2">

                      <h3 className="text-4xl font-extrabold text-gray-900 mb-2">{req.crop}</h3>
                      <div className="flex items-center gap-3 text-base text-gray-500 mb-3">
                        <span className="flex items-center gap-1.5">👤 {req.buyerId?.firstName} {req.buyerId?.lastName}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1.5">📍 {req.location || req.buyerId?.district || 'India'}</span>
                      </div>
                      {req.description && (
                        <p className="text-base text-gray-600 mb-4">{req.description}</p>
                      )}

                    </div>

                    {/* Middle Right: Stats */}
                    <div className="flex items-center gap-5 shrink-0 py-2">
                      <div className="bg-gray-50 rounded-xl p-5 flex items-center gap-4 min-w-[180px]">
                        <span className="text-3xl">📦</span>
                        <div>
                          <p className="text-2xl font-extrabold text-gray-900 leading-tight">{req.quantity} <span className="text-base font-semibold text-gray-500">Qtl</span></p>
                          <p className="text-sm text-gray-500 leading-tight mt-0.5">Required Quantity</p>
                        </div>
                      </div>
                      <div className="bg-green-50 rounded-xl p-5 flex items-center gap-4 min-w-[180px]">
                        <span className="text-3xl">₹</span>
                        <div>
                          <p className="text-2xl font-extrabold text-gray-900 leading-tight">₹{Number(req.offeredPrice).toLocaleString('en-IN')} <span className="text-base font-semibold text-gray-500">/ Qtl</span></p>
                          <p className="text-sm text-gray-500 leading-tight mt-0.5">Offered Price</p>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-col justify-center gap-3 shrink-0 min-w-[200px] py-2">
                      <button onClick={() => selectRequest(req)} className="w-full px-6 py-3 rounded-xl border border-gray-300 text-base font-bold text-gray-700 hover:bg-gray-50 transition shadow-sm">
                        View Request
                      </button>
                      <button onClick={() => selectRequest(req)} className="w-full px-6 py-3 rounded-xl bg-[#1a3a2a] text-white text-base font-bold hover:bg-[#142e21] transition shadow-sm">
                        Make Offer →
                      </button>
                      <p className="text-center text-sm text-gray-400 mt-2 flex items-center justify-center gap-1.5">
                        <span className="text-base">🕒</span> Posted {formatTimeAgo(req.publishedAt || req.createdAt)}
                      </p>
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </>
      )}

      {/* ════════ Deals Tab ════════ */}
      {activeTab === 'deals' && (
        <div className="space-y-6">
          {deals.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
              <p className="text-gray-400 font-semibold">No active deals yet.</p>
              <p className="text-gray-400 text-xs mt-1">Once a buyer accepts your offer, the deal will appear here for photo upload and verification.</p>
            </div>
          ) : selectedDeal ? (
            <div>
              <button onClick={() => setSelectedDeal(null)} className="mb-4 text-sm font-bold text-red-700 hover:underline flex items-center gap-1">
                <span>←</span>
                <span>Back to all deals</span>
              </button>
              <DealTracker deal={selectedDeal} userRole="FARMER" onRefresh={() => { setSelectedDeal(null); fetchData(); }} />
            </div>
          ) : (
            <div className="space-y-4">
              {(() => {
                const attentionDealsCount = deals.filter(d => d.status === 'ACCEPTED' || d.status === 'AI_FLAGGED').length;
                return (
                  <>
                    {attentionDealsCount > 0 && (
                      <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-center justify-between">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 shrink-0 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg mt-0.5">!</div>
                          <div>
                            <h3 className="text-gray-900 font-bold text-base">{attentionDealsCount} accepted deal{attentionDealsCount !== 1 && 's'} require your attention</h3>
                            <p className="text-gray-600 text-sm mt-0.5">Upload crop photos for accepted deals to begin AI verification and get buyer contact details.</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-extrabold text-gray-900">Your Deals ({deals.length})</h2>
                      
                      <div className="relative flex items-center border border-gray-300 rounded-lg bg-white hover:bg-gray-50 shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-green-500">
                        <span className="text-gray-400 pl-3 shrink-0">↕️</span>
                        <span className="text-sm text-gray-700 pl-2 whitespace-nowrap">Sort by:</span>
                        <select 
                          className="text-sm font-semibold text-gray-900 bg-transparent py-1.5 pl-1 pr-7 outline-none appearance-none cursor-pointer"
                          value={sortOrder}
                          onChange={(e) => setSortOrder(e.target.value)}
                        >
                          <option value="recent">Most Recent</option>
                          <option value="oldest">Oldest</option>
                          <option value="value-high">Highest Value</option>
                          <option value="value-low">Lowest Value</option>
                        </select>
                        <span className="absolute right-2 text-gray-400 pointer-events-none text-xs">⌄</span>
                      </div>
                    </div>

                    {(() => {
                      const sortedDeals = [...deals].sort((a, b) => {
                        if (sortOrder === 'recent') {
                          return new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0);
                        } else if (sortOrder === 'oldest') {
                          return new Date(a.createdAt || a.updatedAt || 0) - new Date(b.createdAt || b.updatedAt || 0);
                        } else if (sortOrder === 'value-high') {
                          return (Number(b.quantity) * Number(b.agreedPrice)) - (Number(a.quantity) * Number(a.agreedPrice));
                        } else if (sortOrder === 'value-low') {
                          return (Number(a.quantity) * Number(a.agreedPrice)) - (Number(b.quantity) * Number(b.agreedPrice));
                        }
                        return 0;
                      });

                      return sortedDeals.map(deal => {
                      const needsPhotos = deal.status === 'ACCEPTED' || deal.status === 'AI_FLAGGED';
                      const inInspection = deal.status === 'HUMAN_REVIEW' || deal.status === 'AGENT_PAYMENT_PENDING';
                      const isVerified = deal.status === 'VERIFIED' || deal.status === 'COMPLETED';
                      const totalValue = Number(deal.quantity) * Number(deal.agreedPrice);

                      return (
                        <div key={deal._id} className="bg-white rounded-2xl border border-gray-200 mb-6 overflow-hidden shadow-sm">
                          <div className="flex flex-col xl:flex-row">
                            {/* Left Section (Crop Info) */}
                            <div className="min-w-0 p-6 flex gap-6 xl:w-[440px] shrink-0 border-b xl:border-b-0 xl:border-r border-gray-100">
                              <div className="w-36 h-36 rounded-2xl overflow-hidden shrink-0 bg-gray-100 shadow-sm">
                                <img src={getCropImage(deal)} alt={deal.crop} className="w-full h-full object-cover" />
                              </div>
                              <div className="flex flex-col flex-1 min-w-0 py-1">
                                <div>
                                  <div className="flex items-center flex-wrap gap-3 mb-1.5">
                                    <h3 className="text-3xl font-extrabold text-gray-900">{deal.crop}</h3>
                                    {isVerified ? (
                                      <span className="px-2.5 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-full flex items-center gap-1.5 shrink-0"><span className="text-green-500">✓</span> Verified</span>
                                    ) : (
                                      <span className="px-2.5 py-1 bg-orange-50 text-orange-700 text-xs font-bold rounded-full flex items-center gap-1.5 shrink-0"><span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> Verification Required</span>
                                    )}
                                  </div>
                                  <p className="text-gray-900 font-bold text-lg">{deal.quantity} Quintals</p>
                                </div>
                                
                                <div className="flex items-center gap-6 mt-4">
                                  <div className="min-w-0">
                                    <p className="text-gray-500 text-xs flex items-center gap-1.5 mb-1 whitespace-nowrap shrink-0">
                                      <span className="text-gray-400">📍</span> Agreed Price
                                    </p>
                                    <p className={`font-bold text-lg whitespace-nowrap truncate ${isVerified ? 'text-gray-900' : 'text-[#c62828]'}`}>
                                      ₹{Number(deal.agreedPrice).toLocaleString('en-IN')} <span className="text-sm font-semibold text-gray-500">/ Qtl</span>
                                    </p>
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-gray-500 text-xs flex items-center gap-1.5 mb-1 whitespace-nowrap shrink-0">
                                      <span className="text-gray-400">🥞</span> Total Value
                                    </p>
                                    <p className="font-bold text-lg text-gray-900 whitespace-nowrap truncate">
                                      ₹{totalValue.toLocaleString('en-IN')}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Middle Section (Progress) */}
                            <div className="p-6 flex-1 flex flex-col justify-center border-b xl:border-b-0 xl:border-r border-gray-100 relative bg-white">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="w-5 h-5 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold">✓</div>
                                <h4 className="font-bold text-gray-900 text-sm">{isVerified ? "Verification Completed" : "Verification Progress"}</h4>
                              </div>
                              <p className="text-xs text-gray-500 mb-6 pl-7">
                                {isVerified 
                                  ? "Your produce has been verified. You can now view the buyer's contact details."
                                  : "Upload 5+ clear photos of your produce to begin verification."
                                }
                              </p>
                              
                              <div className="px-7 relative mb-2 max-w-sm">
                                {/* Connecting lines */}
                                <div className="absolute top-3.5 left-10 right-10 h-0.5 bg-gray-200 z-0"></div>
                                {(isVerified || inInspection || !needsPhotos) && <div className="absolute top-3.5 left-10 right-[50%] h-0.5 bg-green-600 z-0"></div>}
                                {isVerified && <div className="absolute top-3.5 left-[50%] right-10 h-0.5 bg-green-600 z-0"></div>}
                                
                                <div className="relative z-10 flex justify-between">
                                  <div className="flex flex-col items-center gap-2 w-20">
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${isVerified || inInspection || !needsPhotos ? 'bg-green-600 text-white' : 'bg-[#14452F] text-white'}`}>
                                      {isVerified || inInspection || !needsPhotos ? '✓' : '1'}
                                    </div>
                                    <div className="text-center">
                                      <p className="text-[11px] font-bold text-gray-900">Upload Photos</p>
                                      <p className="text-[10px] text-gray-500">{isVerified || inInspection || !needsPhotos ? 'Completed' : 'Not started'}</p>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-center gap-2 w-20">
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${isVerified || inInspection ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-400 border border-gray-200'}`}>
                                      {isVerified || inInspection ? '✓' : '2'}
                                    </div>
                                    <div className="text-center">
                                      <p className="text-[11px] font-bold text-gray-900">AI Screening</p>
                                      <p className="text-[10px] text-gray-500">{isVerified || inInspection ? 'Completed' : 'Waiting'}</p>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-center gap-2 w-20">
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${isVerified ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-400 border border-gray-200'}`}>
                                      {isVerified ? '✓' : '3'}
                                    </div>
                                    <div className="text-center">
                                      <p className="text-[11px] font-bold text-gray-900">SAATHI Verification</p>
                                      <p className="text-[10px] text-gray-500">{isVerified ? 'Completed' : 'Waiting'}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              {!isVerified && (
                                <div className="mt-4 ml-7 p-3 bg-[#f0f7ff] rounded-lg flex gap-2 max-w-sm">
                                  <span className="text-blue-500 text-sm mt-0.5">ℹ</span>
                                  <p className="text-[11px] text-gray-600 leading-relaxed">Please upload at least 5 clear photos of your crop from different angles (e.g. close-up, full view, sacks, etc.).</p>
                                </div>
                              )}
                            </div>

                            {/* Right Section (Contact & Action) */}
                            <div className="p-6 flex flex-col justify-center xl:w-64 shrink-0 bg-gray-50/50">
                              <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 border border-gray-200 shadow-sm">
                                  {isVerified ? '👤' : '🔒'}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-gray-900">Buyer Contact</p>
                                  <p className="text-[11px] text-gray-500 leading-tight mt-0.5">
                                    {isVerified ? 'Contact details are now available.' : 'Available after verification'}
                                  </p>
                                </div>
                              </div>
                              
                              {isVerified ? (
                                <button onClick={() => setSelectedDeal(deal)} className="w-full py-2.5 px-4 bg-white border border-green-600 text-green-700 text-sm font-bold rounded-lg hover:bg-green-50 transition shadow-sm">
                                  View Buyer Contact →
                                </button>
                              ) : (
                                <button onClick={() => setSelectedDeal(deal)} className="w-full py-2.5 px-4 bg-[#14452F] text-white text-sm font-bold rounded-lg hover:bg-[#0f3423] transition flex items-center justify-center gap-2 shadow-sm">
                                  <span>📷</span> Upload 5+ Photos →
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    });
                    })()}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
