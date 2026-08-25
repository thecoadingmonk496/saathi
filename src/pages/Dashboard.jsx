import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowPathIcon,
  ArrowRightIcon,
  BuildingLibraryIcon,
  CheckCircleIcon,
  CurrencyRupeeIcon,
  InformationCircleIcon,
  MapPinIcon,
  MicrophoneIcon,
  PencilSquareIcon,
  PresentationChartLineIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { useLocationContext } from '../context/LocationContext';
import { useUser } from '../context/UserContext';
import { mockBuyers, mockCrops, mockPriceHistory, mockSupplyChain } from '../utils/mockData';
import { getDistricts, getVillages, locationStates } from '../utils/locationOptions';

const languageLocales = {
  English: 'en-IN',
  Hindi: 'hi-IN',
  Marathi: 'mr-IN',
  Punjabi: 'pa-IN',
  Bengali: 'bn-IN',
  Telugu: 'te-IN',
  Tamil: 'ta-IN',
  Gujarati: 'gu-IN',
  Kannada: 'kn-IN',
  Malayalam: 'ml-IN',
  Odia: 'or-IN',
  Assamese: 'as-IN',
};

const formatRupees = (value) => (
  Number.isFinite(value) ? `₹${value.toLocaleString('en-IN')}` : '—'
);

const getCropName = (crop, lang) => {
  if (!crop) return '—';
  const langMap = {
    Hindi: crop.nameHi,
    Marathi: crop.nameMr,
    Punjabi: crop.namePa,
  };
  return langMap[lang] || crop.name || '—';
};

const cropNameFor = (cropId, lang) => {
  const crop = mockCrops.find((item) => item.id === cropId);
  return getCropName(crop, lang);
};

const getAddressText = (address) => {
  if (!address) return '';
  const parts = [
    address.locality,
    address.city,
    address.district,
    address.state,
  ].filter(Boolean);
  const uniqueParts = [...new Set(parts)];
  return address.formatted || uniqueParts.join(', ');
};

const getRegionText = (address, fallback) => (
  address?.district || address?.city || address?.locality || fallback
);

const formatTimestamp = (value, language) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString(languageLocales[language] || 'en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const distanceKm = (from, to) => {
  if (!from || !to?.latitude || !to?.longitude) return null;
  const toRad = (degrees) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(earthRadiusKm * c);
};

