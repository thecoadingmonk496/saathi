import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5001' : '')
).replace(/\/$/, '');

const apiUrl = (path) => `${API_BASE_URL}${path}`;

const STATUS_MAP = {
  PENDING: {
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: '🟡',
    title: 'Under Review',
    message: 'Your application has been submitted and is awaiting review.',
  },
  UNDER_REVIEW: {
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: '🔵',
    title: 'Under Review',
    message: 'Our team is reviewing your application.',
  },
  ACTION_REQUIRED: {
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: '🟠',
    title: 'Additional Information Required',
    message: 'Please review your application and provide the requested information.',
  },
  APPROVED: {
    color: 'bg-[var(--saathi-border-light)] text-emerald-800 border-[var(--saathi-border)]',
    icon: '🟢',
    title: 'Saathi Verified Buyer',
    message: 'Your buyer profile has been approved.',
  },
  REJECTED: {
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: '🔴',
    title: 'Application Rejected',
    message: 'Your application has been rejected.',
  },
};

export default function BuyerStatus() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checked, setChecked] = useState(false);

  const handleCheckStatus = async () => {
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    setError('');
    setLoading(true);
    setChecked(true);

    try {
      const response = await fetch(apiUrl(`/api/buyers/my-application?phone=${phone}`));
      const data = await response.json();
      if (response.ok && data.success) {
        setApplication(data.application);
      } else {
        setApplication(null);
        setError(data.message || 'No application found for this mobile number');
      }
    } catch (err) {
      setError('Unable to connect to the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const statusInfo = application ? STATUS_MAP[application.verificationStatus] || STATUS_MAP.PENDING : null;

  return (
    <div className="min-h-screen bg-[var(--saathi-primary)] pb-12">
      <div className="mx-auto max-w-3xl px-4 pt-8 sm:px-6">
        <header className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-xs font-bold text-emerald-100">
            🛡️ SAATHI Buyer Program
          </div>
          <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold text-white">Buyer Registration</h1>
          <p className="mt-2 text-sm text-emerald-100/80 max-w-xl mx-auto">
            Check the status of your buyer application.
          </p>
        </header>

        <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8">
          {!application ? (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-[var(--saathi-text-secondary)] mb-1.5">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                    setError('');
                  }}
                  placeholder="Enter your registered mobile number"
                  maxLength={10}
                  className="w-full h-12 rounded-xl border border-[var(--saathi-border)] px-4 text-sm text-[var(--saathi-text)] focus:border-[#2E7D32] focus:ring-2 focus:ring-emerald-100 outline-none"
                />
                {error && <p className="mt-1 text-xs font-semibold text-red-600">⚠️ {error}</p>}
              </div>
              <button
                onClick={handleCheckStatus}
                disabled={loading || phone.length !== 10}
                className="w-full py-3 rounded-xl bg-[var(--saathi-primary)] text-white font-bold hover:bg-[var(--saathi-primary-hover)] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Checking...
                  </>
                ) : (
                  'Check Application Status'
                )}
              </button>
              <button
                onClick={() => navigate('/buyer-register')}
                className="w-full py-3 rounded-xl border border-[var(--saathi-border)] text-[var(--saathi-text-secondary)] font-bold hover:bg-[var(--saathi-surface-alt)] transition"
              >
                New Application? Register as Buyer
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className={`rounded-2xl border p-5 ${statusInfo.color}`}>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{statusInfo.icon}</span>
                  <div>
                    <h2 className="text-lg font-extrabold text-[var(--saathi-text)]">{statusInfo.title}</h2>
                    <p className="mt-1 text-sm text-[var(--saathi-text-secondary)]">{statusInfo.message}</p>
                  </div>
                </div>
              </div>

              <div className="bg-[var(--saathi-surface-alt)] border border-[var(--saathi-border-light)] rounded-xl p-5">
                <p className="text-xs font-bold uppercase text-[var(--saathi-text-muted)]">Submitted</p>
                <p className="mt-1 text-sm font-semibold text-[var(--saathi-text)]">
                  {new Date(application.submittedAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>

              {application.verificationStatus === 'ACTION_REQUIRED' && application.adminRemarks && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
                  <p className="text-xs font-bold uppercase text-orange-700">Admin Message</p>
                  <p className="mt-1 text-sm font-semibold text-orange-900">{application.adminRemarks}</p>
                </div>
              )}

              {application.verificationStatus === 'REJECTED' && application.adminRemarks && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                  <p className="text-xs font-bold uppercase text-red-700">Reason</p>
                  <p className="mt-1 text-sm font-semibold text-red-900">{application.adminRemarks}</p>
                </div>
              )}

              <div className="bg-[var(--saathi-surface-alt)] border border-[var(--saathi-border-light)] rounded-xl p-5">
                <p className="text-xs font-bold uppercase text-[var(--saathi-text-muted)]">Application Details</p>
                <div className="mt-2 space-y-2 text-sm">
                  <p><span className="font-semibold text-[var(--saathi-text-secondary)]">Business:</span> <span className="text-[var(--saathi-text)]">{application.business.name}</span></p>
                  <p><span className="font-semibold text-[var(--saathi-text-secondary)]">Buyer Type:</span> <span className="text-[var(--saathi-text)]">{application.buyerType}</span></p>
                  <p><span className="font-semibold text-[var(--saathi-text-secondary)]">Location:</span> <span className="text-[var(--saathi-text)]">{application.address.villageCity}, {application.address.district}, {application.address.state}</span></p>
                  <p><span className="font-semibold text-[var(--saathi-text-secondary)]">Commodities:</span> <span className="text-[var(--saathi-text)]">{application.commodities.map((c) => c.name).join(', ')}</span></p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {application.verificationStatus === 'ACTION_REQUIRED' && (
                  <button
                    onClick={() => navigate(`/buyer-update/${application._id}?phone=${phone}`)}
                    className="w-full py-3 rounded-xl bg-[var(--saathi-primary)] text-white font-bold hover:bg-[var(--saathi-primary-hover)] transition"
                  >
                    Update Application
                  </button>
                )}
                <button
                  onClick={() => {
                    setApplication(null);
                    setChecked(false);
                    setPhone('');
                  }}
                  className="w-full py-3 rounded-xl border border-[var(--saathi-border)] text-[var(--saathi-text-secondary)] font-bold hover:bg-[var(--saathi-surface-alt)] transition"
                >
                  Check Another Application
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="w-full py-3 rounded-xl border border-[var(--saathi-border)] text-[var(--saathi-text-secondary)] font-bold hover:bg-[var(--saathi-surface-alt)] transition"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
