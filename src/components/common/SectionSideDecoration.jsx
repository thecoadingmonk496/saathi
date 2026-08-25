/**
 * Reusable Decorative Side Graphics Component
 * 
 * Provides subtle institutional/agricultural background watermark ornaments
 * positioned at the far left and right edges of major sections without
 * interfering with layout, responsiveness, or accessibility.
 */

const MOTIF_PATHS = {
  marketPrices: {
    // Wheat stalks / price trend lines motif
    left: (
      <svg viewBox="0 0 160 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full object-contain">
        {/* Wheat sheaf vector */}
        <path d="M40 460C40 320 60 210 90 80" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="6 6" />
        <path d="M90 80C80 65 65 60 55 75C60 90 75 90 90 80Z" fill="currentColor" opacity="0.8" />
        <path d="M85 110C72 98 57 95 50 110C57 122 72 120 85 110Z" fill="currentColor" opacity="0.7" />
        <path d="M95 115C108 102 123 100 130 115C123 127 108 125 95 115Z" fill="currentColor" opacity="0.7" />
        <path d="M80 150C65 140 50 140 45 155C53 167 68 162 80 150Z" fill="currentColor" opacity="0.6" />
        <path d="M100 155C115 142 130 142 135 157C127 169 112 165 100 155Z" fill="currentColor" opacity="0.6" />
        <path d="M75 190C60 180 45 180 40 195C48 207 63 202 75 190Z" fill="currentColor" opacity="0.5" />
        <path d="M105 195C120 182 135 182 140 197C132 209 117 205 105 195Z" fill="currentColor" opacity="0.5" />
        {/* Upward trend trajectory */}
        <circle cx="25" cy="420" r="3" fill="currentColor" />
        <circle cx="50" cy="360" r="4" fill="currentColor" />
        <circle cx="85" cy="270" r="4.5" fill="currentColor" />
        <circle cx="125" cy="180" r="5" fill="currentColor" />
        <path d="M25 420L50 360L85 270L125 180" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
      </svg>
    ),
    right: (
      <svg viewBox="0 0 160 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full object-contain">
        {/* Mirrored wheat sheaf vector */}
        <path d="M120 460C120 320 100 210 70 80" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="6 6" />
        <path d="M70 80C80 65 95 60 105 75C100 90 85 90 70 80Z" fill="currentColor" opacity="0.8" />
        <path d="M75 110C88 98 103 95 110 110C103 122 88 120 75 110Z" fill="currentColor" opacity="0.7" />
        <path d="M65 115C52 102 37 100 30 115C37 127 52 125 65 115Z" fill="currentColor" opacity="0.7" />
        <path d="M80 150C95 140 110 140 115 155C107 167 92 162 80 150Z" fill="currentColor" opacity="0.6" />
        <path d="M60 155C45 142 30 142 25 157C33 169 48 165 60 155Z" fill="currentColor" opacity="0.6" />
        {/* Trend line */}
        <circle cx="135" cy="420" r="3" fill="currentColor" />
        <circle cx="110" cy="360" r="4" fill="currentColor" />
        <circle cx="75" cy="270" r="4.5" fill="currentColor" />
        <circle cx="35" cy="180" r="5" fill="currentColor" />
        <path d="M135 420L110 360L75 270L35 180" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
      </svg>
    ),
  },

  mandiInformation: {
    // APMC Mandi structure / Market pavilion silhouette
    left: (
      <svg viewBox="0 0 160 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full object-contain">
        {/* Pillars and arches */}
        <rect x="20" y="240" width="12" height="220" rx="2" fill="currentColor" opacity="0.4" />
        <rect x="60" y="200" width="16" height="260" rx="2" fill="currentColor" opacity="0.6" />
        <rect x="105" y="160" width="20" height="300" rx="2" fill="currentColor" opacity="0.8" />
        <path d="M10 240C10 240 26 210 60 210C94 210 105 240 105 240" stroke="currentColor" strokeWidth="2.5" />
        <path d="M50 200C50 200 80 160 115 160C150 160 155 200 155 200" stroke="currentColor" strokeWidth="2.5" />
        {/* Granary dome outline */}
        <path d="M95 160C95 120 115 90 115 90C115 90 135 120 135 160Z" fill="currentColor" opacity="0.5" />
        <circle cx="115" cy="75" r="5" fill="currentColor" opacity="0.7" />
        {/* Base line */}
        <line x1="0" y1="460" x2="160" y2="460" stroke="currentColor" strokeWidth="3" />
      </svg>
    ),
    right: (
      <svg viewBox="0 0 160 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full object-contain">
        {/* Mirrored Mandi archway */}
        <rect x="128" y="240" width="12" height="220" rx="2" fill="currentColor" opacity="0.4" />
        <rect x="84" y="200" width="16" height="260" rx="2" fill="currentColor" opacity="0.6" />
        <rect x="35" y="160" width="20" height="300" rx="2" fill="currentColor" opacity="0.8" />
        <path d="M150 240C150 240 134 210 100 210C66 210 55 240 55 240" stroke="currentColor" strokeWidth="2.5" />
        <path d="M110 200C110 200 80 160 45 160C10 160 5 200 5 200" stroke="currentColor" strokeWidth="2.5" />
        <path d="M25 160C25 120 45 90 45 90C45 90 65 120 65 160Z" fill="currentColor" opacity="0.5" />
        <circle cx="45" cy="75" r="5" fill="currentColor" opacity="0.7" />
        <line x1="0" y1="460" x2="160" y2="460" stroke="currentColor" strokeWidth="3" />
      </svg>
    ),
  },

  buyers: {
    // Buyer / Procurement Trade Network Motif
    left: (
      <svg viewBox="0 0 160 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full object-contain">
        {/* Interconnected procurement nodes */}
        <circle cx="30" cy="180" r="16" stroke="currentColor" strokeWidth="2" fill="none" />
        <circle cx="30" cy="180" r="8" fill="currentColor" opacity="0.5" />
        <circle cx="95" cy="260" r="22" stroke="currentColor" strokeWidth="2.5" fill="none" />
        <circle cx="95" cy="260" r="12" fill="currentColor" opacity="0.6" />
        <circle cx="40" cy="380" r="18" stroke="currentColor" strokeWidth="2" fill="none" />
        <circle cx="40" cy="380" r="9" fill="currentColor" opacity="0.5" />
        <circle cx="120" cy="420" r="12" stroke="currentColor" strokeWidth="1.5" fill="none" />
        {/* Connection pathways */}
        <path d="M30 196L95 238" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" />
        <path d="M95 282L40 362" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" />
        <path d="M40 398L120 420" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
        {/* Verified trade tick watermark */}
        <path d="M85 260L92 268L108 250" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    right: (
      <svg viewBox="0 0 160 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full object-contain">
        {/* Mirrored procurement nodes */}
        <circle cx="130" cy="180" r="16" stroke="currentColor" strokeWidth="2" fill="none" />
        <circle cx="130" cy="180" r="8" fill="currentColor" opacity="0.5" />
        <circle cx="65" cy="260" r="22" stroke="currentColor" strokeWidth="2.5" fill="none" />
        <circle cx="65" cy="260" r="12" fill="currentColor" opacity="0.6" />
        <circle cx="120" cy="380" r="18" stroke="currentColor" strokeWidth="2" fill="none" />
        <circle cx="120" cy="380" r="9" fill="currentColor" opacity="0.5" />
        <circle cx="40" cy="420" r="12" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M130 196L65 238" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" />
        <path d="M65 282L120 362" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" />
        <path d="M120 398L40 420" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
        <path d="M55 260L62 268L78 250" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },

  marketExplorer: {
    // 5-Stage Supply Chain transit / distribution motif
    left: (
      <svg viewBox="0 0 160 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full object-contain">
        <path d="M20 120 C 80 180, 10 280, 80 340 C 130 380, 60 440, 100 480" stroke="currentColor" strokeWidth="2" strokeDasharray="6 4" fill="none" />
        {/* Waypoint nodes */}
        <circle cx="20" cy="120" r="8" fill="currentColor" opacity="0.7" />
        <circle cx="55" cy="225" r="10" fill="currentColor" opacity="0.6" />
        <circle cx="80" cy="340" r="12" fill="currentColor" opacity="0.8" />
        <circle cx="100" cy="480" r="9" fill="currentColor" opacity="0.5" />
        {/* Transit arrows */}
        <polygon points="55,220 65,225 55,230" fill="currentColor" />
        <polygon points="80,335 90,340 80,345" fill="currentColor" />
      </svg>
    ),
    right: (
      <svg viewBox="0 0 160 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full object-contain">
        <path d="M140 120 C 80 180, 150 280, 80 340 C 30 380, 100 440, 60 480" stroke="currentColor" strokeWidth="2" strokeDasharray="6 4" fill="none" />
        <circle cx="140" cy="120" r="8" fill="currentColor" opacity="0.7" />
        <circle cx="105" cy="225" r="10" fill="currentColor" opacity="0.6" />
        <circle cx="80" cy="340" r="12" fill="currentColor" opacity="0.8" />
        <circle cx="60" cy="480" r="9" fill="currentColor" opacity="0.5" />
        <polygon points="105,220 95,225 105,230" fill="currentColor" />
        <polygon points="80,335 70,340 80,345" fill="currentColor" />
      </svg>
    ),
  },

  askSaathi: {
    // Voice assistant / Speech waveform / audio query arcs
    left: (
      <svg viewBox="0 0 160 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full object-contain">
        {/* Concentric voice waves radiating from center */}
        <path d="M30 250 A 60 60 0 0 1 30 190" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M50 270 A 90 90 0 0 1 50 170" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M75 295 A 130 130 0 0 1 75 145" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
        <path d="M105 320 A 170 170 0 0 1 105 120" stroke="currentColor" strokeWidth="2" strokeDasharray="6 6" strokeLinecap="round" opacity="0.6" />
        {/* Vertical equalizer bars */}
        <rect x="20" y="360" width="6" height="30" rx="3" fill="currentColor" opacity="0.4" />
        <rect x="32" y="340" width="6" height="70" rx="3" fill="currentColor" opacity="0.6" />
        <rect x="44" y="355" width="6" height="40" rx="3" fill="currentColor" opacity="0.5" />
        <rect x="56" y="330" width="6" height="90" rx="3" fill="currentColor" opacity="0.7" />
        <rect x="68" y="345" width="6" height="60" rx="3" fill="currentColor" opacity="0.5" />
      </svg>
    ),
    right: (
      <svg viewBox="0 0 160 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full object-contain">
        {/* Mirrored voice waves */}
        <path d="M130 250 A 60 60 0 0 0 130 190" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M110 270 A 90 90 0 0 0 110 170" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M85 295 A 130 130 0 0 0 85 145" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
        <path d="M55 320 A 170 170 0 0 0 55 120" stroke="currentColor" strokeWidth="2" strokeDasharray="6 6" strokeLinecap="round" opacity="0.6" />
        <rect x="134" y="360" width="6" height="30" rx="3" fill="currentColor" opacity="0.4" />
        <rect x="122" y="340" width="6" height="70" rx="3" fill="currentColor" opacity="0.6" />
        <rect x="110" y="355" width="6" height="40" rx="3" fill="currentColor" opacity="0.5" />
        <rect x="98" y="330" width="6" height="90" rx="3" fill="currentColor" opacity="0.7" />
        <rect x="86" y="345" width="6" height="60" rx="3" fill="currentColor" opacity="0.5" />
      </svg>
    ),
  },

  reviews: {
    // Community / Trust badge / Farmer feedback dialogue
    left: (
      <svg viewBox="0 0 160 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full object-contain">
        {/* Shield and stars */}
        <path d="M20 180 C20 180, 75 150, 75 150 C75 150, 130 180, 130 180 C130 270, 75 320, 75 320 C75 320, 20 270, 20 180 Z" stroke="currentColor" strokeWidth="2.5" fill="none" opacity="0.6" />
        <polygon points="75,200 79,214 93,214 82,223 86,237 75,228 64,237 68,223 57,214 71,214" fill="currentColor" opacity="0.7" />
        <polygon points="45,245 48,255 58,255 50,262 53,272 45,265 37,272 40,262 32,255 42,255" fill="currentColor" opacity="0.5" />
        <polygon points="105,245 108,255 118,255 110,262 113,272 105,265 97,272 100,262 92,255 102,255" fill="currentColor" opacity="0.5" />
      </svg>
    ),
    right: (
      <svg viewBox="0 0 160 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full object-contain">
        <path d="M140 180 C140 180, 85 150, 85 150 C85 150, 30 180, 30 180 C30 270, 85 320, 85 320 C85 320, 140 270, 140 180 Z" stroke="currentColor" strokeWidth="2.5" fill="none" opacity="0.6" />
        <polygon points="85,200 89,214 103,214 92,223 96,237 85,228 74,237 78,223 67,214 81,214" fill="currentColor" opacity="0.7" />
        <polygon points="115,245 118,255 128,255 120,262 123,272 115,265 107,272 110,262 102,255 112,255" fill="currentColor" opacity="0.5" />
        <polygon points="55,245 58,255 68,255 60,262 63,272 55,265 47,272 50,262 42,255 52,255" fill="currentColor" opacity="0.5" />
      </svg>
    ),
  },

  about: {
    // Agricultural farmland contours / sunrise horizon
    left: (
      <svg viewBox="0 0 160 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full object-contain">
        {/* Contour lines of farm fields */}
        <path d="M0 220 Q 80 200, 160 250" stroke="currentColor" strokeWidth="2" opacity="0.6" />
        <path d="M0 270 Q 70 250, 160 300" stroke="currentColor" strokeWidth="2.5" opacity="0.7" />
        <path d="M0 330 Q 90 310, 160 360" stroke="currentColor" strokeWidth="2" opacity="0.5" />
        <path d="M0 400 Q 60 380, 160 420" stroke="currentColor" strokeWidth="3" opacity="0.8" />
        {/* Sun crest */}
        <circle cx="50" cy="140" r="30" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" fill="none" opacity="0.5" />
        <line x1="50" y1="90" x2="50" y2="100" stroke="currentColor" strokeWidth="2" />
        <line x1="15" y1="140" x2="5" y2="140" stroke="currentColor" strokeWidth="2" />
        <line x1="85" y1="140" x2="95" y2="140" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
    right: (
      <svg viewBox="0 0 160 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full object-contain">
        {/* Mirrored field contours */}
        <path d="M160 220 Q 80 200, 0 250" stroke="currentColor" strokeWidth="2" opacity="0.6" />
        <path d="M160 270 Q 90 250, 0 300" stroke="currentColor" strokeWidth="2.5" opacity="0.7" />
        <path d="M160 330 Q 70 310, 0 360" stroke="currentColor" strokeWidth="2" opacity="0.5" />
        <path d="M160 400 Q 100 380, 0 420" stroke="currentColor" strokeWidth="3" opacity="0.8" />
        <circle cx="110" cy="140" r="30" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" fill="none" opacity="0.5" />
        <line x1="110" y1="90" x2="110" y2="100" stroke="currentColor" strokeWidth="2" />
        <line x1="145" y1="140" x2="155" y2="140" stroke="currentColor" strokeWidth="2" />
        <line x1="75" y1="140" x2="65" y2="140" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
  },
};

export default function SectionSideDecoration({
  motif = 'marketPrices',
  opacityClass = 'opacity-10 dark:opacity-15',
  colorClass = 'text-[var(--saathi-primary)] dark:text-slate-400',
  showLeft = true,
  showRight = true,
  className = '',
}) {
  const activeMotif = MOTIF_PATHS[motif] || MOTIF_PATHS.marketPrices;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-0 select-none overflow-hidden ${className}`}
    >
      {/* Left Decoration (Desktop/Tablet framing) */}
      {showLeft && (
        <div
          className={`absolute -left-4 sm:left-0 top-0 bottom-0 w-24 sm:w-32 md:w-40 lg:w-48 xl:w-56 hidden md:flex items-center justify-start ${opacityClass} ${colorClass} transition-opacity duration-300`}
        >
          {activeMotif.left}
        </div>
      )}

      {/* Right Decoration (Desktop/Tablet framing) */}
      {showRight && (
        <div
          className={`absolute -right-4 sm:right-0 top-0 bottom-0 w-24 sm:w-32 md:w-40 lg:w-48 xl:w-56 hidden md:flex items-center justify-end ${opacityClass} ${colorClass} transition-opacity duration-300`}
        >
          {activeMotif.right}
        </div>
      )}
    </div>
  );
}
