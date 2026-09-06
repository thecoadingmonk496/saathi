import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5001' : '')
).replace(/\/$/, '');

const apiUrl = (path) => `${API_BASE_URL}${path}`;

const DOCUMENT_FIELDS = [
  { key: 'identityProof', label: 'Identity Proof', required: true },
  { key: 'businessProof', label: 'Business Proof', required: true },
  { key: 'addressProof', label: 'Address Proof', required: true },
  { key: 'gstCertificate', label: 'GST Certificate', required: false },
  { key: 'udyamRegistration', label: 'Udyam Registration', required: false },
  { key: 'fssaiLicense', label: 'FSSAI License', required: false },
  { key: 'otherDocument', label: 'Other Document', required: false },
];

export default function BuyerUpdate() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();

  const [phoneInput, setPhoneInput] = useState(searchParams.get('phone') || '');
  const [verifiedPhone, setVerifiedPhone] = useState('');
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [documents, setDocuments] = useState({});
  const [docErrors, setDocErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Load application once phone is verified
  const loadApplication = async (phone) => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await fetch(apiUrl(`/api/buyers/my-application?phone=${phone}`));
      const data = await response.json();
      if (response.ok && data.success) {
        if (data.application._id !== id) {
          setLoadError('This application does not belong to the provided mobile number.');
          return;
        }
        if (!['ACTION_REQUIRED', 'PENDING'].includes(data.application.verificationStatus)) {
          setLoadError('This application cannot be updated in its current status.');
          return;
        }
        setApplication(data.application);
        setVerifiedPhone(phone);
        setBusinessName(data.application.business?.name || '');
        setBusinessAddress(data.application.business?.address || '');
      } else {
        setLoadError(data.message || 'No application found for this mobile number');
      }
    } catch (err) {
      setLoadError('Unable to connect to the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-load when arriving with ?phone= from the status page
  useEffect(() => {
    const initialPhone = searchParams.get('phone');
    if (initialPhone && /^[6-9]\d{9}$/.test(initialPhone)) {
      loadApplication(initialPhone);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVerifyPhone = () => {
    if (!/^[6-9]\d{9}$/.test(phoneInput)) {
      setLoadError('Please enter a valid 10-digit mobile number');
      return;
    }
    loadApplication(phoneInput);
  };

  const handleDocumentUpload = (key, file) => {
    if (!file) return;
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setDocErrors((prev) => ({ ...prev, [key]: 'Only PDF, JPG, JPEG, PNG files are allowed' }));
      return;
    }
    if (file.size > 500 * 1024) {
      setDocErrors((prev) => ({ ...prev, [key]: 'File size must be less than 500KB' }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setDocuments((prev) => ({
        ...prev,
        [key]: {
          name: file.name,
          type: file.type,
          size: file.size,
          dataUrl: reader.result,
        },
      }));
      setDocErrors((prev) => ({ ...prev, [key]: '' }));
    };
    reader.readAsDataURL(file);
  };

  const removeDocument = (key) => {
    setDocuments((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = async () => {
    const newErrors = {};
    DOCUMENT_FIELDS.forEach((field) => {
      if (field.required && !documents[field.key]) {
        newErrors[field.key] = `${field.label} is required`;
      }
    });
    if (!businessName.trim()) newErrors.businessName = 'Business name is required';
    if (!businessAddress.trim()) newErrors.businessAddress = 'Business address is required';
    setDocErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsSubmitting(true);
    setSubmitError('');

    const payload = {
      phone: verifiedPhone,
      businessName: businessName.trim(),
      businessAddress: businessAddress.trim(),
      documents: Object.fromEntries(
        Object.entries(documents).map(([key, value]) => [key, value.dataUrl])
      ),
    };

    try {
      const response = await fetch(apiUrl(`/api/buyers/my-application/${id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSubmitSuccess(true);
      } else {
        setSubmitError(data.message || 'Unable to update application');
      }
    } catch (err) {
      setSubmitError('Unable to connect to the server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Success screen ---
  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-[var(--saathi-primary)] flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-8 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-[var(--saathi-border-light)] flex items-center justify-center text-3xl">✅</div>
          <h1 className="mt-4 text-2xl font-extrabold text-[var(--saathi-text)]">Application Updated!</h1>
          <p className="mt-3 text-sm text-[var(--saathi-text-secondary)] leading-relaxed">
            Your application has been resubmitted and is now under review by our team.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={() => navigate(`/buyer-status`)}
              className="w-full py-3 rounded-xl bg-[var(--saathi-primary)] text-white font-bold hover:bg-[var(--saathi-primary-hover)] transition"
            >
              Check Application Status
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full py-3 rounded-xl border border-[var(--saathi-border)] text-[var(--saathi-text-secondary)] font-bold hover:bg-[var(--saathi-surface-alt)] transition"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Phone verification gate ---
  if (!application) {
    return (
      <div className="min-h-screen bg-[var(--saathi-primary)] pb-12">
        <div className="mx-auto max-w-3xl px-4 pt-8 sm:px-6">
          <header className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-xs font-bold text-emerald-100">
              🛡️ SAATHI Buyer Program
            </div>
            <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold text-white">Update Application</h1>
            <p className="mt-2 text-sm text-emerald-100/80 max-w-xl mx-auto">
              Verify your mobile number to continue updating your application.
            </p>
          </header>

          <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8">
            {loading ? (
              <div className="flex flex-col items-center py-10 gap-3">
                <span className="w-8 h-8 border-4 border-[#2E7D32] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-semibold text-[var(--saathi-text-secondary)]">Loading application...</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-[var(--saathi-text-secondary)] mb-1.5">Mobile Number</label>
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => {
                      setPhoneInput(e.target.value.replace(/\D/g, '').slice(0, 10));
                      setLoadError('');
                    }}
                    placeholder="Enter your registered mobile number"
                    maxLength={10}
                    className="w-full h-12 rounded-xl border border-[var(--saathi-border)] px-4 text-sm text-[var(--saathi-text)] focus:border-[#2E7D32] focus:ring-2 focus:ring-emerald-100 outline-none"
                  />
                  {loadError && <p className="mt-1 text-xs font-semibold text-red-600">⚠️ {loadError}</p>}
                </div>
                <button
                  onClick={handleVerifyPhone}
                  disabled={phoneInput.length !== 10}
                  className="w-full py-3 rounded-xl bg-[var(--saathi-primary)] text-white font-bold hover:bg-[var(--saathi-primary-hover)] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Verify & Continue
                </button>
                <button
                  onClick={() => navigate('/buyer-status')}
                  className="w-full py-3 rounded-xl border border-[var(--saathi-border)] text-[var(--saathi-text-secondary)] font-bold hover:bg-[var(--saathi-surface-alt)] transition"
                >
                  Back to Status Check
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- Update form ---
  return (
    <div className="min-h-screen bg-[var(--saathi-primary)] pb-12">
      <div className="mx-auto max-w-3xl px-4 pt-8 sm:px-6">
        <header className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-xs font-bold text-emerald-100">
            🛡️ SAATHI Buyer Program
          </div>
          <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold text-white">Update Application</h1>
          <p className="mt-2 text-sm text-emerald-100/80 max-w-xl mx-auto">
            Provide the requested information to complete your verification.
          </p>
        </header>

        <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6">
          {/* Admin remarks */}
          {application.adminRemarks && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
              <p className="text-xs font-bold uppercase text-orange-700">Message from Review Team</p>
              <p className="mt-1 text-sm font-semibold text-orange-900">{application.adminRemarks}</p>
            </div>
          )}

          {submitError && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
              ⚠️ {submitError}
            </div>
          )}

          {/* Business info */}
          <div className="space-y-5">
            <h2 className="text-lg font-extrabold text-[var(--saathi-text)]">Business Information</h2>
            <div>
              <label className="block text-sm font-semibold text-[var(--saathi-text-secondary)] mb-1.5">Business / Shop Name *</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Enter business name"
                className={`w-full h-11 rounded-lg border px-3 text-sm text-[var(--saathi-text)] outline-none transition focus:ring-2 ${
                  docErrors.businessName
                    ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                    : 'border-[var(--saathi-border)] focus:border-[#2E7D32] focus:ring-emerald-100'
                }`}
              />
              {docErrors.businessName && <p className="mt-1 text-xs font-semibold text-red-600">⚠️ {docErrors.businessName}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-[var(--saathi-text-secondary)] mb-1.5">Business Address *</label>
              <textarea
                value={businessAddress}
                onChange={(e) => setBusinessAddress(e.target.value)}
                placeholder="Enter complete business address"
                rows={3}
                className={`w-full rounded-lg border px-3 py-2 text-sm text-[var(--saathi-text)] outline-none transition focus:ring-2 ${
                  docErrors.businessAddress
                    ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                    : 'border-[var(--saathi-border)] focus:border-[#2E7D32] focus:ring-emerald-100'
                }`}
              />
              {docErrors.businessAddress && <p className="mt-1 text-xs font-semibold text-red-600">⚠️ {docErrors.businessAddress}</p>}
            </div>
          </div>

          {/* Documents */}
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-extrabold text-gray-900">Document Verification (Max 500KB per file)</h2>
              <p className="mt-1 text-sm text-[var(--saathi-text-muted)]">Re-upload documents as requested. Allowed: PDF, JPG, JPEG, PNG (max 500KB).</p>
            </div>
            {DOCUMENT_FIELDS.map((field) => (
              <div key={field.key} className="border border-[var(--saathi-border-light)] rounded-xl p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[var(--saathi-text)]">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </p>
                    {documents[field.key] && (
                      <p className="mt-1 text-xs text-[var(--saathi-text-muted)] truncate">
                        📄 {documents[field.key].name} ({(documents[field.key].size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                  </div>
                  {documents[field.key] ? (
                    <button
                      type="button"
                      onClick={() => removeDocument(field.key)}
                      className="shrink-0 text-xs font-bold text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  ) : (
                    <label className="shrink-0 cursor-pointer">
                      <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--saathi-primary)] text-white text-xs font-bold hover:bg-[var(--saathi-primary-hover)] transition">
                        📤 Upload
                      </span>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(e) => handleDocumentUpload(field.key, e.target.files?.[0])}
                      />
                    </label>
                  )}
                </div>
                {docErrors[field.key] && <p className="mt-1 text-xs font-semibold text-red-600">⚠️ {docErrors[field.key]}</p>}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 pt-2">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-[var(--saathi-primary)] text-white font-bold hover:bg-[var(--saathi-primary-hover)] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                'Resubmit Application'
              )}
            </button>
            <button
              onClick={() => navigate('/buyer-status')}
              className="w-full py-3 rounded-xl border border-[var(--saathi-border)] text-[var(--saathi-text-secondary)] font-bold hover:bg-[var(--saathi-surface-alt)] transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}