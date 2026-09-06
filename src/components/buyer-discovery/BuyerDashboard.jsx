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
    live: 'bg-green-600 text-white',
    pending: 'bg-amber-500 text-white',
    rejected: 'bg-red-600 text-white',
    published: 'bg-green-100 text-green-800 border border-green-300',
    counter: 'bg-red-600 text-white',
    default: 'bg-gray-100 text-gray-700 border border-gray-200',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm font-bold tracking-wide ${styles[variant] || styles.default}`}>
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
  const [allPublishedRequests, setAllPublishedRequests] = useState([]);
  const [deals, setDeals] = useState([]);
  const [newRequest, setNewRequest] = useState({ crop: '', quantity: '', offeredPrice: '', location: '', description: '', cropImage: '' });
  const [editingRequestId, setEditingRequestId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('requests');
  const [activeOffers, setActiveOffers] = useState(null);
  const [appStatus, setAppStatus] = useState('LOADING');
  const [showForm, setShowForm] = useState(true);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [selectedPublishedRequest, setSelectedPublishedRequest] = useState(null);
  const [submitMsg, setSubmitMsg] = useState('');
  const [marketplaceSearch, setMarketplaceSearch] = useState('');
  const [marketplaceSort, setMarketplaceSort] = useState('recent');

  /* ── data fetching ── */
  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const rawPhone = user?.mobile || user?.phone || '';
      const phone = rawPhone.replace(/^\+91/, '').replace(/\s/g, '');
      if (phone) {
        try {
          const appRes = await fetch(`${API_BASE}/buyers/my-application?phone=${phone}`);
          if (appRes.ok) {
            const appData = await appRes.json();
            // Store the actual verification status
            setAppStatus(appData.application?.verificationStatus || 'NOT_FOUND');
          } else {
            setAppStatus('NOT_FOUND');
          }
        } catch (error) {
          console.error('Failed to check buyer registration status:', error);
          setAppStatus('NOT_FOUND');
        }
      } else {
        setAppStatus('NOT_FOUND');
      }

      // 1. Fetch buyer's own requests
      const reqRes = await fetch(`${API_BASE}/buyer-discovery/requests/mine`, { headers: { Authorization: `Bearer ${token}` } });
      const reqData = await reqRes.json();
      if (reqData.success) setRequests(reqData.data);

      // 2. Fetch all marketplace published requests for browse section
      const allPubRes = await fetch(`${API_BASE}/buyer-discovery/requests/all-published`, { headers: { Authorization: `Bearer ${token}` } });
      const allPubData = await allPubRes.json();
      if (allPubData.success) setAllPublishedRequests(allPubData.data || []);

      // 3. Fetch buyer deals
      const dealRes = await fetch(`${API_BASE}/buyer-discovery/deals`, { headers: { Authorization: `Bearer ${token}` } });
      const dealData = await dealRes.json();
      if (dealData.success) setDeals(dealData.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreateOrReapplyRequest = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    // Check whether creating new or reapplying for a rejected one
    const endpoint = editingRequestId 
      ? `${API_BASE}/buyer-discovery/requests/${editingRequestId}/reapply` 
      : `${API_BASE}/buyer-discovery/requests`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...newRequest, unit: 'quintals' }),
    });
    const data = await res.json();
    if (data.success) {
      setSubmitMsg(editingRequestId 
        ? '✓ Request resubmitted to Saathi Admin for verification!' 
        : '✓ Registration submitted for Saathi Admin verification! Once approved, it will be published to farmers.'
      );
      setNewRequest({ crop: '', quantity: '', offeredPrice: '', location: '', description: '', cropImage: '' });
      setEditingRequestId(null);
      fetchData();
      setTimeout(() => setSubmitMsg(''), 7000);
    } else {
      alert(data.message || 'Error submitting request');
    }
  };

  const handleStartReapply = (req) => {
    setEditingRequestId(req._id);
    setNewRequest({
      crop: req.crop || '',
      quantity: req.quantity || '',
      offeredPrice: req.offeredPrice || '',
      location: req.location || '',
      description: req.description || '',
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelReapply = () => {
    setEditingRequestId(null);
    setNewRequest({ crop: '', quantity: '', offeredPrice: '', location: '', description: '', cropImage: '' });
  };

  const loadOffers = async (requestId) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/buyer-discovery/requests/${requestId}/offers`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) setActiveOffers({ requestId, offers: data.data });
  };

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
    await fetch(`${API_BASE}/buyer-discovery/offers/${offerId}/${action}`, options);
    if (activeOffers) loadOffers(activeOffers.requestId);
    fetchData();
    setCounterForms({ ...counterForms, [offerId]: null });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 500 * 1024) {
        alert('Image is too large. Please upload an image under 500KB.');
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewRequest(prev => ({ ...prev, cropImage: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };



  /* ── fulfilled quantity ── */
  const getFulfilled = (req) => {
    if (req.fulfilledQuantity != null) return req.fulfilledQuantity;
    if (!activeOffers || activeOffers.requestId !== req._id) return 0;
    return activeOffers.offers
      .filter(o => o.status === 'ACCEPTED')
      .reduce((sum, o) => sum + Number(o.quantity || 0), 0);
  };

  /* ── render guards ── */
  if (loading && requests.length === 0 && allPublishedRequests.length === 0) {
    return <div className="text-center py-16 text-gray-400 font-semibold">Loading Buyer Dashboard…</div>;
  }

  /* ── main dashboard ── */
  return (
    <div className="space-y-8">
      
        {/* ── KYC / PROFILE DETAILS SECTION ── */}
        {appStatus === 'NOT_FOUND' ? (
          <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 relative overflow-hidden">
            <div className="relative z-10 mb-6">
              <h2 className="text-2xl font-extrabold text-gray-900">Register Details to Publish</h2>
              <p className="text-sm text-gray-500 mt-1">Please complete your business verification profile. This information helps farmers trust your requirements.</p>
            </div>
            <div className="bg-white rounded-xl relative z-10">
              <BuyerRegister embedded={true} onSuccess={() => setAppStatus('PENDING')} />
            </div>
          </section>
        ) : appStatus !== 'APPROVED' && appStatus !== 'LOADING' ? (
          <section className="bg-amber-50 rounded-3xl border border-amber-200 shadow-sm p-6 sm:p-8 relative overflow-hidden text-center">
            <h2 className="text-xl font-extrabold text-amber-900">Registration Status: {appStatus.replace(/_/g, ' ')}</h2>
            <p className="text-sm text-amber-700 mt-2">Your buyer profile is currently under review by the Saathi Admin. You can publish crop requirements once approved.</p>
          </section>
        ) : null}

        {/* ── TOP SECTION: Registration for Publish Form ── */}
      <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 relative overflow-hidden">
        
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 relative z-10">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900">
              {editingRequestId ? '✏️ Edit & Re-Apply for Verification' : 'Publish Crop'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Submit your procurement demand. It will go directly to the <strong>Saathi Admin Panel for verification</strong>. Once approved, it will be published to verified farmers.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowForm(f => !f)}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition shrink-0"
          >
            {showForm ? '▲ Hide Form' : '▼ Expand Form'}
          </button>
        </div>

        {submitMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center justify-between">
            <span>{submitMsg}</span>
            <button onClick={() => setSubmitMsg('')} className="text-emerald-600 text-xs hover:underline">Dismiss</button>
          </div>
        )}

        {showForm && (
          <form onSubmit={handleCreateOrReapplyRequest} className="space-y-4 relative z-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Crop Type *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Premium Basmati Rice"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-red-200 focus:border-red-600 outline-none"
                  value={newRequest.crop}
                  onChange={e => setNewRequest({ ...newRequest, crop: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Required Quantity (Quintals) *</label>
                <input
                  required
                  type="number"
                  min="1"
                  placeholder="e.g. 500"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-red-200 focus:border-red-600 outline-none"
                  value={newRequest.quantity}
                  onChange={e => setNewRequest({ ...newRequest, quantity: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Offered Price (₹ / Quintal) *</label>
                <input
                  required
                  type="number"
                  min="1"
                  placeholder="e.g. 2800"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-red-200 focus:border-red-600 outline-none"
                  value={newRequest.offeredPrice}
                  onChange={e => setNewRequest({ ...newRequest, offeredPrice: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Delivery Location *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Karnal Mandi, Haryana"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-red-200 focus:border-red-600 outline-none"
                  value={newRequest.location}
                  onChange={e => setNewRequest({ ...newRequest, location: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Quality Specifications & Terms</label>
                <textarea
                  rows={3}
                  placeholder="Specify moisture tolerance, packaging requirements, grain size, delivery timeline, etc."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-red-200 focus:border-red-600 outline-none resize-none"
                  value={newRequest.description}
                  onChange={e => setNewRequest({ ...newRequest, description: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Upload Crop Reference Image (Optional, Max 500KB)</label>
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 cursor-pointer"
                    />
                    <p className="text-[11px] text-gray-400 mt-1.5">Max size: 500KB. A default image will be used if skipped.</p>
                  </div>
                  {newRequest.cropImage && (
                    <div className="w-20 h-20 shrink-0 rounded-xl overflow-hidden border border-gray-200 shadow-sm relative group">
                      <img src={newRequest.cropImage} alt="Crop Preview" className="w-full h-full object-cover" />
                      <button 
                        type="button" 
                        onClick={() => setNewRequest({ ...newRequest, cropImage: '' })}
                        className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={appStatus !== 'APPROVED'}
                className={`px-6 py-3 font-bold rounded-xl text-sm transition shadow-md flex items-center gap-2 ${
                  appStatus !== 'APPROVED'
                    ? 'bg-gray-400 cursor-not-allowed text-gray-200'
                    : 'bg-red-700 hover:bg-red-800 text-white'
                }`}
                title={appStatus !== 'APPROVED' ? 'Please complete your profile verification first' : ''}
              >
                <span>🚀</span>
                <span>{editingRequestId ? 'Resubmit to Admin for Verification' : 'Submit for Admin Verification'}</span>
              </button>

              {editingRequestId && (
                <button
                  type="button"
                  onClick={handleCancelReapply}
                  className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm transition"
                >
                  Cancel Reapply
                </button>
              )}
            </div>
          </form>
        )}
      </section>

      {/* ─── Tabs ─── */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {[
          { key: 'requests', label: `My Requirements (${requests.length})` },
          { key: 'marketplace', label: `Browse All Publications (${allPublishedRequests.length})` },
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
      </div>

      {/* ─── TAB 1: My Requests ─── */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {loading ? (
            <p className="text-center text-gray-400 py-10">Loading your requirements…</p>
          ) : requests.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
              <p className="text-gray-400 font-semibold">No procurement requirements submitted yet.</p>
              <p className="text-gray-400 text-sm mt-1">Use the registration form above to post your requirement.</p>
            </div>
          ) : (
            requests.map(req => {
              const fulfilled = getFulfilled(req);
              const total = Number(req.quantity) || 1;
              const pct = Math.min(Math.round((fulfilled / total) * 100), 100);
              const isExpanded = activeOffers?.requestId === req._id;
              const isPending = req.status === 'PENDING_REVIEW';
              const isPublished = req.status === 'PUBLISHED';
              const isRejected = req.status === 'REJECTED';

              return (
                <div key={req._id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  {/* Status Banner */}
                  {isPending && (
                    <div className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 flex items-center justify-between text-xs text-amber-800 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <span className="animate-spin text-amber-600">⏳</span>
                        <span>Under Verification by Saathi Admin. Once verified, it will be published to farmers automatically.</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold uppercase tracking-wider text-xs">Pending Admin Review</span>
                    </div>
                  )}

                  {isRejected && (
                    <div className="bg-red-50 border-b border-red-200 px-5 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-red-800 font-semibold">
                      <div>
                        <span className="font-bold text-red-900">✕ Verification Rejected by Admin:</span> {req.adminRemarks || 'Did not meet verification criteria.'}
                      </div>
                      <button
                        onClick={() => handleStartReapply(req)}
                        className="px-3.5 py-1.5 bg-red-700 text-white rounded-lg text-xs font-bold hover:bg-red-800 transition shrink-0 shadow-sm"
                      >
                        ✏️ Edit & Re-Apply
                      </button>
                    </div>
                  )}

                  {/* ── Request Header Card ── */}
                  <div
                    className={`p-5 border-l-4 cursor-pointer hover:bg-gray-50 transition ${
                      isPending ? 'border-amber-500' : isPublished ? 'border-green-600' : 'border-red-600'
                    }`}
                    onClick={() => {
                      if (!isPublished) return;
                      if (isExpanded) { setActiveOffers(null); } else { loadOffers(req._id); }
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center text-xl">🌾</div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-bold text-gray-900">{req.crop}</h3>
                            {isPublished && <Badge variant="live">● Published & Live</Badge>}
                            {isPending && <Badge variant="pending">● Under Review</Badge>}
                            {isRejected && <Badge variant="rejected">● Rejected</Badge>}
                          </div>
                          <p className="text-sm text-gray-500 mt-0.5">
                            📍 {req.location} &nbsp;·&nbsp; 💰 ₹{Number(req.offeredPrice).toLocaleString('en-IN')}/Quintal Target
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Required Quantity</p>
                        <p className="text-3xl font-extrabold text-gray-900 leading-none mt-0.5">
                          {Number(req.quantity).toLocaleString('en-IN')}
                          <span className="text-sm font-bold text-gray-500 ml-1">Qtl</span>
                        </p>
                      </div>
                    </div>

                    {/* Progress bar for live published requests */}
                    {isPublished && (
                      <div className="mt-4">
                        <div className="flex justify-between text-xs font-bold mb-1.5">
                          <span className="text-green-700">{pct}% Fulfilled</span>
                          <span className="text-gray-500">{fulfilled} / {total} Quintals</span>
                        </div>
                        <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-green-600 to-green-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── Expanded: Offers + Deals (if published) ── */}
                  {isPublished && isExpanded && (
                    <div className="border-t border-gray-100">
                      <div className="grid grid-cols-1 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
                        {/* Left: Incoming Offers */}
                        <div className="lg:col-span-3 p-5">
                          <div className="flex items-center gap-2 mb-4">
                            <h4 className="text-base font-bold text-gray-900">Incoming Farmer Proposals</h4>
                            {activeOffers?.offers.filter(o => o.status === 'PENDING').length > 0 && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                                {activeOffers.offers.filter(o => o.status === 'PENDING').length} New
                              </span>
                            )}
                          </div>

                          {!activeOffers || activeOffers.offers.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">No farmer offers received yet.</p>
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
                                            <span className="ml-1.5 text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">Verified</span>
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

                                    {/* Negotiation History */}
                                    {offer.negotiationHistory && offer.negotiationHistory.length > 1 && (
                                      <div className="bg-white border border-gray-100 rounded-lg p-2 mt-3 mb-2 max-h-32 overflow-y-auto space-y-1.5">
                                        {offer.negotiationHistory.map((hist, idx) => (
                                          <div key={idx} className={`text-xs p-1.5 rounded ${hist.byRole === 'BUYER' ? 'bg-red-50 text-red-800 ml-4' : 'bg-gray-100 text-gray-800 mr-4'}`}>
                                            <span className="font-bold">{hist.byRole}:</span> ₹{hist.price}/Q
                                            {hist.message && <p className="mt-0.5 opacity-80">{hist.message}</p>}
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {/* Actions */}
                                    {(offer.status === 'PENDING' || offer.status === 'COUNTERED_BY_FARMER') ? (
                                      <div className="mt-3">
                                        {!counterForms[offer._id] ? (
                                          <div className="flex items-center gap-2">
                                            <button onClick={() => handleOfferAction(offer._id, 'accept')} className="flex-1 py-2 bg-green-700 text-white text-sm font-bold rounded-lg hover:bg-green-800 transition">Accept Deal</button>
                                            <button onClick={() => setCounterForms({ ...counterForms, [offer._id]: { price: offer.counterOfferPrice, message: '' } })} className="flex-1 py-2 border border-red-700 text-red-700 text-sm font-bold rounded-lg hover:bg-red-50 transition">Counter</button>
                                            <button onClick={() => handleOfferAction(offer._id, 'reject')} className="w-10 h-10 flex items-center justify-center border border-gray-300 text-gray-400 rounded-lg hover:bg-gray-100 transition text-lg">✕</button>
                                          </div>
                                        ) : (
                                          <div className="bg-white p-2 border border-red-100 rounded-lg shadow-sm mt-3">
                                            <input type="number" className="w-full text-xs p-2 border border-gray-200 rounded mb-2" placeholder="Your Counter Price" value={counterForms[offer._id].price} onChange={(e) => setCounterForms({ ...counterForms, [offer._id]: { ...counterForms[offer._id], price: e.target.value } })} />
                                            <input type="text" className="w-full text-xs p-2 border border-gray-200 rounded mb-2" placeholder="Message (Optional)" value={counterForms[offer._id].message} onChange={(e) => setCounterForms({ ...counterForms, [offer._id]: { ...counterForms[offer._id], message: e.target.value } })} />
                                            <div className="flex gap-2">
                                              <button onClick={() => handleOfferAction(offer._id, 'counter', counterForms[offer._id])} className="flex-1 py-1.5 bg-red-700 text-white text-xs font-bold rounded">Send Counter</button>
                                              <button onClick={() => setCounterForms({ ...counterForms, [offer._id]: null })} className="py-1.5 px-3 text-gray-500 text-xs font-bold">Cancel</button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="mt-3 text-right">
                                        <Badge variant={offer.status === 'ACCEPTED' ? 'published' : (offer.status === 'COUNTERED_BY_BUYER' || offer.status === 'COUNTERED_BY_FARMER') ? 'counter' : 'default'}>{offer.status.replace(/_/g, ' ')}</Badge>
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
        </div>
      )}

      {/* ─── TAB 2: Marketplace Publications ─── */}
      {activeTab === 'marketplace' && (() => {
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
        const getCropImage = (pub) => {
          if (pub.cropImage) return pub.cropImage;
          if (!pub.crop) return CROP_IMAGES.default;
          const key = pub.crop.toLowerCase().split(' ')[0];
          return CROP_IMAGES[key] || CROP_IMAGES.default;
        };

        let filteredAndSortedPublications = [...allPublishedRequests];

        if (marketplaceSearch.trim()) {
          const query = marketplaceSearch.toLowerCase();
          filteredAndSortedPublications = filteredAndSortedPublications.filter(pub =>
            (pub.crop && pub.crop.toLowerCase().includes(query)) ||
            (pub.location && pub.location.toLowerCase().includes(query))
          );
        }

        filteredAndSortedPublications.sort((a, b) => {
          if (marketplaceSort === 'recent') return new Date(b.createdAt || Date.now()) - new Date(a.createdAt || Date.now());
          if (marketplaceSort === 'oldest') return new Date(a.createdAt || Date.now()) - new Date(b.createdAt || Date.now());
          if (marketplaceSort === 'price_high') return (Number(b.offeredPrice) || 0) - (Number(a.offeredPrice) || 0);
          if (marketplaceSort === 'price_low') return (Number(a.offeredPrice) || 0) - (Number(b.offeredPrice) || 0);
          if (marketplaceSort === 'qty_high') return (Number(b.quantity) || 0) - (Number(a.quantity) || 0);
          return 0;
        });
          return (
            <div>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
                <div>
                  <p className="text-sm font-bold text-gray-800">{filteredAndSortedPublications.length} Buyer Request{filteredAndSortedPublications.length !== 1 ? 's' : ''}</p>
                  <p className="text-xs text-gray-500">Other buyers' verified requests, published by the SAATHI team</p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="relative flex-1 sm:min-w-[250px]">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                    <input
                      type="text"
                      placeholder="Search by crop or location..."
                      className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none"
                      value={marketplaceSearch}
                      onChange={(e) => setMarketplaceSearch(e.target.value)}
                    />
                  </div>
                  <div className="relative flex items-center border border-gray-300 rounded-xl bg-white hover:bg-gray-50 shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-green-500 shrink-0">
                    <span className="text-gray-400 pl-3 shrink-0">↕️</span>
                    <span className="text-sm text-gray-700 pl-2 whitespace-nowrap shrink-0">Sort by:</span>
                    <select
                      className="text-sm font-semibold text-gray-900 bg-transparent py-2 pl-1 pr-7 outline-none appearance-none cursor-pointer"
                      value={marketplaceSort}
                      onChange={(e) => setMarketplaceSort(e.target.value)}
                    >
                      <option value="recent">Most Recent</option>
                      <option value="oldest">Oldest</option>
                      <option value="price_high">Highest Price</option>
                      <option value="price_low">Lowest Price</option>
                      <option value="qty_high">Highest Quantity</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 text-xs">▼</div>
                  </div>
                </div>
              </div>

              {filteredAndSortedPublications.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
                <p className="text-gray-400 font-semibold">No publications live on the marketplace right now.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredAndSortedPublications.map(pub => (
                  <div key={pub._id} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col">
                    {/* Crop Image Header */}
                    <div className="relative h-36 overflow-hidden">
                      <img
                        src={getCropImage(pub)}
                        alt={pub.crop}
                        className="w-full h-full object-cover"
                        onError={e => { e.target.src = CROP_IMAGES.default; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                      <span className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 bg-white/90 backdrop-blur-sm text-green-700 text-xs font-bold rounded-full border border-green-200 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                        Published
                      </span>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 flex flex-col flex-1">
                      <h4 className="text-lg font-bold text-gray-900 mb-0.5">{pub.crop}</h4>
                      {pub.description && (
                        <p className="text-xs text-gray-500 line-clamp-2 mb-3">{pub.description}</p>
                      )}

                      {/* Quantity & Price */}
                      <div className="grid grid-cols-2 gap-2.5 mb-4">
                        <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2">
                          <span className="text-lg">📦</span>
                          <div>
                            <p className="text-base font-extrabold text-gray-900 leading-tight">{pub.quantity} <span className="text-xs font-semibold text-gray-500">Qtl</span></p>
                            <p className="text-xs text-gray-500 leading-tight">Required Quantity</p>
                          </div>
                        </div>
                        <div className="bg-green-50 rounded-xl p-3 flex items-center gap-2">
                          <span className="text-lg">₹</span>
                          <div>
                            <p className="text-base font-extrabold text-gray-900 leading-tight">₹{Number(pub.offeredPrice).toLocaleString('en-IN')} <span className="text-xs font-semibold text-gray-500">/ Qtl</span></p>
                            <p className="text-xs text-gray-500 leading-tight">Offered Price</p>
                          </div>
                        </div>
                      </div>

                      {/* Buyer & Location */}
                      <div className="mb-4">
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-0.5">
                          <span>👤</span>
                          <span>Buyer</span>
                        </div>
                        <p className="font-semibold text-gray-800 text-sm">{pub.buyerId?.firstName} {pub.buyerId?.lastName}</p>
                        {pub.location && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                            <span>📍</span>
                            <span>{pub.location}</span>
                          </div>
                        )}
                      </div>

                      {/* Buttons */}
                      <div className="mt-auto flex gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedPublishedRequest(pub)}
                          className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
                        >
                          View Request
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedPublishedRequest && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Buyer request details">
                <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-green-700">Published request</p>
                      <h3 className="mt-1 text-2xl font-extrabold text-gray-900">{selectedPublishedRequest.crop}</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedPublishedRequest(null)}
                      className="text-2xl leading-none text-gray-400 hover:text-gray-700"
                      aria-label="Close request details"
                    >
                      ×
                    </button>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Required quantity</p>
                      <p className="mt-1 font-bold text-gray-900">{selectedPublishedRequest.quantity} Qtl</p>
                    </div>
                    <div className="rounded-xl bg-green-50 p-3">
                      <p className="text-xs text-gray-500">Offered price</p>
                      <p className="mt-1 font-bold text-gray-900">₹{Number(selectedPublishedRequest.offeredPrice).toLocaleString('en-IN')} / Qtl</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-gray-600">
                    Buyer: <span className="font-semibold text-gray-900">{selectedPublishedRequest.buyerId?.firstName} {selectedPublishedRequest.buyerId?.lastName}</span>
                  </p>
                  {selectedPublishedRequest.location && (
                    <p className="mt-1 text-sm text-gray-600">📍 {selectedPublishedRequest.location}</p>
                  )}
                  {selectedPublishedRequest.description && (
                    <p className="mt-4 rounded-xl bg-gray-50 p-3 text-sm text-gray-700">{selectedPublishedRequest.description}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedPublishedRequest(null)}
                    className="mt-6 w-full rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-gray-800"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ─── TAB 3: Deals Tab (full DealTracker cards) ─── */}
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
                        <span className="text-lg font-extrabold text-gray-900">{deal.quantity} <span className="text-xs font-bold text-gray-400">Qtl</span></span>
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
