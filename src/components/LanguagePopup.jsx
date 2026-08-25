import React, { useEffect, useState, useRef } from 'react';
import { XMarkIcon, CheckIcon, SparklesIcon } from '@heroicons/react/20/solid';
import { useUser } from '../context/UserContext';

// 22 Scheduled Indian Languages with truthful support status
const ALL_22_LANGUAGES = [
  // Active in SAATHI Translation & Voice Engine
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', isSupported: true },
  { code: 'en', name: 'English', nativeName: 'English', isSupported: true },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', isSupported: true },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', isSupported: true },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', isSupported: true },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', isSupported: true },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', isSupported: true },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', isSupported: true },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', isSupported: true },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', isSupported: true },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', isSupported: true },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', isSupported: true },
  
  // Scheduled Languages (Planned / Expansion Pipeline)
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', isSupported: false },
  { code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृतम्', isSupported: false },
  { code: 'ks', name: 'Kashmiri', nativeName: 'कॉशुर', isSupported: false },
  { code: 'sd', name: 'Sindhi', nativeName: 'سنڌي', isSupported: false },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', isSupported: false },
  { code: 'kok', name: 'Konkani', nativeName: 'कोंकणी', isSupported: false },
  { code: 'mai', name: 'Maithili', nativeName: 'मैथिली', isSupported: false },
  { code: 'sat', name: 'Santali', nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ', isSupported: false },
  { code: 'doi', name: 'Dogri', nativeName: 'डोगरी', isSupported: false },
  { code: 'mni', name: 'Manipuri', nativeName: 'মৈতৈলোন্', isSupported: false },
  { code: 'brx', name: 'Bodo', nativeName: 'बर’', isSupported: false },
];

export default function LanguagePopup({ isOpen, onClose, onLanguageSelect }) {
  const { preferredLanguage, setLanguage } = useUser();
  const [selectedCode, setSelectedCode] = useState('hi');
  const dialogRef = useRef(null);

  useEffect(() => {
    if (preferredLanguage) {
      const match = ALL_22_LANGUAGES.find(
        (l) => l.code === preferredLanguage || l.name === preferredLanguage
      );
      if (match) setSelectedCode(match.code);
    }
  }, [preferredLanguage]);

  // Handle escape and focus
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelect = (lang) => {
    if (!lang.isSupported) return;
    setSelectedCode(lang.code);
  };

  const handleConfirm = () => {
    setLanguage(selectedCode);
    if (onLanguageSelect) onLanguageSelect(selectedCode);
    onClose?.();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in"
      role="presentation"
      onClick={onClose}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="language-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col max-h-[85vh] w-full max-w-2xl rounded-lg border border-[var(--saathi-border-light)] bg-white p-5 sm:p-6 shadow-2xl animate-in zoom-in-95 text-[var(--saathi-text)]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-lg">
              🇮🇳
            </span>
            <div>
              <h2 id="language-modal-title" className="text-base sm:text-lg font-bold text-[var(--saathi-text)]">
                All 22 Scheduled Indian Languages
              </h2>
              <p className="text-xs text-[var(--saathi-text-muted)]">
                Choose your preferred regional language for SAATHI portal
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close language selector"
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[var(--saathi-text-secondary)] transition"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Language Grid */}
        <div className="my-4 flex-1 overflow-y-auto pr-1">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
              Active Translation & Voice ({ALL_22_LANGUAGES.filter((l) => l.isSupported).length})
            </span>
            <span className="text-[11px] text-slate-400">
              Select any active language
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ALL_22_LANGUAGES.map((lang) => {
              const isSelected = selectedCode === lang.code;

              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelect(lang)}
                  disabled={!lang.isSupported}
                  className={`relative flex flex-col justify-between rounded-md border p-3 text-left transition ${
                    !lang.isSupported
                      ? 'border-[var(--saathi-border-light)] bg-[var(--saathi-surface-alt)] opacity-50 cursor-not-allowed'
                      : isSelected
                      ? 'border-primary bg-[var(--saathi-surface-alt)] ring-2 ring-primary'
                      : 'border-[var(--saathi-border-light)] bg-white hover:border-primary opacity-60 hover:bg-[var(--saathi-surface-alt)]'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="block text-xs font-bold text-[var(--saathi-text)]">
                        {lang.nativeName}
                      </span>
                      <span className="block text-[11px] text-[var(--saathi-text-muted)]">
                        {lang.name}
                      </span>
                    </div>
                    {isSelected && (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white">
                        <CheckIcon className="h-3 w-3 stroke-[2.5]" />
                      </span>
                    )}
                  </div>

                  {!lang.isSupported && (
                    <span className="mt-2 block text-[10px] font-semibold text-slate-400">
                      Coming Soon
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-xs font-semibold text-[var(--saathi-text-secondary)] hover:bg-slate-100 transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className="rounded-md bg-primary px-6 py-2 text-xs font-bold text-white hover:bg-primary-dark transition shadow-sm"
          >
            Apply Language / भाषा लागू करें
          </button>
        </div>
      </section>
    </div>
  );
}
