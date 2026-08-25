import { useState, useEffect, useRef } from 'react';
import {
  CheckIcon,
  ClipboardDocumentIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

export default function SharePopover({ isOpen, onClose }) {
  const [copied, setCopied] = useState(false);
  const popoverRef = useRef(null);

  const shareUrl = typeof window !== 'undefined' ? window.location.origin : 'https://saathi-umber.vercel.app';
  const shareTitle = 'SAATHI — Farmer Services & Market Portal';
  const shareText = 'Check out SAATHI for direct crop prices, verified buyers, and farmer schemes:';

  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        onClose();
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        onClose();
      } catch (err) {
        console.error('Error sharing:', err);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-modal="true"
      aria-label="Share SAATHI portal"
      className="absolute right-14 top-0 z-50 w-72 rounded-2xl border border-[var(--saathi-border-light)] bg-white p-4 shadow-2xl ring-1 ring-black/10 animate-in fade-in zoom-in-95 duration-150"
    >
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <h4 className="text-sm font-bold text-[var(--saathi-text)]">Share SAATHI</h4>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close share dialog"
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-[var(--saathi-text-secondary)] transition"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 space-y-2">
        {/* WhatsApp */}
        <a
          href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-xl border border-slate-100 bg-[var(--saathi-surface-alt)]/60 p-2.5 text-xs font-semibold text-[var(--saathi-text)] transition hover:bg-slate-100 hover:text-[var(--saathi-text)]"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#25D366] text-white font-bold text-sm">
            W
          </span>
          <span>Share on WhatsApp</span>
        </a>

        {/* X / Twitter */}
        <a
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-xl border border-[var(--saathi-border-light)] bg-[var(--saathi-surface-alt)] p-2.5 text-xs font-semibold text-[var(--saathi-text)] transition hover:bg-slate-100"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-black text-white font-bold text-xs">
            𝕏
          </span>
          <span>Share on X (Twitter)</span>
        </a>

        {/* Facebook */}
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-xl border border-slate-100 bg-[var(--saathi-surface-alt)]/60 p-2.5 text-xs font-semibold text-[var(--saathi-text)] transition hover:bg-slate-100"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1877F2] text-white font-bold text-sm">
            f
          </span>
          <span>Share on Facebook</span>
        </a>

        {/* Web Share (Mobile) */}
        {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
          <button
            type="button"
            onClick={handleNativeShare}
            className="flex w-full items-center gap-3 rounded-xl border border-violet-100 bg-violet-50/60 p-2.5 text-left text-xs font-semibold text-violet-900 transition hover:bg-violet-100"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600 text-white font-bold text-sm">
              📱
            </span>
            <span>Device Share Menu</span>
          </button>
        )}

        {/* Copy Link */}
        <button
          type="button"
          onClick={handleCopyLink}
          className="flex w-full items-center justify-between rounded-xl border border-[var(--saathi-border-light)] bg-white p-2.5 text-left text-xs font-semibold text-[var(--saathi-text)] transition hover:bg-[var(--saathi-surface-alt)] hover:border-[var(--saathi-border)]"
        >
          <div className="flex items-center gap-2">
            <ClipboardDocumentIcon className="h-4 w-4 text-[var(--saathi-text-muted)]" />
            <span>{copied ? 'Link copied!' : 'Copy website link'}</span>
          </div>
          {copied && <CheckIcon className="h-4 w-4 text-[var(--saathi-text-secondary)]" />}
        </button>
      </div>
    </div>
  );
}
