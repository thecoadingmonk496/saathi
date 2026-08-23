import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocationContext } from '../context/LocationContext';
import { locationStates, getDistricts } from '../utils/locationOptions';

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5001' : '')
).replace(/\/$/, '');

const apiUrl = (path) => `${API_BASE_URL}${path}`;

const BUYER_TYPES = [
  'Wholesaler',
  'Retailer',
  'Trader',
  'Processor / Manufacturer',
  'FPO / Farmer Producer Organization',
  'Collection Center',
  'Distributor',
  'Other',
];

const BUSINESS_TYPES = ['Individual', 'Proprietorship', 'Partnership', 'Company', 'FPO', 'Other'];

const COMMODITY_CATEGORIES = [
  {
    category: 'Grains',
    items: ['Wheat', 'Rice', 'Maize', 'Bajra', 'Barley'],
  },
  {
    category: 'Pulses',
    items: ['Gram', 'Lentil', 'Arhar', 'Moong', 'Urad'],
  },
  {
    category: 'Vegetables',
    items: ['Potato', 'Onion', 'Tomato', 'Cauliflower', 'Cabbage', 'Brinjal', 'Peas'],
  },
  {
    category: 'Fruits',
    items: ['Mango', 'Banana', 'Apple', 'Orange', 'Guava'],
  },
  {
    category: 'Spices',
    items: ['Chilli', 'Turmeric', 'Coriander'],
  },
];

const UNITS = ['quintal', 'ton', 'kg'];
const FREQUENCIES = ['daily', 'weekly', 'monthly', 'seasonal', 'as_required'];
const RADII = ['within_10_km', 'within_25_km', 'within_50_km', 'any_location'];

const DOCUMENT_FIELDS = [
  { key: 'identityProof', label: 'Identity Proof', required: true },
  { key: 'businessProof', label: 'Business Proof', required: true },
  { key: 'addressProof', label: 'Address Proof', required: true },
  { key: 'gstCertificate', label: 'GST Certificate', required: false },
  { key: 'udyamRegistration', label: 'Udyam Registration', required: false },
  { key: 'fssaiLicense', label: 'FSSAI License', required: false },
  { key: 'otherDocument', label: 'Other Document', required: false },
];

const STEPS = [
  'Applicant',
  'Buyer Type',
  'Business',
  'Location',
  'Products',
  'Requirements',
  'Offers',
  'Documents',
  'Declaration',
];

const initialForm = {
  applicantName: '',
  phone: '',
  email: '',
  profilePhoto: '',
  buyerType: '',
  otherBuyerType: '',
  businessName: '',
  businessType: '',
  yearEstablished: '',
  businessAddress: '',
  state: '',
  district: '',
  tehsilBlock: '',
  villageCity: '',
  pincode: '',
  preferredPurchaseRadius: 'within_25_km',
  declaration: false,
};

