import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import saathiLogo from '../assets/logo.png';

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5001' : '')
).replace(/\/$/, '');

const apiUrl = (path) => `${API_BASE_URL}${path}`;

const InlineConfirmButton = ({ 
  baseText, 
  baseClassName, 
  onConfirm, 
  confirmText = "Yes, Proceed", 
  fastMode, 
  disabled,
  confirmingId,
  setConfirmingId,
  id,
  requireReason = false,
  reasonPlaceholder = "Reason (optional)"
}) => {
  const isConfirming = confirmingId === id;
  const [reason, setReason] = React.useState("");
  
  if (fastMode) {
    return (
      <button 
        disabled={disabled}
        onClick={(e) => { e.stopPropagation(); onConfirm(requireReason ? "Action taken in Fast Mode" : undefined); }} 
        className={baseClassName}
      >
        {baseText}
      </button>
    );
  }
  
  if (isConfirming) {
    return (
      <div className="flex flex-col gap-2 p-2 bg-red-50 rounded-lg animate-in fade-in zoom-in-95 duration-200 w-full" onClick={e => e.stopPropagation()}>
        <span className="text-xs font-bold text-red-800">Are you sure?</span>
        {requireReason && (
          <input 
            type="text" 
            placeholder={reasonPlaceholder} 
            value={reason} 
            onChange={e => setReason(e.target.value)}
            className="w-full px-2 py-1.5 text-xs rounded bg-white focus:outline-none focus:border-red-400 text-slate-800"
          />
        )}
        <div className="flex items-center gap-1.5">
          <button 
            disabled={disabled}
            onClick={(e) => { e.stopPropagation(); setConfirmingId(null); onConfirm(reason || undefined); }} 
            className="flex-1 px-3 py-1.5 bg-[#E51B2A] hover:bg-red-800 text-white rounded-md text-[10px] font-bold transition shadow-sm whitespace-nowrap"
          >
            {confirmText}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); setConfirmingId(null); setReason(""); }} 
            className="flex-1 px-3 py-1.5 bg-white hover:bg-gray-100 text-[#5F6B7A] rounded-md text-[10px] font-bold transition shadow-sm whitespace-nowrap"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <button 
      disabled={disabled}
      onClick={(e) => { e.stopPropagation(); setConfirmingId(id); }} 
      className={baseClassName}
    >
      {baseText}
    </button>
  );
};

