import { Link } from 'react-router-dom';
import { ArrowRightIcon } from '@heroicons/react/20/solid';
import { useUser } from '../../context/UserContext';

export default function SectionHeader({
  title,
  hindiTitle,
  subtitle,
  actionText,
  actionLink,
  onActionClick,
  inverted = false,
}) {
  const { t } = useUser();

  const displayTitle = t(title) || title;
  const displaySubtitle = subtitle ? (t(subtitle) || subtitle) : null;
  const displayActionText = actionText ? (t(actionText) || actionText) : null;

  return (
    <div className="mb-12 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
      <div className="relative">
        <div className="flex flex-wrap items-baseline gap-3">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#13233A]">
            {displayTitle}
          </h2>
          {hindiTitle && (
            <span className="text-xl sm:text-2xl font-bold text-gray-400">
              / {hindiTitle}
            </span>
          )}
        </div>

        {displaySubtitle && (
          <p className="mt-4 text-base sm:text-lg lg:text-xl font-medium leading-relaxed max-w-3xl text-gray-600">
            {displaySubtitle}
          </p>
        )}
      </div>

      {(displayActionText && (actionLink || onActionClick)) && (
        <div className="shrink-0 mb-2">
          {actionLink ? (
            <Link
              to={actionLink}
              className={"inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-xs sm:text-sm font-bold transition duration-150 text-[var(--saathi-primary)] hover:text-[var(--saathi-focus)]"}
            >
              <span>{displayActionText}</span>
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={onActionClick}
              className={"inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-xs sm:text-sm font-bold transition duration-150 text-[var(--saathi-primary)] hover:text-[var(--saathi-focus)]"}
            >
              <span>{displayActionText}</span>
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
