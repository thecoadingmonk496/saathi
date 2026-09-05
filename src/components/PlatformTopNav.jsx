import { NavLink, Link } from 'react-router-dom';
import {
  ArrowRightOnRectangleIcon,
  BellIcon,
  CurrencyRupeeIcon,
  HomeIcon,
  MapIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { useUser } from '../context/UserContext';
import saathiLogo from '../assets/logo.png';

const getLanguageCode = (language, supportedLanguages = []) => (
  supportedLanguages.find((option) => option.code === language || option.name === language)?.code || 'hi'
);

export default function PlatformTopNav({ preferredLanguage, user, onLanguageChange, onLogout, onVoiceStart }) {
  const { supportedLanguages, t } = useUser();
  const selectedLanguageCode = getLanguageCode(preferredLanguage, supportedLanguages);

  const navItems = [
    { label: t('nav.dashboard'), mobileLabel: t('nav.dashboard'), path: '/', icon: HomeIcon },
    { label: t('nav.marketExplorer'), mobileLabel: t('nav.marketExplorer'), path: '/explorer', icon: MapIcon },
    { label: t('nav.marketPrices'), mobileLabel: t('nav.marketPrices'), path: '/prices', icon: CurrencyRupeeIcon },
    { label: t('nav.buyerDiscovery'), mobileLabel: t('nav.buyerDiscovery'), path: '/buyers', icon: UserGroupIcon },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-[var(--saathi-surface)] text-[var(--saathi-text)] border-b border-[var(--saathi-border-light)] shadow-sm">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-2 px-3 py-2 sm:px-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">

        <div className="flex items-center justify-between gap-2 sm:gap-4 lg:justify-start">
          <Link className="flex min-h-10 shrink-0 items-center gap-2" to="/" aria-label="SAATHI dashboard">
            <img
              alt="SAATHI logo"
              className="h-9 w-9 object-contain"
              src={saathiLogo}
            />
            <div className="flex flex-col justify-center">
              <span className="text-xl font-black uppercase tracking-widest text-[var(--saathi-primary)] leading-none">
                SAATHI
              </span>
              <span className="hidden text-xs font-bold text-[#52b788] sm:block">
                Aapki Aawaz, Aapka Bazaar
              </span>
            </div>
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
            className="h-9 shrink-0 rounded-md border border-[var(--saathi-border)] bg-[var(--saathi-surface)] px-3 text-xs font-semibold text-[var(--saathi-text)] outline-none transition focus:ring-2 focus:border-[var(--saathi-focus)] cursor-pointer"
            value={selectedLanguageCode}
            onChange={(event) => onLanguageChange?.(event.target.value)}
          >
            {supportedLanguages?.map((lang) => (
              <option key={lang.code} value={lang.code} className="bg-white text-[#212121] font-medium">
                {lang.name === 'English' ? 'English' : lang.nativeName}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onVoiceStart}
            className="hidden h-9 shrink-0 items-center gap-2 rounded-md border border-[var(--saathi-border)] bg-[var(--saathi-surface)] px-3.5 text-xs font-bold text-[var(--saathi-text)] transition hover:bg-[var(--saathi-surface-alt)] focus:outline-none focus:ring-2 focus:ring-[var(--saathi-focus)] sm:inline-flex shadow-sm"
          >
            <img
              src="/saathi-mic-logo.png"
              alt="SAATHI AI"
              className="h-5 w-5 rounded-md bg-[#fdfbf7] object-contain p-0.5 shadow-sm"
            />
            <span>{t('nav.askSaathi')}</span>
          </button>

          <Link
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--saathi-border)] bg-[var(--saathi-surface)] text-[var(--saathi-text)] transition hover:bg-[var(--saathi-surface-alt)] focus:outline-none focus:ring-2 focus:ring-[var(--saathi-focus)]"
            to="/notifications"
            aria-label={t('nav.notifications')}
          >
            <BellIcon className="h-4.5 w-4.5" />
          </Link>

          <Link
            className="flex h-9 shrink-0 items-center gap-2 rounded-md border border-[var(--saathi-border)] bg-[var(--saathi-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--saathi-text)] transition hover:bg-[var(--saathi-surface-alt)] focus:outline-none focus:ring-2 focus:ring-[var(--saathi-focus)]"
            to="/profile"
            aria-label={t('nav.profile')}
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--saathi-primary)] text-[#212121] font-bold text-xs">
              {user?.name ? user.name[0] : 'R'}
            </div>
            <span className="hidden text-xs font-semibold sm:inline">{user?.name || 'Ramesh Kumar'}</span>
          </Link>

          <button
            type="button"
            onClick={onLogout}
            aria-label={t('nav.logout')}
            title={t('nav.logout')}
            className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--saathi-border)] bg-[var(--saathi-surface)] text-[var(--saathi-text-secondary)] transition hover:bg-[var(--saathi-surface-alt)] hover:text-[var(--saathi-text)] sm:flex"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4" />
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
        `flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition whitespace-nowrap ${
          isActive
            ? 'bg-[var(--saathi-primary-light)] text-[var(--saathi-primary-dark)] font-bold'
            : 'text-[var(--saathi-text-secondary)] hover:bg-[var(--saathi-surface-alt)] hover:text-[var(--saathi-text)] font-semibold'
        }`
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="hidden whitespace-nowrap lg:inline">{item.label}</span>
    </NavLink>
  );
}
