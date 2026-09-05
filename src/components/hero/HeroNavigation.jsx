import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Bars3Icon,
  XMarkIcon,
  ChartBarIcon,
  UserGroupIcon,
  MapPinIcon,
  PresentationChartLineIcon,
  MicrophoneIcon,
  StarIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { useUser } from '../../context/UserContext';
import saathiLogo from '../../assets/logo.png';

const SEARCH_CATEGORIES = [
  { id: 'all', label: 'All Categories' },
  { id: 'crops', label: 'Crops' },
  { id: 'prices', label: 'Market Prices' },
  { id: 'mandi', label: 'Mandi Information' },
  { id: 'buyers', label: 'Buyers' },
];

const CATEGORY_SERVICES = {
  market: [
    { title: 'Market Prices', path: '/prices' },
    { title: 'Crop Journey', path: '/explorer' },
  ],
  discovery: [
    { title: 'Buyer Discovery', path: '/buyers' },
    { title: 'Mandi Information', path: '/mandis' },
  ],
  saathi: [
    { title: 'Ask SAATHI', path: '/ai' },
    { title: 'Reviews', path: '/reviews' },
    { title: 'About SAATHI', path: '/about' },
  ],
};

function getActiveCategory(pathname) {
  if (pathname === '/prices' || pathname === '/explorer') return 'market';
  if (pathname === '/buyers' || pathname === '/mandis') return 'discovery';
  if (pathname === '/ai' || pathname === '/reviews' || pathname === '/about') return 'saathi';
  return null;
}

