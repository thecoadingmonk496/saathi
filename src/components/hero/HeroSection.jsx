import { useState, useEffect } from 'react';
import HeroSlideshow from './HeroSlideshow';
import HeroNavigation from './HeroNavigation';
import HeroSearch from './HeroSearch';
import FloatingTools from './FloatingTools';
import { useUser } from '../../context/UserContext';
import saathiLogo from '../../assets/logo.png';

export default function HeroSection({ onOpenLanguageModal, onVoiceStart }) {
  const { t, preferredLanguage } = useUser();
  const [isSticky, setIsSticky] = useState(false);

  const isHindi = preferredLanguage?.toLowerCase().includes('hi') || preferredLanguage?.toLowerCase().includes('hindi');

  // Monitor scroll for sticky header transition (triggers when scrolling past hero)
  useEffect(() => {
    const handleScroll = () => {
      const heroHeight = window.innerHeight * 0.72;
      if (window.scrollY > heroHeight) {
        setIsSticky(true);
      } else {
        setIsSticky(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="relative w-full">
      {/* Sticky Top Navbar (Rendered smoothly when scrolling down) */}
      {isSticky && (
        <HeroNavigation
          isSticky={true}
          onOpenLanguageModal={onOpenLanguageModal}
          onVoiceStart={onVoiceStart}
        />
      )}

      {/* 75-85vh Hero Opening Section */}
      <div className="relative min-h-[75vh] sm:min-h-[80vh] lg:min-h-[84vh] w-full flex flex-col justify-between overflow-hidden bg-slate-950 pb-12 sm:pb-16">
        
        {/* Multi-Layer True Crossfade Slideshow */}
        <HeroSlideshow />

        {/* Top Region: Navigation Bar */}
        <div className="relative z-20 w-full">
          <HeroNavigation
            isSticky={false}
            onOpenLanguageModal={onOpenLanguageModal}
            onVoiceStart={onVoiceStart}
          />
        </div>

        {/* Center Region: Main Hero Content (Branding with Logo, Slogan, Supporting Copy, Search) */}
        <div className="relative z-10 mx-auto w-full max-w-5xl px-4 py-8 sm:py-12 text-center flex flex-col items-center justify-center my-auto">
          
          {/* Main Brand Title + Slogan locked together beside the Logo */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 md:gap-7">
            <img
              src={saathiLogo}
              alt="SAATHI Logo"
              className="h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28 lg:h-32 lg:w-32 object-contain drop-shadow-[0_8px_28px_rgba(0,0,0,0.9)] shrink-0"
            />
            <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
              <h1 className="font-devanagari text-5xl sm:text-6xl md:text-7xl font-black leading-none tracking-tight text-white drop-shadow-[0_6px_28px_rgba(0,0,0,0.85)]">
                SAATHI
              </h1>
              <p className="mt-2 text-[#52b788] text-sm sm:text-base md:text-lg font-extrabold uppercase tracking-widest drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
                Aapki Aawaz, Aapka Bazaar
              </p>
            </div>
          </div>

          {/* Useful Supporting Copy */}
          <p className="mt-6 max-w-2xl text-base sm:text-lg md:text-xl font-medium leading-relaxed text-white drop-shadow-[0_3px_12px_rgba(0,0,0,0.85)]">
            {isHindi ? (
              <span>मंडी भाव, मंडी जानकारी, फसल खरीदार और कृषि अंतर्दृष्टि — सब एक ही मंच पर।</span>
            ) : (
              <span>Market prices, mandi information, buyer discovery and market insights — all in one place.</span>
            )}
          </p>

          {/* Large Centered Search Bar & Trending Searches */}
          <div className="mt-8 sm:mt-10 w-full max-w-5xl">
            <HeroSearch />
          </div>
        </div>

        {/* Bottom Spacing */}
        <div className="h-4 sm:h-6" />
      </div>
    </div>
  );
}
