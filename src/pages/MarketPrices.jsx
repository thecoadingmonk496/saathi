import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useLocationContext } from '../context/LocationContext';
import { marketService } from '../api/marketService';
import { locationStates, getDistricts } from '../utils/locationOptions';

const formatRupees = (price) => {
  if (price === undefined || price === null || isNaN(price) || price === 0) return '—';
  return `₹${Number(price).toLocaleString('en-IN')}`;
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

  // Suggestions/Popular crops list
  const popularCrops = ['Wheat', 'Paddy', 'Potato', 'Tomato', 'Onion', 'Mustard', 'Maize'];

  // 1. Initialize location filters on load if available
  useEffect(() => {
    const defaultState = address?.state || '';
    const defaultDistrict = address?.district || '';

    if (defaultState && locationStates.includes(defaultState)) {
      setSelectedState(defaultState);
      const districts = getDistricts(defaultState);
      if (defaultDistrict && districts.includes(defaultDistrict)) {
        setSelectedDistrict(defaultDistrict);
      }
    }
  }, [address]);

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
    setSelectedState(state);
    setSelectedDistrict(''); // Reset district when state changes
  };

  const handleDistrictChange = (e) => {
    setSelectedDistrict(e.target.value);
  };

  const handleClearFilters = () => {
    setSelectedState('');
    setSelectedDistrict('');
    setCommoditySearch('');
    setSearchParams({});
  };

  // Map commodity names to regional names in UI if available
  const getRegionalCropName = (cropName) => {
    if (!cropName) return '';
    const translationKey = `crop.${cropName.toLowerCase()}`;
    const translated = t(translationKey);
    return translated !== translationKey ? translated : cropName;
  };

  const districtsOptions = selectedState ? getDistricts(selectedState) : [];

  return (
    <section className="mx-auto w-full max-w-6xl pb-10 text-slate-900">
      <header className="mb-6">
        <p className="text-xs font-extrabold uppercase tracking-widest text-[#2E7D32]">{t('prices.tagline')}</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">{t('prices.title')}</h1>

        {/* Location Detection Panel */}
        <div className="mt-5 flex flex-col gap-3 rounded-2xl bg-white p-4 border border-slate-200 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="text-2xl mt-0.5" role="img" aria-label="Pin">📍</span>
            <div>
              <p className="text-sm font-bold text-slate-800">
                {address?.formatted || t('location.notSet')}
              </p>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                {permissionStatus === 'granted' ? t('prices.autoDetected') : t('location.notSet')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={requestLocation}
            className="rounded-lg px-3 py-2 text-sm font-bold text-[#2E7D32] transition hover:bg-green-50 hover:underline whitespace-nowrap focus:outline-none"
          >
            {t('prices.changeLoc')}
          </button>
        </div>

        {/* Update note */}
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/75 px-3 py-2 shadow-sm backdrop-blur-sm">
          <span className="flex h-2.5 w-2.5 rounded-full bg-green-500"></span>
          <p className="text-sm font-semibold text-slate-700">{t('prices.marketUpdatedToday')}</p>
          <span className="mx-2 text-slate-400">•</span>
          <p className="text-xs font-semibold text-slate-600">{t('prices.dataSource')}</p>
        </div>
      </header>

      {/* Filter and Search Panel */}
      <div className="mb-6 rounded-3xl bg-white p-6 border border-slate-200 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-4">{t('prices.filterTitle') || 'Filter Prices'}</h3>
        
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Commodity search */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">
              {t('prices.cropCol')}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
              <input
                type="text"
                value={commoditySearch}
                onChange={(e) => setCommoditySearch(e.target.value)}
                placeholder={t('prices.searchPlaceholder')}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-[#2E7D32]"
              />
            </div>
          </div>

          {/* State select */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">
              {t('prices.stateCol') || 'State'}
            </label>
            <select
              value={selectedState}
              onChange={handleStateChange}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-sm text-slate-800 outline-none transition focus:border-[#2E7D32]"
            >
              <option value="">{t('prices.selectState') || 'All States'}</option>
              {locationStates.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>

          {/* District select */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">
              {t('prices.districtCol') || 'District'}
            </label>
            <select
              value={selectedDistrict}
              onChange={handleDistrictChange}
              disabled={!selectedState}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-sm text-slate-800 outline-none transition disabled:bg-slate-50 focus:border-[#2E7D32]"
            >
              <option value="">{t('prices.selectDistrict') || 'All Districts'}</option>
              {districtsOptions.map(district => (
                <option key={district} value={district}>{district}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Clear filters and popular crops */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="font-bold text-slate-500 uppercase mr-1">{t('buyer.popularCrops') || 'Popular'}:</span>
            {popularCrops.map(crop => (
              <button
                key={crop}
                type="button"
                onClick={() => setCommoditySearch(crop)}
                className={`rounded-full px-3 py-1 font-semibold border transition ${
                  commoditySearch.toLowerCase() === crop.toLowerCase()
                    ? 'bg-green-50 border-[#2E7D32] text-[#2E7D32]'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {getRegionalCropName(crop)}
              </button>
            ))}
          </div>

          {(selectedState || selectedDistrict || commoditySearch) && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-xs font-bold text-red-600 hover:text-red-800 hover:underline"
            >
              {t('buyer.clearFilters') || 'Clear Filters'}
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden p-8 flex flex-col items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-green-200 border-t-[#2E7D32]"></div>
          <p className="mt-4 text-sm font-bold text-slate-500">{t('common.loading')}</p>
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
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Table view for larger screens */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
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
                  <tr key={index} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 text-base font-bold text-slate-900">
                      {getRegionalCropName(record.commodity)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-700">{record.variety}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-800">{record.market}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-600">{record.district}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">{record.state}</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-600 text-right">{formatRupees(record.min_price)}</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-600 text-right">{formatRupees(record.max_price)}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-block rounded-xl px-2.5 py-1 text-sm font-extrabold text-[#2E7D32] bg-green-50 border border-green-200">
                        {formatRupees(record.modal_price)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-500 text-center">{record.arrival_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Card view for mobile screens */}
          <div className="md:hidden divide-y divide-slate-100">
            {records.map((record, index) => (
              <div key={index} className="p-5 hover:bg-slate-50 transition">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="text-lg font-extrabold text-slate-900">{getRegionalCropName(record.commodity)}</h4>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">{record.variety} · Grade {record.grade || 'FAQ'}</p>
                  </div>
                  <span className="rounded-xl px-3 py-1.5 text-base font-extrabold text-[#2E7D32] bg-green-50 border border-green-200">
                    {formatRupees(record.modal_price)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-600 mt-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">{t('prices.marketCol') || 'Market'}</span>
                    <span className="text-slate-800">{record.market}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">{t('prices.districtCol') || 'District'} / {t('prices.stateCol') || 'State'}</span>
                    <span className="text-slate-800">{record.district}, {record.state}</span>
                  </div>
                  <div className="mt-2">
                    <span className="text-[10px] text-slate-400 uppercase block">{t('prices.minCol') || 'Min'} / {t('prices.maxCol') || 'Max'}</span>
                    <span className="text-slate-700">{formatRupees(record.min_price)} - {formatRupees(record.max_price)}</span>
                  </div>
                  <div className="mt-2">
                    <span className="text-[10px] text-slate-400 uppercase block">{t('prices.arrivalDateCol') || 'Arrival Date'}</span>
                    <span className="text-slate-700">{record.arrival_date}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm text-center">
          <p className="text-lg font-extrabold text-slate-700 mb-2">
            {t('prices.emptyStateMsg') || 'No price data available for this selection right now'}
          </p>
          <p className="text-sm font-medium text-slate-500 max-w-md mx-auto">
            {t('prices.trySimilar') || 'Try checking spelling or search for common crops like: Wheat, Paddy, Potato, Tomato, Onion'}
          </p>
          {commoditySearch && (
            <button
              onClick={() => setCommoditySearch('')}
              className="mt-4 rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              Reset Search
            </button>
          )}
        </div>
      )}

      {/* Alert Setting and Disclaimer */}
      <div className="grid gap-6 sm:grid-cols-2 mt-8 mb-8">
        <div className="rounded-3xl bg-green-50 p-6 border border-green-100">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#2E7D32] flex items-center gap-2">
            <span>🧠</span> {t('prices.insightTitle')}
          </h3>
          <p className="mt-3 text-base font-semibold text-slate-800 leading-relaxed">
            {t('prices.dataNote')}
          </p>
          <a href="/buyers" className="mt-4 inline-block font-bold text-[#2E7D32] hover:underline">
            {t('prices.insightCompare')}
          </a>
        </div>

        <div className="rounded-3xl bg-white p-6 border border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
            <span>🔔</span> {t('prices.alertTitle')}
          </h3>
          <p className="text-sm font-medium text-slate-700 mb-3">
            {t('prices.alertTarget')} {commoditySearch ? getRegionalCropName(commoditySearch) : t('prices.cropCol')}:
          </p>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="₹2,300"
              className="w-full rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-800 focus:border-[#2E7D32] outline-none"
            />
            <button className="shrink-0 rounded-xl bg-slate-900 px-5 py-2 text-sm font-bold text-white hover:bg-slate-800 transition">
              {t('prices.alertSetBtn')}
            </button>
          </div>
        </div>
      </div>

      <footer className="border-t border-slate-200 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
        <p className="text-xs font-semibold text-slate-500">{t('prices.dataNote')}</p>
        <p className="text-xs font-bold text-emerald-600">SAATHI Market Engine</p>
      </footer>
    </section>
  );
}
