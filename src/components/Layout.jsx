import { cloneElement, isValidElement, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AIVoiceModal from './AIVoiceModal';
import PlatformTopNav from './PlatformTopNav';
import { useUser } from '../context/UserContext';

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, preferredLanguage, setLanguage, user } = useUser();
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(location.pathname === '/ai');
  const [voiceAssistantResponse, setVoiceAssistantResponse] = useState('');
  const isDashboardPage = location.pathname === '/' || location.pathname === '/ai' || location.pathname === '/dashboard';
  const isTransparentPage = isDashboardPage
    || location.pathname === '/explorer'
    || location.pathname === '/buyers'
    || location.pathname === '/prices';

  useEffect(() => {
    setIsVoiceModalOpen(location.pathname === '/ai');
  }, [location.pathname]);

  const openVoiceModal = () => {
    setIsVoiceModalOpen(true);
  };

  const closeVoiceModal = () => {
    setIsVoiceModalOpen(false);

    if (location.pathname === '/ai') {
      navigate('/', { replace: true });
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const enhancedChildren = isValidElement(children)
    ? cloneElement(children, {
        isVoiceModalOpen,
        onVoiceStart: openVoiceModal,
        voiceAssistantResponse,
      })
    : children;

  return (
    <div className="relative min-h-screen bg-[#064E3B] text-white flex flex-col">

      {}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-no-repeat pointer-events-none"
        style={{ backgroundImage: "url('/saathi-hero-field.jpg')", backgroundPosition: 'center 60%' }}
      >
        {}
        <div className="absolute inset-0 bg-black/25" />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/20 to-transparent" />
      </div>

      {}
      <PlatformTopNav
        preferredLanguage={preferredLanguage}
        user={user}
        onLanguageChange={setLanguage}
        onLogout={handleLogout}
        onVoiceStart={openVoiceModal}
      />

      {}
      <main className="relative z-10 min-h-screen w-full pb-16">
        {isTransparentPage ? (
          enhancedChildren
        ) : (
          <div className="mx-auto max-w-6xl px-4 pt-28 sm:px-6 lg:pt-32">
            <div className="rounded-3xl  bg-[#f4f5f0]/95 backdrop-blur-md p-6 sm:p-8 shadow-2xl text-slate-900">
              {enhancedChildren}
            </div>
          </div>
        )}
      </main>

      {}
      {isVoiceModalOpen && (
        <AIVoiceModal
          onClose={closeVoiceModal}
          onResponse={setVoiceAssistantResponse}
          preferredLanguage={preferredLanguage}
          onNavigate={(path) => {
            navigate(path);
            closeVoiceModal();
          }}
        />
      )}
    </div>
  );
}
