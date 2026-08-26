import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';

const geography = [
  { village: 'Ramgarh', block: 'Patiala', district: 'Patiala', state: 'Punjab' },
  { village: 'Bhadson', block: 'Nabha', district: 'Patiala', state: 'Punjab' },
  { village: 'Khed', block: 'Rajgurunagar', district: 'Pune', state: 'Maharashtra' },
  { village: 'Pimpalgaon', block: 'Niphad', district: 'Nashik', state: 'Maharashtra' },
  { village: 'Bara Gaon', block: 'Mawana', district: 'Meerut', state: 'Uttar Pradesh' },
  { village: 'Bhor Saidan', block: 'Pehowa', district: 'Kurukshetra', state: 'Haryana' },
];

const languageSuggestions = {
  Punjab: ['Punjabi', 'Hindi'],
  Maharashtra: ['Marathi', 'Hindi'],
  'Uttar Pradesh': ['Hindi', 'Urdu'],
  Haryana: ['Hindi', 'Haryanvi'],
};

const initialRegistration = {
  name: '',
  mobile: '',
  farmerId: '',
};

const initialLocation = {
  village: '',
  block: '',
  district: '',
  state: '',
};

const uniqueValues = (entries, key) => [...new Set(entries.map((entry) => entry[key]))];

export default function Onboarding() {
  const navigate = useNavigate();
  const { login, updateLocation, setLanguage } = useUser();
  const [step, setStep] = useState(1);
  const [registration, setRegistration] = useState(initialRegistration);
  const [location, setLocation] = useState(initialLocation);
  const [locationMode, setLocationMode] = useState('permission');
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState('');

  const handleRegistrationChange = (event) => {
    const { name, value } = event.target;
    setRegistration((currentData) => ({ ...currentData, [name]: value }));
  };

  const handleRegistrationNext = (event) => {
    event.preventDefault();
    const mobileIsValid = /^\d{10}$/.test(registration.mobile);
    const farmerIdIsValid = /^[a-zA-Z0-9]+$/.test(registration.farmerId);

    if (!registration.name.trim() || !mobileIsValid || !farmerIdIsValid) {
      setError('Enter your name, a 10-digit mobile number, and an alphanumeric Farmer ID.');
      return;
    }

    login({ ...registration, name: registration.name.trim() });
    setError('');
    setStep(2);
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationMode('manual');
      setError('Location is not supported on this device. Please choose your location manually.');
      return;
    }

    setIsLocating(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      () => {
        const detectedLocation = {
          village: 'Ramgarh',
          block: 'Patiala',
          district: 'Patiala',
          state: 'Punjab',
        };

        setLocation(detectedLocation);
        updateLocation(detectedLocation);
        setLocationMode('detected');
        setIsLocating(false);
      },
      () => {
        setLocationMode('manual');
        setError('Location permission was not granted. Please select your location manually.');
        setIsLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  };

  const handleLocationChange = (event) => {
    const village = event.target.value;
    const selectedPlace = geography.find((place) => place.village === village);

    if (!selectedPlace) {
      setLocation(initialLocation);
      return;
    }

    setLocation({ village, block: '', district: '', state: '' });
    setError('');
  };

  const updateManualLocation = (field, value) => {
    setLocation((currentLocation) => {
      const nextLocation = { ...currentLocation, [field]: value };

      if (field === 'block') {
        nextLocation.district = '';
        nextLocation.state = '';
      }

      if (field === 'district') {
        nextLocation.state = '';
      }

      return nextLocation;
    });
    setError('');
  };

  const villageMatches = geography.filter((place) => place.village === location.village);
  const blockOptions = uniqueValues(villageMatches, 'block');
  const districtOptions = uniqueValues(
    villageMatches.filter((place) => place.block === location.block),
    'district',
  );
  const stateOptions = uniqueValues(
    villageMatches.filter(
      (place) => place.block === location.block && place.district === location.district,
    ),
    'state',
  );

  const handleLocationNext = () => {
    if (!location.village || !location.block || !location.district || !location.state) {
      setError('Please complete all location fields to continue.');
      return;
    }

    updateLocation(location);
    setError('');
    setStep(3);
  };

  const handleLanguageSelect = (language) => {
    setLanguage(language);
    navigate('/');
  };

  const suggestedLanguages = languageSuggestions[location.state] || ['Hindi', 'English'];

  return (
    <main className="min-h-screen bg-transparent px-4 pb-20 pt-8 sm:flex sm:items-center sm:justify-center sm:p-8 sm:pb-20">
      <section className="mx-auto w-full max-w-xl rounded-3xl bg-white/90 p-6 shadow-xl shadow-red-900/15 backdrop-blur-xl sm:p-10">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-dark text-2xl text-white">
            🌾
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--saathi-text)]">Welcome to SAATHI</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--saathi-text-secondary)]">
            Your trusted companion for better farming decisions.
          </p>
        </div>

        <div className="mt-10">
          {step === 1 && (
            <form onSubmit={handleRegistrationNext} noValidate>
              <div className="mb-7">
                <p className="text-xl font-semibold text-[var(--saathi-text)]">Let&apos;s get to know you</p>
                <p className="mt-1 text-sm text-[var(--saathi-text-secondary)]">Enter your farming profile details.</p>
              </div>

              <div className="space-y-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[var(--saathi-text-secondary)]">Full Name</span>
                  <input
                    type="text"
                    name="name"
                    value={registration.name}
                    onChange={handleRegistrationChange}
                    placeholder="Enter your full name"
                    autoComplete="name"
                    className="w-full rounded-xl border border-[var(--saathi-border-light)] px-4 py-3 text-[var(--saathi-text)] outline-none transition placeholder:text-slate-400 focus:border-accent-dark focus:ring-4 focus:ring-red-100"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[var(--saathi-text-secondary)]">Mobile Number</span>
                  <input
                    type="tel"
                    name="mobile"
                    value={registration.mobile}
                    onChange={handleRegistrationChange}
                    placeholder="10-digit mobile number"
                    inputMode="numeric"
                    maxLength="10"
                    autoComplete="tel"
                    className="w-full rounded-xl border border-[var(--saathi-border-light)] px-4 py-3 text-[var(--saathi-text)] outline-none transition placeholder:text-slate-400 focus:border-accent-dark focus:ring-4 focus:ring-red-100"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[var(--saathi-text-secondary)]">{t('profile.farmerId')}</span>
                  <input
                    type="text"
                    name="farmerId"
                    value={registration.farmerId}
                    onChange={handleRegistrationChange}
                    placeholder="Enter your alphanumeric Farmer ID"
                    autoComplete="off"
                    className="w-full rounded-xl border border-[var(--saathi-border-light)] px-4 py-3 text-[var(--saathi-text)] outline-none transition placeholder:text-slate-400 focus:border-accent-dark focus:ring-4 focus:ring-red-100"
                  />
                </label>
              </div>

              {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                className="mt-8 w-full rounded-xl bg-primary-dark px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-primary focus:outline-none focus:ring-4 focus:ring-red-200"
              >
                Next
              </button>
            </form>
          )}

          {step === 2 && (
            <div>
              <div className="mb-7">
                <p className="text-xl font-semibold text-[var(--saathi-text)]">Where is your farm?</p>
                <p className="mt-1 text-sm text-[var(--saathi-text-secondary)]">This helps us provide relevant market and weather information.</p>
              </div>

              {locationMode === 'permission' && (
                <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-xl shadow-sm">📍</div>
                  <p className="mt-4 font-semibold text-[var(--saathi-text)]">{t('location.permissionTitle')}</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--saathi-text-secondary)]">We&apos;ll only use it to identify your village and nearby services.</p>
                  <button
                    type="button"
                    onClick={useCurrentLocation}
                    disabled={isLocating}
                    className="mt-5 w-full rounded-xl bg-primary-dark px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isLocating ? 'Finding location…' : 'Allow Location Access'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLocationMode('manual');
                      setError('');
                    }}
                    className="mt-3 text-sm font-semibold text-accent-dark hover:underline"
                  >
                    Select location manually
                  </button>
                </div>
              )}

              {locationMode === 'detected' && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                  <p className="text-sm font-semibold text-accent-dark">Location found</p>
                  <p className="mt-2 text-base font-semibold text-[var(--saathi-text)]">{location.village}, {location.block}</p>
                  <p className="mt-1 text-sm text-[var(--saathi-text-secondary)]">{location.district}, {location.state}</p>
                  <button
                    type="button"
                    onClick={() => setLocationMode('manual')}
                    className="mt-4 text-sm font-semibold text-accent-dark hover:underline"
                  >{t('hero.changeLocation')}</button>
                </div>
              )}

              {locationMode === 'manual' && (
                <div className="space-y-5">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-[var(--saathi-text-secondary)]">{t('profile.village')}</span>
                    <select
                      value={location.village}
                      onChange={handleLocationChange}
                      className="w-full rounded-xl border border-[var(--saathi-border-light)] bg-white px-4 py-3 text-[var(--saathi-text)] outline-none focus:border-accent-dark focus:ring-4 focus:ring-red-100"
                    >
                      <option value="">Select Village</option>
                      {uniqueValues(geography, 'village').map((village) => (
                        <option key={village} value={village}>{village}</option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-[var(--saathi-text-secondary)]">{t('profile.block')}</span>
                    <select
                      value={location.block}
                      onChange={(event) => updateManualLocation('block', event.target.value)}
                      disabled={!location.village}
                      className="w-full rounded-xl border border-[var(--saathi-border-light)] bg-white px-4 py-3 text-[var(--saathi-text)] outline-none focus:border-accent-dark focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-[var(--saathi-surface-alt)] disabled:text-slate-400"
                    >
                      <option value="">Select Block</option>
                      {blockOptions.map((block) => <option key={block} value={block}>{block}</option>)}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-[var(--saathi-text-secondary)]">{t('profile.district')}</span>
                    <select
                      value={location.district}
                      onChange={(event) => updateManualLocation('district', event.target.value)}
                      disabled={!location.block}
                      className="w-full rounded-xl border border-[var(--saathi-border-light)] bg-white px-4 py-3 text-[var(--saathi-text)] outline-none focus:border-accent-dark focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-[var(--saathi-surface-alt)] disabled:text-slate-400"
                    >
                      <option value="">Select District</option>
                      {districtOptions.map((district) => <option key={district} value={district}>{district}</option>)}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-[var(--saathi-text-secondary)]">{t('profile.state')}</span>
                    <select
                      value={location.state}
                      onChange={(event) => updateManualLocation('state', event.target.value)}
                      disabled={!location.district}
                      className="w-full rounded-xl border border-[var(--saathi-border-light)] bg-white px-4 py-3 text-[var(--saathi-text)] outline-none focus:border-accent-dark focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-[var(--saathi-surface-alt)] disabled:text-slate-400"
                    >
                      <option value="">Select State</option>
                      {stateOptions.map((state) => <option key={state} value={state}>{state}</option>)}
                    </select>
                  </label>
                </div>
              )}

              {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

              {locationMode !== 'permission' && (
                <div className="mt-8 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setError('');
                    }}
                    className="rounded-xl border border-[var(--saathi-border-light)] px-5 py-3.5 text-sm font-semibold text-[var(--saathi-text-secondary)] transition hover:bg-[var(--saathi-surface-alt)]"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleLocationNext}
                    className="flex-1 rounded-xl bg-primary-dark px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-primary focus:outline-none focus:ring-4 focus:ring-red-200"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="mb-7">
                <p className="text-xl font-semibold text-[var(--saathi-text)]">Choose your language</p>
                <p className="mt-1 text-sm text-[var(--saathi-text-secondary)]">Recommended for farmers in {location.state}.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {suggestedLanguages.map((language) => (
                  <button
                    key={language}
                    type="button"
                    onClick={() => handleLanguageSelect(language)}
                    className="rounded-2xl border-2 border-red-100 bg-red-50 px-5 py-8 text-xl font-bold text-accent-dark transition hover:border-accent-dark hover:bg-red-100 focus:outline-none focus:ring-4 focus:ring-red-200"
                  >
                    {language}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="mt-8 text-sm font-semibold text-accent-dark hover:underline"
              >
                Back to location
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
