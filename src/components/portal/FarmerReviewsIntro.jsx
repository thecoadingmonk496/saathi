import { StarIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import SectionHeader from './SectionHeader';
import SectionSideDecoration from '../common/SectionSideDecoration';
import { Link } from 'react-router-dom';

export default function FarmerReviewsIntro() {
  return (
    <section className="relative overflow-hidden w-full bg-[var(--saathi-background)] py-14 sm:py-16" id="reviews">
      {/* Decorative Side Framing */}
      <SectionSideDecoration motif="reviews" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="REVIEWS & EXPERIENCES"
          subtitle="Community feedback and marketplace trust."
        />

        <div className="mt-8 bg-[var(--saathi-surface)] rounded-2xl border border-[var(--saathi-border-light)] p-8 sm:p-12 text-center shadow-sm max-w-3xl mx-auto">
          <StarIcon className="mx-auto h-14 w-14 text-[#D91E2A] stroke-[1.5] mb-4" />
          <h3 className="text-2xl sm:text-3xl font-extrabold text-[var(--saathi-primary)] mb-3 tracking-tight">
            No reviews yet.
          </h3>
          <p className="text-base sm:text-lg text-[var(--saathi-text-secondary)] leading-relaxed max-w-xl mx-auto mb-8">
            User experiences and transaction feedback will appear here as the community grows and farmers review procurement interactions.
          </p>
          <div className="flex justify-center">
            <Link 
              to="/reviews"
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--saathi-border)] bg-white px-8 py-3.5 text-base sm:text-lg font-bold text-[var(--saathi-text)] hover:bg-[var(--saathi-surface-alt)] transition-colors focus:outline-none shadow-sm"
            >
              <span>Read Reviews</span>
              <ArrowRightIcon className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
