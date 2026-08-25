import { NavLink, Link } from 'react-router-dom';
import {
  ArrowRightOnRectangleIcon,
  BellIcon,
  CurrencyRupeeIcon,
  HomeIcon,
  MapIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { ChevronDown } from 'lucide-react';
import { useUser } from '../context/UserContext';

const getLanguageCode = (language, supportedLanguages = []) => (
  supportedLanguages.find((option) => option.code === language || option.name === language)?.code || 'hi'
);

export default function PlatformTopNav({ preferredLanguage, user, onLanguageChange, onLogout, onVoiceStart }) {
  const { supportedLanguages, t } = useUser();
  const selectedLanguageCode = getLanguageCode(preferredLanguage, supportedLanguages);

  const navItems = [
    { label: t('nav.dashboard'), mobileLabel: t('nav.dashboard'), path: '/', icon: HomeIcon },
    { label: t('nav.cropJourney') || 'Crop Journey', mobileLabel: t('nav.cropJourney') || 'Crop Journey', path: '/crop-journey', icon: MapIcon },
    { label: t('nav.marketPrices'), mobileLabel: t('nav.marketPrices'), path: '/prices', icon: CurrencyRupeeIcon },
    { label: t('nav.buyerDiscovery'), mobileLabel: t('nav.buyerDiscovery'), path: '/buyers', icon: UserGroupIcon },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-[#0C3B2E] text-white shadow-sm border-b border-emerald-900/20">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-2 px-3 py-2 sm:px-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">

        <div className="flex items-center justify-between gap-2 sm:gap-4 lg:justify-start">
          <Link className="flex min-h-10 shrink-0 items-center gap-2" to="/" aria-label="SAATHI dashboard">
            <img
              alt="SAATHI logo"
              className="h-9 w-9 rounded-full border border-emerald-400/40 bg-white object-contain p-0.5 shadow-md"
              src="/logo.png"
            />
            <span className="leading-tight">
              <span className="block text-base font-extrabold tracking-wide text-white">SAATHI</span>
              <span className="hidden text-[10px] font-medium text-emerald-200/80 sm:block">
                Aapki Aawaz, Aapka Bazaar
              </span>
            </span>
          </Link>
        </div>

        <nav className="w-full grid grid-cols-4 gap-1 sm:gap-2 lg:w-auto lg:flex lg:shrink-0 lg:items-center lg:justify-center lg:gap-2" aria-label="Main platform tabs">
          {navItems.map((item) => (
            <TopNavItem key={item.path} item={item} />
          ))}
        </nav>

        <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">
          <label className="sr-only" htmlFor="platform-language-select">Language</label>
          <select
            id="platform-language-select"
            aria-label="Language"
            className="h-9 shrink-0 rounded-full border border-emerald-500/40 bg-[#061e17]/90 px-3 text-xs font-semibold text-emerald-100 outline-none transition focus:ring-2 focus:ring-emerald-400/40 cursor-pointer"
            value={selectedLanguageCode}
            onChange={(event) => onLanguageChange?.(event.target.value)}
          >
            {supportedLanguages?.map((lang) => (
              <option key={lang.code} value={lang.code} className="bg-slate-900 text-white font-medium">
                {lang.name === 'English' ? 'English' : lang.nativeName}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onVoiceStart}
            className="flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full bg-white px-3 font-bold text-[#0C3B2E] shadow-sm transition hover:bg-slate-100 hover:scale-105 active:scale-95"
          >
            <span className="flex items-center justify-center rounded-full bg-[#0C3B2E] p-1 text-white">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3">
                <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
                <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
              </svg>
            </span>
            <span className="text-xs">Ask SAATHI</span>
          </button>

          <button className="relative ml-1 flex h-9 w-9 items-center justify-center rounded-full text-white hover:bg-[#1B4D3E] transition">
            <BellIcon className="h-5 w-5" />
            <span className="absolute top-2 right-2.5 h-1.5 w-1.5 rounded-full bg-red-500 ring-2 ring-[#0C3B2E]"></span>
          </button>

          <div className="ml-1 h-6 w-px bg-white/20 hidden sm:block"></div>

          <button
            onClick={onLogout}
            className="flex shrink-0 items-center gap-2 rounded-full px-2 py-1 transition hover:bg-[#1B4D3E]"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#10B981] text-xs font-bold text-[#0C3B2E] shadow-sm ring-2 ring-white/10">
              R
            </div>
            <span className="hidden text-xs font-semibold text-white sm:block">Ramesh Kumar</span>
            <ChevronDown className="h-3 w-3 text-white/70" />
          </button>
        </div>
      </div>
    </header>
  );
}

function TopNavItem({ item }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      className={({ isActive }) =>
        `flex items-center justify-center gap-1.5 rounded-full px-4 py-1.5 text-xs transition whitespace-nowrap ${
          isActive
            ? 'bg-[#1B4D3E] text-white font-medium shadow-sm'
            : 'text-white/80 font-medium hover:bg-[#1B4D3E]/50 hover:text-white'
        }`
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="hidden whitespace-nowrap lg:inline">{item.label}</span>
    </NavLink>
  );
}
