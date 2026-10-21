'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowRight, AlertCircle, CheckCircle2, Sparkles, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const [emailConfigured, setEmailConfigured] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Please enter your account email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Request failed. Please try again.');
        setLoading(false);
        return;
      }

      setSubmitted(true);
      setEmailConfigured(Boolean(data.emailConfigured));
      if (data.devToken) {
        setDevResetUrl(`/reset-password?token=${data.devToken}`);
      }
      setLoading(false);
    } catch (err: any) {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0e0720] via-[#1a0b2e] to-[#0a0518] text-white flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-purple-500 selection:text-white">
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
          Recover your Account Password
        </h2>
        <p className="mt-1 text-center text-xs text-purple-300/70">
          We will issue a secure single-use link to reset your password
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">
          {submitted ? (
            <div className="text-center space-y-4 animate-in fade-in duration-300">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-white">Instructions Sent</h3>
              <p className="text-xs text-purple-200/80 leading-relaxed">
                If an account exists for <span className="font-semibold text-white">{email}</span>, you will receive password recovery instructions. The reset link expires in 60 minutes.
              </p>

              {!emailConfigured && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-left text-xs text-amber-200">
                  <div className="font-semibold text-amber-300 mb-0.5">Outbound Email Notice:</div>
                  <p className="text-[11px] text-amber-200/80 leading-normal">
                    Email provider is unconfigured. In production, configure SMTP (SMTP_HOST, SMTP_USER, SMTP_PASS) or RESEND_API_KEY to deliver password recovery links directly to your inbox.
                  </p>
                </div>
              )}

              {devResetUrl && (
                <div className="p-3 bg-purple-900/40 border border-purple-500/40 rounded-xl text-left text-xs text-purple-200">
                  <div className="font-semibold text-purple-300 mb-1">Development Mode Link:</div>
                  <Link href={devResetUrl} className="text-indigo-400 hover:underline break-all">
                    Click here to reset your password now →
                  </Link>
                </div>
              )}

              <div className="pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-semibold"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-purple-200 mb-1.5">
                  Registered Email Address
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
                    className="w-full pl-9 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-purple-300/30 text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Send Password Reset Link</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="pt-3 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
