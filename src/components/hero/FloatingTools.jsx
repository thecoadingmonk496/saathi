import { useState, useEffect, useRef } from 'react';
import {
  ShareIcon,
  MicrophoneIcon,
  ArrowUpIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import AccessibilityPanel from './AccessibilityPanel';
import { useUser } from '../../context/UserContext';
import { useNavigate } from 'react-router-dom';

// Official Bilingual Indian Language & Translation Icon (अ / A with exchange arrows)
export function LanguageTranslateIcon({ className = 'h-5 w-5' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Top Left Card (Devanagari 'अ') */}
      <rect x="2.5" y="2.5" width="10" height="10" rx="2" strokeWidth="1.6" />
      <text
        x="7.5"
        y="10.2"
        fontSize="7.5"
        fontFamily="'Segoe UI', system-ui, -apple-system, sans-serif"
        fontWeight="800"
        textAnchor="middle"
        fill="currentColor"
        stroke="none"
      >
        अ
      </text>

      {/* Bottom Right Card (Latin 'A') */}
      <rect x="11.5" y="11.5" width="10" height="10" rx="2" strokeWidth="1.6" />
      <text
        x="16.5"
        y="19.2"
        fontSize="7.5"
        fontFamily="'Segoe UI', system-ui, -apple-system, sans-serif"
        fontWeight="800"
        textAnchor="middle"
        fill="currentColor"
        stroke="none"
      >
        A
      </text>

      {/* Top-Right Curved Arrow */}
      <path d="M15.5 3.5c2.5 0 4 1.5 4 4" strokeWidth="1.6" />
      <path d="M17.5 1.5l-2.5 2 2.5 2" strokeWidth="1.6" />

      {/* Bottom-Left Curved Arrow */}
      <path d="M8.5 20.5c-2.5 0-4-1.5-4-4" strokeWidth="1.6" />
      <path d="M6.5 22.5l2.5-2-2.5-2" strokeWidth="1.6" />
    </svg>
  );
}

// Universal Accessibility Icon (Human figure with outstretched arms in circle)
export function AccessibilityIcon({ className = 'h-5 w-5' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9.5" />
      <circle cx="12" cy="7.2" r="1.3" fill="currentColor" stroke="none" />
      <path d="M6.8 10.5c2.6 0.7 7.8 0.7 10.4 0" />
      <path d="M12 10.5v3.8" />
      <path d="M12 14.3l-2.4 4" />
      <path d="M12 14.3l2.4 4" />
    </svg>
  );
}

const TOP_5_LANGUAGES = [
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
];

