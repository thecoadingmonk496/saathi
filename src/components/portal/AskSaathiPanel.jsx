  import { useState, useRef } from 'react';
import { MicrophoneIcon } from '@heroicons/react/24/outline';
import SectionHeader from './SectionHeader';
import SectionSideDecoration from '../common/SectionSideDecoration';
import { useUser } from '../../context/UserContext';

export default function AskSaathiPanel({ onVoiceStart }) {
  const { t } = useUser();
  const [customText, setCustomText] = useState('');
  const inputRef = useRef(null);

  const handleQuickQuestionClick = (questionText) => {
    setCustomText(questionText);
    inputRef.current?.focus();
  };

  const handleLaunchVoice = () => {
    if (onVoiceStart) {
      onVoiceStart();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!customText.trim()) return;
    if (onVoiceStart) {
      onVoiceStart(customText.trim());
    }
  };

  return (
    <section className="relative overflow-hidden w-full bg-[var(--saathi-background)] py-14 sm:py-16" id="ask-saathi">
      {/* Decorative Side Framing */}
      <SectionSideDecoration motif="askSaathi" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title={t('nav.askSaathi') || "ASK SAATHI"}
          subtitle={t('services.voice.desc') || "Voice and text search for agricultural market information."}
        />

        {/* Lighter, Warm Harvest Green Card */}
        <div className="mt-8 overflow-hidden rounded-2xl bg-[#2d6a4f] text-white shadow-xl border border-[#3d8563] max-w-5xl mx-auto">
          <div className="grid gap-6 p-6 sm:p-10 lg:grid-cols-12 lg:items-center">
            
            {/* Left Content (7 Cols) */}
            <div className="lg:col-span-7">
              <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
                Ask Questions in Your Language
              </h3>

              <p className="mt-2.5 text-xs sm:text-sm text-white/90 leading-relaxed max-w-xl">
                Use natural voice or typed questions to search for mandi rates, buyers, and commodity information across the platform.
              </p>

              {/* Sample Quick Action Chips */}
              <div className="mt-6">
                <span className="block text-xs font-bold uppercase tracking-wider text-white mb-2.5">
                  Suggested Queries:
                </span>
                <div className="flex flex-wrap gap-2">
                  {[
                    "What is today's wheat price?",
                    "Find buyers near me",
                    "Nearby mandis"
                  ].map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleQuickQuestionClick(q)}
                      className="rounded-lg bg-[#3a7d5e] hover:bg-[#469370] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition cursor-pointer active:scale-95"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Action Box (5 Cols) with Warm Meadow Depth */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center rounded-xl bg-[#1e4d38] p-6 text-center border border-[#3d8563] shadow-md">
              <button
                type="button"
                onClick={handleLaunchVoice}
                aria-label="Ask SAATHI Voice Assistant"
                title="Tap to speak"
                className="group relative flex h-16 w-16 items-center justify-center rounded-full bg-[#52b788] hover:bg-[#40916c] text-white shadow-xl transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none focus:ring-4 focus:ring-[#74c69d]/40 cursor-pointer"
              >
                {/* Blinking & popping outer radar rings in warm spring tone */}
                <span className="absolute -inset-2 rounded-full bg-[#52b788] opacity-75 animate-ping pointer-events-none" />
                <span className="absolute -inset-1 rounded-full bg-[#74c69d] opacity-40 animate-pulse pointer-events-none" />

                <MicrophoneIcon className="relative z-10 h-7 w-7 stroke-[2.2] transition-transform duration-200 group-hover:scale-110 text-white" />
              </button>

              <span className="mt-3.5 text-sm font-extrabold text-white">
                Tap to Speak
              </span>

              {/* Text Input with Warm Green Submit Button */}
              <form onSubmit={handleSubmit} className="mt-4 w-full flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="Type an agricultural question..."
                  className="h-10 flex-1 rounded-md border border-[#74c69d] bg-white text-[var(--saathi-text)] placeholder:text-[var(--saathi-text-muted)] px-3 text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-[#52b788]"
                />
                <button
                  type="submit"
                  disabled={!customText.trim()}
                  className="flex h-10 items-center justify-center rounded-md bg-[#D91E2A] hover:bg-[#b81722] px-4 text-xs sm:text-sm font-extrabold text-white transition shadow active:scale-95 disabled:opacity-40 cursor-pointer"
                >
                  Ask
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
