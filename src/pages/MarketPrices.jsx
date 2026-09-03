import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useLocationContext } from '../context/LocationContext';
import { marketService } from '../api/marketService';
import { locationStates, getDistricts } from '../utils/locationOptions';

const formatRupees = (price) => {
  if (price === undefined || price === null || isNaN(price) || price === 0) return '—';
  return `₹${Number(price).toLocaleString('en-IN')}`;
};

// Convert DD/MM/YYYY arrival_date into a comparable numeric value (null if unparseable)
const parseArrivalDateValue = (dateStr) => {
  const match = String(dateStr || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  return Number(`${match[3]}${match[2].padStart(2, '0')}${match[1].padStart(2, '0')}`);
};

// Crop Badge Icon Component for Popular Crops Tab Bar
const CropBadgeIcon = ({ crop, isSelected }) => {
  const c = String(crop || '').toLowerCase();
  if (c === 'wheat') {
    return (
      <svg className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? '' : 'group-hover:scale-110'}`} viewBox="0 0 24 24" fill="none">
        <path d="M5 21C6 17 9 13 15 9" stroke={isSelected ? '#ffffff' : '#b45309'} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M17.5 4.5C16.8 5.5 16 6.8 15 8C14.2 7 14 5.5 15.2 4.2C16.2 3.1 17.8 3.8 17.5 4.5Z" fill="#d97706" stroke={isSelected ? '#ffffff' : '#b45309'} strokeWidth="0.6" />
        <path d="M14.5 7.5C13.6 8.7 12.8 9.9 12 11C11.1 10.1 10.9 8.8 12 7.7C13 6.7 14.7 7 14.5 7.5Z" fill="#f59e0b" stroke={isSelected ? '#ffffff' : '#b45309'} strokeWidth="0.6" />
        <path d="M11.5 10.5C10.6 11.8 9.8 13 9 14.2C8.2 13.3 8.1 12 9.1 11C10.1 10 11.7 10.1 11.5 10.5Z" fill="#fbbf24" stroke={isSelected ? '#ffffff' : '#b45309'} strokeWidth="0.6" />
      </svg>
    );
  }
  if (c === 'paddy' || c === 'rice') {
    return (
      <svg className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? '' : 'group-hover:scale-110'}`} viewBox="0 0 24 24" fill="none">
        <path d="M12 21V12" stroke={isSelected ? '#ffffff' : '#047857'} strokeWidth="1.75" strokeLinecap="round" />
        <path d="M12 14.5C12 14.5 9 13.5 7.5 10C6 6.5 8 3.5 11.5 4C11.5 6.5 11.5 10 12 14.5Z" fill={isSelected ? '#ffffff' : '#10b981'} stroke={isSelected ? '#ffffff' : '#047857'} strokeWidth="0.6" />
        <path d="M12 13C12 13 15 11.5 16.5 8.5C18 5.5 16.5 2.5 13 3C13 5.5 12.5 9 12 13Z" fill={isSelected ? '#ffffff' : '#34d399'} stroke={isSelected ? '#ffffff' : '#047857'} strokeWidth="0.6" />
      </svg>
    );
  }
  if (c === 'potato') {
    return (
      <svg className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? '' : 'group-hover:scale-110'}`} viewBox="0 0 24 24" fill="none">
        <path d="M5.5 14C4 11 5 7.5 8.5 5.5C12 3.5 16.5 4 19 6.5C21.5 9 21 13 18.5 16C16 19 12 20 8.5 19C6 18.2 4.5 16.5 5.5 14Z" fill={isSelected ? '#ffffff' : '#b7844d'} stroke={isSelected ? '#ffffff' : '#784c25'} strokeWidth="0.75" />
      </svg>
    );
  }
  if (c === 'tomato' || c === 'apple') {
    return (
      <svg className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? '' : 'group-hover:scale-110'}`} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="13" r="7" fill={isSelected ? '#ffffff' : '#ef4444'} stroke={isSelected ? '#ffffff' : '#b91c1c'} strokeWidth="0.75" />
        <path d="M12 6V4M10 5L14 5" stroke={isSelected ? '#ffffff' : '#15803d'} strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    );
  }
  if (c === 'maize') {
    return (
      <svg className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? '' : 'group-hover:scale-110'}`} viewBox="0 0 24 24" fill="none">
        <path d="M17 3C14 3.5 9.5 8 7 13.5C9.5 16 13 18.5 17.5 16.5C19 13.5 19.5 7.5 17 3Z" fill={isSelected ? '#ffffff' : '#eab308'} stroke={isSelected ? '#ffffff' : '#a16207'} strokeWidth="0.6" />
      </svg>
    );
  }
  return <span className="text-xs">🌾</span>;
};

export default function MarketPrices() {
  const { t } = useUser();
  const { address, permissionStatus, requestLocation } = useLocationContext();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filter states
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [commoditySearch, setCommoditySearch] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Dropdown list states
  const [statesList, setStatesList] = useState([]);
  const [districtsList, setDistrictsList] = useState([]);
  const [statesLoading, setStatesLoading] = useState(false);
  const [districtsLoading, setDistrictsLoading] = useState(false);

  // Manual override tracker for dynamic selectors
  const [hasManualOverride, setHasManualOverride] = useState(false);

  // Top price highlight states
  const [topRecordHistory, setTopRecordHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const highlightRef = useRef(null);

  // Suggestions/Popular crops list
  const popularCrops = ['Wheat', 'Paddy', 'Potato', 'Tomato', 'Onion', 'Mustard', 'Maize'];

  // 1. Initialize location filters on load if available
  // 1. Initialize location filters dynamically based on user address context
  useEffect(() => {
    if (hasManualOverride || !address || statesList.length === 0) return;

    const detectState = address.state || '';
    const detectDistrict = address.district || '';

    if (detectState) {
      // Find case-insensitive match in the fetched states list
      const matchedState = statesList.find(
        s => s.toLowerCase() === detectState.toLowerCase()
      );

      if (matchedState) {
        setSelectedState(matchedState);

        // Pre-fetch districts for this state to verify a case-insensitive district match
        marketService.getGovernmentMandiDistricts(matchedState)
          .then(list => {
            if (Array.isArray(list) && list.length > 0) {
              setDistrictsList(list);
              if (detectDistrict) {
                const matchedDistrict = list.find(
                  d => d.toLowerCase() === detectDistrict.toLowerCase()
                );
                if (matchedDistrict) {
                  setSelectedDistrict(matchedDistrict);
                } else {
                  setSelectedDistrict('');
                }
              }
            }
          })
          .catch(err => {
            console.error('Failed to auto-fetch districts for matched state:', err);
          });
      }
    }
  }, [address, statesList, hasManualOverride]);


  // 1a. Load states list from API on mount
  useEffect(() => {
    const loadStates = async () => {
      setStatesLoading(true);
      try {
        const list = await marketService.getGovernmentMandiStates();
        if (Array.isArray(list) && list.length > 0) {
          setStatesList(list);
        } else {
          setStatesList(locationStates);
        }
      } catch (err) {
        console.error('Failed to load states list:', err);
        setStatesList(locationStates);
      } finally {
        setStatesLoading(false);
      }
    };
    loadStates();
  }, []);

  // 1b. Load districts list when selectedState changes
  useEffect(() => {
    if (!selectedState) {
      setDistrictsList([]);
      return;
    }

    const loadDistricts = async () => {
      setDistrictsLoading(true);
      try {
        const list = await marketService.getGovernmentMandiDistricts(selectedState);
        if (Array.isArray(list) && list.length > 0) {
          setDistrictsList(list);
        } else {
          setDistrictsList(getDistricts(selectedState));
        }
      } catch (err) {
        console.error('Failed to load districts list:', err);
        setDistrictsList(getDistricts(selectedState));
      } finally {
        setDistrictsLoading(false);
      }
    };
    loadDistricts();
  }, [selectedState]);

  // 2. Read URL search params for voice search integration
  useEffect(() => {
    const searchVal = searchParams.get('search') || searchParams.get('commodity');
    if (searchVal) {
      setCommoditySearch(searchVal);
    }
  }, [searchParams]);

  // 3. Fetch Mandi Prices from API
  const fetchPrices = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const response = await marketService.getGovernmentMandiPrices({
        commodity: commoditySearch,
        state: selectedState,
        district: selectedDistrict,
        limit: 100
      });

      if (response && response.success) {
        setRecords(response.records || []);
      } else {
        setRecords([]);
        setErrorMsg(response.message || t('common.error'));
      }
    } catch (err) {
      console.error(err);
      setRecords([]);
      setErrorMsg(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  // Trigger fetch when filters change
  useEffect(() => {
    fetchPrices();
  }, [selectedState, selectedDistrict, commoditySearch]);

  const handleStateChange = (e) => {
    const state = e.target.value;
    setHasManualOverride(true);
    setSelectedState(state);
    setSelectedDistrict('');
    setDistrictsList([]);
  };

  const handleDistrictChange = (e) => {
    setHasManualOverride(true);
    setSelectedDistrict(e.target.value);
  };

  const handleUseDetectedLocation = () => {
    setHasManualOverride(false);
  };


  const handleClearFilters = () => {
    setSelectedState('');
    setSelectedDistrict('');
    setCommoditySearch('');
    setSearchParams({});
  };

  // Map commodity names to regional names in UI if available
  const getRegionalCropName = (cropName) => {
    if (!cropName || typeof cropName !== 'string') return cropName || '';
    const cleanKey = cropName.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
    const translationKey = `crop.${cleanKey}`;
    try {
      const translated = t(translationKey);
      if (translated && typeof translated === 'string' && translated !== translationKey && translated !== 'undefined') {
        return translated;
      }
    } catch {
      // Fallback
    }
    return cropName;
  };

  // Compute highest price record from current records list
  const highestPriceRecord = (records && records.length > 0)
    ? records.reduce((max, current) => {
        return (Number(current.modal_price) > Number(max?.modal_price || 0)) ? current : max;
      }, null)
    : null;

  // Detect whether shown data is "most recent available" rather than today's report
  // (backend flags records with isLatestAvailable; we also verify via dates as a safeguard)
  const latestArrivalDate = (() => {
    let latest = null;
    let latestValue = -Infinity;
    for (const record of records) {
      const value = parseArrivalDateValue(record.arrival_date);
      if (value !== null && value > latestValue) {
        latestValue = value;
        latest = record.arrival_date;
      }
    }
    return latest;
  })();
  const showLatestAvailableNote =
    records.length > 0 &&
    latestArrivalDate !== null &&
    latestArrivalDate !== getTodayDateString();

  // Track user interaction for smooth scroll override
  useEffect(() => {
    const handleInteraction = () => {
      setUserInteracted(true);
    };
    window.addEventListener('scroll', handleInteraction, { passive: true });
    window.addEventListener('touchstart', handleInteraction, { passive: true });
    window.addEventListener('mousedown', handleInteraction, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('mousedown', handleInteraction);
    };
  }, []);

  // Fetch trend history for the highest priced commodity
  useEffect(() => {
    if (!highestPriceRecord) {
      setTopRecordHistory([]);
      return;
    }

    let isSubscribed = true;
    setHistoryLoading(true);

    marketService.getPriceHistory({
      commodity: highestPriceRecord.commodity,
      district: highestPriceRecord.district,
      state: highestPriceRecord.state,
      market: highestPriceRecord.market,
      days: 7
    })
    .then(data => {
      if (isSubscribed && Array.isArray(data)) {
        setTopRecordHistory(data);
      }
    })
    .catch(err => {
      console.error('[MarketPrices] Failed to fetch price history:', err);
      if (isSubscribed) setTopRecordHistory([]);
    })
    .finally(() => {
      if (isSubscribed) setHistoryLoading(false);
    });

    return () => {
      isSubscribed = false;
    };
  }, [
    highestPriceRecord?.commodity,
    highestPriceRecord?.market,
    highestPriceRecord?.district,
    highestPriceRecord?.state
  ]);

  // Smooth scroll top highlight card into view if it starts outside the viewport on load
  useEffect(() => {
    if (highestPriceRecord && highlightRef.current && !userInteracted) {
      const rect = highlightRef.current.getBoundingClientRect();
      const inViewport = (
        rect.top >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight)
      );
      if (!inViewport) {
        const timer = setTimeout(() => {
          highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [highestPriceRecord?.commodity, userInteracted]);

  const getTrendIndicator = () => {
    if (!topRecordHistory || topRecordHistory.length < 2) return null;

    const firstPrice = Number(topRecordHistory[0].modal_price);
    const latestPrice = Number(topRecordHistory[topRecordHistory.length - 1].modal_price);
    if (!firstPrice || !latestPrice) return null;

    const pct = ((latestPrice - firstPrice) / firstPrice) * 100;
    const isUp = latestPrice >= firstPrice;

    return {
      percentText: `${isUp ? '▲' : '▼'} ${Math.abs(pct).toFixed(1)}%`,
      isUp,
      colorClass: isUp ? 'text-[var(--saathi-primary)] bg-[var(--saathi-surface-alt)] border-[var(--saathi-border)]' : 'text-[#D32F2F] bg-red-50 border-red-200'
    };
  };

  const renderSparkline = () => {
    if (!topRecordHistory || topRecordHistory.length < 2) return null;

    const prices = topRecordHistory.map(h => Number(h.modal_price));
    const maxVal = Math.max(...prices);
    const minVal = Math.min(...prices);
    const range = maxVal - minVal || 1;

    const width = 120;
    const height = 36;
    const padding = 2;

    const points = topRecordHistory.map((h, i) => {
      const x = padding + (i / (topRecordHistory.length - 1)) * (width - 2 * padding);
      const y = padding + (height - 2 * padding) - ((Number(h.modal_price) - minVal) / range) * (height - 2 * padding);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    const isUp = prices[prices.length - 1] >= prices[0];
    const strokeColor = isUp ? '#2E7D32' : '#D32F2F';

    const lastX = padding + (width - 2 * padding);
    const lastY = padding + (height - 2 * padding) - ((prices[prices.length - 1] - minVal) / range) * (height - 2 * padding);

    return (
      <svg width={width} height={height} className="overflow-visible">
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor={strokeColor} floodOpacity="0.25" />
          </filter>
        </defs>
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
          filter="url(#glow)"
        />
        <circle
          cx={lastX}
          cy={lastY}
          r="3.5"
          fill={strokeColor}
          stroke="#FFFFFF"
          strokeWidth="1.5"
        />
      </svg>
    );
  };

  // districtsOptions is replaced by the dynamic districtsList state variable.
  const showResetLocation = address?.state && (
    (selectedState && selectedState.toLowerCase() !== address.state.toLowerCase()) ||
    (selectedDistrict && selectedDistrict.toLowerCase() !== (address.district || '').toLowerCase())
  );

  return (
    <section className="mx-auto w-full max-w-6xl pb-10 text-[var(--saathi-text)]">
      <header className="mb-6">
        <p className="text-xs font-extrabold uppercase tracking-widest text-[var(--saathi-primary)]">{t('prices.tagline')}</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">{t('prices.title')}</h1>

        {/* Location Detection Panel */}
        <div className="mt-5 flex flex-col gap-3 rounded-2xl bg-white p-4 border border-[var(--saathi-border-light)] shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="text-2xl mt-0.5" role="img" aria-label="Pin">📍</span>
            <div>
              <p className="text-sm font-bold text-[var(--saathi-text)]">
                {address?.formatted || t('location.notSet')}
              </p>
              <p className="text-xs font-medium text-[var(--saathi-text-muted)] mt-0.5">
                {permissionStatus === 'granted' ? t('prices.autoDetected') : t('location.notSet')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={requestLocation}
            className="rounded-lg px-3 py-2 text-sm font-bold text-[var(--saathi-primary)] transition hover:bg-[var(--saathi-surface-alt)] hover:underline whitespace-nowrap focus:outline-none"
          >
            {t('prices.changeLoc')}
          </button>
        </div>

        {/* Update note */}
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/75 px-3 py-2 shadow-sm backdrop-blur-sm">
          <span className="flex h-2.5 w-2.5 rounded-full bg-[var(--saathi-primary)]"></span>
          <p className="text-sm font-semibold text-[var(--saathi-text-secondary)]">{t('prices.marketUpdatedToday')} ({getTodayDateString()})</p>
          <span className="mx-2 text-slate-400">•</span>
          <p className="text-xs font-semibold text-[var(--saathi-text-secondary)]">{t('prices.dataSource')}</p>
        </div>
      </header>

      {/* Top Price Highlight Block */}
      {highestPriceRecord && (
        <div
          ref={highlightRef}
          key={highestPriceRecord.commodity + '-' + highestPriceRecord.market}
          className="mb-6 rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50/55 border border-amber-200 p-6 shadow-sm animate-top-highlight"
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            {/* Crop Info */}
            <div className="flex items-start gap-3">
              <span className="text-3xl mt-1" role="img" aria-label="Flame">🔥</span>
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-amber-800">
                  {showLatestAvailableNote
                    ? (t('prices.highestRecent') || 'Highest Recent Price')
                    : (t('prices.highestToday') || 'Highest Price Today')}
                </p>
                <h2 className="text-2xl font-extrabold text-[var(--saathi-text)] mt-0.5">
                  {getRegionalCropName(highestPriceRecord.commodity) || highestPriceRecord.commodity || 'Highest Selling Crop'}
                  {highestPriceRecord.variety && !['other', 'faq'].includes(highestPriceRecord.variety.toLowerCase().trim()) && (
                    <span className="text-sm font-semibold text-[var(--saathi-text-muted)] ml-2">
                      ({highestPriceRecord.variety})
                    </span>
                  )}
                </h2>
                <p className="text-sm font-medium text-[var(--saathi-text-secondary)] mt-1">
                  {highestPriceRecord.market}, {highestPriceRecord.district}, {highestPriceRecord.state}
                </p>
              </div>
            </div>

            {/* Price & Sparkline */}
            <div className="flex items-center gap-6 self-start sm:self-auto">
              {/* Price Details */}
              <div className="text-right">
                <p className="text-3xl font-black tracking-tight text-[var(--saathi-text)]">
                  {formatRupees(highestPriceRecord.modal_price)}
                </p>
                <div className="mt-1 flex items-center justify-end gap-1.5">
                  {(() => {
                    const trend = getTrendIndicator();
                    return trend ? (
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-bold ${trend.colorClass}`}>
                        {trend.percentText}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-[var(--saathi-text-muted)]">
                        {t('prices.buildingHistory') || 'Building history'}
                      </span>
                    );
                  })()}
                  <span className="text-xs font-medium text-slate-400">/ quintal</span>
                </div>
              </div>

              {/* Sparkline Container */}
              <div className="flex h-12 items-center border-l border-[var(--saathi-border-light)] pl-6 min-w-[120px]">
                {historyLoading ? (
                  <div className="h-4 w-16 animate-pulse rounded bg-slate-200"></div>
                ) : topRecordHistory && topRecordHistory.length >= 2 ? (
                  renderSparkline()
                ) : (
                  <p className="text-[10px] leading-tight text-slate-400 max-w-[100px]">
                    {t('prices.buildingNote') || 'Building price history — check back soon'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Filter and Search Panel - Stitch Modern Tab Bar UI */}
      <div className="mb-6 rounded-2xl bg-white p-6 md:p-8 border border-slate-200/80 shadow-sm" data-purpose="crop-price-filter-container">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            {t('prices.filterTitle') || 'Filter Prices'}
          </h2>
          {showResetLocation ? (
            <button
              type="button"
              onClick={handleUseDetectedLocation}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition shadow-2xs self-start sm:self-auto cursor-pointer group"
            >
              <span className="text-rose-500 group-hover:scale-110 transition-transform">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"></path>
                </svg>
              </span>
              <span>{t('prices.useDetectedLoc') || 'Use my detected location'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={requestLocation}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition shadow-2xs self-start sm:self-auto cursor-pointer group"
            >
              <span className="text-rose-500 group-hover:scale-110 transition-transform">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"></path>
                </svg>
              </span>
              <span>{t('prices.changeLoc') || 'Detect My Location'}</span>
            </button>
          )}
        </div>

        {/* Inputs Form */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pb-6">
          {/* Crop Search */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t('prices.cropCol')}
            </label>
            <div className="relative flex items-center">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1116.65 6.65a7.5 7.5 0 010 10.6z" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
              </div>
              <input
                type="text"
                value={commoditySearch}
                onChange={(e) => setCommoditySearch(e.target.value)}
                placeholder={t('prices.searchPlaceholder')}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition"
              />
            </div>
          </div>

          {/* State Select */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t('prices.stateCol') || 'State'}
            </label>
            <select
              value={selectedState}
              onChange={handleStateChange}
              disabled={statesLoading}
              className={`w-full px-3.5 py-2.5 text-sm bg-white border ${selectedState ? 'border-emerald-600 text-slate-900 font-semibold' : 'border-slate-200 text-slate-800'} rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition cursor-pointer hover:border-slate-300`}
            >
              <option value="">
                {statesLoading ? 'Loading States...' : (t('prices.selectState') || 'All States')}
              </option>
              {statesList.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>

          {/* District Select */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t('prices.districtCol') || 'District'}
            </label>
            <select
              value={selectedDistrict}
              onChange={handleDistrictChange}
              disabled={!selectedState || districtsLoading}
              className={`w-full px-3.5 py-2.5 text-sm bg-white border ${selectedDistrict ? 'border-emerald-600 text-slate-900 font-semibold' : 'border-slate-200 text-slate-800'} rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition cursor-pointer hover:border-slate-300 disabled:bg-slate-50 disabled:cursor-not-allowed`}
            >
              <option value="">
                {!selectedState
                  ? (t('prices.selectStateFirst') || 'Select a state first')
                  : districtsLoading
                    ? 'Loading Districts...'
                    : (t('prices.selectDistrict') || 'All Districts')}
              </option>
              {districtsList.map(district => (
                <option key={district} value={district}>{district}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Popular Crops Bar */}
        <div className="pt-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mr-1.5">
              {t('buyer.popularCrops') || 'Popular Crops'}:
            </span>
            {popularCrops.map(crop => {
              const isSelected = commoditySearch.toLowerCase() === crop.toLowerCase();
              return (
                <button
                  key={crop}
                  type="button"
                  onClick={() => setCommoditySearch(crop)}
                  className={`group inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium transition cursor-pointer rounded-xl border ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm font-bold'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800 hover:border-slate-300'
                  }`}
                >
                  <CropBadgeIcon crop={crop} isSelected={isSelected} />
                  <span>{getRegionalCropName(crop)}</span>
                </button>
              );
            })}
          </div>

          {(selectedState || selectedDistrict || commoditySearch) && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-sm font-semibold text-red-600 hover:text-red-700 hover:underline transition ml-auto cursor-pointer"
            >
              {t('buyer.clearFilters') || 'Clear Filters'}
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="rounded-3xl border border-[var(--saathi-border-light)] bg-white shadow-sm overflow-hidden p-8 flex flex-col items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-[var(--saathi-border)] border-t-[#2E7D32]"></div>
          <p className="mt-4 text-sm font-bold text-[var(--saathi-text-muted)]">{t('common.loading')}</p>
        </div>
      ) : errorMsg ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-base font-bold text-red-700">{errorMsg}</p>
          <button 
            onClick={fetchPrices}
            className="mt-3 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 transition"
          >
            {t('location.tryAgain') || 'Try Again'}
          </button>
        </div>
      ) : records.length > 0 ? (
        <>
          <div className="rounded-3xl border border-[var(--saathi-border-light)] bg-white shadow-sm overflow-hidden">
          {/* Table view for larger screens */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--saathi-surface-alt)] text-xs font-bold uppercase tracking-wider text-[var(--saathi-text-muted)] border-b border-slate-100">
                  <th className="px-6 py-4">{t('prices.cropCol')}</th>
                  <th className="px-6 py-4">{t('prices.varietyCol') || 'Variety'}</th>
                  <th className="px-6 py-4">{t('prices.marketCol') || 'Market'}</th>
                  <th className="px-6 py-4">{t('prices.districtCol') || 'District'}</th>
                  <th className="px-6 py-4">{t('prices.stateCol') || 'State'}</th>
                  <th className="px-6 py-4 text-right">{t('prices.minCol') || 'Min'}</th>
                  <th className="px-6 py-4 text-right">{t('prices.maxCol') || 'Max'}</th>
                  <th className="px-6 py-4 text-right">{t('prices.modalPriceCol')}</th>
                  <th className="px-6 py-4 text-center">{t('prices.arrivalDateCol') || 'Arrival Date'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((record, index) => (
                  <tr key={index} className="hover:bg-[var(--saathi-surface-alt)] transition">
                    <td className="px-6 py-4 text-base font-bold text-[var(--saathi-text)]">
                      {getRegionalCropName(record.commodity) || record.commodity || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-[var(--saathi-text-secondary)]">{record.variety}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-[var(--saathi-text)]">{record.market}</td>
                    <td className="px-6 py-4 text-sm font-medium text-[var(--saathi-text-secondary)]">{record.district}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-[var(--saathi-text-muted)] uppercase">{record.state}</td>
                    <td className="px-6 py-4 text-sm font-bold text-[var(--saathi-text-secondary)] text-right">{formatRupees(record.min_price)}</td>
                    <td className="px-6 py-4 text-sm font-bold text-[var(--saathi-text-secondary)] text-right">{formatRupees(record.max_price)}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-block rounded-xl px-2.5 py-1 text-sm font-extrabold text-[var(--saathi-primary)] bg-[var(--saathi-surface-alt)] border border-[var(--saathi-border)]">
                        {formatRupees(record.modal_price)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-[var(--saathi-text-muted)] text-center">{record.arrival_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Card view for mobile screens */}
          <div className="md:hidden divide-y divide-slate-100">
            {records.map((record, index) => (
              <div key={index} className="p-5 hover:bg-[var(--saathi-surface-alt)] transition">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="text-lg font-extrabold text-[var(--saathi-text)]">{getRegionalCropName(record.commodity) || record.commodity || '—'}</h4>
                    <p className="text-xs font-semibold text-[var(--saathi-text-muted)] mt-0.5">{record.variety} · Grade {record.grade || 'FAQ'}</p>
                  </div>
                  <span className="rounded-xl px-3 py-1.5 text-base font-extrabold text-[var(--saathi-primary)] bg-[var(--saathi-surface-alt)] border border-[var(--saathi-border)]">
                    {formatRupees(record.modal_price)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-[var(--saathi-text-secondary)] mt-3 bg-[var(--saathi-surface-alt)] rounded-xl p-3 border border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">{t('prices.marketCol') || 'Market'}</span>
                    <span className="text-[var(--saathi-text)]">{record.market}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">{t('prices.districtCol') || 'District'} / {t('prices.stateCol') || 'State'}</span>
                    <span className="text-[var(--saathi-text)]">{record.district}, {record.state}</span>
                  </div>
                  <div className="mt-2">
                    <span className="text-[10px] text-slate-400 uppercase block">{t('prices.minCol') || 'Min'} / {t('prices.maxCol') || 'Max'}</span>
                    <span className="text-[var(--saathi-text-secondary)]">{formatRupees(record.min_price)} - {formatRupees(record.max_price)}</span>
                  </div>
                  <div className="mt-2">
                    <span className="text-[10px] text-slate-400 uppercase block">{t('prices.arrivalDateCol') || 'Arrival Date'}</span>
                    <span className="text-[var(--saathi-text-secondary)]">{record.arrival_date}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        </>
      ) : (
        <div className="rounded-3xl border border-[var(--saathi-border-light)] bg-white p-8 shadow-sm text-center">
          <p className="text-lg font-extrabold text-[var(--saathi-text-secondary)] mb-2">
            {t('prices.emptyStateMsg') || 'No price data available for this selection right now'}
          </p>
          <p className="text-sm font-medium text-[var(--saathi-text-muted)] max-w-md mx-auto">
            {t('prices.trySimilar') || 'Try checking spelling or search for common crops like: Wheat, Paddy, Potato, Tomato, Onion'}
          </p>
          {commoditySearch && (
            <button
              onClick={() => setCommoditySearch('')}
              className="mt-4 rounded-xl border border-[var(--saathi-border)] px-4 py-2 text-sm font-bold text-[var(--saathi-text-secondary)] hover:bg-[var(--saathi-surface-alt)] transition"
            >
              Reset Search
            </button>
          )}
        </div>
      )}

      {/* Alert Setting and Disclaimer */}
      <div className="grid gap-6 sm:grid-cols-2 mt-8 mb-8">
        <div className="rounded-3xl bg-[var(--saathi-surface-alt)] p-6 border border-[var(--saathi-border-light)]">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-[var(--saathi-primary)] flex items-center gap-2">
            <span>🧠</span> {t('prices.insightTitle')}
          </h3>
          <p className="mt-3 text-base font-semibold text-[var(--saathi-text)] leading-relaxed">
            {t('prices.dataNote')}
          </p>
          <a href="/buyers" className="mt-4 inline-block font-bold text-[var(--saathi-primary)] hover:underline">
            {t('prices.insightCompare')}
          </a>
        </div>

        <div className="rounded-3xl bg-white p-6 border border-[var(--saathi-border-light)]">
          <h3 className="text-lg font-bold text-[var(--saathi-text)] flex items-center gap-2 mb-4">
            <span>🔔</span> {t('prices.alertTitle')}
          </h3>
          <p className="text-sm font-medium text-[var(--saathi-text-secondary)] mb-3">
            {t('prices.alertTarget')} {commoditySearch ? getRegionalCropName(commoditySearch) : t('prices.cropCol')}:
          </p>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="₹2,300"
              className="w-full rounded-xl border border-[var(--saathi-border-light)] px-4 py-2 font-bold text-[var(--saathi-text)] focus:border-[#2E7D32] outline-none"
            />
            <button className="shrink-0 rounded-xl bg-slate-900 px-5 py-2 text-sm font-bold text-white hover:bg-slate-800 transition">
              {t('prices.alertSetBtn')}
            </button>
          </div>
        </div>
      </div>

      <footer className="border-t border-[var(--saathi-border-light)] pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
        <p className="text-xs font-semibold text-[var(--saathi-text-muted)]">{t('prices.dataNote')}</p>
        <p className="text-xs font-bold text-[var(--saathi-primary)]">SAATHI Market Engine</p>
      </footer>
    </section>
  );
}
