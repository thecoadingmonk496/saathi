import { useState, useRef } from 'react';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5001' : '')).replace(/\/$/, '') + '/api';

const STEPS = [
  { key: 'ACCEPTED', label: 'Accepted', icon: '✓' },
  { key: 'QC_PENDING', label: 'QC Pending', icon: '📷' },
  { key: 'QC_PASSED', label: 'QC Passed', icon: '🔍' },
  { key: 'VERIFIED', label: 'Verified', icon: '✅' },
  { key: 'COMPLETED', label: 'Completed', icon: '🎉' },
];

const STATUS_MAP = {
  ACCEPTED: 0, PHOTO_PENDING: 0, AI_FLAGGED: 0,
  AI_REVIEW: 1, AI_PASSED: 2, HUMAN_REVIEW: 2,
  VERIFIED: 3,
  COMPLETED: 4, DISPUTED: 4,
};

export default function DealTracker({ deal, userRole, onRefresh }) {
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const currentIdx = STATUS_MAP[deal.status] ?? -1;

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length < 5) { alert('Please select at least 5 photos of the crop for verification.'); return; }
    if (files.length > 10) { alert('Maximum 10 photos allowed.'); return; }
    setLoading(true);
    try {
      const base64Images = await Promise.all(files.map(f => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(f);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
      })));
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/buyer-discovery/deals/${deal._id}/quality-submission`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ imageUrls: base64Images }),
      });
      const data = await res.json();
      if (data.success) onRefresh();
      else alert(data.message || 'Error uploading photos');
    } catch (err) { console.error(err); alert('An error occurred while uploading photos.'); }
    finally { setLoading(false); }
  };

  const handleMockAdminVerify = async () => {
    const token = localStorage.getItem('token');
    await fetch(`${API_BASE}/buyer-discovery/deals/${deal._id}/human-review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: 'APPROVED', notes: 'Looks good.' }),
    });
    onRefresh();
  };

  const handleReceiptUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE}/buyer-discovery/deals/${deal._id}/receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ receiptUrl: reader.result }),
      });
      setLoading(false);
      onRefresh();
    };
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="border-t-4 border-red-700" />
      <div className="p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Deal #{deal._id?.slice(-6).toUpperCase()}</p>
            <h3 className="text-xl font-extrabold text-gray-900 mt-1">{deal.crop} — {deal.quantity} Qtl</h3>
            <p className="text-sm text-gray-500 mt-0.5">Agreed Price: <span className="font-bold text-red-700">₹{Number(deal.agreedPrice).toLocaleString('en-IN')}/Qtl</span></p>
          </div>
          <span className={`px-3 py-1 text-xs font-bold rounded-full ${
            deal.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
            deal.status === 'VERIFIED' ? 'bg-blue-100 text-blue-800' :
            'bg-red-100 text-red-800'
          }`}>
            {deal.status.replace(/_/g, ' ')}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Vertical Stepper */}
          <div>
            <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">Deal Progress</h4>
            <div className="space-y-0">
              {STEPS.map((step, idx) => {
                const done = idx < currentIdx;
                const active = idx === currentIdx;
                const pending = idx > currentIdx;
                return (
                  <div key={step.key} className="flex items-start gap-4">
                    {/* dot + connector */}
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold transition-all ${
                        done ? 'bg-red-700 text-white' :
                        active ? 'bg-red-600 text-white ring-4 ring-red-100' :
                        'bg-gray-100 text-gray-400 border-2 border-gray-200'
                      }`}>
                        {done ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <span className="text-xs">{step.icon}</span>
                        )}
                      </div>
                      {idx < STEPS.length - 1 && (
                        <div className={`w-0.5 h-8 ${done ? 'bg-red-700' : 'bg-gray-200'}`} />
                      )}
                    </div>
                    {/* label */}
                    <div className="pt-1.5">
                      <p className={`text-sm font-bold ${done ? 'text-red-800' : active ? 'text-red-700' : 'text-gray-400'}`}>
                        {step.label}
                      </p>
                      {active && deal.status === 'AI_FLAGGED' && (
                        <p className="text-xs text-red-600 mt-0.5">Re-upload required</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Area */}
          <div>
            <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">Action Required</h4>

            {(deal.status === 'ACCEPTED' || deal.status === 'AI_FLAGGED') && (
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
                <h5 className="font-bold text-gray-900 mb-2">
                  {deal.status === 'AI_FLAGGED' ? '⚠️ AI Flagged: Re-Upload Photos' : '📷 Quality Screening'}
                </h5>
                {deal.status === 'AI_FLAGGED' && deal.qualitySubmissions?.length > 0 && (
                  <div className="mb-3 p-3 bg-red-50 text-red-800 rounded-lg text-xs border border-red-200">
                    <strong>Findings:</strong> {deal.qualitySubmissions[deal.qualitySubmissions.length - 1].aiFindings}
                  </div>
                )}
                {userRole === 'FARMER' ? (
                  <>
                    <p className="text-sm text-gray-500 mb-3">Upload at least 5 clear photos of the crop for AI screening.</p>
                    <input type="file" multiple accept="image/*" ref={fileInputRef} className="hidden" onChange={handlePhotoUpload} />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={loading}
                      className="w-full py-3 bg-red-700 text-white font-bold rounded-xl hover:bg-red-800 transition disabled:opacity-50 text-sm"
                    >
                      {loading ? 'Uploading…' : 'Upload 5+ Photos'}
                    </button>
                  </>
                ) : (
                  <p className="text-sm text-gray-500 italic">Waiting for farmer to upload crop photos…</p>
                )}
              </div>
            )}

            {(deal.status === 'AI_PASSED' || deal.status === 'HUMAN_REVIEW') && (
              <div className="bg-blue-50 rounded-xl border border-blue-200 p-5">
                <h5 className="font-bold text-blue-900 mb-2">🔍 Pending Field Verification</h5>
                <p className="text-sm text-blue-700">The crop passed AI screening. A SAATHI field agent will verify the stock.</p>
                <div className="mt-4 p-3 border-2 border-dashed border-red-300 bg-red-50 rounded-lg">
                  <p className="text-[10px] text-red-600 font-bold mb-2 uppercase tracking-wide">Dev Mode</p>
                  <button onClick={handleMockAdminVerify} className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700">
                    Simulate Field Agent Approval
                  </button>
                </div>
              </div>
            )}

            {deal.status === 'VERIFIED' && (
              <div className="bg-green-50 rounded-xl border border-green-200 p-5">
                <h5 className="font-bold text-green-900 mb-2">✅ Verified — Ready for Transaction</h5>
                <p className="text-sm text-green-700 mb-4">Crop quality verified. Contact details are now shared.</p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-white p-3 border border-green-200 rounded-xl">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Buyer</p>
                    <p className="text-sm font-bold text-gray-900 mt-1">{deal.buyerId?.firstName} {deal.buyerId?.lastName}</p>
                    <p className="text-xs text-gray-500">{deal.buyerId?.phone || 'Hidden'}</p>
                    <p className="text-xs text-gray-500">{deal.buyerId?.village}, {deal.buyerId?.district}</p>
                  </div>
                  <div className="bg-white p-3 border border-green-200 rounded-xl">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Farmer</p>
                    <p className="text-sm font-bold text-gray-900 mt-1">{deal.farmerId?.firstName} {deal.farmerId?.lastName}</p>
                    <p className="text-xs text-gray-500">{deal.farmerId?.phone || 'Hidden'}</p>
                    <p className="text-xs text-gray-500">{deal.farmerId?.village}, {deal.farmerId?.district}</p>
                  </div>
                </div>
                <div className="border-t border-green-200 pt-4">
                  <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Upload Transaction Receipt</p>
                  <input type="file" accept="image/*,.pdf" onChange={handleReceiptUpload} className="text-sm text-gray-600" />
                </div>
              </div>
            )}

            {deal.status === 'COMPLETED' && (
              <div className="bg-green-50 rounded-xl border border-green-200 p-5 text-center">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center text-2xl mx-auto mb-3">🎉</div>
                <h5 className="font-bold text-green-900 text-lg">Deal Completed</h5>
                <p className="text-sm text-green-700 mt-1">Transaction receipt has been recorded.</p>
                {deal.transactionReceiptUrl && (
                  <a href={deal.transactionReceiptUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-bold text-red-700 hover:underline">
                    View Receipt →
                  </a>
                )}
              </div>
            )}

            {!['ACCEPTED', 'AI_FLAGGED', 'AI_PASSED', 'HUMAN_REVIEW', 'VERIFIED', 'COMPLETED'].includes(deal.status) && (
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 text-center">
                <p className="text-sm text-gray-500">Processing… Current status: <span className="font-bold">{deal.status}</span></p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
