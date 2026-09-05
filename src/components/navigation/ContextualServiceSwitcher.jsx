import { useLocation, Link } from 'react-router-dom';
import {
  CurrencyRupeeIcon,
  PresentationChartLineIcon,
  UserGroupIcon,
  MapPinIcon,
  MicrophoneIcon,
  StarIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

export const SERVICE_GROUPS = {
  market: {
    id: 'market',
    title: 'MARKET',
    services: [
      {
        id: 'prices',
        title: 'Market Prices',
        description: 'Daily market rates',
        path: '/prices',
        icon: CurrencyRupeeIcon,
      },
      {
        id: 'explorer',
        title: 'Crop Journey',
        description: 'Explore crop journeys',
        path: '/explorer',
        icon: PresentationChartLineIcon,
      },
    ],
  },
  discovery: {
    id: 'discovery',
    title: 'DISCOVERY',
    services: [
      {
        id: 'buyers',
        title: 'Buyer Discovery',
        description: 'Verified buyers',
        path: '/buyers',
        icon: UserGroupIcon,
      },
      {
        id: 'mandis',
        title: 'Mandi Information',
        description: 'APMC arrivals',
        path: '/mandis',
        icon: MapPinIcon,
      },
    ],
  },
  saathi: {
    id: 'saathi',
    title: 'SAATHI',
    services: [
      {
        id: 'ai',
        title: 'Ask SAATHI',
        description: 'Voice & text AI assistant',
        path: '/ai',
        icon: MicrophoneIcon,
      },
      {
        id: 'reviews',
        title: 'Reviews',
        description: 'Community feedback',
        path: '/reviews',
        icon: StarIcon,
      },
      {
        id: 'about',
        title: 'About SAATHI',
        description: 'Platform information',
        path: '/about',
        icon: InformationCircleIcon,
      },
    ],
  },
};

export function getActiveServiceGroup(pathname) {
  for (const groupKey of Object.keys(SERVICE_GROUPS)) {
    const group = SERVICE_GROUPS[groupKey];
    if (group.services.some((s) => s.path === pathname)) {
      return group;
    }
  }
  return null;
}

export default function ContextualServiceSwitcher() {
  const location = useLocation();
  const currentGroup = getActiveServiceGroup(location.pathname);

  // Only render on inner feature pages that belong to a product group
  if (!currentGroup) {
    return null;
  }

  const colCount = currentGroup.services.length;

  return (
    <nav
      aria-label={`${currentGroup.title} section services`}
      className="w-full rounded-lg border border-[#E0E0E0] bg-[#FFFFFF] p-3 sm:p-4 shadow-xs"
    >
      {/* Product Group Header */}
      <div className="mb-2.5 flex items-center justify-between border-b border-[#E0E0E0]/60 pb-1.5">
        <span className="text-sm font-black uppercase tracking-wider text-[#424242]">
          {currentGroup.title}
        </span>
        <span className="text-xs font-semibold text-[#616161] hidden sm:inline">
          Related Services
        </span>
      </div>

      {/* Services Grid (Horizontal on Desktop, Responsive on Mobile) */}
      <div
        className={`grid gap-2 sm:gap-3 ${
          colCount === 2
            ? 'grid-cols-1 sm:grid-cols-2'
            : colCount === 3
            ? 'grid-cols-1 sm:grid-cols-3'
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
        }`}
      >
        {currentGroup.services.map((service) => {
          const isActive = location.pathname === service.path;
          const Icon = service.icon;

          return (
            <Link
              key={service.id}
              to={service.path}
              aria-current={isActive ? 'page' : undefined}
              className={`group flex items-start gap-3 rounded-md p-2.5 sm:p-3 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#B71C1C] focus:ring-offset-1 ${
                isActive
                  ? 'border-b-2 border-[#EF5350] bg-[#FFFFFF]'
                  : 'border-b-2 border-transparent bg-transparent hover:bg-[#F7F3EE]'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                <Icon
                  className={`h-5 w-5 transition-colors ${
                    isActive
                      ? 'text-[#EF5350]'
                      : 'text-[#616161] group-hover:text-[#B71C1C]'
                  }`}
                  aria-hidden="true"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className={`text-sm sm:text-base leading-snug transition-colors ${
                    isActive
                      ? 'font-bold text-[#212121]'
                      : 'font-semibold text-[#424242] group-hover:text-[#B71C1C]'
                  }`}
                >
                  {service.title}
                </div>
                <div className="mt-0.5 truncate text-xs text-[#616161]">
                  {service.description}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
