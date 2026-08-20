

import { useState } from 'react';
import { MapPinIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useLocationContext } from '../context/LocationContext';
import { useUser } from '../context/UserContext';
import { getDistricts, getVillages, locationStates } from '../utils/locationOptions';

export default function LocationBar({ compact = false }) {
  const { t } = useUser();
  const {
    address,
    source,
    permissionStatus,
    loading,
    error,
    lastUpdated,
    requestLocation,
    refreshLocation,
    setManualLocation,
    accuracy,
  } = useLocationContext();

  const [showManualInput, setShowManualInput] = useState(false);
  const [manualLocation, setManualLocationForm] = useState({ state: '', district: '', village: '' });

  const handleAllowLocation = () => {
    setShowManualInput(false);
    requestLocation();
  };

  const handleRefresh = () => {
    refreshLocation();
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualLocation.state && manualLocation.district && manualLocation.village) {
      setManualLocation(manualLocation);
      setShowManualInput(false);
      setManualLocationForm({ state: '', district: '', village: '' });
    }
  };

  const isLowAccuracy = accuracy != null && accuracy > 1000;

  if (permissionStatus === 'idle') {
    return (
      <div className={`inline-flex flex-col items-start gap-2 rounded-2xl border border-emerald-500/20 bg-[#0c2a20]/80 px-4 py-3 text-emerald-50 shadow-md backdrop-blur-md ${compact ? '' : 'w-full sm:w-auto'}`}>
        <div className="flex items-center gap-2">
          <MapPinIcon className="h-4 w-4 text-emerald-400 shrink-0" />
          <span className="text-sm font-semibold text-emerald-200">{t('location.notSet')}</span>
        </div>

        {!compact && (
          <div className="space-y-1 text-xs text-emerald-300/80 pl-6">
            <p>✓ {t('location.benefit1')}</p>
            <p>✓ {t('location.benefit2')}</p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pl-6">
          <button
            onClick={handleAllowLocation}
            className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-400 transition focus:outline-none focus:ring-2 focus:ring-emerald-300"
          >
            📍 {t('location.useMyLocation')}
          </button>
          <button
            onClick={() => setShowManualInput((v) => !v)}
            className="text-xs font-medium text-emerald-300 underline hover:text-white transition"
          >
            {t('location.enterManually')}
          </button>
        </div>

        {showManualInput && (
          <form onSubmit={handleManualSubmit} className="w-full space-y-2 pl-6">
            <p className="text-[11px] text-emerald-300/80">Select a valid state, district, and village / tehsil.</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <select aria-label="State" value={manualLocation.state} onChange={(e) => setManualLocationForm({ state: e.target.value, district: '', village: '' })} className="min-w-0 rounded-xl border border-emerald-500/40 bg-[#061e17] px-2 py-1.5 text-xs text-white outline-none focus:ring-2 focus:ring-emerald-400">
                <option value="">State</option>
                {locationStates.map((state) => <option key={state} value={state}>{state}</option>)}
              </select>
              <select aria-label="District" value={manualLocation.district} onChange={(e) => setManualLocationForm({ ...manualLocation, district: e.target.value, village: '' })} disabled={!manualLocation.state} className="min-w-0 rounded-xl border border-emerald-500/40 bg-[#061e17] px-2 py-1.5 text-xs text-white outline-none disabled:opacity-50 focus:ring-2 focus:ring-emerald-400">
                <option value="">District</option>
                {getDistricts(manualLocation.state).map((district) => <option key={district} value={district}>{district}</option>)}
              </select>
              <select aria-label="Village or tehsil" value={manualLocation.village} onChange={(e) => setManualLocationForm({ ...manualLocation, village: e.target.value })} disabled={!manualLocation.district} className="min-w-0 rounded-xl border border-emerald-500/40 bg-[#061e17] px-2 py-1.5 text-xs text-white outline-none disabled:opacity-50 focus:ring-2 focus:ring-emerald-400">
                <option value="">Village / tehsil</option>
                {getVillages(manualLocation.state, manualLocation.district).map((village) => <option key={village} value={village}>{village}</option>)}
              </select>
            </div>
            <button
              type="submit"
              disabled={!manualLocation.state || !manualLocation.district || !manualLocation.village}
              className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 transition"
            >
              {t('location.useThis')}
            </button>
          </form>
        )}
      </div>
    );
  }

  if (loading || permissionStatus === 'requesting') {
    return (
      <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-[#0c2a20]/80 px-4 py-2 text-emerald-50 shadow-md backdrop-blur-md">
        <span className="relative flex h-4 w-4 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-4 w-4 rounded-full bg-emerald-500" />
        </span>
        <span className="text-sm font-semibold text-emerald-200">{t('location.detecting')}</span>
      </div>
    );
  }

  if (permissionStatus === 'granted' && address) {
    const displayText = address.formatted || address.locality || address.city || address.district || t('location.deviceSource');
    const sourceLabel = source === 'manual' ? t('location.manualSource') : t('location.deviceSource');

    return (
      <div className="inline-flex flex-col items-start gap-1 rounded-2xl border border-emerald-500/20 bg-[#0c2a20]/80 px-4 py-2 text-emerald-50 shadow-md backdrop-blur-md">
        <div className="flex items-center gap-2">
          <MapPinIcon className="h-4 w-4 text-emerald-400 shrink-0" />
          <div className="text-left leading-tight">
            <span className="block text-sm font-bold text-white">📍 {displayText}</span>
            <span className="block text-[10px] text-emerald-300 font-normal">{sourceLabel}</span>
          </div>
          {source === 'device' && (
            <button
              onClick={handleRefresh}
              title={t('location.refresh')}
              className="ml-2 flex items-center gap-1 text-[10px] font-bold text-emerald-400 hover:text-white transition"
            >
              <ArrowPathIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('location.refresh')}</span>
            </button>
          )}
          {source === 'manual' && (
            <button
              onClick={() => setShowManualInput((v) => !v)}
              className="ml-2 text-[10px] font-bold text-emerald-400 hover:text-white transition"
            >
              ✏️
            </button>
          )}
        </div>

        {isLowAccuracy && (
          <p className="pl-6 text-[10px] text-amber-300 font-medium">{t('location.lowAccuracy')}</p>
        )}

        {showManualInput && (
          <ManualLocationForm
            location={manualLocation}
            onChange={setManualLocationForm}
            onSubmit={handleManualSubmit}
            tone="green"
            t={t}
          />
        )}
      </div>
    );
  }

  const errorMessages = {
    denied: { icon: '🔒', title: t('location.denied'), msg: t('location.deniedMessage') },
    unavailable: { icon: '📡', title: t('location.unavailable'), msg: t('location.unavailableMessage') },
    timeout: { icon: '⏱️', title: t('location.timeout'), msg: t('location.timeoutMessage') },
  };

  const errInfo = errorMessages[permissionStatus] || errorMessages.unavailable;

  return (
    <div className="inline-flex flex-col items-start gap-2 rounded-2xl border border-red-500/30 bg-[#2a0c0c]/80 px-4 py-3 text-red-100 shadow-md backdrop-blur-md">
      <div className="flex items-center gap-2">
        <span className="text-base">{errInfo.icon}</span>
        <span className="text-sm font-bold">{errInfo.title}</span>
      </div>
      <p className="pl-6 text-xs text-red-200/80">{errInfo.msg}</p>
      <div className="flex flex-wrap items-center gap-2 pl-6">
        <button
          onClick={handleAllowLocation}
          className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 transition"
        >
          {t('location.tryAgain')}
        </button>
        <button
          onClick={() => setShowManualInput((v) => !v)}
          className="text-xs font-medium text-red-200 underline hover:text-white transition"
        >
          {t('location.enterManually')}
        </button>
      </div>

      {showManualInput && (
        <ManualLocationForm
          location={manualLocation}
          onChange={setManualLocationForm}
          onSubmit={handleManualSubmit}
          tone="red"
          t={t}
        />
      )}
    </div>
  );
}

function ManualLocationForm({ location, onChange, onSubmit, tone, t }) {
  const isGreen = tone === 'green';
  const borderClass = isGreen ? 'border-emerald-500/40 bg-[#061e17]' : 'border-red-500/30 bg-[#1a0606]';
  const helperClass = isGreen ? 'text-emerald-300/80' : 'text-red-200/80';

  return (
    <form onSubmit={onSubmit} className="mt-1 w-full space-y-2 pl-6">
      <p className={`text-[11px] ${helperClass}`}>Select a valid state, district, and village / tehsil.</p>
      <div className="grid gap-2 sm:grid-cols-3">
        <select aria-label="State" value={location.state} onChange={(event) => onChange({ state: event.target.value, district: '', village: '' })} className={`min-w-0 rounded-xl border ${borderClass} px-2 py-1.5 text-xs text-white outline-none focus:ring-2 focus:ring-emerald-400`}>
          <option value="">State</option>
          {locationStates.map((state) => <option key={state} value={state}>{state}</option>)}
        </select>
        <select aria-label="District" value={location.district} onChange={(event) => onChange({ ...location, district: event.target.value, village: '' })} disabled={!location.state} className={`min-w-0 rounded-xl border ${borderClass} px-2 py-1.5 text-xs text-white outline-none disabled:opacity-50 focus:ring-2 focus:ring-emerald-400`}>
          <option value="">District</option>
          {getDistricts(location.state).map((district) => <option key={district} value={district}>{district}</option>)}
        </select>
        <select aria-label="Village or tehsil" value={location.village} onChange={(event) => onChange({ ...location, village: event.target.value })} disabled={!location.district} className={`min-w-0 rounded-xl border ${borderClass} px-2 py-1.5 text-xs text-white outline-none disabled:opacity-50 focus:ring-2 focus:ring-emerald-400`}>
          <option value="">Village / tehsil</option>
          {getVillages(location.state, location.district).map((village) => <option key={village} value={village}>{village}</option>)}
        </select>
      </div>
      <button type="submit" disabled={!location.state || !location.district || !location.village} className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 transition">
        {t('location.useThis')}
      </button>
    </form>
  );
}
