import { useState, useRef } from 'react';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5001' : '')).replace(/\/$/, '') + '/api';

const STEPS = [
  { key: 'ACCEPTED', label: 'Accepted', icon: '✓' },
  { key: 'QC_PENDING', label: 'Moisture 11.8%', icon: '💧' },
  { key: 'QC_PASSED', label: 'Agent Assigned', icon: '🛵' },
  { key: 'VERIFIED', label: 'Verified', icon: '✅' },
  { key: 'COMPLETED', label: 'Completed', icon: '🎉' },
];

const STATUS_MAP = {
  ACCEPTED: 0, PHOTO_PENDING: 0, AI_FLAGGED: 0,
  AGENT_PAYMENT_PENDING: 1, AI_PASSED: 1,
  HUMAN_REVIEW: 2,
  VERIFIED: 3,
  COMPLETED: 4, DISPUTED: 4, UNVERIFIED: 2,
};

export default function DealTracker({ deal, userRole, onRefresh }) {
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const fileInputRef = useRef(null);

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
      if (data.success) {
        alert('Moisture percentage acceptable (11.8%)! Produce passed AI screening.');
        onRefresh();
      } else {
        alert(data.message || 'Error uploading photos');
      }
    } catch (err) { console.error(err); alert('An error occurred while uploading photos.'); }
    finally { setLoading(false); }
  };

  const handlePayAgentFee = async () => {
    setPaymentProcessing(true);
    try {
      // Simulate realistic payment gateway processing
      await new Promise(r => setTimeout(r, 800));

      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/buyer-discovery/deals/${deal._id}/pay-agent-fee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setPaymentSuccess(true);
        setTimeout(() => {
          setShowPaymentModal(false);
          setPaymentSuccess(false);
          setPaymentProcessing(false);
          onRefresh();
        }, 1200);
      } else {
        alert(data.message || 'Error processing payment');
        setPaymentProcessing(false);
      }
    } catch (err) {
      console.error(err);
      alert('Network error while paying agent fee.');
      setPaymentProcessing(false);
    }
  };

  const [utrNumber, setUtrNumber] = useState(deal.utrNumber || '');
  const [receiptPreview, setReceiptPreview] = useState(deal.transactionReceiptUrl || '');
  const [submittingReceipt, setSubmittingReceipt] = useState(false);

  const handleReceiptFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setReceiptPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitReceiptAndUtr = async () => {
    if (!receiptPreview && !utrNumber.trim()) {
      alert('Please upload receipt photo and enter UTR number.');
      return;
    }
    setSubmittingReceipt(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/buyer-discovery/deals/${deal._id}/receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ receiptUrl: receiptPreview, utrNumber: utrNumber.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || 'Transaction receipt & UTR submitted! Sent to admin for final completion.');
        onRefresh();
      } else {
        alert(data.message || 'Error submitting receipt');
      }
    } catch (err) {
      console.error(err);
      alert('Network error while submitting receipt.');
    } finally {
      setSubmittingReceipt(false);
    }
  };

  const hasUploadedPhotos = (deal.qualitySubmissions && deal.qualitySubmissions.length > 0) || deal.moisturePercent || deal.status === 'HUMAN_REVIEW' || deal.status === 'AGENT_PAYMENT_PENDING' || deal.status === 'AI_PASSED';
  const isFeePaid = Boolean(deal.agentFeePaid);

  let currentIdx = 0;
  if (deal.status === 'COMPLETED' || deal.status === 'DISPUTED') {
    currentIdx = 4;
  } else if (deal.status === 'VERIFIED') {
    currentIdx = 3;
  } else if (isFeePaid) {
    currentIdx = 2; // Agent Assigned (Fee Paid)
  } else if (hasUploadedPhotos) {
    currentIdx = 1; // Moisture 11.8% (Payment Bar Pending)
  } else {
    currentIdx = 0; // Upload Photos
  }

  const latestSubmission = deal.qualitySubmissions && deal.qualitySubmissions.length > 0
    ? deal.qualitySubmissions[deal.qualitySubmissions.length - 1]
    : null;

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
            deal.status === 'UNVERIFIED' ? 'bg-red-100 text-red-800' :
            isFeePaid ? 'bg-amber-100 text-amber-800' :
            'bg-emerald-100 text-emerald-800'
          }`}>
            {isFeePaid ? 'FIELD AGENT ASSIGNED' : hasUploadedPhotos ? 'PAYMENT PENDING (₹250)' : deal.status.replace(/_/g, ' ')}
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
                      {active && !isFeePaid && hasUploadedPhotos && (
                        <p className="text-xs text-emerald-600 font-semibold mt-0.5">Pay ₹250 to proceed</p>
                      )}
                      {active && deal.status === 'AI_FLAGGED' && (
                        <p className="text-xs text-red-600 mt-0.5">Re-upload required</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Photo preview thumbnails if available */}
            {latestSubmission?.imageUrls && latestSubmission.imageUrls.length > 0 && (
              <div className="mt-6 pt-5 border-t border-gray-100">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Uploaded Crop Photos ({latestSubmission.imageUrls.length})</p>
                <div className="flex flex-wrap gap-2">
                  {latestSubmission.imageUrls.slice(0, 5).map((img, i) => (
                    <img key={i} src={img} alt={`Crop ${i + 1}`} className="w-14 h-14 object-cover rounded-lg border border-gray-200 shadow-xs" />
                  ))}
                  {latestSubmission.imageUrls.length > 5 && (
                    <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center text-xs font-bold text-gray-500 border border-gray-200">
                      +{latestSubmission.imageUrls.length - 5}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action Area */}
          <div>
            <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">Action Required</h4>

            {/* Step 1: Upload Photos (only if not yet uploaded) */}
            {!hasUploadedPhotos && (deal.status === 'ACCEPTED' || deal.status === 'PHOTO_PENDING' || deal.status === 'AI_FLAGGED') && (
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
                <h5 className="font-bold text-gray-900 mb-2">
                  {deal.status === 'AI_FLAGGED' ? '⚠️ AI Flagged: Re-Upload Photos' : '📷 Quality Screening'}
                </h5>
                {deal.status === 'AI_FLAGGED' && deal.qualitySubmissions?.length > 0 && (
                  <div className="mb-3 p-3 bg-red-50 text-red-800 rounded-lg text-xs border border-red-200">
                    <strong>Findings:</strong> {latestSubmission?.aiFindings}
                  </div>
                )}
                <p className="text-sm text-gray-500 mb-3">Upload at least 5 clear photos of the crop for AI screening.</p>
                <input type="file" multiple accept="image/*" ref={fileInputRef} className="hidden" onChange={handlePhotoUpload} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className="w-full py-3 bg-red-700 text-white font-bold rounded-xl hover:bg-red-800 transition disabled:opacity-50 text-sm"
                >
                  {loading ? 'Uploading & Analyzing…' : 'Upload 5+ Photos'}
                </button>
              </div>
            )}

            {/* Step 2: Payment Bar (Shown whenever moisture passed but ₹250 is NOT yet paid) */}
            {hasUploadedPhotos && !isFeePaid && deal.status !== 'VERIFIED' && deal.status !== 'COMPLETED' && deal.status !== 'UNVERIFIED' && (
              <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-5 space-y-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                    💧 Moisture Data: {deal.moisturePercent || 11.8}% • ACCEPTABLE & VERIFIED
                  </span>
                  <h5 className="font-bold text-emerald-950 mt-2 text-base">
                    Moisture percentage acceptable! Produce passed screening.
                  </h5>
                  <p className="text-xs text-emerald-700 mt-1">
                    Optimal moisture recorded at {deal.moisturePercent || 11.8}% (Standard safe storage range: 10% - 14%).
                  </p>
                </div>

                {/* The Payment Bar */}
                <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <div>
                      <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Next Step</p>
                      <h6 className="text-sm font-extrabold text-gray-900">Connect with On-Ground Field Agent</h6>
                    </div>
                    <span className="text-xl font-black text-red-700 bg-red-50 px-3 py-1 rounded-xl border border-red-200">
                      ₹250
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 leading-relaxed">
                    Pay ₹250 for getting in connect with our agent. <strong>He will come in contact with you</strong> for on-ground physical inspection and verification.
                  </p>

                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="w-full py-3.5 bg-red-700 hover:bg-red-800 text-white font-black rounded-xl shadow-lg shadow-red-700/20 transition text-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>💳</span>
                    <span>Pay ₹250 & Connect with Agent →</span>
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: ONLY shown after ₹250 is Paid (isFeePaid === true) */}
            {isFeePaid && deal.status !== 'VERIFIED' && deal.status !== 'COMPLETED' && deal.status !== 'UNVERIFIED' && (
              <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-xs font-black uppercase tracking-wider text-amber-900">
                    Field Agent Assigned • Verification In Progress
                  </span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-500">Agent Connection Fee</span>
                    <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      ₹250 PAID ✓
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-500">Moisture Content</span>
                    <span className="font-bold text-emerald-700">{deal.moisturePercent || 11.8}% (Acceptable)</span>
                  </div>
                </div>

                <div className="p-3.5 bg-amber-100/70 text-amber-950 rounded-xl text-xs font-semibold leading-relaxed border border-amber-300">
                  🛵 <strong>Our agent will come in contact with you!</strong> The inspection request has been submitted for admin verification with your address and contact details. Once the physical check is verified, deal contact details will be fully unlocked.
                </div>
              </div>
            )}

            {/* Step 4: Marked Unverified */}
            {deal.status === 'UNVERIFIED' && (
              <div className="bg-red-50 rounded-2xl border border-red-200 p-5 space-y-2">
                <h5 className="font-bold text-red-900 flex items-center gap-2">
                  <span>❌</span>
                  <span>Physical Inspection: Marked Unverified</span>
                </h5>
                <p className="text-xs text-red-700 leading-relaxed">
                  The produce was marked unverified during the physical inspection by the Saathi agent / admin.
                  {latestSubmission?.humanNotes && (
                    <span className="block mt-2 font-medium bg-red-100 p-2 rounded text-red-900">
                      Reason: {latestSubmission.humanNotes}
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* Step 5: Verified from Agent & UTR Submission */}
            {(deal.status === 'VERIFIED' || deal.status === 'RECEIPT_SUBMITTED') && (
              <div className="space-y-4">
                {/* 1. Verified from Agent Message */}
                <div className="p-4 bg-emerald-100/90 text-emerald-950 rounded-2xl border border-emerald-300 flex items-start gap-3 shadow-xs">
                  <span className="text-xl shrink-0">✅</span>
                  <div>
                    <h5 className="font-extrabold text-emerald-950 text-sm">Verified from Agent</h5>
                    <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
                      Crop quality physically inspected and verified on-ground by SAATHI field agent. All buyer details have been unlocked below.
                    </p>
                  </div>
                </div>

                {/* 2. Small Bar: Buyer Details Showed to Farmer */}
                <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <span className="text-sm font-black uppercase text-emerald-700 tracking-wider flex items-center gap-1.5">
                      <span>🏢</span> Buyer Details & Contact Information
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Verified Buyer ✓
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase">Buyer Name</p>
                      <p className="font-bold text-gray-900 text-sm mt-0.5">
                        {deal.buyerId?.firstName} {deal.buyerId?.lastName}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase">Buyer Phone / Number</p>
                      <p className="font-mono font-bold text-emerald-700 mt-0.5 select-all text-sm">
                        📞 {deal.buyerId?.phone || 'Not provided'}
                      </p>
                    </div>

                    <div className="sm:col-span-2">
                      <p className="text-xs font-bold text-gray-400 uppercase">Buyer Address / Delivery Destination</p>
                      <p className="text-gray-800 font-semibold mt-0.5">
                        📍 {deal.buyerId?.village ? `Village: ${deal.buyerId.village}, ` : ''}
                        {deal.buyerId?.district ? `District: ${deal.buyerId.district}, ` : ''}
                        {deal.buyerId?.state || ''}
                        {deal.buyerRequestId?.location ? ` (Mandi: ${deal.buyerRequestId.location})` : ''}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Transaction Done by Buyer & UTR Upload Section */}
                {deal.status === 'RECEIPT_SUBMITTED' ? (
                  <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-amber-900 tracking-wide flex items-center gap-1.5">
                        <span>📄</span> Transaction Proof & UTR Submitted
                      </span>
                      <span className="text-xs font-bold bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-full">
                        Pending Admin Sign-Off
                      </span>
                    </div>

                    <p className="text-xs text-amber-900 leading-relaxed">
                      Your crop sale transaction proof and UTR have been sent to Saathi Admin for final verification. Once approved from the admin panel, the deal will be marked Completed!
                    </p>

                    <div className="bg-white p-3.5 rounded-xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div>
                        <span className="text-gray-400">Entered UTR:</span>{' '}
                        <span className="font-mono font-black text-gray-900 text-sm">{deal.utrNumber || 'N/A'}</span>
                      </div>
                      {deal.transactionReceiptUrl && (
                        <a
                          href={deal.transactionReceiptUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-bold text-red-700 hover:underline flex items-center gap-1"
                        >
                          <span>🧾</span>
                          <span>View Uploaded Proof →</span>
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4">
                    <div>
                      <h5 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                        <span>🧾</span> Upload Payment Receipt & Enter UTR Number
                      </h5>
                      <p className="text-xs text-gray-500 mt-1">
                        After selling your crop to the buyer and receiving payment, upload the transaction receipt photo and enter the UTR number.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-bold text-gray-600 block mb-1">
                          1. Upload Transaction Receipt Photo
                        </label>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={handleReceiptFileChange}
                          className="text-xs text-gray-700 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 cursor-pointer"
                        />
                        {receiptPreview && (
                          <div className="mt-2">
                            <img src={receiptPreview} alt="Receipt preview" className="w-24 h-24 object-cover rounded-xl border border-gray-300 shadow-xs" />
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="text-sm font-bold text-gray-600 block mb-1">
                          2. Type UTR / Transaction Reference Number
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 12-digit UTR Number (123456789012)"
                          value={utrNumber}
                          onChange={(e) => setUtrNumber(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-red-600"
                        />
                      </div>

                      <button
                        onClick={handleSubmitReceiptAndUtr}
                        disabled={submittingReceipt || (!receiptPreview && !utrNumber.trim())}
                        className="w-full py-3 bg-red-700 hover:bg-red-800 text-white font-bold rounded-xl shadow transition disabled:opacity-50 text-xs flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>📤</span>
                        <span>{submittingReceipt ? 'Submitting Receipt…' : 'Submit Transaction Proof & UTR'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 6: Completed */}
            {deal.status === 'COMPLETED' && (
              <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-6 text-center space-y-3">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-3xl mx-auto text-emerald-600">
                  🎉
                </div>
                <h5 className="font-extrabold text-emerald-950 text-lg">Deal Completed</h5>
                <p className="text-xs text-emerald-700">
                  The crop sale transaction has been fully verified and signed off by Saathi Admin!
                </p>

                {deal.utrNumber && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-emerald-200 text-xs text-gray-700 font-mono">
                    <span className="font-bold text-gray-400">UTR:</span>
                    <span className="font-black text-gray-900">{deal.utrNumber}</span>
                  </div>
                )}

                {deal.transactionReceiptUrl && (
                  <div className="pt-2">
                    <a
                      href={deal.transactionReceiptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow transition"
                    >
                      View Transaction Receipt →
                    </a>
                  </div>
                )}
              </div>
            )}

            {!['ACCEPTED', 'AI_FLAGGED', 'AGENT_PAYMENT_PENDING', 'AI_PASSED', 'HUMAN_REVIEW', 'UNVERIFIED', 'VERIFIED', 'RECEIPT_SUBMITTED', 'COMPLETED'].includes(deal.status) && (
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 text-center">
                <p className="text-sm text-gray-500">Processing… Current status: <span className="font-bold">{deal.status}</span></p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Fake Payment View Modal ── */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-slate-900 text-white p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black text-sm">
                    🔒
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm tracking-tight text-white">SAATHI Secure FastPay</h4>
                    <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                      <span>✓</span> 256-Bit SSL Encrypted
                    </p>
                  </div>
                </div>

                {!paymentProcessing && !paymentSuccess && (
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs font-bold transition"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-end justify-between">
                <div>
                  <p className="text-sm text-slate-400 uppercase tracking-wider font-semibold">Amount to Pay</p>
                  <p className="text-2xl font-black text-white">₹250.00</p>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Field Agent Assignment Fee
                </span>
              </div>
            </div>

            {/* Modal Body */}
            {paymentSuccess ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-3xl mx-auto animate-bounce text-emerald-600">
                  ✓
                </div>
                <h4 className="text-lg font-black text-gray-900">Payment of ₹250 Successful!</h4>
                <p className="text-xs text-gray-500">
                  Transaction Reference: <span className="font-mono font-bold text-gray-700">TXN_{Date.now().toString().slice(-8)}</span>
                </p>
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200">
                  🛵 Our agent will come in contact with you!
                </div>
              </div>
            ) : (
              <div className="p-5 space-y-4">
                {/* Deal details recap */}
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-gray-500">Crop Inspection:</span>{' '}
                    <strong className="text-gray-800">{deal.crop} ({deal.quantity} Qtl)</strong>
                  </div>
                  <span className="font-mono font-bold text-red-700">₹250</span>
                </div>

                {/* Payment Methods */}
                <div>
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Select Payment Method</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'UPI', label: '📱 UPI', desc: 'GPay, PhonePe' },
                      { key: 'CARD', label: '💳 Card', desc: 'Debit/Credit' },
                      { key: 'NETBANKING', label: '🏦 NetBanking', desc: 'All Banks' },
                    ].map((m) => (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => setPaymentMethod(m.key)}
                        className={`p-2.5 rounded-xl border text-left transition ${
                          paymentMethod === m.key
                            ? 'border-red-600 bg-red-50/50 ring-2 ring-red-100'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className="text-xs font-bold text-gray-900">{m.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{m.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Form fields based on selected method */}
                {paymentMethod === 'UPI' && (
                  <div className="space-y-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <label className="text-sm font-bold text-gray-600">Enter UPI ID</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value="farmer@okhdfcbank"
                        className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-mono font-semibold text-gray-800"
                      />
                      <span className="px-3 py-2 bg-green-50 text-green-700 rounded-lg text-xs font-bold border border-green-200 flex items-center">
                        Verified ✓
                      </span>
                    </div>
                    <div className="flex items-center gap-2 pt-1 text-xs text-gray-500">
                      <span>Popular apps:</span>
                      <span className="font-bold text-blue-600">GPay</span>
                      <span>•</span>
                      <span className="font-bold text-purple-600">PhonePe</span>
                      <span>•</span>
                      <span className="font-bold text-sky-600">Paytm</span>
                    </div>
                  </div>
                )}

                {paymentMethod === 'CARD' && (
                  <div className="space-y-2.5 p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                    <div>
                      <label className="text-sm font-bold text-gray-600">Card Number</label>
                      <input
                        type="text"
                        readOnly
                        value="4532 •••• •••• 8821"
                        className="w-full mt-1 px-3 py-2 bg-white border border-gray-300 rounded-lg font-mono font-semibold text-gray-800"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-sm font-bold text-gray-600">Expiry</label>
                        <input
                          type="text"
                          readOnly
                          value="08/29"
                          className="w-full mt-1 px-3 py-2 bg-white border border-gray-300 rounded-lg font-mono font-semibold text-gray-800"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-bold text-gray-600">CVV</label>
                        <input
                          type="password"
                          readOnly
                          value="•••"
                          className="w-full mt-1 px-3 py-2 bg-white border border-gray-300 rounded-lg font-mono font-semibold text-gray-800"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {paymentMethod === 'NETBANKING' && (
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <label className="text-sm font-bold text-gray-600 block mb-2">Select Bank</label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Punjab National Bank'].map((b, i) => (
                        <div key={b} className={`p-2 rounded-lg border bg-white flex items-center gap-2 ${i === 0 ? 'border-red-600 font-bold text-red-700' : 'border-gray-200 text-gray-700'}`}>
                          <span>🏦</span>
                          <span className="truncate">{b}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Primary Pay Button */}
                <button
                  onClick={handlePayAgentFee}
                  disabled={paymentProcessing}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-lg shadow-emerald-600/20 transition disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                >
                  {paymentProcessing ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Processing ₹250 Payment…</span>
                    </>
                  ) : (
                    <>
                      <span>🔒</span>
                      <span>Pay ₹250</span>
                    </>
                  )}
                </button>

                <p className="text-xs text-gray-400 text-center">
                  Clicking Pay completes the ₹250 field agent fee and advances to admin verification.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
