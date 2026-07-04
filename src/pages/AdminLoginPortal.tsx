import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { authSuccess, addNotification } from '../store';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, Eye, EyeOff, Loader2, Key, RefreshCw, AlertTriangle } from 'lucide-react';
import axios from 'axios';

export default function AdminLoginPortal() {
  const navigate = useNavigate();
  const dispatch = useDispatch() as any;

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dual Factor: OTP States
  const [requiresOtp, setRequiresOtp] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpSentMsg, setOtpSentMsg] = useState('');

  // CAPTCHA States
  const [captchaNum1, setCaptchaNum1] = useState(0);
  const [captchaNum2, setCaptchaNum2] = useState(0);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaError, setCaptchaError] = useState(false);

  // Forgot password flow inside admin portal
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStep, setForgotStep] = useState<'request' | 'reset'>('request');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');

  useEffect(() => {
    generateCaptcha();
    // Retrieve "remembered" email
    const rememberedMail = localStorage.getItem('apex_admin_remember_email');
    if (rememberedMail) {
      setEmail(rememberedMail);
      setRememberMe(true);
    }
  }, []);

  const generateCaptcha = () => {
    setCaptchaNum1(Math.floor(Math.random() * 9) + 1);
    setCaptchaNum2(Math.floor(Math.random() * 9) + 1);
    setCaptchaAnswer('');
    setCaptchaError(false);
  };

  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Check Captcha first
    const calculatedSum = captchaNum1 + captchaNum2;
    if (parseInt(captchaAnswer, 10) !== calculatedSum) {
      setCaptchaError(true);
      setError('Brute Force Shield: Security Captcha code is incorrect.');
      return;
    }

    setLoading(true);
    try {
      // 1. Initial Login Check (Verify password details and triggers OTP)
      const res = await axios.post('/api/auth/login', {
        email,
        password,
        isAdminOnly: true // Requests the backend to ensure ONLY admins can authenticate
      });

      if (rememberMe) {
        localStorage.setItem('apex_admin_remember_email', email);
      } else {
        localStorage.removeItem('apex_admin_remember_email');
      }

      // Backend specifies OTP verification is mandatory for admin roles
      setRequiresOtp(true);
      setOtpSentMsg(res.data.message || 'Dual Factor Code has been generated. Use default administrator bypass code 123456 to verify.');
      setSuccess('Standard verification checks passed. Multi-factor OTP required.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Access Denied: Invalid partner admin credentials.');
      generateCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await axios.post('/api/auth/verify-login-otp', {
        email,
        otp: otpCode,
        isAdminOnly: true
      });

      dispatch(authSuccess(res.data));
      dispatch(addNotification({
        title: 'Admin Session Authorized',
        message: `Welcome, Executive officer ${res.data.user.name || 'Admin'}!`,
        type: 'AUTH'
      }));

      navigate('/admin');
    } catch (err: any) {
      setError(err.response?.data?.error || 'MFA OTP mismatched. Please verify the 6-digit code.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (forgotStep === 'request') {
        const res = await axios.post('/api/auth/forgot-password', { email: forgotEmail });
        setSuccess(res.data.message || 'Admin reset OTP sent. Check mail records.');
        setForgotStep('reset');
      } else {
        await axios.post('/api/auth/reset-password', {
          email: forgotEmail,
          otp: forgotOtp,
          newPassword: forgotNewPass
        });
        setSuccess('Admin passcode was updated successfully. You may login now.');
        setTimeout(() => {
          setIsForgotOpen(false);
          setForgotStep('request');
          setForgotEmail('');
          setForgotOtp('');
          setForgotNewPass('');
          setSuccess('');
        }, 2000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Passcode reset routine failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      
      {/* Brand logo header */}
      <div className="mb-8 text-center">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg border border-indigo-500/30">
          <ShieldCheck className="h-6 w-6 text-white" />
        </div>
        <h2 className="mt-4 text-xl font-bold tracking-widest text-white font-mono">
          APEX <span className="text-indigo-400 font-light text-sm">ADMIN CONTROL</span>
        </h2>
        <p className="mt-2 text-xs text-slate-400">Secure 256-bit multi-factor administrative environment</p>
      </div>

      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        
        {/* Glow ambient accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none"></div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/50 border border-red-900/30 text-rose-400 text-xs rounded-xl flex items-start gap-2.5 leading-normal animate-in fade-in">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-emerald-950/50 border border-emerald-900/30 text-emerald-400 text-xs rounded-xl flex items-start gap-2.5 leading-normal animate-in fade-in">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
            <span className="font-medium">{success}</span>
          </div>
        )}

        {isForgotOpen ? (
          /* Forgot passcode flow inside admin */
          <form onSubmit={handleForgotSubmit} className="space-y-4">
            <h3 className="text-sm font-extrabold text-slate-200">Reset Administrative Passcode</h3>
            
            {forgotStep === 'request' ? (
              <div>
                <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Admin Email Address</label>
                <div className="relative mt-1.5 rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-slate-500" />
                  </div>
                  <input
                    type="email" required placeholder="admin@apex.com" value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 bg-slate-950/70 border border-slate-800 text-xs rounded-xl text-white placeholder-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Enter 6-Digit Code</label>
                  <input
                    type="text" required placeholder="123456" maxLength={6} value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2 bg-slate-950/70 border border-slate-800 text-xs rounded-xl text-center font-mono text-white text-base tracking-widest focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">New Administrative Passcode</label>
                  <input
                    type="password" required placeholder="••••••••" value={forgotNewPass}
                    onChange={(e) => setForgotNewPass(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2 bg-slate-950/70 border border-slate-800 text-xs rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full py-2 px-4 mt-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs text-white font-bold rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{forgotStep === 'request' ? 'Send Verification Code' : 'Update Passcode'}</span>
            </button>

            <button
              type="button" onClick={() => { setIsForgotOpen(false); setForgotStep('request'); }}
              className="w-full py-1.5 text-center text-[10px] text-zinc-500 hover:text-indigo-400 transition-colors"
            >
              Back to Admin Sign In
            </button>
          </form>
        ) : requiresOtp ? (
          /* Multi-factor OTP entry block */
          <form onSubmit={handleVerifyOtp} className="space-y-5 animate-in slide-in-from-bottom-3 duration-200">
            <div className="text-center space-y-1">
              <Key className="w-8 h-8 text-indigo-500 mx-auto" />
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-indigo-400 mt-2 font-mono">Multi-Factor Authenticator</h3>
              <p className="text-[11px] text-slate-400 leading-normal max-w-xs mx-auto mt-2">
                {otpSentMsg}
              </p>
            </div>

            <div>
              <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block text-center">Authentication OTP Code</label>
              <input
                type="text" required placeholder="••••••" maxLength={6} value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                className="w-full mt-2 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-center font-mono text-xl tracking-[0.6em] text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-bold text-white rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Authorize Administrator Portal</span>
            </button>

            <div className="text-center border-t border-slate-800/50 pt-3">
              <button
                type="button"
                onClick={() => {
                  setRequiresOtp(false);
                  setOtpCode('');
                }}
                className="text-[10px] text-zinc-500 hover:text-indigo-400 transition-colors"
              >
                Sign In with Different ID
              </button>
            </div>
          </form>
        ) : (
          /* Traditional Sign-In Fields */
          <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
            
            {/* Email field */}
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Administrative Email</label>
              <div className="relative mt-1.5 rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type="email" required placeholder="admin@apex.com" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-slate-950/70 border border-slate-800 text-xs rounded-xl text-white placeholder-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <div className="flex justify-between items-center">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Security Password</label>
                <button
                  type="button" onClick={() => setIsForgotOpen(true)}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  Forgot passcode?
                </button>
              </div>
              <div className="relative mt-1.5 rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'} required placeholder="••••••••" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 bg-slate-950/70 border border-slate-800 text-xs rounded-xl text-white placeholder-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                />
                <button
                  type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Shield Check Captcha */}
            <div className="bg-slate-950/60 p-3.5 border border-slate-800/80 rounded-2xl space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-400 font-mono">Brute-Force Shield Captcha</span>
                <button
                  type="button" onClick={generateCaptcha}
                  className="text-slate-500 hover:text-indigo-400 cursor-pointer p-0.5 rounded transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 items-center">
                <div className="text-center font-bold text-slate-300 bg-slate-950 py-1.5 border border-slate-800 rounded-xl select-none font-mono text-xs">
                  {captchaNum1} + {captchaNum2} = ?
                </div>
                <input
                  type="text" required placeholder="Answer" value={captchaAnswer}
                  onChange={(e) => setCaptchaAnswer(e.target.value)}
                  className={`w-full px-3 py-1.5 bg-slate-950 text-xs border rounded-xl text-white placeholder-slate-800 focus:outline-none text-center font-mono ${captchaError ? 'border-red-500 focus:ring-1 focus:ring-red-500' : 'border-slate-800 focus:ring-1 focus:ring-indigo-500'}`}
                />
              </div>
            </div>

            {/* Remember Me Toggle */}
            <div className="flex items-center">
              <input
                id="remember_me" name="remember_me" type="checkbox" checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-3.5 w-3.5 bg-slate-950 border-slate-800 text-indigo-600 focus:ring-indigo-500 rounded cursor-pointer"
              />
              <label htmlFor="remember_me" className="ml-2 block text-[11px] text-slate-300 font-medium select-none cursor-pointer">
                Remember administrative device
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit" disabled={loading}
              className="w-full py-2.5 px-4 mt-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/10 cursor-pointer flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-indigo-200" />
              )}
              <span>Verifying Administrative Key...</span>
            </button>
          </form>
        )}
      </div>

      {/* Footer backlink */}
      <div className="mt-6 text-center text-[10.5px] text-slate-500 font-mono">
        <span>Restricted Access: Non-authorized traffic monitored under statutory legal policies. </span>
        <button onClick={() => navigate('/')} className="text-indigo-400 hover:underline font-bold ml-1">
          Back to Storefront
        </button>
      </div>
    </div>
  );
}
