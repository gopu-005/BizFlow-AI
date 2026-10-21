'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Lock, LogIn, UserPlus, Sparkles, ShieldCheck, Loader2, ArrowLeft } from 'lucide-react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { useBusiness } from './BusinessProvider';

/** Routes that belong to the Agentic OS and require a logged-in session. */
export const AGENTIC_ROUTES = ['/agent', '/udhaar', '/closing'];

export const isAgenticRoute = (path: string) =>
  AGENTIC_ROUTES.some((r) => path === r || path.startsWith(`${r}/`) || path.startsWith(`${r}?`));

/** Builds a /login URL that returns the user to `target` after signing in. */
export const loginUrlFor = (target: string) => `/login?next=${encodeURIComponent(target)}`;

interface AgenticAuthGateProps {
  featureName: string;
  description: string;
  highlights?: string[];
  children: React.ReactNode;
}

/**
 * Renders children only for authenticated users.
 * Guests see a locked screen prompting them to sign in or create an account.
 */
export const AgenticAuthGate: React.FC<AgenticAuthGateProps> = ({
  featureName,
  description,
  highlights = [],
  children,
}) => {
  const { isAuthenticated, isLoading } = useBusiness();
  const pathname = usePathname() || '/';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fbfbfe] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
        <span className="text-xs font-semibold text-gray-500">Verifying secure session...</span>
      </div>
    );
  }

  if (isAuthenticated) return <>{children}</>;

  const returnTo =
    typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : pathname;

  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-[#fbfbfe] text-[#0f172a] font-sans antialiased overflow-x-hidden">
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-radial-gradient blur-3xl opacity-70" />
      <div className="pointer-events-none absolute top-40 right-10 w-72 h-72 bg-purple-200/40 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute top-56 left-10 w-72 h-72 bg-indigo-200/30 rounded-full blur-3xl" />

      <Navbar />

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg bg-white/90 backdrop-blur-xl border border-purple-100 rounded-3xl shadow-[0_20px_60px_-20px_rgba(109,40,217,0.35)] p-7 sm:p-9 text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="relative mx-auto w-16 h-16 mb-5">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 blur-md opacity-50 animate-pulse" />
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-700 via-purple-600 to-indigo-500 flex items-center justify-center shadow-lg">
              <Lock className="w-7 h-7 text-white" />
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 border border-purple-200 text-[10px] font-bold uppercase tracking-wider text-purple-700">
            <Sparkles className="w-3 h-3" />
            Agentic OS · Members only
          </span>

          <h1 className="mt-3 text-xl sm:text-2xl font-extrabold tracking-tight text-gray-900 font-heading">
            Sign in to use {featureName}
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-gray-500 leading-relaxed">{description}</p>

          {highlights.length > 0 && (
            <ul className="mt-5 space-y-2 text-left">
              {highlights.map((h) => (
                <li
                  key={h}
                  className="flex items-start gap-2.5 p-2.5 rounded-xl bg-purple-50/50 border border-purple-100/70 text-xs text-gray-700"
                >
                  <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0 mt-px" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
            <Link
              id="agentic-gate-sign-in"
              href={loginUrlFor(returnTo)}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 active:scale-[0.98] text-white text-sm font-semibold shadow-md transition-all"
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </Link>
            <Link
              id="agentic-gate-register"
              href="/register"
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white border border-purple-200 hover:bg-purple-50 text-purple-700 text-sm font-semibold transition-all"
            >
              <UserPlus className="w-4 h-4" />
              Create Free Account
            </Link>
          </div>

          <Link
            href="/"
            className="mt-5 inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 hover:text-purple-700 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to Home
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
};
