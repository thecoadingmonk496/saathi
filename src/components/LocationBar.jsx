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
      <div className={"inline-flex flex-col items-start gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 shadow-sm "}>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--color-surface-alt)]">
            <MapPinIcon className="h-4.5 w-4.5 text-[var(--color-primary)]" />
          </div>
          <span className="text-sm font-semibold text-[var(--color-text)]">{t('location.notSet')}</span>
        </div>

        {!compact && (
          <div className="space-y-1 text-xs text-[var(--color-text-secondary)] pl-10">
            <p>✓ {t('location.benefit1')}</p>
            <p>✓ {t('location.benefit2')}</p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pl-10">
          <button
            onClick={handleAllowLocation}
            className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--color-primary-dark)] transition focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)]"
          >
            {t('location.useMyLocation')}
          </button>
          <button
            onClick={() => setShowManualInput((v) => !v)}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-xs font-bold text-[var(--color-primary)] hover:bg-[var(--color-surface-alt)] transition focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)]"
          >
            {t('location.enterManually')}
          </button>
        </div>

        {showManualInput && (
          <form onSubmit={handleManualSubmit} className="w-full space-y-2 pl-10 mt-2">
            <p className="text-xs text-[var(--color-text-muted)]">Select a valid state, district, and village / tehsil.</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <select aria-label="State" value={manualLocation.state} onChange={(e) => setManualLocationForm({ state: e.target.value, district: '', village: '' })} className="min-w-0 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-2 text-xs text-[var(--color-text)] outline-none focus:ring-2 focus:border-[var(--color-focus)]">
                <option value="">State</option>
                {locationStates.map((state) => <option key={state} value={state}>{state}</option>)}
              </select>
              <select aria-label="District" value={manualLocation.district} onChange={(e) => setManualLocationForm({ ...manualLocation, district: e.target.value, village: '' })} disabled={!manualLocation.state} className="min-w-0 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-2 text-xs text-[var(--color-text)] outline-none disabled:opacity-50 focus:ring-2 focus:border-[var(--color-focus)]">
                <option value="">District</option>
                {getDistricts(manualLocation.state).map((district) => <option key={district} value={district}>{district}</option>)}
              </select>
              <select aria-label="Village or tehsil" value={manualLocation.village} onChange={(e) => setManualLocationForm({ ...manualLocation, village: e.target.value })} disabled={!manualLocation.district} className="min-w-0 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-2 text-xs text-[var(--color-text)] outline-none disabled:opacity-50 focus:ring-2 focus:border-[var(--color-focus)]">
                <option value="">Village / tehsil</option>
                {getVillages(manualLocation.state, manualLocation.district).map((village) => <option key={village} value={village}>{village}</option>)}
              </select>
            </div>
            <button
              type="submit"
              disabled={!manualLocation.state || !manualLocation.district || !manualLocation.village}
              className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--color-primary-dark)] disabled:cursor-not-allowed disabled:opacity-50 transition mt-2"
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
      <div className="inline-flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 shadow-sm">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--color-surface-alt)]">
          <span className="relative flex h-3.5 w-3.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-primary)] opacity-75" />
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-[var(--color-primary-dark)]" />
          </span>
        </div>
        <span className="text-sm font-semibold text-[var(--color-text)]">{t('location.detecting')}</span>
      </div>
    );
  }

  if (permissionStatus === 'granted' && address) {
    const displayText = address.formatted || address.locality || address.city || address.district || t('location.deviceSource');
    const sourceLabel = source === 'manual' ? t('location.manualSource') : t('location.deviceSource');

    return (
      <div className="inline-flex flex-col items-start gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-red-50 text-[var(--color-focus)]">
            <MapPinIcon className="h-5 w-5" />
          </div>
          <div className="text-left leading-tight">
            <span className="block text-sm font-bold text-[var(--color-text)]">{displayText}</span>
            <span className="block text-xs text-[var(--color-text-muted)] font-normal mt-0.5">{sourceLabel}</span>
          </div>
          <div className="ml-2 flex items-center gap-1.5">
            {source === 'device' && (
              <button
                onClick={handleRefresh}
                title={t('location.refresh')}
                className="flex items-center gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs font-bold text-[var(--color-primary)] hover:bg-[var(--color-surface-alt)] transition"
              >
                <ArrowPathIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t('location.refresh')}</span>
              </button>
            )}
            {source === 'manual' && (
              <button
                onClick={() => setShowManualInput((v) => !v)}
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-bold text-[var(--color-primary)] hover:bg-[var(--color-surface-alt)] transition"
              >
                Change Region
              </button>
            )}
          </div>
        </div>

        {isLowAccuracy && (
          <p className="pl-12 text-xs text-[var(--color-focus)] font-medium">{t('location.lowAccuracy')}</p>
        )}

        {showManualInput && (
          <ManualLocationForm
            location={manualLocation}
            onChange={setManualLocationForm}
            onSubmit={handleManualSubmit}
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
    <div className="inline-flex flex-col items-start gap-2 rounded-lg border border-[var(--color-focus)] bg-red-50 px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="text-base">{errInfo.icon}</span>
        <span className="text-sm font-bold text-[var(--color-focus)]">{errInfo.title}</span>
      </div>
      <p className="pl-7 text-xs text-[var(--color-focus)]">{errInfo.msg}</p>
      <div className="flex flex-wrap items-center gap-2 pl-7 mt-1">
        <button
          onClick={handleAllowLocation}
          className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--color-primary-dark)] transition"
        >
          {t('location.tryAgain')}
        </button>
        <button
          onClick={() => setShowManualInput((v) => !v)}
          className="rounded-md border border-[var(--color-border)] bg-white px-4 py-2 text-xs font-bold text-[var(--color-primary)] hover:bg-[var(--color-surface-alt)] transition"
        >
          {t('location.enterManually')}
        </button>
      </div>

      {showManualInput && (
        <ManualLocationForm
          location={manualLocation}
          onChange={setManualLocationForm}
          onSubmit={handleManualSubmit}
          t={t}
        />
      )}
    </div>
  );
}

