import { useUser } from '../context/UserContext';

export default function StepIndicator({ currentStep, steps }) {
  const { t } = useUser();
  const activeSteps = steps || ['Registration', t('explorer.location'), 'Language'];

  return (
    <div className="w-full" aria-label={`Step ${currentStep} of ${activeSteps.length}`}>
      <div className="flex items-start justify-between">
        {activeSteps.map((step, index) => {
          const stepNumber = index + 1;
          const isComplete = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;

          return (
            <div
              key={step}
              className="relative flex flex-1 flex-col items-center last:flex-none"
            >
              {index > 0 && (
                <span
                  className={`absolute right-1/2 top-4 h-0.5 w-full -translate-y-1/2 ${
                    isComplete ? 'bg-accent' : 'bg-slate-200'
                  }`}
                />
              )}
              <span
                className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-bold ${
                  isComplete || isCurrent
                    ? 'border-accent-dark bg-accent text-white'
                    : 'border-[var(--saathi-border-light)] bg-white text-slate-400'
                }`}
              >
                {isComplete ? '✓' : stepNumber}
              </span>
              <span
                className={`mt-2 text-center text-xs font-medium sm:text-sm ${
                  isCurrent ? 'text-accent-dark' : 'text-[var(--saathi-text-muted)]'
                }`}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
