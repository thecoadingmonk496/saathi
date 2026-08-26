import { Link } from 'react-router-dom';
import { UserGroupIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import SectionHeader from './SectionHeader';
import SectionSideDecoration from '../common/SectionSideDecoration';
import { useUser } from '../../context/UserContext';

export default function BuyerSnapshot() {
  const { isLoggedIn } = useUser();

  return (
    <section className="relative overflow-hidden w-full bg-[var(--saathi-background)] py-14 sm:py-16" id="buyers">
      {/* Decorative Side Framing */}
      <SectionSideDecoration motif="buyers" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="BUYER DISCOVERY"
          subtitle="Find buyers interested in the crops you want to sell."
        />

        <div className="mt-8 bg-[var(--saathi-surface)] rounded-2xl border border-[var(--saathi-border-light)] p-8 sm:p-12 text-center shadow-sm max-w-3xl mx-auto">
          <UserGroupIcon className="mx-auto h-14 w-14 text-[#D91E2A] stroke-[1.5] mb-4" />
          <h3 className="text-2xl sm:text-3xl font-extrabold text-[var(--saathi-primary)] mb-3 tracking-tight">
            Procurement Partner Directory
          </h3>
          <p className="text-base sm:text-lg text-[var(--saathi-text-secondary)] leading-relaxed max-w-xl mx-auto mb-8">
            Connect with verified wholesale buyers, grain traders, and food processors looking to procure crops directly from farmers.
          </p>

          {!isLoggedIn && (
            <div className="mb-8 p-6 bg-[var(--saathi-surface-alt)] rounded-xl border border-[var(--saathi-border-light)] inline-block text-left max-w-lg w-full">
              <p className="text-base font-semibold text-[var(--saathi-text-secondary)] mb-4 leading-normal">
                Sign in to view direct buyer contact details and submit procurement inquiries.
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
              to="/buyers"
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--saathi-border)] bg-white px-8 py-3.5 text-base sm:text-lg font-bold text-[var(--saathi-text)] hover:bg-[var(--saathi-surface-alt)] transition-colors focus:outline-none shadow-sm"
            >
              <span>Find Buyers</span>
              <ArrowRightIcon className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