export default function Dashboard({ onVoiceStart, voiceAssistantResponse }) {
  const navigate = useNavigate();
  const { t, preferredLanguage } = useUser();
  const {
    address,
    coordinates,
    source,
    permissionStatus,
    loading,
    lastUpdated,
    requestLocation,
    refreshLocation,
    setManualLocation: saveManualLocation,
  } = useLocationContext();
  const [manualLocation, setManualLocation] = useState({ state: '', district: '', village: '' });
  const [isManualOpen, setIsManualOpen] = useState(false);

  const addressText = getAddressText(address);
  const hasLocation = Boolean(addressText);
  const isDeviceLocation = hasLocation && source === 'device';
  const regionText = getRegionText(address, t('location.unavailable'));

  const marketRows = useMemo(() => (
    mockPriceHistory.slice(0, 4).map((record) => ({
      crop: cropNameFor(record.cropId, preferredLanguage),
      price: formatRupees(record.wholesale),
      market: record.mandi || t('dashboard.localMandi'),
    }))
  ), [preferredLanguage, t]);

  const handleLocationRefresh = () => {
    if (hasLocation) {
      refreshLocation();
      return;
    }
    requestLocation();
  };

  const handleManualSubmit = (event) => {
    event.preventDefault();
    if (!manualLocation.state || !manualLocation.district || !manualLocation.village) return;
    const saved = saveManualLocation(manualLocation);
    if (!saved) return;
    setManualLocation({ state: '', district: '', village: '' });
    setIsManualOpen(false);
  };

  return (
    <div className="relative min-h-screen bg-transparent pb-14 text-slate-900">
      <div className="pointer-events-none fixed inset-0 z-0 bg-transparent" />
      <section className="relative flex min-h-[560px] items-center px-4 pb-28 pt-36 sm:px-6 sm:pt-32 lg:min-h-[610px] lg:px-8 lg:pb-36 lg:pt-28">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/60 to-transparent" />

        <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[1.1fr_0.72fr] lg:items-end">
          <div className="max-w-3xl">
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-emerald-200/20 bg-[#063f2a]/80 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-50 shadow-lg shadow-black/15 backdrop-blur-sm sm:px-4 sm:text-xs">
              <CheckCircleIcon className="h-4 w-4" />
              {t('dashboard.heroBadge')}
            </div>

            <h1 className="mt-5 max-w-3xl text-[clamp(2rem,8vw,3rem)] font-semibold leading-[1.08] tracking-normal text-white drop-shadow-[0_3px_12px_rgba(0,0,0,0.45)] sm:mt-6 sm:text-5xl lg:text-6xl">
              {t('hero.headingLine1')} {t('hero.headingLine2')}
            </h1>
            <p className="mt-4 text-base font-semibold leading-7 text-[#fff5b8] drop-shadow-[0_2px_8px_rgba(0,0,0,0.40)] sm:mt-5 sm:text-xl">
              {t('hero.tagline')}
            </p>
            <p className="mt-3 max-w-2xl text-base font-medium leading-7 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)] sm:mt-4 sm:text-lg sm:leading-8">
              {t('dashboard.sectionBody')}
            </p>
          </div>

          <LocationPanel
            addressText={addressText}
            hasLocation={hasLocation}
            isDeviceLocation={isDeviceLocation}
            isManualOpen={isManualOpen}
            loading={loading}
            manualLocation={manualLocation}
            onLocationRefresh={handleLocationRefresh}
              onManualChange={setManualLocation}
            onManualSubmit={handleManualSubmit}
            onToggleManual={() => setIsManualOpen((current) => !current)}
            permissionStatus={permissionStatus}
            source={source}
            t={t}
          />
        </div>
      </section>

      <main className="relative -mt-24 px-4 pb-16 sm:-mt-28 sm:px-6 lg:-mt-32 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4" aria-label="Core agricultural services">
            <ServiceCard
              accent="green"
              icon={UserGroupIcon}
              title={t('card.buyersTitle')}
              body={t('card.buyersSubtitle')}
              action={t('dashboard.viewBuyersBtn')}
              onOpen={() => navigate('/buyers')}
            />
            <ServiceCard
              accent="amber"
              icon={CurrencyRupeeIcon}
              title={t('card.pricesTitle')}
              body={t('card.pricesSubtitle')}
              action={t('dashboard.viewMarketBtn')}
              onOpen={() => navigate('/prices')}
            />
            <ServiceCard
              accent="blue"
              icon={PresentationChartLineIcon}
              title={t('card.explorerTitle')}
              body={t('card.explorerSubtitle')}
              action={t('dashboard.viewJourneyBtn')}
              onOpen={() => navigate('/explorer')}
            />
            <ServiceCard
              accent="slate"
              icon={BuildingLibraryIcon}
              title={t('dashboard.govtTitle')}
              body={t('dashboard.govtSubtitleShort')}
              action={t('dashboard.viewGovtBtn')}
              onOpen={() => navigate('/government')}
            />
            <ServiceCard
              accent="green"
              icon={UserGroupIcon}
              title="Wholesalers"
              body="Propose downstream sales"
              action="View Wholesalers"
              onOpen={() => navigate('/wholesalers')}
            />
            <ServiceCard
              accent="amber"
              icon={BuildingLibraryIcon}
              title="Incoming Orders"
              body="Review wholesale proposals"
              action="View Orders"
              onOpen={() => navigate('/wholesaler/orders')}
            />
            <ServiceCard
              accent="blue"
              icon={UserGroupIcon}
              title="Distributors"
              body="Sell to distributors"
              action="View Distributors"
              onOpen={() => navigate('/distributors')}
            />
            <ServiceCard
              accent="slate"
              icon={BuildingLibraryIcon}
              title="Distributor Orders"
              body="Review distributor proposals"
              action="View Orders"
              onOpen={() => navigate('/distributor/orders')}
            />
            <ServiceCard
              accent="green"
              icon={UserGroupIcon}
              title="Retailers"
              body="Sell to retailers"
              action="View Retailers"
              onOpen={() => navigate('/retailers')}
            />
            <ServiceCard
              accent="amber"
              icon={BuildingLibraryIcon}
              title="Retailer Orders"
              body="Review retailer proposals"
              action="View Orders"
              onOpen={() => navigate('/retailer/orders')}
            />
            <ServiceCard
              accent="blue"
              icon={UserGroupIcon}
              title="Consumers"
              body="Sell to consumers"
              action="View Consumers"
              onOpen={() => navigate('/consumers')}
            />
            <ServiceCard
              accent="slate"
              icon={BuildingLibraryIcon}
              title="Consumer Purchases"
              body="Review your purchases"
              action="View Purchases"
              onOpen={() => navigate('/consumer/orders')}
            />
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_0.98fr] lg:items-start">
            <TodayMarket
              lastUpdated={lastUpdated}
              preferredLanguage={preferredLanguage}
              rows={marketRows}
              regionText={regionText}
              onOpen={() => navigate('/prices')}
              t={t}
            />
            <VoiceAssistant
              assistantResponse={voiceAssistantResponse}
              onVoiceStart={onVoiceStart}
              t={t}
            />
          </section>

          <HowSaathiHelps t={t} />
        </div>
      </main>
    </div>
  );
}

