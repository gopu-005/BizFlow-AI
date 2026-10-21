'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, Mail, ArrowRight, AlertCircle, Sparkles, CheckCircle2, UserCheck, KeyRound } from 'lucide-react';

/** Only allow same-origin relative return paths (prevents open-redirects). */
const getSafeNextPath = (): string | null => {
  if (typeof window === 'undefined') return null;
  const next = new URLSearchParams(window.location.search).get('next');
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return null;
  return next;
};

const DEMO_ACCOUNTS = [
  {
    label: 'Karthik Ramanathan',
    role: 'Owner · Karthik Textiles',
    email: 'karthik@textiles.bizflow.in',
    password: 'Karthik@123',
    tone: 'border-purple-500/40 hover:bg-purple-500/10 text-purple-200',
  },
  {
    label: 'Murugesan V.',
    role: 'Owner · Murugan Bakery',
    email: 'murugan@bakery.bizflow.in',
    password: 'Murugan@123',
    tone: 'border-amber-500/40 hover:bg-amber-500/10 text-amber-200',
  },
  {
    label: 'Senthil Kumar',
    role: 'Staff · Billing',
    email: 'staff@textiles.bizflow.in',
    password: 'Staff@123',
    tone: 'border-blue-500/40 hover:bg-blue-500/10 text-blue-200',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Login failed. Please check your credentials.');
        setLoading(false);
        return;
      }

      // Successful login - persist active business ID
      if (data.user?.businessId && typeof window !== 'undefined') {
        localStorage.setItem('bizflow_active_business_id', data.user.businessId);
      }

      // Perform a full browser navigation to target page so session cookie and providers load cleanly
      const isAdmin = data.user?.role === 'platform_admin';
      const nextPath = getSafeNextPath();
      const target = isAdmin ? '/admin' : nextPath || data.redirectTo || '/';

      window.location.href = target;
    } catch (err: any) {
      setError('Network connection error. Please check your internet connection.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0e0720] via-[#1a0b2e] to-[#0a0518] text-white flex flex-col justify-center py-10 sm:px-6 lg:px-8 selection:bg-purple-500 selection:text-white">
      {/* Background Glow */}
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
          Sign in to your Business Workspace
        </h2>
        <p className="mt-1 text-center text-xs text-purple-300/70">
          Smart Entry, Udhaar Collections, &amp; Autonomous Profit Closing
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* 1-Click Demo Accounts Selector */}
          <div className="mb-5 p-3.5 rounded-2xl bg-white/[0.04] border border-purple-500/20">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-300 mb-2">
              <KeyRound className="w-3.5 h-3.5 text-purple-400" />
              <span>Quick Demo Accounts (Click to Fill)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => fillDemo(acc.email, acc.password)}
                  className={`text-left p-2 rounded-xl border bg-black/20 transition-all text-xs cursor-pointer group ${acc.tone}`}
                  title={`Click to fill ${acc.email}`}
                >
                  <div className="font-bold text-[11px] truncate group-hover:underline">
                    {acc.label.split(' ')[0]}
                  </div>
                  <div className="text-[10px] text-white/50 truncate">{acc.role}</div>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-purple-200 mb-1.5">
                Business Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-purple-400/60">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="karthik@textiles.bizflow.in"
                  required
                  autoComplete="email"
                  className="w-full pl-9 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-purple-300/30 text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-purple-200">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-purple-400/60">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full pl-9 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-purple-300/30 text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-purple-400/60 hover:text-purple-300 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                id="login-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Sign In to Workspace</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-white/10 text-center text-xs text-purple-300/70">
            <span>Don&apos;t have a BizFlow account yet? </span>
            <Link href="/register" className="font-semibold text-purple-400 hover:text-purple-300 underline underline-offset-2">
              Create an account
            </Link>
          </div>
        </div>

        {/* Dedicated Admin Portal Link */}
        <div className="mt-6 text-center">
          <Link
            href="/admin/login"
            className="text-xs text-purple-400/80 hover:text-purple-200 transition-colors inline-flex items-center gap-1.5"
          >
            <span>Platform SaaS Administrator?</span>
            <span className="font-medium underline underline-offset-2">Admin Portal Login →</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
