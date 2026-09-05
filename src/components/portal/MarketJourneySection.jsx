import { Link } from 'react-router-dom';
import { PresentationChartLineIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import SectionHeader from './SectionHeader';
import SectionSideDecoration from '../common/SectionSideDecoration';
import { useUser } from '../../context/UserContext';

const STAGES = [
  { id: 1, name: 'Farmer', desc: 'Cultivation & Harvest' },
  { id: 2, name: 'Mandi', desc: 'First Point of Sale' },
  { id: 3, name: 'Wholesaler', desc: 'Bulk Aggregation' },
  { id: 4, name: 'Distributor', desc: 'Regional Logistics' },
  { id: 5, name: 'Retailer', desc: 'Consumer Market' },
];

export default function MarketJourneySection() {
  const { t } = useUser();

  return (
    <section className="relative overflow-hidden w-full bg-[var(--saathi-background)] py-14 sm:py-16" id="market-explorer">
      {/* Decorative Side Framing */}
      <SectionSideDecoration motif="marketExplorer" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title={t('nav.marketExplorer') || "CROP JOURNEY"}
          subtitle={t('services.journey.desc') || "Understanding the Agricultural Supply Chain"}
        />

        <div className="mt-8 bg-[var(--saathi-surface)] rounded-2xl border border-[var(--saathi-border-light)] p-6 sm:p-10 shadow-sm max-w-5xl mx-auto">
          <div className="flex items-center gap-3.5 mb-7">
            <span className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl bg-red-50 text-[#D91E2A] border border-red-100 shrink-0">
              <PresentationChartLineIcon className="h-7 w-7 sm:h-8 sm:w-8 stroke-[2]" />
            </span>
            <div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-[var(--saathi-primary)] tracking-tight">
                Multi-Stage Crop Distribution
              </h3>
              <p className="mt-1 text-base sm:text-lg text-[var(--saathi-text-secondary)] leading-relaxed">
                A visual overview of the standard path agricultural commodities take from harvest to consumer.
              </p>
            </div>
          </div>

          {/* 5-Stage Journey Flow */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4 my-7">
            {STAGES.map((stage, idx) => (
              <div key={stage.id} className="relative flex flex-col justify-between rounded-xl border border-[var(--saathi-border-light)] bg-[var(--saathi-surface-alt)] p-4 sm:p-5 text-center">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-bold text-[var(--saathi-text-muted)] uppercase tracking-wider">
                    Stage {stage.id}
                  </span>
                  {idx < STAGES.length - 1 && (
                    <ArrowRightIcon className="h-4 w-4 text-[var(--saathi-text-muted)] hidden lg:block" />
                  )}
                </div>
                <h4 className="text-base sm:text-lg font-black text-[var(--saathi-primary)] mb-1">
                  {stage.name}
                </h4>
                <p className="text-xs sm:text-sm text-[var(--saathi-text-secondary)] leading-snug">
                  {stage.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-[var(--saathi-border-light)] flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <p className="text-sm sm:text-base text-[var(--saathi-text-secondary)] font-medium max-w-xl">
              Learn how commodity handling, transport, and intermediary margins operate across each supply chain tier.
            </p>
            <Link 
              to="/explorer"
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--saathi-border)] bg-white px-7 py-3 text-sm sm:text-base font-bold text-[var(--saathi-text)] hover:bg-[var(--saathi-surface-alt)] transition-colors focus:outline-none shadow-sm shrink-0"
            >
              <span>Explore Market Journey</span>
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
