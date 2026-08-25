import { useUser } from '../context/UserContext';
import { BuildingStorefrontIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

export default function MandiInformation() {
  const { isLoggedIn } = useUser();

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
      <header className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-8">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[var(--saathi-primary)]">
          MANDI INFORMATION
        </h1>
        <p className="mt-2 text-sm text-[var(--saathi-text-secondary)] font-semibold">
          Explore APMC agricultural markets.
        </p>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-20">
        <div className="bg-[var(--saathi-surface)] rounded-lg border border-[var(--saathi-border-light)] p-8 sm:p-12 text-center shadow-sm">
          <BuildingStorefrontIcon className="mx-auto h-12 w-12 text-[#D91E2A] stroke-[1.5] mb-4" />
          <h2 className="text-lg font-bold text-[var(--saathi-primary)] mb-2">
            No mandi information is available for this selection.
          </h2>
          <p className="text-sm text-[var(--saathi-text-secondary)] max-w-md mx-auto mb-6">
            Our market intelligence network is currently aggregating APMC location data. 
            Mandi discovery will be available in your region once data integration is complete.
          </p>
          
          {!isLoggedIn && (
            <div className="mt-6 p-4 bg-[var(--saathi-surface-alt)] rounded-md border border-[var(--saathi-border-light)] inline-block text-left">
              <p className="text-xs font-semibold text-[var(--saathi-text-secondary)] mb-3">
                Sign in to view more mandi information.
              </p>
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="bg-[var(--saathi-primary)] hover:bg-[var(--saathi-primary-hover)] text-white text-xs font-bold px-4 py-2 rounded-md transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-white border border-[var(--saathi-border)] hover:bg-[var(--saathi-surface-alt)] text-[var(--saathi-text)] text-xs font-bold px-4 py-2 rounded-md transition-colors"
                >
                  Register
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
