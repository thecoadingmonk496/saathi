import { Link } from 'react-router-dom';
import LanguagePopup from '../components/LanguagePopup';
import { useUser } from '../context/UserContext';
import { useTranslation } from '../hooks/useTranslation';

const dashboardItems = [
  { label: t('nav.buyerDiscovery'), path: '/buyers', icon: '🤝', color: 'bg-red-50 text-accent-dark' },
  { label: t('nav.marketPrices'), path: '/prices', icon: '📈', color: 'bg-red-50 text-accent-dark' },
  { label: t('nav.marketExplorer'), path: '/explorer', icon: '🗺️', color: 'bg-sky-50 text-sky-700' },
  { label: t('card.govtTitle'), path: '/government', icon: '🏛️', color: 'bg-violet-50 text-violet-700' },
];

export default function Home() {
  const { setLanguage, user } = useUser();
  const { t } = useTranslation();
  const currentDate = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <section className="mx-auto w-full max-w-3xl">
      <header className="mb-8">
        <p className="text-sm font-medium text-accent-dark">{currentDate}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--saathi-text)] sm:text-4xl">
          {t('Welcome, {name}', { name: user?.name || t(t('explorer.stageFarmer')) })}
        </h1>
        <p className="mt-2 text-base text-[var(--saathi-text-secondary)]">{t('What would you like to explore today?')}</p>
      </header>

      <div className="grid grid-cols-2 gap-4 sm:gap-6">
        {dashboardItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className="group min-h-40 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-red-200 hover:shadow-lg hover:shadow-red-900/5 focus:outline-none focus:ring-4 focus:ring-red-200 sm:min-h-48 sm:p-6"
          >
            <span className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${item.color}`}>
              {item.icon}
            </span>
            <span className="mt-6 block text-lg font-bold leading-6 text-[var(--saathi-text)] sm:text-xl">
              {t(item.label)}
            </span>
            <span className="mt-2 block text-sm font-semibold text-accent-dark transition group-hover:translate-x-1">
              {t('Explore →')}
            </span>
          </Link>
        ))}
      </div>

      <LanguagePopup onLanguageSelect={setLanguage} />
    </section>
  );
}
