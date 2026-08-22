import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useLocationContext } from '../context/LocationContext';
import { mockBuyers, mockCrops, mockSupplyChain } from '../utils/mockData';
import { SupplyChainVerification } from '../components/BlockchainVerification';

const fmt = (v) => `₹${Number(v).toLocaleString('en-IN')}`;
const diff = (a, b) => (b > a ? `+${fmt(b - a)}` : fmt(b - a));

const STAGE_KEYS = ['farmer', 'mandi', 'wholesaler', 'distributor', 'retailer', 'consumer'];

const STAGE_META = {
  farmer:      { icon: '👨‍🌾', colorClass: 'bg-emerald-600',  borderClass: 'border-emerald-600' },
  mandi:       { icon: '🏛️',  colorClass: 'bg-amber-600',    borderClass: 'border-amber-600'   },
  wholesaler:  { icon: '🏪',  colorClass: 'bg-blue-600',     borderClass: 'border-blue-600'    },
  distributor: { icon: '🚚',  colorClass: 'bg-violet-600',   borderClass: 'border-violet-600'  },
  retailer:    { icon: '🛒',  colorClass: 'bg-rose-600',     borderClass: 'border-rose-600'    },
  consumer:    { icon: '👤',  colorClass: 'bg-slate-600',    borderClass: 'border-slate-600'   },
};

