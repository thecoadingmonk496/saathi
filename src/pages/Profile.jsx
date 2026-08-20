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
  const [saveMessage, setSaveMessage] = useState('');
  const [profileImage, setProfileImage] = useState(user.profileImage || '');

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
      <header className="rounded-[28px] bg-[#14532D] p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row items-center sm:items-start gap-6 relative overflow-hidden">
        {}
        <div className="absolute -right-20 -top-20 opacity-10 pointer-events-none">
          <svg width="250" height="250" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 22h20L12 2zm0 4.5l6.5 13h-13L12 6.5z"/></svg>
        </div>

        {}
        <label className="group relative h-24 w-24 shrink-0 cursor-pointer rounded-full border-4 border-[#F7F3E8]/20 bg-[#2F7D32] shadow-inner z-10 sm:h-28 sm:w-28" title="Upload profile photo">
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
          <p className="text-xs font-extrabold uppercase tracking-widest text-[#F7F3E8]/80 mb-1">{t('profile.title')}</p>
          <h1 className="text-3xl font-extrabold sm:text-4xl text-white">{profile.name}</h1>

          <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-3">
            <span className="text-sm font-bold bg-white/10 px-4 py-1.5 rounded-full border border-white/20">
              Farmer ID: {profile.farmerId}
            </span>
            <span className="text-sm font-extrabold bg-[#D99A2B]/20 text-[#D99A2B] px-4 py-1.5 rounded-full border border-[#D99A2B]/40 flex items-center gap-1.5">
              ✓ Verified Farmer
            </span>
          </div>
          <p className="mt-3 text-sm font-medium text-green-100 flex items-center justify-center sm:justify-start gap-1.5">
            <span className="text-lg">📍</span> {profile.village}, {profile.district}, {profile.state}
          </p>
        </div>
      </header>

      {}
      <section className="mt-8">
        <h2 className="text-2xl font-extrabold text-[#14532D] mb-5 pb-2 border-b-2 border-slate-100/60">{t('profile.personalDetails')}</h2>
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
        <h2 className="text-2xl font-extrabold text-[#14532D] mb-5 pb-2 border-b-2 border-slate-100/60">
          Farm Details
        </h2>
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col items-center text-center transition hover:border-[#2F7D32]">
            <span className="text-3xl mb-3">📏</span>
            <span className="text-xs font-extrabold text-[#795548] uppercase tracking-wider">Land Holding</span>
            <span className="mt-1 text-base font-bold text-slate-900">3.5 Acres</span>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col items-center text-center transition hover:border-[#2F7D32]">
            <span className="text-3xl mb-3">🌾</span>
            <span className="text-xs font-extrabold text-[#795548] uppercase tracking-wider">Primary Crops</span>
            <span className="mt-1 text-base font-bold text-slate-900">Wheat, Rice</span>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col items-center text-center transition hover:border-[#2F7D32]">
            <span className="text-3xl mb-3">💧</span>
            <span className="text-xs font-extrabold text-[#795548] uppercase tracking-wider">Irrigation</span>
            <span className="mt-1 text-base font-bold text-slate-900">Tube Well</span>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col items-center text-center transition hover:border-[#2F7D32]">
            <span className="text-3xl mb-3">🚜</span>
            <span className="text-xs font-extrabold text-[#795548] uppercase tracking-wider">Farming Type</span>
            <span className="mt-1 text-base font-bold text-slate-900">Mixed Farming</span>
          </div>
        </div>
      </section>

      {}
      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {}
        <section>
          <h2 className="text-2xl font-extrabold text-[#14532D] mb-5 pb-2 border-b-2 border-slate-100/60">{t('explorer.location')}</h2>
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm h-[calc(100%-3rem)] flex flex-col justify-between">
            <div>
              <p className="text-xs font-extrabold text-[#795548] uppercase tracking-wider">Current Location</p>
              <p className="mt-2 text-lg font-bold text-slate-900 leading-tight">
                {permissionStatus === 'granted' && address ? address.formatted : `${profile.village}, ${profile.district}, ${profile.state}`}
              </p>
              <div className="mt-4 flex items-center gap-3">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-extrabold ${
                  permissionStatus === 'granted' 
                    ? 'bg-green-50 text-[#14532D] border-green-200' 
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}>
                  {permissionStatus === 'granted' ? '✓ Location detected' : 'Saved location'}
                </span>
                <span className="text-xs text-slate-500 font-bold">Source: {permissionStatus === 'granted' ? 'GPS' : 'Manual entry'}</span>
              </div>
            </div>
            <button 
              onClick={requestLocation}
              className="mt-6 w-full flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-4 py-3 rounded-xl text-sm font-bold text-slate-700 transition"
            >
              <span className="text-lg">📍</span>{t('location.refresh')}</button>
          </div>
        </section>

        {}
        <section>
          <h2 className="text-2xl font-extrabold text-[#14532D] mb-5 pb-2 border-b-2 border-slate-100/60">
            Language Preference
          </h2>
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm h-[calc(100%-3rem)] flex flex-col justify-between">
            <div>
              <p className="text-xs font-extrabold text-[#795548] uppercase tracking-wider">Selected Language</p>
              <p className="mt-2 text-2xl font-extrabold text-slate-900">{preferredLanguage}</p>
              <p className="mt-3 text-sm text-slate-500 font-semibold leading-relaxed">
                This language will be used across the entire SAATHI platform and for the AI Voice Assistant.
              </p>
            </div>
            <button
              onClick={() => setIsLanguageModalOpen(true)}
              className="mt-6 w-full flex items-center justify-center gap-2 bg-[#F7F3E8] hover:bg-[#e8e2d2] border border-[#d2c9b4] text-[#795548] px-4 py-3 rounded-xl text-sm font-extrabold transition shadow-sm"
            >
              🌐 Change Language
            </button>
          </div>
        </section>
      </div>

      {}
      <div className="mt-12 flex flex-col sm:flex-row items-center gap-4 pt-8 border-t-2 border-slate-100/60">
        <button type="button" onClick={handleSave} className="w-full sm:w-auto bg-[#14532D] hover:bg-[#0f4021] text-white px-10 py-3.5 rounded-2xl font-extrabold text-base transition shadow-lg shadow-green-900/20">{t('profile.save')}</button>
        <button type="button" onClick={handleReset} className="w-full sm:w-auto bg-[#F7F3E8] hover:bg-[#e8e2d2] border-2 border-[#14532D] text-[#14532D] px-8 py-3.5 rounded-2xl font-extrabold text-base transition">
          Reset
        </button>
        {saveMessage && <p className="w-full text-center text-sm font-semibold text-[#14532D] sm:w-auto sm:text-left">{saveMessage}</p>}
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
              <h2 id="language-dialog-title" className="text-2xl font-extrabold text-slate-900">🌐 भाषा चुनें</h2>
              <button
                type="button"
                onClick={() => setIsLanguageModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold bg-slate-50 h-8 w-8 rounded-full flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>
            <p className="text-sm font-semibold text-slate-500 mb-6">Select your preferred language / अपनी पसंदीदा भाषा चुनें</p>

            <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
              {supportedLanguages.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => selectLanguage(lang.code)}
                  className={`flex flex-col items-center justify-center text-center rounded-2xl border-2 p-4 transition ${
                    preferredLanguage === lang.name
                      ? 'border-[#2F7D32] bg-[#2F7D32]/5 text-[#14532D]'
                      : 'border-slate-100 text-slate-800 hover:border-green-300 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-lg font-extrabold mb-1">{lang.nativeName}</span>
                  <span className="text-xs font-bold text-slate-500">{lang.name}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIsLanguageModalOpen(false)}
              className="mt-6 w-full rounded-xl border-2 border-slate-200 px-4 py-3.5 text-sm font-extrabold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
            >
              Cancel
            </button>
          </section>
        </div>
      )}
    </section>
  );
}

function TextField({ label, name, value, onChange, type = 'text', disabled = false }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-extrabold text-slate-700">{label}</span>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3.5 text-base font-semibold text-slate-900 bg-white outline-none transition focus:border-[#2F7D32] focus:bg-[#2F7D32]/5 disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-100"
      />
    </label>
  );
}