export default function HeroNavigation({ isSticky = false, onOpenLanguageModal, showSubNav = false, onVoiceStart }) {
  const location = useLocation();
  const navigate = useNavigate();
  const activeCategoryKey = getActiveCategory(location.pathname);
  const currentCategoryServices = activeCategoryKey ? CATEGORY_SERVICES[activeCategoryKey] : null;
  const { isLoggedIn, user, logout, t } = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [servicesMenuOpen, setServicesMenuOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Sticky search bar state
  const [stickyQuery, setStickyQuery] = useState('');
  const [stickyCategory, setStickyCategory] = useState(SEARCH_CATEGORIES[0]);
  const [stickyCategoryOpen, setStickyCategoryOpen] = useState(false);

  const servicesMenuRef = useRef(null);
  const stickyCategoryRef = useRef(null);

  // Monitor page scroll progress for sticky header horizontal progress bar
  useEffect(() => {
    if (!isSticky) return;
    const updateScrollProgress = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScroll > 0) {
        const progress = Math.min(100, Math.max(0, (window.scrollY / totalScroll) * 100));
        setScrollProgress(progress);
      }
    };
    updateScrollProgress();
    window.addEventListener('scroll', updateScrollProgress, { passive: true });
    return () => window.removeEventListener('scroll', updateScrollProgress);
  }, [isSticky]);

  // Close dropdowns on outside click or escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (servicesMenuRef.current && !servicesMenuRef.current.contains(e.target)) {
        setServicesMenuOpen(false);
      }
      if (stickyCategoryRef.current && !stickyCategoryRef.current.contains(e.target)) {
        setStickyCategoryOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setServicesMenuOpen(false);
        setStickyCategoryOpen(false);
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleStickySearch = (e) => {
    e?.preventDefault();
    const trimmed = stickyQuery.trim();
    if (!trimmed) {
      navigate(stickyCategory.id === 'buyers' ? '/buyers' : '/prices');
      return;
    }
    if (stickyCategory.id === 'buyers') {
      navigate(`/buyers?search=${encodeURIComponent(trimmed)}`);
    } else {
      navigate(`/prices?search=${encodeURIComponent(trimmed)}`);
    }
  };

  return (
    <nav
      className={`w-full transition-all duration-300 ${
        isSticky
          ? 'fixed top-0 inset-x-0 z-50 bg-white/95 text-[var(--saathi-text)] border-b border-[var(--saathi-border-light)] shadow-sm py-2 px-4 sm:px-6 lg:px-8'
          : 'relative z-20 text-white py-3.5 px-4 sm:px-6 lg:px-8'
      }`}
      aria-label="Main Navigation"
    >
      {/* Horizontal Progress Bar Integrated in the Upper Part of Sticky Navbar */}
      {isSticky && (
        <div className="absolute top-0 inset-x-0 h-[3px] bg-slate-800/80 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#424242] to-[#212121] transition-all duration-75 ease-out shadow-[0_0_8px_rgba(0,0,0,0.5)]"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>
      )}

      <div className="mx-auto flex max-w-7xl items-center justify-between">
        
        {/* Brand Identity: ONLY appears when scrolled past hero section (isSticky === true) */}
        {isSticky ? (
          <Link
            to="/"
            className="flex items-center gap-2 group focus:outline-none focus:ring-2 focus:ring-slate-500 rounded-md p-0.5 mr-2 sm:mr-3 shrink-0 animate-in fade-in slide-in-from-top-1 duration-200"
            title="SAATHI Home"
            aria-label="SAATHI Home"
          >
            <img
              src={saathiLogo}
              alt="SAATHI Logo"
              className="h-8 w-8 sm:h-9 sm:w-9 object-contain drop-shadow-md transition-transform group-hover:scale-105"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg font-extrabold tracking-wider text-inherit">
                  SAATHI
                </span>
              </div>
              <span className="hidden sm:block text-xs font-semibold text-[var(--saathi-text-secondary)] leading-tight">
                Aapki Aawaz, Aapka Bazaar
              </span>
            </div>
          </Link>
        ) : (
          <div className="flex-1" />
        )}

        {/* Center Sticky Search Box: Appears in the middle when scrolled past hero */}
        {isSticky && (
          <form
            onSubmit={handleStickySearch}
            className="hidden md:flex items-center gap-2 max-w-md lg:max-w-lg xl:max-w-xl flex-1 mx-3 lg:mx-6 animate-in fade-in slide-in-from-top-1 duration-200"
          >
            <div className="relative flex items-center flex-1 rounded-md bg-white text-[var(--saathi-text)] ring-1 ring-black/15 focus-within:ring-2 focus-within:ring-slate-500 shadow-sm h-9">
              <div className="pl-3 pr-1 text-slate-400 shrink-0">
                <MagnifyingGlassIcon className="h-4 w-4 stroke-[2.2]" />
              </div>
              <input
                type="text"
                value={stickyQuery}
                onChange={(e) => setStickyQuery(e.target.value)}
                placeholder={t('hero.searchPlaceholder') || "Search crops, mandis, buyers..."}
                aria-label="Search SAATHI"
                className="w-full bg-transparent px-2 text-xs sm:text-sm font-semibold text-[var(--saathi-text)] placeholder:text-slate-400 outline-none"
              />
              
              {/* Category Selector inside Search Box */}
              <div className="relative border-l border-[var(--saathi-border-light)] h-full flex items-center" ref={stickyCategoryRef}>
                <button
                  type="button"
                  onClick={() => setStickyCategoryOpen((prev) => !prev)}
                  aria-expanded={stickyCategoryOpen}
                  aria-haspopup="true"
                  aria-label="Select Category"
                  className="flex items-center gap-1 bg-[var(--saathi-surface-alt)] hover:bg-slate-100 px-2.5 h-full text-xs font-bold text-[var(--saathi-text-secondary)] transition rounded-r-md cursor-pointer"
                >
                  <span className="truncate max-w-[120px]">{stickyCategory.label}</span>
                  <ChevronDownIcon className={`h-3.5 w-3.5 text-[var(--saathi-text-muted)] transition-transform ${stickyCategoryOpen ? 'rotate-180' : ''}`} />
                </button>

                {stickyCategoryOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full mt-1.5 w-52 rounded-md border border-[var(--saathi-border-light)] bg-white p-1.5 shadow-2xl z-[100] text-xs animate-in fade-in zoom-in-95"
                  >
                    {SEARCH_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setStickyCategory(cat);
                          setStickyCategoryOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 transition cursor-pointer ${
                          cat.id === stickyCategory.id ? 'bg-slate-100 text-[var(--saathi-text)] font-bold' : 'text-[var(--saathi-text-secondary)] hover:bg-[var(--saathi-surface-alt)]'
                        }`}
                      >
                        <span>{cat.label}</span>
                        {cat.id === stickyCategory.id && <CheckIcon className="h-4 w-4 text-[var(--saathi-accent)]" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Red Search Button */}
            <button
              type="submit"
              className="h-9 rounded-md bg-[var(--saathi-accent)] hover:bg-[var(--saathi-accent-dark)] px-4 text-xs font-extrabold text-white shadow-md transition focus:outline-none focus:ring-2 focus:ring-[var(--saathi-focus)] shrink-0"
            >
              {t('hero.searchBtn') || 'Search'}
            </button>
          </form>
        )}

        {/* Right Side: Clean links separated by vertical divider lines (No rounded glassmorphic shapes) */}
        <div className={`hidden lg:flex items-center gap-3 text-xs sm:text-sm font-semibold ml-auto shrink-0 ${isSticky ? 'text-[var(--saathi-text)]' : 'text-white opacity-90'}`}>
          {!isLoggedIn ? (
            <>
              <Link
                to="/login"
                className={`${isSticky ? 'text-[var(--saathi-text)] hover:text-[var(--saathi-focus)]' : 'text-white hover:text-white'} transition focus:outline-none focus:underline`}
              >
                {t('nav.login') || 'Login'}
              </Link>
              <span className={`${isSticky ? 'text-[var(--saathi-border)]' : 'text-white opacity-40'} font-light select-none`}>|</span>
              <Link
                to="/register"
                className={`${isSticky ? 'text-[var(--saathi-text)] hover:text-[var(--saathi-focus)]' : 'text-white hover:text-white'} transition focus:outline-none focus:underline`}
              >
                {t('nav.register') || 'Register'}
              </Link>
              <span className={`${isSticky ? 'text-[var(--saathi-border)]' : 'text-white opacity-40'} font-light select-none`}>|</span>
            </>
          ) : (
            <>
              <Link
                to="/profile"
                className={`flex items-center gap-1.5 ${isSticky ? 'text-[var(--saathi-text)] hover:text-[var(--saathi-focus)]' : 'text-white hover:text-white'} transition focus:outline-none focus:underline`}
              >
                <UserCircleIcon className={`h-4 w-4 ${isSticky ? 'text-[var(--saathi-text-secondary)]' : 'text-white/80'}`} />
                <span>{user?.name || t('nav.profile') || 'Farmer Profile'}</span>
              </Link>
              <span className={`${isSticky ? 'text-[var(--saathi-border)]' : 'text-white opacity-40'} font-light select-none`}>|</span>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1 text-red-500 hover:text-red-700 transition focus:outline-none focus:underline"
                title="Logout"
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4" />
                <span>{t('nav.logout') || 'Logout'}</span>
              </button>
              <span className={`${isSticky ? 'text-[var(--saathi-border)]' : 'text-white opacity-40'} font-light select-none`}>|</span>
            </>
          )}

          {/* Skip to Main Content Link */}
          <a
            href="#main-content"
            className={`${isSticky ? 'text-[var(--saathi-text-secondary)] hover:text-[var(--saathi-text)]' : 'text-white hover:text-white'} transition focus:outline-none focus:underline focus:not-sr-only`}
          >
            {t('utility.skipToMain') || 'Skip to main content'}
          </a>
          <span className={`${isSticky ? 'text-[var(--saathi-border)]' : 'text-white opacity-40'} font-light select-none`}>|</span>

          {/* 3 Horizontal Lines Graphic Dropdown Button (Unshaped, Clean) */}
          <div className="relative" ref={servicesMenuRef}>
            <button
              type="button"
              onClick={() => setServicesMenuOpen((prev) => !prev)}
              aria-expanded={servicesMenuOpen}
              aria-haspopup="true"
              aria-label="Toggle Market, Discovery, and Saathi services menu"
              title="Portal Services Menu"
              className={`flex flex-col justify-center items-center gap-1 w-6 h-5 p-0.5 hover:opacity-80 transition focus:outline-none focus:ring-1 ${isSticky ? 'focus:ring-slate-400' : 'focus:ring-white'} rounded-sm cursor-pointer`}
            >
              <span className={`h-[2px] w-full rounded-full ${isSticky ? 'bg-[var(--saathi-text)]' : 'bg-white'}`} />
              <span className={`h-[2px] w-full rounded-full ${isSticky ? 'bg-[var(--saathi-text)]' : 'bg-white'}`} />
              <span className={`h-[2px] w-full rounded-full ${isSticky ? 'bg-[var(--saathi-text)]' : 'bg-white'}`} />
            </button>

            {/* Structured Multi-Column Dropdown Menu */}
            {servicesMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-[480px] rounded-lg border border-[var(--saathi-border-light)] bg-white text-[var(--saathi-text)] p-4 shadow-2xl z-50 animate-in fade-in zoom-in-95 grid grid-cols-3 gap-3"
              >
                {/* 1. Market Column */}
                <div className="space-y-1">
                  <div className="px-1 text-sm font-extrabold uppercase tracking-wider text-[var(--saathi-primary)] border-b border-[var(--saathi-border-light)] pb-1">
                    Market
                  </div>
                  <Link
                    to="/prices"
                    role="menuitem"
                    onClick={() => setServicesMenuOpen(false)}
                    className="block rounded-md p-2 text-xs text-[var(--saathi-text)] hover:bg-[var(--saathi-surface-alt)] hover:text-[var(--saathi-focus)] transition"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-[var(--saathi-text)]">
                      <ChartBarIcon className="h-4 w-4 text-[var(--saathi-primary)] shrink-0" />
                      <span>Market Prices</span>
                    </div>
                    <span className="text-xs text-[var(--saathi-text-secondary)] block mt-0.5">Daily APMC rates</span>
                  </Link>
                  <Link
                    to="/explorer"
                    role="menuitem"
                    onClick={() => setServicesMenuOpen(false)}
                    className="block rounded-md p-2 text-xs text-[var(--saathi-text)] hover:bg-[var(--saathi-surface-alt)] hover:text-[var(--saathi-focus)] transition"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-[var(--saathi-text)]">
                      <PresentationChartLineIcon className="h-4 w-4 text-[var(--saathi-primary)] shrink-0" />
                      <span>Crop Journey</span>
                    </div>
                    <span className="text-xs text-[var(--saathi-text-secondary)] block mt-0.5">Supply chain</span>
                  </Link>
                </div>

                {/* 2. Discovery Column */}
                <div className="space-y-1 border-l border-[var(--saathi-border-light)] pl-3">
                  <div className="px-1 text-sm font-extrabold uppercase tracking-wider text-[var(--saathi-primary)] border-b border-[var(--saathi-border-light)] pb-1">
                    Discovery
                  </div>
                  <Link
                    to="/buyers"
                    role="menuitem"
                    onClick={() => setServicesMenuOpen(false)}
                    className="block rounded-md p-2 text-xs text-[var(--saathi-text)] hover:bg-[var(--saathi-surface-alt)] hover:text-[var(--saathi-focus)] transition"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-[var(--saathi-text)]">
                      <UserGroupIcon className="h-4 w-4 text-[var(--saathi-primary)] shrink-0" />
                      <span>Buyer Discovery</span>
                    </div>
                    <span className="text-xs text-[var(--saathi-text-secondary)] block mt-0.5">Verified buyers</span>
                  </Link>
                  <Link
                    to="/mandis"
                    role="menuitem"
                    onClick={() => setServicesMenuOpen(false)}
                    className="block rounded-md p-2 text-xs text-[var(--saathi-text)] hover:bg-[var(--saathi-surface-alt)] hover:text-[var(--saathi-focus)] transition"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-[var(--saathi-text)]">
                      <MapPinIcon className="h-4 w-4 text-[var(--saathi-primary)] shrink-0" />
                      <span>Mandi Information</span>
                    </div>
                    <span className="text-xs text-[var(--saathi-text-secondary)] block mt-0.5">APMC arrivals</span>
                  </Link>
                </div>

                {/* 3. Saathi Column */}
                <div className="space-y-1 border-l border-[var(--saathi-border-light)] pl-3">
                  <div className="px-1 text-sm font-extrabold uppercase tracking-wider text-[var(--saathi-primary)] border-b border-[var(--saathi-border-light)] pb-1">
                    Saathi
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setServicesMenuOpen(false);
                      if (onVoiceStart) onVoiceStart();
                    }}
                    className="w-full text-left block rounded-md p-2 text-xs text-[var(--saathi-text)] hover:bg-[var(--saathi-surface-alt)] hover:text-[var(--saathi-focus)] transition cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-[var(--saathi-text)]">
                      <MicrophoneIcon className="h-4 w-4 text-[var(--saathi-primary)] shrink-0" />
                      <span>Ask SAATHI</span>
                    </div>
                    <span className="text-xs text-[var(--saathi-text-secondary)] block mt-0.5">Voice & text AI</span>
                  </button>
                  <Link
                    to="/reviews"
                    role="menuitem"
                    onClick={() => setServicesMenuOpen(false)}
                    className="block rounded-md p-2 text-xs text-[var(--saathi-text)] hover:bg-[var(--saathi-surface-alt)] hover:text-[var(--saathi-focus)] transition"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-[var(--saathi-text)]">
                      <StarIcon className="h-4 w-4 text-[var(--saathi-primary)] shrink-0" />
                      <span>Reviews</span>
                    </div>
                    <span className="text-xs text-[var(--saathi-text-secondary)] block mt-0.5">Community feedback</span>
                  </Link>
                  <Link
                    to="/about"
                    role="menuitem"
                    onClick={() => setServicesMenuOpen(false)}
                    className="block rounded-md p-2 text-xs text-[var(--saathi-text)] hover:bg-[var(--saathi-surface-alt)] hover:text-[var(--saathi-focus)] transition"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-[var(--saathi-text)]">
                      <span>About SAATHI</span>
                    </div>
                    <span className="text-xs text-[var(--saathi-text-secondary)] block mt-0.5">Platform info</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Header Controls */}
        <div className="flex lg:hidden items-center justify-between w-full">
          {isSticky ? (
            <Link to="/" className="flex items-center gap-2 group p-0.5" aria-label="SAATHI Home">
              <img
                src={saathiLogo}
                alt="SAATHI Logo"
                className="h-8 w-8 object-contain drop-shadow-md transition-transform group-hover:scale-105"
              />
              <div>
                <span className="text-base font-extrabold tracking-wider text-inherit block leading-none">
                  SAATHI
                </span>
                <span className="text-[9px] font-semibold text-[var(--saathi-text-secondary)] block leading-tight">
                  Aapki Aawaz, Aapka Bazaar
                </span>
              </div>
            </Link>
          ) : (
            <div className="flex-1" />
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
              className={`rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-slate-400 ${
                isSticky
                  ? 'border border-[var(--saathi-border-light)] bg-white text-[var(--saathi-text)] hover:bg-[var(--saathi-surface-alt)] shadow-sm'
                  : 'border border-white/20 bg-black/40 text-white hover:bg-black/60'
              }`}
            >
              {mobileMenuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden mt-3 rounded-lg border border-[var(--saathi-border-light)] bg-white text-[var(--saathi-text)] p-4 shadow-2xl animate-in fade-in slide-in-from-top-2">
          <div className="space-y-3 text-sm font-semibold text-[var(--saathi-text)]">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-md px-3 py-2 hover:bg-[var(--saathi-surface-alt)]"
            >
              Home
            </Link>

            <div className="border-t border-[var(--saathi-border-light)] pt-2">
              <span className="block px-3 py-1 text-sm font-bold uppercase tracking-wider text-[var(--saathi-text-secondary)]">
                Market & Discovery
              </span>
              <div className="mt-1 space-y-1">
                <Link
                  to="/prices"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-[var(--saathi-text)] hover:bg-[var(--saathi-surface-alt)]"
                >
                  <ChartBarIcon className="h-4 w-4 text-[var(--saathi-primary)]" />
                  <span>Market Prices</span>
                </Link>
                <Link
                  to="/mandis"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-[var(--saathi-text)] hover:bg-[var(--saathi-surface-alt)]"
                >
                  <MapPinIcon className="h-4 w-4 text-[var(--saathi-primary)]" />
                  <span>Mandi Information</span>
                </Link>
                <Link
                  to="/buyers"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-[var(--saathi-text)] hover:bg-[var(--saathi-surface-alt)]"
                >
                  <UserGroupIcon className="h-4 w-4 text-[var(--saathi-primary)]" />
                  <span>Buyer Discovery</span>
                </Link>
                <Link
                  to="/explorer"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-[var(--saathi-text)] hover:bg-[var(--saathi-surface-alt)]"
                >
                  <PresentationChartLineIcon className="h-4 w-4 text-[var(--saathi-primary)]" />
                  <span>Crop Journey</span>
                </Link>
              </div>
            </div>

            <div className="border-t border-[var(--saathi-border-light)] pt-2">
              <span className="block px-3 py-1 text-sm font-bold uppercase tracking-wider text-[var(--saathi-text-secondary)]">
                Assistant & Information
              </span>
              <div className="mt-1 space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (onVoiceStart) onVoiceStart();
                  }}
                  className="w-full text-left flex items-center gap-2 rounded-md px-3 py-2 text-[var(--saathi-text)] hover:bg-[var(--saathi-surface-alt)] cursor-pointer"
                >
                  <MicrophoneIcon className="h-4 w-4 text-[var(--saathi-primary)]" />
                  <span>Ask SAATHI Voice AI</span>
                </button>
                <Link
                  to="/reviews"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-[var(--saathi-text)] hover:bg-[var(--saathi-surface-alt)]"
                >
                  <StarIcon className="h-4 w-4 text-[var(--saathi-primary)]" />
                  <span>Reviews</span>
                </Link>
                <Link
                  to="/about"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-[var(--saathi-text)] hover:bg-[var(--saathi-surface-alt)]"
                >
                  <span>About SAATHI</span>
                </Link>
                {!isLoggedIn ? (
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <Link
                      to="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-center rounded-md bg-[var(--saathi-primary)] py-2 text-xs font-bold text-white text-center hover:bg-[var(--saathi-primary-hover)]"
                    >
                      Login
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-center rounded-md border border-[var(--saathi-border)] bg-white py-2 text-xs font-bold text-[var(--saathi-text)] text-center hover:bg-[var(--saathi-surface-alt)]"
                    >
                      Register
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2 pt-2">
                    <Link
                      to="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 rounded-md bg-[var(--saathi-surface-alt)] px-3 py-2 text-xs font-bold text-[var(--saathi-text)]"
                    >
                      <UserCircleIcon className="h-4 w-4 text-[var(--saathi-text-secondary)]" />
                      <span>{user?.name || 'Profile'}</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleLogout();
                      }}
                      className="flex w-full items-center justify-center gap-1.5 rounded-md border border-red-200 bg-red-50 py-2 text-xs font-bold text-red-600"
                    >
                      <ArrowRightOnRectangleIcon className="h-4 w-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Secondary Service Sub-Navigation Bar (Filtered ONLY to current category) */}
      {showSubNav && currentCategoryServices && (
        <div className="border-t border-[#E0E0E0]/80 bg-white mt-1.5 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl items-center justify-between overflow-x-auto overflow-y-hidden no-scrollbar">
            {/* Service Navigation Tabs for the Active Category */}
            <div className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm">
              {currentCategoryServices.map((service) => {
                if (service.path === '/ai') {
                  return (
                    <button
                      key={service.path}
                      type="button"
                      onClick={() => {
                        if (onVoiceStart) onVoiceStart();
                      }}
                      className="px-3 py-1.5 whitespace-nowrap transition-all border-b-[3px] -mb-[1px] border-transparent text-[#616161] font-semibold hover:text-[#212121] hover:border-[var(--saathi-border)] cursor-pointer"
                    >
                      {service.title}
                    </button>
                  );
                }

                return (
                  <NavLink
                    key={service.path}
                    to={service.path}
                    className={({ isActive }) =>
                      `px-3 py-1.5 whitespace-nowrap transition-all border-b-[3px] -mb-[1px] ${
                        isActive
                          ? 'border-[#EF5350] text-[#212121] font-bold'
                          : 'border-transparent text-[#616161] font-semibold hover:text-[#212121] hover:border-[var(--saathi-border)]'
                      }`
                    }
                  >
                    {service.title}
                  </NavLink>
                );
              })}
            </div>


          </div>
        </div>
      )}
    </nav>
  );
}
