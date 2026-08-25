import { Link } from 'react-router-dom';
import {
  BuildingLibraryIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  BanknotesIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import SectionHeader from './SectionHeader';
import { useUser } from '../../context/UserContext';

export default function GovernmentSchemesSection() {
  const { t } = useUser();

  const govtCards = [
    {
      id: 'kcc',
      title: t('dashboard.govtCat1Title'),
      body: t('dashboard.govtCat1Body'),
      icon: CreditCardIcon,
      badge: 'Credit Support',
    },
    {
      id: 'pmfby',
      title: t('dashboard.govtCat2Title'),
      body: t('dashboard.govtCat2Body'),
      icon: ShieldCheckIcon,
      badge: 'Crop Insurance',
    },
    {
      id: 'pm-kisan',
      title: t('dashboard.govtCat3Title'),
      body: t('dashboard.govtCat3Body'),
      icon: BanknotesIcon,
      badge: 'Direct Income Support',
    },
  ];

  return (
    <section className="w-full bg-primary-dark text-white py-14 sm:py-16" id="schemes">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title={t('dashboard.govtTitle')}
          hindiTitle="सरकारी योजनाएं"
          subtitle={t('dashboard.govtSubtitleShort')}
          actionText={t('dashboard.viewGovtBtn')}
          actionLink="/government"
          inverted={true}
          accentColor="saffron"
        />

        <div className="grid gap-5 sm:grid-cols-3">
          {govtCards.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-lg border border-[#E0E0E0] bg-white/5 p-6 sm:p-7 shadow-md transition hover:bg-white/[0.08] hover:border-white/30"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-white/10 text-accent-dark">
                      <Icon className="h-6 w-6 stroke-[1.8]" />
                    </div>
                    <span className="rounded-md border border-slate-400/40 bg-slate-900/60 px-2.5 py-1 text-xs font-bold text-slate-300">
                      {item.badge}
                    </span>
                  </div>

                  <h3 className="mt-5 text-lg sm:text-xl font-extrabold text-white leading-snug">
                    {item.title}
                  </h3>

                  <p className="mt-2.5 text-sm sm:text-base text-slate-200 leading-relaxed">
                    {item.body}
                  </p>
                </div>

                <div className="mt-7 pt-3.5 border-t border-white/10 flex items-center justify-between">
                  <Link
                    to="/government"
                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-accent-dark hover:underline"
                  >
                    <span>{t('dashboard.viewGovtBtn')}</span>
                    <ArrowRightIcon className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
