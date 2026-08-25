import { Link } from 'react-router-dom';
import saathiLogo from '../../assets/logo.png';

export default function PortalFooter({ onVoiceStart }) {
  return (
    <footer className="w-full bg-[#18181b] text-white pt-16 pb-10 border-t border-slate-800" aria-label="Footer">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Main 3-Column Grid */}
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3 pb-12 border-b border-slate-800">
          
          {/* Column 1: SAATHI Brand & Purpose */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img
                src={saathiLogo}
                alt="SAATHI Logo"
                className="h-12 w-12 object-contain drop-shadow"
              />
              <span className="text-2xl font-black tracking-wider text-white">SAATHI</span>
            </div>

            <p className="text-sm sm:text-base font-extrabold text-[#52b788] tracking-wide">
              Aapki Aawaz, Aapka Bazaar
            </p>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-md">
              An independent digital platform bringing agricultural market prices, mandi discovery, buyer networks, and supply chain insights together in one place.
            </p>
          </div>

          {/* Column 2: PLATFORM (Standardized feature names) */}
          <div>
            <h4 className="text-sm sm:text-base font-extrabold uppercase tracking-wider text-white mb-4 pb-2 border-b border-slate-800">
              Platform Features
            </h4>
            <ul className="space-y-3 text-sm sm:text-base text-slate-300">
              <li>
                <Link to="/prices" className="hover:text-[#52b788] transition-colors">
                  Market Prices
                </Link>
              </li>
              <li>
                <Link to="/mandis" className="hover:text-[#52b788] transition-colors">
                  Mandi Information
                </Link>
              </li>
              <li>
                <Link to="/buyers" className="hover:text-[#52b788] transition-colors">
                  Buyer Discovery
                </Link>
              </li>
              <li>
                <Link to="/explorer" className="hover:text-[#52b788] transition-colors">
                  Market Explorer
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onVoiceStart}
                  className="hover:text-[#52b788] transition-colors text-left cursor-pointer text-slate-300"
                >
                  Ask SAATHI
                </button>
              </li>
              <li>
                <Link to="/reviews" className="hover:text-[#52b788] transition-colors">
                  Reviews & Experiences
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: ACCOUNT & INFORMATION */}
          <div>
            <h4 className="text-sm sm:text-base font-extrabold uppercase tracking-wider text-white mb-4 pb-2 border-b border-slate-800">
              Account & Information
            </h4>
            <ul className="space-y-3 text-sm sm:text-base text-slate-300">
              <li>
                <Link to="/about" className="hover:text-[#52b788] transition-colors">
                  About SAATHI
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-[#52b788] transition-colors">
                  Sign In
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-[#52b788] transition-colors">
                  Create Account
                </Link>
              </li>
              <li>
                <Link to="/profile" className="hover:text-[#52b788] transition-colors">
                  User Profile
                </Link>
              </li>
              <li>
                <a href="#main-content" className="hover:text-[#52b788] transition-colors">
                  Back to Top
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Strip */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-slate-400">
          <div>
            © {new Date().getFullYear()} SAATHI. All rights reserved.
          </div>

          <div className="flex flex-wrap items-center gap-4 text-slate-400">
            <Link to="/about" className="hover:text-white transition-colors">About</Link>
            <span className="text-[var(--saathi-text-secondary)]">•</span>
            <a href="#main-content" className="hover:text-white transition-colors">Back to Top</a>
            <span className="text-[var(--saathi-text-secondary)]">•</span>
            <span className="text-[var(--saathi-text-muted)]">Agricultural Market Information Portal</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
