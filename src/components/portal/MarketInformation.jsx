import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChartBarIcon, ArrowRightIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import SectionHeader from './SectionHeader';
import SectionSideDecoration from '../common/SectionSideDecoration';
import { useUser } from '../../context/UserContext';

const PREVIEW_DATA = [
  { id: 1, crop: 'Wheat (गेहूं)', mandi: 'Shajapur Mandi, MP', price: '₹2,450 / Qtl', trend: 'up' },
  { id: 2, crop: 'Mustard (सरसों)', mandi: 'Bharatpur Mandi, RJ', price: '₹5,300 / Qtl', trend: 'up' },
  { id: 3, crop: 'Paddy (धान)', mandi: 'Karnal Mandi, HR', price: '₹2,100 / Qtl', trend: 'down' },
  { id: 4, crop: 'Soybean (सोयाबीन)', mandi: 'Indore Mandi, MP', price: '₹4,650 / Qtl', trend: 'up' },
];

export default function MarketInformation() {
  const { t } = useUser();
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);

    const [mandiData, setMandidata] = useState(PREVIEW_DATA);

  useEffect(() => {
    const API_BASE = (import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5001' : '')).replace(/\/$/, '') + '/api';
    fetch(`${API_BASE}/mandi-prices?limit=5`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.records && data.records.length > 0) {
          const formatted = data.records.slice(0, 5).map((r, i) => ({
            id: i,
            crop: r.commodity,
            mandi: `${r.market}, ${r.state}`,
            price: `₹${r.modal_price} / Qtl`,
            trend: 'up'
          }));
          setMandidata(formatted);
        }
      })
      .catch(err => console.error('Error fetching data:', err));
  }, []);

  const handlePreviewClick = (e) => {
    e.preventDefault();
    setShowAuthModal(true);
  };

  const handleRedirect = () => {
    navigate('/register');
  };

  return (
    <section className="relative overflow-hidden w-full bg-[var(--saathi-background)] py-14 sm:py-16" id="market-prices">
      <SectionSideDecoration motif="marketPrices" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title={t('nav.marketPrices') || "MARKET PRICES"}
          subtitle={t('services.prices.desc') || "Current APMC mandi rates and price information."}
        />

        {/* Data Preview Section */}
        <div className="mt-8 max-w-5xl mx-auto">
          <div 
            className="bg-white rounded-2xl border border-[var(--saathi-border-light)] shadow-sm overflow-hidden cursor-pointer group relative"
            onClick={handlePreviewClick}
          >
            {/* Overlay Gradient for "Teaser" effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/40 to-white/95 z-10 flex flex-col items-center justify-end pb-12 transition-all group-hover:via-white/50">
               <button className="flex items-center gap-2 bg-[#D91E2A] text-white px-6 py-3 rounded-full font-bold shadow-lg hover:bg-red-800 transition-all transform group-hover:scale-105">
                 <LockClosedIcon className="h-5 w-5" />
                 Unlock Full Market Data
               </button>
            </div>

            <div className="overflow-x-auto opacity-80 filter blur-[1px] group-hover:blur-0 transition-all duration-300">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="py-4 px-6 font-bold text-gray-500 uppercase tracking-wider text-sm">Commodity</th>
                    <th className="py-4 px-6 font-bold text-gray-500 uppercase tracking-wider text-sm">Mandi Location</th>
                    <th className="py-4 px-6 font-bold text-gray-500 uppercase tracking-wider text-sm">Latest Price</th>
                    <th className="py-4 px-6 font-bold text-gray-500 uppercase tracking-wider text-sm">Trend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {mandiData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/50">
                      <td className="py-4 px-6 font-bold text-gray-900">{item.crop}</td>
                      <td className="py-4 px-6 text-gray-600">{item.mandi}</td>
                      <td className="py-4 px-6 font-extrabold text-[#D91E2A]">{item.price}</td>
                      <td className="py-4 px-6">
                        {item.trend === 'up' ? (
                          <span className="text-green-600 font-bold flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                            Up
                          </span>
                        ) : (
                          <span className="text-red-500 font-bold flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                            Down
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {/* Extra dummy row to make it look longer before fading out */}
                  <tr className="hover:bg-gray-50/50">
                    <td className="py-4 px-6 font-bold text-gray-900">Cotton (कपास)</td>
                    <td className="py-4 px-6 text-gray-600">Rajkot Mandi, GJ</td>
                    <td className="py-4 px-6 font-extrabold text-[#D91E2A]">₹7,200 / Qtl</td>
                    <td className="py-4 px-6">
                      <span className="text-green-600 font-bold flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                        Up
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Auth Requirement Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 sm:p-8 transform transition-all">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-5">
              <LockClosedIcon className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-extrabold text-center text-gray-900 mb-2">Authentication Required</h3>
            <p className="text-gray-500 text-center mb-8 leading-relaxed">
              You need to be logged in to access live APMC mandi prices, historical trends, and market analytics.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleRedirect}
                className="w-full bg-[#D91E2A] text-white font-bold py-3.5 px-4 rounded-xl hover:bg-red-800 transition-colors shadow-sm"
              >
                Login / Register Now
              </button>
              <button 
                onClick={() => setShowAuthModal(false)}
                className="w-full bg-gray-100 text-gray-700 font-bold py-3.5 px-4 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