export default function BuyerRegister() {
  const navigate = useNavigate();
  const { coordinates, address, requestLocation } = useLocationContext();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [selectedCommodities, setSelectedCommodities] = useState([]);
  const [otherCommodity, setOtherCommodity] = useState('');
  const [documents, setDocuments] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleStateChange = (e) => {
    setForm((prev) => ({ ...prev, state: e.target.value, district: '' }));
  };

  const toggleCommodity = (name) => {
    setSelectedCommodities((prev) => {
      if (prev.includes(name)) {
        return prev.filter((c) => c !== name);
      }
      return [...prev, name];
    });
  };

  const handleDocumentUpload = (key, file) => {
    if (!file) return;
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setErrors((prev) => ({ ...prev, [key]: 'Only PDF, JPG, JPEG, PNG files are allowed' }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, [key]: 'File size must be less than 5MB' }));
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
      setErrors((prev) => ({ ...prev, [key]: '' }));
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

  const handleUseDetectedLocation = () => {
    requestLocation();
    if (address?.state) {
      setForm((prev) => ({
        ...prev,
        state: address.state,
        district: address.district || prev.district,
        villageCity: address.locality || address.city || prev.villageCity,
      }));
    }
  };

  const validateStep = () => {
    const newErrors = {};
    if (step === 0) {
      if (!form.applicantName.trim()) newErrors.applicantName = 'Full name is required';
      if (!/^[6-9]\d{9}$/.test(form.phone)) newErrors.phone = 'Enter a valid 10-digit Indian mobile number';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = 'Enter a valid email address';
    }
    if (step === 1) {
      if (!form.buyerType) newErrors.buyerType = 'Please select a buyer type';
      if (form.buyerType === 'Other' && !form.otherBuyerType.trim()) newErrors.otherBuyerType = 'Please specify your buyer type';
    }
    if (step === 2) {
      if (!form.businessName.trim()) newErrors.businessName = 'Business name is required';
      if (!form.businessType) newErrors.businessType = 'Please select a business type';
      if (form.yearEstablished) {
        const year = Number(form.yearEstablished);
        const currentYear = new Date().getFullYear();
        if (!Number.isInteger(year) || year < 1900 || year > currentYear) newErrors.yearEstablished = 'Enter a valid year';
      }
      if (!form.businessAddress.trim()) newErrors.businessAddress = 'Business address is required';
    }
    if (step === 3) {
      if (!form.state) newErrors.state = 'State is required';
      if (!form.district) newErrors.district = 'District is required';
      if (!form.tehsilBlock.trim()) newErrors.tehsilBlock = 'Tehsil / Block is required';
      if (!form.villageCity.trim()) newErrors.villageCity = 'Village / Town / City is required';
      if (!/^\d{6}$/.test(form.pincode)) newErrors.pincode = 'Enter a valid 6-digit pincode';
    }
    if (step === 4) {
      if (selectedCommodities.length === 0 && !otherCommodity.trim()) {
        newErrors.commodities = 'Please select at least one crop / commodity';
      }
    }
    if (step === 7) {
      DOCUMENT_FIELDS.forEach((field) => {
        if (field.required && !documents[field.key]) {
          newErrors[field.key] = `${field.label} is required`;
        }
      });
    }
    if (step === 8) {
      if (!form.declaration) newErrors.declaration = 'You must agree to the declaration';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 0));
  };

  const buildCommoditiesPayload = () => {
    const allCommodities = [...selectedCommodities];
    if (otherCommodity.trim()) allCommodities.push(otherCommodity.trim());
    return allCommodities.map((name) => ({
      name,
      minimumQuantity: null,
      maximumQuantity: null,
      unit: 'quintal',
      purchaseFrequency: 'as_required',
      offerPrice: null,
      offerUnit: 'quintal',
      offerQuantity: null,
    }));
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setIsSubmitting(true);
    setSubmitError('');

    const locationCoords = coordinates
      ? { type: 'Point', coordinates: [coordinates.longitude, coordinates.latitude] }
      : { type: 'Point', coordinates: [] };

    const payload = {
      applicantName: form.applicantName,
      phone: form.phone,
      email: form.email,
      profilePhoto: form.profilePhoto,
      buyerType: form.buyerType,
      otherBuyerType: form.buyerType === 'Other' ? form.otherBuyerType : '',
      businessName: form.businessName,
      businessType: form.businessType,
      yearEstablished: form.yearEstablished ? Number(form.yearEstablished) : null,
      businessAddress: form.businessAddress,
      state: form.state,
      district: form.district,
      tehsilBlock: form.tehsilBlock,
      villageCity: form.villageCity,
      pincode: form.pincode,
      location: locationCoords,
      commodities: buildCommoditiesPayload(),
      preferredPurchaseRadius: form.preferredPurchaseRadius,
      documents: Object.fromEntries(
        Object.entries(documents).map(([key, value]) => [key, value.dataUrl])
      ),
      declaration: form.declaration,
    };

    try {
      const response = await fetch(apiUrl('/api/buyers/apply'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSubmitSuccess({
          applicationId: data.applicationId,
          message: data.message,
        });
      } else {
        setSubmitError(data.message || 'Unable to submit application');
      }
    } catch (err) {
      setSubmitError('Unable to connect to the server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-[#064E3B] flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-8 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center text-3xl">✅</div>
          <h1 className="mt-4 text-2xl font-extrabold text-slate-900">Application Submitted!</h1>
          <p className="mt-3 text-sm text-slate-600 leading-relaxed">{submitSuccess.message}</p>
          <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4 text-left">
            <p className="text-xs font-bold uppercase text-slate-500">Application ID</p>
            <p className="mt-1 text-sm font-mono font-bold text-slate-800">{submitSuccess.applicationId}</p>
            <p className="mt-2 text-xs text-slate-500">Status: <span className="font-bold text-amber-600">PENDING</span></p>
          </div>
          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={() => navigate('/buyer-status')}
              className="w-full py-3 rounded-xl bg-[#2E7D32] text-white font-bold hover:bg-[#256428] transition"
            >
              Check Application Status
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full py-3 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#064E3B] pb-12">
      <div className="mx-auto max-w-4xl px-4 pt-8 sm:px-6">
        <header className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-xs font-bold text-emerald-100">
            🛡️ SAATHI Verified Buyer Program
          </div>
          <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold text-white">Register as Buyer</h1>
          <p className="mt-2 text-sm text-emerald-100/80 max-w-xl mx-auto">
            Join Saathi as a verified buyer and connect with farmers.
          </p>
        </header>

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Step indicator */}
          <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between gap-1 overflow-x-auto">
              {STEPS.map((label, index) => (
                <div key={label} className="flex items-center gap-1 shrink-0">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === step
                        ? 'bg-[#2E7D32] text-white'
                        : index < step
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {index < step ? '✓' : index + 1}
                  </div>
                  <span className={`text-[10px] font-semibold hidden sm:block ${index === step ? 'text-[#2E7D32]' : 'text-slate-500'}`}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {submitError && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
                ⚠️ {submitError}
              </div>
            )}

            {/* Step 0: Applicant Information */}
            {step === 0 && (
              <div className="space-y-5">
                <SectionTitle title="Applicant Information" subtitle="Your personal details" />
                <FormField
                  label="Full Name *"
                  name="applicantName"
                  value={form.applicantName}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  error={errors.applicantName}
                />
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField
                    label="Mobile Number *"
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="10-digit mobile number"
                    error={errors.phone}
                    maxLength={10}
                  />
                  <FormField
                    label="Email Address *"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    error={errors.email}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Profile Photo <span className="text-slate-400">(Optional)</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => setForm((prev) => ({ ...prev, profilePhoto: reader.result }));
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-emerald-50 file:text-emerald-700 file:font-semibold hover:file:bg-emerald-100"
                  />
                </div>
              </div>
            )}

            {/* Step 1: Buyer Type */}
            {step === 1 && (
              <div className="space-y-5">
                <SectionTitle title="Buyer / Business Type" subtitle="Select the type of buyer you are" />
                <div className="grid gap-3 sm:grid-cols-2">
                  {BUYER_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, buyerType: type }))}
                      className={`p-4 rounded-xl border-2 text-left transition ${
                        form.buyerType === type
                          ? 'border-[#2E7D32] bg-emerald-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-sm font-bold text-slate-800">{type}</span>
                    </button>
                  ))}
                </div>
                {form.buyerType === 'Other' && (
                  <FormField
                    label="Please specify buyer type *"
                    name="otherBuyerType"
                    value={form.otherBuyerType}
                    onChange={handleChange}
                    placeholder="Enter your buyer type"
                    error={errors.otherBuyerType}
                  />
                )}
                {errors.buyerType && <ErrorText message={errors.buyerType} />}
              </div>
            )}

            {/* Step 2: Business Information */}
            {step === 2 && (
              <div className="space-y-5">
                <SectionTitle title="Business Information" subtitle="Details about your business" />
                <FormField
                  label="Business / Shop Name *"
                  name="businessName"
                  value={form.businessName}
                  onChange={handleChange}
                  placeholder="Enter business name"
                  error={errors.businessName}
                />
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Business Type *</label>
                    <select
                      name="businessType"
                      value={form.businessType}
                      onChange={handleChange}
                      className="w-full h-11 rounded-lg border border-slate-300 px-3 text-sm text-slate-900 focus:border-[#2E7D32] focus:ring-2 focus:ring-emerald-100 outline-none"
                    >
                      <option value="">Select business type</option>
                      {BUSINESS_TYPES.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                    {errors.businessType && <ErrorText message={errors.businessType} />}
                  </div>
                  <FormField
                    label="Year Established (Optional)"
                    name="yearEstablished"
                    type="number"
                    value={form.yearEstablished}
                    onChange={handleChange}
                    placeholder="e.g. 2015"
                    error={errors.yearEstablished}
                  />
                </div>
                <FormField
                  label="Business Address *"
                  name="businessAddress"
                  value={form.businessAddress}
                  onChange={handleChange}
                  placeholder="Enter complete business address"
                  error={errors.businessAddress}
                />
              </div>
            )}

            {/* Step 3: Business Location */}
            {step === 3 && (
              <div className="space-y-5">
                <SectionTitle title="Business Location" subtitle="Where is your business located?" />
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <p className="text-sm text-emerald-800 font-semibold">
                    📍 {coordinates ? `Location detected: ${coordinates.latitude.toFixed(4)}, ${coordinates.longitude.toFixed(4)}` : 'No location detected yet'}
                  </p>
                  <button
                    type="button"
                    onClick={handleUseDetectedLocation}
                    className="mt-2 text-xs font-bold text-[#2E7D32] hover:underline"
                  >
                    Use my detected location
                  </button>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">State *</label>
                    <select
                      name="state"
                      value={form.state}
                      onChange={handleStateChange}
                      className="w-full h-11 rounded-lg border border-slate-300 px-3 text-sm text-slate-900 focus:border-[#2E7D32] focus:ring-2 focus:ring-emerald-100 outline-none"
                    >
                      <option value="">Select state</option>
                      {locationStates.map((state) => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                    {errors.state && <ErrorText message={errors.state} />}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">District *</label>
                    <select
                      name="district"
                      value={form.district}
                      onChange={handleChange}
                      disabled={!form.state}
                      className="w-full h-11 rounded-lg border border-slate-300 px-3 text-sm text-slate-900 disabled:bg-slate-50 focus:border-[#2E7D32] focus:ring-2 focus:ring-emerald-100 outline-none"
                    >
                      <option value="">Select district</option>
                      {getDistricts(form.state).map((district) => (
                        <option key={district} value={district}>{district}</option>
                      ))}
                    </select>
                    {errors.district && <ErrorText message={errors.district} />}
                  </div>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField
                    label="Tehsil / Block *"
                    name="tehsilBlock"
                    value={form.tehsilBlock}
                    onChange={handleChange}
                    placeholder="Enter tehsil / block"
                    error={errors.tehsilBlock}
                  />
                  <FormField
                    label="Village / Town / City *"
                    name="villageCity"
                    value={form.villageCity}
                    onChange={handleChange}
                    placeholder="Enter village / town / city"
                    error={errors.villageCity}
                  />
                </div>
                <FormField
                  label="Pincode *"
                  name="pincode"
                  value={form.pincode}
                  onChange={handleChange}
                  placeholder="6-digit pincode"
                  error={errors.pincode}
                  maxLength={6}
                />
              </div>
            )}

            {/* Step 4: Agricultural Products */}
            {step === 4 && (
              <div className="space-y-5">
                <SectionTitle title="Agricultural Products Purchased" subtitle="Select the crops / commodities you purchase" />
                {COMMODITY_CATEGORIES.map((cat) => (
                  <div key={cat.category}>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">{cat.category}</p>
                    <div className="flex flex-wrap gap-2">
                      {cat.items.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => toggleCommodity(item)}
                          className={`px-4 py-2 rounded-full text-sm font-semibold border-2 transition ${
                            selectedCommodities.includes(item)
                              ? 'bg-[#2E7D32] text-white border-[#2E7D32]'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Other Commodity</label>
                  <input
                    type="text"
                    value={otherCommodity}
                    onChange={(e) => setOtherCommodity(e.target.value)}
                    placeholder="Specify another commodity"
                    className="w-full h-11 rounded-lg border border-slate-300 px-3 text-sm text-slate-900 focus:border-[#2E7D32] focus:ring-2 focus:ring-emerald-100 outline-none"
                  />
                </div>
                {errors.commodities && <ErrorText message={errors.commodities} />}
              </div>
            )}

            {/* Step 5: Purchase Requirements */}
            {step === 5 && (
              <div className="space-y-5">
                <SectionTitle title="Purchase Requirements" subtitle="How much and how often do you purchase?" />
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Preferred Purchase Radius *</label>
                  <select
                    name="preferredPurchaseRadius"
                    value={form.preferredPurchaseRadius}
                    onChange={handleChange}
                    className="w-full h-11 rounded-lg border border-slate-300 px-3 text-sm text-slate-900 focus:border-[#2E7D32] focus:ring-2 focus:ring-emerald-100 outline-none"
                  >
                    <option value="within_10_km">Within 10 km</option>
                    <option value="within_25_km">Within 25 km</option>
                    <option value="within_50_km">Within 50 km</option>
                    <option value="any_location">Any location</option>
                  </select>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-slate-700">
                    Selected commodities: {selectedCommodities.length > 0 ? selectedCommodities.join(', ') : (otherCommodity || 'None')}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    You can specify detailed quantity and frequency for each commodity after submission, or continue with default settings.
                  </p>
                </div>
              </div>
            )}

            {/* Step 6: Current Buying Offers */}
            {step === 6 && (
              <div className="space-y-5">
                <SectionTitle title="Current Buying Offers" subtitle="Optional - provide current buying offers" />
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-sm text-amber-800 font-semibold">
                    💡 You can add current buying offers for each commodity. This helps farmers see your offer prices.
                  </p>
                  <p className="mt-1 text-xs text-amber-700">
                    Offers are optional and can be updated later. Prices will be timestamped.
                  </p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-slate-700">
                    Selected commodities: {selectedCommodities.length > 0 ? selectedCommodities.join(', ') : (otherCommodity || 'None')}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    You can add specific offer prices for each commodity after your application is approved.
                  </p>
                </div>
              </div>
            )}

            {/* Step 7: Verification Documents */}
            {step === 7 && (
              <div className="space-y-5">
                <SectionTitle title="Verification Documents" subtitle="Upload required documents for verification" />
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-sm text-blue-800 font-semibold">
                    🔒 Documents are private and only accessible to authorized SAATHI administrators.
                  </p>
                  <p className="mt-1 text-xs text-blue-700">
                    Allowed: PDF, JPG, JPEG, PNG (max 5MB)
                  </p>
                </div>
                {DOCUMENT_FIELDS.map((field) => (
                  <div key={field.key} className="border border-slate-200 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          {field.label} {field.required && <span className="text-red-500">*</span>}
                        </p>
                        {documents[field.key] && (
                          <p className="mt-1 text-xs text-slate-500">
                            📄 {documents[field.key].name} ({(documents[field.key].size / 1024).toFixed(1)} KB)
                          </p>
                        )}
                      </div>
                      {documents[field.key] ? (
                        <button
                          type="button"
                          onClick={() => removeDocument(field.key)}
                          className="text-xs font-bold text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      ) : (
                        <label className="cursor-pointer">
                          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2E7D32] text-white text-xs font-bold hover:bg-[#256428] transition">
                            📤 Upload Document
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
                    {errors[field.key] && <ErrorText message={errors[field.key]} />}
                  </div>
                ))}
              </div>
            )}

            {/* Step 8: Declaration */}
            {step === 8 && (
              <div className="space-y-5">
                <SectionTitle title="Declaration" subtitle="Please review and confirm" />
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                  <p className="text-sm text-slate-700 leading-relaxed">
                    I confirm that the information and documents provided by me are accurate and belong to my business.
                    I understand that Saathi may verify the submitted information before approving my buyer profile.
                  </p>
                </div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="declaration"
                    checked={form.declaration}
                    onChange={handleChange}
                    className="mt-1 w-5 h-5 rounded border-slate-300 text-[#2E7D32] focus:ring-[#2E7D32]"
                  />
                  <span className="text-sm font-semibold text-slate-700">I agree</span>
                </label>
                {errors.declaration && <ErrorText message={errors.declaration} />}
              </div>
            )}

            {/* Navigation buttons */}
            <div className="mt-8 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={handleBack}
                disabled={step === 0}
                className="px-6 py-3 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Back
              </button>
              {step < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-8 py-3 rounded-xl bg-[#2E7D32] text-white font-bold text-sm hover:bg-[#256428] transition"
                >
                  Continue →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-8 py-3 rounded-xl bg-[#2E7D32] text-white font-bold text-sm hover:bg-[#256428] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Application'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ title, subtitle }) {
  return (
    <div>
      <h2 className="text-xl font-extrabold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}

function FormField({ label, name, type = 'text', value, onChange, placeholder, error, maxLength }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        maxLength={maxLength}
        className={`w-full h-11 rounded-lg border px-3 text-sm text-slate-900 outline-none transition focus:ring-2 ${
          error
            ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
            : 'border-slate-300 focus:border-[#2E7D32] focus:ring-emerald-100'
        }`}
      />
      {error && <ErrorText message={error} />}
    </div>
  );
}

function ErrorText({ message }) {
  return <p className="mt-1 text-xs font-semibold text-red-600">⚠️ {message}</p>;
}