import { useState, useEffect } from 'react';

const SLIDES = [
  {
    id: 'field',
    src: '/saathi-hero-field.jpg',
    alt: 'Indian farmer in lush green agricultural field',
  },
  {
    id: 'paddy',
    src: '/saathi-hero-bg-2.jpg',
    alt: 'Indian farmers transplanting paddy seedlings in rural farmland',
  },
  {
    id: 'marigold',
    src: '/saathi-hero-bg-3.jpg',
    alt: 'Indian women farmers harvesting vibrant marigold flowers in agricultural fields',
  },
  {
    id: 'plowing',
    src: '/saathi-hero-plowing.jpg',
    alt: 'Indian farmer plowing fertile agricultural field with oxen',
  },
];

export default function HeroSlideshow() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Check for prefers-reduced-motion preference
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Continuous timer for seamless crossfade slideshow (6 seconds per slide)
  useEffect(() => {
    if (prefersReducedMotion) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % SLIDES.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [prefersReducedMotion]);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-slate-950 pointer-events-none" aria-hidden="true">
      {/* Overlapping absolute slide layers for true simultaneous crossfade */}
      {SLIDES.map((slide, index) => {
        const isActive = index === currentIndex;

        return (
          <div
            key={slide.id}
            className={`absolute inset-0 h-full w-full ${
              prefersReducedMotion
                ? isActive
                  ? 'opacity-100'
                  : 'opacity-0'
                : 'transition-opacity duration-1200 ease-in-out'
            } ${isActive ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
          >
            <img
              src={slide.src}
              alt={slide.alt}
              className="h-full w-full object-cover object-center"
              loading={index === 0 ? 'eager' : 'lazy'}
            />
          </div>
        );
      })}

      {/* Neutral Readability Treatment - No color tinting over photographs */}
      {/* Very subtle neutral layer for text contrast */}
      <div className="absolute inset-0 z-20 bg-black/20" />

      {/* Top and Bottom soft vignettes */}
      <div className="absolute inset-x-0 top-0 z-20 h-44 bg-gradient-to-b from-black/55 via-black/25 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 z-20 h-52 bg-gradient-to-t from-black/75 via-black/35 to-transparent" />

      {/* Subtle Slide Indicator Dots at Bottom Right */}
      <div className="absolute bottom-4 right-6 z-30 flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
        {SLIDES.map((_, idx) => (
          <span
            key={idx}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              idx === currentIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/40'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
