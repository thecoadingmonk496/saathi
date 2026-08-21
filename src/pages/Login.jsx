import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import heroBg from '../assets/hero-bg.jpg';

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
  const { login } = useUser();

  useEffect(() => {
    if (localStorage.getItem('token') || localStorage.getItem('user')) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

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
        navigate('/');
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
    <div className="relative min-h-screen flex flex-col justify-between overflow-x-hidden font-sans selection:bg-green-100 selection:text-green-900">
      {}
      <img
        src={heroBg}
        alt="Indian agricultural field with farmer"
        className="fixed inset-0 w-full h-full object-cover object-center z-0"
      />

      {}
      <div className="fixed inset-0 bg-slate-900/65 bg-gradient-to-b from-[#042F24]/80 via-slate-900/60 to-[#042F24]/85 z-0 backdrop-blur-[1px]" />

      {}
      <header className="relative z-10 p-4 sm:p-6 flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2.5 bg-black/40 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15 text-white shadow-lg">
          <img src="/logo.png" alt="SAATHI Logo" className="w-6 h-6 rounded-full border border-white/40 p-0.5 object-cover" />
          <span className="text-xs font-extrabold tracking-widest uppercase text-green-300">SAATHI</span>
          <span className="text-slate-400 text-xs font-normal">|</span>
          <span className="text-xs font-medium text-slate-200">Kisan Portal</span>
        </div>
      </header>

      {}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-[440px] bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 sm:p-8 transition-all">

          {}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center mb-3">
              <img
                src="/logo.png"
                alt="SAATHI Logo"
                className="w-16 h-16 rounded-full border-2 border-green-100 p-1 shadow-md object-contain"
              />
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              SAATHI
            </h1>

            <div className="mt-1.5 inline-block px-3 py-1 rounded-full bg-green-50 border border-green-100 text-xs font-extrabold text-[#2E7D32]">
              "Aapki Aawaz, Aapka Bazaar"
            </div>

            <div className="mt-5 border-t border-slate-100 pt-4">
              <h2 className="text-lg font-bold text-slate-800">Welcome back</h2>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                Connect with your farming marketplace
              </p>
            </div>
          </div>

          {}
          <form onSubmit={handleSubmitForm} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Mobile Number
              </label>

              <div className="flex gap-2">
                <div className="relative">
                  <div className="h-12 bg-slate-50 border border-slate-200 text-slate-800 font-bold px-3.5 rounded-xl flex items-center gap-1 text-sm">
                    <span>🇮🇳</span>
                    <span>+91</span>
                  </div>
                </div>

                <input
                  type="tel"
                  placeholder="Enter 10-digit number"
                  className={`flex-1 h-12 bg-slate-50 border ${error ? 'border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-[#2E7D32] focus:ring-green-100'} text-slate-900 font-semibold px-4 rounded-xl outline-none focus:ring-4 transition disabled:opacity-60 text-base placeholder:text-slate-400`}
                  value={mobile}
                  onChange={handleMobileChange}
                  maxLength="10"
                  disabled={otpSent}
                  autoFocus
                />
              </div>

              {error && <p className="text-red-600 text-xs mt-1.5 font-bold flex items-center gap-1"><span>⚠️</span> {error}</p>}

              {}
              {otpSent && (
                <div className="mt-3 p-3 rounded-xl bg-green-50 border border-green-200 text-xs text-[#2E7D32] font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <span className="text-base">✓</span> Your OTP is:
                  </span>
                  <span className="font-extrabold text-slate-900 bg-white px-2 py-0.5 rounded border border-green-200 tracking-wider">
                    123456
                  </span>
                </div>
              )}
            </div>

            {}
            {otpSent && (
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Enter 6-Digit OTP
                  </label>
                  {timer > 0 ? (
                    <span className="text-xs font-bold text-amber-600">
                      Resend in {timer}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => triggerGetOtp(mobile)}
                      disabled={loading}
                      className="text-xs font-bold text-[#2E7D32] hover:underline"
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
                      className="w-11 h-12 text-center text-xl font-extrabold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#2E7D32] focus:ring-4 focus:ring-green-100 text-slate-900 transition"
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

            {}
            <button
              type="submit"
              disabled={loading || mobile.length !== 10}
              className="w-full h-12 mt-2 bg-[#2E7D32] text-white rounded-xl font-extrabold text-base hover:bg-[#256428] active:scale-[0.99] transition shadow-md shadow-green-900/10 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#2E7D32]"
            >
              {loading ? (
                <span className="inline-block animate-spin border-2 border-white border-t-transparent rounded-full w-5 h-5" />
              ) : (
                <>
                  {otpSent ? 'Verify OTP & Login' : 'Get OTP'}
                  <span className="text-lg">→</span>
                </>
              )}
            </button>
          </form>

          {}
          <div className="mt-6 border-t border-slate-100 pt-4 text-center">
            <p className="text-xs font-medium text-slate-400">
              Simple access to markets, buyers and farming information.
            </p>
          </div>

          {}
          <div className="mt-3 text-center">
            <button
              onClick={() => navigate('/register')}
              className="text-xs font-bold text-slate-700 hover:text-[#2E7D32] transition hover:underline"
            >
              New User? <span className="text-[#2E7D32]">Register Profile</span>
            </button>
          </div>
        </div>
      </main>

      {}
      <footer className="relative z-10 py-4 px-4 text-center">
        <p className="text-xs font-medium text-slate-300 drop-shadow">
          Connecting farmers with buyers, prices and trusted market information.
        </p>
      </footer>
    </div>
  );
}
