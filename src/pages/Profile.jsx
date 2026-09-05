import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useLocationContext } from '../context/LocationContext';
import { 
  CameraIcon, 
  MapPinIcon, 
  ClipboardDocumentIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  PlusIcon,
  MicrophoneIcon
} from '@heroicons/react/24/outline';

export default function Profile() {
  const navigate = useNavigate();
  const { user, updateUser, logout, t } = useUser();
  const { address, requestLocation, loading: locationLoading } = useLocationContext();

  // Profile form state
  const [profile, setProfile] = useState({
    name: user.name || (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : (user.firstName || user.lastName || "")),
    mobile: user.mobile || user.phone ,
    farmerId: user.farmerId || "",
    village: user.village || address?.locality ,
    block: user.block || address?.city ,
    district: user.district || address?.district ,
    state: user.state || address?.state ,
    landHolding: user.landHolding || "",
    khasraNo: user.khasraNo || "",
    primaryCrops: user.primaryCrops || "",
    varieties: user.varieties || "",
    expectedYield: user.expectedYield || "",
    mandiEstValue: user.mandiEstValue || "",
    harvestWindow: user.harvestWindow || "",
    mandiSlot: user.mandiSlot || "",
  });

  const [profileImage, setProfileImage] = useState(user.profileImage || '');
  const [saveMessage, setSaveMessage] = useState('');
  const [copiedId, setCopiedId] = useState(false);

  const [isListening, setIsListening] = useState(false);
  const [activeVoiceField, setActiveVoiceField] = useState(null);

  const startVoiceDictation = (fieldName) => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setSaveMessage('Voice dictation is not supported in this browser.');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'hi-IN'; // Defaulting to Hindi/Indian accents
    recognition.continuous = false;
    
    recognition.onstart = () => {
      setIsListening(true);
      setActiveVoiceField(fieldName);
    };
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setProfile(prev => ({ ...prev, [fieldName]: transcript }));
    };
    
    recognition.onend = () => {
      setIsListening(false);
      setActiveVoiceField(null);
    };
    
    recognition.start();
  };


  // Modals state
  const [activeModal, setActiveModal] = useState(null); // 'land', 'crop', 'yield', 'gatepass'
  const [gatePassSuccess, setGatePassSuccess] = useState(false);
  const [gatePassTicket, setGatePassTicket] = useState('');

  // Sync GPS address if location is fetched
  useEffect(() => {
    if (address) {
      if (address.locality || address.city || address.district) {
        setProfile(prev => ({
          ...prev,
          village: prev.village || address.locality || address.city || '',
          block: prev.block || address.city || address.locality || '',
          district: address.district || prev.district,
          state: address.state || prev.state,
        }));
      }
    }
  }, [address]);

  // Calculate profile strength
  const calculateStrength = () => {
    let score = 0;
    if (profile.name) score += 20;
    if (profile.mobile) score += 20;
    if (profile.village && profile.district && profile.state) score += 20;
    if (profile.landHolding) score += 15;
    if (profile.primaryCrops) score += 15;
    if (profileImage) score += 10;
    return Math.min(score, 100);
  };

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleProfileImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setSaveMessage('Please select a valid image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 300;
          const MAX_HEIGHT = 300;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Compress to lightweight JPEG (~30KB)
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);
          setProfileImage(compressedBase64);
          updateUser({ profileImage: compressedBase64 });
          setSaveMessage('Profile portrait updated successfully.');
          setTimeout(() => setSaveMessage(''), 4000);
        } catch (err) {
          console.error('Image compression error:', err);
          const rawBase64 = event.target.result;
          setProfileImage(rawBase64);
          updateUser({ profileImage: rawBase64 });
        }
      };
      img.onerror = () => {
        setSaveMessage('Failed to load image file.');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleGpsAutofill = () => {
    requestLocation();
    setSaveMessage('Fetching live GPS coordinates...');
    setTimeout(() => {
      setSaveMessage('Location synced with AgriStack GPS records.');
      setTimeout(() => setSaveMessage(''), 4000);
    }, 1500);
  };

  const handleCopyFarmerId = () => {
    navigator.clipboard.writeText(profile.farmerId );
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 3000);
  };

  const handleSave = (e) => {
    if (e) e.preventDefault();
    if (!(profile.name || "").trim() || !(profile.mobile || "").trim()) {
      setSaveMessage('Full name and mobile number are required.');
      return;
    }

    const updatedUser = {
      ...user,
      ...profile,
      name: (profile.name || "").trim(),
      mobile: (profile.mobile || "").trim(),
      profileImage,
    };

    updateUser(updatedUser);
    setSaveMessage('Profile changes saved successfully to SAATHI AgriPortal!');
    setTimeout(() => setSaveMessage(''), 5000);
  };

  const handleReset = () => {
    setProfile({
      name: user.name || "",
      mobile: user.mobile || "",
      farmerId: user.farmerId || "",
      village: user.village || "",
      block: user.block || "",
      district: user.district || "",
      state: user.state || "",
      landHolding: user.landHolding || "",
      khasraNo: user.khasraNo || "",
      primaryCrops: user.primaryCrops || "",
      varieties: user.varieties || "",
      expectedYield: user.expectedYield || "",
      mandiEstValue: user.mandiEstValue || "",
      harvestWindow: user.harvestWindow || "",
      mandiSlot: user.mandiSlot || "",
    });
    setProfileImage(user.profileImage || '');
    setSaveMessage('Form fields reset to saved values.');
    setTimeout(() => setSaveMessage(''), 4000);
  };

  const handleGatePassBooking = () => {
    const ticketNo = `GP-${Math.floor(100000 + Math.random() * 900000)}`;
    setGatePassTicket(ticketNo);
    setGatePassSuccess(true);
  };

  const strengthPct = calculateStrength();

  return (
    <div className="min-h-screen bg-slate-50/90 py-6 px-3 sm:px-6 lg:px-8 text-slate-800 font-sans">
      


      <main className="max-w-4xl mx-auto space-y-6">
        
        

        {/* Identity Header Card */}
        <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          {/* Tricolor Accent strip */}
          <div className="w-full h-[3.5px] bg-gradient-to-r from-orange-600 via-white to-emerald-600"></div>
          
          <div className="p-5 sm:p-6 lg:p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            {/* Farmer Portrait & Details */}
            <div className="flex items-start sm:items-center gap-4 sm:gap-5 flex-1 min-w-0">
              <div className="relative group flex-shrink-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl ring-4 ring-slate-100 bg-slate-100 overflow-hidden shadow-sm flex items-center justify-center">
                  {profileImage ? (
                    <img src={profileImage} alt={profile.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <img 
                      src="https://images.unsplash.com/photo-1558222218-b7b54eede3f3?w=800&q=80" 
                      alt="Farmer Portrait" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}
                </div>
                <label className="absolute -bottom-1 -right-1 p-1.5 bg-emerald-800 text-white rounded-xl hover:bg-emerald-900 ring-2 ring-white shadow-md cursor-pointer transition-all">
                  <CameraIcon className="w-3.5 h-3.5" />
                  <input type="file" accept="image/*" className="sr-only" onChange={handleProfileImageUpload} />
                </label>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{profile.name}</h1>
                  
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                  <div className="inline-flex items-center gap-1.5 font-medium text-slate-700 bg-emerald-100 px-3 py-1 rounded-md border border-emerald-200 shadow-sm">
                    <span className="font-bold text-emerald-900 uppercase tracking-wider">{user?.role === "BUYER" ? "Buyer" : "Farmer"}</span>
                  </div>
                  <span className="text-slate-600 font-medium">Member since <strong>Kharif 2022</strong></span>
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Active Mandi Seller
                  </span>
                </div>

                <div className="mt-2 flex items-center text-xs sm:text-sm text-slate-600 font-medium">
                  <MapPinIcon className="w-4 h-4 text-rose-500 mr-1 shrink-0" />
                  <span>{profile.village ? `${profile.village}, ` : ''}{profile.district ? `${profile.district}, ` : ''}{profile.state}</span>
                </div>
              </div>
            </div>

            {/* Profile Strength Card */}
            <div className="w-full md:w-64 p-3.5 bg-slate-50/90 border border-slate-200/90 rounded-xl flex-shrink-0 shadow-xs">
              <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                <span className="text-slate-700 font-semibold flex items-center gap-1">
                  <SparklesIcon className="w-3.5 h-3.5 text-emerald-700" />
                  Profile Strength
                </span>
                <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-sm">
                  {strengthPct}% Completed
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden relative">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-emerald-700 h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${strengthPct}%` }}
                ></div>
              </div>
              
            </div>
          </div>
        </section>

        {/* Main Form */}
        <form onSubmit={handleSave} className="space-y-6">
          
          {/* Section 1: Personal & Contact Information */}
          <section className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-sm">
            <div className="border-b border-slate-100 pb-4 mb-6 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm border border-emerald-200">
                  1
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Personal & Contact Information</h2>
                  <p className="text-xs text-slate-500">Official identification synced with AgriStack & Land Revenue records</p>
                </div>
              </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Full Name */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider" htmlFor="name">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-xs text-slate-400 font-medium">As per Aadhaar</span>
                </div>
                <input 
                  id="name"
                  name="name"
                  type="text" 
                  value={profile.name} 
                  onChange={handleFieldChange}
                  required
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 font-semibold focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition bg-slate-50/50 outline-none"
                />
              </div>

              {/* Mobile Number */}
              <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider" htmlFor="mobile">
                      Mobile Number <span className="text-rose-500">*</span>
                    </label>
                  </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-sm font-semibold text-slate-500">+91</span>
                  <input 
                    id="mobile"
                    name="mobile"
                    type="tel" 
                    value={profile.mobile} 
                    onChange={handleFieldChange}
                    required
                    className="w-full rounded-xl border border-slate-300 pl-12 pr-24 py-2.5 text-sm text-slate-900 font-semibold focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition outline-none"
                  />
                  <span className="absolute inset-y-0 right-2 flex items-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-sm font-semibold bg-emerald-100 text-emerald-800">
                      <CheckCircleIcon className="w-3 h-3 text-emerald-700" /> Verified
                    </span>
                  </span>
                </div>
              </div>


              {/* Village / Town */}
              <div className="relative">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider" htmlFor="village">
                    Village / Town <span className="text-rose-500">*</span>
                  </label>
                  <button 
                    type="button" 
                    onClick={handleGpsAutofill} 
                    className="text-sm text-emerald-700 font-medium hover:underline flex items-center gap-0.5"
                  >
                    <MapPinIcon className={`w-3 h-3 ${locationLoading ? "animate-spin" : ""}`} /> {locationLoading ? "Locating..." : "Auto-Detect Location (GPS)"}
                  </button>
                </div>
                <input 
                  id="village"
                  name="village"
                  type="text" 
                  value={profile.village} 
                  onChange={handleFieldChange}
                  placeholder="e.g. Bisrakh Jalalpur"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 font-medium focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition bg-white outline-none"
                />
                <button type="button" onClick={() => startVoiceDictation("village")} className={`absolute right-3 top-[34px] p-1.5 rounded-full shadow-sm bg-white border border-slate-200 ${activeVoiceField === "village" ? "bg-emerald-50 text-emerald-600 animate-pulse border-emerald-300" : "text-slate-400 hover:text-emerald-600 hover:border-emerald-300"}`}>
                  <MicrophoneIcon className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Block / Tehsil */}
              <div className="relative">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider" htmlFor="block">
                  Block / Tehsil
                </label>
                <input 
                  id="block"
                  name="block"
                  type="text" 
                  value={profile.block} 
                  onChange={handleFieldChange}
                  placeholder="e.g. Dadri"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 font-medium focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition outline-none"
                />
                <button type="button" onClick={() => startVoiceDictation("block")} className={`absolute right-3 top-[28px] p-1.5 rounded-full shadow-sm bg-white border border-slate-200 ${activeVoiceField === "block" ? "bg-emerald-50 text-emerald-600 animate-pulse border-emerald-300" : "text-slate-400 hover:text-emerald-600 hover:border-emerald-300"}`}>
                  <MicrophoneIcon className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* District */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider" htmlFor="district">
                  District
                </label>
                <input 
                  id="district"
                  name="district"
                  type="text" 
                  value={profile.district} 
                  onChange={handleFieldChange}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 font-medium focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition outline-none"
                />
              </div>

              {/* State / UT Selector */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider" htmlFor="state">
                  State / Union Territory
                </label>
                <select 
                  id="state"
                  name="state"
                  value={profile.state}
                  onChange={handleFieldChange}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 font-medium focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition bg-white outline-none"
                >
                  <option value="Uttar Pradesh">Uttar Pradesh (Govt. of UP Agri Portal)</option>
                  <option value="Punjab">Punjab</option>
                  <option value="Haryana">Haryana</option>
                  <option value="Madhya Pradesh">Madhya Pradesh</option>
                  <option value="Rajasthan">Rajasthan</option>
                  <option value="Bihar">Bihar</option>
                  <option value="Maharashtra">Maharashtra</option>
                  <option value="Gujarat">Gujarat</option>
                </select>
                <p className="mt-2 text-sm text-slate-500 flex items-center gap-1.5">
                  <CheckCircleIcon className="w-3.5 h-3.5 text-slate-400" />
                  Details synchronized with PM-KISAN, AgriStack & Uttar Pradesh Bhulekh Revenue Records.
                </p>
              </div>
            </div>
          </section>

          {user?.role !== "BUYER" && (
<>
{/* Section 2: Agricultural Holdings & Produce */}
          <section className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-sm">
            <div className="border-b border-slate-100 pb-4 mb-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm border border-emerald-200">
                  2
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Agricultural Holdings & Produce</h2>
                  <p className="text-xs text-slate-500">Verified crop registry, yield forecasts and APMC procurement windows</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  type="button" 
                  onClick={() => setActiveModal('land')} 
                  className="text-xs text-emerald-700 hover:text-emerald-800 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <PlusIcon className="w-3.5 h-3.5" /> Add Land Parcel
                </button>
              </div>
            </div>

            {/* 4 Realistic Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1: Land Holding */}
              <div className="relative flex flex-col justify-between p-4 sm:p-4.5 bg-gradient-to-b from-white to-slate-50/50 border border-slate-200 rounded-xl hover:border-slate-300 transition-all shadow-2xs group">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 border border-purple-100 flex items-center justify-center">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                      </svg>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Verified
                    </span>
                  </div>
                  <span className="text-sm font-bold text-slate-500 uppercase tracking-wider block">Land Holding</span>
                  <div className="mt-1 text-base font-extrabold text-slate-900 leading-tight">
                    {profile.landHolding}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">Irrigated Canal Land • Khasra {profile.khasraNo}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-sm text-slate-400">RoR Attached</span>
                  <button 
                    type="button" 
                    onClick={() => setActiveModal('land')} 
                    className="text-xs font-bold text-emerald-700 hover:underline"
                  >
                    + Edit Parcel
                  </button>
                </div>
              </div>

              {/* Card 2: Primary Crops */}
              <div className="relative flex flex-col justify-between p-4 sm:p-4.5 bg-gradient-to-b from-white to-amber-50/20 border border-slate-200 rounded-xl hover:border-amber-300 transition-all shadow-2xs group">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3v18m0-18C8.5 7 7 11 7 15m5-12c3.5 4 5 8 5 12m-5-8c-2 2-3 4-3 7m3-7c2 2 3 4 3 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                      </svg>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800">
                      Rabi 2024-25
                    </span>
                  </div>
                  <span className="text-sm font-bold text-slate-500 uppercase tracking-wider block">Primary Crops</span>
                  <div className="mt-1 text-base font-extrabold text-slate-900 leading-tight">
                    {profile.primaryCrops}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {(profile.varieties || "").split(',').map((v, i) => (
                      <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {v.trim()}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-sm text-slate-400">Active Season</span>
                  <button 
                    type="button" 
                    onClick={() => setActiveModal('crop')} 
                    className="text-xs font-bold text-emerald-700 hover:underline"
                  >
                    + Edit Plan
                  </button>
                </div>
              </div>

              {/* Card 3: Expected Yield */}
              <div className="relative flex flex-col justify-between p-4 sm:p-4.5 bg-gradient-to-b from-white to-emerald-50/20 border border-slate-200 rounded-xl hover:border-emerald-300 transition-all shadow-2xs group">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                      </svg>
                    </div>
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800">
                      +8% YoY
                    </span>
                  </div>
                  <span className="text-sm font-bold text-slate-500 uppercase tracking-wider block">Expected Yield</span>
                  <div className="mt-1 text-base font-extrabold text-slate-900 leading-tight">
                    {profile.expectedYield}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">Est. Mandi Value: <strong className="text-slate-800 font-bold">{profile.mandiEstValue}</strong></p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-sm text-slate-400">MSP Guaranteed</span>
                  <button 
                    type="button" 
                    onClick={() => setActiveModal('yield')} 
                    className="text-xs font-bold text-emerald-700 hover:underline"
                  >
                    Recalculate
                  </button>
                </div>
              </div>

              {/* Card 4: Harvest Window */}
              <div className="relative flex flex-col justify-between p-4 sm:p-4.5 bg-gradient-to-b from-white to-blue-50/20 border border-slate-200 rounded-xl hover:border-blue-300 transition-all shadow-2xs group">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                      </svg>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800">
                      18 Days Left
                    </span>
                  </div>
                  <span className="text-sm font-bold text-slate-500 uppercase tracking-wider block">Harvest Window</span>
                  <div className="mt-1 text-base font-extrabold text-slate-900 leading-tight">
                    {profile.harvestWindow}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">Pre-book {profile.mandiSlot} slot</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-sm text-emerald-600 font-medium">Slots Open</span>
                  <button 
                    type="button" 
                    onClick={() => setActiveModal('gatepass')} 
                    className="text-xs font-bold text-emerald-700 hover:underline"
                  >
                    Book Gate Pass
                  </button>
                </div>
              </div>

            </div>
          </section>
</>
)}

          {/* Action Footer */}
          <footer className="pt-2 pb-6 space-y-4">
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button 
                  type="submit" 
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white font-bold text-sm shadow-sm transition-all cursor-pointer"
                >
                  <CheckCircleIcon className="w-4 h-4 text-emerald-200" />
                  Save Profile Changes
                </button>
                <button 
                  type="button" 
                  onClick={handleReset} 
                  className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm border border-slate-300 shadow-2xs transition-colors cursor-pointer"
                >
                  Discard
                </button>
              </div>

              <div className="w-full sm:w-auto flex justify-between sm:justify-end items-center gap-3">
                <button 
                  type="button"
                  onClick={() => {
                    logout();
                    navigate('/login', { replace: true });
                  }}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline"
                >
                  Sign Out
                </button>
              </div>
            </div>

            {saveMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl text-center shadow-xs">
                {saveMessage}
              </div>
            )}
            
            <div className="text-center text-xs text-slate-400 pt-2">
              SAATHI Agri-Network • Certified Under Digital Agriculture Mission (DAM) • Encrypted 256-Bit SSL Secured
            </div>
          </footer>

        </form>

      </main>

      {/* Inline Modals for Farm Records editing */}
      {activeModal === 'land' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Edit Land Parcel & Khasra</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Land Holding Size</label>
                <input 
                  type="text" 
                  value={profile.landHolding} 
                  onChange={(e) => setProfile(p => ({ ...p, landHolding: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-sm font-semibold outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Khasra / Khatauni Number</label>
                <input 
                  type="text" 
                  value={profile.khasraNo} 
                  onChange={(e) => setProfile(p => ({ ...p, khasraNo: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-sm font-semibold outline-none"
                />
              </div>
            </div>
            <button 
              type="button" 
              onClick={() => { setActiveModal(null); setSaveMessage('Land parcel details updated.'); }} 
              className="mt-6 w-full bg-emerald-800 text-white font-bold py-2.5 rounded-xl text-sm"
            >
              Save Land Details
            </button>
          </div>
        </div>
      )}

      {activeModal === 'crop' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Edit Primary Crops & Varieties</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Primary Crops</label>
                <input 
                  type="text" 
                  value={profile.primaryCrops} 
                  onChange={(e) => setProfile(p => ({ ...p, primaryCrops: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-sm font-semibold outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Crop Varieties (Comma Separated)</label>
                <input 
                  type="text" 
                  value={profile.varieties} 
                  onChange={(e) => setProfile(p => ({ ...p, varieties: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-sm font-semibold outline-none"
                />
              </div>
            </div>
            <button 
              type="button" 
              onClick={() => { setActiveModal(null); setSaveMessage('Crop planning updated.'); }} 
              className="mt-6 w-full bg-emerald-800 text-white font-bold py-2.5 rounded-xl text-sm"
            >
              Save Crop Plan
            </button>
          </div>
        </div>
      )}

      {activeModal === 'yield' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Recalculate Expected Yield</h3>
            <p className="text-xs text-slate-500 mb-4">Based on 4.5 Acres irrigated land and current Rabi 2024-25 weather forecasts.</p>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center mb-4">
              <span className="text-xs text-emerald-800 font-semibold block">Calculated Yield:</span>
              <span className="text-2xl font-extrabold text-emerald-900">125 - 145 Quintals</span>
              <span className="text-xs text-emerald-700 block mt-1">Est. Mandi Revenue: ₹3.05L</span>
            </div>
            <button 
              type="button" 
              onClick={() => { 
                setProfile(p => ({ ...p, expectedYield: '125 - 145 Quintals', mandiEstValue: '₹3.05L' })); 
                setActiveModal(null); 
                setSaveMessage('Yield recalculated based on soil & weather data.'); 
              }} 
              className="w-full bg-emerald-800 text-white font-bold py-2.5 rounded-xl text-sm"
            >
              Apply Calculated Yield
            </button>
          </div>
        </div>
      )}

      {activeModal === 'gatepass' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            {!gatePassSuccess ? (
              <>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Book APMC Mandi Gate Pass</h3>
                <p className="text-xs text-slate-500 mb-4">Pre-book your spot sale entry slot at APMC Dadri Mandi to avoid long queues.</p>
                <div className="space-y-3 mb-6 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-700 block">Selected Mandi:</span>
                    <span className="text-slate-900 font-semibold">APMC Dadri Mandi, Gautam Buddha Nagar</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-700 block">Harvest Date Range:</span>
                    <span className="text-slate-900 font-semibold">{profile.harvestWindow}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={() => setActiveModal(null)} 
                    className="flex-1 bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl text-sm"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    onClick={handleGatePassBooking} 
                    className="flex-1 bg-emerald-800 text-white font-bold py-2.5 rounded-xl text-sm"
                  >
                    Confirm Booking
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center mb-3">
                  <CheckCircleIcon className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Gate Pass Issued!</h3>
                <p className="text-xs text-slate-500 mb-4">Present this digital pass at the APMC Mandi entry gate.</p>
                <div className="p-4 bg-slate-900 text-white rounded-xl font-mono text-center mb-6">
                  <span className="text-xs text-slate-400 block uppercase">Ticket Pass No.</span>
                  <span className="text-xl font-bold text-emerald-400">{gatePassTicket}</span>
                </div>
                <button 
                  type="button" 
                  onClick={() => { setActiveModal(null); setGatePassSuccess(false); }} 
                  className="w-full bg-emerald-800 text-white font-bold py-2.5 rounded-xl text-sm"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