export default function Admin() {
  const [activeTab, setActiveTab] = useState('buyer-requests');
  const [users, setUsers] = useState(() => { try { return JSON.parse(localStorage.getItem('adminDashboardData'))?.users || []; } catch(e) { return []; } });
  const [buyerRequests, setBuyerRequests] = useState(() => { try { return JSON.parse(localStorage.getItem('adminDashboardData'))?.buyerRequests || []; } catch(e) { return []; } });
  const [buyerApplications, setBuyerApplications] = useState(() => { try { return JSON.parse(localStorage.getItem('adminDashboardData'))?.buyerApplications || []; } catch(e) { return []; } });
  const [dealInspections, setDealInspections] = useState(() => { try { return JSON.parse(localStorage.getItem('adminDashboardData'))?.dealInspections || []; } catch(e) { return []; } });
  const [inspectionFilter, setInspectionFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [requestFilter, setRequestFilter] = useState('ALL');
  const [loading, setLoading] = useState(() => !localStorage.getItem('adminDashboardData'));
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [adminUtr, setAdminUtr] = useState('');
  const [adminReceipt, setAdminReceipt] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [toasts, setToasts] = useState([]);
  const addToast = (msg, type = 'success') => {
    if (!msg) return;
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message: msg, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };
  const setError = (msg) => addToast(msg, 'error');
  const setSuccessMsg = (msg) => addToast(msg, 'success');
  const [loadedImages, setLoadedImages] = useState({}); // Stores lazily loaded images for deals
  const [selectedIds, setSelectedIds] = useState([]);

  // Wallet state — SWR: initialize from localStorage cache for instant load
  const [walletData, setWalletData] = useState(() => { try { return JSON.parse(localStorage.getItem('adminWalletData'))?.walletData || { balance: 0, totalReceived: 0, totalForwarded: 0 }; } catch(e) { return { balance: 0, totalReceived: 0, totalForwarded: 0 }; } });
  const [walletTransactions, setWalletTransactions] = useState(() => { try { return JSON.parse(localStorage.getItem('adminWalletData'))?.walletTransactions || []; } catch(e) { return []; } });
  const [walletTxFilter, setWalletTxFilter] = useState('ALL');
  const [payingFarmerId, setPayingFarmerId] = useState(null);
  const [lastGeneratedReceipt, setLastGeneratedReceipt] = useState(null);
  
  // 9-Stage KYC Inspection Modal State
  const [selectedKycApp, setSelectedKycApp] = useState(null);
  const [relatedRequest, setRelatedRequest] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  const [fastMode, setFastMode] = useState(false);
  const [confirmingId, setConfirmingId] = useState(null);

  const fetchDealImages = async (dealId) => {
    setLoadedImages(prev => ({ ...prev, [dealId]: { ...prev[dealId], isLoading: true } }));
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(apiUrl(`/api/admin/deals/${dealId}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        const fullDeal = data.data;
        const latestSub = fullDeal.qualitySubmissions && fullDeal.qualitySubmissions.length > 0
          ? fullDeal.qualitySubmissions[fullDeal.qualitySubmissions.length - 1]
          : null;
        setLoadedImages(prev => ({
          ...prev,
          [dealId]: {
            isLoading: false,
            images: latestSub?.imageUrls || [],
            receiptUrl: fullDeal.transactionReceiptUrl || ''
          }
        }));
      } else {
        setLoadedImages(prev => ({ ...prev, [dealId]: { isLoading: false, error: 'Failed to load images' } }));
      }
    } catch (err) {
      setLoadedImages(prev => ({ ...prev, [dealId]: { isLoading: false, error: 'Network error loading images' } }));
    }
  };

  const fetchWalletData = async (token) => {
    try {
      const t = token || localStorage.getItem('adminToken');
      const [walletRes, txRes] = await Promise.all([
        fetch(apiUrl('/api/admin/wallet'), { headers: { Authorization: `Bearer ${t}` } }),
        fetch(apiUrl('/api/admin/wallet/transactions?limit=200'), { headers: { Authorization: `Bearer ${t}` } }),
      ]);
      const [walletJson, txJson] = await Promise.all([walletRes.json(), txRes.json()]);
      if (walletJson.success) setWalletData(walletJson.data);
      if (txJson.success) setWalletTransactions(txJson.data || []);
      // Save to localStorage cache (SWR pattern)
      if (walletJson.success || txJson.success) {
        localStorage.setItem('adminWalletData', JSON.stringify({
          walletData: walletJson.success ? walletJson.data : walletData,
          walletTransactions: txJson.success ? (txJson.data || []) : walletTransactions,
        }));
      }
    } catch (err) {
      console.error('Failed to fetch wallet data:', err.message);
    }
  };
  
  const navigate = useNavigate();
  const adminEmail = localStorage.getItem('adminEmail') || 'ts7529614@gmail.com';

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin/login', { replace: true });
      return;
    }
    fetchAllData(token);
    fetchWalletData(token);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminEmail');
    navigate('/admin/login', { replace: true });
  };

  const fetchAllData = async (token) => {
    const activeToken = token || localStorage.getItem('adminToken');
    if (!activeToken) {
      navigate('/admin/login', { replace: true });
      return;
    }

    if (!localStorage.getItem('adminDashboardData')) {
      setLoading(true);
    }
    setError('');

    try {
      const headers = { Authorization: `Bearer ${activeToken}` };
      
      const res = await fetch(apiUrl('/api/admin/dashboard-summary'), { headers });
      
      if (res.status === 401 || res.status === 403) {
        handleLogout();
        return;
      }

      const json = await res.json();
      
      if (res.ok && json.success) {
        setUsers(json.data.users || []);
        setBuyerRequests(json.data.buyerRequests || []);
        setBuyerApplications(json.data.buyerApplications || []);
        setDealInspections(json.data.dealInspections || []);

        localStorage.setItem('adminDashboardData', JSON.stringify({
          users: json.data.users || [],
          buyerRequests: json.data.buyerRequests || [],
          buyerApplications: json.data.buyerApplications || [],
          dealInspections: json.data.dealInspections || []
        }));
      }
      
    } catch (err) {
      setError('Unable to communicate with the backend. Please ensure the server is active.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Open 9-Stage KYC Modal for a Request ── */
  const openKycApp = async (appId, fallbackApp = null, relatedReq = null) => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(apiUrl(`/api/admin/buyer-applications/${appId}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.data) {
        setSelectedKycApp(data.data);
      } else if (fallbackApp) {
        setSelectedKycApp(fallbackApp);
      }
    } catch (err) {
      if (fallbackApp) setSelectedKycApp(fallbackApp);
    }
    setRelatedRequest(relatedReq);
  };

  const openKycForRequest = (req) => {
    const app = req.buyerApplication || 
      buyerApplications.find((a) => a.phone === req.buyerId?.phone || a.email === req.buyerId?.email);
    
    if (app && app._id) {
      openKycApp(app._id, app, req);
    } else {
      setRelatedRequest(req);
      // Create a fallback KYC object if buyer registered directly without filling full 9-stage KYC
      setSelectedKycApp({
        applicantName: `${req.buyerId?.firstName || ''} ${req.buyerId?.lastName || ''}`.trim() || 'Registered Buyer',
        phone: req.buyerId?.phone || 'Not provided',
        email: req.buyerId?.email || 'Not provided',
        buyerType: 'Trader / Buyer',
        business: {
          name: `${req.buyerId?.firstName}'s Procurement Agency`,
          businessType: 'Individual / Proprietorship',
          address: req.location || 'Local Mandi',
        },
        address: {
          villageCity: req.buyerId?.village || req.location || 'N/A',
          district: req.buyerId?.district || 'N/A',
          state: req.buyerId?.state || 'N/A',
          pincode: 'N/A',
        },
        commodities: [{ name: req.crop, offerPrice: req.offeredPrice, offerQuantity: req.quantity }],
        documents: {},
        verificationStatus: req.status,
        fallbackNote: 'Notice: This buyer has not completed the extended 9-stage KYC document upload yet. Basic profile details shown.',
      });
    }
  };

  /* ── Bulk Actions (Frontend Promise Loop) ── */
  const handleBulkAction = async (actionType, customReason) => {
    if (selectedIds.length === 0) return;
    const isApprove = actionType === 'APPROVE';
    
    let reason = customReason || '';
    if (!isApprove && !reason) {
      reason = 'Quality specifications incomplete or outside fair market range.';
    }

    const token = localStorage.getItem('adminToken');
    if (!token) { handleLogout(); return; }

    setActionLoadingId('BULK');
    setError('');
    setSuccessMsg('');
    
    let successCount = 0;
    let failCount = 0;

    for (const id of selectedIds) {
      try {
        const url = apiUrl(`/api/admin/buyer-requests/${id}/${isApprove ? 'approve' : 'reject'}`);
        const opts = {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        };
        if (!isApprove) {
          opts.headers['Content-Type'] = 'application/json';
          opts.body = JSON.stringify({ reason });
        }
        
        const res = await fetch(url, opts);
        const data = await res.json();
        
        if (res.ok && data.success) {
          successCount++;
          setBuyerRequests((prev) =>
            prev.map((r) => (r._id === id ? { 
              ...r, 
              status: isApprove ? 'PUBLISHED' : 'REJECTED', 
              ...(isApprove ? { publishedAt: new Date() } : { adminRemarks: reason })
            } : r))
          );
        } else {
          failCount++;
        }
      } catch (err) {
        failCount++;
      }
    }

    if (failCount === 0) {
      setSuccessMsg(`✓ Successfully ${isApprove ? 'approved' : 'rejected'} ${successCount} requests.`);
    } else {
      setError(`⚠️ Processed ${successCount} requests. ${failCount} failed.`);
    }
    
    setSelectedIds([]);
    setActionLoadingId(null);
    setTimeout(() => { setSuccessMsg(''); setError(''); }, 5000);
  };

  /* ── Buyer Requests Actions ── */
  const handleApproveRequest = async (requestId, cropName) => {
    const token = localStorage.getItem('adminToken');
    if (!token) { handleLogout(); return; }

    setActionLoadingId(requestId);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch(apiUrl(`/api/admin/buyer-requests/${requestId}/approve`), {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(`✓ Approved & Published: "${cropName}" is now live on Farmer Discovery!`);
        setBuyerRequests((prev) =>
          prev.map((r) => (r._id === requestId ? { ...r, status: 'PUBLISHED', publishedAt: new Date() } : r))
        );
        if (relatedRequest?._id === requestId) {
          setRelatedRequest((prev) => (prev ? { ...prev, status: 'PUBLISHED' } : null));
        }
        setTimeout(() => setSuccessMsg(''), 5000);
      } else {
        setError(data.message || 'Failed to approve publication request.');
      }
    } catch (err) {
      setError('Network error while approving request.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectRequest = async (requestId, cropName, customReason) => {
    const token = localStorage.getItem('adminToken');
    if (!token) { handleLogout(); return; }

    const reason = customReason || 'Quality specifications incomplete or offered price outside fair market range.';

    setActionLoadingId(requestId);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch(apiUrl(`/api/admin/buyer-requests/${requestId}/reject`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(`✕ Rejected: "${cropName}". The buyer can now edit & reapply.`);
        setBuyerRequests((prev) =>
          prev.map((r) => (r._id === requestId ? { ...r, status: 'REJECTED', adminRemarks: reason } : r))
        );
        if (relatedRequest?._id === requestId) {
          setRelatedRequest((prev) => (prev ? { ...prev, status: 'REJECTED', adminRemarks: reason } : null));
        }
        setTimeout(() => setSuccessMsg(''), 5000);
      } else {
        setError(data.message || 'Failed to reject publication request.');
      }
    } catch (err) {
      setError('Network error while rejecting request.');
    } finally {
      setActionLoadingId(null);
    }
  };

  /* ── Buyer Application Actions ── */
  const handleApproveApplication = async (appId, applicantName) => {
    const token = localStorage.getItem('adminToken');
    if (!token) { handleLogout(); return; }

    setActionLoadingId(appId);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch(apiUrl(`/api/admin/buyer-applications/${appId}/approve`), {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(`✓ Approved buyer KYC for "${applicantName}".`);
        setBuyerApplications((prev) =>
          prev.map((a) => (a._id === appId ? { ...a, verificationStatus: 'APPROVED', verified: true } : a))
        );
        if (selectedKycApp?._id === appId) {
          setSelectedKycApp((prev) => (prev ? { ...prev, verificationStatus: 'APPROVED', verified: true } : null));
        }
        setTimeout(() => setSuccessMsg(''), 5000);
      } else {
        setError(data.message || 'Failed to approve application.');
      }
    } catch (err) {
      setError('Network error approving application.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectApplication = async (appId, applicantName, customReason) => {
    const token = localStorage.getItem('adminToken');
    if (!token) { handleLogout(); return; }

    const reason = customReason || 'Incomplete business documents.';

    setActionLoadingId(appId);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch(apiUrl(`/api/admin/buyer-applications/${appId}/reject`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(`✕ Rejected application for "${applicantName}".`);
        setBuyerApplications((prev) =>
          prev.map((a) => (a._id === appId ? { ...a, verificationStatus: 'REJECTED', adminRemarks: reason } : a))
        );
        if (selectedKycApp?._id === appId) {
          setSelectedKycApp((prev) => (prev ? { ...prev, verificationStatus: 'REJECTED', adminRemarks: reason } : null));
        }
        setTimeout(() => setSuccessMsg(''), 5000);
      } else {
        setError(data.message || 'Failed to reject application.');
      }
    } catch (err) {
      setError('Network error rejecting application.');
    } finally {
      setActionLoadingId(null);
    }
  };

  /* ── User Delete Action ── */
  const handleDeleteUser = async (user) => {
    const token = localStorage.getItem('adminToken');
    if (!token) { handleLogout(); return; }

    setDeletingId(user._id);
    setError('');
    setSuccessMsg('');

    try {
      const response = await fetch(apiUrl(`/api/admin/users/${user._id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setUsers((prev) => prev.filter((u) => u._id !== user._id));
        setSuccessMsg(`User ${user.firstName} ${user.lastName} successfully deleted.`);
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setError(data.message || 'Failed to delete user.');
      }
    } catch (err) {
      setError('Network error while deleting user from database.');
    } finally {
      setDeletingId(null);
    }
  };

  /* ── Crop Deal Inspections Actions ── */
  const handleVerifyDeal = async (dealId, cropName) => {
    const token = localStorage.getItem('adminToken');
    if (!token) { handleLogout(); return; }

    setActionLoadingId(dealId);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch(apiUrl(`/api/admin/deals/${dealId}/verify`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'APPROVED', notes: 'Physically inspected and verified by Saathi Admin.' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(`✓ Deal for "${cropName}" marked VERIFIED! Contact and delivery details are now unlocked.`);
        setDealInspections((prev) =>
          prev.map((d) => (d._id === dealId ? { ...d, status: 'VERIFIED' } : d))
        );
        setTimeout(() => setSuccessMsg(''), 6000);
      } else {
        setError(data.message || 'Failed to verify deal.');
      }
    } catch (err) {
      setError('Network error while verifying deal.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleVerifyMoisture = async (dealId, status) => {
    const token = localStorage.getItem('adminToken');
    if (!token) { handleLogout(); return; }

    setActionLoadingId(dealId);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch(apiUrl(`/api/admin/deals/${dealId}/verify-moisture`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(status === 'APPROVED' ? '✓ Moisture check approved! Buyer can now pay the fee.' : '✕ Moisture check rejected.');
        setDealInspections((prev) =>
          prev.map((d) => (d._id === dealId ? { ...d, status: status === 'APPROVED' ? 'BUYER_PAYMENT_PENDING' : 'AI_FLAGGED' } : d))
        );
        setTimeout(() => setSuccessMsg(''), 6000);
      } else {
        setError(data.message || 'Failed to verify moisture.');
      }
    } catch (err) {
      setError('Network error while verifying moisture.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleVerifyPreShipment = async (dealId, status) => {
    const token = localStorage.getItem('adminToken');
    if (!token) { handleLogout(); return; }

    setActionLoadingId(dealId);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch(apiUrl(`/api/admin/deals/${dealId}/verify`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, notes: status === 'APPROVED' ? 'Physically inspected and verified by Saathi Admin.' : 'Rejected physical inspection.' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(status === 'APPROVED' ? '✓ Physical inspection approved! Details unlocked.' : '✕ Physical inspection rejected. Deal cancelled.');
        setDealInspections((prev) =>
          prev.map((d) => (d._id === dealId ? { ...d, status: status === 'APPROVED' ? 'ADMIN_PRE_SHIPMENT_VERIFIED' : 'CANCELLED' } : d))
        );
        setTimeout(() => setSuccessMsg(''), 6000);
      } else {
        setError(data.message || 'Failed to process physical inspection.');
      }
    } catch (err) {
      setError('Network error while processing physical inspection.');
    } finally {
      setActionLoadingId(null);
    }
  };


  const handleUnverifyDeal = async (dealId, cropName, customReason) => {
    const token = localStorage.getItem('adminToken');
    if (!token) { handleLogout(); return; }

    const reason = customReason || 'Moisture level or physical stock quality failed field criteria.';

    setActionLoadingId(dealId);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch(apiUrl(`/api/admin/deals/${dealId}/unverify`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(`✕ Marked "${cropName}" as UNVERIFIED.`);
        setDealInspections((prev) =>
          prev.map((d) => (d._id === dealId ? { ...d, status: 'UNVERIFIED' } : d))
        );
        setTimeout(() => setSuccessMsg(''), 6000);
      } else {
        setError(data.message || 'Failed to update deal to unverified.');
      }
    } catch (err) {
      setError('Network error while marking deal unverified.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleVerifyFinalDelivery = async (dealId, status) => {
    const token = localStorage.getItem('adminToken');
    if (!token) { handleLogout(); return; }

    if (status === 'APPROVED' && (!adminUtr || !adminReceipt)) {
      setError('Please provide UTR Number and Receipt before approving the delivery.');
      return;
    }

    setActionLoadingId(dealId);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch(apiUrl(`/api/admin/deals/${dealId}/final-verification`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, utrNumber: adminUtr, transactionReceiptUrl: adminReceipt }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(status === 'APPROVED' ? `🎉 Deal marked as COMPLETED! Receipt uploaded.` : '✕ Delivery rejected. Buyer refunded.');
        setDealInspections((prev) =>
          prev.map((d) => (d._id === dealId ? { ...d, status: status === 'APPROVED' ? 'COMPLETED' : 'CANCELLED' } : d))
        );
        setAdminUtr('');
        setAdminReceipt('');
        setTimeout(() => setSuccessMsg(''), 6000);
      } else {
        setError(data.message || 'Failed to process delivery verification.');
      }
    } catch (err) {
      setError('Network error while completing deal.');
    } finally {
      setActionLoadingId(null);
    }
  };

  /* ── Pay Farmer (Admin Wallet) ── */
  const handlePayFarmer = async (dealId, cropName) => {
    const token = localStorage.getItem('adminToken');
    if (!token) { handleLogout(); return; }

    const confirmed = window.confirm(`Pay farmer for deal: "${cropName}"?\n\nThis will deduct the agreed amount from the Saathi Admin Wallet and generate a receipt.`);
    if (!confirmed) return;

    setPayingFarmerId(dealId);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch(apiUrl(`/api/admin/deals/${dealId}/pay-farmer`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(data.message || '✅ Farmer paid successfully! Receipt generated.');
        setDealInspections((prev) =>
          prev.map((d) => (d._id === dealId ? { ...d, status: 'COMPLETED' } : d))
        );
        if (data.data?.walletBalance !== undefined) {
          setWalletData(prev => ({ ...prev, balance: data.data.walletBalance }));
        }
        if (data.data?.receiptUrl) {
          setLastGeneratedReceipt({ receiptUrl: data.data.receiptUrl, receiptNumber: data.data.receiptNumber, cropName });
        }
        // Refresh wallet transactions
        fetchWalletData(token);
        setTimeout(() => setSuccessMsg(''), 8000);
      } else {
        setError(data.message || 'Failed to process farmer payment.');
      }
    } catch (err) {
      setError('Network error while processing payment.');
    } finally {
      setPayingFarmerId(null);
    }
  };

  // Counts
  const pendingRequestsCount = buyerRequests.filter((r) => r.status === 'PENDING_REVIEW').length;
  const pendingAppsCount = buyerApplications.filter((a) => a.verificationStatus === 'PENDING' || a.verificationStatus === 'UNDER_REVIEW').length;
  const pendingInspectionsCount = dealInspections.filter(
    (d) => d.status === 'HUMAN_REVIEW' || d.status === 'AGENT_PAYMENT_PENDING' || d.status === 'BUYER_DELIVERY_UPLOADED'
  ).length;

  // Filtered Deal Inspections
  const filteredInspections = dealInspections.filter((deal) => {
    if (inspectionFilter !== 'ALL' && deal.status !== inspectionFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const crop = (deal.crop || '').toLowerCase();
    const farmerName = `${deal.farmerId?.firstName || ''} ${deal.farmerId?.lastName || ''}`.toLowerCase();
    const buyerName = `${deal.buyerId?.firstName || ''} ${deal.buyerId?.lastName || ''}`.toLowerCase();
    const farmerPhone = (deal.farmerId?.phone || '').toLowerCase();
    const address = `${deal.farmerId?.village || ''} ${deal.farmerId?.district || ''}`.toLowerCase();
    return crop.includes(q) || farmerName.includes(q) || buyerName.includes(q) || farmerPhone.includes(q) || address.includes(q);
  });

  // Filtered Buyer Requests
  const filteredRequests = buyerRequests.filter((req) => {
    if (requestFilter !== 'ALL' && req.status !== requestFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const crop = (req.crop || '').toLowerCase();
    const loc = (req.location || '').toLowerCase();
    const buyerName = `${req.buyerId?.firstName || ''} ${req.buyerId?.lastName || ''}`.toLowerCase();
    return crop.includes(q) || loc.includes(q) || buyerName.includes(q);
  });

  // Filtered Users
  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase();
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
    const phone = (user.phone || '').toLowerCase();
    const email = (user.email || '').toLowerCase();
    return fullName.includes(query) || phone.includes(query) || email.includes(query);
  });

  return (
    <div className="min-h-screen bg-[#F1F3F5] text-[#132B47] pb-12">
      {/* Top Navigation Bar */}
      <header className="bg-white sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={saathiLogo} alt="SAATHI Logo" className="h-8 w-auto object-contain" />
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-[#132B47] text-lg">SAATHI</span>
              <span className="px-2 py-0.5 rounded-md text-[#5F6B7A] text-xs font-bold uppercase tracking-wider">
                Admin Verification Center
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="hidden sm:flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-md shadow-sm">
              <input
                type="checkbox"
                checked={fastMode}
                onChange={(e) => setFastMode(e.target.checked)}
                className="w-4 h-4 text-[#E51B2A] border-[#D9DEE5] rounded focus:ring-[#E51B2A]"
              />
              <span className="text-xs font-bold text-[#132B47] uppercase tracking-wide">
                Fast Mode <span className="text-[#5F6B7A] font-medium">(Skip Confirms)</span>
              </span>
            </label>

            <div className="hidden sm:flex items-center gap-2 text-[#5F6B7A] px-3 py-1.5 text-xs font-medium border-l border-[#D9DEE5]">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span>{adminEmail}</span>
            </div>

            <button
              onClick={handleLogout}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Floating Toasts */}
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
          {toasts.map(toast => (
            <div 
              key={toast.id}
              className={`pointer-events-auto flex items-start justify-between gap-3 p-4 min-w-[300px] max-w-md rounded-xl border shadow-xl transition-all animate-in slide-in-from-bottom-5 fade-in duration-300 ${
                toast.type === 'success' 
                  ? 'bg-green-50 border-green-200 text-[#16845B]'
                  : 'bg-red-50 border-red-200 text-[#C62828]'
              }`}
            >
              <span className="flex items-start gap-2 text-sm font-bold">
                <span className="mt-0.5">{toast.type === 'success' ? '✓' : '⚠️'}</span>
                <span className="leading-relaxed">{toast.message}</span>
              </span>
              <button 
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="opacity-60 hover:opacity-100 transition text-lg mt-0.5 shrink-0"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* Top Summary Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 mt-4">
          <div className="bg-white p-5 rounded-xl shadow-sm">
            <div className="text-xs font-bold text-[#5F6B7A] uppercase tracking-wider mb-2">Buyer Publications</div>
            <div className={`text-2xl font-black ${pendingRequestsCount > 0 ? 'text-[#C88A00]' : 'text-[#132B47]'}`}>
              {pendingRequestsCount} Pending
            </div>
            <div className="text-xs text-[#5F6B7A] mt-2">Requires Admin Accept or Reject</div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm">
            <div className="text-xs font-bold text-[#5F6B7A] uppercase tracking-wider mb-2">On-Ground Inspections</div>
            <div className={`text-2xl font-black ${pendingInspectionsCount > 0 ? 'text-[#16845B]' : 'text-[#132B47]'}`}>
              {pendingInspectionsCount} Pending
            </div>
            <div className="text-xs text-[#5F6B7A] mt-2">₹250 Paid • 11.8% Moisture</div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm">
            <div className="text-xs font-bold text-[#5F6B7A] uppercase tracking-wider mb-2">Buyer KYC Applications</div>
            <div className={`text-2xl font-black ${pendingAppsCount > 0 ? 'text-[#0052CC]' : 'text-[#132B47]'}`}>
              {pendingAppsCount} Pending
            </div>
            <div className="text-xs text-[#5F6B7A] mt-2">{buyerApplications.length} total applications</div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm">
            <div className="text-xs font-bold text-[#5F6B7A] uppercase tracking-wider mb-2">Total Users</div>
            <div className="text-2xl font-black text-[#132B47]">{users.length}</div>
            <div className="text-xs text-[#5F6B7A] mt-2">Direct read & manage access</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-6 pb-0 mb-6 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveTab('buyer-requests')}
            className={`pb-3 text-sm font-bold transition flex items-center gap-2 shrink-0 border-b-2 ${
              activeTab === 'buyer-requests'
                ? 'border-[#E51B2A] text-[#132B47]'
                : 'border-transparent text-[#5F6B7A] hover:text-[#132B47]'
            }`}
          >
            <span>Buyer Publications</span>
            {pendingRequestsCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === 'buyer-requests' ? 'bg-[#E51B2A] text-white' : 'bg-gray-200 text-gray-700'}`}>
                {pendingRequestsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('deal-inspections')}
            className={`pb-3 text-sm font-bold transition flex items-center gap-2 shrink-0 border-b-2 ${
              activeTab === 'deal-inspections'
                ? 'border-[#E51B2A] text-[#132B47]'
                : 'border-transparent text-[#5F6B7A] hover:text-[#132B47]'
            }`}
          >
            <span>On-Ground Inspections</span>
            {pendingInspectionsCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === 'deal-inspections' ? 'bg-[#E51B2A] text-white' : 'bg-gray-200 text-gray-700'}`}>
                {pendingInspectionsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('buyer-applications')}
            className={`pb-3 text-sm font-bold transition flex items-center gap-2 shrink-0 border-b-2 ${
              activeTab === 'buyer-applications'
                ? 'border-[#E51B2A] text-[#132B47]'
                : 'border-transparent text-[#5F6B7A] hover:text-[#132B47]'
            }`}
          >
            <span>Buyer KYC</span>
            {pendingAppsCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === 'buyer-applications' ? 'bg-[#E51B2A] text-white' : 'bg-gray-200 text-gray-700'}`}>
                {pendingAppsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`pb-3 text-sm font-bold transition flex items-center gap-2 shrink-0 border-b-2 ${
              activeTab === 'users'
                ? 'border-[#E51B2A] text-[#132B47]'
                : 'border-transparent text-[#5F6B7A] hover:text-[#132B47]'
            }`}
          >
            <span>Users</span>
            <span className="text-xs text-gray-500">({users.length})</span>
          </button>

          <button
            onClick={() => { setActiveTab('wallet'); fetchWalletData(); }}
            className={`pb-3 text-sm font-bold transition flex items-center gap-2 shrink-0 border-b-2 ${
              activeTab === 'wallet'
                ? 'border-[#E51B2A] text-[#132B47]'
                : 'border-transparent text-[#5F6B7A] hover:text-[#132B47]'
            }`}
          >
            <span>Saathi Wallet</span>
            <span className="text-xs font-bold text-[#16845B]">
              ₹{Number(walletData.balance || 0).toLocaleString('en-IN')}
            </span>
          </button>

          <div className="flex-1" />
          <button
            onClick={() => { fetchAllData(); fetchWalletData(); }}
            disabled={loading}
            className="pb-3 text-[#5F6B7A] hover:text-[#132B47] text-xs font-bold transition flex items-center gap-1.5 shrink-0"
          >
            <span>🔄 Refresh</span>
          </button>
        </div>

        {/* ── Tab 1: Buyer Publications (Requests) ── */}
        {activeTab === 'buyer-requests' && (
          <div className="space-y-4">
            {/* Filter controls */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 sticky top-16 bg-[#F1F3F5] z-20 py-2/50">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                {['ALL', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setRequestFilter(st)}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${
                      requestFilter === st
                        ? 'bg-white text-[#132B47] shadow-sm'
                        : 'text-[#5F6B7A] hover:bg-white hover:border-[#D9DEE5] border border-transparent'
                    }`}
                  >
                    {st === 'ALL' ? 'All Publications' : st.replace('_', ' ')}
                  </button>
                ))}
              </div>

              <div className="relative max-w-sm">
                <input
                  type="text"
                  placeholder="Search crop, location, buyer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-8 pr-3 bg-white rounded-md text-[#132B47] text-xs font-medium placeholder:text-[#99A5BA] focus:outline-none focus:border-[#E51B2A]"
                />
                <span className="absolute left-2.5 top-2.5 text-xs text-[#99A5BA]">🔍</span>
              </div>
            </div>

            {loading ? (
              <div className="py-20 text-center text-[#5F6B7A]">Loading publications…</div>
            ) : filteredRequests.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center text-[#5F6B7A]">
                <div className="text-4xl mb-2 opacity-50">🌾</div>
                <p className="font-bold text-[#132B47]">No publication requests found</p>
                <p className="text-xs mt-1">When buyers submit crop procurement requirements, they will appear here for verification.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 pb-20">
                {filteredRequests.map((req) => {
                  const isPending = req.status === 'PENDING_REVIEW';
                  const isPublished = req.status === 'PUBLISHED';
                  const isRejected = req.status === 'REJECTED';
                  const isSelected = selectedIds.includes(req._id);

                  return (
                    <div
                      key={req._id}
                      className={`bg-white border rounded-xl p-5 shadow-sm transition flex gap-3 relative overflow-hidden ${
                        isSelected ? 'border-[#E51B2A] bg-red-50/30' : 'border-[#D9DEE5] hover:border-gray-300'
                      }`}
                    >
                      {/* Left Status Color Accent */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                        isPending ? 'bg-[#C88A00]' : isPublished ? 'bg-[#16845B]' : 'bg-[#C62828]'
                      }`} />

                      {/* Checkbox for Bulk Actions */}
                      <div className="pt-1 pl-1">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-[#E51B2A] border-gray-300 rounded focus:ring-[#E51B2A] cursor-pointer"
                          checked={isSelected}
                          onChange={() => {
                            setSelectedIds(prev =>
                              prev.includes(req._id) ? prev.filter(id => id !== req._id) : [...prev, req._id]
                            );
                          }}
                        />
                      </div>

                      <div className="flex flex-col lg:flex-row justify-between gap-4 flex-1">
                        {/* Details (Left Side) */}
                        <div className="space-y-3 flex-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-lg font-black text-[#132B47] uppercase">{req.crop}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                isPending ? 'bg-amber-100 text-amber-800' : isPublished ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}
                            >
                              ● {req.status.replace('_', ' ')}
                            </span>
                          </div>
                          
                          <div className="text-[#132B47] font-semibold">
                            {req.quantity} {req.unit || 'Quintals'} • Offered: ₹{Number(req.offeredPrice).toLocaleString('en-IN')}/{req.unit || 'Qtl'}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-3 gap-x-2 pt-1 border-t border-gray-100 mt-2">
                            <div>
                              <div className="text-[#5F6B7A] font-bold uppercase tracking-wider text-[10px]">Delivery Location</div>
                              <div className="font-semibold text-[#132B47] text-sm mt-0.5">{req.location || 'Not specified'}</div>
                            </div>
                            <div>
                              <div className="text-[#5F6B7A] font-bold uppercase tracking-wider text-[10px]">Buyer Name</div>
                              <div className="font-semibold text-[#132B47] text-sm mt-0.5">
                                {req.buyerId?.firstName} {req.buyerId?.lastName}
                              </div>
                            </div>
                            <div>
                              <div className="text-[#5F6B7A] font-bold uppercase tracking-wider text-[10px]">Estimated Value</div>
                              <div className="font-bold text-[#16845B] text-sm mt-0.5">
                                ₹{((Number(req.quantity) || 0) * (Number(req.offeredPrice) || 0)).toLocaleString('en-IN')}
                              </div>
                            </div>
                          </div>

                          {req.description && (
                            <p className="text-xs text-[#5F6B7A] bg-gray-50 p-2.5 rounded-lg mt-2">
                              <strong className="text-[#132B47]">Specifications / Notes:</strong> {req.description}
                            </p>
                          )}

                          {isRejected && req.adminRemarks && (
                            <p className="text-xs text-[#C62828] bg-red-50 p-2.5 rounded-lg mt-2">
                              <strong>Rejection Reason:</strong> {req.adminRemarks}
                            </p>
                          )}

                          <div className="flex items-center gap-4 text-xs text-[#99A5BA] pt-2">
                            <span>Submitted: {new Date(req.createdAt).toLocaleString('en-IN')}</span>
                            {req.reviewedAt && <span>Reviewed: {new Date(req.reviewedAt).toLocaleString('en-IN')}</span>}
                          </div>
                        </div>

                        {/* Admin Actions (Right Column) */}
                        <div className="flex flex-col gap-2 shrink-0 border-t lg:border-t-0 lg:border-l border-[#D9DEE5] pt-3 lg:pt-0 lg:pl-4 min-w-[200px]">
                          <button
                            onClick={() => openKycForRequest(req)}
                            className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-[#0052CC] font-bold rounded-md text-xs transition flex items-center justify-center gap-1.5"
                          >
                            <span>📋</span>
                            <span>Inspect 9-Stage KYC</span>
                          </button>

                          {isPending ? (
                            <>
                              <button
                                onClick={() => handleApproveRequest(req._id, req.crop)}
                                disabled={actionLoadingId === req._id}
                                className="w-full py-2 bg-[#E51B2A] hover:bg-red-800 text-white font-bold rounded-md text-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                              >
                                <span>✓</span>
                                <span>Accept & Publish</span>
                              </button>
                              <InlineConfirmButton
                                id={`${req._id}-reject`}
                                confirmingId={confirmingId}
                                setConfirmingId={setConfirmingId}
                                fastMode={fastMode}
                                requireReason={true}
                                reasonPlaceholder="Reason (optional)"
                                baseText={<><span>✕</span><span>Reject</span></>}
                                confirmText="Reject"
                                baseClassName="w-full py-2 bg-[#C62828] hover:bg-red-800 text-white font-bold rounded-md text-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                                disabled={actionLoadingId === req._id}
                                onConfirm={(reason) => handleRejectRequest(req._id, req.crop, reason)}
                              />
                            </>
                          ) : isPublished ? (
                            <div className="flex flex-col items-center gap-2 mt-2">
                              <span className="text-xs font-bold text-[#16845B]">✓ Live on Farmer UI</span>
                              <InlineConfirmButton
                                id={`${req._id}-revoke`}
                                confirmingId={confirmingId}
                                setConfirmingId={setConfirmingId}
                                fastMode={fastMode}
                                requireReason={true}
                                reasonPlaceholder="Reason (optional)"
                                baseText="Revoke"
                                confirmText="Revoke"
                                baseClassName="w-full py-1.5 bg-white hover:bg-gray-50 text-[#5F6B7A] rounded-md text-xs font-bold transition"
                                disabled={actionLoadingId === req._id}
                                onConfirm={(reason) => handleRejectRequest(req._id, req.crop, reason)}
                              />
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-2 mt-2">
                              <span className="text-xs font-bold text-[#C62828]">✕ Rejected</span>
                              <button
                                onClick={() => handleApproveRequest(req._id, req.crop)}
                                disabled={actionLoadingId === req._id}
                                className="w-full py-1.5 bg-white hover:bg-gray-50 text-[#5F6B7A] rounded-md text-xs font-bold transition"
                              >
                                Re-approve
                              </button>
                            </div>
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

        {/* ── Tab 2: Buyer KYC Applications ── */}
        {activeTab === 'buyer-applications' && (
          <div className="space-y-4">
            {loading ? (
              <div className="py-20 text-center text-[#5F6B7A]">Loading applications…</div>
            ) : buyerApplications.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center text-[#5F6B7A]">
                <p className="font-bold text-[#132B47]">No buyer registration applications found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {buyerApplications.map((app) => (
                  <div key={app._id} className="bg-white rounded-xl shadow-sm overflow-hidden relative flex flex-col md:flex-row">
                    {/* Left Border Status */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                      app.verificationStatus === 'APPROVED' ? 'bg-[#16845B]' :
                      app.verificationStatus === 'REJECTED' ? 'bg-[#C62828]' : 'bg-[#C88A00]'
                    }`} />

                    {/* Left Content Area */}
                    <div className="flex-1 p-5 md:pr-6 md:border-r border-[#D9DEE5]">
                      <div className="space-y-1.5 flex-1 pl-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="text-base font-bold text-[#132B47] uppercase">{app.applicantName}</h3>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 uppercase tracking-wider">
                            {app.buyerType}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            app.verificationStatus === 'APPROVED' ? 'bg-green-100 text-green-800' :
                            app.verificationStatus === 'REJECTED' ? 'bg-red-100 text-red-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {app.verificationStatus}
                          </span>
                        </div>
                        <p className="text-xs text-[#5F6B7A]">
                          <strong className="text-[#132B47]">Business:</strong> {app.business?.name} ({app.business?.businessType}) • <strong className="text-[#132B47]">Phone:</strong> {app.phone} • <strong className="text-[#132B47]">Email:</strong> {app.email}
                        </p>
                        <p className="text-xs text-[#5F6B7A]">
                          <strong className="text-[#132B47]">Location:</strong> {app.address?.district}, {app.address?.state} ({app.address?.pincode})
                        </p>
                        {app.adminRemarks && (
                          <p className="text-xs text-[#C62828] bg-red-50 p-2 rounded-lg mt-2">
                            <strong>Remarks:</strong> {app.adminRemarks}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right Action Area */}
                    <div className="p-5 bg-gray-50 md:w-64 shrink-0 flex flex-col justify-center gap-2">
                      <button
                        onClick={() => {
                          openKycApp(app._id, app, null);
                        }}
                        className="w-full px-3.5 py-2 bg-white hover:bg-gray-100 text-[#0052CC] font-bold rounded-lg text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <span>🔍</span>
                        <span>View 9-Stage Form & Docs</span>
                      </button>

                      {app.verificationStatus !== 'APPROVED' && (
                        <button
                          onClick={() => handleApproveApplication(app._id, app.applicantName)}
                          disabled={actionLoadingId === app._id}
                          className="w-full px-4 py-2 bg-[#E51B2A] hover:bg-red-800 text-white font-bold rounded-lg text-xs transition shadow-sm"
                        >
                          ✓ Approve KYC
                        </button>
                      )}
                      {app.verificationStatus !== 'REJECTED' && (
                        <InlineConfirmButton
                          id={`${app._id}-reject-kyc`}
                          confirmingId={confirmingId}
                          setConfirmingId={setConfirmingId}
                          fastMode={fastMode}
                          requireReason={true}
                          reasonPlaceholder="Rejection Reason"
                          baseText={<><span>✕</span><span>Reject</span></>}
                          confirmText="Reject KYC"
                          baseClassName="w-full px-4 py-2 bg-[#C62828] hover:bg-red-800 text-white font-bold rounded-lg text-xs transition shadow-sm flex justify-center gap-1.5"
                          disabled={actionLoadingId === app._id}
                          onConfirm={(reason) => handleRejectApplication(app._id, app.applicantName, reason)}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab 3: Registered Users ── */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 flex justify-between items-center gap-4 bg-gray-50">
              <input
                type="text"
                placeholder="Search user by name, phone, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full max-w-sm h-10 px-4 bg-white rounded-lg text-[#132B47] text-sm placeholder:text-[#99A5BA] focus:outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC]"
              />
              <span className="text-xs text-[#5F6B7A] font-bold uppercase tracking-wider">{filteredUsers.length} Users</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-4 text-xs font-bold text-[#5F6B7A] uppercase tracking-wider">User Details</th>
                    <th className="px-6 py-4 text-xs font-bold text-[#5F6B7A] uppercase tracking-wider">Phone / Mobile</th>
                    <th className="px-6 py-4 text-xs font-bold text-[#5F6B7A] uppercase tracking-wider">Email Address</th>
                    <th className="px-6 py-4 text-xs font-bold text-[#5F6B7A] uppercase tracking-wider">Registered On</th>
                    <th className="px-6 py-4 text-xs font-bold text-[#5F6B7A] uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D9DEE5]">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-16 text-center text-[#5F6B7A]">
                        No registered users matching query.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user._id} className="hover:bg-gray-50/50 transition">
                        <td className="px-6 py-4">
                          <div className="font-bold text-[#132B47] text-sm">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-xs font-mono text-[#5F6B7A] mt-0.5 select-all">
                            ID: {user._id}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 text-[#16845B] text-xs font-mono font-bold">
                            📞 {user.phone}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-[#132B47] font-medium">{user.email}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-[#5F6B7A] font-medium">
                            {user.createdAt ? new Date(user.createdAt).toLocaleString('en-IN') : 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right flex justify-end">
                          <InlineConfirmButton
                            id={`${user._id}-delete`}
                            confirmingId={confirmingId}
                            setConfirmingId={setConfirmingId}
                            fastMode={fastMode}
                            baseText={deletingId === user._id ? 'Deleting…' : 'Delete'}
                            confirmText="Delete User"
                            baseClassName="px-3 py-1.5 bg-[#C62828] hover:bg-red-800 text-white rounded-lg text-xs font-bold transition shadow-sm w-24 text-center"
                            disabled={deletingId === user._id}
                            onConfirm={() => handleDeleteUser(user)}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Tab: On-Ground Crop Inspections ── */}
        {activeTab === 'deal-inspections' && (
          <div className="space-y-4">
            {/* Filter controls */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 sticky top-16 bg-[#F1F3F5] z-20 py-2/50">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                                {[
                  { key: 'ALL', label: 'All Deals' },
                  { key: 'HUMAN_REVIEW', label: 'Pre-Shipment Verifications' },
                  { key: 'BUYER_DELIVERY_UPLOADED', label: 'Delivery Verifications' },
                  { key: 'ADMIN_PRE_SHIPMENT_VERIFIED', label: 'Verified Pre-Shipment' },
                  { key: 'COMPLETED', label: 'Completed Deals' },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setInspectionFilter(item.key)}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition whitespace-nowrap ${
                      inspectionFilter === item.key
                        ? 'bg-white text-[#132B47] shadow-sm'
                        : 'text-[#5F6B7A] hover:bg-white hover:border-[#D9DEE5] border border-transparent'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="relative max-w-sm">
                <input
                  type="text"
                  placeholder="Search crop, farmer name, phone, village..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-8 pr-3 bg-white rounded-md text-[#132B47] text-xs font-medium placeholder:text-[#99A5BA] focus:outline-none focus:border-[#E51B2A]"
                />
                <span className="absolute left-2.5 top-2.5 text-xs text-[#99A5BA]">🔍</span>
              </div>
            </div>

            {loading ? (
              <div className="py-20 text-center text-[#5F6B7A]">Loading inspection deals…</div>
            ) : filteredInspections.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center text-[#5F6B7A]">
                <div className="text-4xl mb-2">🌾</div>
                <p className="font-bold text-[#132B47]">No crop inspections found</p>
                <p className="text-xs mt-1">
                  When farmers submit quality photos and schedule their free video call verification, deals will appear here for admin review.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5">
                {filteredInspections.map((deal) => {
                  const isAwaiting = deal.status === 'HUMAN_REVIEW';
                  const isVerified = deal.status === 'VERIFIED' || deal.status === 'ADMIN_PRE_SHIPMENT_VERIFIED';
                  const isUnverified = deal.status === 'UNVERIFIED';

                  const imagesState = loadedImages[deal._id];
                  const isLoadingImages = imagesState?.isLoading;
                  const imagesError = imagesState?.error;
                  const images = imagesState?.images || [];
                  const receiptUrl = imagesState?.receiptUrl || '';
                  const hasImages = images.length > 0;
                  const hasReceipt = receiptUrl !== '';
                  const shouldShowImagesSection = (deal.qualitySubmissions && deal.qualitySubmissions.length > 0);
                  const shouldShowReceiptSection = (deal.transactionReceiptUrl || deal.utrNumber || deal.status === 'RECEIPT_SUBMITTED' || deal.status === 'COMPLETED');

                  return (
                    <div
                      key={deal._id}
                      className={`bg-white border rounded-xl p-6 shadow-sm transition relative overflow-hidden ${
                        isAwaiting
                          ? 'border-[#C88A00] bg-amber-50/20'
                          : isVerified
                          ? 'border-[#16845B] bg-green-50/20'
                          : isUnverified
                          ? 'border-[#C62828] bg-red-50/20'
                          : 'border-[#D9DEE5]'
                      }`}
                    >
                      {/* Left Status Color Accent */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                        isAwaiting ? 'bg-[#C88A00]' : isVerified ? 'bg-[#16845B]' : isUnverified ? 'bg-[#C62828]' : 'bg-[#132B47]'
                      }`} />

                      {/* Top Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4">
                        <div className="pl-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-mono font-bold text-[#5F6B7A] uppercase tracking-wider">
                              DEAL #{deal._id?.slice(-6).toUpperCase()}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                              isAwaiting
                                ? 'bg-amber-100 text-amber-800'
                                : isVerified
                                ? 'bg-green-100 text-green-800'
                                : isUnverified
                                ? 'bg-red-100 text-red-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {isAwaiting ? '🛵 Agent Assigned • Awaiting Admin Verify' :
                               isVerified ? '✓ Verified' :
                               isUnverified ? '✕ Unverified' : deal.status}
                            </span>
                          </div>
                          <h3 className="text-xl font-black text-[#132B47] mt-1 uppercase">
                            {deal.crop} — {deal.quantity} Qtl
                          </h3>
                        </div>

                        <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-lg">
                          <div className="text-right">
                            <p className="text-[10px] uppercase font-bold text-[#5F6B7A]">Agreed Price</p>
                            <p className="text-sm font-black text-[#132B47]">₹{Number(deal.agreedPrice).toLocaleString('en-IN')}/Qtl</p>
                          </div>
                          <div className="text-right pl-3 border-l border-[#D9DEE5]">
                            <p className="text-[10px] uppercase font-bold text-[#5F6B7A]">Total Value</p>
                            <p className="text-sm font-black text-[#16845B]">₹{(Number(deal.agreedPrice) * Number(deal.quantity)).toLocaleString('en-IN')}</p>
                          </div>
                        </div>
                      </div>

                      {/* Status Badges Row: Moisture + Agent Fee */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
                        <div className="p-3 rounded-xl bg-green-50 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">💧</span>
                            <div>
                              <p className="text-[11px] font-bold text-green-800 uppercase tracking-wide">Moisture Analysis</p>
                              <p className="text-xs font-semibold text-green-600">
                                {deal.moisturePercent || 11.8}% (Acceptable 10%-14%)
                              </p>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-xs font-black bg-green-600 text-white uppercase">
                            Passed
                          </span>
                        </div>

                        <div className={`p-3 rounded-xl border flex items-center justify-between ${
                          deal.agentFeePaid
                            ? 'bg-blue-50 border-blue-200'
                            : 'bg-gray-50 border-gray-200'
                        }`}>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">💳</span>
                            <div>
                              <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">Verification Status</p>
                              <p className="text-xs font-semibold text-gray-700">
                                {deal.videoCallSlot?.date ? `Free Video Call: ${deal.videoCallSlot.date} (${deal.videoCallSlot.timeSlot})` : 'Free Video Verification'}
                              </p>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-xs font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-sm">
                            FREE ✓
                          </span>
                        </div>
                      </div>

                      {/* 2-Column Info: Farmer Address/Phone vs Buyer Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                        {/* Farmer on-ground address card */}
                        <div className="bg-gray-50 p-4 rounded-xl">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-black uppercase text-[#C88A00] tracking-wider flex items-center gap-1.5">
                              <span>👨‍🌾</span> Farmer & Field Location
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-[#132B47]">
                            {deal.farmerId?.firstName} {deal.farmerId?.lastName}
                          </h4>
                          <div className="mt-2 space-y-1.5 text-xs text-[#5F6B7A]">
                            <p className="flex items-center gap-2">
                              <span>Phone:</span>
                              <span className="font-mono font-bold text-[#16845B] select-all">
                                📞 {deal.farmerId?.phone || 'Not provided'}
                              </span>
                            </p>
                            <p className="flex items-start gap-2">
                              <span className="shrink-0">Field:</span>
                              <span className="font-medium text-[#132B47]">
                                📍 {deal.farmerId?.village ? `${deal.farmerId.village}, ` : ''}
                                {deal.farmerId?.block ? `${deal.farmerId.block}, ` : ''}
                                {deal.farmerId?.district ? `${deal.farmerId.district}, ` : ''}
                                {deal.farmerId?.state || ''}
                              </span>
                            </p>
                          </div>
                        </div>

                        {/* Buyer Info Card */}
                        <div className="bg-gray-50 p-4 rounded-xl">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-black uppercase text-[#0052CC] tracking-wider flex items-center gap-1.5">
                              <span>🏢</span> Buyer Details
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-[#132B47]">
                            {deal.buyerId?.firstName} {deal.buyerId?.lastName}
                          </h4>
                          <div className="mt-2 space-y-1.5 text-xs text-[#5F6B7A]">
                            <p className="flex items-center gap-2">
                              <span>Phone:</span>
                              <span className="font-mono font-bold text-[#0052CC] select-all">
                                📞 {deal.buyerId?.phone || 'Not provided'}
                              </span>
                            </p>
                            <p className="flex items-start gap-2">
                              <span className="shrink-0">Location:</span>
                              <span className="font-medium text-[#132B47]">
                                📍 {deal.buyerId?.district ? `${deal.buyerId.district}, ` : ''}
                                {deal.buyerId?.state || 'N/A'}
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Uploaded Crop Photos */}
                      {shouldShowImagesSection && (
                        <div className="py-4">
                          <div className="flex items-center justify-between mb-2.5">
                            <span className="text-xs font-black uppercase text-[#5F6B7A] tracking-wider flex items-center gap-1.5">
                              <span>📷</span> Uploaded Crop Photos
                            </span>
                            {hasImages && <span className="text-[10px] text-[#99A5BA]">Click any photo to zoom</span>}
                          </div>
                          
                          {!imagesState && (
                            <button
                              onClick={() => fetchDealImages(deal._id)}
                              className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-[#132B47] text-xs font-bold rounded-lg transition"
                            >
                              Load Inspection Photos & Documents
                            </button>
                          )}
                          
                          {isLoadingImages && (
                            <div className="text-sm text-[#99A5BA] italic">Downloading heavy image files...</div>
                          )}
                          
                          {imagesError && (
                            <div className="text-sm text-[#C62828]">{imagesError}</div>
                          )}

                          {hasImages && (
                            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2.5">
                              {images.map((img, idx) => (
                                <div
                                  key={idx}
                                  onClick={() => setPreviewImage(img)}
                                  className="aspect-square rounded-xl overflow-hidden hover:border-[#16845B] transition cursor-zoom-in group relative bg-gray-100 shadow-sm"
                                >
                                  <img
                                    src={img}
                                    alt={`Crop ${idx + 1}`}
                                    className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                                  />
                                  <span className="absolute bottom-1 right-1 text-[9px] bg-black/70 text-white px-1.5 py-0.5 rounded font-bold">
                                    #{idx + 1}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Uploaded Transaction Receipt & UTR (Submitted by Farmer) */}
                      {shouldShowReceiptSection && (
                        <div className="py-4 bg-gray-50 p-4 rounded-xl my-3">
                          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                            <span className="text-xs font-black uppercase text-[#16845B] tracking-wider flex items-center gap-1.5">
                              <span>🧾</span> Sale Payment Proof & UTR Reference
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                              deal.status === 'COMPLETED'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {deal.status === 'COMPLETED' ? '✓ Deal Completed' : 'Pending Admin Completion'}
                            </span>
                          </div>

                          {!imagesState && (
                            <div className="mb-4">
                              <button
                                onClick={() => fetchDealImages(deal._id)}
                                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-[#132B47] text-xs font-bold rounded-lg transition shadow-sm"
                              >
                                Load Inspection Photos & Documents
                              </button>
                            </div>
                          )}

                          {isLoadingImages && (
                            <div className="text-sm text-[#99A5BA] italic mb-4">Downloading heavy image files...</div>
                          )}

                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            {hasReceipt && (
                              <div
                                onClick={() => setPreviewImage(receiptUrl)}
                                className="w-24 h-24 rounded-xl overflow-hidden hover:border-[#16845B] transition cursor-zoom-in group relative bg-gray-100 shrink-0 shadow-sm"
                              >
                                <img
                                  src={receiptUrl}
                                  alt="Transaction Receipt"
                                  className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                                />
                                <span className="absolute bottom-1 right-1 text-[9px] bg-black/80 text-white px-1.5 py-0.5 rounded font-bold">
                                  🔍 Zoom
                                </span>
                              </div>
                            )}

                            <div className="space-y-1.5 text-xs text-[#5F6B7A]">
                              <p className="flex items-center gap-2">
                                <span>UTR / Reference:</span>
                                <span className="font-mono font-black text-[#132B47] bg-white px-2 py-1 rounded select-all text-sm">
                                  {deal.utrNumber || 'No UTR typed'}
                                </span>
                              </p>
                              <p className="text-xs text-[#99A5BA]">
                                Uploaded by farmer after receiving payment from buyer.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Action Bar (Verified / Complete / Unverified) */}
                      <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <div className="text-xs text-[#5F6B7A]">
                          {deal.status === 'COMPLETED' && (
                            <span className="text-[#16845B] font-bold flex items-center gap-1.5">
                              <span>🎉</span> Deal marked as COMPLETED! Transaction recorded.
                            </span>
                          )}
                          {deal.status === 'RECEIPT_SUBMITTED' && (
                            <span className="text-[#C88A00] font-bold flex items-center gap-1.5">
                              <span>📄</span> Transaction receipt & UTR uploaded. Click "Mark Deal Completed" to finalize.
                            </span>
                          )}
                          {(deal.status === 'VERIFIED' || deal.status === 'ADMIN_PRE_SHIPMENT_VERIFIED') && (
                            <span className="text-[#16845B] font-bold flex items-center gap-1.5">
                              <span>✓</span> Crop physically verified from agent. Awaiting buyer to upload delivery photos.
                            </span>
                          )}
                          {isUnverified && (
                            <span className="text-[#C62828] font-bold flex items-center gap-1.5">
                              <span>✕</span> Crop marked unverified. Deal paused.
                            </span>
                          )}
                          {isAwaiting && (
                            <span className="text-[#C88A00] font-bold flex items-center gap-1.5">
                              <span>🛵</span> Agent has farmer's address and phone number for physical check. Tap below to verify or reject.
                            </span>
                          )}
                        </div>

                        {/* Image Gallery */}
                        {images.length > 0 && (
                          <div className="flex gap-2 overflow-x-auto mt-4 pb-2">
                            {images.map((img, i) => (
                              <img key={i} src={img} alt="crop" className="h-20 w-20 object-cover rounded-lg shadow-sm" />
                            ))}
                          </div>
                        )}
                        {deal.deliverySubmissions?.length > 0 && (
                          <div className="mt-4">
                            <p className="text-xs font-bold text-[#5F6B7A] mb-2">Delivery Photos:</p>
                            <div className="flex gap-2 overflow-x-auto pb-2">
                              {deal.deliverySubmissions.map((img, i) => (
                                <img key={i} src={img} alt="delivery" className="h-20 w-20 object-cover rounded-lg shadow-sm" />
                              ))}
                            </div>
                          </div>
                        )}



                          <div className="flex items-center gap-2 justify-end flex-wrap mt-5">
                            {deal.status === 'ADMIN_MOISTURE_REVIEW' && (
                              <>
                                <button
                                  onClick={() => handleVerifyMoisture(deal._id, 'APPROVED')}
                                  disabled={actionLoadingId === deal._id}
                                  className="px-4 py-2 bg-[#16845B] text-white font-black rounded-lg text-xs hover:bg-green-700 shadow-sm"
                                >
                                  Approve Moisture & Photos
                                </button>
                                <InlineConfirmButton
                                  id={`${deal._id}-moisture-reject`}
                                  confirmingId={confirmingId}
                                  setConfirmingId={setConfirmingId}
                                  fastMode={fastMode}
                                  requireReason={true}
                                  reasonPlaceholder="Rejection Reason"
                                  baseText="Reject"
                                  confirmText="Reject"
                                  baseClassName="px-4 py-2 bg-[#C62828] text-white font-black rounded-lg text-xs hover:bg-red-800 shadow-sm"
                                  disabled={actionLoadingId === deal._id}
                                  onConfirm={() => handleVerifyMoisture(deal._id, 'REJECTED')}
                                />
                              </>
                            )}

                            {deal.status === 'HUMAN_REVIEW' && (
                              <div className="w-full mt-4 p-4 border border-amber-200 bg-amber-50 rounded-xl space-y-3">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <div>
                                    <h6 className="text-sm font-bold text-amber-700 flex items-center gap-1.5">
                                      <span>🎥</span> Free Video Call Verification
                                    </h6>
                                    {deal.videoCallSlot?.date ? (
                                      <p className="text-xs text-[#5F6B7A] mt-1">
                                        Slot: <span className="font-bold text-amber-800">{deal.videoCallSlot.date}</span> at <span className="font-bold text-amber-800">{deal.videoCallSlot.timeSlot}</span>
                                        {' · '}Farmer Phone: <span className="font-mono text-emerald-700 font-bold">{deal.farmerId?.phone || 'N/A'}</span>
                                      </p>
                                    ) : (
                                      <p className="text-xs text-[#99A5BA] mt-1">Video call slot scheduled. Perform WhatsApp call and verify crop quality.</p>
                                    )}
                                  </div>
                                  <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-lg border border-amber-200 shadow-sm">
                                    📱 WhatsApp Call Pending
                                  </span>
                                </div>

                                <div className="flex gap-2 pt-1 flex-wrap">
                                  <button
                                    onClick={() => handleVerifyPreShipment(deal._id, 'APPROVED')}
                                    disabled={actionLoadingId === deal._id}
                                    className="px-4 py-2 bg-[#16845B] hover:bg-green-700 text-white font-black rounded-lg text-xs transition disabled:opacity-50 shadow-sm"
                                  >
                                    ✅ Mark Video Call Verified
                                  </button>
                                  <InlineConfirmButton
                                    id={`${deal._id}-preshipment-reject`}
                                    confirmingId={confirmingId}
                                    setConfirmingId={setConfirmingId}
                                    fastMode={fastMode}
                                    requireReason={true}
                                    reasonPlaceholder="Rejection Reason"
                                    baseText="Reject"
                                    confirmText="Reject"
                                    baseClassName="px-4 py-2 bg-[#C62828] text-white font-black rounded-lg text-xs hover:bg-red-800 shadow-sm"
                                    disabled={actionLoadingId === deal._id}
                                    onConfirm={() => handleVerifyPreShipment(deal._id, 'REJECTED')}
                                  />
                                </div>
                              </div>
                            )}

                            {deal.status === 'BUYER_DELIVERY_UPLOADED' && (
                              <div className="w-full mt-4 p-4 border border-emerald-200 bg-emerald-50 rounded-xl space-y-3">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <div>
                                    <h6 className="text-sm font-bold text-emerald-800">✅ Delivery Uploaded by Buyer</h6>
                                    <p className="text-xs text-[#5F6B7A] mt-0.5">
                                      Buyer has verified delivery. You can pay the farmer instantly using the Escrow Wallet.
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => setActiveTab('wallet')}
                                    className="px-3 py-1.5 bg-white hover:bg-gray-100 text-[#132B47] rounded-lg text-xs font-semibold transition border border-gray-200 shadow-sm"
                                  >
                                    👛 Open Wallet Tab
                                  </button>
                                </div>
                                <div className="flex gap-2 pt-1 flex-wrap">
                                  <button
                                    onClick={() => handlePayFarmer(deal._id, deal.crop)}
                                    disabled={payingFarmerId === deal._id}
                                    className="px-4 py-2 bg-[#16845B] hover:bg-green-700 text-white font-black rounded-lg text-xs transition disabled:opacity-50 shadow-sm"
                                  >
                                    {payingFarmerId === deal._id ? '⏳ Processing Payment...' : '💸 Pay Farmer via Escrow Wallet'}
                                  </button>
                                  <InlineConfirmButton
                                    id={`${deal._id}-delivery-reject`}
                                    confirmingId={confirmingId}
                                    setConfirmingId={setConfirmingId}
                                    fastMode={fastMode}
                                    requireReason={true}
                                    reasonPlaceholder="Rejection Reason"
                                    baseText="Reject (Refund Buyer)"
                                    confirmText="Reject (Refund Buyer)"
                                    baseClassName="px-4 py-2 bg-[#C62828] text-white font-black rounded-lg text-xs hover:bg-red-800 shadow-sm"
                                    disabled={actionLoadingId === deal._id}
                                    onConfirm={() => handleVerifyFinalDelivery(deal._id, 'REJECTED')}
                                  />
                                </div>
                              </div>
                            )}

                            {deal.status !== 'COMPLETED' && (
                              <InlineConfirmButton
                                id={`${deal._id}-mark-unverified`}
                                confirmingId={confirmingId}
                                setConfirmingId={setConfirmingId}
                                fastMode={fastMode}
                                requireReason={true}
                                reasonPlaceholder="Reason (optional)"
                                baseText={<><span>✕</span><span>{actionLoadingId === deal._id ? 'Updating...' : 'Mark Unverified'}</span></>}
                                confirmText="Mark Unverified"
                                baseClassName="px-4 py-2.5 bg-[#C62828] hover:bg-red-800 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                                disabled={actionLoadingId === deal._id}
                                onConfirm={(reason) => handleUnverifyDeal(deal._id, deal.crop, reason)}
                              />
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

        {/* ════════════════════════════════════════════════════════════ */}
        {/* ── 9-STAGE KYC & UPLOADED DOCUMENTS INSPECTION MODAL ── */}
        {/* ════════════════════════════════════════════════════════════ */}
        {selectedKycApp && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white  rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-200 flex items-start justify-between gap-4 bg-gray-50 shrink-0">
                <div className="flex items-center gap-4">
                  {selectedKycApp.profilePhoto ? (
                    <img
                      src={selectedKycApp.profilePhoto}
                      alt={selectedKycApp.applicantName}
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-700"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-red-500/20 flex items-center justify-center text-amber-700 font-extrabold text-xl">
                      {selectedKycApp.applicantName?.charAt(0)?.toUpperCase() || 'B'}
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-xl font-black text-[#132B47]">{selectedKycApp.applicantName}</h2>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-700">
                        {selectedKycApp.buyerType}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        selectedKycApp.verificationStatus === 'APPROVED' || selectedKycApp.verificationStatus === 'PUBLISHED' ? 'bg-emerald-500/20 text-emerald-700' :
                        selectedKycApp.verificationStatus === 'REJECTED' ? 'bg-red-500/20 text-red-700' :
                        'bg-amber-500/20 text-amber-700'
                      }`}>
                        Status: {selectedKycApp.verificationStatus}
                      </span>
                    </div>
                    <p className="text-xs text-[#5F6B7A] mt-1">
                      📞 {selectedKycApp.phone} &nbsp;•&nbsp; ✉️ {selectedKycApp.email} &nbsp;•&nbsp; 🏢 {selectedKycApp.business?.name}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => { setSelectedKycApp(null); setRelatedRequest(null); }}
                  className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#132B47] hover:text-[#132B47] flex items-center justify-center text-sm font-bold transition"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body - 9 Stages Grid */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
                {selectedKycApp.fallbackNote && (
                  <div className="p-3 rounded-xl bg-amber-500/10 text-amber-700">
                    ℹ️ {selectedKycApp.fallbackNote}
                  </div>
                )}

                {/* Grid of Stages 1 through 6 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Stage 1: Personal Details */}
                  <div className="bg-gray-50 p-4 rounded-2xl  space-y-2">
                    <h4 className="text-sm font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
                      <span>👤 Stage 1: Applicant Information</span>
                    </h4>
                    <div className="space-y-1 text-[#132B47]">
                      <div><strong className="text-[#5F6B7A]">Full Name:</strong> {selectedKycApp.applicantName}</div>
                      <div><strong className="text-[#5F6B7A]">Mobile Number:</strong> {selectedKycApp.phone}</div>
                      <div><strong className="text-[#5F6B7A]">Email Address:</strong> {selectedKycApp.email}</div>
                    </div>
                  </div>

                  {/* Stage 2 & 3: Business & Buyer Type */}
                  <div className="bg-gray-50 p-4 rounded-2xl  space-y-2">
                    <h4 className="text-sm font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
                      <span>🏢 Stage 2 & 3: Business Profile</span>
                    </h4>
                    <div className="space-y-1 text-[#132B47]">
                      <div><strong className="text-[#5F6B7A]">Buyer Type:</strong> {selectedKycApp.buyerType} {selectedKycApp.otherBuyerType && `(${selectedKycApp.otherBuyerType})`}</div>
                      <div><strong className="text-[#5F6B7A]">Business / Shop Name:</strong> {selectedKycApp.business?.name || 'N/A'}</div>
                      <div><strong className="text-[#5F6B7A]">Entity Type:</strong> {selectedKycApp.business?.businessType || 'N/A'}</div>
                      <div>
                        <strong className="text-[#5F6B7A]">GST Number:</strong> {selectedKycApp.business?.gstNumber || 'Not provided'}
                        {selectedKycApp.gstVerification && selectedKycApp.gstVerification.status !== 'NOT_PROVIDED' && (
                          <span className={`ml-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            selectedKycApp.gstVerification.status === 'VERIFIED' 
                              ? 'bg-emerald-500/20 text-emerald-700' 
                              : 'bg-red-500/20 text-red-700'
                          }`}>
                            {selectedKycApp.gstVerification.status === 'VERIFIED' ? '✅ VERIFIED' : '❌ FAILED'}
                          </span>
                        )}
                        {selectedKycApp.gstVerification?.message && (
                          <div className="text-[10px] text-[#99A5BA] mt-0.5 italic">
                            API: {selectedKycApp.gstVerification.message}
                          </div>
                        )}
                      </div>
                      <div><strong className="text-[#5F6B7A]">Year Established:</strong> {selectedKycApp.business?.yearEstablished || 'N/A'}</div>
                      <div><strong className="text-[#5F6B7A]">Business Address:</strong> {selectedKycApp.business?.address || 'N/A'}</div>
                    </div>
                  </div>

                  {/* Stage 4: Location */}
                  <div className="bg-gray-50 p-4 rounded-2xl  space-y-2">
                    <h4 className="text-sm font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                      <span>📍 Stage 4: Operating Location</span>
                    </h4>
                    <div className="space-y-1 text-[#132B47]">
                      <div><strong className="text-[#5F6B7A]">Village / City:</strong> {selectedKycApp.address?.villageCity || 'N/A'}</div>
                      <div><strong className="text-[#5F6B7A]">Tehsil / Block:</strong> {selectedKycApp.address?.tehsilBlock || 'N/A'}</div>
                      <div><strong className="text-[#5F6B7A]">District & State:</strong> {selectedKycApp.address?.district}, {selectedKycApp.address?.state}</div>
                      <div><strong className="text-[#5F6B7A]">Pincode:</strong> {selectedKycApp.address?.pincode || 'N/A'}</div>
                    </div>
                  </div>

                  {/* Stage 5 & 6: Commodities & Radius */}
                  <div className="bg-gray-50 p-4 rounded-2xl  space-y-2">
                    <h4 className="text-sm font-bold text-purple-600 uppercase tracking-wider flex items-center gap-1.5">
                      <span>🌾 Stage 5 & 6: Products & Trading Radius</span>
                    </h4>
                    <div className="space-y-1 text-[#132B47]">
                      <div><strong className="text-[#5F6B7A]">Purchase Radius:</strong> {selectedKycApp.preferredPurchaseRadius ? `${selectedKycApp.preferredPurchaseRadius} km` : 'Regional'}</div>
                      <strong className="text-[#5F6B7A] block mt-1">Crops & Commodities:</strong>
                      {selectedKycApp.commodities && selectedKycApp.commodities.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {selectedKycApp.commodities.map((c, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-700  text-xs font-bold">
                              {c.name} {c.offerPrice ? `(₹${c.offerPrice}/${c.unit || 'Qtl'})` : ''}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[#99A5BA] italic">No specific commodities declared</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stage 7 & 8: Uploaded Verification Documents (Images / PDFs) */}
                <div className="bg-gray-50 p-5 rounded-2xl  space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-[#132B47] uppercase tracking-wider flex items-center gap-2">
                      <span>📑 Stage 7 & 8: Uploaded Documents & Image Proofs</span>
                    </h4>
                    <span className="text-[#99A5BA] text-xs">Click image thumbnail to inspect full resolution</span>
                  </div>

                  {(!selectedKycApp.documents || Object.values(selectedKycApp.documents).filter(Boolean).length === 0) ? (
                    <div className="p-6 text-center text-[#99A5BA] italic border border-dashed border-gray-200 rounded-xl">
                      No document files were attached to this profile.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[
                        { key: 'identityProof', label: 'Identity Proof (Aadhaar / PAN)' },
                        { key: 'businessProof', label: 'Business Proof (Shop Act / Reg)' },
                        { key: 'addressProof', label: 'Address Proof (Utility / Lease)' },
                        { key: 'gstCertificate', label: 'GST Certificate' },
                        { key: 'udyamRegistration', label: 'Udyam MSME Registration' },
                        { key: 'fssaiLicense', label: 'FSSAI License' },
                        { key: 'otherDocument', label: 'Other Document' },
                      ].map((doc) => {
                        const fileData = selectedKycApp.documents?.[doc.key];
                        if (!fileData) return null;
                        const isImage = fileData.startsWith('data:image') || /\.(jpg|jpeg|png|webp)/i.test(fileData);

                        return (
                          <div key={doc.key} className="bg-white shadow-sm border border-gray-200 rounded-xl p-3 space-y-2 flex flex-col justify-between">
                            <div>
                              <span className="text-xs font-bold text-[#5F6B7A] uppercase block truncate mb-1">
                                {doc.label}
                              </span>
                              {isImage ? (
                                <div
                                  onClick={() => setPreviewImage(fileData)}
                                  className="w-full h-32 rounded-lg bg-gray-100  overflow-hidden cursor-pointer hover:border-amber-500 transition relative group"
                                >
                                  <img src={fileData} alt={doc.label} className="w-full h-full object-cover group-hover:scale-105 transition" />
                                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white font-bold text-xs gap-1">
                                    <span>🔍</span> Click to zoom
                                  </div>
                                </div>
                              ) : (
                                <div className="w-full h-32 rounded-lg bg-gray-100  flex flex-col items-center justify-center text-[#5F6B7A] p-2 text-center">
                                  <span className="text-2xl mb-1">📄</span>
                                  <span className="text-xs truncate max-w-[150px]">Document File</span>
                                </div>
                              )}
                            </div>

                            <a
                              href={fileData}
                              target="_blank"
                              rel="noreferrer"
                              download={`${selectedKycApp.applicantName}_${doc.key}`}
                              className="text-center py-1.5 bg-white hover:bg-gray-50 text-[#132B47] font-bold shadow-sm border border-gray-300 rounded-lg text-xs transition block"
                            >
                              Download / Open File ↗
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Stage 9: Declaration & Review Audit */}
                <div className="bg-gray-50 p-4 rounded-2xl  text-[#5F6B7A] text-xs space-y-1">
                  <h4 className="text-sm font-bold text-[#132B47] uppercase tracking-wider mb-2">
                    ⚖️ Stage 9: Declaration & Audit
                  </h4>
                  <div>Submitted On: {selectedKycApp.submittedAt ? new Date(selectedKycApp.submittedAt).toLocaleString('en-IN') : 'N/A'}</div>
                  {selectedKycApp.reviewedAt && <div>Last Reviewed: {new Date(selectedKycApp.reviewedAt).toLocaleString('en-IN')} by {selectedKycApp.reviewedBy || 'Admin'}</div>}
                  {selectedKycApp.adminRemarks && (
                    <div className="text-red-700 pt-1">
                      <strong>Rejection / Information Remarks:</strong> {selectedKycApp.adminRemarks}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer - Direct Actions */}
              <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-3 shrink-0">
                <button
                  onClick={() => { setSelectedKycApp(null); setRelatedRequest(null); }}
                  className="px-4 py-2.5 bg-white hover:bg-gray-50 text-[#132B47] font-bold shadow-sm border border-gray-300 rounded-xl text-xs transition"
                >
                  Close Inspection
                </button>

                <div className="flex items-center gap-2">
                  {/* If opened from a Publication Request */}
                  {relatedRequest && relatedRequest.status === 'PENDING_REVIEW' && (
                    <>
                      <button
                        onClick={() => {
                          handleRejectRequest(relatedRequest._id, relatedRequest.crop);
                        }}
                        className="px-4 py-2 bg-red-500/20 hover:bg-red-800 text-red-700 hover:text-[#132B47] font-bold rounded-xl text-xs transition"
                      >
                        ✕ Reject Publication
                      </button>
                      <button
                        onClick={() => {
                          handleApproveRequest(relatedRequest._id, relatedRequest.crop);
                        }}
                        className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs transition shadow"
                      >
                        ✓ Accept & Publish to Farmers
                      </button>
                    </>
                  )}

                  {/* If opened from Buyer Applications list */}
                  {selectedKycApp._id && !relatedRequest && (
                    <>
                      {selectedKycApp.verificationStatus !== 'REJECTED' && (
                        <button
                          onClick={() => handleRejectApplication(selectedKycApp._id, selectedKycApp.applicantName)}
                          className="px-4 py-2 bg-red-500/20 hover:bg-red-800 text-red-700 hover:text-[#132B47] font-bold rounded-xl text-xs transition"
                        >
                          ✕ Reject Application
                        </button>
                      )}
                      {selectedKycApp.verificationStatus !== 'APPROVED' && (
                        <button
                          onClick={() => handleApproveApplication(selectedKycApp._id, selectedKycApp.applicantName)}
                          className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs transition"
                        >
                          ✓ Approve Buyer KYC
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Full Image Zoom Lightbox */}
        {previewImage && (
          <div
            onClick={() => setPreviewImage(null)}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
          >
            <div className="max-w-4xl max-h-[90vh] relative">
              <img src={previewImage} alt="Document Preview" className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl" />
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute top-3 right-3 px-3 py-1.5 bg-white text-[#132B47] hover:bg-gray-100 shadow-lg rounded-lg text-xs font-bold"
              >
                ✕ Close
              </button>
            </div>
          </div>
        )}

        {/* ── Last Generated Receipt Popup ── */}
        {lastGeneratedReceipt && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-white  rounded-2xl max-w-2xl w-full p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-black text-green-700">✅ Receipt Generated!</h2>
                  <p className="text-xs text-[#5F6B7A] mt-1">Receipt #{lastGeneratedReceipt.receiptNumber} for {lastGeneratedReceipt.cropName}</p>
                </div>
                <button onClick={() => setLastGeneratedReceipt(null)} className="text-[#5F6B7A] hover:text-[#132B47] text-xl font-bold">✕</button>
              </div>
              <div className="bg-white rounded-xl overflow-hidden" style={{ height: '420px' }}>
                <iframe
                  src={lastGeneratedReceipt.receiptUrl}
                  title="Saathi Payment Receipt"
                  className="w-full h-full border-0"
                />
              </div>
              <div className="flex gap-3 mt-4">
                <a
                  href={lastGeneratedReceipt.receiptUrl}
                  download={`Saathi-Receipt-${lastGeneratedReceipt.receiptNumber}.html`}
                  className="flex-1 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black rounded-xl text-sm text-center transition"
                >
                  ⬇ Download Receipt
                </a>
                <button
                  onClick={() => setLastGeneratedReceipt(null)}
                  className="px-5 py-2.5 bg-white hover:bg-white text-[#132B47] font-bold shadow-sm border border-gray-200 rounded-xl text-sm transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Saathi Admin Wallet ── */}
        {activeTab === 'wallet' && (
          <div className="space-y-6">

            {/* Wallet Balance Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-amber-50 rounded-xl p-5 shadow-sm">
                <div className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1 flex items-center gap-1.5"><span>💰</span> Current Wallet Balance</div>
                <div className="text-3xl font-black text-amber-900">₹{Number(walletData.balance || 0).toLocaleString('en-IN')}</div>
                <div className="text-xs text-amber-700/80 mt-1 font-semibold">Available for farmer payouts</div>
              </div>
              <div className="bg-green-50 rounded-xl p-5 shadow-sm">
                <div className="text-xs font-bold text-green-700 uppercase tracking-wider mb-1 flex items-center gap-1.5"><span>📥</span> Total Received</div>
                <div className="text-3xl font-black text-green-900">₹{Number(walletData.totalReceived || 0).toLocaleString('en-IN')}</div>
                <div className="text-xs text-green-700/80 mt-1 font-semibold">From buyer escrow + farmer agent fees</div>
              </div>
              <div className="bg-blue-50 rounded-xl p-5 shadow-sm">
                <div className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1 flex items-center gap-1.5"><span>📤</span> Total Forwarded</div>
                <div className="text-3xl font-black text-blue-900">₹{Number(walletData.totalForwarded || 0).toLocaleString('en-IN')}</div>
                <div className="text-xs text-blue-700/80 mt-1 font-semibold">Paid out to farmers</div>
              </div>
            </div>

            {/* Pending Payouts Section */}
            {(() => {
              const pendingPayouts = dealInspections.filter(d =>
                d.escrowDepositPaid && d.status !== 'COMPLETED' && d.status !== 'CANCELLED' && d.status !== 'DISPUTED'
              );
              return pendingPayouts.length > 0 ? (
                <div className="bg-white rounded-xl p-5 shadow-sm">
                  <h3 className="text-sm font-black text-amber-700 mb-4 flex items-center gap-2"><span>🔔</span> Pending Farmer Payouts ({pendingPayouts.length})</h3>
                  <div className="space-y-3">
                    {pendingPayouts.map(deal => {
                      const payoutAmt = Number(deal.agreedPrice || 0) * Number(deal.quantity || 0);
                      const farmerName = `${deal.farmerId?.firstName || ''} ${deal.farmerId?.lastName || ''}`.trim();
                      return (
                        <div key={deal._id} className="flex items-center justify-between bg-gray-50 rounded-xl p-4 gap-4 transition-colors hover:bg-white">
                          <div className="flex-1 min-w-0">
                            <div className="font-black text-[#132B47] text-sm uppercase">{deal.crop}</div>
                            <div className="text-xs text-[#5F6B7A] mt-0.5">
                              Farmer: <span className="text-[#132B47] font-bold">{farmerName || 'N/A'}</span>
                              {' · '}{deal.quantity} Qtl @ ₹{Number(deal.agreedPrice || 0).toLocaleString('en-IN')}
                            </div>
                            <div className="text-[10px] text-[#5F6B7A] mt-0.5 font-mono bg-white inline-block px-1.5 py-0.5 rounded mt-1 uppercase">
                              Deal #{String(deal._id).slice(-8)} · Status: <span className="text-amber-600 font-bold">{deal.status}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-lg font-black text-[#16845B]">₹{payoutAmt.toLocaleString('en-IN')}</div>
                            <div className="text-[10px] uppercase font-bold text-[#5F6B7A]">Payout amount</div>
                          </div>
                          <button
                            onClick={() => handlePayFarmer(deal._id, deal.crop)}
                            disabled={payingFarmerId === deal._id}
                            className="shrink-0 px-4 py-2 bg-[#16845B] hover:bg-green-700 text-white font-bold rounded-lg text-xs transition disabled:opacity-50 shadow-sm flex items-center gap-1.5"
                          >
                            {payingFarmerId === deal._id ? '⏳ Processing...' : '💸 Pay Farmer'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl p-6 text-center text-[#5F6B7A] text-sm font-semibold">
                  ✅ No pending farmer payouts at this time.
                </div>
              );
            })()}

            {/* Transaction History */}
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h3 className="text-sm font-black text-[#132B47] flex items-center gap-1.5"><span>📋</span> Transaction History</h3>
                <div className="flex gap-2">
                  {['ALL', 'RECEIVED', 'FORWARDED'].map(f => (
                    <button
                      key={f}
                      onClick={() => setWalletTxFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                        walletTxFilter === f
                          ? f === 'RECEIVED' ? 'bg-green-50 text-green-800 border-green-200 shadow-sm'
                            : f === 'FORWARDED' ? 'bg-blue-50 text-blue-800 border-blue-200 shadow-sm'
                            : 'bg-[#132B47] text-white border-[#132B47] shadow-sm'
                          : 'bg-white text-[#5F6B7A] border-gray-200 hover:text-[#132B47] hover:bg-gray-50'
                      }`}
                    >
                      {f === 'ALL' ? 'All' : f === 'RECEIVED' ? '📥 Payment Received' : '📤 Payment Forwarded'}
                    </button>
                  ))}
                </div>
              </div>

              {walletTransactions.filter(tx => walletTxFilter === 'ALL' || tx.type === walletTxFilter).length === 0 ? (
                <div className="text-center text-[#99A5BA] text-sm font-semibold py-8 bg-gray-50 rounded-xl">No transactions yet.</div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {walletTransactions
                    .filter(tx => walletTxFilter === 'ALL' || tx.type === walletTxFilter)
                    .map(tx => {
                      const isReceived = tx.type === 'RECEIVED';
                      const date = new Date(tx.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                      const time = new Date(tx.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                      const personName = isReceived
                        ? `${tx.fromUserId?.firstName || ''} ${tx.fromUserId?.lastName || ''}`.trim()
                        : `${tx.toUserId?.firstName || ''} ${tx.toUserId?.lastName || ''}`.trim();
                      return (
                        <div key={tx._id} className={`flex items-center justify-between rounded-xl p-3.5 border gap-3 ${
                          isReceived ? 'bg-green-50/50 border-green-100 hover:border-green-300' : 'bg-blue-50/50 border-blue-100 hover:border-blue-300'
                        } transition`}>
                          <div className="text-xl shrink-0">{isReceived ? '📥' : '📤'}</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-black text-[#132B47] truncate">{tx.description || '—'}</div>
                            <div className="text-xs text-[#5F6B7A] mt-0.5">
                              {isReceived ? 'From' : 'To'}: <span className="text-[#132B47] font-bold">{personName || 'N/A'}</span>
                              {tx.payerRole && <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gray-200 text-[#5F6B7A]">{tx.payerRole}</span>}
                            </div>
                            <div className="text-[10px] text-[#99A5BA] mt-0.5 font-mono bg-white inline-block px-1.5 py-0.5 border rounded border-gray-200 uppercase">{date} · {time}</div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className={`text-base font-black ${isReceived ? 'text-green-700' : 'text-blue-700'}`}>
                              {isReceived ? '+' : '-'}₹{Number(tx.amount || 0).toLocaleString('en-IN')}
                            </div>
                            <div className="text-[10px] uppercase font-bold text-[#5F6B7A]">Bal: ₹{Number(tx.balanceAfter || 0).toLocaleString('en-IN')}</div>
                          </div>
                          {!isReceived && tx.receiptData?.generatedReceiptUrl && (
                            <button
                              onClick={() => setLastGeneratedReceipt({
                                receiptUrl: tx.receiptData.generatedReceiptUrl,
                                receiptNumber: tx.receiptData.receiptNumber,
                                cropName: tx.receiptData.crop
                              })}
                              className="shrink-0 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded-lg text-xs transition shadow-sm flex items-center gap-1"
                            >
                              <span>🧾</span> Receipt
                            </button>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Floating Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-white shadow-xl shadow-gray-200/50 rounded-full px-6 py-3 animate-in slide-in-from-bottom-5">
            <div className="flex items-center gap-2 border-r border-[#D9DEE5] pr-4">
              <span className="w-6 h-6 rounded-full bg-[#132B47] text-white flex items-center justify-center text-xs font-bold">
                {selectedIds.length}
              </span>
              <span className="text-sm font-bold text-[#132B47]">Selected</span>
            </div>
            <InlineConfirmButton
              id="bulk-approve"
              confirmingId={confirmingId}
              setConfirmingId={setConfirmingId}
              fastMode={fastMode}
              baseText={<><span>✓</span><span>Approve All</span></>}
              confirmText="Approve All"
              baseClassName="px-4 py-1.5 bg-[#E51B2A] hover:bg-red-800 text-white rounded-full text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
              disabled={actionLoadingId === 'BULK'}
              onConfirm={() => handleBulkAction('APPROVE')}
            />
            <InlineConfirmButton
              id="bulk-reject"
              confirmingId={confirmingId}
              setConfirmingId={setConfirmingId}
              fastMode={fastMode}
              requireReason={true}
              reasonPlaceholder="Bulk Rejection Reason"
              baseText={<><span>✕</span><span>Reject All</span></>}
              confirmText="Reject All"
              baseClassName="px-4 py-1.5 bg-[#C62828] hover:bg-red-800 text-white rounded-full text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
              disabled={actionLoadingId === 'BULK'}
              onConfirm={(reason) => handleBulkAction('REJECT', reason)}
            />
            <button
              onClick={() => setSelectedIds([])}
              className="px-2 py-1.5 ml-2 text-[#99A5BA] hover:text-[#5F6B7A] text-sm transition"
              title="Clear Selection"
            >
              ✕
            </button>
          </div>
        )}

      </main>
    </div>
  );
}
