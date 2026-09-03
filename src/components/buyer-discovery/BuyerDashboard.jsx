import { useState, useEffect } from 'react';
import { useUser } from '../../context/UserContext';
import DealTracker from './DealTracker';
import BuyerRegister from '../../pages/BuyerRegister';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5001' : '')).replace(/\/$/, '') + '/api';

/* ── tiny helper components ── */
function Avatar({ name, size = 'md' }) {
  const s = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
  const initial = (name || '?').charAt(0).toUpperCase();
  return (
    <div className={`${s} rounded-full bg-gradient-to-br from-red-100 to-red-200 text-red-800 font-bold flex items-center justify-center shrink-0`}>
      {initial}
    </div>
  );
}

function Badge({ children, variant = 'default' }) {
  const styles = {
    live: 'bg-red-600 text-white',
    pending: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
    published: 'bg-green-100 text-green-800 border border-green-300',
    counter: 'bg-red-600 text-white',
    default: 'bg-gray-100 text-gray-700 border border-gray-200',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide ${styles[variant] || styles.default}`}>
      {children}
    </span>
  );
}

/* ── vertical mini-deal tracker (for Locked Deals sidebar) ── */
function MiniDealSteps({ status }) {
  const steps = [
    { key: 'ACCEPTED', label: 'Accepted' },
    { key: 'QC_PENDING', label: 'QC Pending' },
    { key: 'VERIFIED', label: 'Verified' },
    { key: 'COMPLETED', label: 'Completed' },
  ];

  const statusMap = {
    ACCEPTED: 0, PHOTO_PENDING: 0, AI_FLAGGED: 0,
    AI_REVIEW: 1, AI_PASSED: 1, HUMAN_REVIEW: 1,
    VERIFIED: 2,
    COMPLETED: 3, DISPUTED: 3,
  };
  const currentIdx = statusMap[status] ?? -1;

  return (
    <div className="space-y-0">
      {steps.map((step, idx) => {
        const done = idx < currentIdx;
        const active = idx === currentIdx;
        return (
          <div key={step.key} className="flex items-start gap-2.5">
            {/* dot + connector */}
            <div className="flex flex-col items-center">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                done ? 'bg-red-700' : active ? 'bg-red-600 ring-2 ring-red-200' : 'bg-gray-200'
              }`}>
                {done && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
              </div>
              {idx < steps.length - 1 && (
                <div className={`w-0.5 h-5 ${done ? 'bg-red-700' : 'bg-gray-200'}`} />
              )}
            </div>
            {/* label */}
            <span className={`text-xs pt-0.5 ${done ? 'text-red-800 font-bold' : active ? 'text-red-700 font-bold' : 'text-gray-400 font-medium'}`}>
              {active && '● '}{step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════ */
export default function BuyerDashboard() {
  const { user } = useUser();
  const [requests, setRequests] = useState([]);
  const [deals, setDeals] = useState([]);
  const [newRequest, setNewRequest] = useState({ crop: '', quantity: '', offeredPrice: '', location: '', description: '' });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('requests');
  const [activeOffers, setActiveOffers] = useState(null);
  const [appStatus, setAppStatus] = useState('LOADING');
  const [showForm, setShowForm] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState(null);

  /* ── data fetching ── */
  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const phone = user?.mobile || user?.phone || '';
      const appRes = await fetch(`${API_BASE}/buyers/my-application?phone=${phone}`);
      if (appRes.status === 404) { setAppStatus('NOT_FOUND'); setLoading(false); return; }
      setAppStatus('FOUND');

      const reqRes = await fetch(`${API_BASE}/buyer-discovery/requests/mine`, { headers: { Authorization: `Bearer ${token}` } });
      const reqData = await reqRes.json();
      if (reqData.success) setRequests(reqData.data);

      const dealRes = await fetch(`${API_BASE}/buyer-discovery/deals`, { headers: { Authorization: `Bearer ${token}` } });
      const dealData = await dealRes.json();
      if (dealData.success) setDeals(dealData.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/buyer-discovery/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...newRequest, unit: 'quintals' }),
    });
    const data = await res.json();
    if (data.success) {
      setNewRequest({ crop: '', quantity: '', offeredPrice: '', location: '', description: '' });
      setShowForm(false);
      fetchData();
    } else { alert(data.message || 'Error creating request'); }
  };

  const loadOffers = async (requestId) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/buyer-discovery/requests/${requestId}/offers`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) setActiveOffers({ requestId, offers: data.data });
  };

  const handleOfferAction = async (offerId, action) => {
    const token = localStorage.getItem('token');
    await fetch(`${API_BASE}/buyer-discovery/offers/${offerId}/${action}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    if (activeOffers) loadOffers(activeOffers.requestId);
    fetchData();
  };

  /* ── fulfilled quantity (sum of accepted offers) ── */
  const getFulfilled = (req) => {
    if (!activeOffers || activeOffers.requestId !== req._id) return 0;
    return activeOffers.offers
      .filter(o => o.status === 'ACCEPTED')
      .reduce((sum, o) => sum + Number(o.quantity || 0), 0);
  };

  /* ── render guards ── */
  if (appStatus === 'LOADING') return <div className="text-center py-16 text-gray-400 font-semibold">Loading…</div>;

  if (appStatus === 'NOT_FOUND') {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-xl border border-amber-200 bg-amber-50">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-amber-800">Business Profile Required</h2>
          <p className="text-amber-700 mt-2">You must complete your business verification profile before accessing the SAATHI Marketplace.</p>
        </div>
        <div className="bg-white rounded-xl shadow p-2"><BuyerRegister embedded={true} /></div>
      </div>
    );
  }

  /* ── main dashboard ── */
  return (
    <div className="space-y-6">
      {/* ─── Tabs ─── */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {[
          { key: 'requests', label: 'My Requests' },
          { key: 'deals', label: `Active Deals (${deals.length})` },
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
        <div className="flex-1" />
        {activeTab === 'requests' && (
          <button
            onClick={() => setShowForm(f => !f)}
            className="mb-1 px-4 py-2 bg-red-700 text-white text-sm font-bold rounded-lg hover:bg-red-800 transition"
          >
            {showForm ? 'Cancel' : '+ New Request'}
          </button>
        )}
      </div>

      {/* ─── Post Request Form (collapsible) ─── */}
      {activeTab === 'requests' && showForm && (
        <form onSubmit={handleCreateRequest} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Post a Crop Request</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Crop Type</label>
              <input required type="text" placeholder="e.g. Premium Basmati Rice" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none" value={newRequest.crop} onChange={e => setNewRequest({ ...newRequest, crop: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Delivery Location</label>
              <input required type="text" placeholder="e.g. Karnal, Haryana" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none" value={newRequest.location} onChange={e => setNewRequest({ ...newRequest, location: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Quantity (Quintals)</label>
              <input required type="number" min="1" placeholder="e.g. 500" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none" value={newRequest.quantity} onChange={e => setNewRequest({ ...newRequest, quantity: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Target Price (₹/Quintal)</label>
              <input required type="number" min="1" placeholder="e.g. 2800" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none" value={newRequest.offeredPrice} onChange={e => setNewRequest({ ...newRequest, offeredPrice: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Details / Requirements</label>
            <textarea rows={2} placeholder="Quality specifications, packaging, etc." className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none resize-none" value={newRequest.description} onChange={e => setNewRequest({ ...newRequest, description: e.target.value })} />
          </div>
          <button type="submit" className="px-6 py-2.5 bg-red-700 text-white font-bold rounded-lg hover:bg-red-800 transition text-sm">Submit Request</button>
        </form>
      )}

      {/* ─── Requests Tab ─── */}
      {activeTab === 'requests' && (
        <>
          {loading ? (
            <p className="text-center text-gray-400 py-10">Loading requests…</p>
          ) : requests.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
              <p className="text-gray-400 font-semibold">No requests posted yet.</p>
              <p className="text-gray-400 text-sm mt-1">Click "+ New Request" above to get started.</p>
            </div>
          ) : (
            requests.map(req => {
              const fulfilled = getFulfilled(req);
              const total = Number(req.quantity) || 1;
              const pct = Math.min(Math.round((fulfilled / total) * 100), 100);
              const isExpanded = activeOffers?.requestId === req._id;

              return (
                <div key={req._id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  {/* ── Request Header Card ── */}
                  <div
                    className="p-5 border-l-4 border-red-700 cursor-pointer hover:bg-gray-50 transition"
                    onClick={() => { if (isExpanded) { setActiveOffers(null); } else { loadOffers(req._id); } }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center text-xl">🌾</div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-bold text-gray-900">{req.crop}</h3>
                            {req.status === 'PUBLISHED' && <Badge variant="live">● Live Request</Badge>}
                            {req.status === 'PENDING_REVIEW' && <Badge variant="pending">Pending Review</Badge>}
                          </div>
                          <p className="text-sm text-gray-500 mt-0.5">
                            📍 {req.location} &nbsp;·&nbsp; 💰 ₹{Number(req.offeredPrice).toLocaleString('en-IN')}/Quintal Target
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Required</p>
                        <p className="text-3xl font-extrabold text-gray-900 leading-none mt-0.5">
                          <span className="text-base font-bold text-red-700 mr-1">⊕</span>
                          {Number(req.quantity).toLocaleString('en-IN')}
                          <span className="text-sm font-bold text-gray-500 ml-1">Qtl</span>
                        </p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    {req.status === 'PUBLISHED' && (
                      <div className="mt-4">
                        <div className="flex justify-between text-xs font-bold mb-1.5">
                          <span className="text-red-700">{pct}% Fulfilled</span>
                          <span className="text-gray-500">{fulfilled} / {total} Quintals</span>
                        </div>
                        <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-red-700 to-red-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── Expanded: Offers + Deals ── */}
                  {isExpanded && (
                    <div className="border-t border-gray-100">
                      <div className="grid grid-cols-1 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
                        {/* Left: Incoming Offers */}
                        <div className="lg:col-span-3 p-5">
                          <div className="flex items-center gap-2 mb-4">
                            <h4 className="text-base font-bold text-gray-900">Incoming Offers</h4>
                            {activeOffers.offers.filter(o => o.status === 'PENDING').length > 0 && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-bold">
                                {activeOffers.offers.filter(o => o.status === 'PENDING').length} New
                              </span>
                            )}
                          </div>

                          {activeOffers.offers.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">No offers received yet.</p>
                          ) : (
                            <div className="space-y-4">
                              {activeOffers.offers.map(offer => {
                                const isCounter = offer.counterOfferPrice && Number(offer.counterOfferPrice) !== Number(req.offeredPrice);
                                return (
                                  <div key={offer._id} className="border border-gray-200 rounded-xl p-4 hover:shadow-sm transition relative">
                                    {isCounter && (
                                      <div className="absolute -top-2.5 right-3">
                                        <Badge variant="counter">Counter Offer</Badge>
                                      </div>
                                    )}
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex items-center gap-3">
                                        <Avatar name={offer.farmerId?.firstName} />
                                        <div>
                                          <p className="font-bold text-gray-900 text-sm">
                                            {offer.farmerId?.firstName} {offer.farmerId?.lastName}
                                            <span className="ml-1.5 text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">Verified</span>
                                          </p>
                                          <p className="text-xs text-gray-500">📍 {offer.farmerId?.district || offer.farmerId?.village || 'India'}</p>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-lg font-extrabold text-gray-900">{Number(offer.quantity).toLocaleString('en-IN')} <span className="text-xs font-bold text-gray-500">Qtl</span></p>
                                      </div>
                                    </div>

                                    {/* Price row */}
                                    <div className="mt-3 flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2">
                                      <span className="text-xs font-bold text-gray-500">{isCounter ? 'Counter Price' : 'Offer Price'}</span>
                                      <span className="text-base font-extrabold text-gray-900">₹{Number(offer.counterOfferPrice || req.offeredPrice).toLocaleString('en-IN')} <span className="text-xs font-medium text-gray-500">/Qtl</span></span>
                                    </div>

                                    {offer.message && (
                                      <p className="mt-2 text-xs text-gray-500 italic">"{offer.message}"</p>
                                    )}

                                    {/* Actions */}
                                    {offer.status === 'PENDING' ? (
                                      <div className="mt-3 flex items-center gap-2">
                                        <button onClick={() => handleOfferAction(offer._id, 'accept')} className="flex-1 py-2 bg-red-700 text-white text-sm font-bold rounded-lg hover:bg-red-800 transition">Accept</button>
                                        <button onClick={() => handleOfferAction(offer._id, 'reject')} className="flex-1 py-2 border-2 border-red-700 text-red-700 text-sm font-bold rounded-lg hover:bg-red-50 transition">Counter</button>
                                        <button onClick={() => handleOfferAction(offer._id, 'ignore')} className="w-10 h-10 flex items-center justify-center border border-gray-300 text-gray-400 rounded-lg hover:bg-gray-100 transition text-lg">✕</button>
                                      </div>
                                    ) : (
                                      <div className="mt-3">
                                        <Badge variant={offer.status === 'ACCEPTED' ? 'published' : 'default'}>{offer.status}</Badge>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Right: Locked Deals */}
                        <div className="lg:col-span-2 p-5 bg-gray-50/50">
                          <h4 className="text-base font-bold text-gray-900 mb-4">Locked Deals</h4>
                          {deals.filter(d => d.crop === req.crop || d.requestId === req._id).length === 0 ? (
                            <p className="text-sm text-gray-400 italic">No locked deals for this request yet.</p>
                          ) : (
                            <div className="space-y-5">
                              {deals
                                .filter(d => d.crop === req.crop || d.requestId === req._id)
                                .map(deal => (
                                  <div key={deal._id} className="bg-white rounded-xl border border-gray-200 p-4">
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center gap-2.5">
                                        <Avatar name={deal.farmerId?.firstName} size="sm" />
                                        <span className="text-sm font-bold text-gray-900">
                                          {deal.farmerId?.firstName} {deal.farmerId?.lastName}
                                        </span>
                                      </div>
                                      <span className="text-sm font-extrabold text-gray-800">{deal.quantity} <span className="text-xs font-bold text-gray-400">Qtl</span></span>
                                    </div>
                                    <MiniDealSteps status={deal.status} />
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </>
      )}

      {/* ─── Deals Tab (full DealTracker cards) ─── */}
      {activeTab === 'deals' && (
        <div className="space-y-6">
          {deals.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
              <p className="text-gray-400 font-semibold">No active deals.</p>
            </div>
          ) : (
            <>
              {selectedDeal ? (
                <div>
                  <button onClick={() => setSelectedDeal(null)} className="mb-4 text-sm font-bold text-red-700 hover:underline">← Back to all deals</button>
                  <DealTracker deal={selectedDeal} userRole="BUYER" onRefresh={() => { setSelectedDeal(null); fetchData(); }} />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {deals.map(deal => (
                    <div
                      key={deal._id}
                      onClick={() => setSelectedDeal(deal)}
                      className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-red-200 transition cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={deal.farmerId?.firstName} size="sm" />
                          <div>
                            <p className="text-sm font-bold text-gray-900">{deal.farmerId?.firstName} {deal.farmerId?.lastName}</p>
                            <p className="text-xs text-gray-500">{deal.crop}</p>
                          </div>
                        </div>
                        <span className="text-lg font-extrabold text-gray-900">{deal.quantity} <span className="text-xs text-gray-400">Qtl</span></span>
                      </div>
                      <div className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2 mb-3">
                        <span className="text-gray-500 font-medium">Agreed Price</span>
                        <span className="font-bold text-gray-900">₹{Number(deal.agreedPrice).toLocaleString('en-IN')}/Qtl</span>
                      </div>
                      <MiniDealSteps status={deal.status} />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
