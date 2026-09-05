import { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, CheckIcon, GlobeAltIcon } from '@heroicons/react/20/solid';
import { useUser } from '../../context/UserContext';

// Exactly 5 top visible language options + All Languages trigger
const TOP_5_LANGUAGES = [
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
];

export default function LanguageSelector({ onOpenFullModal }) {
  const { preferredLanguage, setLanguage, supportedLanguages } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentLang = supportedLanguages?.find(
    (l) => l.code === preferredLanguage || l.name === preferredLanguage
  ) || { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectLanguage = (langCode) => {
    setLanguage(langCode);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Compact Language Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Select Language"
        className="flex items-center gap-1.5 rounded-full border border-[#E0E0E0] bg-black/40 px-3 py-1 text-xs font-semibold text-white shadow-sm backdrop-blur-md transition hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-slate-400"
      >
        <span className="text-sm">🇮🇳</span>
        <span className="font-bold">{currentLang.nativeName || currentLang.name}</span>
        <ChevronDownIcon className={`h-3.5 w-3.5 text-white opacity-80 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* 5-Language Dropdown Menu */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 mt-1.5 w-52 origin-top-right rounded-xl border border-[#E0E0E0] bg-[#0c1a29]/95 p-1.5 text-white shadow-2xl backdrop-blur-xl ring-1 ring-black/40 z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-white/10">
            Choose Language / भाषा चुनें
          </div>

          <div className="py-1 space-y-0.5">
            {TOP_5_LANGUAGES.map((lang) => {
              const isSelected = lang.code === currentLang.code || lang.name === currentLang.name;

              return (
                <button
                  key={lang.code}
                  type="button"
                  role="menuitem"
                  onClick={() => handleSelectLanguage(lang.code)}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition ${
                    isSelected
                      ? 'bg-slate-600/90 text-white font-bold'
                      : 'text-slate-200 hover:bg-white/15 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{lang.nativeName}</span>
                    <span className="text-sm text-slate-400">({lang.name})</span>
                  </div>
                  {isSelected && <CheckIcon className="h-3.5 w-3.5 text-white" />}
                </button>
              );
            })}
          </div>

          {/* Trigger Full 22-Language Modal */}
          <div className="pt-1 mt-1 border-t border-white/10">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                if (onOpenFullModal) onOpenFullModal();
              }}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-center text-xs font-bold text-slate-300 hover:bg-white/20 transition"
            >
              <GlobeAltIcon className="h-3.5 w-3.5" />
              <span>All Languages (22) →</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
