import { cloneElement, isValidElement, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AIVoiceModal from './AIVoiceModal';
import HeroNavigation from './hero/HeroNavigation';
import FloatingTools from './hero/FloatingTools';
import LanguagePopup from './LanguagePopup';
import { useUser } from '../context/UserContext';

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, preferredLanguage, setLanguage, user } = useUser();
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(location.pathname === '/ai');
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [voiceAssistantResponse, setVoiceAssistantResponse] = useState('');
  const [voiceInitialQuery, setVoiceInitialQuery] = useState('');
  
  const isDashboardPage = location.pathname === '/' || location.pathname === '/dashboard';
  const isTransparentPage = isDashboardPage
    || location.pathname === '/ai'
    || location.pathname === '/explorer'
    || location.pathname === '/buyers'
    || location.pathname === '/prices'
    || location.pathname === '/mandis'
    || location.pathname === '/reviews'
    || location.pathname === '/about'
    || location.pathname === '/wholesalers'
    || location.pathname === '/distributors'
    || location.pathname === '/retailers'
    || location.pathname === '/consumers'
    || location.pathname.includes('/orders')
    || location.pathname === '/crop-journey';

  useEffect(() => {
    if (location.pathname === '/ai') {
      setIsVoiceModalOpen(true);
    }
  }, [location.pathname]);

  const openVoiceModal = (initialQuery = '') => {
    if (typeof window !== 'undefined') {
      if (window.speechSynthesis) {
        const warmup = new SpeechSynthesisUtterance('');
        warmup.volume = 0;
        window.speechSynthesis.speak(warmup);
      }
      
      // Initialize and unlock a global Web Audio Context for delayed backend TTS
      if (!window.sharedAudioContext) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          window.sharedAudioContext = new AudioContext();
        }
      }
      if (window.sharedAudioContext && window.sharedAudioContext.state === 'suspended') {
        window.sharedAudioContext.resume();
      }
    }
    setVoiceInitialQuery(typeof initialQuery === 'string' ? initialQuery : '');
    setIsVoiceModalOpen(true);
  };

  const closeVoiceModal = () => {
    setIsVoiceModalOpen(false);
    setVoiceInitialQuery('');
  };

  const enhancedChildren = isValidElement(children)
    ? cloneElement(children, {
        isVoiceModalOpen,
        onVoiceStart: openVoiceModal,
        voiceAssistantResponse,
        onOpenLanguageModal: () => setIsLanguageModalOpen(true),
      })
    : children;

  return (
    <div className="relative min-h-screen bg-[var(--saathi-background)] text-[var(--saathi-text)] flex flex-col">

      {/* Top Navbar on all inner pages (Dashboard has integrated HeroNavigation in HeroSection) */}
      {!isDashboardPage && (
        <HeroNavigation
          isSticky={true}
          showSubNav={true}
          onOpenLanguageModal={() => setIsLanguageModalOpen(true)}
          onVoiceStart={openVoiceModal}
        />
      )}

      {/* Main Content Area */}
      <div
        id={!isDashboardPage ? "main-content" : undefined}
        tabIndex={!isDashboardPage ? -1 : undefined}
        className={`relative z-10 w-full focus:outline-none ${isDashboardPage ? 'pb-0' : 'min-h-screen pt-24 sm:pt-28 pb-16'}`}
      >
        {isTransparentPage ? (
          enhancedChildren
        ) : (
          <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 lg:pt-8">
            <div className="rounded-lg bg-[var(--saathi-surface)] border border-[var(--saathi-border-light)] p-6 sm:p-8 shadow-sm text-[var(--saathi-text)]">
              {enhancedChildren}
            </div>
          </div>
        )}
      </div>

      {/* Right Floating Utility Dock & Go-to-Top Button on ALL pages */}
      <FloatingTools
        onOpenLanguageModal={() => setIsLanguageModalOpen(true)}
        onVoiceStart={openVoiceModal}
      />

      {/* Full 22 Scheduled Indian Languages Modal (Accessible globally on all pages) */}
      {isLanguageModalOpen && (
        <LanguagePopup
          isOpen={isLanguageModalOpen}
          onClose={() => setIsLanguageModalOpen(false)}
          onLanguageSelect={() => setIsLanguageModalOpen(false)}
        />
      )}

      {/* AI Voice Query Modal */}
      {isVoiceModalOpen && (
        <AIVoiceModal
          onClose={closeVoiceModal}
          onResponse={setVoiceAssistantResponse}
          preferredLanguage={preferredLanguage}
          initialQuery={voiceInitialQuery}
          onNavigate={(path) => {
            navigate(path);
            closeVoiceModal();
          }}
        />
      )}
    </div>
  );
}
