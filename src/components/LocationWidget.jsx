import { useState } from 'react';
import { MapPinIcon, ArrowPathIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useLocationContext } from '../context/LocationContext';
import { useUser } from '../context/UserContext';
import { getDistricts, getVillages, locationStates } from '../utils/locationOptions';

/**
 * LocationWidget — A compact, premium location selector bar
 * Supports: GPS detect, manual dropdown, refresh, and error handling
 *
 * @param {'pill'|'bar'|'panel'} variant — layout style
 */
export default function LocationWidget({ variant = 'bar', className = '' }) {
  const { t } = useUser();
  const {
    address,
    source,
    permissionStatus,
    loading,
    error,
    accuracy,
    requestLocation,
    refreshLocation,
    setManualLocation,
  } = useLocationContext();

  const [showManual, setShowManual] = useState(false);
  const [form, setForm] = useState({ state: '', district: '', village: '' });
  const [submitted, setSubmitted] = useState(false);

  const isLowAccuracy = accuracy != null && accuracy > 1000;
  const hasLocation = permissionStatus === 'granted' && address;
  const isLoading = loading || permissionStatus === 'requesting';

  const displayLocation = hasLocation
    ? (address.locality || address.city || address.district
        ? [address.locality, address.district, address.state].filter(Boolean).join(', ')
        : address.formatted || '')
    : '';

  const handleGPS = () => {
    setShowManual(false);
    requestLocation();
  };

  const handleRefresh = () => {
    refreshLocation();
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (form.state && form.district && form.village) {
      setManualLocation(form);
      setShowManual(false);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 2000);
      setForm({ state: '', district: '', village: '' });
    }
  };

  // ─── Pill variant: tiny inline chip for nav bar ──────────────────────────
  if (variant === 'pill') {
    return (
      <div className={`relative flex items-center ${className}`}>
        {isLoading ? (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--saathi-text-secondary)] animate-pulse">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-ping inline-block" />
            Detecting…
          </span>
        ) : hasLocation ? (
          <button
            onClick={() => setShowManual(v => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold text-[var(--saathi-text)] hover:text-[var(--saathi-accent)] transition-colors group"
          >
            <MapPinIcon className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
            <span className="max-w-[140px] truncate">{displayLocation || 'Set location'}</span>
            <span className="text-[var(--saathi-text-muted)] group-hover:text-[var(--saathi-accent)] text-xs">▾</span>
          </button>
        ) : (
          <button
            onClick={handleGPS}
            className="flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 transition-colors"
          >
            <MapPinIcon className="h-3.5 w-3.5" />
            Set your location
          </button>
        )}

        {/* Dropdown for manual input when pill is clicked */}
        {showManual && (
          <div className="absolute top-7 left-0 z-50 w-72 bg-white rounded-xl shadow-xl border border-[var(--saathi-border-light)] p-4 animate-fade-in">
            <ManualLocationDropdown
              form={form}
              onChange={setForm}
              onSubmit={handleManualSubmit}
              onGPS={handleGPS}
              onClose={() => setShowManual(false)}
            />
          </div>
        )}
      </div>
    );
  }

  // ─── Bar variant: full-width banner shown on page ────────────────────────
  if (variant === 'bar') {
    return (
      <div className={`w-full ${className}`}>
        {/* Main location banner */}
        <div className={`relative flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 rounded-2xl border px-5 py-4 transition-all
          ${hasLocation
            ? 'bg-[var(--saathi-primary)]/5 border-[var(--saathi-primary)]/20'
            : isLoading
              ? 'bg-slate-50 border-slate-200'
              : error || permissionStatus === 'denied'
                ? 'bg-red-50 border-red-200'
                : 'bg-white border-[var(--saathi-border-light)] shadow-sm'
          }`}>

          {/* Icon */}
          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl 
            ${hasLocation ? 'bg-[var(--saathi-primary)] text-white' : 'bg-red-100 text-red-600'}`}>
            {isLoading
              ? <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              : <MapPinIcon className="h-5 w-5" />
            }
          </div>

          {/* Text content */}
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <div>
                <p className="text-sm font-bold text-[var(--saathi-text)]">Detecting your location…</p>
                <p className="text-xs text-[var(--saathi-text-muted)] mt-0.5">Please allow location access if prompted.</p>
              </div>
            ) : hasLocation ? (
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-extrabold text-[var(--saathi-primary)] truncate">{displayLocation}</p>
                  {source === 'device' && (
                    <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      <CheckIcon className="h-3 w-3" />GPS
                    </span>
                  )}
                  {source === 'manual' && (
                    <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                      ✎ Manual
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--saathi-text-muted)] mt-0.5">
                  {isLowAccuracy
                    ? '⚠ Low GPS accuracy — consider entering manually'
                    : 'Prices and buyers shown for this region'}
                </p>
              </div>
            ) : permissionStatus === 'denied' || error ? (
              <div>
                <p className="text-sm font-bold text-red-700">Location access denied</p>
                <p className="text-xs text-red-600 mt-0.5">Enter your location manually to see regional data.</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-bold text-[var(--saathi-text)]">Set your location for better results</p>
                <p className="text-xs text-[var(--saathi-text-muted)] mt-0.5">See prices and buyers near you. ✓ Saved for this session.</p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {!isLoading && !hasLocation && (
              <button
                onClick={handleGPS}
                className="flex items-center gap-1.5 rounded-xl bg-[var(--saathi-primary)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--saathi-primary-hover)] transition-colors shadow-sm"
              >
                <MapPinIcon className="h-3.5 w-3.5" />
                Use GPS
              </button>
            )}
            {hasLocation && source === 'device' && (
              <button
                onClick={handleRefresh}
                className="flex items-center gap-1.5 rounded-xl border border-[var(--saathi-border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--saathi-text-secondary)] hover:text-[var(--saathi-primary)] hover:border-[var(--saathi-primary)]/30 transition-colors"
              >
                <ArrowPathIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            )}
            <button
              onClick={() => setShowManual(v => !v)}
              className={`flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-bold transition-colors
                ${showManual
                  ? 'bg-[var(--saathi-primary)] text-white border-[var(--saathi-primary)]'
                  : 'border-[var(--saathi-border)] bg-white text-[var(--saathi-text)] hover:border-[var(--saathi-primary)]/40 hover:text-[var(--saathi-primary)]'
                }`}
            >
              {hasLocation ? 'Change' : 'Enter Manually'}
            </button>
          </div>
        </div>

        {/* Expanding manual location form */}
        {showManual && (
          <div className="mt-3 rounded-2xl border border-[var(--saathi-border-light)] bg-white p-5 shadow-sm animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-extrabold text-[var(--saathi-text)]">Select Your Region</h3>
              <button onClick={() => setShowManual(false)} className="text-[var(--saathi-text-muted)] hover:text-[var(--saathi-text)] transition-colors">
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
            <ManualLocationDropdown
              form={form}
              onChange={setForm}
              onSubmit={handleManualSubmit}
              onGPS={handleGPS}
              onClose={() => setShowManual(false)}
              showGPS={!hasLocation || source !== 'device'}
            />
          </div>
        )}
      </div>
    );
  }

  // ─── Panel variant: vertical card (for dashboard / sidebar) ──────────────
  return (
    <div className={`rounded-2xl border border-[var(--saathi-border-light)] bg-white shadow-sm overflow-hidden ${className}`}>
      {/* Header */}
      <div className={`px-5 py-4 flex items-center gap-3 ${hasLocation ? 'bg-[var(--saathi-primary)]' : 'bg-[var(--saathi-surface-alt)]'}`}>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
          <MapPinIcon className={`h-5 w-5 ${hasLocation ? 'text-white' : 'text-red-600'}`} />
        </div>
        <div>
          <p className={`text-xs font-semibold uppercase tracking-wider ${hasLocation ? 'text-white/70' : 'text-[var(--saathi-text-muted)]'}`}>
            Your Location
          </p>
          <p className={`text-sm font-extrabold ${hasLocation ? 'text-white' : 'text-[var(--saathi-text)]'}`}>
            {isLoading ? 'Detecting…' : hasLocation ? (displayLocation || 'Location set') : 'Not Set'}
          </p>
        </div>
        {hasLocation && source === 'device' && (
          <button onClick={handleRefresh} className="ml-auto text-white/70 hover:text-white transition-colors">
            <ArrowPathIcon className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="p-4">
        {hasLocation ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 text-center divide-x divide-[var(--saathi-border-light)]">
              {[
                { label: 'Village', val: address?.locality || '—' },
                { label: 'District', val: address?.district || '—' },
                { label: 'State', val: address?.state || '—' },
              ].map(({ label, val }) => (
                <div key={label} className="px-2 first:pl-0 last:pr-0">
                  <p className="text-xs font-semibold text-[var(--saathi-text-muted)] uppercase">{label}</p>
                  <p className="text-xs font-bold text-[var(--saathi-text)] mt-0.5 truncate">{val}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowManual(v => !v)}
              className="w-full rounded-xl border border-[var(--saathi-border)] py-2 text-xs font-bold text-[var(--saathi-text-secondary)] hover:text-[var(--saathi-primary)] hover:border-[var(--saathi-primary)]/40 transition-colors"
            >
              Change Region
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            <button
              onClick={handleGPS}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--saathi-primary)] py-2.5 text-xs font-extrabold text-white hover:bg-[var(--saathi-primary-hover)] transition-colors"
            >
              <MapPinIcon className="h-3.5 w-3.5" /> Use GPS Location
            </button>
            <button
              onClick={() => setShowManual(v => !v)}
              className="w-full rounded-xl border border-[var(--saathi-border)] py-2 text-xs font-bold text-[var(--saathi-text-secondary)] hover:border-[var(--saathi-primary)]/40 hover:text-[var(--saathi-primary)] transition-colors"
            >
              Enter Manually
            </button>
          </div>
        )}
        {showManual && (
          <div className="mt-4 border-t border-[var(--saathi-border-light)] pt-4">
            <ManualLocationDropdown
              form={form}
              onChange={setForm}
              onSubmit={handleManualSubmit}
              onGPS={handleGPS}
              onClose={() => setShowManual(false)}
              compact
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Shared manual location form ─────────────────────────────────────────────
function ManualLocationDropdown({ form, onChange, onSubmit, onGPS, onClose, compact = false, showGPS = true }) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className={`grid gap-2 ${compact ? 'grid-cols-1' : 'sm:grid-cols-3'}`}>
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--saathi-text-muted)]">State</label>
          <select
            value={form.state}
            onChange={e => onChange({ state: e.target.value, district: '', village: '' })}
            className="w-full rounded-lg border border-[var(--saathi-border)] bg-[var(--saathi-surface-alt)] px-3 py-2 text-xs font-semibold text-[var(--saathi-text)] focus:outline-none focus:border-[var(--saathi-accent)] focus:ring-2 focus:ring-red-100 transition"
          >
            <option value="">Select State</option>
            {locationStates.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--saathi-text-muted)]">District</label>
          <select
            value={form.district}
            onChange={e => onChange({ ...form, district: e.target.value, village: '' })}
            disabled={!form.state}
            className="w-full rounded-lg border border-[var(--saathi-border)] bg-[var(--saathi-surface-alt)] px-3 py-2 text-xs font-semibold text-[var(--saathi-text)] disabled:opacity-40 focus:outline-none focus:border-[var(--saathi-accent)] focus:ring-2 focus:ring-red-100 transition"
          >
            <option value="">Select District</option>
            {getDistricts(form.state).map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--saathi-text-muted)]">Village / Tehsil</label>
          <select
            value={form.village}
            onChange={e => onChange({ ...form, village: e.target.value })}
            disabled={!form.district}
            className="w-full rounded-lg border border-[var(--saathi-border)] bg-[var(--saathi-surface-alt)] px-3 py-2 text-xs font-semibold text-[var(--saathi-text)] disabled:opacity-40 focus:outline-none focus:border-[var(--saathi-accent)] focus:ring-2 focus:ring-red-100 transition"
          >
            <option value="">Select Village</option>
            {getVillages(form.state, form.district).map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={!form.state || !form.district || !form.village}
          className="flex-1 rounded-xl bg-[var(--saathi-primary)] px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--saathi-primary-hover)] transition-colors"
        >
          Apply Location
        </button>
        {showGPS && (
          <button
            type="button"
            onClick={onGPS}
            className="flex items-center gap-1.5 rounded-xl border border-[var(--saathi-border)] px-4 py-2.5 text-xs font-bold text-[var(--saathi-text-secondary)] hover:text-[var(--saathi-primary)] hover:border-[var(--saathi-primary)]/40 transition-colors"
          >
            <MapPinIcon className="h-3.5 w-3.5" /> GPS
          </button>
        )}
      </div>
    </form>
  );
}
