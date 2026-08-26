import {
  WrenchScrewdriverIcon,
  BuildingLibraryIcon,
  UserGroupIcon,
  CurrencyRupeeIcon,
  CheckBadgeIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import { useUser } from '../../context/UserContext';

export default function StatisticsBar() {
  const { t } = useUser();

  const statistics = [
    {
      id: 'online-services',
      value: '24+',
      labelKey: 'stats.onlineServices',
      icon: WrenchScrewdriverIcon,
      color: 'text-[#E51B2A] bg-red-50/70 border-red-200',
    },
    {
      id: 'govt-schemes',
      value: '48+',
      labelKey: 'stats.govtSchemes',
      icon: BuildingLibraryIcon,
      color: 'text-[#E51B2A] bg-red-50/70 border-red-200',
    },
    {
      id: 'registered-farmers',
      value: '12,500+',
      labelKey: 'stats.registeredFarmers',
      icon: UserGroupIcon,
      color: 'text-[#E51B2A] bg-red-50/70 border-red-200',
    },
    {
      id: 'market-listings',
      value: '1,850+',
      labelKey: 'stats.marketListings',
      icon: CurrencyRupeeIcon,
      color: 'text-[#E51B2A] bg-red-50/70 border-red-200',
    },
    {
      id: 'verified-buyers',
      value: '920+',
      labelKey: 'stats.verifiedBuyers',
      icon: CheckBadgeIcon,
      color: 'text-[#E51B2A] bg-red-50/70 border-red-200',
    },
    {
      id: 'info-categories',
      value: '18',
      labelKey: 'stats.infoCategories',
      icon: Squares2X2Icon,
      color: 'text-[#E51B2A] bg-red-50/70 border-red-200',
    },
  ];

  return (
    <div className="relative z-20 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 -mb-10 sm:-mb-12">
      <div className="rounded-xl border border-[#D9DDE2] bg-white p-4 sm:p-5 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:gap-2 divide-y sm:divide-y-0 divide-slate-100">
          {statistics.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.id}
                className={`flex items-center gap-3 pt-2.5 sm:pt-0 sm:px-2.5 ${
                  index !== 0 ? 'lg:border-l lg:border-[var(--saathi-border-light)]/80' : ''
                }`}
              >
                {/* Outlined badge */}
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${stat.color}`}
                >
                  <Icon className="h-5 w-5 stroke-[1.8]" aria-hidden="true" />
                </div>

                {/* Number & label */}
                <div className="min-w-0 flex-1">
                  <span className="block text-lg sm:text-xl font-bold tracking-tight text-[#161616] leading-tight">
                    {stat.value}
                  </span>
                  <span className="block truncate text-xs font-semibold text-[#5F6368]">
                    {t(stat.labelKey)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
