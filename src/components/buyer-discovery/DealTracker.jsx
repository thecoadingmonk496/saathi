import { useState, useRef } from 'react';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5001' : '')).replace(/\/$/, '') + '/api';

export default function DealTracker({ deal, userRole, onRefresh }) {
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const getStepStatus = (stepName) => {
    const sequence = ['ACCEPTED', 'AI_REVIEW', 'HUMAN_REVIEW', 'VERIFIED', 'COMPLETED'];
    // For visual simplicity, map exact DB states to these primary steps
    let currentIdx = -1;
    if (deal.status === 'ACCEPTED' || deal.status === 'PHOTO_PENDING' || deal.status === 'AI_FLAGGED') currentIdx = 0;
    if (deal.status === 'AI_REVIEW' || deal.status === 'AI_PASSED') currentIdx = 1;
    if (deal.status === 'HUMAN_REVIEW') currentIdx = 2;
    if (deal.status === 'VERIFIED') currentIdx = 3;
    if (deal.status === 'COMPLETED' || deal.status === 'DISPUTED') currentIdx = 4;

    const stepIdx = sequence.indexOf(stepName);
    if (currentIdx > stepIdx) return 'completed';
    if (currentIdx === stepIdx) return 'current';
    return 'pending';
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length < 5) {
      alert('Please select at least 5 photos of the crop for verification.');
      return;
    }
    if (files.length > 10) {
      alert('Maximum 10 photos allowed.');
      return;
    }

    setLoading(true);
    try {
      const base64Images = await Promise.all(files.map(f => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(f);
          reader.onload = () => resolve(reader.result);
          reader.onerror = error => reject(error);
        });
      }));

      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/buyer-discovery/deals/${deal._id}/quality-submission`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ imageUrls: base64Images })
      });
      const data = await res.json();
      if (data.success) {
        onRefresh();
      } else {
        alert(data.message || 'Error uploading photos');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while uploading photos.');
    } finally {
      setLoading(false);
    }
  };

  const handleMockAdminVerify = async () => {
    // DEV ONLY: Simulates SAATHI Field Agent approving
    const token = localStorage.getItem('token');
    await fetch(`${API_BASE}/buyer-discovery/deals/${deal._id}/human-review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: 'APPROVED', notes: 'Looks good.' })
    });
    onRefresh();
  };

  const handleReceiptUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const token = localStorage.getItem('token');
        await fetch(`${API_BASE}/buyer-discovery/deals/${deal._id}/receipt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ receiptUrl: reader.result })
        });
        onRefresh();
      };
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow border border-[var(--saathi-border-light)] relative">
      <div className="flex justify-between items-start mb-6 border-b pb-4">
        <div>
          <h3 className="text-xl font-bold text-[var(--saathi-primary)]">Deal: {deal.crop} - {deal.quantity} qtl</h3>
          <p className="text-gray-600 font-semibold">Agreed Price: ₹{deal.agreedPrice}/qtl</p>
        </div>
        <span className="px-3 py-1 bg-[var(--saathi-primary)] text-white text-sm font-bold rounded-full">
          {deal.status}
        </span>
      </div>

      {/* Visual Stepper */}
      <div className="flex justify-between items-center mb-8 px-4">
        {['ACCEPTED', 'AI_REVIEW', 'HUMAN_REVIEW', 'VERIFIED', 'COMPLETED'].map((step, idx, arr) => {
          const status = getStepStatus(step);
          return (
            <div key={step} className="flex flex-col items-center flex-1 relative">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold z-10 ${status === 'completed' ? 'bg-green-500 text-white' : status === 'current' ? 'bg-blue-600 text-white ring-4 ring-blue-200' : 'bg-gray-200 text-gray-500'}`}>
                {idx + 1}
              </div>
              <span className="text-xs font-semibold mt-2 text-center break-words max-w-[80px]">
                {step.replace('_', ' ')}
              </span>
              {idx < arr.length - 1 && (
                <div className={`absolute top-4 left-1/2 w-full h-1 -z-0 ${status === 'completed' ? 'bg-green-500' : 'bg-gray-200'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Action Area based on Role and Status */}
      <div className="bg-gray-50 p-4 rounded border">
        {deal.status === 'ACCEPTED' || deal.status === 'AI_FLAGGED' ? (
          <div>
            <h4 className="font-bold text-lg mb-2">{deal.status === 'AI_FLAGGED' ? 'AI Flagged: Please Re-Upload' : 'Next Step: Quality Screening'}</h4>
            {deal.status === 'AI_FLAGGED' && deal.qualitySubmissions?.length > 0 && (
              <div className="mb-4 p-3 bg-red-100 text-red-800 rounded text-sm">
                <strong>Findings: </strong> 
                {deal.qualitySubmissions[deal.qualitySubmissions.length - 1].aiFindings}
              </div>
            )}
            {userRole === 'FARMER' ? (
              <div>
                <p className="text-sm text-gray-600 mb-3">Please upload at least 5 clear photos of the crop for AI screening.</p>
                <input 
                  type="file" 
                  multiple 
                  accept="image/*" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handlePhotoUpload} 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()} 
                  disabled={loading}
                  className="bg-[var(--saathi-accent)] text-white px-4 py-2 rounded font-bold hover:brightness-110 disabled:opacity-50"
                >
                  {loading ? 'Uploading...' : 'Upload 5+ Photos'}
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">Waiting for farmer to upload crop photos for AI screening.</p>
            )}
          </div>
        ) : deal.status === 'AI_PASSED' || deal.status === 'HUMAN_REVIEW' ? (
          <div>
            <h4 className="font-bold text-lg mb-2 text-blue-800">Pending SAATHI Field Verification</h4>
            <p className="text-sm text-gray-600">The crop has passed AI screening. A SAATHI field agent will now physically verify the stock.</p>
            {/* Dev Only Button */}
            <div className="mt-4 p-3 border-2 border-dashed border-red-300 bg-red-50 rounded">
              <p className="text-xs text-red-600 font-bold mb-2">DEV MODE (Mock Admin Action):</p>
              <button onClick={handleMockAdminVerify} className="bg-red-600 text-white px-3 py-1 rounded text-sm">
                Simulate Field Agent Approval
              </button>
            </div>
          </div>
        ) : deal.status === 'VERIFIED' ? (
          <div>
            <h4 className="font-bold text-lg mb-2 text-green-700">Verification Complete - Ready for Transacton</h4>
            <p className="text-sm mb-4">The crop quality has been verified. You may now exchange details.</p>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-white p-3 border rounded shadow-sm">
                <h5 className="font-bold text-xs text-gray-500 uppercase tracking-wider">Buyer Details</h5>
                <p className="font-bold">{deal.buyerId?.firstName} {deal.buyerId?.lastName}</p>
                <p>Phone: {deal.buyerId?.phone || 'Hidden'}</p>
                <p>Address: {deal.buyerId?.village}, {deal.buyerId?.district}</p>
              </div>
              <div className="bg-white p-3 border rounded shadow-sm">
                <h5 className="font-bold text-xs text-gray-500 uppercase tracking-wider">Farmer Details</h5>
                <p className="font-bold">{deal.farmerId?.firstName} {deal.farmerId?.lastName}</p>
                <p>Phone: {deal.farmerId?.phone || 'Hidden'}</p>
                <p>Address: {deal.farmerId?.village}, {deal.farmerId?.district}</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <h5 className="font-bold mb-2">Upload Transaction Receipt</h5>
              <input type="file" accept="image/*,.pdf" onChange={handleReceiptUpload} className="text-sm" />
            </div>
          </div>
        ) : deal.status === 'COMPLETED' ? (
          <div>
            <h4 className="font-bold text-lg text-green-800">Deal Completed</h4>
            <p className="text-sm">Transaction receipt has been recorded.</p>
            {deal.transactionReceiptUrl && (
              <a href={deal.transactionReceiptUrl} target="_blank" rel="noreferrer" className="text-[var(--saathi-accent)] text-sm font-semibold hover:underline mt-2 inline-block">
                View Receipt
              </a>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
