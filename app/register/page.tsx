'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, Mail, User, Building, Phone, ArrowRight, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { useBusiness } from '@/components/BusinessProvider';

export default function RegisterPage() {
  const router = useRouter();
  const { refreshBusiness } = useBusiness();
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password validation checks for real-time visual feedback
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError('Please enter your full name.');
    if (!businessName.trim()) return setError('Please enter your business or shop name.');
    if (!email.trim()) return setError('Please enter your email address.');
    if (!password) return setError('Please enter a password.');
    if (password !== confirmPassword) return setError('Passwords do not match.');
    if (!agreeToTerms) return setError('You must agree to the Terms of Service and Privacy Policy.');

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          businessName: businessName.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          password,
          confirmPassword,
          agreeToTerms,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Registration failed. Please check your information.');
        setLoading(false);
        return;
      }

      if (data.business?.id) {
        localStorage.setItem('bizflow_active_business_id', data.business.id);
      }

      // Navigate to main workspace dashboard
      window.location.href = '/';
    } catch (err: any) {
      setError('Network connection error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0e0720] via-[#1a0b2e] to-[#0a0518] text-white flex flex-col justify-center py-10 sm:px-6 lg:px-8 selection:bg-purple-500 selection:text-white">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <Link href="/" className="flex items-center justify-center gap-3 group mb-2">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-fuchsia-500 p-[2px] shadow-lg shadow-purple-500/25 transition-transform group-hover:scale-105">
            <div className="w-full h-full rounded-2xl bg-[#0a0518] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
            </div>
          </div>
          <span className="text-2xl font-bold tracking-tight text-white font-heading">
            BizFlow AI
          </span>
        </Link>
        <h2 className="text-center text-xl font-semibold text-purple-200">
          Create your Business Account
        </h2>
        <p className="mt-1 text-center text-xs text-purple-300/70">
          Get started with AI-powered conversational ERP for ₹299/mo
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">
          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-purple-200 mb-1">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-purple-400/60">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Karthik Ramanathan"
                  required
                  className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-purple-300/30 text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-purple-200 mb-1">
                Business / Enterprise Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-purple-400/60">
                  <Building className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Karthik Textiles & Garments"
                  required
                  className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-purple-300/30 text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-purple-200 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-purple-400/60">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="karthik@textiles.bizflow.in"
                    required
                    className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-purple-300/30 text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-purple-200 mb-1">
                  Phone (Optional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-purple-400/60">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98400 11223"
                    className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-purple-300/30 text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-purple-200 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-purple-400/60">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 chars, uppercase, lowercase & symbol"
                  required
                  autoComplete="new-password"
                  className="w-full pl-9 pr-10 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-purple-300/30 text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-purple-400/60 hover:text-purple-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength checklist */}
              {password.length > 0 && (
                <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] text-purple-300/60">
                  <span className={hasMinLength ? 'text-emerald-400 flex items-center gap-1' : 'flex items-center gap-1'}>
                    <CheckCircle2 className="w-3 h-3" /> 8+ Characters
                  </span>
                  <span className={hasUpper && hasLower ? 'text-emerald-400 flex items-center gap-1' : 'flex items-center gap-1'}>
                    <CheckCircle2 className="w-3 h-3" /> Upper & Lowercase
                  </span>
                  <span className={hasNumber ? 'text-emerald-400 flex items-center gap-1' : 'flex items-center gap-1'}>
                    <CheckCircle2 className="w-3 h-3" /> Number (0-9)
                  </span>
                  <span className={hasSpecial ? 'text-emerald-400 flex items-center gap-1' : 'flex items-center gap-1'}>
                    <CheckCircle2 className="w-3 h-3" /> Special Char
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-purple-200 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-purple-400/60">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  required
                  autoComplete="new-password"
                  className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-purple-300/30 text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                />
              </div>
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-[11px] text-red-400 mt-1">Passwords do not match</p>
              )}
            </div>

            <div className="flex items-start gap-2 pt-1">
              <input
                id="terms"
                type="checkbox"
                checked={agreeToTerms}
                onChange={(e) => setAgreeToTerms(e.target.checked)}
                className="mt-0.5 rounded border-white/20 bg-white/10 text-purple-600 focus:ring-purple-500"
              />
              <label htmlFor="terms" className="text-xs text-purple-300/80 leading-snug">
                I agree to the{' '}
                <span className="text-purple-300 underline">Terms of Service</span> and{' '}
                <span className="text-purple-300 underline">Privacy Policy</span>.
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || !agreeToTerms}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Create Business Workspace</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-5 pt-4 border-t border-white/10 text-center text-xs text-purple-300/70">
            <span>Already registered? </span>
            <Link href="/login" className="font-semibold text-purple-400 hover:text-purple-300 underline underline-offset-2">
              Sign in to your workspace
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
