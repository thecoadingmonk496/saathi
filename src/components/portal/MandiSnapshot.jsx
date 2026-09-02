import { Link } from 'react-router-dom';
import { BuildingStorefrontIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import SectionHeader from './SectionHeader';
import SectionSideDecoration from '../common/SectionSideDecoration';
import { useUser } from '../../context/UserContext';

export default function MandiSnapshot() {
  const { isLoggedIn, t } = useUser();

  return (
    <section className="relative overflow-hidden w-full bg-[var(--saathi-background)] py-14 sm:py-16" id="mandis">
      {/* Decorative Side Framing */}
      <SectionSideDecoration motif="mandiInformation" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title={t('services.mandis.title') || "MANDI INFORMATION"}
          subtitle={t('services.mandis.desc') || "Explore mandi information and discover markets relevant to your region."}
        />

        <div className="mt-8 bg-[var(--saathi-surface)] rounded-2xl border border-[var(--saathi-border-light)] p-8 sm:p-12 text-center shadow-sm max-w-3xl mx-auto">
          <BuildingStorefrontIcon className="mx-auto h-14 w-14 text-[#D91E2A] stroke-[1.5] mb-4" />
          <h3 className="text-2xl sm:text-3xl font-extrabold text-[var(--saathi-primary)] mb-3 tracking-tight">
            Regional Mandi Discovery
          </h3>
          <p className="text-base sm:text-lg text-[var(--saathi-text-secondary)] leading-relaxed max-w-xl mx-auto mb-8">
            Explore APMC agricultural markets and mandi locations. Regional market discovery and facility details are actively being populated.
          </p>

          {!isLoggedIn && (
            <div className="mb-8 p-6 bg-[var(--saathi-surface-alt)] rounded-xl border border-[var(--saathi-border-light)] inline-block text-left max-w-lg w-full">
              <p className="text-base font-semibold text-[var(--saathi-text-secondary)] mb-4 leading-normal">
                Sign in to access personalized regional mandi tools and watchlists.
              </p>
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="rounded-lg bg-[var(--saathi-primary)] px-5 py-2.5 text-sm sm:text-base font-bold text-white hover:bg-[var(--saathi-primary-hover)] transition-colors shadow-sm"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="rounded-lg border border-[var(--saathi-border)] bg-white px-5 py-2.5 text-sm sm:text-base font-bold text-[var(--saathi-text)] hover:bg-[var(--saathi-surface-alt)] transition-colors shadow-sm"
                >
                  Register
                </Link>
              </div>
            </div>
          )}

          <div className="flex justify-center">
            <Link 
              to="/mandis"
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--saathi-border)] bg-white px-8 py-3.5 text-base sm:text-lg font-bold text-[var(--saathi-text)] hover:bg-[var(--saathi-surface-alt)] transition-colors focus:outline-none shadow-sm"
            >
              <span>Explore Mandi Information</span>
              <ArrowRightIcon className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
