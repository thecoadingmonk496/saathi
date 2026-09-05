import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5001' : '')
).replace(/\/$/, '');

const apiUrl = (path) => `${API_BASE_URL}${path}`;

export default function Admin() {
  const [activeTab, setActiveTab] = useState('buyer-requests');
  const [users, setUsers] = useState([]);
  const [buyerRequests, setBuyerRequests] = useState([]);
  const [buyerApplications, setBuyerApplications] = useState([]);
  const [dealInspections, setDealInspections] = useState([]);
  const [inspectionFilter, setInspectionFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [requestFilter, setRequestFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // 9-Stage KYC Inspection Modal State
  const [selectedKycApp, setSelectedKycApp] = useState(null);
  const [relatedRequest, setRelatedRequest] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  
  const navigate = useNavigate();
  const adminEmail = localStorage.getItem('adminEmail') || 'ts7529614@gmail.com';

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin/login', { replace: true });
      return;
    }
    fetchAllData(token);
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

    setLoading(true);
    setError('');

    try {
      // 1. Fetch Users
      const usersRes = await fetch(apiUrl('/api/admin/users'), {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      const usersData = await usersRes.json();
      if (usersRes.ok && usersData.success) {
        setUsers(usersData.data || []);
      } else if (usersRes.status === 401 || usersRes.status === 403) {
        handleLogout();
        return;
      }

      // 2. Fetch Buyer Requests (Procurement Publications) with populated buyerApplication
      const reqRes = await fetch(apiUrl('/api/admin/buyer-requests'), {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      const reqData = await reqRes.json();
      if (reqRes.ok && reqData.success) {
        setBuyerRequests(reqData.data || []);
      }

      // 3. Fetch Buyer KYC Applications
      const appRes = await fetch(apiUrl('/api/admin/buyer-applications'), {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      const appData = await appRes.json();
      if (appRes.ok && appData.success) {
        setBuyerApplications(appData.data || []);
      }

      // 4. Fetch Crop Deal Inspections
      const dealsRes = await fetch(apiUrl('/api/admin/deals/inspections'), {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      const dealsData = await dealsRes.json();
      if (dealsRes.ok && dealsData.success) {
        setDealInspections(dealsData.data || []);
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

  const handleRejectRequest = async (requestId, cropName) => {
    const token = localStorage.getItem('adminToken');
    if (!token) { handleLogout(); return; }

    const reason = window.prompt(`Enter rejection reason for "${cropName}":`, 'Quality specifications incomplete or offered price outside fair market range.');
    if (reason === null) return;

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

  const handleRejectApplication = async (appId, applicantName) => {
    const token = localStorage.getItem('adminToken');
    if (!token) { handleLogout(); return; }

    const reason = window.prompt(`Enter rejection reason for "${applicantName}":`, 'Incomplete business documents.');
    if (reason === null) return;

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

    const confirmDelete = window.confirm(
      `Are you sure you want to permanently delete user "${user.firstName} ${user.lastName}" (${user.phone}) from MongoDB?`
    );
    if (!confirmDelete) return;

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

  const handleUnverifyDeal = async (dealId, cropName) => {
    const token = localStorage.getItem('adminToken');
    if (!token) { handleLogout(); return; }

    const reason = window.prompt(`Enter reason for marking "${cropName}" as unverified:`, 'Moisture level or physical stock quality failed field criteria.');
    if (reason === null) return;

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

  const handleCompleteDeal = async (dealId, cropName) => {
    const token = localStorage.getItem('adminToken');
    if (!token) { handleLogout(); return; }

    setActionLoadingId(dealId);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch(apiUrl(`/api/admin/deals/${dealId}/final-verification`), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(`🎉 Deal for "${cropName}" marked as COMPLETED! Recorded on farmer dashboard.`);
        setDealInspections((prev) =>
          prev.map((d) => (d._id === dealId ? { ...d, status: 'COMPLETED' } : d))
        );
        setTimeout(() => setSuccessMsg(''), 6000);
      } else {
        setError(data.message || 'Failed to complete deal.');
      }
    } catch (err) {
      setError('Network error while completing deal.');
    } finally {
      setActionLoadingId(null);
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
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-[var(--saathi-primary)] selection:text-white pb-12">
      {/* Top Navigation Bar */}
      <header className="bg-slate-900/80 border-b border-slate-800 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--saathi-primary)]/10 border border-[var(--saathi-primary)]/30 flex items-center justify-center text-emerald-400 font-bold shadow-md">
              🛡️
            </div>
            <div>
              <span className="font-extrabold tracking-tight text-white text-base">SAATHI</span>
              <span className="ml-2 px-2 py-0.5 rounded-md bg-[var(--saathi-primary)]/20 text-emerald-400 text-xs font-bold uppercase tracking-wider border border-[var(--saathi-primary)]/30">
                Admin Verification Center
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{adminEmail}</span>
            </div>

            <button
              onClick={handleLogout}
              className="px-3.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <span>Logout</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Status Alerts */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm font-semibold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </span>
            <button onClick={() => setError('')} className="text-red-400 hover:text-white text-xs">✕</button>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-[var(--saathi-primary)]/10 border border-[var(--saathi-primary)]/30 text-emerald-300 text-sm font-semibold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span>✓</span>
              <span>{successMsg}</span>
            </span>
            <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-white text-xs">✕</button>
          </div>
        )}

        {/* Top Summary Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-900/70 border border-slate-800/80 p-5 rounded-2xl">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Buyer Publications</div>
            <div className="text-3xl font-black text-amber-400">{pendingRequestsCount} Pending</div>
            <div className="text-xs text-slate-400 mt-1">Requires Admin Accept or Reject</div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800/80 p-5 rounded-2xl">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">On-Ground Inspections</div>
            <div className="text-3xl font-black text-emerald-400">{pendingInspectionsCount} Pending</div>
            <div className="text-xs text-slate-400 mt-1">₹250 Paid • 11.8% Moisture</div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800/80 p-5 rounded-2xl">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Buyer KYC Applications</div>
            <div className="text-3xl font-black text-blue-400">{pendingAppsCount} Pending</div>
            <div className="text-xs text-slate-400 mt-1">{buyerApplications.length} total applications</div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800/80 p-5 rounded-2xl">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Users</div>
            <div className="text-3xl font-black text-purple-400">{users.length}</div>
            <div className="text-xs text-slate-400 mt-1">Direct read & manage access</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('buyer-requests')}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition flex items-center gap-2 shrink-0 ${
              activeTab === 'buyer-requests'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <span>🌾 Buyer Publications</span>
            {pendingRequestsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-black bg-amber-500 text-slate-950">
                {pendingRequestsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('deal-inspections')}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition flex items-center gap-2 shrink-0 ${
              activeTab === 'deal-inspections'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <span>🛵 On-Ground Crop Inspections</span>
            {pendingInspectionsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-black bg-emerald-500 text-slate-950">
                {pendingInspectionsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('buyer-applications')}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition flex items-center gap-2 shrink-0 ${
              activeTab === 'buyer-applications'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <span>📄 Buyer KYC Applications</span>
            {pendingAppsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-black bg-blue-500 text-slate-950">
                {pendingAppsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition flex items-center gap-2 shrink-0 ${
              activeTab === 'users'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <span>👥 Registered Users ({users.length})</span>
          </button>

          <div className="flex-1" />
          <button
            onClick={() => fetchAllData()}
            disabled={loading}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-xl border border-slate-800 transition flex items-center gap-1.5"
          >
            <span>🔄 Refresh</span>
          </button>
        </div>

        {/* ── Tab 1: Buyer Publications (Requests) ── */}
        {activeTab === 'buyer-requests' && (
          <div className="space-y-4">
            {/* Filter controls */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                {['ALL', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setRequestFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      requestFilter === st
                        ? 'bg-slate-800 text-white border border-slate-700'
                        : 'text-slate-400 hover:text-slate-200'
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
                  className="w-full h-9 pl-8 pr-3 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs font-medium placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                />
                <span className="absolute left-2.5 top-2.5 text-xs text-slate-500">🔍</span>
              </div>
            </div>

            {loading ? (
              <div className="py-20 text-center text-slate-400">Loading publications…</div>
            ) : filteredRequests.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
                <div className="text-4xl mb-2">🌾</div>
                <p className="font-bold text-white">No publication requests found</p>
                <p className="text-xs text-slate-500 mt-1">When buyers submit crop procurement requirements, they will appear here for verification.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredRequests.map((req) => {
                  const isPending = req.status === 'PENDING_REVIEW';
                  const isPublished = req.status === 'PUBLISHED';
                  const isRejected = req.status === 'REJECTED';

                  return (
                    <div
                      key={req._id}
                      className={`bg-slate-900/80 border rounded-2xl p-5 shadow-lg transition ${
                        isPending
                          ? 'border-amber-500/50 bg-amber-500/5'
                          : isPublished
                          ? 'border-emerald-500/40 bg-emerald-500/5'
                          : 'border-slate-800'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Details */}
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="text-lg font-black text-white">{req.crop}</span>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-slate-800 text-amber-300 border border-slate-700">
                              {req.quantity} {req.unit || 'Quintals'}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              Offered: ₹{Number(req.offeredPrice).toLocaleString('en-IN')}/{req.unit || 'Qtl'}
                            </span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-sm font-bold tracking-wider ${
                                isPending
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                                  : isPublished
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-red-500/20 text-red-300 border border-red-500/40'
                              }`}
                            >
                              ● {req.status.replace('_', ' ')}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs text-slate-300 pt-1">
                            <div>
                              <span className="text-slate-500 font-bold uppercase tracking-wider text-xs">Delivery Location: </span>
                              <span className="font-semibold text-white">{req.location || 'Not specified'}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 font-bold uppercase tracking-wider text-xs">Buyer Name: </span>
                              <button
                                onClick={() => openKycForRequest(req)}
                                className="font-semibold text-blue-400 hover:text-blue-300 hover:underline inline-flex items-center gap-1"
                                title="Click to inspect full 9-stage KYC & uploaded documents"
                              >
                                <span>{req.buyerId?.firstName} {req.buyerId?.lastName}</span>
                                <span>({req.buyerId?.phone || 'No phone'})</span>
                                <span className="text-xs bg-blue-500/20 px-1.5 py-0.2 rounded border border-blue-500/30">KYC 🔍</span>
                              </button>
                            </div>
                            <div>
                              <span className="text-slate-500 font-bold uppercase tracking-wider text-xs">Estimated Value: </span>
                              <span className="font-bold text-emerald-400">
                                ₹{((Number(req.quantity) || 0) * (Number(req.offeredPrice) || 0)).toLocaleString('en-IN')}
                              </span>
                            </div>
                          </div>

                          {req.description && (
                            <p className="text-xs text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                              <strong className="text-slate-300">Specifications / Notes:</strong> {req.description}
                            </p>
                          )}

                          {isRejected && req.adminRemarks && (
                            <p className="text-xs text-red-300 bg-red-950/40 p-2.5 rounded-xl border border-red-900/50">
                              <strong>Rejection Reason:</strong> {req.adminRemarks}
                            </p>
                          )}

                          <div className="flex items-center gap-4 text-sm text-slate-500">
                            <span>Submitted: {new Date(req.createdAt).toLocaleString('en-IN')}</span>
                            {req.reviewedAt && <span>Reviewed: {new Date(req.reviewedAt).toLocaleString('en-IN')}</span>}
                          </div>
                        </div>

                        {/* Admin Actions */}
                        <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0 border-t lg:border-t-0 lg:border-l border-slate-800/80 pt-3 lg:pt-0 lg:pl-4">
                          {/* 9-Stage KYC Inspection Button */}
                          <button
                            onClick={() => openKycForRequest(req)}
                            className="px-3.5 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 font-bold rounded-xl text-xs border border-blue-500/40 transition flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <span>📋</span>
                            <span>Inspect 9-Stage KYC</span>
                          </button>

                          {isPending ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleApproveRequest(req._id, req.crop)}
                                disabled={actionLoadingId === req._id}
                                className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs transition shadow flex items-center justify-center gap-1.5 disabled:opacity-50"
                              >
                                <span>✓</span>
                                <span>Accept & Publish</span>
                              </button>

                              <button
                                onClick={() => handleRejectRequest(req._id, req.crop)}
                                disabled={actionLoadingId === req._id}
                                className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white font-bold rounded-xl text-xs border border-red-500/40 hover:border-transparent transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                              >
                                <span>✕</span>
                                <span>Reject</span>
                              </button>
                            </div>
                          ) : isPublished ? (
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-emerald-400">✓ Live on Farmer UI</span>
                              <button
                                onClick={() => handleRejectRequest(req._id, req.crop)}
                                disabled={actionLoadingId === req._id}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-red-900/40 text-slate-400 hover:text-red-300 rounded-lg text-xs font-medium border border-slate-700 transition"
                              >
                                Revoke
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-red-400">✕ Rejected</span>
                              <button
                                onClick={() => handleApproveRequest(req._id, req.crop)}
                                disabled={actionLoadingId === req._id}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-emerald-900/40 text-slate-300 hover:text-emerald-300 rounded-lg text-xs font-medium border border-slate-700 transition"
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
              <div className="py-20 text-center text-slate-400">Loading applications…</div>
            ) : buyerApplications.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
                <p className="font-bold text-white">No buyer registration applications found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {buyerApplications.map((app) => (
                  <div key={app._id} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="text-base font-bold text-white">{app.applicantName}</h3>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            {app.buyerType}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            app.verificationStatus === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-300' :
                            app.verificationStatus === 'REJECTED' ? 'bg-red-500/20 text-red-300' :
                            'bg-amber-500/20 text-amber-300'
                          }`}>
                            {app.verificationStatus}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          <strong>Business:</strong> {app.business?.name} ({app.business?.businessType}) • <strong>Phone:</strong> {app.phone} • <strong>Email:</strong> {app.email}
                        </p>
                        <p className="text-xs text-slate-400">
                          <strong>Location:</strong> {app.address?.district}, {app.address?.state} ({app.address?.pincode})
                        </p>
                        {app.adminRemarks && (
                          <p className="text-xs text-red-300 bg-red-950/30 p-2 rounded-lg border border-red-900/40">
                            <strong>Remarks:</strong> {app.adminRemarks}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => {
                            openKycApp(app._id, app, null);
                          }}
                          className="px-3.5 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 font-bold rounded-xl text-xs border border-blue-500/40 transition flex items-center gap-1.5"
                        >
                          <span>🔍</span>
                          <span>View 9-Stage Form & Docs</span>
                        </button>

                        {app.verificationStatus !== 'APPROVED' && (
                          <button
                            onClick={() => handleApproveApplication(app._id, app.applicantName)}
                            disabled={actionLoadingId === app._id}
                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs transition"
                          >
                            ✓ Approve KYC
                          </button>
                        )}
                        {app.verificationStatus !== 'REJECTED' && (
                          <button
                            onClick={() => handleRejectApplication(app._id, app.applicantName)}
                            disabled={actionLoadingId === app._id}
                            className="px-4 py-2 bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white font-bold rounded-xl text-xs border border-red-500/30 transition"
                          >
                            ✕ Reject
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab 3: Registered Users ── */}
        {activeTab === 'users' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center gap-4">
              <input
                type="text"
                placeholder="Search user by name, phone, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full max-w-sm h-10 px-4 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <span className="text-xs text-slate-400 font-semibold">{filteredUsers.length} Users</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/60 border-b border-slate-800">
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">User Details</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Phone / Mobile</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Email Address</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Registered On</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-16 text-center text-slate-400">
                        No registered users matching query.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user._id} className="hover:bg-slate-800/40 transition">
                        <td className="px-6 py-4">
                          <div className="font-bold text-white text-sm">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm font-mono text-slate-500 mt-0.5 select-all">
                            ID: {user._id}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-bold">
                            📞 {user.phone}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-300 font-medium">{user.email}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-slate-400 font-medium">
                            {user.createdAt ? new Date(user.createdAt).toLocaleString('en-IN') : 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDeleteUser(user)}
                            disabled={deletingId === user._id}
                            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 rounded-xl text-xs font-bold transition ml-auto"
                          >
                            {deletingId === user._id ? 'Deleting…' : 'Delete'}
                          </button>
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
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
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
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                      inspectionFilter === item.key
                        ? 'bg-emerald-600 text-white shadow'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
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
                  className="w-full h-9 pl-8 pr-3 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs font-medium placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <span className="absolute left-2.5 top-2.5 text-xs text-slate-500">🔍</span>
              </div>
            </div>

            {loading ? (
              <div className="py-20 text-center text-slate-400">Loading inspection deals…</div>
            ) : filteredInspections.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
                <div className="text-4xl mb-2">🌾</div>
                <p className="font-bold text-white">No crop inspections found</p>
                <p className="text-xs text-slate-500 mt-1">
                  When farmers upload photos and pay the ₹250 agent verification fee, deals will appear here for admin review.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5">
                {filteredInspections.map((deal) => {
                  const isAwaiting = deal.status === 'HUMAN_REVIEW';
                  const isVerified = deal.status === 'VERIFIED' || deal.status === 'ADMIN_PRE_SHIPMENT_VERIFIED';
                  const isUnverified = deal.status === 'UNVERIFIED';

                  const latestSub = deal.qualitySubmissions && deal.qualitySubmissions.length > 0
                    ? deal.qualitySubmissions[deal.qualitySubmissions.length - 1]
                    : null;
                  const images = latestSub?.imageUrls || [];

                  return (
                    <div
                      key={deal._id}
                      className={`bg-slate-900/90 border rounded-3xl p-6 shadow-xl transition relative overflow-hidden ${
                        isAwaiting
                          ? 'border-amber-500/60 ring-1 ring-amber-500/30'
                          : isVerified
                          ? 'border-emerald-500/50 ring-1 ring-emerald-500/20'
                          : isUnverified
                          ? 'border-red-500/50'
                          : 'border-slate-800'
                      }`}
                    >
                      {/* Top Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-800">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-mono font-bold text-slate-400 uppercase tracking-wider">
                              DEAL #{deal._id?.slice(-6).toUpperCase()}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                              isAwaiting
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : isVerified
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : isUnverified
                                ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                                : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                            }`}>
                              {isAwaiting ? '🛵 Agent Assigned • Awaiting Admin Verify' :
                               isVerified ? '✓ Verified' :
                               isUnverified ? '✕ Unverified' : deal.status}
                            </span>
                          </div>
                          <h3 className="text-xl font-black text-white mt-1">
                            {deal.crop} — {deal.quantity} Qtl
                          </h3>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-xs text-slate-400">Agreed Price</p>
                            <p className="text-base font-black text-amber-400">₹{Number(deal.agreedPrice).toLocaleString('en-IN')}/Qtl</p>
                          </div>
                          <div className="text-right pl-3 border-l border-slate-800">
                            <p className="text-xs text-slate-400">Total Value</p>
                            <p className="text-base font-black text-emerald-400">₹{(Number(deal.agreedPrice) * Number(deal.quantity)).toLocaleString('en-IN')}</p>
                          </div>
                        </div>
                      </div>

                      {/* Status Badges Row: Moisture + Agent Fee */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-4 border-b border-slate-800/80">
                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">💧</span>
                            <div>
                              <p className="text-sm font-bold text-emerald-400 uppercase tracking-wide">Moisture Analysis</p>
                              <p className="text-xs font-semibold text-emerald-200">
                                {deal.moisturePercent || 11.8}% (Acceptable standard 10%-14%)
                              </p>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-xs font-black bg-emerald-500 text-slate-950 uppercase">
                            Screening Passed
                          </span>
                        </div>

                        <div className={`p-3 rounded-xl border flex items-center justify-between ${
                          deal.agentFeePaid
                            ? 'bg-blue-500/10 border-blue-500/30'
                            : 'bg-slate-800/50 border-slate-700'
                        }`}>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">💳</span>
                            <div>
                              <p className="text-sm font-bold text-blue-400 uppercase tracking-wide">Agent Connection Fee</p>
                              <p className="text-xs font-semibold text-slate-200">
                                {deal.agentFeePaid ? '₹250 Paid by Farmer' : '₹250 Payment Pending'}
                              </p>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-xs font-black uppercase ${
                            deal.agentFeePaid
                              ? 'bg-blue-500 text-white'
                              : 'bg-slate-700 text-slate-300'
                          }`}>
                            {deal.agentFeePaid ? 'PAID ✓' : 'UNPAID'}
                          </span>
                        </div>
                      </div>

                      {/* 2-Column Info: Farmer Address/Phone vs Buyer Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 border-b border-slate-800/80">
                        {/* Farmer on-ground address card */}
                        <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                              <span>👨‍🌾</span> Farmer & Field Inspection Location
                            </span>
                          </div>
                          <h4 className="text-base font-bold text-white">
                            {deal.farmerId?.firstName} {deal.farmerId?.lastName}
                          </h4>
                          <div className="mt-2 space-y-1.5 text-xs text-slate-300">
                            <p className="flex items-center gap-2">
                              <span className="text-slate-500">Phone:</span>
                              <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 select-all">
                                📞 {deal.farmerId?.phone || 'Not provided'}
                              </span>
                            </p>
                            <p className="flex items-start gap-2">
                              <span className="text-slate-500 shrink-0">Field Address:</span>
                              <span className="font-medium text-slate-200">
                                📍 {deal.farmerId?.village ? `Village: ${deal.farmerId.village}, ` : ''}
                                {deal.farmerId?.block ? `Block: ${deal.farmerId.block}, ` : ''}
                                {deal.farmerId?.district ? `District: ${deal.farmerId.district}, ` : ''}
                                {deal.farmerId?.state || ''}
                              </span>
                            </p>
                          </div>
                        </div>

                        {/* Buyer Info Card */}
                        <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-black uppercase text-blue-400 tracking-wider flex items-center gap-1.5">
                              <span>🏢</span> Buyer Details
                            </span>
                          </div>
                          <h4 className="text-base font-bold text-white">
                            {deal.buyerId?.firstName} {deal.buyerId?.lastName}
                          </h4>
                          <div className="mt-2 space-y-1.5 text-xs text-slate-300">
                            <p className="flex items-center gap-2">
                              <span className="text-slate-500">Phone:</span>
                              <span className="font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 select-all">
                                📞 {deal.buyerId?.phone || 'Not provided'}
                              </span>
                            </p>
                            <p className="flex items-start gap-2">
                              <span className="text-slate-500 shrink-0">Location:</span>
                              <span className="font-medium text-slate-200">
                                📍 {deal.buyerId?.district ? `${deal.buyerId.district}, ` : ''}
                                {deal.buyerId?.state || 'N/A'}
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Uploaded Crop Photos */}
                      {images.length > 0 && (
                        <div className="py-4 border-b border-slate-800/80">
                          <div className="flex items-center justify-between mb-2.5">
                            <span className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                              <span>📷</span> Uploaded Crop Photos ({images.length})
                            </span>
                            <span className="text-sm text-slate-500">Click any photo to zoom in full screen</span>
                          </div>
                          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2.5">
                            {images.map((img, idx) => (
                              <div
                                key={idx}
                                onClick={() => setPreviewImage(img)}
                                className="aspect-square rounded-xl overflow-hidden border border-slate-700 hover:border-amber-400 transition cursor-zoom-in group relative bg-slate-950"
                              >
                                <img
                                  src={img}
                                  alt={`Crop ${idx + 1}`}
                                  className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                                />
                                <span className="absolute bottom-1 right-1 text-[9px] bg-black/70 text-white px-1.5 py-0.5 rounded">
                                  #{idx + 1}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Uploaded Transaction Receipt & UTR (Submitted by Farmer) */}
                      {(deal.transactionReceiptUrl || deal.utrNumber || deal.status === 'RECEIPT_SUBMITTED' || deal.status === 'COMPLETED') && (
                        <div className="py-4 border-b border-slate-800/80 bg-slate-950/60 p-4 rounded-2xl my-3 border border-slate-800">
                          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                            <span className="text-xs font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                              <span>🧾</span> Sale Payment Proof & UTR Reference
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
                              deal.status === 'COMPLETED'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            }`}>
                              {deal.status === 'COMPLETED' ? '✓ Deal Completed' : 'Pending Admin Completion'}
                            </span>
                          </div>

                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            {deal.transactionReceiptUrl && (
                              <div
                                onClick={() => setPreviewImage(deal.transactionReceiptUrl)}
                                className="w-24 h-24 rounded-xl overflow-hidden border border-slate-700 hover:border-emerald-400 transition cursor-zoom-in group relative bg-slate-900 shrink-0"
                              >
                                <img
                                  src={deal.transactionReceiptUrl}
                                  alt="Transaction Receipt"
                                  className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                                />
                                <span className="absolute bottom-1 right-1 text-[9px] bg-black/80 text-white px-1.5 py-0.5 rounded">
                                  🔍 Zoom
                                </span>
                              </div>
                            )}

                            <div className="space-y-1.5 text-xs text-slate-300">
                              <p className="flex items-center gap-2">
                                <span className="text-slate-500">UTR / Reference:</span>
                                <span className="font-mono font-black text-white bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 select-all text-sm">
                                  {deal.utrNumber || 'No UTR typed'}
                                </span>
                              </p>
                              <p className="text-sm text-slate-400">
                                Uploaded by farmer after receiving payment from buyer.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Action Bar (Verified / Complete / Unverified) */}
                      <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <div className="text-xs text-slate-400">
                          {deal.status === 'COMPLETED' && (
                            <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                              <span>🎉</span> Deal marked as COMPLETED! Transaction recorded.
                            </span>
                          )}
                          {deal.status === 'RECEIPT_SUBMITTED' && (
                            <span className="text-amber-300 font-bold flex items-center gap-1.5">
                              <span>📄</span> Transaction receipt & UTR uploaded. Click "Mark Deal Completed" to finalize.
                            </span>
                          )}
                          {(deal.status === 'VERIFIED' || deal.status === 'ADMIN_PRE_SHIPMENT_VERIFIED') && (
                            <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                              <span>✓</span> Crop physically verified from agent. Awaiting buyer to upload delivery photos.
                            </span>
                          )}
                          {isUnverified && (
                            <span className="text-red-400 font-bold flex items-center gap-1.5">
                              <span>✕</span> Crop marked unverified. Deal paused.
                            </span>
                          )}
                          {isAwaiting && (
                            <span className="text-amber-400 font-bold flex items-center gap-1.5">
                              <span>🛵</span> Agent has farmer's address and phone number for physical check. Tap below to verify or reject.
                            </span>
                          )}
                        
                          </div>

                          {/* Image Gallery */}
                          {images.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto mt-4 pb-2">
                              {images.map((img, i) => (
                                <img key={i} src={img} alt="crop" className="h-20 w-20 object-cover rounded-lg border border-slate-700" />
                              ))}
                            </div>
                          )}
                          {deal.deliverySubmissions?.length > 0 && (
                            <div className="mt-4">
                              <p className="text-xs font-bold text-slate-400 mb-2">Delivery Photos:</p>
                              <div className="flex gap-2 overflow-x-auto pb-2">
                                {deal.deliverySubmissions.map((img, i) => (
                                  <img key={i} src={img} alt="delivery" className="h-20 w-20 object-cover rounded-lg border border-slate-700" />
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="flex items-center gap-2 justify-end flex-wrap mt-5">
                            {deal.status === 'HUMAN_REVIEW' && (
                              <>
                                <button
                                  onClick={() => handleVerifyPreShipment(deal._id, 'APPROVED')}
                                  disabled={actionLoadingId === deal._id}
                                  className="px-4 py-2 bg-emerald-500 text-slate-950 font-black rounded-lg text-xs hover:bg-emerald-600"
                                >
                                  Approve Photos
                                </button>
                                <button
                                  onClick={() => handleVerifyPreShipment(deal._id, 'REJECTED')}
                                  disabled={actionLoadingId === deal._id}
                                  className="px-4 py-2 bg-red-500 text-white font-black rounded-lg text-xs hover:bg-red-600"
                                >
                                  Reject
                                </button>
                              </>
                            )}

                            {deal.status === 'BUYER_DELIVERY_UPLOADED' && (
                              <>
                                <button
                                  onClick={() => handleVerifyFinalDelivery(deal._id, 'APPROVED')}
                                  disabled={actionLoadingId === deal._id}
                                  className="px-4 py-2 bg-emerald-500 text-slate-950 font-black rounded-lg text-xs hover:bg-emerald-600"
                                >
                                  Approve Delivery (Release Escrow)
                                </button>
                                <button
                                  onClick={() => handleVerifyFinalDelivery(deal._id, 'REJECTED')}
                                  disabled={actionLoadingId === deal._id}
                                  className="px-4 py-2 bg-red-500 text-white font-black rounded-lg text-xs hover:bg-red-600"
                                >
                                  Reject (Refund Buyer)
                                </button>
                              </>
                            )}

                            {deal.status !== 'COMPLETED' && (

                            <button
                              onClick={() => handleUnverifyDeal(deal._id, deal.crop)}
                              disabled={actionLoadingId === deal._id}
                              className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-300 hover:text-red-200 border border-red-500/30 rounded-xl text-xs font-bold transition disabled:opacity-50 flex items-center gap-1.5"
                            >
                              <span>✕</span>
                              <span>{actionLoadingId === deal._id ? 'Updating…' : 'Unverified'}</span>
                            </button>
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
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-800 flex items-start justify-between gap-4 bg-slate-950/60 shrink-0">
                <div className="flex items-center gap-4">
                  {selectedKycApp.profilePhoto ? (
                    <img
                      src={selectedKycApp.profilePhoto}
                      alt={selectedKycApp.applicantName}
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-700"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-red-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 font-extrabold text-xl">
                      {selectedKycApp.applicantName?.charAt(0)?.toUpperCase() || 'B'}
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-xl font-black text-white">{selectedKycApp.applicantName}</h2>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                        {selectedKycApp.buyerType}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        selectedKycApp.verificationStatus === 'APPROVED' || selectedKycApp.verificationStatus === 'PUBLISHED' ? 'bg-emerald-500/20 text-emerald-300' :
                        selectedKycApp.verificationStatus === 'REJECTED' ? 'bg-red-500/20 text-red-300' :
                        'bg-amber-500/20 text-amber-300'
                      }`}>
                        Status: {selectedKycApp.verificationStatus}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      📞 {selectedKycApp.phone} &nbsp;•&nbsp; ✉️ {selectedKycApp.email} &nbsp;•&nbsp; 🏢 {selectedKycApp.business?.name}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => { setSelectedKycApp(null); setRelatedRequest(null); }}
                  className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-sm font-bold transition"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body - 9 Stages Grid */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
                {selectedKycApp.fallbackNote && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
                    ℹ️ {selectedKycApp.fallbackNote}
                  </div>
                )}

                {/* Grid of Stages 1 through 6 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Stage 1: Personal Details */}
                  <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-2">
                    <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span>👤 Stage 1: Applicant Information</span>
                    </h4>
                    <div className="space-y-1 text-slate-300">
                      <div><strong className="text-slate-400">Full Name:</strong> {selectedKycApp.applicantName}</div>
                      <div><strong className="text-slate-400">Mobile Number:</strong> {selectedKycApp.phone}</div>
                      <div><strong className="text-slate-400">Email Address:</strong> {selectedKycApp.email}</div>
                    </div>
                  </div>

                  {/* Stage 2 & 3: Business & Buyer Type */}
                  <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-2">
                    <h4 className="text-sm font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span>🏢 Stage 2 & 3: Business Profile</span>
                    </h4>
                    <div className="space-y-1 text-slate-300">
                      <div><strong className="text-slate-400">Buyer Type:</strong> {selectedKycApp.buyerType} {selectedKycApp.otherBuyerType && `(${selectedKycApp.otherBuyerType})`}</div>
                      <div><strong className="text-slate-400">Business / Shop Name:</strong> {selectedKycApp.business?.name || 'N/A'}</div>
                      <div><strong className="text-slate-400">Entity Type:</strong> {selectedKycApp.business?.businessType || 'N/A'}</div>
                      <div>
                        <strong className="text-slate-400">GST Number:</strong> {selectedKycApp.business?.gstNumber || 'Not provided'}
                        {selectedKycApp.gstVerification && selectedKycApp.gstVerification.status !== 'NOT_PROVIDED' && (
                          <span className={`ml-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            selectedKycApp.gstVerification.status === 'VERIFIED' 
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                              : 'bg-red-500/20 text-red-300 border border-red-500/40'
                          }`}>
                            {selectedKycApp.gstVerification.status === 'VERIFIED' ? '✅ VERIFIED' : '❌ FAILED'}
                          </span>
                        )}
                        {selectedKycApp.gstVerification?.message && (
                          <div className="text-[10px] text-slate-500 mt-0.5 italic">
                            API: {selectedKycApp.gstVerification.message}
                          </div>
                        )}
                      </div>
                      <div><strong className="text-slate-400">Year Established:</strong> {selectedKycApp.business?.yearEstablished || 'N/A'}</div>
                      <div><strong className="text-slate-400">Business Address:</strong> {selectedKycApp.business?.address || 'N/A'}</div>
                    </div>
                  </div>

                  {/* Stage 4: Location */}
                  <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-2">
                    <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span>📍 Stage 4: Operating Location</span>
                    </h4>
                    <div className="space-y-1 text-slate-300">
                      <div><strong className="text-slate-400">Village / City:</strong> {selectedKycApp.address?.villageCity || 'N/A'}</div>
                      <div><strong className="text-slate-400">Tehsil / Block:</strong> {selectedKycApp.address?.tehsilBlock || 'N/A'}</div>
                      <div><strong className="text-slate-400">District & State:</strong> {selectedKycApp.address?.district}, {selectedKycApp.address?.state}</div>
                      <div><strong className="text-slate-400">Pincode:</strong> {selectedKycApp.address?.pincode || 'N/A'}</div>
                    </div>
                  </div>

                  {/* Stage 5 & 6: Commodities & Radius */}
                  <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-2">
                    <h4 className="text-sm font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span>🌾 Stage 5 & 6: Products & Trading Radius</span>
                    </h4>
                    <div className="space-y-1 text-slate-300">
                      <div><strong className="text-slate-400">Purchase Radius:</strong> {selectedKycApp.preferredPurchaseRadius ? `${selectedKycApp.preferredPurchaseRadius} km` : 'Regional'}</div>
                      <strong className="text-slate-400 block mt-1">Crops & Commodities:</strong>
                      {selectedKycApp.commodities && selectedKycApp.commodities.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {selectedKycApp.commodities.map((c, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20 text-xs font-bold">
                              {c.name} {c.offerPrice ? `(₹${c.offerPrice}/${c.unit || 'Qtl'})` : ''}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">No specific commodities declared</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stage 7 & 8: Uploaded Verification Documents (Images / PDFs) */}
                <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <span>📑 Stage 7 & 8: Uploaded Documents & Image Proofs</span>
                    </h4>
                    <span className="text-slate-500 text-xs">Click image thumbnail to inspect full resolution</span>
                  </div>

                  {(!selectedKycApp.documents || Object.values(selectedKycApp.documents).filter(Boolean).length === 0) ? (
                    <div className="p-6 text-center text-slate-500 italic border border-dashed border-slate-800 rounded-xl">
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
                          <div key={doc.key} className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2 flex flex-col justify-between">
                            <div>
                              <span className="text-xs font-bold text-slate-400 uppercase block truncate mb-1">
                                {doc.label}
                              </span>
                              {isImage ? (
                                <div
                                  onClick={() => setPreviewImage(fileData)}
                                  className="w-full h-32 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden cursor-pointer hover:border-amber-500 transition relative group"
                                >
                                  <img src={fileData} alt={doc.label} className="w-full h-full object-cover group-hover:scale-105 transition" />
                                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white font-bold text-xs gap-1">
                                    <span>🔍</span> Click to zoom
                                  </div>
                                </div>
                              ) : (
                                <div className="w-full h-32 rounded-lg bg-slate-950 border border-slate-800 flex flex-col items-center justify-center text-slate-400 p-2 text-center">
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
                              className="text-center py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-xs transition block"
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
                <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 text-slate-400 text-xs space-y-1">
                  <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">
                    ⚖️ Stage 9: Declaration & Audit
                  </h4>
                  <div>Submitted On: {selectedKycApp.submittedAt ? new Date(selectedKycApp.submittedAt).toLocaleString('en-IN') : 'N/A'}</div>
                  {selectedKycApp.reviewedAt && <div>Last Reviewed: {new Date(selectedKycApp.reviewedAt).toLocaleString('en-IN')} by {selectedKycApp.reviewedBy || 'Admin'}</div>}
                  {selectedKycApp.adminRemarks && (
                    <div className="text-red-300 pt-1">
                      <strong>Rejection / Information Remarks:</strong> {selectedKycApp.adminRemarks}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer - Direct Actions */}
              <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3 shrink-0">
                <button
                  onClick={() => { setSelectedKycApp(null); setRelatedRequest(null); }}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition"
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
                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white font-bold rounded-xl text-xs border border-red-500/40 transition"
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
                          className="px-4 py-2 bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white font-bold rounded-xl text-xs border border-red-500/30 transition"
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
                className="absolute top-3 right-3 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold"
              >
                ✕ Close
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
