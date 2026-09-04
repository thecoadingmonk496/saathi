import { Link } from 'react-router-dom';
import {
  PhoneIcon,
  BuildingOffice2Icon,
  BeakerIcon,
  ShieldCheckIcon,
  DocumentCheckIcon,
  BookOpenIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import SectionHeader from './SectionHeader';

export default function AgricultureResources() {
  const resources = [
    {
      id: 'helpline',
      title: 'Kisan Call Center (Toll-Free)',
      hindiTitle: 'किसान कॉल सेंटर (1800-180-1551)',
      contact: '1800-180-1551',
      description: 'Free toll-free telephone support answered by agricultural graduates in 22 local languages (6:00 AM to 10:00 PM).',
      icon: PhoneIcon,
      type: 'Toll-Free Helpline',
      typeColor: 'text-[var(--saathi-accent)] bg-[var(--saathi-surface)] border-[var(--saathi-border-light)]',
      action: 'tel:18001801551',
      actionLabel: 'Call Helpline',
      isExternal: true,
    },
    {
      id: 'mandi-directory',
      title: 'APMC & e-NAM Mandi Directory',
      hindiTitle: 'मंडी संपर्क निर्देशिका',
      description: 'Direct contact details of APMC mandi secretaries, auction timing, and commodity arrival bays across states.',
      icon: BuildingOffice2Icon,
      type: 'Mandi Directory',
      typeColor: 'text-[var(--saathi-text)] bg-[var(--saathi-surface-alt)] border-[var(--saathi-border-light)]',
      path: '/prices',
      actionLabel: 'Explore Mandis',
    },
    {
      id: 'kvk',
      title: 'Krishi Vigyan Kendra (KVK)',
      hindiTitle: 'कृषि विज्ञान केंद्र नेटवर्क',
      description: 'Find your nearest district KVK for soil nutrient testing, high-yield certified seeds, and specialized field training.',
      icon: BeakerIcon,
      type: 'Scientific Hub',
      typeColor: 'text-[var(--saathi-primary)] bg-[var(--saathi-surface)] border-[var(--saathi-border-light)]',
      path: '/government',
      actionLabel: 'Find KVK Center',
    },
    {
      id: 'buyers-network',
      title: 'Verified Buyer Registry',
      hindiTitle: 'सत्यापित खरीदार रजिस्ट्री',
      description: 'Access the list of GST-authenticated grain aggregators, food processing mills, and direct retail buyers.',
      icon: ShieldCheckIcon,
      type: 'Trade Network',
      typeColor: 'text-[var(--saathi-primary)] bg-[var(--saathi-surface-alt)] border-[var(--saathi-border-light)]',
      path: '/buyers',
      actionLabel: 'Browse Buyers',
    },
    {
      id: 'produce-ledger',
      title: 'Produce Supply Chain Ledger',
      hindiTitle: 'फसल आपूर्ति श्रृंखला खाता',
      description: 'Track harvest journey, quality certifications, and price transparency across all market stages.',
      icon: DocumentCheckIcon,
      type: 'Verification',
      typeColor: 'text-accent-dark bg-red-50 border-red-200',
      path: '/explorer',
      actionLabel: 'Inspect Ledger',
    },
    {
      id: 'crop-guide',
      title: 'Seasonal Crop Practices Guide',
      hindiTitle: 'फसल उत्पादन मार्गदर्शिका',
      description: 'Comprehensive sowing schedules, fertilizer dosage calculators, and integrated pest control manuals.',
      icon: BookOpenIcon,
      type: 'Manual',
      typeColor: 'text-[var(--saathi-text-secondary)] bg-slate-100 border-[var(--saathi-border-light)]',
      path: '/prices',
      actionLabel: 'View Guide',
    },
  ];

  return (
    <section className="w-full bg-white py-16 sm:py-20" id="resources">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="FARMER RESOURCES & HELPLINES"
          hindiTitle="संसाधन एवं हेल्पलाइन"
          subtitle="Essential agricultural contact desks, research centers, mandi directories, and dispute resolution channels."
          actionText="View Complete Resource Index"
          actionLink="/government"
          accentColor="saffron"
        />

        {/* Directory Tiles Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-5">
          {resources.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-lg border border-[#D9DDE2] bg-[#FAFAFA] p-5 sm:p-6 shadow-sm transition hover:border-primary opacity-70 hover:bg-white hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-[var(--saathi-border-light)] bg-white text-primary">
                      <Icon className="h-6 w-6 stroke-[1.8]" />
                    </div>
                    <span className={`rounded-md border px-2.5 py-0.5 text-xs font-bold ${item.typeColor}`}>
                      {item.type}
                    </span>
                  </div>

                  <h3 className="mt-4 text-lg sm:text-xl font-extrabold text-white leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm font-semibold text-primary">
                    {item.hindiTitle}
                  </p>

                  <p className="mt-2.5 text-sm text-[#4A5568] leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-6 pt-3.5 border-t border-[var(--saathi-border-light)]/80">
                  {item.isExternal ? (
                    <a
                      href={item.action}
                      className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[var(--saathi-accent)] hover:underline"
                    >
                      <span>{item.actionLabel}</span>
                      <ArrowRightIcon className="h-4 w-4" />
                    </a>
                  ) : (
                    <Link
                      to={item.path}
                      className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-primary hover:underline"
                    >
                      <span>{item.actionLabel}</span>
                      <ArrowRightIcon className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