function ManualLocationForm({ location, onChange, onSubmit, t }) {
  return (
    <form onSubmit={onSubmit} className="mt-2 w-full space-y-2 pl-7 sm:pl-12">
      <p className="text-xs text-[var(--color-text-muted)]">Select a valid state, district, and village / tehsil.</p>
      <div className="grid gap-2 sm:grid-cols-3">
        <select aria-label="State" value={location.state} onChange={(event) => onChange({ state: event.target.value, district: '', village: '' })} className="min-w-0 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-2 text-xs text-[var(--color-text)] outline-none focus:ring-2 focus:border-[var(--color-focus)]">
          <option value="">State</option>
          {locationStates.map((state) => <option key={state} value={state}>{state}</option>)}
        </select>
        <select aria-label="District" value={location.district} onChange={(event) => onChange({ ...location, district: event.target.value, village: '' })} disabled={!location.state} className="min-w-0 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-2 text-xs text-[var(--color-text)] outline-none disabled:opacity-50 focus:ring-2 focus:border-[var(--color-focus)]">
          <option value="">District</option>
          {getDistricts(location.state).map((district) => <option key={district} value={district}>{district}</option>)}
        </select>
        <select aria-label="Village or tehsil" value={location.village} onChange={(event) => onChange({ ...location, village: event.target.value })} disabled={!location.district} className="min-w-0 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-2 text-xs text-[var(--color-text)] outline-none disabled:opacity-50 focus:ring-2 focus:border-[var(--color-focus)]">
          <option value="">Village / tehsil</option>
          {getVillages(location.state, location.district).map((village) => <option key={village} value={village}>{village}</option>)}
        </select>
      </div>
      <button type="submit" disabled={!location.state || !location.district || !location.village} className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--color-primary-dark)] disabled:cursor-not-allowed disabled:opacity-50 transition mt-2">
        {t('location.useThis')}
      </button>
    </form>
  );
}
