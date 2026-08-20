import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import heroBg from '../assets/hero-bg.jpg';

export default function Register() {
  const navigate = useNavigate();
  const { t, preferredLanguage, supportedLanguages, setLanguage } = useUser();
  const [selectedTags, setSelectedTags] = useState([]);

  // Use the translation system to get the correct language code for the select dropdown
  const selectedLanguageCode = supportedLanguages?.find(
    (option) => option.code === preferredLanguage || option.name === preferredLanguage
  )?.code || 'hi';

  const cropTags = [
    { id: 'wheat', label: t('crop.wheat') || 'Wheat', icon: '🌾' },
    { id: 'paddy', label: t('crop.paddy') || 'Paddy', icon: '🍚' },
    { id: 'maize', label: t('crop.maize') || 'Maize', icon: '🌽' },
    { id: 'potato', label: t('crop.potato') || 'Potato', icon: '🥔' },
    { id: 'cotton', label: t('crop.cotton') || 'Cotton', icon: '🌿' },
  ];

  const toggleTag = (id) => {
    if (selectedTags.includes(id)) {
      setSelectedTags(selectedTags.filter((tId) => tId !== id));
    } else {
      setSelectedTags([...selectedTags, id]);
    }
  };

  const handleRegister = (e) => {
    e.preventDefault();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col relative pb-12 overflow-x-hidden">
      {/* FULL-SCREEN HERO BACKGROUND */}
      <img
        src={heroBg}
        alt="Indian agricultural field with farmer"
        className="fixed inset-0 w-full h-full object-cover object-center z-0"
      />

      {/* SUBTLE DARK/GREEN OVERLAY */}
      <div className="fixed inset-0 bg-[#042F24]/40 z-0 backdrop-blur-[1px]" />

      {/* NAVBAR */}
      <header className="relative z-10 bg-[#064E3B]/95 backdrop-blur-md text-white px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-lg border-b border-white/10">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="SAATHI Logo" className="w-10 h-10 rounded-full border-2 border-white/80 shadow-sm object-cover" />
          <span className="text-xl font-extrabold tracking-wide">SAATHI</span>
          <span className="hidden md:inline text-sm text-green-200 border-l border-green-700 pl-3 ml-2 italic font-medium">
            "{t('hero.subtitle') || 'Aapki Aawaz, Aapka Bazaar, Aapka SAATHI.'}"
          </span>
        </div>

        <div className="flex items-center">
          <select
            className="max-w-[9rem] bg-[#0b281f]/80 border border-green-500/40 text-emerald-100 text-xs sm:text-sm px-3 py-2 rounded-lg hover:bg-green-700 transition cursor-pointer outline-none focus:ring-2 focus:ring-green-400 font-semibold shadow-sm"
            value={selectedLanguageCode}
            onChange={(e) => setLanguage(e.target.value)}
          >
            {supportedLanguages?.map((lang) => (
              <option key={lang.code} value={lang.code} className="bg-slate-900 text-white font-bold">
                🌐 {lang.name === 'English' ? 'English' : lang.nativeName}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* MAIN REGISTRATION CONTENT */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-3 sm:p-6 lg:p-10">
        <div className="w-full max-w-[1100px] flex flex-col lg:flex-row rounded-2xl overflow-hidden shadow-2xl bg-[#faf8f0]/95 backdrop-blur-md border border-white/40">

          {/* LEFT INFORMATION PANEL */}
          <div className="lg:w-5/12 p-7 lg:p-10 text-white bg-[#0f4b37]/90 flex flex-col justify-center border-r border-white/10 backdrop-blur-sm relative overflow-hidden">
            <h2 className="text-3xl lg:text-4xl font-extrabold mb-3 drop-shadow-md text-white">{t('register.joinTitle')}</h2>
            <p className="max-w-sm text-sm leading-6 text-green-50/90">{t('register.joinText')}</p>

            <div className="mt-7 space-y-4 relative z-10">
              <Benefit icon="📊" text={t('register.benefitPrices')} />
              <Benefit icon="🤝" text={t('register.benefitBuyers')} />
              <Benefit icon="🚜" text={t('register.benefitSupport')} />
            </div>
          </div>

          {/* RIGHT REGISTRATION FORM */}
          <div className="lg:w-7/12 p-6 sm:p-8 lg:p-10 bg-white/80 flex flex-col justify-center">
            <div className="mb-6 text-center md:text-left">
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{t('register.title')}</h1>
              <p className="text-slate-600 font-semibold mt-2 leading-6">{t('register.subtitle')}</p>
            </div>

            <form onSubmit={handleRegister} className="space-y-5">

              {/* Row 1 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                    <label className="block text-sm font-extrabold text-slate-700 mb-1.5">{t('register.nameLabel')}</label>
                  <input 
                    type="text" 
                    placeholder={t('register.namePlaceholder') || 'Enter your full name'}
                    className="w-full bg-white border border-slate-200 text-slate-900 py-3.5 px-4 rounded-xl focus:outline-none focus:ring-4 focus:ring-[#2F7D32]/20 focus:border-[#2F7D32] font-semibold transition shadow-sm placeholder:text-slate-400"
                    required
                  />
                </div>
                <div>
                    <label className="block text-sm font-extrabold text-slate-700 mb-1.5">{t('register.mobileLabel')}</label>
                    <div className="flex min-w-0 shadow-sm rounded-xl">
                      <span className="inline-flex shrink-0 items-center px-3 sm:px-4 rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 text-slate-700 font-bold">
                      +91
                    </span>
                    <input 
                      type="tel" 
                      placeholder={t('register.mobilePlaceholder') || '10-digit number'}
                      className="min-w-0 flex-1 bg-white border border-slate-200 text-slate-900 py-3.5 px-3 sm:px-4 rounded-r-xl focus:outline-none focus:ring-4 focus:ring-[#2F7D32]/20 focus:border-[#2F7D32] font-semibold transition placeholder:text-slate-400"
                      maxLength="10"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-extrabold text-slate-700 mb-1.5">{t('register.stateLabel')}</label>
                  <div className="relative">
                    <select className="w-full bg-white border border-slate-200 text-slate-900 py-3.5 px-4 rounded-xl focus:outline-none focus:ring-4 focus:ring-[#2F7D32]/20 focus:border-[#2F7D32] font-semibold cursor-pointer transition appearance-none shadow-sm" required>
                      <option value="">{t('register.selectState')}</option>
                      <option value="UP">Uttar Pradesh</option>
                      <option value="MP">Madhya Pradesh</option>
                      <option value="MH">Maharashtra</option>
                      <option value="PB">Punjab</option>
                      <option value="HR">Haryana</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-extrabold text-slate-700 mb-1.5">{t('register.districtLabel')}</label>
                  <input 
                    type="text" 
                    placeholder={t('register.districtPlaceholder')}
                    className="w-full bg-white border border-slate-200 text-slate-900 py-3.5 px-4 rounded-xl focus:outline-none focus:ring-4 focus:ring-[#2F7D32]/20 focus:border-[#2F7D32] font-semibold transition shadow-sm placeholder:text-slate-400"
                    required
                  />
                </div>
              </div>

              {/* Row 3 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-extrabold text-slate-700 mb-1.5">{t('register.landSize')}</label>
                  <input 
                    type="number" 
                    placeholder={t('register.landSizePlaceholder')}
                    step="0.1"
                    className="w-full bg-white border border-slate-200 text-slate-900 py-3.5 px-4 rounded-xl focus:outline-none focus:ring-4 focus:ring-[#2F7D32]/20 focus:border-[#2F7D32] font-semibold transition shadow-sm placeholder:text-slate-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-extrabold text-slate-700 mb-1.5">{t('register.primaryCrop')}</label>
                  <div className="relative">
                    <select className="w-full bg-white border border-slate-200 text-slate-900 py-3.5 px-4 rounded-xl focus:outline-none focus:ring-4 focus:ring-[#2F7D32]/20 focus:border-[#2F7D32] font-semibold cursor-pointer transition appearance-none shadow-sm" required>
                      <option value="">{t('register.selectPrimaryCrop')}</option>
                      <option value="wheat">{t('crop.wheat') || 'Wheat'}</option>
                      <option value="paddy">{t('crop.paddy') || 'Paddy'}</option>
                      <option value="pulses">{t('crop.pulses') || 'Pulses'}</option>
                      <option value="vegetables">{t('crop.vegetables') || 'Vegetables'}</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 4 */}
              <div className="pt-1">
                <label className="block text-sm font-extrabold text-slate-700 mb-2.5">{t('register.otherCrops')}</label>
                <div className="flex flex-wrap gap-2.5">
                  {cropTags.map(tag => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={`px-4 py-2 rounded-full border text-sm font-bold transition-all flex items-center gap-1.5 ${
                        selectedTags.includes(tag.id)
                          ? 'bg-green-50 border-[#2F7D32] text-[#14532D] shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-[#2F7D32] hover:text-[#2F7D32]'
                      }`}
                    >
                      <span className="text-base">{tag.icon}</span> {tag.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-5">
                <button 
                  type="submit"
                  className="w-full bg-[#14532D] text-white py-4 rounded-xl font-extrabold text-lg hover:bg-[#0f4021] transition shadow-lg shadow-green-900/20 flex items-center justify-center gap-2"
                >
                  {t('register.createAccount')} <span className="text-xl">→</span>
                </button>
              </div>
            </form>

            {/* Login Link */}
            <div className="mt-8 text-center text-slate-600 font-bold text-sm">
              <button onClick={() => navigate('/login')} className="hover:text-[#14532D] transition underline underline-offset-4 decoration-slate-300 hover:decoration-[#14532D]">
                {t('register.alreadyHaveAccount') || 'Already have an account? Login with OTP'}
              </button>
            </div>
          </div>
        </div>
      </main>

    </div>
  );
}

function Benefit({ icon, text }) {
  return (
    <div className="flex items-center gap-3 text-sm font-semibold text-green-50">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-base">{icon}</span>
      <span>{text}</span>
    </div>
  );
}
