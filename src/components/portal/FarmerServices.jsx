import { Link } from 'react-router-dom';
import {
  CurrencyRupeeIcon,
  BuildingStorefrontIcon,
  UserGroupIcon,
  PresentationChartLineIcon,
  MicrophoneIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import SectionHeader from './SectionHeader';

export default function FarmerServices({ onVoiceStart }) {
  const services = [
    {
      id: 'prices',
      title: 'Market Prices',
      description: 'View APMC mandi rates and price trends across major agricultural commodities.',
      path: '/prices',
      icon: CurrencyRupeeIcon,
      actionText: 'View Market Prices',
    },
    {
      id: 'mandis',
      title: 'Mandi Information',
      description: 'Explore APMC agricultural markets and mandi locations relevant to your region.',
      path: '/mandis',
      icon: BuildingStorefrontIcon,
      actionText: 'Explore Mandis',
    },
    {
      id: 'buyers',
      title: 'Buyer Discovery',
      description: 'Find registered procurement partners and wholesale buyers interested in your crops.',
      path: '/buyers',
      icon: UserGroupIcon,
      actionText: 'Find Buyers',
    },
    {
      id: 'journey',
      title: 'Market Explorer',
      description: 'Understand the multi-stage crop journey and supply chain distribution stages.',
      path: '/explorer',
      icon: PresentationChartLineIcon,
      actionText: 'Explore Journey',
    },
    {
      id: 'voice',
      title: 'Ask SAATHI',
      description: 'Use voice-assisted and text queries to quickly search agricultural market information.',
      action: onVoiceStart,
      icon: MicrophoneIcon,
      actionText: 'Ask SAATHI',
    },
  ];

  return (
    <section className="w-full bg-[var(--saathi-background)] py-14 sm:py-16" id="services">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <SectionHeader
          title="ONLINE SERVICES"
          subtitle="Explore market rates, discover mandis, connect with buyers, track supply chain, and use voice assistance."
        />

        {/* 5 Feature Cards Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 sm:gap-5">
          {services.map((srv) => {
            const Icon = srv.icon;

            const cardBody = (
              <div className="flex h-full flex-col rounded-xl bg-[#D91E2A] p-5 sm:p-6 text-center text-white shadow-md hover:shadow-xl hover:bg-[#c91823] transition-all duration-200 group border border-red-700/30">
                {/* Top content: icon + title + description */}
                <div className="flex-1 flex flex-col items-center">
                  {/* Icon */}
                  <div className="mb-4 flex h-14 w-14 items-center justify-center text-white">
                    <Icon className="h-10 w-10 stroke-[1.8]" />
                  </div>

                  {/* Title */}
                  <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-white leading-tight mb-2.5">
                    {srv.title}
                  </h3>

                  {/* Description */}
                  <p className="text-xs text-white/90 leading-relaxed">
                    {srv.description}
                  </p>
                </div>

                {/* Bottom action link — always pinned to card bottom */}
                <div className="mt-4 pt-3 border-t border-white/20 w-full flex items-center justify-center gap-1.5 text-xs font-bold text-white whitespace-nowrap group-hover:underline">
                  <span>{srv.actionText}</span>
                  <ArrowRightIcon className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            );

            if (srv.action) {
              return (
                <button
                  key={srv.id}
                  type="button"
                  onClick={srv.action}
                  className="group text-left focus:outline-none rounded-xl h-full cursor-pointer"
                >
                  {cardBody}
                </button>
              );
            }

            return (
              <Link
                key={srv.id}
                to={srv.path}
                className="group focus:outline-none rounded-xl h-full"
              >
                {cardBody}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
