import { Link } from 'react-router-dom';
import { ChartBarIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import SectionHeader from './SectionHeader';
import SectionSideDecoration from '../common/SectionSideDecoration';

export default function MarketInformation() {
  return (
    <section className="relative overflow-hidden w-full bg-[var(--saathi-background)] py-14 sm:py-16" id="market-prices">
      {/* Decorative Side Framing */}
      <SectionSideDecoration motif="marketPrices" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="MARKET PRICES"
          subtitle="Current APMC mandi rates and price information."
        />

        <div className="mt-8 bg-[var(--saathi-surface)] rounded-2xl border border-[var(--saathi-border-light)] p-8 sm:p-12 text-center shadow-sm max-w-3xl mx-auto">
          <ChartBarIcon className="mx-auto h-14 w-14 text-[#D91E2A] stroke-[1.5] mb-4" />
          <h3 className="text-2xl sm:text-3xl font-extrabold text-[var(--saathi-primary)] mb-3 tracking-tight">
            Market price information is currently unavailable.
          </h3>
          <p className="text-base sm:text-lg text-[var(--saathi-text-secondary)] leading-relaxed max-w-xl mx-auto mb-8">
            APMC market price data integration is currently in progress. 
            Once connected, daily commodity prices and wholesale mandi trends will appear here.
          </p>
          <div className="flex justify-center">
            <Link 
              to="/prices"
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--saathi-border)] bg-white px-8 py-3.5 text-base sm:text-lg font-bold text-[var(--saathi-text)] hover:bg-[var(--saathi-surface-alt)] transition-colors focus:outline-none shadow-sm"
            >
              <span>View Market Prices</span>
              <ArrowRightIcon className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
