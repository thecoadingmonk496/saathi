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
  const [searchQuery, setSearchQuery] = useState('');
  const [requestFilter, setRequestFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
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

      // 2. Fetch Buyer Requests (Procurement Publications)
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
    } catch (err) {
      setError('Unable to communicate with the backend. Please ensure the server is active.');
    } finally {
      setLoading(false);
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
    if (reason === null) return; // cancelled

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
        setSuccessMsg(`✓ Approved buyer profile for "${applicantName}".`);
        setBuyerApplications((prev) =>
          prev.map((a) => (a._id === appId ? { ...a, verificationStatus: 'APPROVED', verified: true } : a))
        );
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

  // Counts
  const pendingRequestsCount = buyerRequests.filter((r) => r.status === 'PENDING_REVIEW').length;
  const pendingAppsCount = buyerApplications.filter((a) => a.verificationStatus === 'PENDING' || a.verificationStatus === 'UNDER_REVIEW').length;

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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-900/70 border border-slate-800/80 p-5 rounded-2xl">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Publications Pending Verification</div>
            <div className="text-3xl font-black text-amber-400">{pendingRequestsCount}</div>
            <div className="text-xs text-slate-400 mt-1">Requires Admin Accept or Reject</div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800/80 p-5 rounded-2xl">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Buyer KYC Applications</div>
            <div className="text-3xl font-black text-blue-400">{pendingAppsCount} Pending</div>
            <div className="text-xs text-slate-400 mt-1">{buyerApplications.length} total applications</div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800/80 p-5 rounded-2xl">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Users</div>
            <div className="text-3xl font-black text-emerald-400">{users.length}</div>
            <div className="text-xs text-slate-400 mt-1">Direct read & manage access</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-6">
          <button
            onClick={() => setActiveTab('buyer-requests')}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
              activeTab === 'buyer-requests'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <span>🌾 Buyer Publications (Requests)</span>
            {pendingRequestsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-black bg-amber-500 text-slate-950">
                {pendingRequestsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('buyer-applications')}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
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
            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
              activeTab === 'users'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
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
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider ${
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
                              <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Delivery Location: </span>
                              <span className="font-semibold text-white">{req.location || 'Not specified'}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Buyer Name: </span>
                              <span className="font-semibold text-white">
                                {req.buyerId?.firstName} {req.buyerId?.lastName} ({req.buyerId?.phone || 'No phone'})
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Estimated Value: </span>
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

                          <div className="text-[11px] text-slate-500">
                            Submitted: {new Date(req.createdAt).toLocaleString('en-IN')}
                            {req.reviewedAt && ` • Reviewed: ${new Date(req.reviewedAt).toLocaleString('en-IN')}`}
                          </div>
                        </div>

                        {/* Admin Actions */}
                        <div className="flex items-center gap-2 shrink-0 border-t lg:border-t-0 lg:border-l border-slate-800/80 pt-3 lg:pt-0 lg:pl-4">
                          {isPending ? (
                            <>
                              <button
                                onClick={() => handleApproveRequest(req._id, req.crop)}
                                disabled={actionLoadingId === req._id}
                                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs transition shadow flex items-center gap-1.5 disabled:opacity-50"
                              >
                                <span>✓</span>
                                <span>Accept & Publish</span>
                              </button>

                              <button
                                onClick={() => handleRejectRequest(req._id, req.crop)}
                                disabled={actionLoadingId === req._id}
                                className="px-4 py-2 bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white font-bold rounded-xl text-xs border border-red-500/40 hover:border-transparent transition flex items-center gap-1.5 disabled:opacity-50"
                              >
                                <span>✕</span>
                                <span>Reject</span>
                              </button>
                            </>
                          ) : isPublished ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-emerald-400">✓ Live on Farmer UI</span>
                              <button
                                onClick={() => handleRejectRequest(req._id, req.crop)}
                                disabled={actionLoadingId === req._id}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-red-900/40 text-slate-300 hover:text-red-300 rounded-lg text-xs font-medium border border-slate-700 transition"
                              >
                                Revoke / Reject
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-red-400">✕ Rejected (Buyer can reapply)</span>
                              <button
                                onClick={() => handleApproveRequest(req._id, req.crop)}
                                disabled={actionLoadingId === req._id}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-emerald-900/40 text-slate-300 hover:text-emerald-300 rounded-lg text-xs font-medium border border-slate-700 transition"
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
                        <div className="flex items-center gap-3">
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

                      <div className="flex items-center gap-2">
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
                          <div className="text-[11px] font-mono text-slate-500 mt-0.5 select-all">
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
      </main>
    </div>
  );
}
