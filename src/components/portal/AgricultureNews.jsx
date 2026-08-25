import { Link } from 'react-router-dom';
import {
  NewspaperIcon,
  CalendarDaysIcon,
  ArrowRightIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import SectionHeader from './SectionHeader';

export default function AgricultureNews() {
  const featuredStory = {
    title: 'Cabinet Approves Revision in Minimum Support Prices (MSP) for Rabi Crops 2026-27',
    hindiTitle: 'रबी फसलों के लिए न्यूनतम समर्थन मूल्य (MSP) में वृद्धि को मंजूरी',
    category: 'Government Notification',
    date: '22 August 2026',
    source: 'Ministry of Agriculture & Farmers Welfare',
    excerpt:
      'The Union Cabinet has approved higher Minimum Support Prices (MSP) across all mandated Rabi crops including Wheat, Mustard, Gram, and Barley to ensure remunerative prices to growers and promote crop diversification.',
    highlights: [
      'Wheat MSP increased to ₹2,425 per quintal',
      'Mustard benchmark revised to ₹5,950 per quintal',
      'Special procurement drive to commence across Northern Mandis',
    ],
  };

  const bulletins = [
    {
      id: 1,
      title: 'IMD Agro-Meteorological Advisory: Monsoon progress and soil moisture levels across central belts',
      date: 'Today, 09:30 AM',
      category: 'Weather Advisory',
      department: 'India Meteorological Department (IMD)',
      tagColor: 'text-[var(--saathi-text)] bg-[var(--saathi-surface-alt)] border-[var(--saathi-border-light)]',
    },
    {
      id: 2,
      title: 'Kisan Credit Card (KCC) saturation drive extended with streamlined processing for allied sectors',
      date: '21 Aug 2026',
      category: 'Credit & Banking',
      department: 'Department of Financial Services',
      tagColor: 'text-[var(--saathi-primary)] bg-[var(--saathi-surface)] border-[var(--saathi-border-light)]',
    },
    {
      id: 3,
      title: 'e-NAM Mandi Integration surpasses 1,400 APMC markets for inter-state electronic trading',
      date: '20 Aug 2026',
      category: 'Market Trade',
      department: 'Small Farmers Agri-Business Consortium (SFAC)',
      tagColor: 'text-[var(--saathi-text-secondary)] bg-[var(--saathi-surface-alt)] border-[var(--saathi-border-light)]',
    },
    {
      id: 4,
      title: 'ICAR issues integrated pest management guidelines for Kharif paddy in humid plains',
      date: '19 Aug 2026',
      category: 'Crop Advisory',
      department: 'Indian Council of Agricultural Research (ICAR)',
      tagColor: 'text-accent-dark bg-red-50 border-red-200',
    },
  ];

  return (
    <section className="w-full bg-background py-16 sm:py-20" id="news">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="AGRICULTURE NEWS & ADVISORIES"
          hindiTitle="कृषि समाचार एवं परामर्श"
          subtitle="Timely agricultural notifications, weather forecasts, market policy bulletins, and research advisories."
          actionText="View All Agriculture News"
          actionLink="/government"
          accentColor="red"
        />

        {/* Editorial 2-Column News Layout */}
        <div className="grid gap-6 lg:grid-cols-12 lg:items-stretch">
          {/* LEFT: Featured Story (7 Cols) */}
          <article className="flex flex-col justify-between rounded-lg border border-[#D9DDE2] bg-white p-6 sm:p-8 shadow-sm lg:col-span-7">
            <div>
              {/* Image banner */}
              <div className="relative h-56 sm:h-64 w-full overflow-hidden rounded-md bg-slate-900">
                <img
                  src="/saathi-hero-field.jpg"
                  alt="Harvested crop grains in Indian agricultural mandi"
                  className="h-full w-full object-cover brightness-95 transition-transform duration-500 hover:scale-105"
                />
                <div className="absolute left-3.5 top-3.5 rounded-md bg-primary-dark px-3 py-1 text-xs font-bold text-white shadow-sm">
                  {featuredStory.category}
                </div>
              </div>

              {/* Story Details */}
              <div className="mt-4 flex items-center gap-3 text-xs sm:text-sm font-semibold text-[#5F6368]">
                <span className="flex items-center gap-1.5">
                  <CalendarDaysIcon className="h-4 w-4" />
                  <span>{featuredStory.date}</span>
                </span>
                <span>•</span>
                <span className="text-white font-bold">{featuredStory.source}</span>
              </div>

              <h3 className="mt-3.5 text-xl sm:text-2xl lg:text-3xl font-black text-[#161616] leading-snug">
                {featuredStory.title}
              </h3>
              <p className="mt-1 text-xs sm:text-sm font-semibold text-white">
                {featuredStory.hindiTitle}
              </p>

              <p className="mt-3.5 text-sm sm:text-base text-[#4A5568] leading-relaxed">
                {featuredStory.excerpt}
              </p>

              {/* Key Points */}
              <div className="mt-5 space-y-2 rounded-md border border-slate-100 bg-background p-4 text-xs sm:text-sm font-medium text-[var(--saathi-text)]">
                <span className="block text-xs font-extrabold uppercase tracking-wider text-[#161616]">
                  Key Announcements:
                </span>
                {featuredStory.highlights.map((h, i) => (
                  <p key={i} className="flex items-center gap-2.5">
                    <span className="h-2 w-2 rounded-full bg-[#E51B2A] shrink-0" />
                    <span>{h}</span>
                  </p>
                ))}
              </div>
            </div>

            <div className="mt-7 pt-4 border-t border-slate-100 flex items-center justify-between">
              <Link
                to="/prices"
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-white hover:underline"
              >
                <span>Read Full Mandi MSP Breakdown</span>
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
          </article>

          {/* RIGHT: Latest Updates Feed (5 Cols) */}
          <div className="flex flex-col rounded-lg border border-[#D9DDE2] bg-white p-6 shadow-sm lg:col-span-5">
            <div className="flex items-center justify-between border-b border-[#D9DDE2] pb-3.5">
              <div className="flex items-center gap-2">
                <NewspaperIcon className="h-5 w-5 text-[#E51B2A]" />
                <h3 className="text-sm sm:text-base font-extrabold uppercase tracking-wider text-[#161616]">
                  Latest Bulletins & Advisories
                </h3>
              </div>
              <span className="flex h-2.5 w-2.5 rounded-full bg-slate-500 animate-pulse" />
            </div>

            <div className="mt-3.5 divide-y divide-slate-100 flex-1 flex flex-col justify-between">
              {bulletins.map((item) => (
                <div key={item.id} className="py-4 first:pt-1 last:pb-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`rounded-md border px-2.5 py-0.5 text-xs font-bold ${item.tagColor}`}>
                      {item.category}
                    </span>
                    <span className="text-xs font-medium text-[#5F6368]">
                      {item.date}
                    </span>
                  </div>

                  <Link
                    to="/government"
                    className="mt-2 block text-xs sm:text-sm font-bold text-[#161616] hover:text-white transition leading-snug"
                  >
                    {item.title}
                  </Link>

                  <p className="mt-1 text-xs text-[#5F6368]">
                    {item.department}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-3.5 border-t border-slate-100">
              <Link
                to="/government"
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-[#D9DDE2] bg-background py-2.5 text-xs sm:text-sm font-bold text-[#161616] hover:bg-slate-100 transition"
              >
                <span>View Full Bulletin Archive</span>
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
