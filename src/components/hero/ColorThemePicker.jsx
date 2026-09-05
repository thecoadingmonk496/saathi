import { useState, useEffect, useRef } from 'react';
import { XMarkIcon, CheckIcon } from '@heroicons/react/20/solid';

const THEME_STORAGE_KEY = 'saathi-theme';

// Exactly 4 visual color palettes without text names, constrained to Palette C (Charcoal & Muted Red family)
const THEME_PALETTES = [
  {
    id: 'charcoal-red',
    primary: '#424242',
    hover: '#212121',
    accent: '#EF5350',
    swatchBg: 'bg-[#424242]',
    ringColor: 'ring-[#424242]',
  },
  {
    id: 'charcoal-dark',
    primary: '#212121',
    hover: '#000000',
    accent: '#D32F2F',
    swatchBg: 'bg-[#212121]',
    ringColor: 'ring-[#212121]',
  },
  {
    id: 'charcoal-muted',
    primary: '#616161',
    hover: '#424242',
    accent: '#E57373',
    swatchBg: 'bg-[#616161]',
    ringColor: 'ring-[#616161]',
  },
  {
    id: 'red-accent',
    primary: '#B71C1C',
    hover: '#7F0000',
    accent: '#EF5350',
    swatchBg: 'bg-[#B71C1C]',
    ringColor: 'ring-[#B71C1C]',
  },
];

export default function ColorThemePicker({ isOpen, onClose }) {
  const [selectedThemeId, setSelectedThemeId] = useState('charcoal-red');
  const modalRef = useRef(null);

  // Initialize theme from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      // Only allow valid Palette C themes, else default to charcoal-red
      const validThemeIds = THEME_PALETTES.map(p => p.id);
      if (saved && validThemeIds.includes(saved)) {
        const found = THEME_PALETTES.find((p) => p.id === saved);
        if (found) {
          setSelectedThemeId(found.id);
          applyTheme(found);
        }
      } else {
        // Migrate old themes to default Palette C
        setSelectedThemeId('charcoal-red');
        applyTheme(THEME_PALETTES[0]);
        localStorage.setItem(THEME_STORAGE_KEY, 'charcoal-red');
      }
    } catch (e) {
      // ignore storage error
    }
  }, []);

  // Handle escape and outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const applyTheme = (palette) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.style.setProperty('--saathi-primary', palette.primary);
    root.style.setProperty('--saathi-primary-hover', palette.hover);
    root.style.setProperty('--saathi-accent', palette.accent);
  };

  const handleSelectTheme = (palette) => {
    setSelectedThemeId(palette.id);
    applyTheme(palette);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, palette.id);
    } catch (e) {
      // ignore
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-label="Color Palette Selector"
      className="absolute right-14 top-0 w-64 rounded-2xl border border-[#E0E0E0] bg-[#FFFFFF] p-4 text-white shadow-2xl backdrop-blur-2xl ring-1 ring-black/40 z-50 animate-in fade-in zoom-in-95"
    >
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Color Theme
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close color theme picker"
          className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white transition"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>

      {/* 4 Visual Color Swatches (No Text Names) */}
      <div className="py-4">
        <div className="flex items-center justify-between px-1">
          {THEME_PALETTES.map((palette) => {
            const isSelected = palette.id === selectedThemeId;

            return (
              <button
                key={palette.id}
                type="button"
                onClick={() => handleSelectTheme(palette)}
                aria-label={`Select color swatch ${palette.id}`}
                className={`relative flex h-11 w-11 items-center justify-center rounded-full ${palette.swatchBg} shadow-md transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white ${
                  isSelected ? 'ring-4 ring-white scale-105' : 'opacity-90 hover:opacity-100'
                }`}
              >
                {isSelected && <CheckIcon className="h-5 w-5 text-white stroke-[2.5]" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-white/10 pt-2 text-center">
        <span className="text-sm text-slate-400">
          Changes portal UI colors and accents
        </span>
      </div>
    </div>
  );
}
