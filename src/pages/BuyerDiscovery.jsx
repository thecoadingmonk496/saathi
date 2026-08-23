import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useLocationContext } from '../context/LocationContext';
import { marketService } from '../api/marketService';
import { BuyerVerification } from '../components/BlockchainVerification';

const popularCrops = ['Wheat', 'Paddy', 'Onion', 'Tomato', 'Mustard', 'Maize', 'Potato'];

export default function BuyerDiscovery() {
  const { t } = useUser();
  const navigate = useNavigate();
  const { address } = useLocationContext();

  // Filter States
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [commoditySearch, setCommoditySearch] = useState('');
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Dropdown options
  const [statesList, setStatesList] = useState([]);
  const [districtsList, setDistrictsList] = useState([]);
  const [statesLoading, setStatesLoading] = useState(false);
  const [districtsLoading, setDistrictsLoading] = useState(false);

  // Override tracker
  const [hasManualOverride, setHasManualOverride] = useState(false);

  // Coming Soon Modal State
  const [activeBuyer, setActiveBuyer] = useState(null);

  // 1a. Load states list on mount
  useEffect(() => {
    const loadStates = async () => {
      setStatesLoading(true);
      try {
        const list = await marketService.getGovernmentMandiStates();
        if (Array.isArray(list) && list.length > 0) {
          setStatesList(list);
        }
      } catch (err) {
        console.error('Failed to load states list:', err);
      } finally {
        setStatesLoading(false);
      }
    };
    loadStates();
  }, []);

  // 1b. Load districts list when state changes
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
        }
      } catch (err) {
        console.error('Failed to load districts list:', err);
      } finally {
        setDistrictsLoading(false);
      }
    };
    loadDistricts();
  }, [selectedState]);

  // 2. Auto-fill based on location
  useEffect(() => {
    if (hasManualOverride || !address || statesList.length === 0) return;

    const detectState = address.state || '';
    const detectDistrict = address.district || '';

    if (detectState) {
      const matchedState = statesList.find(
        s => s.toLowerCase() === detectState.toLowerCase()
      );

      if (matchedState) {
        setSelectedState(matchedState);

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

  // 3. Fetch buyer listings
  const fetchListings = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const response = await marketService.getBuyerListings({
        commodity: commoditySearch,
        state: selectedState,
        district: selectedDistrict,
        limit: 50
      });

      if (response && response.success) {
        setListings(response.listings || []);
      } else {
        setListings([]);
        setErrorMsg(response.message || 'Failed to fetch buyer listings');
      }
    } catch (err) {
      console.error(err);
      setListings([]);
      setErrorMsg('Failed to connect to the buyer network');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
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
  };

  const showResetLocation = address?.state && (
    (selectedState && selectedState.toLowerCase() !== address.state.toLowerCase()) ||
    (selectedDistrict && selectedDistrict.toLowerCase() !== (address.district || '').toLowerCase())
  );

  const getRegionalCropName = (cropName) => {
    if (!cropName) return '';
    const translationKey = `crop.${cropName.toLowerCase()}`;
    const translated = t(translationKey);
    return translated !== translationKey ? translated : cropName;
  };

  const formatRupees = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <section className="mx-auto w-full max-w-4xl pb-12">
      <header className="mb-6">
        <p className="text-xs font-extrabold uppercase tracking-widest text-[#2E7D32]">{t('buyer.tagline') || 'Connect with Buyers'}</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{t('buyer.title') || 'Buyer Discovery'}</h1>
        <p className="mt-2 text-sm font-semibold text-slate-600">
          Discover verified wholesalers, exporters, and processors currently purchasing crops in your region.
        </p>
      </header>

      {/* Verified Buyer Program CTA */}
      <div className="mb-6 rounded-3xl bg-[#064E3B] p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-emerald-300">🛡️ SAATHI Verified Buyer Program</p>
            <p className="mt-1.5 text-sm font-semibold text-emerald-50/90 max-w-md">
              Are you a buyer? Get verified on SAATHI and publish your buying offers directly to farmers.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <button
              type="button"
              onClick={() => navigate('/buyer-register')}
              className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-[#064E3B] transition hover:bg-emerald-50"
            >
              Register as Buyer
            </button>
            <button
              type="button"
              onClick={() => navigate('/buyer-status')}
              className="rounded-xl border border-white/30 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/10"
            >
              Check Status
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="mb-6 rounded-3xl bg-white p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="text-base font-bold text-slate-900">{t('prices.filterTitle') || 'Filter Listings'}</h3>
          {showResetLocation && (
            <button
              type="button"
              onClick={handleUseDetectedLocation}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2E7D32] hover:underline bg-green-50/50 hover:bg-green-50 px-2.5 py-1 rounded-lg border border-green-200 transition focus:outline-none"
            >
              <span>📍</span> {t('prices.useDetectedLoc') || 'Use my detected location'}
            </button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {/* Commodity search */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">
              {t('prices.cropCol') || 'Crop'}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
              <input
                type="text"
                value={commoditySearch}
                onChange={(e) => setCommoditySearch(e.target.value)}
                placeholder={t('buyer.searchPlaceholder') || 'Search crops...'}
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
              disabled={statesLoading}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-sm text-slate-800 outline-none transition focus:border-[#2E7D32]"
            >
              <option value="">
                {statesLoading ? 'Loading States...' : (t('prices.selectState') || 'All States')}
              </option>
              {statesList.map(state => (
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
              disabled={!selectedState || districtsLoading}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-sm text-slate-800 outline-none transition disabled:bg-slate-50 focus:border-[#2E7D32]"
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
                    ? 'bg-amber-100 border-amber-300 text-amber-800'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-amber-200 hover:text-amber-700'
                }`}
              >
                {crop}
              </button>
            ))}
          </div>

          {(commoditySearch || selectedState || selectedDistrict) && (
            <button
              onClick={handleClearFilters}
              className="text-xs font-bold text-slate-500 hover:text-[#2E7D32] hover:underline"
            >
              {t('buyer.clearFilters') || 'Clear Filters'}
            </button>
          )}
        </div>
      </div>

      {/* Listings Section */}
      <div className="space-y-4">
        {loading ? (
          // Skeleton Loader
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
              <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-slate-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-slate-200 rounded w-1/4"></div>
            </div>
          ))
        ) : errorMsg ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
            <span className="text-2xl">⚠️</span>
            <p className="mt-2 font-bold">{errorMsg}</p>
          </div>
        ) : listings.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <span className="text-4xl">🔎</span>
            <h3 className="mt-4 text-lg font-bold text-slate-800">{t('buyer.noBuyersFound') || 'No Buyer Listings Found'}</h3>
            <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
              There are no buyers registered for this crop or region right now. Check back soon!
            </p>
          </div>
        ) : (
          listings.map((buyer) => (
            <article key={buyer._id} className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
              {buyer.is_demo && (
                <div className="bg-amber-50 border-b border-amber-100 px-6 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-800">
                  Demo Listing • Simulated Offer
                </div>
              )}
              <div className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h2 className="text-xl font-extrabold text-slate-900">{buyer.buyer_name}</h2>
                      <span className="rounded-full bg-slate-50 border border-slate-200 text-slate-600 px-2 py-0.5 text-xs font-bold">
                        {buyer.buyer_type}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-600">
                      Buying: <span className="text-[#2E7D32]">{getRegionalCropName(buyer.commodity)} ({buyer.variety})</span>
                    </p>
                    <div className="mt-3 flex flex-col gap-1 text-sm text-slate-500">
                      <p className="flex items-center gap-2"><span>📍</span> {buyer.market}, {buyer.district}, {buyer.state}</p>
                      <p className="flex items-center gap-2"><span>📦</span> Requirement: <span className="font-bold text-slate-700">{buyer.quantity_required}</span></p>
                    </div>
                    <div className="mt-2">
                      <BuyerVerification buyerId={`B-${buyer._id}`} buyerType={buyer.buyer_type} />
                    </div>
                  </div>

                  {/* Price Block */}
                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 sm:w-52 w-full shrink-0 flex flex-col justify-center">
                    <p className="text-xs font-bold uppercase text-slate-400">Offered Price</p>
                    <p className="mt-1 text-2xl font-black text-[#2E7D32]">
                      {formatRupees(buyer.offered_price)}
                      <span className="text-xs font-semibold text-slate-500 ml-1">/qtl</span>
                    </p>
                  </div>
                </div>

                {/* Footer and contact button */}
                <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  <p className="text-xs text-slate-400">Posted on: {new Date(buyer.created_at).toLocaleDateString('en-IN')}</p>
                  <button
                    onClick={() => setActiveBuyer(buyer)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-[#2E7D32] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#256428] focus:outline-none"
                  >
                    💬 {t('buyer.contactButton') || 'Contact via SAATHI'}
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      {/* Coming Soon Modal */}
      {activeBuyer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setActiveBuyer(null)}>
          <div
            className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <span className="text-5xl">💬</span>
              <h2 className="mt-4 text-xl font-black text-slate-900">Direct Messaging Coming Soon!</h2>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                Direct buyer-to-farmer communication is currently on SAATHI's product roadmap.
              </p>
              <div className="mt-4 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left">
                <p className="text-xs font-bold uppercase text-slate-400">Intended flow for {activeBuyer.buyer_name}</p>
                <p className="text-xs font-semibold text-slate-500 mt-2">
                  Once active, this button will open a secure chat screen in SAATHI. 
                  The buyer will receive a notification showing your available stock, and you can negotiate the pickup date and payment terms.
                </p>
              </div>
              <button
                onClick={() => setActiveBuyer(null)}
                className="mt-6 w-full rounded-xl bg-[#2E7D32] py-3 text-sm font-bold text-white transition hover:bg-[#256428]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
