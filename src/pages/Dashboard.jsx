import HeroSection from '../components/hero/HeroSection';
import FarmerServices from '../components/portal/FarmerServices';
import MarketInformation from '../components/portal/MarketInformation';
import MandiSnapshot from '../components/portal/MandiSnapshot';
import BuyerSnapshot from '../components/portal/BuyerSnapshot';
import MarketJourneySection from '../components/portal/MarketJourneySection';
import AskSaathiPanel from '../components/portal/AskSaathiPanel';
import FarmerReviewsIntro from '../components/portal/FarmerReviewsIntro';
import PlatformIntro from '../components/portal/PlatformIntro';
import AuthBoundaryCTA from '../components/portal/AuthBoundaryCTA';
import PortalFooter from '../components/portal/PortalFooter';

export default function Dashboard({ onVoiceStart, voiceAssistantResponse, onOpenLanguageModal }) {
  return (
    <div className="relative min-h-screen bg-background text-[#161616] font-sans selection:bg-slate-100 selection:text-[var(--saathi-text)]">
      {/* 1. Header & Agricultural Public-Service Hero Section (Slideshow, Branding, Search, Sticky Navigation) */}
      <HeroSection onOpenLanguageModal={onOpenLanguageModal} onVoiceStart={onVoiceStart} />

      {/* Main Content Area accessible via Skip to Main Content Link */}
      <main id="main-content" tabIndex="-1" className="relative z-10 w-full focus:outline-none">
        
        {/* 2. Explore SAATHI / Core Services */}
        <FarmerServices onVoiceStart={onVoiceStart} />

        {/* 3. Market Prices Preview */}
        <MarketInformation />

        {/* 4. Mandi Information Preview */}
        <MandiSnapshot />

        {/* 5. Buyer Discovery Preview */}
        <BuyerSnapshot />

        {/* 6. Market Explorer Preview */}
        <MarketJourneySection />

        {/* 7. Ask SAATHI (Voice & Text Assistant) */}
        <AskSaathiPanel
          onVoiceStart={onVoiceStart}
          assistantResponse={voiceAssistantResponse}
        />

        {/* 8. Reviews & Experiences */}
        <FarmerReviewsIntro />

        {/* 9. About SAATHI (Platform Overview & Access Levels) */}
        <PlatformIntro />

        {/* 10. Registration / Login CTA */}
        <AuthBoundaryCTA />

        {/* 11. Institutional Portal Footer */}
        <PortalFooter onVoiceStart={onVoiceStart} />
      </main>
    </div>
  );
}
