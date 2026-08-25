import { useUser } from '../context/UserContext';
import LocationBar from './LocationBar';

export default function Hero({ assistantResponse }) {
  const { t } = useUser();

  return (
    <section className="relative text-primary-dark pt-24 sm:pt-28 pb-3 px-4 sm:px-6 lg:px-8">
      <div className="relative z-10 mx-auto max-w-4xl text-center">
        {/* Main Trust Slogan */}
        <h1 className="font-devanagari text-2xl sm:text-4xl lg:text-[40px] font-extrabold leading-tight tracking-tight text-primary-dark drop-shadow-md">
          {t('hero.headingLine1')} <br className="hidden sm:inline" />
          {t('hero.headingLine2')}
        </h1>

        {/* Supporting Tagline */}
        <p className="mt-2 text-xs sm:text-sm font-medium tracking-wide text-slate-100/90 drop-shadow-sm">
          {t('hero.tagline') || t('hero.tagline')}
        </p>

        {/* Real Location Section */}
        <div className="mt-4 flex flex-wrap items-start justify-center gap-3">
          <LocationBar compact={false} />
        </div>

        {/* Voice Assistant Response (only if actively received) */}
        {assistantResponse && (
          <div className="mt-4 mx-auto max-w-2xl text-left rounded-xl border border-slate-400/40 bg-[#0c2a20]/95 p-4 text-sm font-medium leading-relaxed text-slate-50 shadow-lg backdrop-blur-md">
            <div className="flex items-center gap-2 text-slate-300 text-xs font-bold uppercase tracking-wider mb-1.5">
              <img src="/saathi-mic-logo.png" alt="SAATHI Voice" className="h-5 w-5 rounded-full bg-[#fdfbf7] object-contain p-0.5" />
              <span>{t('hero.voiceAnswer') === 'hero.voiceAnswer' ? 'SAATHI AI' : t('hero.voiceAnswer')}</span>
            </div>
            <p className="text-slate-100 font-semibold">{assistantResponse}</p>
          </div>
        )}
      </div>
    </section>
  );
}
