import { useUser } from '../context/UserContext';
import { BuildingStorefrontIcon, MapPinIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import LocationWidget from '../components/LocationWidget';
import { useLocationContext } from '../context/LocationContext';
import { mockMandis } from '../utils/mockData';

export default function MandiInformation() {
  const { isLoggedIn, t } = useUser();
  const { address, permissionStatus } = useLocationContext();

  const isLocationGranted = permissionStatus === 'granted' && address && address.state;
  
  // Filter mandis based on user's state, if known. Otherwise show all.
  const relevantMandis = isLocationGranted
    ? mockMandis.filter(m => m.state === address.state)
    : mockMandis;
    
  // If no mandis found for their state, just fallback to showing all of them for demo purposes.
  const displayMandis = relevantMandis.length > 0 ? relevantMandis : mockMandis;

  return (
    <div className="w-full bg-[var(--saathi-background)] min-h-screen text-[var(--saathi-text)]">
      {/* Breadcrumbs */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
        <nav className="flex text-xs font-semibold text-[var(--saathi-text-secondary)]" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2">
            <li>
              <Link to="/" className="hover:text-[var(--saathi-focus)] transition-colors">Home</Link>
            </li>
            <li><span className="text-[var(--saathi-border)]">/</span></li>
            <li>Discovery</li>
            <li><span className="text-[var(--saathi-border)]">/</span></li>
            <li className="text-[var(--saathi-text)]">Mandi Information</li>
          </ol>
        </nav>
      </div>

      {/* Page Header */}
      <header className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-5">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[var(--saathi-primary)]">
          {t('mandi.title') || 'MANDI INFORMATION'}
        </h1>
        <p className="mt-2 text-sm text-[var(--saathi-text-secondary)] font-semibold">
          {t('mandi.subtitle') || 'Explore APMC agricultural markets near you.'}
        </p>
      </header>

      {/* ── Location Widget ── */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-6">
        <LocationWidget variant="bar" />
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-20">

        {/* Show current region if location is set */}
        {isLocationGranted && (
          <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-[var(--saathi-text-secondary)]">
            <span>📍</span>
            <span>
              Showing results for&nbsp;
              <strong className="text-[var(--saathi-primary)]">
                {[address.locality, address.district, address.state].filter(Boolean).join(', ')}
              </strong>
            </span>
          </div>
        )}

        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {displayMandis.map(mandi => (
            <div key={mandi.id} className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[var(--saathi-border-light)] bg-white p-5 shadow-sm transition-all hover:border-[var(--saathi-primary)] hover:shadow-md">
              <div>
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-[#D91E2A] group-hover:bg-[#D91E2A] group-hover:text-white transition-colors">
                  <BuildingStorefrontIcon className="h-6 w-6 stroke-2" />
                </div>
                <h2 className="text-xl font-extrabold text-[var(--saathi-text)] leading-tight mb-1">
                  {mandi.name}
                </h2>
                <div className="flex items-start gap-1.5 text-sm font-medium text-[var(--saathi-text-secondary)] mt-2">
                  <MapPinIcon className="h-4 w-4 shrink-0 mt-0.5 text-slate-400" />
                  <span>
                    {mandi.district ? `${mandi.district}, ` : ''}{mandi.state}
                  </span>
                </div>
              </div>
              
              <div className="mt-5 border-t border-[var(--saathi-border-light)] pt-4">
                <Link
                  to={`/prices?market=${encodeURIComponent(mandi.name.replace(' Mandi', ''))}&state=${encodeURIComponent(mandi.state)}`}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--saathi-surface-alt)] px-4 py-2.5 text-sm font-bold text-[var(--saathi-primary)] transition hover:bg-[var(--saathi-border-light)]"
                >
                  View Market Prices <ArrowRightIcon className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {!isLoggedIn && (
          <div className="mt-10 p-6 bg-[var(--saathi-surface-alt)] rounded-2xl border border-[var(--saathi-border-light)] text-center max-w-2xl mx-auto shadow-sm">
            <h3 className="text-lg font-bold text-[var(--saathi-primary)] mb-2">
              Unlock the Full Mandi Network
            </h3>
            <p className="text-sm font-medium text-[var(--saathi-text-secondary)] mb-5">
              Sign in to view real-time APMC connections, find registered buyers, and access detailed historical price trends for your local mandis.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/login"
                className="bg-[var(--saathi-primary)] hover:bg-[var(--saathi-primary-hover)] text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-colors shadow-sm"
              >
                Login to SAATHI
              </Link>
              <Link
                to="/register"
                className="bg-white border border-[var(--saathi-border)] hover:bg-[var(--saathi-surface-alt)] text-[var(--saathi-text)] text-sm font-bold px-6 py-2.5 rounded-xl transition-colors shadow-sm"
              >
                Create Account
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}


