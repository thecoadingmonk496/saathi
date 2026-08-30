import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useUser } from '../context/UserContext';
import heroBg from '../assets/hero-bg.jpg';
import saathiLogo from '../assets/logo.png';

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5001' : '')
).replace(/\/$/, '');

const apiUrl = (path) => `${API_BASE_URL}${path}`;

export default function Login() {
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(45);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, user, isLoggedIn } = useUser();

  useEffect(() => {
    if (isLoggedIn) {
      const redirect = searchParams.get('redirect') || '/';
      navigate(redirect);
    }
  }, [isLoggedIn, navigate, searchParams]);

  useEffect(() => {
    let interval;
    if (otpSent && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpSent, timer]);

  const triggerGetOtp = async (numToUse) => {
    const targetNum = numToUse || mobile;
    if (!targetNum || targetNum.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      setSuccessMessage('');
      return;
    }

    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const response = await fetch(apiUrl('/api/auth/send-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber: targetNum }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setOtpSent(true);
        setTimer(45);
        setOtp(['', '', '', '', '', '']);
        setSuccessMessage('OTP sent successfully. Demo OTP: 123456');
      } else {
        setError(data.message || 'Failed to send OTP.');
      }
    } catch (err) {
      setError('Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMobileChange = (e) => {
    const rawVal = e.target.value;
    const digitsOnly = rawVal.replace(/\D/g, '').slice(0, 10);
    setMobile(digitsOnly);
    setError('');
    setSuccessMessage('');

    if (digitsOnly.length === 10 && !otpSent && !loading) {
      triggerGetOtp(digitsOnly);
    }
  };

  const triggerLogin = async (otpToUse) => {
    const enteredOtp = otpToUse || otp.join('');
    if (enteredOtp.length !== 6) {
      setError('Please enter the complete 6-digit OTP.');
      setSuccessMessage('');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch(apiUrl('/api/auth/verify-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber: mobile, otp: enteredOtp }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem('token', data.token);
        login(data.user);
        const redirect = searchParams.get('redirect') || '/';
        navigate(redirect);
      } else {
        setError(data.message || 'Invalid OTP. Please try again.');
      }
    } catch (err) {
      setError('Unable to verify OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForm = (e) => {
    e.preventDefault();
    if (!otpSent) {
      triggerGetOtp(mobile);
    } else {
      triggerLogin(otp.join(''));
    }
  };

  const handleOtpChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    if (digit && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      if (nextInput) nextInput.focus();
    }

    const fullOtp = newOtp.join('');
    if (fullOtp.length === 6 && !loading) {
      triggerLogin(fullOtp);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        const prevInput = document.getElementById(`otp-input-${index - 1}`);
        if (prevInput) prevInput.focus();
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const newOtp = [...otp];
    for (let i = 0; i < pastedData.length; i++) {
      if (i < 6) newOtp[i] = pastedData[i];
    }
    setOtp(newOtp);

    const nextIndex = Math.min(pastedData.length, 5);
    const nextInput = document.getElementById(`otp-input-${nextIndex === 6 ? 5 : nextIndex}`);
    if (nextInput) nextInput.focus();

    const fullOtp = newOtp.join('');
    if (fullOtp.length === 6 && !loading) {
      triggerLogin(fullOtp);
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
            <span className="hidden sm:block text-[10px] font-bold text-[#52b788] leading-tight">
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
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-[440px] bg-white rounded-lg shadow-2xl border border-[var(--saathi-border-light)] p-6 sm:p-8 transition-all">

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
              <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--saathi-text)]">Welcome back</h2>
              <p className="text-sm font-medium text-[var(--saathi-text-secondary)] mt-1">
                Sign in with OTP to access your account
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmitForm} className="space-y-4">
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
                  type="tel"
                  placeholder="Enter 10-digit number"
                  className="flex-1 h-12 bg-white border border-[var(--saathi-border)] focus:border-[var(--saathi-accent)] focus:ring-2 focus:ring-red-100 text-[var(--saathi-text)] font-semibold px-4 rounded-lg outline-none transition text-base placeholder:text-slate-400 placeholder:font-normal"
                  value={mobile}
                  onChange={handleMobileChange}
                  maxLength="10"
                  disabled={otpSent}
                  autoFocus
                />
              </div>

              {error && (
                <p className="text-red-700 text-sm mt-1.5 font-bold flex items-center gap-1">
                  <span>⚠️</span> {error}
                </p>
              )}

              {otpSent && (
                <div className="mt-3 p-3 rounded-lg bg-[var(--saathi-surface-alt)] border border-[var(--saathi-border-light)] text-sm text-[var(--saathi-text)] font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <span className="text-base font-bold text-[var(--saathi-primary)]">✓</span> Demo OTP:
                  </span>
                  <span className="font-extrabold text-[var(--saathi-text)] bg-white px-2.5 py-0.5 rounded border border-[var(--saathi-border)] tracking-wider">
                    123456
                  </span>
                </div>
              )}
            </div>

            {otpSent && (
              <div className="space-y-2.5 pt-1">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold text-[var(--saathi-text)]">
                    Enter 6-Digit OTP <span className="text-red-600 font-bold ml-0.5">*</span>
                  </label>
                  {timer > 0 ? (
                    <span className="text-sm font-bold text-red-600">
                      Resend in {timer}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => triggerGetOtp(mobile)}
                      disabled={loading}
                      className="text-sm font-bold text-red-600 hover:underline cursor-pointer"
                    >
                      Resend OTP
                    </button>
                  )}
                </div>

                <div className="flex justify-between gap-1.5 sm:gap-2">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      id={`otp-input-${index}`}
                      type="text"
                      maxLength="1"
                      className="w-12 h-12 text-center text-2xl font-extrabold bg-white border border-[var(--saathi-border)] rounded-lg outline-none focus:border-[var(--saathi-accent)] focus:ring-2 focus:ring-red-100 text-[var(--saathi-text)] transition"
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      onPaste={handlePaste}
                      disabled={loading}
                    />
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || mobile.length !== 10}
              className="w-full h-12 sm:h-13 mt-3 bg-[var(--saathi-accent)] hover:bg-[var(--saathi-accent-dark)] text-white rounded-lg font-extrabold text-base sm:text-lg active:scale-[0.99] transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <span className="inline-block animate-spin border-2 border-white border-t-transparent rounded-full w-5 h-5" />
              ) : (
                <>
                  <span>{otpSent ? 'Verify OTP & Login' : 'Get OTP'}</span>
                  <span className="text-xl">→</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="text-sm font-medium text-[var(--saathi-text-secondary)] hover:text-[var(--saathi-text)] transition cursor-pointer"
            >
              New User? <span className="font-extrabold text-red-600 hover:underline ml-0.5">Register Profile</span>
            </button>
          </div>
        </div>
      </main>

      <div className="h-6" />
    </div>
  );
}
