import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import heroBg from '../assets/hero-bg.jpg';

const initialForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
};

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5001' : '')
).replace(/\/$/, '');

const apiUrl = (path) => `${API_BASE_URL}${path}`;

export default function Register() {
  const navigate = useNavigate();
  const { login, preferredLanguage, supportedLanguages, setLanguage } = useUser();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const selectedLanguageCode = supportedLanguages?.find(
    (option) => option.code === preferredLanguage || option.name === preferredLanguage,
  )?.code || 'hi';

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setError('');
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(apiUrl('/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (response.ok) {
        const { token, user } = data;
        if (token) localStorage.setItem('token', token);
        if (user) {
          login({
            ...user,
            name: `${user.firstName} ${user.lastName}`,
            mobile: user.phone,
          });
        }
        navigate('/');
      } else {
        setError(data.message || 'Registration failed. Please try again.');
      }
    } catch (requestError) {
      setError('Unable to connect to the backend server. Please check your network and make sure the server is running.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden pb-8">
      <img src={heroBg} alt="Indian agricultural field with farmer" className="fixed inset-0 z-0 h-full w-full object-cover" />
      <div className="fixed inset-0 z-0 bg-black/30 backdrop-blur-sm" />

      <header className="relative z-10 flex items-center justify-between border-b border-white/10 bg-[#064E3B]/95 px-4 py-3.5 text-white shadow-lg sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <img src="/logo.png" alt="SAATHI Logo" className="h-10 w-10 shrink-0 rounded-full border-2 border-white/80 object-cover shadow-sm" />
          <div className="min-w-0">
            <span className="block text-xl font-extrabold tracking-wide">SAATHI</span>
            <span className="hidden truncate text-xs font-medium text-green-200 sm:block">Get the right price for your crop, from the right buyer</span>
          </div>
        </div>
        <label className="sr-only" htmlFor="registration-language">Language</label>
        <select id="registration-language" className="max-w-[9rem] rounded-lg border border-green-500/40 bg-[#0b281f]/80 px-3 py-2 text-xs font-semibold text-emerald-100 outline-none transition hover:bg-green-700 focus:ring-2 focus:ring-green-400 sm:text-sm" value={selectedLanguageCode} onChange={(event) => setLanguage(event.target.value)}>
          {supportedLanguages?.map((language) => (
            <option key={language.code} value={language.code} className="bg-slate-900 text-white">🌐 {language.name === 'English' ? 'English' : language.nativeName}</option>
          ))}
        </select>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center p-3 sm:p-6 lg:p-10">
        <div className="grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-2xl bg-white shadow-2xl md:grid-cols-12">
          <aside className="hidden flex-col justify-center bg-[#1b4332] p-8 text-white md:col-span-5 md:flex lg:p-10">
            <h2 className="text-3xl font-bold">Join SAATHI</h2>
            <p className="mt-3 text-sm leading-6 text-emerald-50">Register once to access market intelligence and connect with buyers.</p>
            <div className="mt-8 space-y-5 text-sm font-semibold text-emerald-50">
              <Benefit icon="📊" text="Get better crop price information" />
              <Benefit icon="🤝" text="Find nearby buyers" />
              <Benefit icon="🚜" text="Access market and government information" />
            </div>
          </aside>

          <section className="p-6 sm:p-8 md:col-span-7 md:p-10">
            <h1 className="text-2xl font-bold text-gray-900">Create Your Farmer Account</h1>
            <p className="mt-2 text-sm font-medium leading-6 text-gray-600">Register to access market intelligence and buyers.</p>

            {error && <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

            <form onSubmit={handleRegister} className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="First Name" name="firstName" placeholder="Enter your first name" value={form.firstName} onChange={handleChange} />
              <FormField label="Last Name" name="lastName" placeholder="Enter your last name" value={form.lastName} onChange={handleChange} />
              <FormField label="Email" name="email" type="email" placeholder="Enter your email" value={form.email} onChange={handleChange} />
              <FormField label="Phone" name="phone" type="tel" placeholder="Enter your phone number" value={form.phone} onChange={handleChange} />
              <div className="sm:col-span-2">
                <FormField label="Password" name="password" type="password" placeholder="Create a password" value={form.password} onChange={handleChange} />
              </div>
              <button type="submit" disabled={isLoading} className="flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-900 py-3 font-medium text-white shadow transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2">
                {isLoading ? 'Creating account...' : 'Create Farmer Account →'}
              </button>
            </form>

            <button type="button" onClick={() => navigate('/login')} className="mt-6 w-full text-center text-sm font-semibold text-gray-600 underline decoration-gray-300 underline-offset-4 transition hover:text-emerald-900">Already have an account? Login with OTP</button>
          </section>
        </div>
      </main>
    </div>
  );
}

function Benefit({ icon, text }) {
  return <div className="flex items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10">{icon}</span><span>{text}</span></div>;
}

function FormField({ label, name, type = 'text', placeholder, value, onChange }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-sm font-semibold text-gray-700">{label}</span>
      <input name={name} type={type} placeholder={placeholder} value={value} onChange={onChange} required minLength={type === 'password' ? 6 : undefined} className="h-11 w-full min-w-0 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-500 focus:border-transparent focus:ring-2 focus:ring-emerald-600" />
    </label>
  );
}
