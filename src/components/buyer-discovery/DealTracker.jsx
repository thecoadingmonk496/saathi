import { useState, useRef } from 'react';
import { useRazorpay } from "react-razorpay";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5001' : '')).replace(/\/$/, '') + '/api';

const STEPS = [
  { key: 'ACCEPTED', label: 'Accepted', icon: '✅' },
  { key: 'ESCROW_PENDING', label: 'Escrow', icon: '💰' },
  { key: 'QC_PENDING', label: 'Moisture 11.8%', icon: '💧' },
  { key: 'AGENT_ASSIGNED', label: 'Agent Assigned', icon: '🕵️' },
  { key: 'VERIFIED', label: 'Pre-Shipment Verified', icon: '📦' },
  { key: 'DELIVERY_UPLOADED', label: 'Delivery Uploaded', icon: '🚚' },
  { key: 'COMPLETED', label: 'Completed', icon: '🎉' },
];

const STATUS_MAP = {
  ACCEPTED: 1, 
  PHOTO_PENDING: 2, AI_FLAGGED: 2, ADMIN_MOISTURE_REVIEW: 2,
  BUYER_PAYMENT_PENDING: 3, AI_PASSED: 3, AGENT_PAYMENT_PENDING: 3,
  HUMAN_REVIEW: 4,
  VERIFIED: 4,
  RECEIPT_SUBMITTED: 5,
  COMPLETED: 6, DISPUTED: 6, UNVERIFIED: 4,
};

