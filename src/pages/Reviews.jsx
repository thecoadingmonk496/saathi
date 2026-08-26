import { StarIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

export default function Reviews() {
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
            <li className="text-[var(--saathi-text)]">Reviews</li>
          </ol>
        </nav>
      </div>

      {/* Page Header */}
      <header className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-8">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[var(--saathi-primary)]">
          FARMER-BUYER REVIEWS
        </h1>
        <p className="mt-2 text-sm text-[var(--saathi-text-secondary)] font-semibold">
          Read community feedback and marketplace trust reviews.
        </p>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-20">
        <div className="bg-[var(--saathi-surface)] rounded-lg border border-[var(--saathi-border-light)] p-8 sm:p-12 text-center shadow-sm">
          <StarIcon className="mx-auto h-12 w-12 text-[#D91E2A] stroke-[1.5] mb-4" />
          <h2 className="text-lg font-bold text-[var(--saathi-primary)] mb-2">
            No reviews yet.
          </h2>
          <p className="text-sm text-[var(--saathi-text-secondary)] max-w-md mx-auto mb-6">
            User experiences will appear here as the SAATHI community grows. 
            Once transaction histories are established, verified market participants will be able to leave feedback.
          </p>
        </div>
      </main>
    </div>
  );
}
