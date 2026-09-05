import { useUser } from '../../context/UserContext';

export default function HeroUtilityBar() {
  const { t } = useUser();

  return (
    <div className="w-full border-b border-white/10 bg-black/35 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5 sm:px-6 lg:px-8 text-xs font-semibold text-white opacity-90">
        
        {/* Real Accessible Skip to Main Content Link */}
        <a
          href="#main-content"
          className="rounded px-2.5 py-1 text-slate-300 hover:text-white transition focus:not-sr-only focus:bg-slate-700 focus:text-white focus:outline-none focus:ring-2 focus:ring-white"
        >
          {t('utility.skipToMain') || 'Skip to main content'}
        </a>

        {/* Right Info Note */}
        <div className="text-sm font-medium text-slate-300 hidden sm:block">
          🌾 Public Farmer Services & Live Mandi Intelligence
        </div>
      </div>
    </div>
  );
}
