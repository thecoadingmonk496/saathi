import { Link } from 'react-router-dom';

export default function About() {
  return (
    <div className="w-full bg-[var(--saathi-background)] min-h-screen text-[var(--saathi-text)]">
      {/* Breadcrumbs */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
        <nav className="flex text-xs font-semibold text-[var(--saathi-text-secondary)]" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2">
            <li>
              <Link to="/" className="hover:text-[var(--saathi-focus)] transition-colors">Home</Link>
            </li>
            <li><span className="text-[var(--saathi-border)]">/</span></li>
            <li>SAATHI</li>
            <li><span className="text-[var(--saathi-border)]">/</span></li>
            <li className="text-[var(--saathi-text)]">About SAATHI</li>
          </ol>
        </nav>
      </div>

      {/* Page Header */}
      <header className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-8">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[var(--saathi-primary)]">
          ABOUT SAATHI
        </h1>
        <p className="mt-2 text-sm text-[var(--saathi-text-secondary)] font-semibold">
          Agricultural market intelligence platform.
        </p>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-20">
        <div className="bg-[var(--saathi-surface)] rounded-lg border border-[var(--saathi-border-light)] p-8 sm:p-12 shadow-sm max-w-3xl">
          <div className="prose prose-slate prose-sm sm:prose-base">
            <h2 className="text-xl font-bold text-[var(--saathi-primary)] mb-4">What is SAATHI?</h2>
            <p className="text-[var(--saathi-text-secondary)] mb-6 leading-relaxed">
              SAATHI is an independent digital market intelligence portal designed to provide Indian farmers with access to APMC wholesale prices, buyer discovery networks, and market information.
            </p>

            <h2 className="text-xl font-bold text-[var(--saathi-primary)] mb-4">Who is it for?</h2>
            <p className="text-[var(--saathi-text-secondary)] mb-6 leading-relaxed">
              The platform serves farmers, wholesale buyers, and agricultural traders seeking reliable information on crop prices and regional market activity.
            </p>

            <h2 className="text-xl font-bold text-[var(--saathi-primary)] mb-4">Public Access vs. Registered Accounts</h2>
            <p className="text-[var(--saathi-text-secondary)] mb-4 leading-relaxed">
              <strong>Public Access:</strong> Unauthenticated visitors can view general market intelligence, overarching price trends, and explore the public sections of the platform.
            </p>
            <p className="text-[var(--saathi-text-secondary)] mb-6 leading-relaxed">
              <strong>Registered Users:</strong> Creating an account provides access to deeper features including direct buyer contact, personalized market alerts, and participation in the community review system.
            </p>

            <h2 className="text-xl font-bold text-[var(--saathi-primary)] mb-4">Data Sources</h2>
            <p className="text-[var(--saathi-text-secondary)] mb-6 leading-relaxed">
              Market information and pricing data are aggregated from publicly available APMC mandi reports and verified buyer submissions. This information is intended for reference and discovery purposes.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
