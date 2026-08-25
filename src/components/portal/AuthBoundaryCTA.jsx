import { Link } from 'react-router-dom';
import {
  UserCircleIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { useUser } from '../../context/UserContext';

export default function AuthBoundaryCTA() {
  const { isLoggedIn, user } = useUser();

  if (isLoggedIn) {
    return (
      <section className="relative w-full bg-[var(--saathi-background)] pt-8 pb-12">
        {/* Red bottom background band */}
        <div className="absolute inset-x-4 sm:inset-x-8 lg:inset-x-16 bottom-4 sm:bottom-6 h-1/2 bg-[#D91E2A] rounded-2xl" aria-hidden="true" />

        <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 text-center">
          <div className="rounded-2xl bg-white p-6 sm:p-10 shadow-2xl text-[var(--saathi-text)] border border-slate-100">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-[#D91E2A] mb-4">
              <UserCircleIcon className="h-8 w-8" />
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-[#13233A]">
              Welcome back, {user?.name || 'User'}!
            </h3>
            <p className="mt-2 text-sm sm:text-base text-[var(--saathi-text-secondary)] max-w-lg mx-auto">
              Your member account provides access to SAATHI platform features.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3.5">
              <Link
                to="/buyers"
                className="rounded-lg bg-[#D91E2A] hover:bg-[#c91823] px-6 py-2.5 text-sm sm:text-base font-bold text-white transition shadow-sm"
              >
                Browse Buyers
              </Link>
              <Link
                to="/profile"
                className="rounded-lg border border-[var(--saathi-border)] bg-white px-6 py-2.5 text-sm sm:text-base font-bold text-[var(--saathi-text)] hover:bg-[var(--saathi-surface-alt)] transition shadow-sm"
              >
                Go to Profile
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative w-full bg-[var(--saathi-background)] pt-10 pb-16" id="join">
      {/* Red bottom background band that starts at card midpoint */}
      <div className="absolute inset-x-4 sm:inset-x-8 lg:inset-x-16 bottom-4 sm:bottom-6 h-1/2 bg-[#D91E2A] rounded-2xl" aria-hidden="true" />

      <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 text-center">
        <div className="rounded-2xl bg-white p-6 sm:p-10 shadow-2xl text-[var(--saathi-text)] border border-slate-100">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#13233A] tracking-tight">
            Ready to Use SAATHI?
          </h2>

          <p className="mt-3 text-base sm:text-lg text-[var(--saathi-text-secondary)] max-w-2xl mx-auto leading-relaxed">
            Create an account to access features that require sign-in, including direct buyer contact details and personal settings.
          </p>

          {/* Action Buttons: Create Account, Sign In, Continue Browsing */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-[#D91E2A] hover:bg-[#c91823] px-7 py-3 text-sm sm:text-base font-bold text-white transition shadow-md hover:shadow-lg active:scale-95"
            >
              <span>Create Account</span>
              <ArrowRightIcon className="h-4 w-4 stroke-[2.5]" />
            </Link>

            <Link
              to="/login"
              className="rounded-lg border border-[var(--saathi-border)] bg-white px-7 py-3 text-sm sm:text-base font-bold text-[var(--saathi-text)] hover:bg-[var(--saathi-surface-alt)] transition shadow-sm active:scale-95"
            >
              Sign In
            </Link>

            <a
              href="#services"
              className="rounded-lg px-5 py-3 text-sm sm:text-base font-semibold text-[var(--saathi-text-secondary)] hover:text-[var(--saathi-text)] transition"
            >
              Continue Browsing
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
