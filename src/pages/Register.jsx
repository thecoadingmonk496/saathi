import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useUser } from '../context/UserContext';
import heroBg from '../assets/hero-bg.jpg';
import saathiLogo from '../assets/logo.png';

const initialForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  role: 'FARMER', // default role
};

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5001' : '')
).replace(/\/$/, '');

const apiUrl = (path) => `${API_BASE_URL}${path}`;

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, user, isLoggedIn } = useUser();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [registerMode, setRegisterMode] = useState('FARMER');

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (name === 'phone') {
      const digitsOnly = value.replace(/\D/g, '').slice(0, 10);
      setForm((current) => ({ ...current, phone: digitsOnly }));
    } else {
      setForm((current) => ({ ...current, [name]: value }));
    }
    setError('');
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    if (!form.firstName || !form.lastName || !form.email || !form.phone || !form.password) {
      setError('All fields (First name, Last name, Email, Phone, and Password) are required.');
      return;
    }
    if (form.phone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const payload = {
        ...form,
        role: registerMode,
      };
      
      const response = await fetch(apiUrl('/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        const { token, user: registeredUser } = data;
        if (token) localStorage.setItem('token', token);
        if (registeredUser) {
          login({
            ...registeredUser,
            name: `${registeredUser.firstName} ${registeredUser.lastName}`,
            mobile: registeredUser.phone,
          });
        }
        const redirect = searchParams.get('redirect') || '/';
        navigate(redirect);
      } else {
        setError(data.message || 'Registration failed. Please try again.');
      }
    } catch (requestError) {
      setError('Unable to connect to the backend server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-x-hidden font-sans selection:bg-slate-100 selection:text-[var(--saathi-text)]">
      {/* Background Image */}
      <img
        src={heroBg}
        alt="Indian agricultural field with farmer"
        className="fixed inset-0 w-full h-full object-cover object-center z-0"
      />

      {/* Background Dim Overlay */}
      <div className="fixed inset-0 bg-slate-950/80 z-0 backdrop-blur-[2px]" />

      {/* Header */}
      <header className="relative z-10 p-4 sm:p-6 flex justify-between items-center max-w-7xl mx-auto w-full">
        {/* Brand Logo & Name */}
        <Link
          to="/"
          className="flex items-center gap-2.5 group focus:outline-none focus:ring-2 focus:ring-slate-400 rounded-md p-1"
          title="Return to SAATHI Home"
        >
          <img
            src={saathiLogo}
            alt="SAATHI Logo"
            className="w-8 h-8 sm:w-9 sm:h-9 object-contain drop-shadow transition-transform group-hover:scale-105"
          />
          <div>
            <span className="text-base sm:text-lg font-extrabold tracking-wider text-white">
              SAATHI
            </span>
            <span className="hidden sm:block text-xs font-bold text-[#52b788] leading-tight">
              Aapki Aawaz, Aapka Bazaar
            </span>
          </div>
        </Link>

        {/* Back Button */}
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 rounded-lg bg-white/10 hover:bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-all focus:outline-none"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          <span>Back to Portal</span>
        </button>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 sm:p-6 my-auto w-full">
        {/* Toggle */}
        <div className="mb-6 flex items-center bg-white/20 backdrop-blur-md p-1.5 rounded-full border border-white/30 shadow-lg">
          <button type="button" onClick={() => setRegisterMode('FARMER')} className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${registerMode === 'FARMER' ? 'bg-white text-[var(--saathi-primary)] shadow-md' : 'text-white hover:bg-white/10'}`}>Register as Farmer</button>
          <button type="button" onClick={() => setRegisterMode('BUYER')} className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${registerMode === 'BUYER' ? 'bg-white text-[var(--saathi-primary)] shadow-md' : 'text-white hover:bg-white/10'}`}>Register as Buyer</button>
        </div>

        <div className={`w-full bg-white rounded-lg shadow-2xl border border-[var(--saathi-border-light)] p-6 sm:p-8 transition-all duration-500 ease-in-out max-w-[460px]`}>

              {/* Already logged in notice if applicable */}
          {isLoggedIn && (
            <div className="mb-4 p-3 rounded-md bg-[var(--saathi-surface-alt)] border border-[var(--saathi-border-light)] text-xs text-[var(--saathi-text)] flex items-center justify-between">
              <div>
                <span className="font-semibold">Signed in as: </span>
                <strong>{user?.name || 'Farmer'}</strong>
              </div>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="font-bold text-[var(--saathi-primary)] hover:underline"
              >
                Go to Portal →
              </button>
            </div>
          )}

          {/* Logo & Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center mb-3">
              <img
                src={saathiLogo}
                alt="SAATHI Logo"
                className="w-16 h-16 object-contain drop-shadow"
              />
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--saathi-text)]">
              SAATHI
            </h1>

            <p className="mt-1 text-sm font-extrabold tracking-wide text-[var(--saathi-primary)]">
              "Aapki Aawaz, Aapka Bazaar"
            </p>

            <div className="mt-4">
              <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--saathi-text)]">Create {registerMode === 'FARMER' ? 'Farmer' : 'Buyer'} Account</h2>
              <p className="text-sm font-medium text-[var(--saathi-text-secondary)] mt-1">
                Register to access market intelligence and {registerMode === 'FARMER' ? 'buyers' : 'farmers'}
              </p>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <p role="alert" className="mb-4 text-red-700 text-sm font-bold flex items-center gap-1.5 p-3 rounded-lg bg-red-50 border border-red-200">
              <span>⚠️</span> {error}
            </p>
          )}

          {/* Registration Form */}
          <form onSubmit={handleRegister} className="space-y-4 mt-2">
            {/* Name Fields in 2 Columns */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold text-[var(--saathi-text)] mb-1.5">
                  First Name <span className="text-red-600 font-bold ml-0.5">*</span>
                </label>
                <input
                  name="firstName"
                  type="text"
                  placeholder="First name"
                  value={form.firstName}
                  onChange={handleChange}
                  required
                  className="w-full h-12 bg-white border border-[var(--saathi-border)] focus:border-[var(--saathi-accent)] focus:ring-2 focus:ring-red-100 text-[var(--saathi-text)] font-semibold px-3.5 rounded-lg outline-none transition text-base placeholder:text-slate-400 placeholder:font-normal"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-[var(--saathi-text)] mb-1.5">
                  Last Name <span className="text-red-600 font-bold ml-0.5">*</span>
                </label>
                <input
                  name="lastName"
                  type="text"
                  placeholder="Last name"
                  value={form.lastName}
                  onChange={handleChange}
                  required
                  className="w-full h-12 bg-white border border-[var(--saathi-border)] focus:border-[var(--saathi-accent)] focus:ring-2 focus:ring-red-100 text-[var(--saathi-text)] font-semibold px-3.5 rounded-lg outline-none transition text-base placeholder:text-slate-400 placeholder:font-normal"
                />
              </div>
            </div>

            {/* Mobile Number Field with +91 Country Badge */}
            <div>
              <label className="block text-sm font-bold text-[var(--saathi-text)] mb-1.5">
                Mobile Number <span className="text-red-600 font-bold ml-0.5">*</span>
              </label>
              <div className="flex gap-2">
                <div className="relative">
                  <div className="h-12 bg-[var(--saathi-surface-alt)] border border-[var(--saathi-border)] text-[var(--saathi-text)] font-extrabold px-3.5 rounded-lg flex items-center gap-1 text-sm sm:text-base">
                    <span>🇮🇳</span>
                    <span>+91</span>
                  </div>
                </div>
                <input
                  name="phone"
                  type="tel"
                  placeholder="Enter 10-digit number"
                  value={form.phone}
                  onChange={handleChange}
                  maxLength="10"
                  required
                  className="flex-1 h-12 bg-white border border-[var(--saathi-border)] focus:border-[var(--saathi-accent)] focus:ring-2 focus:ring-red-100 text-[var(--saathi-text)] font-semibold px-4 rounded-lg outline-none transition text-base placeholder:text-slate-400 placeholder:font-normal"
                />
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-sm font-bold text-[var(--saathi-text)] mb-1.5">
                Email Address <span className="text-red-600 font-bold ml-0.5">*</span>
              </label>
              <input
                name="email"
                type="email"
                placeholder={registerMode === 'FARMER' ? 'farmer@example.com' : 'buyer@example.com'}
                value={form.email}
                onChange={handleChange}
                required
                className="w-full h-12 bg-white border border-[var(--saathi-border)] focus:border-[var(--saathi-accent)] focus:ring-2 focus:ring-red-100 text-[var(--saathi-text)] font-semibold px-4 rounded-lg outline-none transition text-base placeholder:text-slate-400 placeholder:font-normal"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-1.5 mt-4">
              <label className="block text-sm font-bold text-[var(--saathi-text)] mb-1.5">
                Password <span className="text-red-600 font-bold ml-0.5">*</span>
              </label>
              <input
                name="password"
                type="password"
                placeholder="Create a secure password"
                value={form.password}
                onChange={handleChange}
                required
                minLength={6}
                className="w-full h-12 bg-white border border-[var(--saathi-border)] focus:border-[var(--saathi-accent)] focus:ring-2 focus:ring-red-100 text-[var(--saathi-text)] font-semibold px-4 rounded-lg outline-none transition text-base placeholder:text-slate-400 placeholder:font-normal"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || form.phone.length !== 10}
              className="w-full h-12 sm:h-13 mt-4 bg-[var(--saathi-accent)] hover:bg-[var(--saathi-accent-dark)] text-white rounded-lg font-extrabold text-base sm:text-lg active:scale-[0.99] transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <span className="inline-block animate-spin border-2 border-white border-t-transparent rounded-full w-5 h-5" />
              ) : (
                <>
                  <span>Create {registerMode === 'FARMER' ? 'Farmer' : 'Buyer'} Account</span>
                  <span className="text-xl">➔</span>
                </>
              )}
            </button>
          </form>

          {/* Already registered switch */}
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-sm font-medium text-[var(--saathi-text-secondary)] hover:text-[var(--saathi-text)] transition cursor-pointer"
            >
              Already have an account? <span className="font-extrabold text-red-600 hover:underline ml-0.5">Login with OTP</span>
            </button>
          </div>
        </div>
      </main>

      <div className="h-6" />
    </div>
  );
}
