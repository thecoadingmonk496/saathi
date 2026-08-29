import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useLocationContext } from '../context/LocationContext';
import { CameraIcon } from '@heroicons/react/24/solid';

export default function Profile() {
  const navigate = useNavigate();
  const { user, preferredLanguage, supportedLanguages, setLanguage, updateUser, logout, t } = useUser();
  const { address, permissionStatus, source, requestLocation } = useLocationContext();

  const [profile, setProfile] = useState({
    name: user.name || (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : (user.firstName || user.lastName || '')),
    mobile: user.mobile || user.phone || '',
    farmerId: user.farmerId || '',
    buyerId: user.buyerId || '',
    village: user.village || address?.locality || '',
    block: user.block || address?.locality || '',
    district: user.district || address?.district || '',
    state: user.state || address?.state || '',
    isPublicProfile: user.isPublicProfile !== undefined ? user.isPublicProfile : true,
  });
  const [documents, setDocuments] = useState(user.documents || {
    aadhaar: '',
    gstCertificate: '',
    otherDocument: ''
  });
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [isFarmDetailsModalOpen, setIsFarmDetailsModalOpen] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [profileImage, setProfileImage] = useState(user.profileImage || '');
  const [farmDetails, setFarmDetails] = useState({
    landHolding: user.landHolding || '',
    primaryCrops: user.primaryCrops || '',
    irrigation: user.irrigation || '',
    farmingType: user.farmingType || '',
    annualYield: user.annualYield || '',
    harvestSeason: user.harvestSeason || '',
    soilType: user.soilType || '',
    certifications: user.certifications || '',
  });

  const [businessDetails, setBusinessDetails] = useState({
    businessName: user.businessName || '',
    businessType: user.businessType || '',
    gstNumber: user.gstNumber || '',
    targetCrops: user.targetCrops || '',
  });

  useEffect(() => {
    if (permissionStatus !== 'granted' || source !== 'device' || !address) return;

    const fetchedProfile = {
      village: address.locality || address.city || '',
      block: address.city || address.locality || '',
      district: address.district || '',
      state: address.state || '',
    };

    setProfile((currentProfile) => ({ ...currentProfile, ...fetchedProfile }));
    updateUser(fetchedProfile);
  }, [address, permissionStatus, source, updateUser]);

  const calculateProgress = () => {
    let fields = 0;
    let filled = 0;
    
    const baseFields = ['name', 'mobile', 'village', 'district', 'state'];
    fields += baseFields.length;
    baseFields.forEach(f => { if (profile[f]) filled++; });
    
    if (user.role === 'BUYER') {
      const bFields = ['businessName', 'businessType', 'gstNumber', 'targetCrops'];
      fields += bFields.length;
      bFields.forEach(f => { if (businessDetails[f]) filled++; });
    } else {
      const fFields = ['landHolding', 'primaryCrops', 'irrigation', 'farmingType', 'annualYield', 'harvestSeason', 'soilType', 'certifications'];
      fields += fFields.length;
      fFields.forEach(f => { if (farmDetails[f]) filled++; });
    }
    
    return Math.round((filled / fields) * 100);
  };

  const handleDocumentUpload = (key, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      setSaveMessage('Document must be smaller than 5 MB.');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = () => {
      setDocuments(prev => ({ ...prev, [key]: reader.result }));
      setSaveMessage(`${key} uploaded successfully. Don't forget to save changes.`);
    };
    reader.readAsDataURL(file);
  };

  const updateProfileField = (event) => {
    const { name, value } = event.target;
    setProfile((currentProfile) => ({ ...currentProfile, [name]: value }));
  };

  const selectLanguage = (languageCode) => {
    setLanguage(languageCode);
    setIsLanguageModalOpen(false);
  };

  const handleProfileImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setSaveMessage('Please select an image file.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setSaveMessage('Please choose an image smaller than 2 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const imageData = reader.result;
      setProfileImage(imageData);
      updateUser({ profileImage: imageData });
      setSaveMessage('Profile photo updated.');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    const name = profile.name.trim();
    const mobile = profile.mobile.trim();

    if (!name || !mobile) {
      setSaveMessage('Name and mobile number are required.');
      return;
    }

    const savedProfile = {
      ...profile,
      name,
      mobile,
      village: profile.village.trim(),
      block: profile.block.trim(),
      district: profile.district.trim(),
      state: profile.state.trim(),
      profileImage,
      documents,
    };

    updateUser(savedProfile);
    setProfile(savedProfile);
    setSaveMessage('Changes saved successfully.');
  };

  const handleReset = () => {
    setProfile({
      name: user.name || (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : (user.firstName || user.lastName || '')),
      mobile: user.mobile || user.phone || '',
      farmerId: user.farmerId || '',
      buyerId: user.buyerId || '',
      village: user.village || address?.locality || '',
      block: user.block || address?.locality || '',
      district: user.district || address?.district || '',
      state: user.state || address?.state || '',
    });
    setProfileImage(user.profileImage || '');
    setSaveMessage('Changes reset.');
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <section className="mx-auto w-full max-w-5xl">
      {(!profile.village || !profile.district) && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 shadow-sm">
          <span className="text-xl">⚠️</span>
          <div>
            <h3 className="text-amber-800 font-bold text-sm">Your profile is incomplete</h3>
            <p className="text-amber-700 text-xs font-semibold mt-0.5">Please complete your profile by filling your address or using GPS to connect with the SAATHI network.</p>
          </div>
        </div>
      )}

      <header className="bg-white rounded-lg shadow-2xl border border-[var(--saathi-border-light)] p-6 sm:p-8 transition-all relative overflow-hidden">
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-100">
          <div 
            className={`h-full transition-all duration-1000 ease-out ${calculateProgress() === 100 ? 'bg-[#10B981]' : 'bg-[var(--saathi-primary)]'}`} 
            style={{ width: `${calculateProgress()}%` }} 
          />
        </div>
        
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mt-2">

        {/* Profile Image & Upload Button */}
        <div className="relative shrink-0 z-10 group">
          <label className="relative flex h-24 w-24 sm:h-28 sm:w-28 cursor-pointer items-center justify-center overflow-hidden rounded-full border-[3px] border-white/20 bg-accent shadow-inner transition hover:border-white/40" title="Upload profile photo">
            {profileImage ? (
              <img src={profileImage} alt="Profile" className="h-full w-full object-cover transition duration-300 group-hover:brightness-90" />
            ) : (
              <span className="text-5xl transition duration-300 group-hover:scale-110">👨🏽‍🌾</span>
            )}
            <input type="file" accept="image/*" className="sr-only" onChange={handleProfileImageChange} />
          </label>
          {/* Persistent Camera Overlay Icon */}
          <div className="pointer-events-none absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-800 shadow-md ring-2 ring-primary-dark transition group-hover:bg-slate-100 sm:h-9 sm:w-9">
            <CameraIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
        </div>

        {/* User Info */}
        <div className="flex-1 text-center sm:text-left z-10 pt-2">
          <h1 className="text-3xl font-extrabold sm:text-4xl text-[var(--saathi-text)] tracking-tight">{profile.name}</h1>
          <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
            <span className="flex items-center gap-1.5 rounded-full bg-[var(--saathi-surface-alt)] px-3 py-1 text-xs font-bold text-[var(--saathi-text-secondary)] border border-[var(--saathi-border)]">
              {user.role === 'BUYER' ? (
                <><span className="opacity-75">Buyer ID:</span> {profile.buyerId || 'N/A'}</>
              ) : (
                <><span className="opacity-75">Farmer ID:</span> {profile.farmerId || 'N/A'}</>
              )}
            </span>
          </div>
          <p className="mt-3 text-sm font-medium text-[var(--saathi-text-secondary)] flex items-center justify-center sm:justify-start gap-1.5">
            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            {profile.village ? `${profile.village}, ` : ''}{profile.district ? `${profile.district}, ` : ''}{profile.state}
          </p>
        </div>
        </div>
      </header>

      {}
      <section className="mt-8">
        <h2 className="text-2xl font-extrabold text-[var(--saathi-text)] mb-5 pb-2 border-b-2 border-slate-100/60">{t('profile.personalDetails')}</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField label="Full Name" name="name" value={profile.name} onChange={updateProfileField} />
          <TextField label="Mobile Number" name="mobile" type="tel" value={profile.mobile} onChange={updateProfileField} />
          {user.role === 'BUYER' ? (
            <TextField label="Buyer ID" name="buyerId" value={profile.buyerId} disabled />
          ) : (
            <TextField label="Farmer ID" name="farmerId" value={profile.farmerId} disabled />
          )}
          <TextField label="Village / Town" name="village" value={profile.village} onChange={updateProfileField} />
          <TextField label="Block" name="block" value={profile.block} onChange={updateProfileField} />
          <TextField label="District" name="district" value={profile.district} onChange={updateProfileField} />
          <TextField label="State" name="state" value={profile.state} onChange={updateProfileField} disabled />
        </div>
      </section>

      {}
      {user.role === 'FARMER' ? (
        <section className="mt-10">
          <h2 className="text-2xl font-extrabold text-[var(--saathi-text)] mb-5 pb-2 border-b-2 border-slate-100/60">
            Farm Details
          </h2>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
            <button type="button" onClick={() => setIsFarmDetailsModalOpen(true)} className="bg-white rounded-2xl p-5 border border-[var(--saathi-border-light)] shadow-sm flex flex-col items-center text-center transition hover:border-accent-dark hover:shadow-md focus:outline-none focus:ring-4 focus:ring-red-100">
              <span className="text-3xl mb-3">📏</span>
              <span className="text-xs font-extrabold text-secondary uppercase tracking-wider">Land Holding</span>
              <span className="mt-1 text-base font-bold text-[var(--saathi-text)]">{farmDetails.landHolding || 'Not specified'}</span>
            </button>
            <button type="button" onClick={() => setIsFarmDetailsModalOpen(true)} className="bg-white rounded-2xl p-5 border border-[var(--saathi-border-light)] shadow-sm flex flex-col items-center text-center transition hover:border-accent-dark hover:shadow-md focus:outline-none focus:ring-4 focus:ring-red-100">
              <span className="text-3xl mb-3">🌾</span>
              <span className="text-xs font-extrabold text-secondary uppercase tracking-wider">Primary Crops</span>
              <span className="mt-1 text-base font-bold text-[var(--saathi-text)]">{farmDetails.primaryCrops || 'Not specified'}</span>
            </button>
            <button type="button" onClick={() => setIsFarmDetailsModalOpen(true)} className="bg-white rounded-2xl p-5 border border-[var(--saathi-border-light)] shadow-sm flex flex-col items-center text-center transition hover:border-accent-dark hover:shadow-md focus:outline-none focus:ring-4 focus:ring-red-100">
              <span className="text-3xl mb-3">📦</span>
              <span className="text-xs font-extrabold text-secondary uppercase tracking-wider">Annual Yield</span>
              <span className="mt-1 text-base font-bold text-[var(--saathi-text)]">{farmDetails.annualYield || 'Not specified'}</span>
            </button>
            <button type="button" onClick={() => setIsFarmDetailsModalOpen(true)} className="bg-white rounded-2xl p-5 border border-[var(--saathi-border-light)] shadow-sm flex flex-col items-center text-center transition hover:border-accent-dark hover:shadow-md focus:outline-none focus:ring-4 focus:ring-red-100">
              <span className="text-3xl mb-3">📅</span>
              <span className="text-xs font-extrabold text-secondary uppercase tracking-wider">Harvest Season</span>
              <span className="mt-1 text-base font-bold text-[var(--saathi-text)]">{farmDetails.harvestSeason || 'Not specified'}</span>
            </button>
          </div>
        </section>
      ) : user.role === 'BUYER' ? (
        <section className="mt-10">
          <h2 className="text-2xl font-extrabold text-[var(--saathi-text)] mb-5 pb-2 border-b-2 border-slate-100/60">
            Business Details
          </h2>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
            <button type="button" onClick={() => setIsFarmDetailsModalOpen(true)} className="bg-white rounded-2xl p-5 border border-[var(--saathi-border-light)] shadow-sm flex flex-col items-center text-center transition hover:border-accent-dark hover:shadow-md focus:outline-none focus:ring-4 focus:ring-red-100">
              <span className="text-3xl mb-3">🏢</span>
              <span className="text-xs font-extrabold text-secondary uppercase tracking-wider">Business Name</span>
              <span className="mt-1 text-base font-bold text-[var(--saathi-text)]">{businessDetails.businessName || 'Not specified'}</span>
            </button>
            <button type="button" onClick={() => setIsFarmDetailsModalOpen(true)} className="bg-white rounded-2xl p-5 border border-[var(--saathi-border-light)] shadow-sm flex flex-col items-center text-center transition hover:border-accent-dark hover:shadow-md focus:outline-none focus:ring-4 focus:ring-red-100">
              <span className="text-3xl mb-3">🏷️</span>
              <span className="text-xs font-extrabold text-secondary uppercase tracking-wider">Type</span>
              <span className="mt-1 text-base font-bold text-[var(--saathi-text)]">{businessDetails.businessType || 'Not specified'}</span>
            </button>
            <button type="button" onClick={() => setIsFarmDetailsModalOpen(true)} className="bg-white rounded-2xl p-5 border border-[var(--saathi-border-light)] shadow-sm flex flex-col items-center text-center transition hover:border-accent-dark hover:shadow-md focus:outline-none focus:ring-4 focus:ring-red-100">
              <span className="text-3xl mb-3">🧾</span>
              <span className="text-xs font-extrabold text-secondary uppercase tracking-wider">GST Number</span>
              <span className="mt-1 text-base font-bold text-[var(--saathi-text)]">{businessDetails.gstNumber || 'Not specified'}</span>
            </button>
            <button type="button" onClick={() => setIsFarmDetailsModalOpen(true)} className="bg-white rounded-2xl p-5 border border-[var(--saathi-border-light)] shadow-sm flex flex-col items-center text-center transition hover:border-accent-dark hover:shadow-md focus:outline-none focus:ring-4 focus:ring-red-100">
              <span className="text-3xl mb-3">🎯</span>
              <span className="text-xs font-extrabold text-secondary uppercase tracking-wider">Target Crops</span>
              <span className="mt-1 text-base font-bold text-[var(--saathi-text)]">{businessDetails.targetCrops || 'Not specified'}</span>
            </button>
          </div>
        </section>
      ) : null}

      {}
      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {/* Document Vault */}
        <section className="sm:col-span-2">
          <div className="flex items-center justify-between mb-5 pb-2 border-b-2 border-slate-100/60">
            <h2 className="text-2xl font-extrabold text-[var(--saathi-text)]">Document Vault</h2>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-[var(--saathi-text-secondary)]">Public Profile</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={profile.isPublicProfile} onChange={(e) => setProfile(p => ({ ...p, isPublicProfile: e.target.checked }))} />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--saathi-accent)]"></div>
              </label>
            </div>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-3">
            {(user.role === 'BUYER' ? ['aadhaar', 'gstCertificate', 'otherDocument'] : ['aadhaar', 'landRecord', 'otherDocument']).map(docKey => (
              <div key={docKey} className="bg-white rounded-2xl p-5 border border-[var(--saathi-border-light)] shadow-sm flex flex-col items-center text-center transition hover:border-[var(--saathi-border)]">
                <span className="text-3xl mb-3">📄</span>
                <span className="text-xs font-extrabold text-[var(--saathi-text-secondary)] uppercase tracking-wider">{docKey.replace(/([A-Z])/g, ' $1').trim()}</span>
                
                {documents[docKey] ? (
                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">✓ Uploaded</span>
                    <label className="text-xs font-bold text-red-600 hover:underline cursor-pointer">
                      Replace
                      <input type="file" accept=".pdf,image/*" className="sr-only" onChange={(e) => handleDocumentUpload(docKey, e)} />
                    </label>
                  </div>
                ) : (
                  <label className="mt-4 cursor-pointer w-full bg-[var(--saathi-surface-alt)] hover:bg-slate-100 border border-[var(--saathi-border-light)] px-4 py-2 rounded-xl text-xs font-bold text-[var(--saathi-text-secondary)] transition">
                    Upload Document
                    <input type="file" accept=".pdf,image/*" className="sr-only" onChange={(e) => handleDocumentUpload(docKey, e)} />
                  </label>
                )}
              </div>
            ))}
          </div>
        </section>

        {}
        <section>
          <h2 className="text-2xl font-extrabold text-[var(--saathi-text)] mb-5 pb-2 border-b-2 border-slate-100/60">{t('explorer.location')}</h2>
          <div className="bg-white rounded-2xl p-5 border border-[var(--saathi-border-light)] shadow-sm h-[calc(100%-3rem)] flex flex-col justify-between">
            <div>
              <p className="text-xs font-extrabold text-secondary uppercase tracking-wider">Current Location</p>
              <p className="mt-2 text-lg font-bold text-[var(--saathi-text)] leading-tight">
                {permissionStatus === 'granted' && address ? address.formatted : `${profile.village}, ${profile.district}, ${profile.state}`}
              </p>
              <div className="mt-4 flex items-center gap-3">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-extrabold ${
                  permissionStatus === 'granted' 
                    ? 'bg-red-50 text-primary-dark border-red-200' 
                    : 'bg-red-50 text-red-800 border-red-200'
                }`}>
                  {permissionStatus === 'granted' ? '✓ Location detected' : 'Saved location'}
                </span>
                <span className="text-xs text-[var(--saathi-text-muted)] font-bold">Source: {permissionStatus === 'granted' ? 'GPS' : 'Manual entry'}</span>
              </div>
            </div>
            <button 
              onClick={requestLocation}
              className="mt-6 w-full flex items-center justify-center gap-2 bg-[var(--saathi-surface-alt)] hover:bg-slate-100 border border-[var(--saathi-border-light)] px-4 py-3 rounded-xl text-sm font-bold text-[var(--saathi-text-secondary)] transition"
            >
              <span className="text-lg">📍</span>{t('location.refresh')}</button>
          </div>
        </section>

        {}
        <section>
          <h2 className="text-2xl font-extrabold text-[var(--saathi-text)] mb-5 pb-2 border-b-2 border-slate-100/60">
            Language Preference
          </h2>
          <div className="bg-white rounded-2xl p-5 border border-[var(--saathi-border-light)] shadow-sm h-[calc(100%-3rem)] flex flex-col justify-between">
            <div>
              <p className="text-xs font-extrabold text-secondary uppercase tracking-wider">Selected Language</p>
              <p className="mt-2 text-2xl font-extrabold text-[var(--saathi-text)]">{preferredLanguage}</p>
              <p className="mt-3 text-sm text-[var(--saathi-text-muted)] font-semibold leading-relaxed">
                This language will be used across the entire SAATHI platform and for the AI Voice Assistant.
              </p>
            </div>
            <button
              onClick={() => setIsLanguageModalOpen(true)}
              className="mt-6 w-full flex items-center justify-center gap-2 bg-background hover:bg-[var(--saathi-surface-alt)] border border-[var(--saathi-border)] text-secondary px-4 py-3 rounded-xl text-sm font-extrabold transition shadow-sm"
            >
              🌐 Change Language
            </button>
          </div>
        </section>
      </div>

      {}
      <div className="mt-12 flex flex-col sm:flex-row items-center gap-4 pt-8 border-t-2 border-slate-100/60">
        <button type="button" onClick={handleSave} className="w-full sm:w-auto bg-primary-dark hover:bg-primary text-white px-10 py-3.5 rounded-2xl font-extrabold text-base transition shadow-lg shadow-red-900/20">{t('profile.save')}</button>
        <button type="button" onClick={handleReset} className="w-full sm:w-auto bg-background hover:bg-[var(--saathi-surface-alt)] border-2 border-primary-dark text-primary-dark px-8 py-3.5 rounded-2xl font-extrabold text-base transition">
          Reset
        </button>
        {saveMessage && <p className="w-full text-center text-sm font-semibold text-primary-dark sm:w-auto sm:text-left">{saveMessage}</p>}
        <div className="flex-1"></div>
        <button onClick={handleLogout} className="w-full sm:w-auto mt-4 sm:mt-0 text-red-600 hover:text-red-700 font-extrabold px-6 py-3.5 rounded-2xl hover:bg-red-50 transition border border-transparent hover:border-red-100">
          Sign Out
        </button>
      </div>

      {}
      {isLanguageModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4"
          role="presentation"
          onClick={() => setIsLanguageModalOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="language-dialog-title"
            className="w-full max-w-md rounded-[28px] bg-white p-6 sm:p-8 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <h2 id="language-dialog-title" className="text-2xl font-extrabold text-[var(--saathi-text)]">🌐 भाषा चुनें</h2>
              <button
                type="button"
                onClick={() => setIsLanguageModalOpen(false)}
                className="text-slate-400 hover:text-[var(--saathi-text-secondary)] font-bold bg-[var(--saathi-surface-alt)] h-8 w-8 rounded-full flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>
            <p className="text-sm font-semibold text-[var(--saathi-text-muted)] mb-6">Select your preferred language / अपनी पसंदीदा भाषा चुनें</p>

            <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
              {supportedLanguages.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => selectLanguage(lang.code)}
                  className={`flex flex-col items-center justify-center text-center rounded-2xl border-2 p-4 transition ${
                    preferredLanguage === lang.name
                      ? 'border-accent-dark bg-primary-dark opacity-5 text-white'
                      : 'border-slate-100 text-[var(--saathi-text)] hover:border-red-300 hover:bg-[var(--saathi-surface-alt)]'
                  }`}
                >
                  <span className="text-lg font-extrabold mb-1">{lang.nativeName}</span>
                  <span className="text-xs font-bold text-[var(--saathi-text-muted)]">{lang.name}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIsLanguageModalOpen(false)}
              className="mt-6 w-full rounded-xl border-2 border-[var(--saathi-border-light)] px-4 py-3.5 text-sm font-extrabold text-[var(--saathi-text-secondary)] hover:bg-[var(--saathi-surface-alt)] hover:text-[var(--saathi-text)] transition"
            >
              Cancel
            </button>
          </section>
        </div>
      )}

      {isFarmDetailsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="presentation" onClick={() => setIsFarmDetailsModalOpen(false)}>
          <section className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl sm:p-8" role="dialog" aria-modal="true" aria-labelledby="farm-details-dialog-title" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-4">
              <h2 id="farm-details-dialog-title" className="text-2xl font-extrabold text-[var(--saathi-text)]">Edit {user.role === 'BUYER' ? 'Business Details' : 'Farm Details'}</h2>
              <button type="button" onClick={() => setIsFarmDetailsModalOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 font-bold text-[var(--saathi-text-muted)] hover:bg-slate-200" aria-label="Close details">✕</button>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {user.role === 'BUYER' ? (
                <>
                  <FarmDetailField label="Business Name" name="businessName" value={businessDetails.businessName} onChange={setBusinessDetails} />
                  <FarmDetailField label="Business Type" name="businessType" value={businessDetails.businessType} onChange={setBusinessDetails} />
                  <FarmDetailField label="GST Number" name="gstNumber" value={businessDetails.gstNumber} onChange={setBusinessDetails} />
                  <FarmDetailField label="Target Crops" name="targetCrops" value={businessDetails.targetCrops} onChange={setBusinessDetails} />
                </>
              ) : (
                <>
                  <FarmDetailField label="Land Holding" name="landHolding" value={farmDetails.landHolding} onChange={setFarmDetails} />
                  <FarmDetailField label="Primary Crops" name="primaryCrops" value={farmDetails.primaryCrops} onChange={setFarmDetails} />
                  <FarmDetailField label="Irrigation" name="irrigation" value={farmDetails.irrigation} onChange={setFarmDetails} />
                  <FarmDetailField label="Farming Type" name="farmingType" value={farmDetails.farmingType} onChange={setFarmDetails} />
                  <FarmDetailField label="Annual Yield" name="annualYield" value={farmDetails.annualYield} onChange={setFarmDetails} />
                  <FarmDetailField label="Harvest Season" name="harvestSeason" value={farmDetails.harvestSeason} onChange={setFarmDetails} />
                  <FarmDetailField label="Soil Type" name="soilType" value={farmDetails.soilType} onChange={setFarmDetails} />
                  <FarmDetailField label="Certifications" name="certifications" value={farmDetails.certifications} onChange={setFarmDetails} />
                </>
              )}
            </div>
            <button type="button" onClick={() => { updateUser(user.role === 'BUYER' ? businessDetails : farmDetails); setIsFarmDetailsModalOpen(false); setSaveMessage('Details saved successfully.'); }} className="mt-6 w-full rounded-xl bg-[var(--saathi-primary)] px-4 py-3.5 text-sm font-extrabold text-white transition hover:bg-blue-900">Save Details</button>
          </section>
        </div>
      )}
    </section>
  );
}

function TextField({ label, name, value, onChange, type = 'text', disabled = false }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-extrabold text-[var(--saathi-text-secondary)]">{label}</span>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="w-full rounded-2xl border-2 border-[var(--saathi-border-light)] px-4 py-3.5 text-base font-semibold text-[var(--saathi-text)] bg-white outline-none transition focus:border-accent-dark focus:bg-accent disabled:bg-[var(--saathi-surface-alt)] disabled:text-[var(--saathi-text-muted)] disabled:border-slate-100"
      />
    </label>
  );
}

function FarmDetailField({ label, name, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-extrabold text-[var(--saathi-text-secondary)]">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange((currentDetails) => ({ ...currentDetails, [name]: event.target.value }))}
        className="w-full rounded-xl border-2 border-[var(--saathi-border-light)] px-4 py-3 text-base font-semibold text-[var(--saathi-text)] outline-none transition focus:border-accent-dark focus:ring-4 focus:ring-red-100"
      />
    </label>
  );
}