export default function FloatingTools({ onOpenLanguageModal, onVoiceStart }) {
  const navigate = useNavigate();
  const { preferredLanguage, setLanguage } = useUser();
  const [activeModal, setActiveModal] = useState(null); // 'lang' | 'a11y' | null
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);
  const langPopoverRef = useRef(null);

  // Monitor scroll for Scroll-to-Top visibility
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 150) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close language popover on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (langPopoverRef.current && !langPopoverRef.current.contains(e.target)) {
        if (activeModal === 'lang') setActiveModal(null);
      }
    };
    if (activeModal === 'lang') {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeModal]);

  const toggleModal = (modalName) => {
    setActiveModal((prev) => (prev === modalName ? null : modalName));
  };

  // Real Share implementation with Web Share API and Clipboard fallback
  const handleShare = async () => {
    const shareData = {
      title: 'SAATHI — Aapki Aawaz, Aapka Bazaar',
      text: 'SAATHI: Farmer Services & Market Portal with live APMC mandi prices and verified buyers.',
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if (err.name !== 'AbortError') {
          copyToClipboard();
        }
      }
    } else {
      copyToClipboard();
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2500);
    });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLanguageSelect = (code) => {
    setLanguage(code);
    setActiveModal(null);
  };

  return (
    <>
      {/* Individual Separated Floating Tabs on Right Viewport Edge */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-end space-y-1.5 select-none">
        
        {/* 1. Ask SAATHI Voice Assistant Tab */}
        <button
          type="button"
          onClick={() => {
            if (onVoiceStart) {
              onVoiceStart();
            } else {
              navigate('/ai');
            }
          }}
          aria-label="Ask SAATHI Voice Assistant"
          title="Ask SAATHI AI"
          className="flex h-[46px] w-[46px] items-center justify-center rounded-l-xl bg-black/25 hover:bg-black/45 text-white shadow-lg active:scale-95 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-slate-300 cursor-pointer group backdrop-blur-md"
        >
          <MicrophoneIcon className="h-5 w-5 sm:h-6 sm:w-6 stroke-[1.8] text-white drop-shadow group-hover:scale-110 transition-transform" />
        </button>

        {/* 2. Share Tab */}
        <button
          type="button"
          onClick={handleShare}
          aria-label="Share this portal"
          title="Share"
          className="flex h-[46px] w-[46px] items-center justify-center rounded-l-xl bg-black/25 hover:bg-black/45 text-white shadow-lg active:scale-95 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-slate-300 cursor-pointer group backdrop-blur-md"
        >
          <ShareIcon className="h-5 w-5 sm:h-6 sm:w-6 stroke-[1.8] text-white drop-shadow group-hover:scale-110 transition-transform" />
        </button>

        {/* 3. Language Selector Tab (with official Bilingual अ / A Icon) */}
        <button
          type="button"
          onClick={() => toggleModal('lang')}
          aria-expanded={activeModal === 'lang'}
          aria-label="Select Language"
          title="Language / भाषा"
          className={`flex h-[46px] w-[46px] items-center justify-center rounded-l-xl text-white shadow-lg active:scale-95 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-slate-300 cursor-pointer group backdrop-blur-md ${
            activeModal === 'lang' ? 'bg-black/60 shadow-xl' : 'bg-black/25 hover:bg-black/45'
          }`}
        >
          <LanguageTranslateIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white drop-shadow group-hover:scale-110 transition-transform" />
        </button>

        {/* 4. Accessibility Settings Tab (with Universal Accessibility Icon) */}
        <button
          type="button"
          onClick={() => toggleModal('a11y')}
          aria-expanded={activeModal === 'a11y'}
          aria-label="Accessibility Settings"
          title="Accessibility"
          className={`flex h-[46px] w-[46px] items-center justify-center rounded-l-xl text-white shadow-lg active:scale-95 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-slate-300 cursor-pointer group backdrop-blur-md ${
            activeModal === 'a11y' ? 'bg-black/60 shadow-xl' : 'bg-black/25 hover:bg-black/45'
          }`}
        >
          <AccessibilityIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white drop-shadow group-hover:scale-110 transition-transform" />
        </button>

        {/* Modal Popovers */}
        <div className="relative">
          {/* Language Popover */}
          {activeModal === 'lang' && (
            <div
              ref={langPopoverRef}
              role="dialog"
              aria-label="Language Selector"
              className="absolute right-14 top-0 w-64 rounded-lg border border-[var(--saathi-border-light)] bg-[var(--saathi-surface)] p-3.5 text-[var(--saathi-text)] shadow-[0_4px_12px_rgba(0,0,0,0.08)] z-50 animate-in fade-in zoom-in-95"
            >
              <div className="flex items-center justify-between border-b border-[var(--saathi-border-light)] pb-2">
                <div className="flex items-center gap-2 text-[var(--saathi-primary)]">
                  <LanguageTranslateIcon className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--saathi-text)]">
                    Language / भाषा
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  aria-label="Close language selector"
                  className="rounded-md p-1 text-[var(--saathi-text-secondary)] hover:bg-[var(--saathi-surface-alt)] hover:text-[var(--saathi-text)] transition"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>

              <div className="py-2 space-y-1">
                {TOP_5_LANGUAGES.map((lang) => {
                  const isSelected = lang.code === preferredLanguage || lang.name === preferredLanguage;

                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => handleLanguageSelect(lang.code)}
                      className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-xs font-semibold transition ${
                        isSelected
                          ? 'bg-[var(--saathi-surface-alt)] text-[var(--saathi-text)] font-bold'
                          : 'text-[var(--saathi-text-secondary)] hover:bg-[var(--saathi-surface-alt)] hover:text-[var(--saathi-text)]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{lang.nativeName}</span>
                        <span className="text-[11px] text-[var(--saathi-text-muted)]">({lang.name})</span>
                      </div>
                      {isSelected && <CheckIcon className="h-4 w-4 text-[var(--saathi-accent)]" />}
                    </button>
                  );
                })}
              </div>

              {/* All 22 Languages Modal Trigger */}
              <div className="pt-2 border-t border-[var(--saathi-border-light)]">
                <button
                  type="button"
                  onClick={() => {
                    setActiveModal(null);
                    if (onOpenLanguageModal) onOpenLanguageModal();
                  }}
                  className="flex w-full items-center justify-center gap-1.5 rounded-md bg-[var(--saathi-surface-alt)] border border-[var(--saathi-border-light)] px-3 py-2 text-center text-xs font-bold text-[var(--saathi-primary)] hover:bg-[var(--saathi-border-light)] transition"
                >
                  <LanguageTranslateIcon className="h-4 w-4" />
                  <span>All Languages (22) →</span>
                </button>
              </div>
            </div>
          )}

          {/* Accessibility Panel */}
          <AccessibilityPanel
            isOpen={activeModal === 'a11y'}
            onClose={() => setActiveModal(null)}
          />
        </div>
      </div>

      {/* Dynamic Floating Scroll-to-Top Button */}
      {showScrollTop && (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Scroll to top"
          title="Scroll to top"
          className="fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-[#2d6a4f] hover:bg-[#1e4d38] text-white shadow-xl hover:scale-110 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#52b788] animate-in fade-in zoom-in-75 cursor-pointer"
        >
          <ArrowUpIcon className="h-5 w-5 stroke-[2.5]" />
        </button>
      )}

      {/* Share Toast Confirmation */}
      {copiedToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl bg-slate-900/95 px-4 py-2.5 text-xs font-bold text-white shadow-2xl backdrop-blur-md border border-[#E0E0E0] animate-in fade-in slide-in-from-bottom-3"
        >
          <CheckIcon className="h-4 w-4 text-[var(--saathi-text-muted)]" />
          <span>Portal link copied to clipboard!</span>
        </div>
      )}
    </>
  );
}

