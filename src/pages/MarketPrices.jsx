import { useState, useEffect, useMemo } from 'react';
import { useUser } from '../context/UserContext';
import { useLocationContext } from '../context/LocationContext';
import { marketService } from '../api/marketService';

const getPriceTabs = () => ['Wholesale', 'Retail', 'Mandi', 'MSP'];
const formatRupees = (price) => `₹${price.toLocaleString('en-IN')}`;

function TrendChart({ data }) {
  if (!data || data.length === 0) return null;

  const minPrice = Math.min(...data.map(d => d.price));
  const maxPrice = Math.max(...data.map(d => d.price));
  const range = maxPrice - minPrice || 1; 

  const width = 200;
  const height = 40;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d.price - minPrice) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  const isUp = data[data.length-1].price >= data[0].price;
  const color = isUp ? '#2E7D32' : '#DC2626';

  return (
    <div className="w-full flex justify-end items-center h-16">
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
        {}
        <circle cx={width} cy={height - ((data[data.length-1].price - minPrice) / range) * height} r="4" fill={color} />
      </svg>
    </div>
  );
}

export default function MarketPrices() {
  const { t, language } = useUser();
  const { coordinates, address, permissionStatus, requestLocation } = useLocationContext();

  const [activeTab, setActiveTab] = useState('Wholesale');
  const [searchTerm, setSearchTerm] = useState('');
  const [crops, setCrops] = useState([]);
  const [selectedCropId, setSelectedCropId] = useState(1);
  const [trendData, setTrendData] = useState([]);
  const [nearbyMandis, setNearbyMandis] = useState([]);

  const currentDistrict = address?.district || (permissionStatus === 'idle' ? t('location.notSet') : t('location.unavailable'));
  const nearestMandi = address?.district ? `${address.district} Mandi` : '';

  const tabLabels = {
    Wholesale: t('prices.tabWholesale'),
    Retail: t('prices.tabRetail'),
    Mandi: t('prices.tabMandi'),
    MSP: t('prices.tabMSP'),
  };

  useEffect(() => {
    marketService.getMarketPrices(activeTab).then(data => {
      setCrops(data);
      if (!data.find(c => c.id === selectedCropId)) {
        setSelectedCropId(data[0]?.id);
      }
    });
  }, [activeTab]);

  useEffect(() => {
    if (!selectedCropId) return;
    marketService.getPriceTrend(selectedCropId).then(setTrendData);

    if (coordinates) {
      marketService.getNearbyMandis(selectedCropId, coordinates.latitude, coordinates.longitude)
        .then(setNearbyMandis);
    } else {
      setNearbyMandis([]);
    }
  }, [selectedCropId, coordinates]);

  const filteredCrops = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return crops;
    return crops.filter(c => 
      c.name.toLowerCase().includes(q) || 
      (c.nameHi && c.nameHi.includes(q)) ||
      (c.nameMr && c.nameMr.includes(q))
    );
  }, [crops, searchTerm]);

  const selectedCrop = crops.find(c => c.id === selectedCropId);
  const tableCrops = filteredCrops.filter(c => c.id !== selectedCropId);

  const getCropName = (crop) => {
    if (!crop) return '';
    if (language === 'Hindi' && crop.nameHi) return crop.nameHi;
    if (language === 'Marathi' && crop.nameMr) return crop.nameMr;
    return crop.name;
  };

  return (
    <section className="mx-auto w-full max-w-4xl pb-10">
      {}
      <header className="mb-6">
        <p className="text-xs font-extrabold uppercase tracking-widest text-[#2E7D32]">{t('prices.tagline')}</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{t('prices.title')}</h1>

        {}
          <div className="mt-5 flex flex-col gap-3 rounded-2xl bg-white p-4 border border-slate-200 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="text-2xl mt-0.5">📍</span>
            <div>
              <p className="text-sm font-bold text-slate-800">
                {currentDistrict} {nearestMandi ? `| ${nearestMandi}` : ''}
              </p>
              <p className="text-xs font-medium text-slate-700 mt-0.5">
                {permissionStatus === 'granted' ? t('prices.autoDetected') : t('location.notSet')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={requestLocation}
            className="rounded-lg px-3 py-2 text-sm font-bold text-[#2E7D32] transition hover:bg-green-50 hover:underline whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-green-200"
          >
            {t('prices.changeLoc')}
          </button>
        </div>

        {}
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/75 px-3 py-2 shadow-sm backdrop-blur-sm">
          <span className="flex h-2.5 w-2.5 rounded-full bg-green-500"></span>
          <p className="text-sm font-semibold text-slate-700">{t('prices.marketUpdatedToday')}</p>
          <span className="mx-2 text-slate-700">•</span>
          <p className="text-xs font-medium text-slate-700">{t('prices.dataSource')}</p>
        </div>
      </header>

      {}
      <div className="mb-6">
        <label className="relative block">
          <span className="sr-only">Search</span>
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl">🔍</span>
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('prices.searchPlaceholder')}
            className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-4 text-base text-slate-900 shadow-sm outline-none transition placeholder:text-slate-500 focus:border-[#2E7D32] focus:ring-4 focus:ring-green-100"
          />
        </label>
      </div>

      {}
      <div className="-mx-4 mb-6 flex overflow-x-auto rounded-xl border-b border-slate-300 bg-white/70 px-4 shadow-sm backdrop-blur-sm sm:mx-0 sm:px-0" role="tablist">
        {getPriceTabs().map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 border-b-2 px-5 py-3 text-base font-bold transition ${
              activeTab === tab
                ? 'border-[#2E7D32] text-[#2E7D32]'
                : 'border-transparent text-slate-800 hover:border-slate-400 hover:text-slate-950'
            }`}
          >
            {tabLabels[tab] || tab}
          </button>
        ))}
      </div>

      {}
      {selectedCrop ? (
        <div className="mb-6 rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-6">
              <div>
                <h2 className="text-3xl font-extrabold text-slate-900 uppercase tracking-tight">{getCropName(selectedCrop)}</h2>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-[#2E7D32]">{formatRupees(selectedCrop.currentPrice)}</span>
                  <span className="text-lg font-bold text-slate-700">/qtl</span>
                </div>
                <p className="mt-1 text-sm font-semibold text-slate-700 uppercase tracking-wider">{t('prices.modalPriceCol')}</p>

                <div className="mt-5 flex gap-6">
                  <div>
                    <p className="text-xs font-bold text-slate-600 uppercase">{t('prices.rangeCol')}</p>
                    <p className="mt-1 text-base font-bold text-slate-800">
                      {selectedCrop.minPrice ? `${formatRupees(selectedCrop.minPrice)} – ${formatRupees(selectedCrop.maxPrice)}` : t('prices.notAvailable')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-600 uppercase">{t('prices.trendCol')}</p>
                    <p className={`mt-1 text-base font-bold flex items-center gap-1 ${selectedCrop.trend === 'up' ? 'text-[#2E7D32]' : 'text-red-600'}`}>
                      {selectedCrop.trend === 'up' ? '↑' : '↓'} {Math.abs(selectedCrop.trendPercent)}%
                    </p>
                  </div>
                </div>
              </div>

              {}
              <div className="w-full sm:w-64 flex flex-col items-end pt-2">
                <p className="text-xs font-bold uppercase text-slate-600 mb-2 w-full text-right">{t('prices.trendTitle')} ({t('prices.days7')})</p>
                <TrendChart data={trendData} />
              </div>
            </div>
          </div>
           <div className="bg-slate-100 px-6 py-4 border-t border-slate-200 flex justify-between items-center">
             <p className="text-xs font-semibold text-slate-700">{t('prices.lastUpdated')}</p>
          </div>
        </div>
      ) : (
        <p className="mb-6 rounded-xl bg-white/80 px-4 py-3 text-center font-semibold text-slate-700">{t('common.noResults')}</p>
      )}

      {}
      {tableCrops.length > 0 && (
        <div className="mb-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead className="bg-slate-100 text-xs font-bold uppercase tracking-wider text-slate-700">
                <tr>
                  <th className="px-6 py-4">{t('prices.cropCol')}</th>
                  <th className="px-6 py-4">{t('prices.modalPriceCol')}</th>
                  <th className="px-6 py-4">{t('prices.rangeCol')}</th>
                  <th className="px-6 py-4">{t('prices.trendCol')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tableCrops.map((crop) => (
                  <tr 
                    key={crop.id} 
                    onClick={() => setSelectedCropId(crop.id)}
                    className="cursor-pointer transition hover:bg-slate-50"
                  >
                    <td className="px-6 py-5 text-lg font-bold text-slate-900">{getCropName(crop)}</td>
                    <td className="px-6 py-5 text-lg font-extrabold text-[#2E7D32]">
                      {crop.currentPrice ? formatRupees(crop.currentPrice) : '-'}
                    </td>
                    <td className="px-6 py-5 text-sm font-semibold text-slate-700">
                      {crop.minPrice ? `${formatRupees(crop.minPrice)} – ${formatRupees(crop.maxPrice)}` : '-'}
                    </td>
                    <td className={`px-6 py-5 text-lg font-bold ${crop.trend === 'up' ? 'text-[#2E7D32]' : 'text-red-600'}`}>
                      {crop.currentPrice ? (crop.trend === 'up' ? '↑' : '↓') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {}
      {selectedCrop && nearbyMandis.length > 0 && (
        <div className="mb-8">
          <h3 className="mb-4 text-xl font-extrabold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)] [text-shadow:0_2px_8px_rgba(0,0,0,0.8)]">{t('prices.nearbyTitle')}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {nearbyMandis.map((mandi, idx) => (
              <div key={mandi.id} className="rounded-2xl border border-slate-200 bg-white p-5 flex justify-between items-center">
                <div>
                  <p className="font-bold text-slate-900 text-lg">{mandi.name}</p>
                  <p className="text-sm font-semibold text-slate-700 mt-0.5">{t('prices.kmAway', { dist: Math.round(mandi.distance) })}</p>
                </div>
                <div className="text-right">
                  <p className={`text-xl font-extrabold ${idx === 0 ? 'text-[#2E7D32]' : 'text-slate-800'}`}>
                    {formatRupees(mandi.price)}
                  </p>
                  {idx === 0 && <p className="text-xs font-bold text-[#2E7D32] uppercase mt-0.5">{t('prices.bestNearbyPrice')}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2 mb-8">
        {}
        {selectedCrop && (
          <div className="rounded-3xl bg-green-50 p-6 border border-green-100 relative overflow-hidden">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#2E7D32] flex items-center gap-2">
              <span>🧠</span> {t('prices.insightTitle')}
            </h3>
            <p className="mt-3 text-base font-semibold text-slate-800 leading-relaxed">
              {t('prices.insightText', { crop: getCropName(selectedCrop), direction: selectedCrop.trend === 'up' ? t('prices.trendingUp') : t('prices.trendingDown') })}
              {nearbyMandis.length > 0 ? ` ${t('prices.bestPriceAt', { mandi: nearbyMandis[0].name, price: formatRupees(nearbyMandis[0].price) })}` : ''}
            </p>
            <a href="/buyer-discovery" className="mt-4 inline-block font-bold text-[#2E7D32] hover:underline">
              {t('prices.insightCompare')}
            </a>
          </div>
        )}

        {}
        <div className="rounded-3xl bg-white p-6 border border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
            <span>🔔</span> {t('prices.alertTitle')}
          </h3>
          <p className="text-sm font-medium text-slate-700 mb-3">
            {t('prices.alertTarget')} <span className="font-bold">{selectedCrop ? getCropName(selectedCrop) : t('prices.cropCol')}</span> reaches:
          </p>
          <div className="flex gap-2">
            <input 
              type="text" 
              defaultValue={selectedCrop ? `₹${selectedCrop.currentPrice + 100}` : ''}
              className="w-full rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-800 focus:border-[#2E7D32] focus:ring-2 focus:ring-green-100 outline-none"
            />
            <button className="shrink-0 rounded-xl bg-slate-900 px-5 py-2 text-sm font-bold text-white hover:bg-slate-800 transition">
              {t('prices.alertSetBtn')}
            </button>
          </div>
        </div>
      </div>

      {}
      <footer className="border-t-2 border-white/40 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
        <div className="rounded-xl bg-black/50 backdrop-blur-sm px-4 py-2">
          <p className="text-xs font-semibold text-white">{t('prices.dataSource')}</p>
          <p className="mt-1 text-xs font-medium text-white/80">{t('prices.dataNote')}</p>
        </div>
        <div className="rounded-xl bg-black/50 backdrop-blur-sm px-4 py-2">
          <p className="text-xs font-bold text-emerald-300">SAATHI Market Engine</p>
        </div>
      </footer>
    </section>
  );
}