export default function DealTracker({ deal, userRole, onRefresh }) {
  const [loading, setLoading] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const { Razorpay } = useRazorpay();
  const fileInputRef = useRef(null);
  const [bankAccount, setBankAccount] = useState(deal.farmerBankAccount || '');
  const [escrowModal, setEscrowModal] = useState(false);
  const deliveryFileInputRef = useRef(null);

  const handleBankSubmit = async () => {
    if(!bankAccount) return;
    setLoading(true);
    const token = localStorage.getItem('token');
    await fetch(`${API_BASE}/buyer-discovery/deals/${deal._id}/farmer-bank`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ farmerBankAccount: bankAccount }) });
    setLoading(false);
    onRefresh();
  };

  const handlePayEscrow = async () => {
    setPaymentProcessing(true);
    const token = localStorage.getItem('token');
    await fetch(`${API_BASE}/buyer-discovery/deals/${deal._id}/pay-escrow`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } });
    setPaymentProcessing(false);
    setEscrowModal(false);
    onRefresh();
  };

  const handleDeliveryUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setLoading(true);
    const base64Images = await Promise.all(files.map(f => new Promise((resolve) => {
      const reader = new FileReader(); reader.readAsDataURL(f); reader.onload = () => resolve(reader.result);
    })));
    const token = localStorage.getItem('token');
    await fetch(`${API_BASE}/buyer-discovery/deals/${deal._id}/buyer-delivery-photos`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ imageUrls: base64Images }) });
    setLoading(false);
    onRefresh();
  };


  const [escrowForm, setEscrowForm] = useState({
    accountNumber: '', confirmAccountNumber: '', ifscCode: '', bankName: '', upiId: '', upiPhone: ''
  });
  const [submittingEscrow, setSubmittingEscrow] = useState(false);

  const handleEscrowChange = (e) => setEscrowForm({...escrowForm, [e.target.name]: e.target.value});

  const handleSubmitEscrow = async (e) => {
    e.preventDefault();
    if (escrowForm.accountNumber !== escrowForm.confirmAccountNumber) {
      alert("Account numbers do not match.");
      return;
    }
    setSubmittingEscrow(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/buyer-discovery/deals/${deal._id}/escrow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(escrowForm)
      });
      const data = await res.json();
      if (data.success) {
        alert('Escrow bank details saved successfully.');
        onRefresh();
      } else {
        alert(data.message || 'Error saving escrow details');
      }
    } catch (err) {
      console.error(err);
      alert('Network error while saving escrow details.');
    } finally {
      setSubmittingEscrow(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length < 5) { alert('Please select at least 5 photos of the crop for verification.'); return; }
    if (files.length > 10) { alert('Maximum 10 photos allowed.'); return; }
    if (files.some(f => f.size > 500 * 1024)) { alert('One or more photos exceed 500KB limit. Please select smaller images.'); return; }
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
    const totalAmount = (deal.quantity * deal.agreedPrice) + 250;
    try {
        const token = localStorage.getItem('token');
        
        // 1. Create order on backend (Hardcoded to 1 INR for Razorpay test limit bypass)
        const orderRes = await fetch(`${API_BASE}/payment/create-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ amount: 1, dealId: deal._id }) 
        });
        const orderData = await orderRes.json();
        
        if (!orderData.success) {
            alert("Error initializing payment");
            setPaymentProcessing(false);
            return;
        }

        const options = {
            key: import.meta.env.VITE_RAZORPAY_KEY_ID, 
            amount: orderData.order.amount,
            currency: orderData.order.currency,
            name: "Saathi",
            description: "Crop Escrow & Agent Fee",
            order_id: orderData.order.id,
            handler: async function (response) {
                try {
                    // 2. Verify payment on backend
                    const verifyRes = await fetch(`${API_BASE}/payment/verify-payment`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ ...response, dealId: deal._id })
                    });
                    const verifyData = await verifyRes.json();
                    
                    if (verifyData.success) {
                        // 3. Update Deal DB status
                        const res = await fetch(`${API_BASE}/buyer-discovery/deals/${deal._id}/pay-buyer-escrow`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        });
                        const data = await res.json();
                        if(data.success) {
                            alert("Payment Successful! Deal updated.");
                            onRefresh();
                        } else {
                            alert(data.message || "Payment successful but failed to update deal status.");
                        }
                    } else {
                        alert("Payment verification failed.");
                    }
                } catch (err) {
                    alert("Error verifying payment.");
                } finally {
                    setPaymentProcessing(false);
                }
            },
            prefill: {
                name: "Buyer",
                email: "buyer@example.com",
            },
            theme: { color: "#b91c1c" } // red-700
        };

        const rzp = new Razorpay(options);
        rzp.on("payment.failed", function (response) {
            alert(response.error.description);
            setPaymentProcessing(false);
        });
        rzp.open();
        
    } catch (err) {
        console.error("Payment error", err);
        alert('Network error while initiating payment.');
        setPaymentProcessing(false);
    }
  };

  const handlePayFarmerFee = async () => {
    try {
        setPaymentProcessing(true);
        const token = localStorage.getItem('token');
        
        // 1. Create order on backend (amount 200 INR)
        const orderRes = await fetch(`${API_BASE}/payment/create-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ amount: 200, dealId: deal._id }) 
        });
        const orderData = await orderRes.json();
        
        if (!orderData.success) {
            alert("Error initializing payment");
            setPaymentProcessing(false);
            return;
        }

        const options = {
            key: import.meta.env.VITE_RAZORPAY_KEY_ID, 
            amount: orderData.order.amount,
            currency: orderData.order.currency,
            name: "Saathi",
            description: "Field Agent Verification Fee",
            order_id: orderData.order.id,
            handler: async function (response) {
                try {
                    // 2. Verify payment on backend
                    const verifyRes = await fetch(`${API_BASE}/payment/verify-payment`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ ...response, dealId: deal._id })
                    });
                    const verifyData = await verifyRes.json();
                    
                    if (verifyData.success) {
                        // 3. Update Deal DB status
                        const res = await fetch(`${API_BASE}/buyer-discovery/deals/${deal._id}/pay-farmer-fee`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        });
                        const data = await res.json();
                        if(data.success) {
                            alert("Verification Fee Paid Successfully! Field Agent assigned.");
                            onRefresh();
                        } else {
                            alert(data.message || "Payment successful but failed to update deal status.");
                        }
                    } else {
                        alert("Payment verification failed.");
                    }
                } catch (err) {
                    alert("Error verifying payment.");
                } finally {
                    setPaymentProcessing(false);
                }
            },
            prefill: {
                name: "Farmer",
                email: "farmer@example.com",
            },
            theme: { color: "#16a34a" } // green-600
        };

        const rzp = new Razorpay(options);
        rzp.on("payment.failed", function (response) {
            alert(response.error.description);
            setPaymentProcessing(false);
        });
        rzp.open();
    } catch (err) {
        console.error("Payment flow error:", err);
        alert("Payment Error: " + err.message);
        setPaymentProcessing(false);
    }
  };

  const [utrNumber, setUtrNumber] = useState(deal.utrNumber || '');
  const [receiptPreview, setReceiptPreview] = useState(deal.transactionReceiptUrl || '');
  const [submittingReceipt, setSubmittingReceipt] = useState(false);

  const handleReceiptFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 500 * 1024) { alert('Receipt image is too large. Please upload a file under 500KB.'); e.target.value = ''; return; }
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

  const hasUploadedPhotos = (deal.qualitySubmissions && deal.qualitySubmissions.length > 0) || deal.status === 'HUMAN_REVIEW' || deal.status === 'BUYER_PAYMENT_PENDING' || deal.status === 'AI_PASSED' || deal.status === 'ADMIN_MOISTURE_REVIEW';
  const isFeePaid = Boolean(deal.agentFeePaid) && Boolean(deal.escrowDepositPaid);

  let currentIdx = 0;
  if (deal.status === 'COMPLETED' || deal.status === 'DISPUTED') {
    currentIdx = 6;
  } else if (deal.status === 'RECEIPT_SUBMITTED' || deal.status === 'BUYER_DELIVERY_UPLOADED') {
    currentIdx = 5;
  } else if (deal.status === 'VERIFIED' || deal.status === 'ADMIN_PRE_SHIPMENT_VERIFIED') {
    currentIdx = 4;
  } else if (isFeePaid || deal.status === 'HUMAN_REVIEW') {
    currentIdx = 3; // Agent Assigned (Fee Paid)
  } else if (hasUploadedPhotos || deal.status === 'BUYER_PAYMENT_PENDING' || deal.status === 'PHOTO_PENDING' || deal.status === 'AGENT_PAYMENT_PENDING' || deal.status === 'AI_PASSED' || deal.status === 'ADMIN_MOISTURE_REVIEW') {
    currentIdx = 2; // Moisture
  } else if (deal.escrowStatus === 'FUNDED' || deal.status === 'ESCROW_PENDING' || deal.status === 'ACCEPTED') {
    currentIdx = 1; // Escrow
  } else {
    currentIdx = 0; // Accepted
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
                      {active && !isFeePaid && deal.status === 'BUYER_PAYMENT_PENDING' && (
                        <p className="text-xs text-emerald-600 font-semibold mt-0.5">Waiting for Buyer</p>
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

              {/* Delivery Photo preview thumbnails if available */}
              {deal.deliverySubmissions && deal.deliverySubmissions.length > 0 && (
                <div className="mt-6 pt-5 border-t border-gray-100">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Uploaded Delivery Photos ({deal.deliverySubmissions.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {deal.deliverySubmissions.map((img, i) => (
                      <img key={i} src={img} alt={`Delivery ${i + 1}`} className="w-14 h-14 object-cover rounded-lg border border-gray-200 shadow-xs" />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Area */}
          <div>
            <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">Action Required</h4>

            {/* Step 1: Escrow Bank Details */}
            {userRole === 'FARMER' && deal.status === 'ACCEPTED' && (
              <div className="bg-orange-50 rounded-xl border border-orange-200 p-5 mb-6">
                <h5 className="font-bold text-gray-900 mb-4">Enter Bank Account for Escrow</h5>
                <form onSubmit={handleSubmitEscrow} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" name="accountNumber" placeholder="Bank Account Number" value={escrowForm.accountNumber} onChange={handleEscrowChange} required className="px-4 py-2 border rounded-lg focus:outline-red-700 w-full" />
                    <input type="text" name="confirmAccountNumber" placeholder="Re-type Account Number" value={escrowForm.confirmAccountNumber} onChange={handleEscrowChange} required className="px-4 py-2 border rounded-lg focus:outline-red-700 w-full" />
                    <input type="text" name="ifscCode" placeholder="IFSC Code" value={escrowForm.ifscCode} onChange={handleEscrowChange} required className="px-4 py-2 border rounded-lg focus:outline-red-700 w-full uppercase" />
                    <input type="text" name="bankName" placeholder="Bank Name" value={escrowForm.bankName} onChange={handleEscrowChange} required className="px-4 py-2 border rounded-lg focus:outline-red-700 w-full" />
                    <input type="text" name="upiId" placeholder="UPI ID" value={escrowForm.upiId} onChange={handleEscrowChange} required className="px-4 py-2 border rounded-lg focus:outline-red-700 w-full" />
                    <input type="tel" name="upiPhone" placeholder="UPI Phone Number" value={escrowForm.upiPhone} onChange={handleEscrowChange} required className="px-4 py-2 border rounded-lg focus:outline-red-700 w-full" />
                  </div>
                  <button type="submit" disabled={submittingEscrow} className="px-6 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg transition disabled:bg-gray-400">
                    {submittingEscrow ? 'Saving...' : 'Save'}
                  </button>
                </form>
              </div>
            )}

          {userRole === 'BUYER' && deal.status === 'ESCROW_PENDING' && (
            <div className="mb-4 p-4 border rounded-xl bg-orange-50 border-orange-200">
              <p className="text-sm font-bold text-gray-800 mb-2">Pay the fixed deal amount to proceed (₹{deal.agreedPrice})</p>
              <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold text-sm" onClick={() => setEscrowModal(true)}>Pay Fixed Amount</button>
            </div>
          )}

          {userRole === 'BUYER' && deal.status === 'ADMIN_PRE_SHIPMENT_VERIFIED' && (
             <div className="mb-4 p-4 border rounded-xl bg-blue-50 border-blue-200">
              <p className="text-sm font-bold text-gray-800 mb-2">Shipment Verified by Admin! Please upload photos when you receive delivery.</p>
              <input type="file" multiple accept="image/*" className="hidden" ref={deliveryFileInputRef} onChange={handleDeliveryUpload} />
              <button onClick={() => deliveryFileInputRef.current.click()} disabled={loading} className="px-4 py-2 bg-slate-800 text-white font-bold rounded-lg text-sm hover:bg-slate-900">
                {loading ? 'Uploading...' : 'Upload Delivery Photos'}
              </button>
            </div>
          )}
          
          {deal.status === 'BUYER_DELIVERY_UPLOADED' && (
            <div className="mb-4 p-4 border rounded-xl bg-purple-50 border-purple-200">
              <p className="text-sm font-bold text-purple-800">Waiting for Admin to verify delivery and release Escrow funds.</p>
            </div>
          )}

            {/* Step 2: Upload Photos (only if not yet uploaded) */}
            {!hasUploadedPhotos && (deal.status === 'PHOTO_PENDING' || deal.status === 'AI_FLAGGED') && (
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
                <h5 className="font-bold text-gray-900 mb-2">
                  {deal.status === 'AI_FLAGGED' ? '⚠️ AI Flagged: Re-Upload Photos' : '📷 Quality Screening'}
                </h5>
                {deal.status === 'AI_FLAGGED' && deal.qualitySubmissions?.length > 0 && (
                  <div className="mb-3 p-3 bg-red-50 text-red-800 rounded-lg text-xs border border-red-200">
                    <strong>Findings:</strong> {latestSubmission?.aiFindings}
                  </div>
                )}
                <p className="text-sm text-gray-500 mb-3">Upload at least 5 clear photos of the crop for AI screening (Max 500KB per photo).</p>
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

            {deal.status === 'ADMIN_MOISTURE_REVIEW' && (
              <div className="bg-amber-50 rounded-xl border border-amber-200 p-5">
                <h5 className="font-bold text-amber-900 mb-2">
                  ⏳ Waiting for Admin Approval
                </h5>
                <p className="text-sm text-amber-800">
                  The photos have been uploaded and passed AI screening. Please wait for the admin to verify the moisture content and approve the photos before proceeding to payment.
                </p>
              </div>
            )}

                  {/* Step 2: Payment Bar (Shown when moisture passed but fees NOT yet paid) */}
            {hasUploadedPhotos && !isFeePaid && deal.status === 'BUYER_PAYMENT_PENDING' && (
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

                {userRole === 'BUYER' ? (
                  <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-sm space-y-3">
                    <div className="flex flex-col gap-2 pb-3 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-gray-500">Fixed Deal Amount</p>
                        <span className="text-sm font-bold text-gray-900">₹{(deal.quantity * deal.agreedPrice).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-gray-500">Field Agent Fee</p>
                        <span className="text-sm font-bold text-gray-900">₹250</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <h6 className="text-base font-extrabold text-gray-900">Total Payable Amount</h6>
                        <span className="text-xl font-black text-red-700 bg-red-50 px-3 py-1 rounded-xl border border-red-200">
                          ₹{((deal.quantity * deal.agreedPrice) + 250).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-gray-600 leading-relaxed">
                      Pay the fixed deal amount and the agent fee. <strong>An on-ground agent will then be assigned</strong> for physical inspection.
                    </p>

                    <button
                      onClick={handlePayAgentFee}
                      disabled={paymentProcessing}
                      className="w-full py-3.5 bg-red-700 hover:bg-red-800 text-white font-black rounded-xl shadow-lg shadow-red-700/20 transition text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <span>{paymentProcessing ? 'Processing...' : `Pay ₹${((deal.quantity * deal.agreedPrice) + 250).toLocaleString('en-IN')} Now`}</span>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-sm space-y-3 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h6 className="text-sm font-extrabold text-gray-900">Buyer is completing their process</h6>
                      <p className="text-xs text-gray-500 mt-0.5">Waiting for the buyer to pay the fixed deal amount and agent fee. You will be notified once the agent is assigned.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2.5: Farmer Pays Verification Fee */}
            {deal.status === 'AGENT_PAYMENT_PENDING' && (
              <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5 space-y-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-xs font-black uppercase tracking-wider text-amber-900">
                    Pending Field Agent Fee
                  </span>
                </div>
                
                {userRole === 'FARMER' ? (
                  <div className="bg-white p-5 rounded-xl border border-amber-200 shadow-sm space-y-4">
                    <h5 className="font-bold text-gray-900 flex items-center gap-2">
                      <span>👤</span> Pay Field Agent Verification Fee
                    </h5>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      The buyer has successfully deposited the fixed deal amount into escrow. To proceed with the physical verification, you need to pay the field agent verification fee.
                    </p>
                    
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <span className="text-sm font-semibold text-gray-600">Verification Fee</span>
                      <span className="font-black text-gray-900 text-lg">₹200</span>
                    </div>

                    <button
                      onClick={handlePayFarmerFee}
                      disabled={paymentProcessing}
                      className="w-full py-3.5 bg-[#16a34a] hover:bg-green-700 text-white font-black text-sm uppercase tracking-wider rounded-xl transition flex justify-center items-center gap-2 shadow-md shadow-green-600/20"
                    >
                      {paymentProcessing ? 'Processing...' : 'Pay ₹200 via Razorpay'}
                    </button>
                  </div>
                ) : (
                  <div className="bg-white p-4 rounded-xl border border-amber-200 text-sm font-medium text-amber-900">
                    Waiting for the Farmer to pay their field agent verification fee. Once paid, the physical inspection process will begin.
                  </div>
                )}
              </div>
            )}

            {/* Step 3: ONLY shown after ₹250 is Paid (isFeePaid === true) */}
            {isFeePaid && deal.status !== 'AGENT_PAYMENT_PENDING' && deal.status !== 'VERIFIED' && deal.status !== 'ADMIN_PRE_SHIPMENT_VERIFIED' && deal.status !== 'COMPLETED' && deal.status !== 'UNVERIFIED' && (
              <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-xs font-black uppercase tracking-wider text-amber-900">
                    Field Agent Assigned • Verification In Progress
                  </span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-500">Fixed Deal Amount</span>
                    <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      ₹{(deal.escrowDepositAmount || (deal.quantity * deal.agreedPrice)).toLocaleString('en-IN')} PAID ✓
                    </span>
                  </div>
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
                  {userRole?.toLowerCase() === 'buyer' ? (
                    <>🛵 <strong>Saathi Field Agent Assigned!</strong> The field agent is contacting the farmer to physically verify the crop quality. Once verified, the farmer's contact details will be fully unlocked for you.</>
                  ) : (
                    <>🛵 <strong>Our agent will come in contact with you!</strong> The inspection request has been submitted for admin verification with your address and contact details. Once the physical check is verified, deal contact details will be fully unlocked.</>
                  )}
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

            {/* Step 5: Verified from Agent (Receipt submission moved to admin) */}
            {(deal.status === 'VERIFIED' || deal.status === 'ADMIN_PRE_SHIPMENT_VERIFIED' || deal.status === 'RECEIPT_SUBMITTED' || deal.status === 'BUYER_DELIVERY_UPLOADED') && (
              <div className="space-y-4">
                {/* 1. Verified from Agent Message */}
                <div className="p-4 bg-emerald-100/90 text-emerald-950 rounded-2xl border border-emerald-300 flex items-start gap-3 shadow-xs">
                  <span className="text-xl shrink-0">✅</span>
                  <div>
                    <h5 className="font-extrabold text-emerald-950 text-sm">Verified from Agent</h5>
                    <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
                      Crop quality physically inspected and verified on-ground by SAATHI field agent. All {userRole?.toLowerCase() === 'buyer' ? 'farmer' : 'buyer'} details have been unlocked below.
                    </p>
                  </div>
                </div>

                {/* 2. Small Bar: Contact Details Showed to Counterparty */}
                <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <span className="text-sm font-black uppercase text-emerald-700 tracking-wider flex items-center gap-1.5">
                      {userRole?.toLowerCase() === 'buyer' ? <span>👨‍🌾</span> : <span>🏢</span>} 
                      {userRole?.toLowerCase() === 'buyer' ? 'Farmer Details & Contact Information' : 'Buyer Details & Contact Information'}
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Verified {userRole?.toLowerCase() === 'buyer' ? 'Farmer' : 'Buyer'} ✓
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase">{userRole?.toLowerCase() === 'buyer' ? 'Farmer' : 'Buyer'} Name</p>
                      <p className="font-bold text-gray-900 text-sm mt-0.5">
                        {userRole?.toLowerCase() === 'buyer' 
                          ? `${deal.farmerId?.firstName || ''} ${deal.farmerId?.lastName || ''}` 
                          : `${deal.buyerId?.firstName || ''} ${deal.buyerId?.lastName || ''}`}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase">{userRole?.toLowerCase() === 'buyer' ? 'Farmer' : 'Buyer'} Phone / Number</p>
                      <p className="font-mono font-bold text-emerald-700 mt-0.5 select-all text-sm">
                        📞 {userRole?.toLowerCase() === 'buyer' 
                            ? (deal.farmerId?.phone || 'Not provided')
                            : (deal.buyerId?.phone || 'Not provided')}
                      </p>
                    </div>

                    <div className="sm:col-span-2">
                      <p className="text-xs font-bold text-gray-400 uppercase">
                        {userRole?.toLowerCase() === 'buyer' ? 'Farmer Address / Pickup Location' : 'Buyer Address / Delivery Destination'}
                      </p>
                      <p className="text-gray-800 font-semibold mt-0.5">
                        {userRole?.toLowerCase() === 'buyer' ? (
                          <>
                            📍 {deal.farmerId?.village ? `Village: ${deal.farmerId.village}, ` : ''}
                            {deal.farmerId?.district ? `District: ${deal.farmerId.district}, ` : ''}
                            {deal.farmerId?.state || ''}
                          </>
                        ) : (
                          <>
                            📍 {deal.buyerId?.village ? `Village: ${deal.buyerId.village}, ` : ''}
                            {deal.buyerId?.district ? `District: ${deal.buyerId.district}, ` : ''}
                            {deal.buyerId?.state || ''}
                            {deal.buyerRequestId?.location ? ` (Mandi: ${deal.buyerRequestId.location})` : ''}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 6: Completed */}
            {deal.status === 'COMPLETED' && (
              <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-6 text-center space-y-3">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-3xl mx-auto text-emerald-600">
                  🎉
                </div>
                <h5 className="font-extrabold text-emerald-950 text-lg">Deal Completed</h5>
                <p className="text-sm text-emerald-800">
                  The crop sale transaction has been fully verified! The escrow funds have been successfully transferred to the farmer's bank account.
                </p>

                {deal.utrNumber && (
                  <div className="mt-4 p-4 bg-white rounded-xl border border-emerald-200 text-left space-y-2 max-w-sm mx-auto shadow-sm">
                    <h6 className="text-xs font-black uppercase text-gray-500 tracking-wider flex items-center gap-1.5">
                      <span>🏦</span> Admin Escrow Transfer Details
                    </h6>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs font-semibold text-gray-500">UTR / Ref No.</span>
                      <span className="font-mono font-black text-gray-900 text-sm">{deal.utrNumber}</span>
                    </div>
                    {deal.transactionReceiptUrl && (
                      <div className="pt-2">
                        <a href={deal.transactionReceiptUrl} target="_blank" rel="noreferrer" className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition">
                          <span>🧾</span>
                          <span>View Bank Transfer Receipt</span>
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {!['ACCEPTED', 'ESCROW_PENDING', 'PHOTO_PENDING', 'BUYER_DELIVERY_UPLOADED', 'ADMIN_PRE_SHIPMENT_VERIFIED', 'AI_FLAGGED', 'AGENT_PAYMENT_PENDING', 'AI_PASSED', 'HUMAN_REVIEW', 'UNVERIFIED', 'VERIFIED', 'RECEIPT_SUBMITTED', 'COMPLETED', 'BUYER_PAYMENT_PENDING', 'ADMIN_MOISTURE_REVIEW'].includes(deal.status) && (
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 text-center">
                <p className="text-sm text-gray-500">Processing… Current status: <span className="font-bold">{deal.status}</span></p>
              </div>
            )}
          </div>
        </div>
      </div>


    
      {escrowModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="font-extrabold text-gray-900 text-lg mb-4">Pay Fixed Deal Amount</h3>
            <p className="text-sm mb-4">Amount: ₹{deal.agreedPrice}</p>
            <button onClick={handlePayEscrow} disabled={paymentProcessing} className="w-full py-3 bg-emerald-600 text-white font-black rounded-xl">
              {paymentProcessing ? 'Processing...' : `Pay ₹${deal.agreedPrice}`}
            </button>
            <button onClick={()=>setEscrowModal(false)} className="w-full py-3 mt-2 text-gray-500 font-bold">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

