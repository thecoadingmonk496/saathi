import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useLocationContext } from '../context/LocationContext';

export default function Profile() {
  const navigate = useNavigate();
  const { user, preferredLanguage, supportedLanguages, setLanguage, updateUser, logout, t } = useUser();
  const { address, permissionStatus, source, requestLocation } = useLocationContext();

  const [profile, setProfile] = useState({
    name: user.name || 'Ramesh Kumar',
    mobile: user.mobile || '6666666666',
    farmerId: user.farmerId || 'FARM-3124',
    village: user.village || address?.locality || 'Chakia',
    block: user.block || address?.locality || 'Chakia',
    district: user.district || address?.district || 'Chandauli',
    state: user.state || address?.state || 'Uttar Pradesh',
  });
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [isFarmDetailsModalOpen, setIsFarmDetailsModalOpen] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [profileImage, setProfileImage] = useState(user.profileImage || '');
  const [farmDetails, setFarmDetails] = useState({
    landHolding: user.landHolding || '3.5 Acres',
    primaryCrops: user.primaryCrops || 'Wheat, Rice',
    irrigation: user.irrigation || 'Tube Well',
    farmingType: user.farmingType || 'Mixed Farming',
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
    };

    updateUser(savedProfile);
    setProfile(savedProfile);
    setSaveMessage('Changes saved successfully.');
  };

  const handleReset = () => {
    setProfile({
      name: user.name || 'Ramesh Kumar',
      mobile: user.mobile || '6666666666',
      farmerId: user.farmerId || 'FARM-3124',
      village: user.village || address?.locality || 'Chakia',
      block: user.block || address?.locality || 'Chakia',
      district: user.district || address?.district || 'Chandauli',
      state: user.state || address?.state || 'Uttar Pradesh',
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
      {}
      <header className="rounded-[28px] bg-primary-dark p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row items-center sm:items-start gap-6 relative overflow-hidden">
        {}
        <div className="absolute -right-20 -top-20 opacity-10 pointer-events-none">
          <svg width="250" height="250" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 22h20L12 2zm0 4.5l6.5 13h-13L12 6.5z"/></svg>
        </div>

        {}
        <label className="group relative h-24 w-24 shrink-0 cursor-pointer rounded-full border-4 border-background/20 bg-accent shadow-inner z-10 sm:h-28 sm:w-28" title="Upload profile photo">
          {profileImage ? (
            <img src={profileImage} alt="Profile" className="h-full w-full rounded-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-4xl">👨🏽‍🌾</span>
          )}
          <span className="absolute inset-x-1 bottom-1 rounded-full bg-black/65 px-2 py-1 text-center text-[10px] font-bold text-white opacity-0 transition group-hover:opacity-100 sm:text-xs">
            Upload photo
          </span>
          <input type="file" accept="image/*" className="sr-only" onChange={handleProfileImageChange} />
        </label>

        {}
        <div className="flex-1 text-center sm:text-left z-10">
          <p className="text-xs font-extrabold uppercase tracking-widest text-background opacity-80 mb-1">{t('profile.title')}</p>
          <h1 className="text-3xl font-extrabold sm:text-4xl text-primary-dark">{profile.name}</h1>

          <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-3">
            <span className="text-sm font-bold bg-white/10 px-4 py-1.5 rounded-full border border-[#E0E0E0]">
              Farmer ID: {profile.farmerId}
            </span>
            <span className="text-sm font-extrabold bg-accent opacity-20 text-accent-dark px-4 py-1.5 rounded-full border border-accent-dark opacity-40 flex items-center gap-1.5">
              ✓ Verified Farmer
            </span>
          </div>
          <p className="mt-3 text-sm font-medium text-red-100 flex items-center justify-center sm:justify-start gap-1.5">
            <span className="text-lg">📍</span> {profile.village}, {profile.district}, {profile.state}
          </p>
        </div>
      </header>

      {}
      <section className="mt-8">
        <h2 className="text-2xl font-extrabold text-primary-dark mb-5 pb-2 border-b-2 border-slate-100/60">{t('profile.personalDetails')}</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField label="Full Name" name="name" value={profile.name} onChange={updateProfileField} />
          <TextField label="Mobile Number" name="mobile" type="tel" value={profile.mobile} onChange={updateProfileField} />
          <TextField label={t('profile.farmerId')} name="farmerId" value={profile.farmerId} onChange={updateProfileField} />
          <TextField label={t('')} name="village" value={profile.village} onChange={updateProfileField} />
          <TextField label={t('')} name="block" value={profile.block} onChange={updateProfileField} />
          <TextField label={t('')} name="district" value={profile.district} onChange={updateProfileField} />
          <TextField label={t('')} name="state" value={profile.state} onChange={updateProfileField} disabled />
        </div>
      </section>

      {}
      <section className="mt-10">
        <h2 className="text-2xl font-extrabold text-primary-dark mb-5 pb-2 border-b-2 border-slate-100/60">
          Farm Details
        </h2>
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
          <button type="button" onClick={() => setIsFarmDetailsModalOpen(true)} className="bg-white rounded-2xl p-5 border border-[var(--saathi-border-light)] shadow-sm flex flex-col items-center text-center transition hover:border-accent-dark hover:shadow-md focus:outline-none focus:ring-4 focus:ring-red-100">
            <span className="text-3xl mb-3">📏</span>
            <span className="text-xs font-extrabold text-secondary uppercase tracking-wider">Land Holding</span>
            <span className="mt-1 text-base font-bold text-[var(--saathi-text)]">{farmDetails.landHolding}</span>
          </button>
          <button type="button" onClick={() => setIsFarmDetailsModalOpen(true)} className="bg-white rounded-2xl p-5 border border-[var(--saathi-border-light)] shadow-sm flex flex-col items-center text-center transition hover:border-accent-dark hover:shadow-md focus:outline-none focus:ring-4 focus:ring-red-100">
            <span className="text-3xl mb-3">🌾</span>
            <span className="text-xs font-extrabold text-secondary uppercase tracking-wider">Primary Crops</span>
            <span className="mt-1 text-base font-bold text-[var(--saathi-text)]">{farmDetails.primaryCrops}</span>
          </button>
          <button type="button" onClick={() => setIsFarmDetailsModalOpen(true)} className="bg-white rounded-2xl p-5 border border-[var(--saathi-border-light)] shadow-sm flex flex-col items-center text-center transition hover:border-accent-dark hover:shadow-md focus:outline-none focus:ring-4 focus:ring-red-100">
            <span className="text-3xl mb-3">💧</span>
            <span className="text-xs font-extrabold text-secondary uppercase tracking-wider">Irrigation</span>
            <span className="mt-1 text-base font-bold text-[var(--saathi-text)]">{farmDetails.irrigation}</span>
          </button>
          <button type="button" onClick={() => setIsFarmDetailsModalOpen(true)} className="bg-white rounded-2xl p-5 border border-[var(--saathi-border-light)] shadow-sm flex flex-col items-center text-center transition hover:border-accent-dark hover:shadow-md focus:outline-none focus:ring-4 focus:ring-red-100">
            <span className="text-3xl mb-3">🚜</span>
            <span className="text-xs font-extrabold text-secondary uppercase tracking-wider">Farming Type</span>
            <span className="mt-1 text-base font-bold text-[var(--saathi-text)]">{farmDetails.farmingType}</span>
          </button>
        </div>
      </section>

      {}
      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {}
        <section>
          <h2 className="text-2xl font-extrabold text-primary-dark mb-5 pb-2 border-b-2 border-slate-100/60">{t('explorer.location')}</h2>
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
          <h2 className="text-2xl font-extrabold text-primary-dark mb-5 pb-2 border-b-2 border-slate-100/60">
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
              <h2 id="farm-details-dialog-title" className="text-2xl font-extrabold text-[var(--saathi-text)]">Edit Farm Details</h2>
              <button type="button" onClick={() => setIsFarmDetailsModalOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 font-bold text-[var(--saathi-text-muted)] hover:bg-slate-200" aria-label="Close farm details">✕</button>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <FarmDetailField label="Land Holding" name="landHolding" value={farmDetails.landHolding} onChange={setFarmDetails} />
              <FarmDetailField label="Primary Crops" name="primaryCrops" value={farmDetails.primaryCrops} onChange={setFarmDetails} />
              <FarmDetailField label="Irrigation" name="irrigation" value={farmDetails.irrigation} onChange={setFarmDetails} />
              <FarmDetailField label="Farming Type" name="farmingType" value={farmDetails.farmingType} onChange={setFarmDetails} />
            </div>
            <button type="button" onClick={() => { updateUser(farmDetails); setIsFarmDetailsModalOpen(false); setSaveMessage('Farm details saved successfully.'); }} className="mt-6 w-full rounded-xl bg-primary-dark px-4 py-3.5 text-sm font-extrabold text-white transition hover:bg-primary">Save Farm Details</button>
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
        className="w-full rounded-2xl border-2 border-[var(--saathi-border-light)] px-4 py-3.5 text-base font-semibold text-[var(--saathi-text)] bg-white outline-none transition focus:border-accent-dark focus:bg-accent opacity-5 disabled:bg-[var(--saathi-surface-alt)] disabled:text-[var(--saathi-text-muted)] disabled:border-slate-100"
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
