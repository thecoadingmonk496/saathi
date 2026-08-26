import { Link } from 'react-router-dom';
import { ShieldCheckIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import SectionHeader from './SectionHeader';
import SectionSideDecoration from '../common/SectionSideDecoration';

export default function PlatformIntro() {
  const workflowSteps = [
    { title: 'Discover', desc: 'Search APMC mandi rates and commodity prices.' },
    { title: 'Explore', desc: 'Understand multi-stage crop distribution journeys.' },
    { title: 'Compare', desc: 'Evaluate mandi locations and buyer requirements.' },
    { title: 'Connect', desc: 'Reach verified wholesale procurement partners.' },
  ];

  return (
    <section className="relative overflow-hidden w-full bg-[var(--saathi-background)] py-14 sm:py-16" id="about">
      {/* Decorative Side Framing */}
      <SectionSideDecoration motif="about" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="ABOUT SAATHI"
          subtitle="What is SAATHI?"
        />

        <div className="mt-8 max-w-4xl mx-auto rounded-2xl border border-[var(--saathi-border-light)] bg-[var(--saathi-surface)] p-6 sm:p-10 shadow-sm">
          <div>
            <div className="flex items-center gap-3.5">
              <span className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl bg-red-50 text-[#D91E2A] border border-red-100 shrink-0">
                <ShieldCheckIcon className="h-7 w-7 sm:h-8 sm:w-8 stroke-[2]" />
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-[var(--saathi-primary)] tracking-tight">
                Agricultural Market Platform
              </h3>
            </div>

            <p className="mt-5 text-base sm:text-lg text-[var(--saathi-text-secondary)] leading-relaxed">
              SAATHI is an independent digital platform that brings agricultural market information, mandi discovery, buyer discovery, and related tools together in one place.
            </p>

            {/* 4-Step Process: Discover -> Explore -> Compare -> Connect */}
            <div className="mt-9">
              <span className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--saathi-text-muted)] mb-3.5">
                How SAATHI Works:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                {workflowSteps.map((step, idx) => (
                  <div key={idx} className="rounded-xl border border-[var(--saathi-border-light)] bg-[var(--saathi-surface-alt)] p-4 text-center">
                    <span className="text-base sm:text-lg font-black text-[var(--saathi-primary)] block">
                      {step.title}
                    </span>
                    <span className="text-xs sm:text-sm text-[var(--saathi-text-secondary)] mt-1.5 block leading-snug">
                      {step.desc}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-9 pt-6 border-t border-[var(--saathi-border-light)] flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <p className="text-sm sm:text-base text-[var(--saathi-text-secondary)] font-medium">
              Designed to support transparent agricultural commerce across India.
            </p>
            <div className="flex justify-center">
              <Link 
                to="/about"
                className="inline-flex items-center gap-2 rounded-lg bg-[#D91E2A] hover:bg-[#b81722] px-8 py-3.5 text-base sm:text-lg font-bold text-white transition-colors focus:outline-none shadow-md"
              >
                <span>Read more about SAATHI</span>
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
