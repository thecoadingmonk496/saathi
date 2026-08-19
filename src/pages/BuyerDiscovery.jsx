import { useMemo, useState } from 'react';
import { useUser } from '../context/UserContext';
import { useLocationContext } from '../context/LocationContext';
import { calculateDistance, formatDistance } from '../utils/distanceUtils';
import { mockBuyers, mockCrops, mockPriceHistory } from '../utils/mockData';

const getBuyerTypes = (t) => ['All', t('explorer.stageWholesaler'), t('explorer.stageRetailer'), t('explorer.stageDistributor'), t('buyer.mandiBuyer'), 'Govt Agency'];
const popularCrops = ['Wheat', 'Paddy', 'Mustard', 'Maize', 'Chickpea'];
const radiusOptions = [10, 25, 50, 100];

function Stars({ rating }) {
  if (!rating) return null;
  return (
    <span className="flex items-center gap-0.5 text-amber-500 text-xs font-bold">
      <span>⭐</span> {rating.toFixed(1)}
    </span>
  );
}

function MapViewModal({ buyers, farmerAddress, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">🗺️ Buyer Map View</h2>
            <p className="text-xs font-medium text-slate-500 mt-0.5">Demo — sample buyer locations</p>
          </div>
          <button onClick={onClose} className="rounded-full h-8 w-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-lg transition">✕</button>
        </div>

        {}
        <div className="relative bg-[#e8f4e8] h-72 flex items-center justify-center border-b border-slate-100 overflow-hidden">
          <div className="absolute inset-0 opacity-10"
            style={{backgroundImage: 'repeating-linear-gradient(0deg,#2E7D32 0,#2E7D32 1px,transparent 1px,transparent 40px),repeating-linear-gradient(90deg,#2E7D32 0,#2E7D32 1px,transparent 1px,transparent 40px)'}}
          />
          {}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
            <div className="bg-[#2E7D32] text-white text-xs font-extrabold px-3 py-1.5 rounded-full shadow-lg border-2 border-white whitespace-nowrap">
              📍 You (Farmer)
            </div>
            <div className="w-0 h-0 border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-[#2E7D32]"></div>
          </div>
          {}
          {buyers.slice(0, 6).map((b, i) => {
            const positions = [
              { top: '18%', left: '22%' }, { top: '30%', left: '72%' },
              { top: '65%', left: '18%' }, { top: '70%', left: '68%' },
              { top: '15%', left: '55%' }, { top: '60%', left: '40%' },
            ];
            const pos = positions[i] || { top: '50%', left: '50%' };
            return (
              <div key={b.id} className="absolute flex flex-col items-center" style={pos}>
                <div className="bg-white text-slate-800 border border-slate-300 text-xs font-bold px-2 py-1 rounded-lg shadow whitespace-nowrap max-w-[110px] truncate">
                  🏪 {b.name.split(' ').slice(0,2).join(' ')}
                </div>
                <p className="text-xs text-[#2E7D32] font-bold mt-0.5">{Math.round(b.realDistanceKm ?? 0)} km</p>
              </div>
            );
          })}
          <div className="absolute bottom-3 right-3 bg-white/90 text-xs text-slate-500 font-semibold px-3 py-1.5 rounded-full border border-slate-200">
            Demo map — not real geography
          </div>
        </div>

        {}
        <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
          {}
          <div className="flex items-center gap-3 px-6 py-3 bg-green-50">
            <span className="text-xl">📍</span>
            <div>
              <p className="text-sm font-extrabold text-[#2E7D32]">Your Location (Farmer)</p>
              <p className="text-xs text-slate-500">{farmerAddress || 'Current GPS location'}</p>
            </div>
          </div>
          {buyers.map((b) => (
            <div key={b.id} className="flex items-center gap-3 px-6 py-3 hover:bg-slate-50">
              <span className="text-lg">🏪</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{b.name}</p>
                <p className="text-xs text-slate-500">{b.location} • {Math.round(b.realDistanceKm ?? 0)} km</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-extrabold text-[#2E7D32]">₹{b.pricePerQtl?.toLocaleString('en-IN')}</p>
                <p className="text-xs text-slate-500">{b.cropRequired}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function BuyerDiscovery() {
  const { t } = useUser();
  const { coordinates, address, permissionStatus } = useLocationContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCrop, setSelectedCrop] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [sortOrder, setSortOrder] = useState('best-match');
  const [radius, setRadius] = useState(100);
  const [showMap, setShowMap] = useState(false);

  const getMandiPrice = (cropName) => {
    const crop = mockCrops.find((c) => c.name.toLowerCase() === cropName.toLowerCase());
    if (crop) {
      const history = mockPriceHistory.find((h) => h.cropId === crop.id);
      if (history) return history.wholesale;
    }
    return null;
  };

  const processedBuyers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const enriched = mockBuyers.map((buyer) => {
      let realDistanceKm = null;
      let displayDistance = permissionStatus === 'idle' ? t('location.notSet') : t('location.distUnavailable');

      if (coordinates && buyer.latitude && buyer.longitude) {
        realDistanceKm = calculateDistance(
          coordinates.latitude, coordinates.longitude,
          buyer.latitude, buyer.longitude
        );
        displayDistance = formatDistance(realDistanceKm);
      }

      const mandiPrice = getMandiPrice(buyer.cropRequired);
      const priceDiff = mandiPrice ? buyer.pricePerQtl - mandiPrice : 0;

      let score = 50;
      if (realDistanceKm !== null) {
        if (realDistanceKm < 15) score += 25;
        else if (realDistanceKm < 40) score += 12;
        else if (realDistanceKm < 80) score += 5;
      }
      if (buyer.verified) score += 12;
      if (buyer.rating && buyer.rating >= 4.5) score += 8;
      else if (buyer.rating && buyer.rating >= 4.0) score += 4;
      if (priceDiff > 0) score += 10;
      if (priceDiff < 0) score -= 8;
      if (buyer.availability === 'Buying now') score += 5;
      score = Math.min(Math.max(score, 10), 99);

      return { ...buyer, realDistanceKm, displayDistance, mandiPrice, priceDiff, matchScore: score };
    });

    const filtered = enriched.filter((buyer) => {
      const matchesSearch =
        buyer.name.toLowerCase().includes(normalizedSearch) ||
        buyer.cropRequired.toLowerCase().includes(normalizedSearch) ||
        (buyer.cropsWanted || []).some(c => c.toLowerCase().includes(normalizedSearch)) ||
        (buyer.location || '').toLowerCase().includes(normalizedSearch) ||
        (buyer.type || '').toLowerCase().includes(normalizedSearch);

      const matchesCrop = selectedCrop
        ? ((buyer.cropsWanted || []).some(c => c.toLowerCase() === selectedCrop.toLowerCase()) ||
           buyer.cropRequired.toLowerCase() === selectedCrop.toLowerCase())
        : true;

      const matchesType = selectedType === 'All' || buyer.type === selectedType;
      const matchesRadius = buyer.realDistanceKm === null || buyer.realDistanceKm <= radius;

      return matchesSearch && matchesCrop && matchesType && matchesRadius;
    });

    filtered.sort((a, b) => {
      switch (sortOrder) {
        case 'best-match': return b.matchScore - a.matchScore;
        case 'nearest': return (a.realDistanceKm ?? Infinity) - (b.realDistanceKm ?? Infinity);
        case 'highest-price': return b.pricePerQtl - a.pricePerQtl;
        case 'highest-qty': return b.quantityNeeded - a.quantityNeeded;
        case 'recent': {
          const score = (s) => {
            if (!s) return 0;
            if (s.includes('just now') || s.includes('min')) return 5;
            if (s.includes('hour')) return 4;
            if (s.includes('today')) return 3;
            if (s.includes('yesterday')) return 2;
            return 1;
          };
          return score(b.updatedAt) - score(a.updatedAt);
        }
        default: return 0;
      }
    });

    return filtered;
  }, [searchTerm, selectedCrop, selectedType, sortOrder, radius, coordinates, permissionStatus, t]);

  const handleDirections = (buyer) => {
    if (buyer.latitude && buyer.longitude) {
      window.open(`https://maps.google.com/?q=${buyer.latitude},${buyer.longitude}`, '_blank');
    }
  };

  const fmtPrice = (val) => `₹${Number(val).toLocaleString('en-IN')}`;

  const renderMatchBadge = (score) => {
    if (score >= 85) return <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-bold text-amber-700">⭐ Best Match · {score}%</span>;
    if (score >= 65) return <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-xs font-bold text-[#2E7D32]">✓ Good Match · {score}%</span>;
    return <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 border border-slate-200 px-2 py-0.5 text-xs font-medium text-slate-500">Nearby · {score}%</span>;
  };

  const farmerAddressStr = address?.formatted || address?.district || '';

  return (
    <section className="mx-auto w-full max-w-4xl">
      {}
      <header className="mb-6">
        <p className="text-xs font-extrabold uppercase tracking-widest text-[#2E7D32]">{t('buyer.tagline')}</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{t('buyer.title')}</h1>
        <p className="mt-1 text-sm font-semibold text-slate-700">{t('buyer.pageSubtitle')}</p>

        {}
        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-green-50 border border-green-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">📍</span>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('buyer.usingLocation')}</p>
              <p className="text-sm font-bold text-slate-800">
                {permissionStatus === 'idle' ? t('buyer.locDisabled') :
                 permissionStatus === 'loading' ? t('buyer.findingLoc') :
                 (farmerAddressStr || t('location.unavailable'))}
              </p>
            </div>
          </div>
          <span className="shrink-0 text-xs font-bold text-[#2E7D32] bg-white border border-green-200 px-3 py-1 rounded-full">
            {t('buyer.buyerCount', { count: processedBuyers.length })}
          </span>
        </div>

        {}
        <p className="mt-2 rounded-lg bg-white/65 py-1 text-center text-xs font-semibold text-slate-700 backdrop-blur-sm">
          📋 {t('buyer.demoNote')}
        </p>
      </header>

      {}
      <div className="space-y-4 mb-6">
        {}
        <label className="relative block">
          <span className="sr-only">Search</span>
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl">🔍</span>
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('buyer.searchPlaceholder')}
            className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-4 text-base text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#2E7D32] focus:ring-4 focus:ring-green-100"
          />
        </label>

        {}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="mr-1 shrink-0 text-xs font-bold uppercase tracking-wider text-slate-700">{t('buyer.popularCrops')}</span>
          {popularCrops.map((crop) => (
            <button
              key={crop}
              type="button"
              onClick={() => setSelectedCrop(selectedCrop === crop ? '' : crop)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition border ${
                selectedCrop === crop
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'border-slate-200 bg-white text-slate-800 hover:border-amber-200 hover:text-amber-700'
              }`}
            >
              {crop}
            </button>
          ))}
        </div>

        {}
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
          {getBuyerTypes(t).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setSelectedType(type)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition border ${
                selectedType === type
                  ? 'bg-[#2E7D32] text-white border-transparent'
                  : 'border-slate-200 bg-white text-slate-800 hover:border-[#2E7D32] hover:text-[#2E7D32]'
              }`}
            >
              {type === 'All' ? t('buyer.allTypes') : type}
            </button>
          ))}
        </div>

        {}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
          <p className="text-sm font-semibold text-slate-700 px-2">
            {t('buyer.buyerCount', { count: processedBuyers.length })} — {radius} km
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <span className="hidden sm:inline">{t('buyer.radiusLabel')}:</span>
              <select
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-[#2E7D32]"
              >
                {radiusOptions.map(r => <option key={r} value={r}>{r} km</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <span className="hidden sm:inline">{t('buyer.sort')}:</span>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-[#2E7D32]"
              >
                <option value="best-match">{t('buyer.sortBestMatch')}</option>
                <option value="nearest">{t('buyer.sortNearest')}</option>
                <option value="highest-price">{t('buyer.sortHighestPrice')}</option>
                <option value="highest-qty">{t('buyer.sortHighQty')}</option>
                <option value="recent">{t('buyer.sortRecent')}</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => setShowMap(true)}
              className="flex items-center gap-1.5 rounded-xl bg-blue-50 border border-blue-100 px-3 py-2 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
            >
              🗺️ <span className="hidden sm:inline">{t('buyer.mapView')}</span>
            </button>
          </div>
        </div>
      </div>

      {}
      <div className="space-y-4">
        {processedBuyers.map((buyer) => (
          <article key={buyer.id} className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
            {}
            {buyer.matchScore >= 85 && sortOrder === 'best-match' && (
              <div className="bg-amber-50 border-b border-amber-100 px-5 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                ⭐ {t('buyer.bestMatchBanner')}
              </div>
            )}
            {buyer.type === 'Govt Agency' && (
              <div className="bg-blue-50 border-b border-blue-100 px-5 py-1.5 text-xs font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                🏛️ {t('buyer.govtProcurementBanner')}
              </div>
            )}

            <div className="p-5 sm:p-6">
              {}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h2 className="text-xl font-extrabold text-slate-900">{buyer.name}</h2>
                    {buyer.verified && (
                      <span className="flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 px-2 py-0.5 text-xs font-bold">
                        ✓ {buyer.verificationType || t('buyer.verified')}
                      </span>
                    )}
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold border ${
                      buyer.availability === 'Buying now' || buyer.availability === 'Actively buying'
                        ? 'bg-green-50 border-green-200 text-[#2E7D32]'
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}>{buyer.availability || 'Available'}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-600">
                    {buyer.type} · {t('buyer.lookingFor')}{' '}
                    <span className="text-[#2E7D32]">
                      {(buyer.cropsWanted || [buyer.cropRequired]).join(', ')}
                    </span>
                  </p>
                  <div className="mt-2 flex flex-col gap-0.5 text-sm text-slate-500">
                    <p className="flex items-center gap-1.5"><span>📍</span> {buyer.location}</p>
                    <p className="flex items-center gap-1.5"><span>📏</span> <span className="font-semibold text-slate-700">{buyer.displayDistance}</span> {t('buyer.fromYourLocation')}</p>
                  </div>
                  {}
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    {buyer.rating && <Stars rating={buyer.rating} />}
                    {buyer.totalTransactions && (
                      <span className="text-xs font-medium text-slate-400">{buyer.totalTransactions} {t('buyer.transactions')}</span>
                    )}
                    {buyer.responseTime && (
                      <span className="text-xs font-medium text-slate-500 flex items-center gap-1">⚡ {buyer.responseTime}</span>
                    )}
                  </div>
                </div>

                {}
                <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 border border-slate-100 sm:w-52 w-full shrink-0">
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400">{t('buyer.needs')}</p>
                    <p className="mt-0.5 text-base font-extrabold text-slate-800">{buyer.quantityNeeded} qtl</p>
                    {buyer.minimumQuantity && (
                      <p className="text-xs text-slate-400 mt-0.5">{t('buyer.minQtl', { qty: buyer.minimumQuantity })}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400">{t('buyer.offer')}</p>
                    <p className="mt-0.5 text-base font-extrabold text-[#2E7D32]">
                      {fmtPrice(buyer.pricePerQtl)}<span className="text-xs font-medium text-slate-500">/qtl</span>
                    </p>
                    {buyer.mandiPrice && (
                      <p className={`text-xs font-bold mt-0.5 ${buyer.priceDiff > 0 ? 'text-[#2E7D32]' : 'text-slate-500'}`}>
                        {buyer.priceDiff > 0 ? '+' : ''}{fmtPrice(buyer.priceDiff)} {t('buyer.vs')} {t('explorer.mandi')}
                      </p>
                    )}
                  </div>
                  <div className="col-span-2 border-t border-slate-200 pt-2 mt-1">
                    <p className="text-xs font-bold uppercase text-slate-400">{t('buyer.match')}</p>
                    <div className="mt-1">{renderMatchBadge(buyer.matchScore)}</div>
                  </div>
                </div>
              </div>

              {}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {buyer.preferredPickup && (
                  <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                    <span>🚚</span>
                    <span><span className="font-bold">{t('buyer.pickup')}:</span> {buyer.preferredPickup}</span>
                  </div>
                )}
                {buyer.paymentTerms && (
                  <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                    <span>💳</span>
                    <span><span className="font-bold">{t('buyer.payment')}:</span> {buyer.paymentTerms}</span>
                  </div>
                )}
              </div>

              {}
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <div className="flex flex-col gap-1">
                  <p className="text-xs text-slate-400">{t('buyer.updatedTime', { time: buyer.updatedAt || '' })}</p>
                </div>
                <div className="flex w-full sm:w-auto items-center gap-2">
                  <a
                    href={`tel:${buyer.contact.replace(/\s/g, '')}`}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl bg-[#2E7D32] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#256428] focus:ring-4 focus:ring-green-200"
                  >
                    📞 {t('buyer.contactButton')}
                  </a>
                  {buyer.whatsapp && (
                    <a
                      href={`https://wa.me/91${buyer.contact.replace(/[^0-9]/g, '').slice(-10)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-green-700 transition hover:bg-green-200"
                      title={t('')}
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                      </svg>
                    </a>
                  )}
                  <button
                    onClick={() => handleDirections(buyer)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 hover:border-slate-300"
                  >
                    🗺️ {t('buyer.directions')}
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))}

        {}
        {processedBuyers.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <span className="text-4xl">🔎</span>
            <h3 className="mt-4 text-lg font-bold text-slate-800">{t('buyer.noBuyersFound')}</h3>
            <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">{t('buyer.noBuyersMsg')}</p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              {radius < 100 && (
                <button
                  onClick={() => setRadius(100)}
                  className="rounded-xl bg-[#2E7D32] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#256428]"
                >
                  {t('buyer.expandRadius')}
                </button>
              )}
              {(searchTerm || selectedCrop || selectedType !== 'All') && (
                <button
                  onClick={() => { setSearchTerm(''); setSelectedCrop(''); setSelectedType('All'); }}
                  className="rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  {t('buyer.clearFilters')}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {}
      {showMap && (
        <MapViewModal
          buyers={processedBuyers}
          farmerAddress={farmerAddressStr}
          onClose={() => setShowMap(false)}
        />
      )}
    </section>
  );
}
