import { useState, useEffect, useRef } from 'react';
import {
  XMarkIcon,
  SpeakerWaveIcon,
  StopIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { useUser } from '../../context/UserContext';
import { AccessibilityIcon } from './FloatingTools';

export default function AccessibilityPanel({ isOpen, onClose }) {
  const { t } = useUser();
  const modalRef = useRef(null);
  const [fontScale, setFontScale] = useState(1);
  const [highContrast, setHighContrast] = useState(false);
  const [bigCursor, setBigCursor] = useState(false);
  const [isReading, setIsReading] = useState(false);

  // Close on outside click or Escape
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

  // Adjust font scale
  const changeFontScale = (delta) => {
    setFontScale((prev) => {
      const next = Math.min(1.3, Math.max(0.85, Math.round((prev + delta) * 100) / 100));
      document.documentElement.style.setProperty('--font-scale', next.toString());
      return next;
    });
  };

  const resetFontScale = () => {
    setFontScale(1);
    document.documentElement.style.setProperty('--font-scale', '1');
  };

  // Toggle High Contrast
  const toggleContrast = () => {
    setHighContrast((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('high-contrast');
      } else {
        document.documentElement.classList.remove('high-contrast');
      }
      return next;
    });
  };

  // Toggle Big Cursor
  const toggleBigCursor = () => {
    setBigCursor((prev) => {
      const next = !prev;
      if (next) {
        document.body.style.cursor = 'default';
        document.documentElement.classList.add('big-cursor');
      } else {
        document.body.style.cursor = '';
        document.documentElement.classList.remove('big-cursor');
      }
      return next;
    });
  };

  // Web Speech API screen reader
  const toggleScreenReader = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (isReading) {
      window.speechSynthesis.cancel();
      setIsReading(false);
      return;
    }

    const mainEl = document.getElementById('main-content') || document.body;
    const textToRead = mainEl.innerText.slice(0, 1500); // Read first 1500 chars

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.rate = 0.95;
    utterance.onend = () => setIsReading(false);
    utterance.onerror = () => setIsReading(false);

    setIsReading(true);
    window.speechSynthesis.speak(utterance);
  };

  // Reset all accessibility settings
  const handleResetAll = () => {
    resetFontScale();
    if (highContrast) toggleContrast();
    if (bigCursor) toggleBigCursor();
    if (isReading && typeof window !== 'undefined') {
      window.speechSynthesis.cancel();
      setIsReading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-label="Accessibility Tools"
      className="absolute right-14 top-0 w-72 rounded-lg border border-[var(--saathi-border-light)] bg-white text-[var(--saathi-text)] p-4 shadow-2xl z-50 animate-in fade-in zoom-in-95 text-xs"
    >
      <div className="flex items-center justify-between border-b border-[var(--saathi-border-light)] pb-2.5">
        <div className="flex items-center gap-1.5">
          <AccessibilityIcon className="h-4 w-4 text-[var(--saathi-primary)]" />
          <span className="font-bold uppercase tracking-wider text-[var(--saathi-text)]">
            Accessibility
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close accessibility panel"
          className="rounded-md p-1 text-[var(--saathi-text-secondary)] hover:bg-[var(--saathi-surface-alt)] hover:text-[var(--saathi-text)] transition"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="py-3 space-y-3.5">
        {/* 1. Text Size Scaling */}
        <div>
          <span className="block font-bold text-[var(--saathi-text-secondary)] mb-1.5 uppercase tracking-wide text-xs">
            Text Size ({Math.round(fontScale * 100)}%)
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => changeFontScale(-0.08)}
              disabled={fontScale <= 0.85}
              className="rounded-lg border border-[var(--saathi-border-light)] bg-[var(--saathi-surface-alt)] py-1.5 font-bold text-[var(--saathi-text)] hover:bg-[var(--saathi-border-light)] disabled:opacity-40 transition"
            >
              A -
            </button>
            <button
              type="button"
              onClick={resetFontScale}
              className="rounded-lg border border-[var(--saathi-border-light)] bg-[var(--saathi-surface-alt)] py-1.5 font-bold text-[var(--saathi-text)] hover:bg-[var(--saathi-border-light)] transition"
            >
              A (100%)
            </button>
            <button
              type="button"
              onClick={() => changeFontScale(0.08)}
              disabled={fontScale >= 1.3}
              className="rounded-lg border border-[var(--saathi-border-light)] bg-[var(--saathi-surface-alt)] py-1.5 font-bold text-[var(--saathi-text)] hover:bg-[var(--saathi-border-light)] disabled:opacity-40 transition"
            >
              A +
            </button>
          </div>
        </div>

        {/* 2. High Contrast Mode */}
        <div className="flex items-center justify-between pt-1 border-t border-[var(--saathi-border-light)]">
          <span className="font-semibold text-[var(--saathi-text)]">High Contrast</span>
          <button
            type="button"
            onClick={toggleContrast}
            className={`rounded-lg px-3 py-1 font-bold transition ${
              highContrast
                ? 'bg-[var(--saathi-primary)] text-white'
                : 'border border-[var(--saathi-border-light)] bg-[var(--saathi-surface-alt)] text-[var(--saathi-text)] hover:bg-[var(--saathi-border-light)]'
            }`}
          >
            {highContrast ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* 3. Screen Reader (Web Speech API) */}
        <div className="flex items-center justify-between pt-1 border-t border-[var(--saathi-border-light)]">
          <span className="font-semibold text-[var(--saathi-text)]">Read Page (Voice)</span>
          <button
            type="button"
            onClick={toggleScreenReader}
            className={`flex items-center gap-1 rounded-lg px-3 py-1 font-bold transition ${
              isReading
                ? 'bg-[var(--saathi-accent)] text-white animate-pulse'
                : 'border border-[var(--saathi-border-light)] bg-[var(--saathi-surface-alt)] text-[var(--saathi-text)] hover:bg-[var(--saathi-border-light)]'
            }`}
          >
            {isReading ? (
              <>
                <StopIcon className="h-3.5 w-3.5" />
                <span>Stop</span>
              </>
            ) : (
              <>
                <SpeakerWaveIcon className="h-3.5 w-3.5" />
                <span>Listen</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Reset All */}
      <div className="pt-2 border-t border-[var(--saathi-border-light)] flex justify-end">
        <button
          type="button"
          onClick={handleResetAll}
          className="flex items-center gap-1 text-sm font-semibold text-[var(--saathi-text-secondary)] hover:text-[var(--saathi-text)] transition"
        >
          <ArrowPathIcon className="h-3 w-3" />
          <span>Reset Settings</span>
        </button>
      </div>
    </div>
  );
}
