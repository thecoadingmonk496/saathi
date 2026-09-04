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
              <button onClick={() => setSelectedRequest(null)} className="text-sm font-bold text-red-700 hover:underline">← Back to all requests</button>

              {/* Request details card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden relative">
                <div className="border-t-4 border-red-700" />
                <div className="p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                        <span className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center text-red-700 text-[10px]">📋</span>
                        REQUEST #{selectedRequest._id?.slice(-6).toUpperCase()}
                      </p>
                      <h2 className="text-2xl font-extrabold text-gray-900 mt-2">{selectedRequest.crop}</h2>
                      <p className="text-sm text-gray-500 mt-1">📍 {selectedRequest.location || 'India'}</p>
                      {selectedRequest.description && (
                        <p className="text-sm text-gray-500 mt-2 italic">"{selectedRequest.description}"</p>
                      )}
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-right md:min-w-[200px]">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Target Price</p>
                      <p className="text-2xl font-extrabold text-red-700 mt-0.5">
                        ₹{Number(selectedRequest.offeredPrice).toLocaleString('en-IN')} <span className="text-sm font-bold text-gray-500">/ Quintal</span>
                      </p>
                      <div className="border-t border-gray-200 my-3" />
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Requested Quantity</p>
                      <p className="text-lg font-extrabold text-gray-900 mt-0.5">
                        {Number(selectedRequest.quantity).toLocaleString('en-IN')} Quintals
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Offer + Recent Offers grid */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Submit Offer Form */}
                <div className="lg:col-span-3">
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-5">Submit Your Offer</h3>
                    <form onSubmit={handleMakeOffer} className="space-y-5">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Quantity to Sell (Quintals)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">⊕</span>
                            <input
                              required type="number" min="1" max={selectedRequest.quantity}
                              placeholder="e.g. 100"
                              className="w-full pl-9 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none"
                              value={offerForm.quantity}
                              onChange={e => setOfferForm({ ...offerForm, quantity: e.target.value })}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Your Price (per Quintal)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">₹</span>
                            <input
                              required type="number" min="1"
                              placeholder="e.g. 2750"
                              className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none"
                              value={offerForm.counterOfferPrice}
                              onChange={e => setOfferForm({ ...offerForm, counterOfferPrice: e.target.value })}
                            />
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1">Buyer target: ₹{Number(selectedRequest.offeredPrice).toLocaleString('en-IN')}/Qtl</p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Message (optional)</label>
                        <textarea
                          rows={2}
                          placeholder="E.g. Fresh harvest, ready to transport tomorrow."
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none resize-none"
                          value={offerForm.message}
                          onChange={e => setOfferForm({ ...offerForm, message: e.target.value })}
                        />
                      </div>

                      {/* Quality Assurance Declaration */}
                      <label className="flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-xl p-4 cursor-pointer hover:bg-gray-100 transition">
                        <input
                          type="checkbox"
                          checked={offerForm.declaration}
                          onChange={e => setOfferForm({ ...offerForm, declaration: e.target.checked })}
                          className="mt-0.5 w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                        />
                        <div>
                          <p className="text-sm font-bold text-gray-800">Quality Assurance Declaration</p>
                          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                            I certify that the offered produce meets the minimum quality standards set by SAATHI Agri-Tech and matches the description provided. I agree to standard inspection upon delivery.
                          </p>
                        </div>
                      </label>

                      <button
                        type="submit"
                        className="px-6 py-3 bg-red-700 text-white font-bold rounded-xl hover:bg-red-800 transition text-sm inline-flex items-center gap-2"
                      >
                        Submit Offer <span>▶</span>
                      </button>
                    </form>
                  </div>
                </div>

                {/* Recent Offers Sidebar */}
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-bold text-gray-900">Recent Offers</h3>
                      <button type="button" onClick={() => setShowAllOffers(!showAllOffers)} className="text-xs font-bold text-red-700 hover:underline">{showAllOffers ? "Show Less" : "View All"}</button>
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
                            <div key={offer._id} className="border border-slate-200 rounded-xl p-3.5 hover:shadow-md hover:-translate-y-0.5 hover:border-red-200 bg-gradient-to-br from-white to-slate-50/50 transition-all duration-300">
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
                                    <div key={idx} className={`text-[10px] p-1.5 rounded ${hist.byRole === 'FARMER' ? 'bg-red-50 text-red-800 ml-4' : 'bg-gray-100 text-gray-800 mr-4'}`}>
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
                                      <button onClick={() => handleOfferAction(offer._id, 'accept')} className="flex-1 py-1.5 bg-red-700 text-white text-xs font-bold rounded-lg">Accept</button>
                                      <button onClick={() => setCounterForms({ ...counterForms, [offer._id]: { price: offer.counterOfferPrice, message: '' } })} className="flex-1 py-1.5 border border-red-700 text-red-700 text-xs font-bold rounded-lg">Counter</button>
                                      <button onClick={() => handleOfferAction(offer._id, 'reject')} className="flex-1 py-1.5 bg-gray-200 text-gray-700 text-xs font-bold rounded-lg">Reject</button>
                                    </div>
                                  ) : (
                                    <div className="bg-white p-2 border border-red-100 rounded-lg shadow-sm">
                                      <input type="number" className="w-full text-xs p-1.5 border border-gray-200 rounded mb-1.5" placeholder="Your Counter Price" value={counterForms[offer._id].price} onChange={(e) => setCounterForms({ ...counterForms, [offer._id]: { ...counterForms[offer._id], price: e.target.value } })} />
                                      <input type="text" className="w-full text-xs p-1.5 border border-gray-200 rounded mb-2" placeholder="Message (Optional)" value={counterForms[offer._id].message} onChange={(e) => setCounterForms({ ...counterForms, [offer._id]: { ...counterForms[offer._id], message: e.target.value } })} />
                                      <div className="flex gap-2">
                                        <button onClick={() => handleOfferAction(offer._id, 'counter', counterForms[offer._id])} className="flex-1 py-1 bg-red-700 text-white text-xs font-bold rounded">Send Counter</button>
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
              {requests.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
                  <p className="text-gray-400 font-semibold">No active buyer requests found.</p>
                  <p className="text-gray-400 text-sm mt-1">Check back later for new opportunities.</p>
                </div>
              ) : (
                requests.map(req => (
                  <div
                    key={req._id}
                    onClick={() => selectRequest(req)}
                    className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-red-200 transition cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-lg">🌾</div>
                        <div>
                          <h3 className="font-bold text-gray-900">{req.crop}</h3>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {req.buyerId?.firstName} {req.buyerId?.lastName?.charAt(0)}.
                            &nbsp;·&nbsp; 📍 {req.location || req.buyerId?.district || 'India'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-extrabold text-gray-900">
                          {Number(req.quantity).toLocaleString('en-IN')} <span className="text-xs text-gray-500">Qtl</span>
                        </p>
                        <p className="text-sm font-bold text-red-700">₹{Number(req.offeredPrice).toLocaleString('en-IN')}/Q</p>
                      </div>
                    </div>
                    {req.description && (
                      <p className="text-xs text-gray-400 mt-2 line-clamp-1">{req.description}</p>
                    )}
                  </div>
                ))
              )}
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
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 font-semibold flex items-center justify-between">
                <span>📸 You have {deals.length} locked deal{deals.length > 1 ? 's' : ''}. Select a deal below to upload crop photos for AI verification.</span>
              </div>

              {deals.map(deal => {
                const needsPhotos = deal.status === 'ACCEPTED' || deal.status === 'AI_FLAGGED';

                return (
                  <div
                    key={deal._id}
                    onClick={() => setSelectedDeal(deal)}
                    className="bg-white rounded-2xl border-2 border-slate-200 p-6 hover:shadow-lg hover:border-red-600 transition-all cursor-pointer group relative overflow-hidden"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h3 className="text-lg font-extrabold text-gray-900 group-hover:text-red-700 transition">
                            {deal.crop} — {deal.quantity} Quintals
                          </h3>
                          <Badge variant={deal.status === 'COMPLETED' ? 'accepted' : 'pending'}>
                            {deal.status.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Agreed Price: <strong className="text-red-700 font-bold">₹{Number(deal.agreedPrice).toLocaleString('en-IN')}/Qtl</strong>
                          &nbsp;·&nbsp; Total Value: <strong className="text-gray-800">₹{(Number(deal.quantity) * Number(deal.agreedPrice)).toLocaleString('en-IN')}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {needsPhotos ? (
                          <span className="px-4 py-2 bg-red-700 text-white rounded-xl text-xs font-bold shadow group-hover:bg-red-800 transition flex items-center gap-1.5">
                            <span>📷</span>
                            <span>Upload 5+ Photos →</span>
                          </span>
                        ) : (
                          <span className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold group-hover:bg-slate-200 transition flex items-center gap-1.5">
                            <span>🔍</span>
                            <span>View Progress Tracker →</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