function PriceStep({ label, price, prevPrice, isLast }) {
  const added = prevPrice != null ? price - prevPrice : null;
  return (
    <div className="flex flex-col items-center">
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center shadow-sm min-w-[110px]">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-1 text-xl font-extrabold text-[#2E7D32]">{fmt(price)}</p>
        <p className="text-xs text-slate-400">/qtl</p>
      </div>
      {!isLast && added != null && (
        <div className="flex flex-col items-center my-1">
          <div className="w-px h-4 bg-amber-400" />
          <span className="rounded-full bg-amber-50 border border-amber-300 px-2 py-0.5 text-xs font-bold text-amber-700">
            {diff(prevPrice, price)}
          </span>
          <div className="w-px h-4 bg-amber-400" />
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-2 py-2 border-b border-slate-100 last:border-0">
      <span className="min-w-[160px] text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-sm font-medium text-slate-800">{value}</span>
    </div>
  );
}

function PriceBadge({ children, accent }) {
  return (
    <span className={`inline-block rounded-xl px-3 py-1.5 text-base font-extrabold ${accent ? 'bg-[#2E7D32] text-white' : 'bg-green-50 text-[#2E7D32]'}`}>
      {children}
    </span>
  );
}

export default function MarketExplorer({ onVoiceStart }) {
  const { t } = useUser();
  const { address, permissionStatus } = useLocationContext();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeStage, setActiveStage] = useState('farmer');
  const [searchError, setSearchError] = useState('');
  const inputRef = useRef(null);

  const suggestions = query.trim().length > 0
    ? mockCrops.filter((c) =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        (c.nameHi && c.nameHi.includes(query)) ||
        (c.nameMr && c.nameMr.includes(query)) ||
        (c.namePa && c.namePa.includes(query))
      )
    : [];

  const doSearch = (nameOrCrop) => {
    const crop = typeof nameOrCrop === 'object'
      ? nameOrCrop
      : mockCrops.find((c) =>
          c.name.toLowerCase().includes(nameOrCrop.toLowerCase()) ||
          (c.nameHi && c.nameHi.includes(nameOrCrop))
        );

    setShowSuggestions(false);

    if (!crop) {
      setSelectedProduct(null);
      setSearchError(t('explorer.noData'));
      return;
    }

    const sc = mockSupplyChain.find((s) => s.cropId === crop.id);
    if (!sc) {
      setSelectedProduct(null);
      setSearchError(t('explorer.noData'));
      return;
    }

    const buyers = mockBuyers.filter((b) =>
      b.cropRequired.toLowerCase() === crop.name.toLowerCase()
    );

    setSelectedProduct({ crop, sc, buyers });
    setActiveStage('farmer');
    setSearchError('');
    setQuery(crop.name);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    doSearch(query.trim());
  };

  const renderStageDetail = () => {
    if (!selectedProduct) return null;
    const { crop, sc, buyers } = selectedProduct;

    switch (activeStage) {
      case 'farmer':
        return (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">👨‍🌾</span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#2E7D32]">{t('explorer.farmerStageTitle')}</p>
                <p className="text-xl font-extrabold text-slate-900">{crop.name}</p>
              </div>
            </div>
            <div className="space-y-0">
              <InfoRow label={t('explorer.product')} value={`${crop.icon || ''} ${crop.name} (${crop.category})`} />
              <InfoRow label={t('explorer.farmLocation')} value={address?.formatted || (permissionStatus === 'idle' ? t('location.notSet') : sc.farmerLocation)} />
              <InfoRow label={t('explorer.farmGatePrice')} value={`${fmt(sc.farmerCost)} / ${t('explorer.qtl')}`} />
              <InfoRow label={t('explorer.quantityFlow')} value={sc.farmQuantity} />
              <InfoRow label={t('explorer.distanceToWholesaler')} value={`${sc.wholesalerDistance} ${t('explorer.km')}`} />
            </div>
            {buyers.length > 0 && (
              <div className="mt-5">
                <p className="text-sm font-bold text-slate-700 mb-3">{t('explorer.nearbyBuyers')}</p>
                <div className="space-y-2">
                  {buyers.slice(0, 3).map((b) => (
                    <div key={b.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <div>
                        <p className="text-sm font-bold text-slate-800">{b.name}</p>
                        <p className="text-xs text-slate-500">{b.location} · {b.distance} {t('explorer.km')}</p>
                      </div>
                      <PriceBadge>{fmt(b.pricePerQtl)}</PriceBadge>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => navigate('/buyers')}
                  className="mt-3 w-full rounded-xl border border-[#2E7D32] py-2.5 text-sm font-bold text-[#2E7D32] hover:bg-green-50 transition"
                >
                  {t('explorer.compareBuyers')}
                </button>
              </div>
            )}
          </div>
        );

      case 'mandi':
        return (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🏛️</span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-amber-600">{t('explorer.stageMandi')}</p>
                <p className="text-xl font-extrabold text-slate-900">{sc.mandiName}</p>
              </div>
            </div>
            <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
              <p className="text-xs text-amber-700 font-semibold">{t('explorer.mandiPrice')}</p>
              <p className="text-2xl font-extrabold text-amber-800 mt-1">{fmt(sc.mandiPrice)} <span className="text-base font-medium">/ {t('explorer.qtl')}</span></p>
            </div>
            <div className="space-y-0">
              <InfoRow label={t('explorer.location')} value={sc.mandiName} />
              <InfoRow label={t('explorer.distance')} value={`${sc.mandiDistance} ${t('explorer.km')} ${t('explorer.transportFrom')} ${t('explorer.farmerStageTitle')}`} />
              <InfoRow label={t('explorer.msPrice')} value={`${fmt(sc.farmerCost)} / ${t('explorer.qtl')}`} />
            </div>
          </div>
        );

      case 'wholesaler':
        return (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🏪</span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-600">{t('explorer.stageWholesaler')}</p>
                <p className="text-xl font-extrabold text-slate-900">{sc.wholesalerName}</p>
              </div>
            </div>
            <div className="mb-4 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3">
              <p className="text-xs text-blue-700 font-semibold">{t('explorer.purchasePrice')}</p>
              <p className="text-2xl font-extrabold text-blue-800 mt-1">{fmt(sc.wholesalerCost)} <span className="text-base font-medium">/ {t('explorer.qtl')}</span></p>
            </div>
            <div className="space-y-0">
              <InfoRow label={t('explorer.location')} value={sc.wholesalerLocation} />
              <InfoRow label={t('explorer.distance')} value={`${sc.wholesalerDistance} ${t('explorer.km')}`} />
              <InfoRow label={t('explorer.quantityAccepted')} value={sc.wholesalerQuantityAccepted} />
              <InfoRow label={t('explorer.transportArrangement')} value={sc.wholesalerTransport} />
            </div>
            {}
            <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
              <p className="text-sm font-bold text-blue-800 mb-3">{t('explorer.wholesalerMarket')}</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-white border border-blue-100 p-3 text-center">
                  <p className="text-2xl font-extrabold text-blue-700">{sc.wholesalerActiveCount}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{t('explorer.activeBuyers')}</p>
                </div>
                <div className="rounded-xl bg-white border border-blue-100 p-3 text-center">
                  <p className="text-lg font-extrabold text-[#2E7D32]">{fmt(sc.wholesalerBestPrice)}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{t('explorer.bestOffer')}</p>
                </div>
                <div className="rounded-xl bg-white border border-blue-100 p-3 text-center">
                  <p className="text-lg font-extrabold text-slate-700">{fmt(sc.wholesalerAvgPrice)}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{t('explorer.avgPrice')}</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'distributor':
        return (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🚚</span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-violet-600">{t('explorer.stageDistributor')}</p>
                <p className="text-xl font-extrabold text-slate-900">{sc.distributorName}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-xl bg-violet-50 border border-violet-200 px-4 py-3 text-center">
                <p className="text-xs text-violet-700 font-semibold">{t('explorer.purchasePrice')}</p>
                <p className="text-xl font-extrabold text-violet-800 mt-1">{fmt(sc.distributorCost)}</p>
              </div>
              <div className="rounded-xl bg-violet-100 border border-violet-300 px-4 py-3 text-center">
                <p className="text-xs text-violet-800 font-semibold">{t('explorer.sellingPrice')}</p>
                <p className="text-xl font-extrabold text-violet-900 mt-1">{fmt(sc.distributorSelling)}</p>
              </div>
            </div>
            <div className="space-y-0">
              <InfoRow label={t('explorer.location')} value={sc.distributorLocation} />
              <InfoRow label={t('explorer.distance')} value={`${sc.distributorDistance} ${t('explorer.km')}`} />
              <InfoRow label={t('explorer.transportMode')} value={sc.distributorTransportMode} />
              <InfoRow label={t('explorer.transportPaidBy')} value={sc.distributorTransportPayer} />
              <InfoRow label={t('explorer.transportEstTime')} value={sc.distributorEstHours} />
            </div>
          </div>
        );

      case 'retailer':
        return (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🛒</span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-rose-600">{t('explorer.stageRetailer')}</p>
                <p className="text-xl font-extrabold text-slate-900">{sc.retailerName}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-center">
                <p className="text-xs text-rose-700 font-semibold">{t('explorer.retailPurchase')}</p>
                <p className="text-xl font-extrabold text-rose-800 mt-1">{fmt(sc.retailerCost)}</p>
              </div>
              <div className="rounded-xl bg-rose-100 border border-rose-300 px-4 py-3 text-center">
                <p className="text-xs text-rose-800 font-semibold">{t('explorer.retailSelling')}</p>
                <p className="text-xl font-extrabold text-rose-900 mt-1">{fmt(sc.consumerPrice)}</p>
              </div>
            </div>
            <div className="space-y-0">
              <InfoRow label={t('explorer.retailerType')} value={sc.retailerType} />
              <InfoRow label={t('explorer.location')} value={sc.retailerLocation} />
              <InfoRow label={t('explorer.marketServed')} value={sc.retailerMarket} />
            </div>
          </div>
        );

      case 'consumer':
        return (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">👤</span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('explorer.stageConsumer')}</p>
                <p className="text-xl font-extrabold text-slate-900">{t('explorer.consumer')}</p>
              </div>
            </div>
            <div className="mb-4 rounded-xl bg-slate-800 px-4 py-4 text-center">
              <p className="text-xs text-slate-300 font-semibold">{t('explorer.consumer')}</p>
              <p className="text-3xl font-extrabold text-white mt-1">{fmt(sc.consumerPrice)}</p>
              <p className="text-slate-400 text-sm">/ {t('explorer.qtl')}</p>
            </div>
            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <p className="text-sm font-bold text-slate-700 mb-2">{t('explorer.marketInsightTitle')}</p>
              {buyers.length > 0 && (
                <p className="text-sm text-slate-700">
                  {t('explorer.insightNearest', { dist: buyers.slice().sort((a,b)=>a.distance-b.distance)[0]?.distance })}
                </p>
              )}
              {buyers.length > 0 && (
                <p className="text-sm text-slate-700">
                  {t('explorer.insightBestOffer', { price: Number(buyers.slice().sort((a,b)=>b.pricePerQtl-a.pricePerQtl)[0]?.pricePerQtl).toLocaleString('en-IN') })}
                </p>
              )}
              <p className="text-sm text-slate-700">
                {t('explorer.insightConsumer', { price: Number(sc.consumerPrice).toLocaleString('en-IN') })}
              </p>
              <p className="text-sm font-semibold text-[#2E7D32] mt-1">{t('explorer.insightCompare')}</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const priceLadder = selectedProduct
    ? [
        { key: 'farmGate', label: t('explorer.farmGate'), price: selectedProduct.sc.farmerCost },
        { key: 'mandi', label: t('explorer.mandi'), price: selectedProduct.sc.mandiPrice },
        { key: 'wholesale', label: t('explorer.wholesale'), price: selectedProduct.sc.wholesalerCost },
        { key: 'retail', label: t('explorer.retail'), price: selectedProduct.sc.retailerCost },
        { key: 'consumer', label: t('explorer.consumer'), price: selectedProduct.sc.consumerPrice },
      ]
    : [];

  return (
    <section className="mx-auto w-full max-w-5xl">
      {}
      <header className="mb-7">
        <p className="text-xs font-extrabold uppercase tracking-widest text-[#2E7D32]">
          {t('explorer.tagline')}
        </p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          {t('explorer.heading')}
        </h1>
        <p className="mt-2 max-w-2xl rounded-lg bg-white/65 px-3 py-2 text-sm font-medium leading-6 text-slate-800 backdrop-blur-sm">
          {t('explorer.subtitle')}
        </p>
      </header>

      {}
      <form onSubmit={handleSubmit} className="relative flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1110.5 3a7.5 7.5 0 016.15 13.65z" />
            </svg>
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder={t('explorer.searchPlaceholder')}
            aria-label={t('explorer.searchLabel')}
            className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-4 text-base text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#2E7D32] focus:ring-4 focus:ring-green-100"
          />
          {}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-30 mt-1 rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
              <p className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                {t('explorer.suggestionsLabel')}
              </p>
              {suggestions.map((crop) => (
                <button
                  key={crop.id}
                  type="button"
                  onMouseDown={() => doSearch(crop)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-green-50 transition"
                >
                  <span className="text-xl">{crop.icon}</span>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{crop.name}</p>
                    <p className="text-xs text-slate-400">{crop.nameHi} · {crop.category}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="submit"
          className="rounded-2xl bg-[#2E7D32] px-6 py-4 text-base font-bold text-white shadow-sm transition hover:bg-[#256428] focus:outline-none focus:ring-4 focus:ring-green-200"
        >
          {t('explorer.searchButton')}
        </button>
      </form>

      {}
      {searchError && !selectedProduct && (
        <p className="mt-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-medium text-red-700">
          {searchError}
        </p>
      )}

      {}
      {!selectedProduct && !searchError && (
        <div className="mt-8 rounded-3xl border border-dashed border-green-200 bg-green-50/80 p-8 text-center">
          <p className="text-base font-bold text-slate-800">{t('explorer.emptyTitle')}</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-1 rounded-xl bg-white/65 px-3 py-2 text-sm font-semibold text-slate-800 backdrop-blur-sm">
            {t('explorer.emptyFlow').split('→').map((stage, i, arr) => (
              <span key={i} className="flex items-center gap-1">
                <span className="rounded-lg bg-white border border-green-200 px-2 py-1 text-xs font-bold text-[#2E7D32]">
                  {stage.trim()}
                </span>
                {i < arr.length - 1 && <span className="text-amber-500 font-bold">→</span>}
              </span>
            ))}
          </div>
          <p className="mt-3 text-sm text-slate-500">{t('explorer.emptySubtitle')}</p>
        </div>
      )}

      {}
      {selectedProduct && (() => {
        const { crop, sc, buyers } = selectedProduct;

        const stageLabels = {
          farmer:      t('explorer.stageFarmer'),
          mandi:       t('explorer.stageMandi'),
          wholesaler:  t('explorer.stageWholesaler'),
          distributor: t('explorer.stageDistributor'),
          retailer:    t('explorer.stageRetailer'),
          consumer:    t('explorer.stageConsumer'),
        };

        const stagePrices = {
          farmer:      sc.farmerCost,
          mandi:       sc.mandiPrice,
          wholesaler:  sc.wholesalerCost,
          distributor: sc.distributorCost,
          retailer:    sc.retailerCost,
          consumer:    sc.consumerPrice,
        };

        return (
          <>
            {}
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{crop.icon}</span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#2E7D32]">
                      {t('explorer.productSummaryLabel')}
                    </p>
                    <h2 className="text-2xl font-extrabold text-slate-900">{crop.name}</h2>
                    <p className="text-xs text-slate-500">{crop.category} · {address?.locality || address?.city || address?.district || sc.farmerLocation}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-2 text-center">
                    <p className="text-xs text-slate-500">{t('explorer.farmGatePrice')}</p>
                    <p className="text-lg font-extrabold text-[#2E7D32]">{fmt(sc.farmerCost)}</p>
                  </div>
                  <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-2 text-center">
                    <p className="text-xs text-slate-500">{t('explorer.mandiPrice')}</p>
                    <p className="text-lg font-extrabold text-amber-700">{fmt(sc.mandiPrice)}</p>
                  </div>
                  <div className="rounded-xl bg-slate-800 px-4 py-2 text-center">
                    <p className="text-xs text-slate-300">{t('explorer.totalJourneyKm')}</p>
                    <p className="text-lg font-extrabold text-white">{sc.distance} {t('explorer.km')}</p>
                  </div>
                </div>
              </div>
            </div>

            <SupplyChainVerification
              recordId={`SC-CROP-${crop.id}`}
              product={crop.name}
              stage="Farm to consumer"
            />

            {}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                  {t('explorer.supplyChainTitle')}
                </h3>
                <p className="text-xs text-slate-400">{t('explorer.clickStageHint')}</p>
              </div>

              {}
              <div className="hidden sm:flex items-center gap-0 overflow-x-auto pb-2">
                {STAGE_KEYS.map((key, idx) => {
                  const meta = STAGE_META[key];
                  const isActive = activeStage === key;
                  return (
                    <div key={key} className="flex items-center shrink-0">
                      <button
                        onClick={() => setActiveStage(key)}
                        className={`flex flex-col items-center gap-2 rounded-2xl border-2 px-4 py-4 transition focus:outline-none focus:ring-2 focus:ring-[#2E7D32] min-w-[90px] ${
                          isActive
                            ? `${meta.borderClass} ${meta.colorClass} text-white shadow-md`
                            : 'border-slate-200 bg-white text-slate-700 hover:border-green-400 hover:bg-green-50'
                        }`}
                      >
                        <span className="text-2xl">{meta.icon}</span>
                        <span className="text-xs font-bold text-center leading-tight">{stageLabels[key]}</span>
                        <span className={`text-sm font-extrabold ${isActive ? 'text-white' : 'text-[#2E7D32]'}`}>
                          {fmt(stagePrices[key])}
                        </span>
                      </button>
                      {idx < STAGE_KEYS.length - 1 && (
                        <div className="flex flex-col items-center mx-1">
                          <span className="text-amber-500 font-bold text-lg">→</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {}
              <div className="sm:hidden grid grid-cols-3 gap-2">
                {STAGE_KEYS.map((key) => {
                  const meta = STAGE_META[key];
                  const isActive = activeStage === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setActiveStage(key)}
                      className={`flex flex-col items-center gap-1 rounded-2xl border-2 p-3 transition focus:outline-none ${
                        isActive
                          ? `${meta.borderClass} ${meta.colorClass} text-white shadow-md`
                          : 'border-slate-200 bg-white text-slate-700'
                      }`}
                    >
                      <span className="text-xl">{meta.icon}</span>
                      <span className="text-xs font-bold text-center leading-tight">{stageLabels[key]}</span>
                      <span className={`text-xs font-extrabold ${isActive ? 'text-white' : 'text-[#2E7D32]'}`}>
                        {fmt(stagePrices[key])}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {}
            <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              {renderStageDetail()}
            </div>

            {}
            <div className="mt-6 rounded-3xl border border-white/20 bg-black/60 backdrop-blur-md p-5 shadow-lg sm:p-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 mb-1">
                {t('explorer.priceProgressionTitle')}
              </h3>
              <p className="text-xs text-white/70 mb-5">{t('explorer.priceProgressionSubtitle')}</p>

              {}
              <div className="flex flex-col items-center sm:hidden gap-0">
                {priceLadder.map((step, i) => (
                  <PriceStep
                    key={step.key}
                    label={step.label}
                    price={step.price}
                    prevPrice={i > 0 ? priceLadder[i - 1].price : null}
                    isLast={i === priceLadder.length - 1}
                  />
                ))}
              </div>

              {}
              <div className="hidden sm:flex items-stretch gap-2 overflow-x-auto">
                {priceLadder.map((step, i) => (
                  <div key={step.key} className="flex items-center gap-2">
                    <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-4 text-center shadow-sm min-w-[100px]">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">{step.label}</p>
                      <p className="mt-1 text-xl font-extrabold text-white">{fmt(step.price)}</p>
                      <p className="text-xs text-white/60">/qtl</p>
                    </div>
                    {i < priceLadder.length - 1 && (
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-xs font-bold text-amber-300 bg-amber-900/60 border border-amber-500/40 rounded-full px-2 py-0.5">
                          {diff(step.price, priceLadder[i + 1].price)}
                        </span>
                        <span className="text-amber-400 font-bold">→</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-white/60 text-center">{t('explorer.notProfit')}</p>
            </div>

            {}
            <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-4">
                {t('explorer.transportTitle')}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {}
                <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4">
                  <p className="text-xs font-bold text-amber-700 mb-2">
                    {t('explorer.stageFarmer')} → {t('explorer.stageMandi')}
                  </p>
                  <InfoRow label={t('explorer.transportDistance')} value={`${sc.mandiDistance} ${t('explorer.km')}`} />
                  <InfoRow label={t('explorer.transportMode')} value={t('explorer.road')} />
                  <InfoRow label={t('explorer.transportPaidBy')} value={t('explorer.stageFarmer')} />
                </div>
                {}
                <div className="rounded-2xl bg-violet-50 border border-violet-100 p-4">
                  <p className="text-xs font-bold text-violet-700 mb-2">
                    {t('explorer.stageWholesaler')} → {t('explorer.stageDistributor')}
                  </p>
                  <InfoRow label={t('explorer.transportDistance')} value={`${sc.distributorDistance} ${t('explorer.km')}`} />
                  <InfoRow label={t('explorer.transportMode')} value={sc.distributorTransportMode} />
                  <InfoRow label={t('explorer.transportPaidBy')} value={sc.distributorTransportPayer} />
                  <InfoRow label={t('explorer.transportEstTime')} value={sc.distributorEstHours} />
                </div>
              </div>
            </div>

            {}
            {buyers.length > 0 && (
              <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-4">
                  {t('explorer.nearbyBuyers')}
                </h3>
                <div className="space-y-3">
                  {buyers.slice(0, 3).map((b, i) => (
                    <div key={b.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2E7D32] text-xs font-bold text-white">
                          {i + 1}
                        </span>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{b.name}</p>
                          <p className="text-xs text-slate-500">{b.type} · {b.location}</p>
                          <p className="text-xs text-slate-500">{b.distance} {t('explorer.km')}</p>
                        </div>
                      </div>
                      <PriceBadge>{fmt(b.pricePerQtl)}<span className="text-xs font-normal">/qtl</span></PriceBadge>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => navigate('/buyers')}
                  className="mt-4 w-full rounded-2xl border-2 border-[#2E7D32] py-3 text-sm font-bold text-[#2E7D32] hover:bg-green-50 transition"
                >
                  {t('explorer.compareBuyers')}
                </button>
              </div>
            )}

            {}
            <div className="mt-6 rounded-3xl border border-white/20 bg-black/60 backdrop-blur-md p-5 shadow-lg sm:p-6">
              <div className="flex items-start gap-4">
                <div className="shrink-0 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2E7D32]">
                  <img src="/saathi-mic-logo.png" alt="SAATHI AI" className="h-8 w-8 object-contain" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">{t('explorer.askSaathiCTA')}</p>
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-white/70">{t('explorer.aiQuestion1')}</p>
                    <p className="text-xs text-white/70">{t('explorer.aiQuestion2')}</p>
                    <p className="text-xs text-white/70">{t('explorer.aiQuestion3')}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={onVoiceStart}
                className="mt-4 w-full rounded-2xl bg-[#2E7D32] py-3 text-sm font-bold text-white hover:bg-[#256428] transition shadow-md"
              >
                {t('explorer.askSaathi')}
              </button>
            </div>

            {}
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <button
                onClick={() => navigate('/buyers')}
                className="rounded-2xl border-2 border-emerald-400 bg-black/50 backdrop-blur-sm py-3 text-sm font-bold text-white hover:bg-emerald-700 transition shadow-md"
              >
                {t('explorer.findBuyers')}
              </button>
              <button
                onClick={() => navigate('/prices')}
                className="rounded-2xl border-2 border-amber-400 bg-black/50 backdrop-blur-sm py-3 text-sm font-bold text-amber-300 hover:bg-amber-700 transition shadow-md"
              >
                {t('explorer.viewMarketPrices')}
              </button>
              <button
                onClick={onVoiceStart}
                className="col-span-2 sm:col-span-1 rounded-2xl bg-[#2E7D32] py-3 text-sm font-bold text-white hover:bg-[#256428] transition shadow-md"
              >
                {t('explorer.askSaathi')}
              </button>
            </div>
          </>
        );
      })()}
    </section>
  );
}
