/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { authSuccess, addNotification } from '../store';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, User, Sparkles, KeyRound, Eye, Loader2, Landmark, Globe } from 'lucide-react';
import axios from 'axios';

export default function AuthPages() {
  const navigate = useNavigate();
  const dispatch = useDispatch() as any;

  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);

  // Sign In inputs
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signInError, setSignInError] = useState('');

  // Sign Up inputs
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpCountry, setSignUpCountry] = useState('India');
  const [signUpError, setSignUpError] = useState('');

  // Seller registration inputs
  const [registerAsSeller, setRegisterAsSeller] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [storeDescription, setStoreDescription] = useState('');
  const [gstin, setGstin] = useState('');

  // OTP Verification Modal
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpMessage, setOtpMessage] = useState('');
  const [isLoginFlow, setIsLoginFlow] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('oddulasaisrishanthreddy@gmail.com');

  // Forgot password states
  const [showForgotForm, setShowForgotForm] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotStep, setForgotStep] = useState<'request' | 'reset'>('request');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotError, setForgotError] = useState('');

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInError('');

    if (!signInEmail || !signInPassword) return;

    setLoading(true);
    try {
      const res = await axios.post('/api/auth/login', {
        email: signInEmail,
        password: signInPassword
      });

      if (res.data.requiresOtp) {
        setOtpError('');
        setOtpMessage(res.data.message || '');
        setSignUpEmail(signInEmail); // store email for verification reference
        setIsLoginFlow(true);
        setShowOtpModal(true);
        return;
      }

      dispatch(authSuccess(res.data));
      dispatch(addNotification({
        title: 'Authentication Success',
        message: res.data.user?.role === 'ADMIN'
          ? `Welcome Admin, ${res.data.user?.name || 'Admin'}!`
          : `Welcome back premium customer, ${res.data.user?.name || 'customer'}!`,
        type: 'AUTH'
      }));

      const role = res.data.user?.role;
      if (role === 'ADMIN') {
        navigate('/admin');
      } else if (role === 'SELLER') {
        navigate('/seller');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setSignInError(err.response?.data?.error || 'Invalid credentials. Password or email mismatch.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpError('');

    if (!signUpName || !signUpEmail || !signUpPassword) return;

    if (registerAsSeller) {
      if (!storeName.trim() || !storeDescription.trim() || !gstin.trim()) {
        setSignUpError('Please fill out all Seller profile details (Store Name, Description, GSTIN).');
        return;
      }
      if (gstin.trim().length !== 15) {
        setSignUpError('GSTIN number must be exactly 15 characters long according to Indian standard regulations.');
        return;
      }
    }

    setLoading(true);
    try {
      const res = await axios.post('/api/auth/register', {
        name: signUpName,
        email: signUpEmail,
        password: signUpPassword,
        role: registerAsSeller ? 'SELLER' : 'USER',
        storeName: registerAsSeller ? storeName : undefined,
        storeDescription: registerAsSeller ? storeDescription : undefined,
        gstin: registerAsSeller ? gstin : undefined,
        country: signUpCountry
      });
      setOtpError('');
      setOtpMessage(res.data.message || '');
      setIsLoginFlow(false);
      setShowOtpModal(true);
    } catch (err: any) {
      setSignUpError(err.response?.data?.error || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtpAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');

    if (!otpCode || otpCode.length !== 6) {
      setOtpError('Please enter a valid 6-digit OTP code.');
      return;
    }

    setLoading(true);
    try {
      if (isLoginFlow) {
        const res = await axios.post('/api/auth/verify-login-otp', {
          email: signUpEmail,
          otp: otpCode
        });

        dispatch(authSuccess(res.data));
        dispatch(addNotification({
          title: 'Sign In Verification Succeeded',
          message: `Welcome back, ${res.data.user.name || 'customer'}!`,
          type: 'AUTH'
        }));

        setShowOtpModal(false);
        if (res.data.user?.role === 'ADMIN') {
          navigate('/admin');
        } else if (res.data.user?.role === 'SELLER') {
          navigate('/seller');
        } else {
          navigate('/');
        }
      } else {
        const res = await axios.post('/api/auth/verify-otp', {
          email: signUpEmail,
          otp: otpCode
        });

        dispatch(authSuccess(res.data));
        dispatch(addNotification({
          title: 'Registration & Verification Succeeded',
          message: registerAsSeller 
            ? `Welcome onboarding Seller ${res.data.user.name}! Your store is Approved for sandbox listing.`
            : `Welcome premium customer, ${res.data.user.name}!`,
          type: 'AUTH'
        }));

        setShowOtpModal(false);
        if (res.data.user?.role === 'ADMIN') {
          navigate('/admin');
        } else if (registerAsSeller) {
          navigate('/seller');
        } else {
          navigate('/');
        }
      }
    } catch (err: any) {
      setOtpError(err.response?.data?.error || 'Verification failed. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSimulate = async () => {
    if (!googleEmail || !googleEmail.includes('@')) {
      alert('Please enter a valid Google email address.');
      return;
    }
    setLoading(true);
    try {
      const localPart = googleEmail.split('@')[0];
      const simulatedName = localPart
        .split(/[._+-]+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ') || 'Google User';

      const res = await axios.post('/api/auth/google', {
        name: simulatedName,
        email: googleEmail
      });

      dispatch(authSuccess(res.data));
      dispatch(addNotification({
        title: 'Google OAuth Verification Passed',
        message: `Directly logged in via Google as ${googleEmail}. Local pricing has been updated for your region!`,
        type: 'AUTH'
      }));

      if (res.data.user?.role === 'ADMIN') {
        navigate('/admin');
      } else if (res.data.user?.role === 'SELLER') {
        navigate('/seller');
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotSuccess('');
    setForgotError('');

    if (forgotStep === 'request') {
      if (!forgotEmail.trim()) return;
      setLoading(true);
      try {
        const res = await axios.post('/api/auth/forgot-password', {
          email: forgotEmail
        });
        setForgotSuccess(res.data.message || 'OTP reset code sent to your email.');
        setForgotStep('reset');
      } catch (err: any) {
        setForgotError(err.response?.data?.error || 'Failed to dispatch reset code.');
      } finally {
        setLoading(false);
      }
    } else {
      if (!forgotOtp.trim() || !forgotNewPassword.trim()) return;
      if (forgotOtp.length !== 6) {
        setForgotError('Please enter a valid 6-digit OTP.');
        return;
      }
      setLoading(true);
      try {
        const res = await axios.post('/api/auth/reset-password', {
          email: forgotEmail,
          otp: forgotOtp,
          newPassword: forgotNewPassword
        });
        setForgotSuccess(res.data.message || 'Your password was successfully reset.');
        setForgotEmail('');
        setForgotOtp('');
        setForgotNewPassword('');
        setForgotStep('request');
        setTimeout(() => {
          setShowForgotForm(false);
          setForgotSuccess('');
        }, 3000);
      } catch (err: any) {
        setForgotError(err.response?.data?.error || 'Invalid or expired OTP.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 font-sans">
      
      {/* Visual Header logo */}
      <div className="text-center mb-8">
        <span className="text-xl font-bold tracking-widest text-slate-900">
          APEX <span className="text-indigo-600 font-light font-mono">SECURE</span>
        </span>
        <p className="text-xs text-gray-400 mt-2">Settle accounts on secure 128-bit authentication portals.</p>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
        
        {/* Forgot password override wrapper */}
        {showForgotForm ? (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-indigo-600" />
              <span>Forgot Code Password</span>
            </h3>
            
            {forgotStep === 'request' ? (
              <p className="text-xs text-gray-500 leading-relaxed">
                Enter your registered email account below. We will dispatch a secure 2-second 6-digit verification code directly to your email address to reset your password.
              </p>
            ) : (
              <p className="text-xs text-emerald-600 bg-emerald-50 p-2.5 rounded-xl leading-relaxed border border-emerald-100">
                OTP verification code sent successfully to: <strong className="font-mono">{forgotEmail}</strong>. Please verify below.
              </p>
            )}

            <form onSubmit={handleForgotSubmit} className="space-y-4">
              {forgotStep === 'request' ? (
                <div className="relative">
                  <input
                    type="email" required placeholder="name@domain.com" value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-100 bg-gray-50 text-xs rounded-xl focus:bg-white focus:outline-none"
                  />
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative">
                    <input
                      type="text" required placeholder="6-digit Verification OTP" value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength={6}
                      className="w-full pl-10 pr-4 py-2 border border-gray-100 bg-gray-50 text-xs font-mono font-medium tracking-wide rounded-xl focus:bg-white focus:outline-none"
                    />
                    <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  </div>
                  <div className="relative">
                    <input
                      type="password" required placeholder="Set New Password" value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-100 bg-gray-50 text-xs rounded-xl focus:bg-white focus:outline-none"
                    />
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  </div>
                </div>
              )}

              {forgotSuccess && <p className="text-xs text-green-600 font-bold bg-green-50 p-2 rounded-lg">{forgotSuccess}</p>}
              {forgotError && <p className="text-xs text-red-600 font-bold bg-red-50 p-2 rounded-lg">{forgotError}</p>}

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button" onClick={() => { setShowForgotForm(false); setForgotSuccess(''); setForgotError(''); setForgotStep('request'); }}
                  className="text-xs font-semibold text-indigo-600 hover:underline"
                >
                  Return to login portals
                </button>
                <button
                  type="submit" disabled={loading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{forgotStep === 'request' ? 'Send Reset OTP' : 'Reset Password'}</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          <>
            {/* Tabs panels switches */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-100/60 rounded-2xl">
              <button
                onClick={() => { setActiveTab('signin'); setSignInError(''); }}
                className={`py-2 text-xs font-bold rounded-xl transition-all ${activeTab === 'signin' ? 'bg-white text-gray-900 shadow shadow-sm' : 'text-gray-400 hover:text-gray-650'}`}
              >
                Sign In credentials
              </button>
              <button
                onClick={() => { setActiveTab('signup'); setSignUpError(''); }}
                className={`py-2 text-xs font-bold rounded-xl transition-all ${activeTab === 'signup' ? 'bg-white text-gray-900 shadow shadow-sm' : 'text-gray-400 hover:text-gray-650'}`}
              >
                Create Account
              </button>
            </div>

            {/* TAB 1: SIGN IN FORM */}
            {activeTab === 'signin' && (
              <form onSubmit={handleSignInSubmit} className="space-y-4">
                <div className="space-y-3">
                  <div className="relative">
                    <input
                      type="email" required placeholder="User Email address" value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-100 bg-gray-50 text-xs rounded-xl focus:bg-white focus:outline-none"
                    />
                    <Mail className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
                  </div>

                  <div className="relative">
                    <input
                      type="password" required placeholder="Safety Password" value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-100 bg-gray-50 text-xs rounded-xl focus:bg-white focus:outline-none font-mono"
                    />
                    <Lock className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
                  </div>
                </div>

                <div className="flex justify-end items-center text-[10px] sm:text-xs">
                  <button
                    type="button" onClick={() => setShowForgotForm(true)}
                    className="text-indigo-600 font-bold hover:underline"
                  >
                    Forgot specs?
                  </button>
                </div>

                {signInError && <p className="text-[11px] font-semibold text-rose-500">{signInError}</p>}

                <button
                  type="submit" disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-505 hover:bg-indigo-500 text-white font-bold h-11 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-indigo-100 hover:shadow-indigo-500/20"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Access Store Account</span>}
                </button>
              </form>
            )}

            {/* TAB 2: SIGN UP CREDENTIALS FORM */}
            {activeTab === 'signup' && (
              <form onSubmit={handleSignUpSubmit} className="space-y-4">
                <div className="space-y-3">
                  <div className="relative">
                    <input
                      type="text" required placeholder="Your full name" value={signUpName}
                      onChange={(e) => setSignUpName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-100 bg-gray-50 text-xs rounded-xl focus:bg-white focus:outline-none"
                    />
                    <User className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
                  </div>

                  <div className="relative">
                    <input
                      type="email" required placeholder="Choose Email address" value={signUpEmail}
                      onChange={(e) => setSignUpEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-100 bg-gray-50 text-xs rounded-xl focus:bg-white focus:outline-none"
                    />
                    <Mail className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
                  </div>

                  <div className="relative font-sans">
                    <input
                      type="password" required placeholder="Choose Password" value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-100 bg-gray-50 text-xs rounded-xl focus:bg-white focus:outline-none font-mono"
                    />
                    <Lock className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
                  </div>

                  <div className="relative font-sans">
                    <select
                      value={signUpCountry}
                      onChange={(e) => setSignUpCountry(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 border border-gray-100 bg-gray-50 text-xs rounded-xl focus:bg-white focus:outline-none appearance-none cursor-pointer"
                    >
                      <option value="India">🇮🇳 India (INR - ₹)</option>
                      <option value="United States">🇺🇸 United States (USD - $)</option>
                      <option value="Germany">🇩🇪 Germany (EUR - €)</option>
                      <option value="United Kingdom">🇬🇧 United Kingdom (GBP - £)</option>
                      <option value="United Arab Emirates">🇦🇪 United Arab Emirates (AED - د.إ)</option>
                      <option value="Japan">🇯🇵 Japan (JPY - ¥)</option>
                      <option value="Australia">🇦🇺 Australia (AUD - A$)</option>
                      <option value="Canada">🇨🇦 Canada (CAD - C$)</option>
                    </select>
                    <Globe className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-gray-400">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                  </div>

                  {/* Multi-Vendor Seller Account trigger toggle */}
                  <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/30 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-indigo-950">Register as a Seller</h4>
                      <p className="text-[10px] text-indigo-500 leading-normal mt-0.5">Publish your products and receive client payments directly.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" checked={registerAsSeller} 
                        onChange={(e) => setRegisterAsSeller(e.target.checked)} 
                        className="sr-only peer" 
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  {/* Seller details if checked */}
                  {registerAsSeller && (
                    <div className="space-y-3 pt-1 border-t border-gray-100 mt-2 animate-in fade-in duration-200">
                      <div className="relative">
                        <input
                          type="text" required={registerAsSeller} placeholder="Store Name (e.g. Acme Mobiles)" value={storeName}
                          onChange={(e) => setStoreName(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-150 bg-white text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <Landmark className="absolute left-3.5 top-3 h-4 w-4 text-indigo-500" />
                      </div>

                      <div className="relative">
                        <textarea
                          required={registerAsSeller} placeholder="Provide brief storefront description..." value={storeDescription}
                          onChange={(e) => setStoreDescription(e.target.value)}
                          rows={2}
                          className="w-full p-3 border border-gray-150 bg-white text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="relative">
                        <input
                          type="text" required={registerAsSeller} placeholder="GSTIN Number (15 Characters Alphanumeric)" value={gstin}
                          onChange={(e) => setGstin(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15))}
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-150 bg-white text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                        />
                        <span className="absolute left-3.5 top-3 text-[10px] font-mono text-indigo-500 font-bold">GST</span>
                      </div>
                    </div>
                  )}
                </div>

                {signUpError && <p className="text-[11px] font-semibold text-rose-500">{signUpError}</p>}

                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold h-11 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow"
                >
                  Create Secure {registerAsSeller ? 'Seller' : 'Customer'} Account
                </button>
              </form>
            )}

            {/* Google OAuth Login button */}
            <div className="border-t border-gray-100 pt-6 mt-4">
              <button
                type="button"
                onClick={handleGoogleSimulate}
                className="w-full h-10 border border-gray-150 border-gray-100 hover:bg-gray-50 hover:text-indigo-600 bg-white font-semibold text-xs text-gray-700 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm select-none"
              >
                {/* Google SVG styled logo representation */}
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span>Sign in with Google</span>
              </button>
            </div>
          </>
        )}

      </div>

      {/* OTP SECURE VERIFICATION MODAL OVERFLOW */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 blur-md"></div>
          
          <div className="bg-white p-6 rounded-3xl max-w-sm w-full shadow-2xl border border-gray-100 z-10 animate-in zoom-in duration-200">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b border-gray-50 pb-3">
              <ShieldCheck className="w-5 h-5 text-indigo-600 animate-pulse" />
              <span>Verify Your Account</span>
            </h3>

            <p className="text-xs text-neutral-500 mt-2.5 leading-relaxed">
              {otpMessage || `We have sent a secure authentication OTP code to your registered email address: ${signUpEmail}. Please enter the OTP code to verify and activate your account.`}
            </p>

            <form onSubmit={verifyOtpAndRegister} className="mt-4 space-y-4">
              <div>
                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block text-center">6-Digit OTP Code</label>
                <input
                  type="text" required placeholder="******" value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-40 mx-auto text-center font-mono text-lg font-black tracking-widest px-3 py-2 border border-gray-100 bg-gray-50 rounded-xl focus:bg-white focus:outline-none mt-1.5 block"
                />
              </div>

              {otpError && <p className="text-[11px] font-semibold text-rose-500 text-center">{otpError}</p>}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button" onClick={() => setShowOtpModal(false)}
                  className="text-xs px-3.5 py-2 text-gray-500 hover:bg-gray-50 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={loading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Verify OTP</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