function ServiceCard({ accent, icon: Icon, title, body, action, onOpen }) {
  const accents = {
    green: 'bg-slate-100 text-slate-800 border-slate-200',
    amber: 'bg-slate-100 text-slate-800 border-slate-200',
    blue: 'bg-slate-100 text-slate-800 border-slate-200',
    slate: 'bg-slate-100 text-slate-800 border-slate-200',
  };

  return (
    <article className="group flex min-h-[210px] flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      <span className={`flex h-11 w-11 items-center justify-center rounded-md border ${accents[accent] || accents.green}`}>
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="mt-5 text-xl font-semibold leading-7 text-slate-900">
        {title}
      </h3>
      <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">
        {body}
      </p>
      <button
        className="mt-5 inline-flex min-h-10 items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-slate-200"
        type="button"
        onClick={onOpen}
      >
        {action}
        <ArrowRightIcon className="h-4 w-4 transition group-hover:translate-x-0.5" />
      </button>
    </article>
  );
}

function TodayMarket({ lastUpdated, preferredLanguage, rows, regionText, onOpen, t }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t('dashboard.priceSource')}
          </p>
          <h3 className="mt-1 text-2xl font-semibold text-slate-900">
            {t('dashboard.todayMarket')}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {t('dashboard.region')}: {regionText}
          </p>
        </div>
        <p className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
          <ArrowPathIcon className="h-4 w-4 text-slate-700" />
          {t('dashboard.lastUpdated')}: {formatTimestamp(lastUpdated, preferredLanguage)}
        </p>
      </div>

      <div className="mt-5 overflow-x-auto rounded-md border border-slate-200">
        <table className="w-full min-w-[560px] text-left text-sm">
          <caption className="sr-only">Sample market crop prices</caption>
          <thead className="bg-[#f4f0e6] text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold">{t('prices.cropCol')}</th>
              <th className="px-4 py-3 text-right font-semibold">{t('dashboard.priceCol')}</th>
              <th className="px-4 py-3 font-semibold">{t('dashboard.marketCol')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length > 0 ? rows.map((row) => (
              <tr key={`${row.crop}-${row.market}`} className="bg-white">
                <td className="px-4 py-3 font-semibold text-slate-900">{row.crop}</td>
                <td className="px-4 py-3 text-right font-semibold text-[#174532]">{row.price}</td>
                <td className="px-4 py-3 text-slate-600">{row.market}</td>
              </tr>
            )) : (
              <tr>
                <td className="px-4 py-5 text-center text-slate-500" colSpan="3">
                  {t('common.noResults')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <button
        className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-md bg-slate-800 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 focus:outline-none focus:ring-4 focus:ring-slate-200"
        type="button"
        onClick={onOpen}
      >
        {t('dashboard.viewMarketBtn')}
        <ArrowRightIcon className="h-4 w-4" />
      </button>
    </section>
  );
}

function LocationPanel({
  addressText,
  hasLocation,
  isDeviceLocation,
  isManualOpen,
  loading,
  manualLocation,
  onLocationRefresh,
  onManualChange,
  onManualSubmit,
  onToggleManual,
  permissionStatus,
  source,
  t,
}) {
  const statusText = loading
    ? t('dashboard.locationStatus.loading')
    : hasLocation
      ? isDeviceLocation
        ? t('dashboard.locationStatus.device')
        : t('dashboard.locationStatus.manual')
      : t('dashboard.locationStatus.unavailable');

  return (
    <aside className="rounded-lg border border-slate-200 bg-white p-4 text-slate-900 shadow-sm sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#f3ead7] text-[#835b12]">
          <MapPinIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#174532]">{t('location.deviceSource')}</p>
          <p className="mt-2 break-words text-lg font-semibold leading-7 text-slate-900">
            {loading
              ? t('dashboard.locationStatus.loading')
              : hasLocation
                ? addressText
                : t('dashboard.locationStatus.unavailable')}
          </p>
          <p className="mt-1 text-xs font-medium text-slate-500">
            {statusText}
          </p>
        </div>
      </div>

      {permissionStatus === 'denied' && (
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
          {t('dashboard.locationDenied')}
        </p>
      )}

      <div className="mt-5 flex flex-col items-stretch gap-2 text-sm font-semibold sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[#b9c9bf] bg-white px-3 py-2 text-[#174532] transition hover:border-[#174532] hover:bg-[#eef5ef] focus:outline-none focus:ring-4 focus:ring-emerald-100 sm:justify-start"
          type="button"
          onClick={onLocationRefresh}
        >
          <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {t('location.refresh')}
        </button>
        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-2 py-2 text-[#174532] transition hover:bg-[#eef5ef] focus:outline-none focus:ring-4 focus:ring-emerald-100 sm:justify-start"
          type="button"
          onClick={onToggleManual}
        >
          <PencilSquareIcon className="h-4 w-4" />
          {t('location.enterManually')}
        </button>
      </div>

      {isManualOpen && (
        <form className="mt-4 space-y-3" onSubmit={onManualSubmit}>
          <p className="text-xs font-medium text-slate-500">Select a valid state, district, and village/tehsil from the provided options.</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <select
              aria-label="State"
              className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-[#174532] focus:ring-4 focus:ring-emerald-100"
              value={manualLocation.state}
              onChange={(event) => onManualChange({ state: event.target.value, district: '', village: '' })}
              required
            >
              <option value="">Select state</option>
              {locationStates.map((state) => <option key={state} value={state}>{state}</option>)}
            </select>
            <select
              aria-label="District"
              className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none disabled:bg-slate-100 focus:border-[#174532] focus:ring-4 focus:ring-emerald-100"
              value={manualLocation.district}
              onChange={(event) => onManualChange({ ...manualLocation, district: event.target.value, village: '' })}
              disabled={!manualLocation.state}
              required
            >
              <option value="">Select district</option>
              {getDistricts(manualLocation.state).map((district) => <option key={district} value={district}>{district}</option>)}
            </select>
            <select
              aria-label="Village or tehsil"
              className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none disabled:bg-slate-100 focus:border-[#174532] focus:ring-4 focus:ring-emerald-100"
              value={manualLocation.village}
              onChange={(event) => onManualChange({ ...manualLocation, village: event.target.value })}
              disabled={!manualLocation.district}
              required
            >
              <option value="">Select village / tehsil</option>
              {getVillages(manualLocation.state, manualLocation.district).map((village) => <option key={village} value={village}>{village}</option>)}
            </select>
          </div>
          <button
            className="min-h-11 w-full rounded-md bg-[#174532] px-4 text-sm font-semibold text-white transition hover:bg-[#0f3325] disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-4 focus:ring-emerald-100 sm:w-auto"
            type="submit"
            disabled={!manualLocation.state || !manualLocation.district || !manualLocation.village}
          >
            {t('location.useThis')}
          </button>
        </form>
      )}

      {source === 'manual' && (
        <p className="mt-3 text-xs font-medium text-slate-500">
          {t('dashboard.manualLocationHint')}
        </p>
      )}
    </aside>
  );
}

function StatusStrip({ lastUpdated, marketAvailable, preferredLanguage, regionText, t }) {
  return (
    <section className="mt-0 grid gap-3 rounded-lg border border-[#d8d0bd] bg-[#fffdf6] p-4 shadow-lg shadow-black/5 md:-mt-8 md:grid-cols-3">
      <StatusItem label={t('dashboard.region')} value={regionText} />
      <StatusItem label={t('dashboard.marketInfo')} value={marketAvailable ? t('dashboard.priceSource') : t('common.noResults')} />
      <StatusItem label={t('dashboard.lastUpdated')} value={formatTimestamp(lastUpdated, preferredLanguage)} />
    </section>
  );
}

function StatusItem({ label, value }) {
  return (
    <div className="border-b border-[#e7deca] pb-3 last:border-b-0 last:pb-0 md:border-b-0 md:border-r md:pb-0 md:pr-4 md:last:border-r-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#173f2e]">{value}</p>
    </div>
  );
}

function MarketSnapshot({ rows, onOpen, t }) {
  return (
    <section className="rounded-lg border border-[#d9d1bf] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">{t('dashboard.priceSource')}</p>
          <h3 className="mt-1 text-2xl font-semibold text-[#173f2e]">{t('dashboard.todayMarket')}</h3>
        </div>
        <CurrencyRupeeIcon className="h-8 w-8 text-[#8a641d]" />
      </div>

      <div className="mt-5 overflow-hidden rounded-md border border-slate-200">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Demo market crop prices</caption>
          <thead className="bg-[#f4f0e6] text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold">{t('prices.cropCol')}</th>
              <th className="px-4 py-3 text-right font-semibold">{t('dashboard.priceCol')}</th>
              <th className="px-4 py-3 font-semibold">{t('dashboard.marketCol')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length > 0 ? rows.map((row) => (
              <tr key={`${row.crop}-${row.market}`} className="bg-white">
                <td className="px-4 py-3 font-semibold text-slate-900">{row.crop}</td>
                <td className="px-4 py-3 text-right font-semibold text-[#174532]">{row.price}</td>
                <td className="px-4 py-3 text-slate-600">{row.market}</td>
              </tr>
            )) : (
              <tr>
                <td className="px-4 py-5 text-center text-slate-500" colSpan="3">
                  {t('common.noResults')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <button
        className="mt-5 inline-flex items-center gap-2 rounded-md bg-[#174532] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0f3325] focus:outline-none focus:ring-4 focus:ring-emerald-100"
        type="button"
        onClick={onOpen}
      >
        {t('dashboard.viewMarketBtn')}
        <ArrowRightIcon className="h-4 w-4" />
      </button>
    </section>
  );
}

function BuyerMatching({ rows, hasDeviceLocation, onOpen, t }) {
  return (
    <section className="rounded-lg border border-[#d9d1bf] bg-[#fbfaf4] p-5 shadow-sm">
      <div className="grid gap-5 lg:grid-cols-[0.78fr_1.22fr]">
        <div className="border-b border-[#ded6c5] pb-4 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">{t('dashboard.demoLabel')}</p>
          <div className="mt-3 flex h-12 w-12 items-center justify-center rounded-md bg-[#e7f0ea] text-[#174532]">
            <UserGroupIcon className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-2xl font-semibold text-[#173f2e]">{t('card.buyersTitle')}</h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {t('card.buyersSubtitle')}
          </p>
          {!hasDeviceLocation && (
            <p className="mt-3 text-sm font-medium text-slate-500">
              {t('location.deniedMessage')}
            </p>
          )}
        </div>

        <div className="space-y-3">
          {rows.length > 0 ? rows.map((buyer) => (
            <div key={buyer.id} className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="text-base font-semibold text-slate-900">{buyer.name}</p>
                <p className="mt-1 text-sm text-slate-500">{buyer.location || '—'}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                  {buyer.verificationType && (
                    <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-800">
                      {buyer.verificationType}
                    </span>
                  )}
                  {buyer.computedDistance != null && (
                    <span className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-blue-800">
                      {buyer.computedDistance} km
                    </span>
                  )}
                </div>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t('dashboard.offeredPrice')}
                </p>
                <p className="mt-1 text-lg font-semibold text-[#174532]">{formatRupees(buyer.pricePerQtl)}</p>
                <p className="text-xs text-slate-500">/ {t('explorer.qtl')}</p>
              </div>
            </div>
          )) : (
            <p className="rounded-md border border-slate-200 bg-white p-4 text-sm font-medium text-slate-500">
              {t('common.noResults')}
            </p>
          )}

          <button
            className="inline-flex items-center gap-2 rounded-md border border-[#174532] bg-white px-4 py-2.5 text-sm font-semibold text-[#174532] transition hover:bg-[#eef5ef] focus:outline-none focus:ring-4 focus:ring-emerald-100"
            type="button"
            onClick={onOpen}
          >
            {t('dashboard.viewBuyersBtn')}
            <ArrowRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

function MarketJourney({ cropOptions, selectedCropId, selectedJourney, onCropChange, onOpen, t }) {
  const priceSteps = [
    { label: t('dashboard.farmerPrice'), value: selectedJourney?.farmerCost },
    { label: t('dashboard.wholesalePrice'), value: selectedJourney?.wholesalerCost },
    { label: t('dashboard.retailPrice'), value: selectedJourney?.consumerPrice },
  ];

  const journeyStages = [
    t('explorer.stageFarmer'),
    t('explorer.stageWholesaler'),
    t('explorer.stageDistributor'),
    t('explorer.stageRetailer'),
    t('explorer.stageConsumer'),
  ];

  const movementSteps = [
    t('dashboard.transport'),
    t('dashboard.market'),
    t('dashboard.consumer'),
  ];

  return (
    <section className="mt-6 rounded-lg border border-[#d9d1bf] bg-white p-5 shadow-sm">
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">{t('dashboard.demoLabel')}</p>
          <h3 className="mt-1 text-2xl font-semibold text-[#173f2e]">{t('dashboard.journeyTitle')}</h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {t('dashboard.journeyBody')}
          </p>

          <label className="mt-5 block max-w-xs">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              {t('dashboard.selectCrop')}
            </span>
            <select
              className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#174532] focus:ring-4 focus:ring-emerald-100"
              value={selectedCropId}
              onChange={(event) => onCropChange(Number(event.target.value))}
            >
              {cropOptions.map((crop) => (
                <option key={crop.id} value={crop.id}>{crop.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <div className="grid gap-2 sm:grid-cols-5 sm:gap-4">
            {journeyStages.map((stage, index) => (
              <div key={stage} className="relative">
                <div className="flex min-h-14 items-center justify-center rounded-md border border-[#d9d1bf] bg-[#fbfaf4] px-3 text-center text-sm font-semibold text-[#173f2e]">
                  {stage}
                </div>
                {index < journeyStages.length - 1 && (
                  <div className="absolute left-full top-1/2 hidden h-px w-4 bg-[#b8aa8f] sm:block" />
                )}
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {priceSteps.map((step) => (
              <div key={step.label} className="rounded-md border border-slate-200 bg-[#f8fafc] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{step.label}</p>
                <p className="mt-2 text-lg font-semibold text-[#174532]">{formatRupees(step.value)}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-sm font-semibold text-slate-700">
            {movementSteps.map((step) => (
              <span key={step} className="rounded border border-blue-100 bg-blue-50 px-3 py-1.5 text-blue-900">
                {step}
              </span>
            ))}
          </div>

          <button
            className="mt-5 inline-flex items-center gap-2 rounded-md bg-[#8a641d] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6f5017] focus:outline-none focus:ring-4 focus:ring-amber-100"
            type="button"
            onClick={onOpen}
          >
            {t('dashboard.viewJourneyBtn')}
            <ArrowRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

function GovernmentInfo({ onOpen, t }) {
  const categories = [
    {
      title: t('dashboard.govtCat1Title'),
      body: t('dashboard.govtCat1Body'),
    },
    {
      title: t('dashboard.govtCat2Title'),
      body: t('dashboard.govtCat2Body'),
    },
    {
      title: t('dashboard.govtCat3Title'),
      body: t('dashboard.govtCat3Body'),
    },
  ];

  return (
    <section className="rounded-lg border border-[#d9d1bf] bg-[#fffdf6] p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-md bg-blue-50 text-blue-900">
          <BuildingLibraryIcon className="h-6 w-6" />
        </span>
        <div>
          <h3 className="text-2xl font-semibold text-[#173f2e]">{t('dashboard.govtTitle')}</h3>
          <p className="mt-1 text-sm text-slate-600">{t('dashboard.govtSubtitleShort')}</p>
        </div>
      </div>

      <div className="mt-5 divide-y divide-slate-200 border-y border-slate-200">
        {categories.map((item) => (
          <div key={item.title} className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr]">
            <p className="font-semibold text-[#173f2e]">{item.title}</p>
            <p className="text-sm leading-6 text-slate-600">{item.body}</p>
          </div>
        ))}
      </div>

      <button
        className="mt-5 inline-flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-950 transition hover:bg-blue-100 focus:outline-none focus:ring-4 focus:ring-blue-100"
        type="button"
        onClick={onOpen}
      >
        {t('dashboard.viewGovtBtn')}
        <ArrowRightIcon className="h-4 w-4" />
      </button>
    </section>
  );
}

function VoiceAssistant({ assistantResponse, onVoiceStart, t }) {
  const examples = [
    t('dashboard.q1'),
    t('dashboard.q2'),
    t('dashboard.q3'),
  ];

  return (
    <section className="rounded-lg border border-emerald-300/10 bg-[#064b36] p-4 text-white shadow-xl shadow-black/15 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-md bg-white/10 text-emerald-100">
          <MicrophoneIcon className="h-6 w-6" />
        </span>
        <div>
          <h3 className="text-2xl font-semibold">{t('ai.title')}</h3>
          <p className="mt-2 text-sm leading-6 text-emerald-50/85">
            {t('ai.subtitle')}
          </p>
        </div>
      </div>

      <button
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-white px-4 text-base font-semibold text-[#173f2e] transition hover:bg-emerald-50 focus:outline-none focus:ring-4 focus:ring-white/25 sm:w-auto"
        type="button"
        onClick={onVoiceStart}
      >
        <MicrophoneIcon className="h-5 w-5" />
        {t('ai.speakButton')}
      </button>

      <div className="mt-4 grid gap-2 border-t border-white/15 pt-4 md:grid-cols-3">
        {examples.map((example) => (
          <p key={example} className="text-sm font-medium leading-6 text-emerald-50/80">
            {example}
          </p>
        ))}
      </div>

      {assistantResponse && (
        <div className="mt-5 rounded-md border border-white/15 bg-white/10 p-4 text-sm font-medium leading-6 text-white">
          {assistantResponse}
        </div>
      )}
    </section>
  );
}

function HowSaathiHelps({ t }) {
  const points = [
    {
      number: '01',
      title: t('dashboard.point1Title'),
      body: t('dashboard.point1Body'),
    },
    {
      number: '02',
      title: t('dashboard.point2Title'),
      body: t('dashboard.point2Body'),
    },
    {
      number: '03',
      title: t('dashboard.point3Title'),
      body: t('dashboard.point3Body'),
    },
  ];

  return (
    <section className="mt-5 rounded-lg border border-white/75 bg-[rgba(255,253,246,0.86)] p-5 shadow-xl shadow-black/10 backdrop-blur-sm sm:p-6">
      <div className="flex items-start gap-3">
        <InformationCircleIcon className="mt-1 h-6 w-6 shrink-0 text-[#8a641d]" />
        <div>
          <h3 className="text-2xl font-semibold text-[#173f2e]">{t('dashboard.helpTitle')}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {t('dashboard.helpBody')}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {points.map((point) => (
          <div key={point.number} className="border-l-2 border-[#c8b893] bg-white/55 py-1 pl-4 pr-3">
            <p className="text-sm font-semibold text-[#8a641d]">{point.number}</p>
            <h4 className="mt-2 text-lg font-semibold text-[#173f2e]">{point.title}</h4>
            <p className="mt-2 text-sm leading-6 text-slate-600">{point.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
