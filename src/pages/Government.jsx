import { useState } from 'react';
import { useUser } from '../context/UserContext';
import { mockGovernmentUpdates } from '../utils/mockData';

export default function Government() {
  const { t } = useUser();
  const [selectedNotice, setSelectedNotice] = useState(null);

  return (
    <section className="mx-auto w-full max-w-3xl">
      <header className="mb-7">
        <p className="text-sm font-semibold uppercase tracking-wider text-accent-dark">{t('govt.bulletin')}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--saathi-text)] sm:text-4xl">{t('govt.title')}</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--saathi-text-secondary)] sm:text-lg">
          {t('govt.subtitle')}
        </p>
      </header>

      <div className="space-y-5">
        {mockGovernmentUpdates.map((update) => (
          <article key={update.id} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-7">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-2xl">
                {update.icon}
              </span>
              <div>
                <p className="text-sm font-semibold text-accent-dark">{update.category}</p>
                <h2 className="mt-1 text-xl font-bold leading-7 text-[var(--saathi-text)] sm:text-2xl">{update.title}</h2>
              </div>
            </div>
            <p className="mt-5 text-base leading-7 text-[var(--saathi-text-secondary)] sm:text-lg">{update.description}</p>
            <button
              type="button"
              onClick={() => setSelectedNotice(update)}
              className="mt-5 rounded-xl border border-accent-dark px-4 py-2.5 text-base font-semibold text-accent-dark transition hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-100"
            >
              {t('govt.readMore')}
            </button>
          </article>
        ))}
      </div>

      {selectedNotice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={() => setSelectedNotice(null)}
        >
          <section
            className="w-full max-w-lg rounded-3xl bg-white p-6 text-[var(--saathi-text)] shadow-2xl sm:p-8"
            role="dialog"
            aria-modal="true"
            aria-labelledby="government-notice-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-2xl">
                  {selectedNotice.icon}
                </span>
                <div>
                  <p className="text-sm font-semibold text-accent-dark">{selectedNotice.category}</p>
                  <h2 id="government-notice-title" className="mt-1 text-xl font-bold text-[var(--saathi-text)]">
                    {selectedNotice.title}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNotice(null)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-[var(--saathi-text-muted)] transition hover:bg-slate-200 hover:text-[var(--saathi-text)]"
                aria-label="Close notice"
              >
                ×
              </button>
            </div>
            <p className="mt-6 text-base leading-7 text-[var(--saathi-text-secondary)]">{selectedNotice.description}</p>
            <button
              type="button"
              onClick={() => setSelectedNotice(null)}
              className="mt-6 w-full rounded-xl bg-primary-dark px-4 py-3 text-sm font-bold text-white transition hover:bg-primary focus:outline-none focus:ring-4 focus:ring-red-100"
            >
              {t('common.close') || 'Close'}
            </button>
          </section>
        </div>
      )}
    </section>
  );
}
