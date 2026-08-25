import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5001' : '')
).replace(/\/$/, '');

const apiUrl = (path) => `${API_BASE_URL}${path}`;

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
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
    fetchUsers(token);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminEmail');
    navigate('/admin/login', { replace: true });
  };

  const fetchUsers = async (token) => {
    const activeToken = token || localStorage.getItem('adminToken');
    if (!activeToken) {
      navigate('/admin/login', { replace: true });
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(apiUrl('/api/admin/users'), {
        headers: {
          'Authorization': `Bearer ${activeToken}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setUsers(data.data || []);
      } else {
        if (response.status === 401 || response.status === 403) {
          handleLogout();
          return;
        }
        setError(data.message || 'Failed to fetch registered users.');
      }
    } catch (err) {
      setError('Unable to communicate with the backend. Please ensure the server is active.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (user) => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      handleLogout();
      return;
    }

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
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setUsers((prev) => prev.filter((u) => u._id !== user._id));
        setSuccessMsg(`User ${user.firstName} ${user.lastName} successfully deleted from MongoDB.`);
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        if (response.status === 401 || response.status === 403) {
          handleLogout();
          return;
        }
        setError(data.message || 'Failed to delete user.');
      }
    } catch (err) {
      setError('Network error while deleting user from database.');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase();
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
    const phone = (user.phone || '').toLowerCase();
    const email = (user.email || '').toLowerCase();
    const id = (user._id || '').toLowerCase();

    return fullName.includes(query) || phone.includes(query) || email.includes(query) || id.includes(query);
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
                Admin Panel
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Status Messages */}
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

        {/* Dashboard Header / Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-900/70 border border-slate-800/80 p-5 rounded-2xl">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Users</div>
            <div className="text-3xl font-black text-white">{users.length}</div>
            <div className="text-xs text-[var(--saathi-text-muted)] mt-1">Stored directly in MongoDB</div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800/80 p-5 rounded-2xl">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Active Database</div>
            <div className="text-sm font-bold text-emerald-400 flex items-center gap-1.5 mt-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block animate-ping" />
              <span>MongoDB Connected</span>
            </div>
            <div className="text-xs text-[var(--saathi-text-muted)] mt-1">Direct read & delete access</div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800/80 p-5 rounded-2xl">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Security Mode</div>
            <div className="text-sm font-bold text-amber-400 mt-2">JWT Admin Protected</div>
            <div className="text-xs text-[var(--saathi-text-muted)] mt-1">Strict restricted access</div>
          </div>
        </div>

        {/* Controls / Search Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--saathi-text-muted)] text-sm">
              🔍
            </span>
            <input
              type="text"
              placeholder="Search by name, phone, email, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm font-medium placeholder:text-[var(--saathi-text-muted)] focus:outline-none focus:border-[var(--saathi-primary)] transition"
            />
          </div>

          <button
            onClick={() => fetchUsers()}
            disabled={loading}
            className="h-11 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold rounded-xl border border-slate-700 transition flex items-center justify-center gap-2"
          >
            <span>🔄 Refresh Data</span>
          </button>
        </div>

        {/* Table Container */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 border-3 border-[var(--saathi-primary)] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fetching from database...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/60 border-b border-slate-800">
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">User Details</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Phone / Mobile</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Email Address</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Registered On</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Delete Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-16 text-center text-[var(--saathi-text-muted)]">
                        <div className="text-4xl mb-2">🧑‍🌾</div>
                        <div className="text-sm font-bold text-slate-400">
                          {searchQuery ? 'No users matching your search' : 'No registered users found in MongoDB'}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user._id} className="hover:bg-slate-800/40 transition">
                        <td className="px-6 py-4">
                          <div className="font-bold text-white text-sm">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-[11px] font-mono text-[var(--saathi-text-muted)] mt-0.5 select-all">
                            ID: {user._id}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--saathi-primary)]/10 text-emerald-400 border border-[var(--saathi-primary)]/20 text-xs font-mono font-bold">
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
                            className="px-3.5 py-1.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 hover:border-transparent rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50 flex items-center gap-1.5 ml-auto"
                          >
                            {deletingId === user._id ? (
                              <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <>
                                <span>🗑️</span>
                                <span>Delete User</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
