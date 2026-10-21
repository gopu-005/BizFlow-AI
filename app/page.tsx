'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Mic,
  Paperclip,
  Camera,
  ArrowRight,
  TrendingUp,
  Package,
  FileText,
  Users,
  Mail,
  MessageCircle,
  BarChart3,
  Volume2,
  Database,
  FileSpreadsheet,
  X,
  Loader2,
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  Clock,
  FileCheck,
  AlertTriangle,
  ChevronRight,
  Calendar,
  ExternalLink,
  Lock,
  LogIn,
  UserPlus,
} from 'lucide-react';
import { AiVoiceOrb } from '@/components/AiVoiceOrb';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Business, ConnectorStatus } from '@/types/erp';
import { AgentRun } from '@/types/agent';
import { voiceManager, VoiceLanguage } from '@/lib/voice/speech';
import { useBusiness } from '@/components/BusinessProvider';
import { loginUrlFor } from '@/components/AgenticAuthGate';

export default function BizFlowDashboard() {
  const router = useRouter();

  // Business Context from strictly isolated BusinessProvider
  const {
    currentBusiness,
    businessId: currentBusinessId,
    setBusinessId: setCurrentBusinessId,
    accessibleBusinesses: businesses,
    isAuthenticated,
    isLoading: isSessionLoading,
  } = useBusiness();

  // Voice Settings (Single unified high-quality voice)
  const [language, setLanguage] = useState<VoiceLanguage>('en');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);

  // Note: Operations / Connectors side drawers are now global (components/NavigationDrawers.tsx)

  // Conversational Input & AI Response
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [redirectNotice, setRedirectNotice] = useState<string | null>(null);
  const [aiResponse, setAiResponse] = useState<{
    text: string;
    voiceText: string;
    lang: 'en' | 'ta';
  } | null>(null);

  // Connectors Status & Badges (Cleanly initialized to 0 for tenant isolation)
  const [connectors, setConnectors] = useState<ConnectorStatus[]>([]);
  const [followUpsCount, setFollowUpsCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);

  // Agentic Business Home Metrics & Attention Items
  const [overdueTotal, setOverdueTotal] = useState(0);
  const [unmatchedCount, setUnmatchedCount] = useState(0);
  const [pendingDraftsCount, setPendingDraftsCount] = useState(0);
  const [recentAgentRuns, setRecentAgentRuns] = useState<AgentRun[]>([]);

  // Initial data loading (agentic data is members-only)
  useEffect(() => {
    if (!currentBusinessId || isSessionLoading) return;
    loadConnectors();
    loadBadges();
    if (isAuthenticated) {
      loadAgenticData();
    } else {
      setOverdueTotal(0);
      setUnmatchedCount(0);
      setPendingDraftsCount(0);
      setRecentAgentRuns([]);
    }
  }, [currentBusinessId, isAuthenticated, isSessionLoading]);

  const loadConnectors = async () => {
    try {
      const res = await fetch(`/api/connectors?businessId=${currentBusinessId}`);
      const data = await res.json();
      if (data.connectors) setConnectors(data.connectors);
    } catch (e) {
      console.error(e);
    }
  };

  const loadBadges = async () => {
    try {
      const invRes = await fetch(`/api/erp/inventory?businessId=${currentBusinessId}&filter=low_stock`);
      const invData = await invRes.json();
      if (invData.products) setLowStockCount(invData.products.length);

      const fRes = await fetch(`/api/erp/follow-ups?businessId=${currentBusinessId}&filter=pending`);
      const fData = await fRes.json();
      if (fData.tasks) setFollowUpsCount(fData.tasks.length);
    } catch (e) {
      console.error(e);
    }
  };

  const loadAgenticData = async () => {
    try {
      const udhaarRes = await fetch(`/api/udhaar?businessId=${currentBusinessId}`);
      const udhaarData = await udhaarRes.json();
      if (udhaarData.summary) {
        setOverdueTotal(udhaarData.summary.totalOverdue || 0);
      }

      const closingRes = await fetch(`/api/closing?businessId=${currentBusinessId}`);
      const closingData = await closingRes.json();
      if (closingData.payments) {
        const unmatched = closingData.payments.filter((p: any) => !p.matched).length;
        setUnmatchedCount(unmatched);
      }

      const entryRes = await fetch(`/api/entry?businessId=${currentBusinessId}`);
      const entryData = await entryRes.json();
      if (entryData.drafts) {
        setPendingDraftsCount(entryData.drafts.filter((d: any) => d.status === 'draft').length);
      }

      const runsRes = await fetch(`/api/agent/runs?businessId=${currentBusinessId}&limit=4`);
      const runsData = await runsRes.json();
      if (runsData.runs) {
        setRecentAgentRuns(runsData.runs);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Execute conversational query and redirect to dedicated page
  const handleSendCommand = async (commandToRun?: string) => {
    const textToQuery = (commandToRun || inputText).trim();
    if (!textToQuery) return;

    setIsProcessing(true);
    setSpeechError(null);
    setRedirectNotice(null);
    voiceManager.stopSpeaking();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToQuery,
          businessId: currentBusinessId,
        }),
      });

      const data = await res.json();
      if (data.textResponse) {
        setAiResponse({
          text: data.textResponse,
          voiceText: data.voiceText || data.textResponse,
          lang: data.language || 'en',
        });

        speakResponse(data.voiceText || data.textResponse, data.language || 'en');

        const routeMap: Record<string, { route: string; label: string }> = {
          sales_summary: { route: '/sales', label: 'Sales Ledger & Revenue' },
          low_stock: { route: '/inventory', label: 'Inventory & Low Stock' },
          inventory_low_stock: { route: '/inventory', label: 'Inventory & Low Stock' },
          create_invoice: { route: '/invoices?action=create', label: 'GST Invoice Generator' },
          follow_ups: { route: '/udhaar', label: 'Customer Udhaar & Collections' },
          connectors: { route: '/connectors', label: 'Connected Apps & Data Feeds' },
          report_preview: { route: '/closing', label: 'Daily Closing & Profit Leaks' },
          import_flow: { route: '/agent?tab=entry', label: 'Smart Entry Agent' },
          billing_modal: { route: '/billing', label: 'Subscription & Quota' },
        };

        const target = data.actionType ? routeMap[data.actionType] : null;
        if (target) {
          setRedirectNotice(`Redirecting to ${target.label}...`);
          setTimeout(() => {
            router.push(target.route);
          }, 1200);
        }
      }
    } catch (e) {
      setAiResponse({
        text: 'Sorry, I encountered an issue processing your request. Please try again.',
        voiceText: 'Sorry, an error occurred.',
        lang: 'en',
      });
    } finally {
      setIsProcessing(false);
      setInputText('');
    }
  };

  const toggleListening = () => {
    if (isListening) {
      voiceManager.stopListening();
      setIsListening(false);
      return;
    }

    voiceManager.stopSpeaking();
    setIsListening(true);
    setSpeechError(null);

    voiceManager.startListening(
      language,
      (interim) => {
        setInputText(interim);
      },
      (final) => {
        setInputText(final);
        setIsListening(false);
        handleSendCommand(final);
      },
      (err) => {
        setSpeechError(err);
        setIsListening(false);
        setTimeout(() => {
          setSpeechError(null);
        }, 5000);
      },
      () => {
        setIsListening(false);
      }
    );
  };

  const speakResponse = (text: string, lang: VoiceLanguage) => {
    voiceManager.speak(
      text,
      'female',
      lang,
      () => setIsSpeaking(true),
      () => setIsSpeaking(false)
    );
  };

  const navigateTo = (path: string) => {
    router.push(path);
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-[#fbfbfe] text-[#0f172a] font-sans antialiased overflow-x-hidden">
      {/* Background Radial Ambient Glows */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-radial-gradient blur-3xl opacity-80" />
      <div className="pointer-events-none absolute top-40 right-10 w-72 h-72 bg-purple-200/40 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute top-48 left-10 w-72 h-72 bg-indigo-200/30 rounded-full blur-3xl" />

      {/* Shared Navigation Bar */}
      <Navbar
        currentBusinessId={currentBusinessId}
        onBusinessChange={(id) => setCurrentBusinessId(id)}
      />

      {/* MAIN VIEWPORT: CENTERED VOICE ORB + ATTENTION & AGENT CENTER */}
      <main className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 flex-1 flex flex-col items-center justify-center py-6 sm:py-8 space-y-8">
        <div className="w-full flex flex-col items-center justify-center text-center">
          {/* 3D Realistic Neon Fluid Sphere */}
          <div className="relative mb-3 flex items-center justify-center">
            <AiVoiceOrb isListening={isListening} isSpeaking={isSpeaking} />
          </div>

          {/* Title & Subtitle */}
          <div className="space-y-1 mb-4">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 font-heading">
              How can I assist your business today?
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto">
              Ask in <span className="font-semibold text-purple-700">English</span> or{' '}
              <span className="font-semibold text-purple-700">தமிழ் (Tamil)</span>. Powered by the shared Agentic OS engine.
            </p>
          </div>

          {/* Speech Error Banner */}
          {speechError && (
            <div className="mb-4 px-4 py-2 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium animate-in fade-in">
              {speechError}
            </div>
          )}

          {/* PROMINENT CAPSULE INPUT BAR */}
          <div className="w-full max-w-xl relative mt-2">
            <div className="bg-[#0b0819] text-white rounded-full p-2 pl-3 pr-2.5 shadow-capsule border border-purple-500/40 flex items-center gap-2 transition-all focus-within:border-purple-400 focus-within:shadow-[0_0_25px_rgba(168,85,247,0.4)]">
              <button
                type="button"
                onClick={toggleListening}
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.6)]'
                    : 'bg-purple-600 text-white hover:bg-purple-500 shadow-[0_0_12px_rgba(147,51,234,0.4)]'
                }`}
                title={isListening ? 'Listening... click to stop' : 'Click to speak'}
              >
                <Mic className="w-4 h-4" />
              </button>

              <div className="w-[1px] h-6 bg-purple-900/80" />

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendCommand()}
                placeholder={
                  isListening
                    ? 'Listening to your voice...'
                    : language === 'ta'
                    ? 'வணிகத்தைப் பற்றி எதையும் கேளுங்கள்... (தமிழ் / English)'
                    : 'Ask anything, or record expenses, close day, audit credit...'
                }
                className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-gray-400 focus:outline-none px-1"
              />

              <div className="flex items-center gap-1.5 shrink-0 pr-1">
                <button
                  type="button"
                  onClick={() => navigateTo('/agent?tab=entry')}
                  className="p-1.5 text-gray-400 hover:text-white transition-colors cursor-pointer"
                  title="Smart Document Entry"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => navigateTo('/agent?tab=entry')}
                  className="p-1.5 text-gray-400 hover:text-white transition-colors cursor-pointer"
                  title="Scan bill or receipt photo"
                >
                  <Camera className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => handleSendCommand()}
                  disabled={isProcessing}
                  className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white flex items-center justify-center hover:opacity-95 active:scale-95 transition-all shadow-md cursor-pointer"
                  title="Send command"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Quick Command Chips */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-3.5 text-xs">
              <button
                type="button"
                onClick={() => navigateTo('/agent')}
                className="px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold rounded-full shadow-xs transition-all cursor-pointer inline-flex items-center gap-1"
              >
                🤖 AI Agent Console
                {!isAuthenticated && !isSessionLoading && <Lock className="w-3 h-3 opacity-70" />}
              </button>
              <button
                type="button"
                onClick={() => navigateTo('/udhaar')}
                className="px-3 py-1 bg-white hover:bg-purple-50 border border-purple-100 rounded-full text-gray-700 shadow-sm transition-all cursor-pointer inline-flex items-center gap-1"
              >
                👥 Udhaar & Collections
                {!isAuthenticated && !isSessionLoading && <Lock className="w-3 h-3 text-gray-400" />}
              </button>
              <button
                type="button"
                onClick={() => navigateTo('/closing')}
                className="px-3 py-1 bg-white hover:bg-purple-50 border border-purple-100 rounded-full text-gray-700 shadow-sm transition-all cursor-pointer inline-flex items-center gap-1"
              >
                📑 Close Today&apos;s Books
                {!isAuthenticated && !isSessionLoading && <Lock className="w-3 h-3 text-gray-400" />}
              </button>
              <button
                type="button"
                onClick={() => navigateTo('/invoices?action=create')}
                className="px-3 py-1 bg-white hover:bg-purple-50 border border-purple-100 rounded-full text-gray-700 shadow-sm transition-all cursor-pointer"
              >
                🧾 Create GST invoice
              </button>
              <button
                type="button"
                onClick={() => setLanguage(language === 'en' ? 'ta' : 'en')}
                className="px-3 py-1 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 font-bold rounded-full shadow-sm transition-all cursor-pointer"
              >
                🌐 {language === 'en' ? 'தமிழ்' : 'English'}
              </button>
            </div>
          </div>
        </div>

        {/* REDIRECT NOTICE TOAST */}
        {redirectNotice && (
          <div className="max-w-md mx-auto px-4 py-2.5 rounded-full bg-purple-600 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg animate-in fade-in">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>{redirectNotice}</span>
          </div>
        )}

        {/* AI CONVERSATIONAL SPOKEN/TEXT RESPONSE BUBBLE */}
        {aiResponse && (
          <div className="w-full max-w-3xl mx-auto p-4 rounded-2xl bg-white/95 border border-purple-200 shadow-md flex items-start gap-3 animate-in fade-in">
            <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-900">BizFlow Assistant</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => speakResponse(aiResponse.voiceText, aiResponse.lang)}
                    className="p-1 rounded text-purple-700 hover:bg-purple-50 transition-colors"
                    title="Speak again"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setAiResponse(null)}
                    className="p-1 rounded text-gray-400 hover:text-gray-700"
                    title="Dismiss"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">
                {aiResponse.text}
              </p>
            </div>
          </div>
        )}

        {/* GUEST PREVIEW: Agentic OS is members-only */}
        {!isAuthenticated && !isSessionLoading && (
          <div
            id="agentic-locked-preview"
            className="w-full relative overflow-hidden rounded-3xl border border-purple-200 bg-gradient-to-br from-white via-purple-50/60 to-indigo-50/60 p-6 sm:p-8 shadow-[0_20px_50px_-25px_rgba(109,40,217,0.35)]"
          >
            <div className="pointer-events-none absolute -top-16 -right-16 w-56 h-56 bg-purple-300/30 rounded-full blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-10 w-56 h-56 bg-indigo-300/20 rounded-full blur-3xl" />

            <div className="relative flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex-1 space-y-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-purple-200 text-[10px] font-bold uppercase tracking-wider text-purple-700">
                  <Lock className="w-3 h-3" />
                  Members only
                </span>
                <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 font-heading">
                  Unlock the Agentic Operating System
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 max-w-xl">
                  Sign in to see items needing your attention and to run the AI agents on your own private business data.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  {[
                    { icon: Paperclip, label: 'Smart Entry Agent', tone: 'text-purple-700 bg-purple-100' },
                    { icon: Users, label: 'Udhaar & Collections', tone: 'text-indigo-700 bg-indigo-100' },
                    { icon: FileCheck, label: 'Daily Closing & Leaks', tone: 'text-emerald-700 bg-emerald-100' },
                  ].map(({ icon: Icon, label, tone }) => (
                    <div
                      key={label}
                      className="flex items-center gap-2 p-2 rounded-xl bg-white/80 border border-purple-100 text-[11px] font-semibold text-gray-700"
                    >
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center ${tone}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </span>
                      {label}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2 md:w-52 shrink-0">
                <Link
                  id="landing-unlock-sign-in"
                  href={loginUrlFor('/')}
                  className="inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 active:scale-[0.98] text-white text-sm font-semibold shadow-md transition-all"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In
                </Link>
                <Link
                  id="landing-unlock-register"
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white border border-purple-200 hover:bg-purple-50 text-purple-700 text-sm font-semibold transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  Create Free Account
                </Link>
              </div>
            </div>
          </div>
        )}

        {isAuthenticated && (
        <>
        {/* SECTION: ITEMS NEEDING OWNER ATTENTION (Primary Priority per spec) */}
        <div className="w-full space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <h2 className="text-sm sm:text-base font-bold text-gray-900 font-heading">
                Items Needing Owner Attention
              </h2>
            </div>
            <span className="text-[11px] text-gray-400">Ranked by financial urgency</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Attention Item 1: Overdue Udhaar */}
            <div
              onClick={() => navigateTo('/udhaar')}
              className="p-4 rounded-2xl bg-white border border-rose-100 shadow-xs hover:border-rose-300 transition-all cursor-pointer space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                  Overdue Credit
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">₹{overdueTotal.toLocaleString('en-IN')}</div>
                <div className="text-[11px] text-gray-500">Overdue customer balances</div>
              </div>
              <div className="text-[10px] text-purple-700 font-semibold pt-1">
                Open Udhaar Agent →
              </div>
            </div>

            {/* Attention Item 2: Unmatched Payments */}
            <div
              onClick={() => navigateTo('/closing')}
              className="p-4 rounded-2xl bg-white border border-amber-100 shadow-xs hover:border-amber-300 transition-all cursor-pointer space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                  Unmatched Payments
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">{unmatchedCount} Entry</div>
                <div className="text-[11px] text-gray-500">Bank entries awaiting invoice match</div>
              </div>
              <div className="text-[10px] text-purple-700 font-semibold pt-1">
                Reconcile Payments →
              </div>
            </div>

            {/* Attention Item 3: Low Stock Alerts */}
            <div
              onClick={() => navigateTo('/inventory')}
              className="p-4 rounded-2xl bg-white border border-amber-100 shadow-xs hover:border-amber-300 transition-all cursor-pointer space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                  Stock Alert
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">{lowStockCount} Products</div>
                <div className="text-[11px] text-gray-500">Below minimum restock threshold</div>
              </div>
              <div className="text-[10px] text-purple-700 font-semibold pt-1">
                View Inventory Catalog →
              </div>
            </div>

            {/* Attention Item 4: Pending Transaction Drafts */}
            <div
              onClick={() => navigateTo('/agent?tab=entry')}
              className="p-4 rounded-2xl bg-white border border-purple-100 shadow-xs hover:border-purple-300 transition-all cursor-pointer space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                  Pending Review
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">{pendingDraftsCount} Draft</div>
                <div className="text-[11px] text-gray-500">Smart entry awaiting commit</div>
              </div>
              <div className="text-[10px] text-purple-700 font-semibold pt-1">
                Review & Commit →
              </div>
            </div>
          </div>
        </div>

        {/* SECTION: THREE INTEGRATED AGENT WORKSPACES */}
        <div className="w-full space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-bold text-gray-900 font-heading">
              Agentic Operating System Workspaces
            </h2>
            <Link href="/agent" className="text-xs font-bold text-purple-700 hover:text-purple-900">
              Open Agent Console →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Agent Card 1 */}
            <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-xs space-y-3 flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-2">
                  <Paperclip className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 font-heading">Smart Entry Agent</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Extracts bills, purchase receipts, OCR photos, and natural-language expenses without blind inventory updates.
                </p>
              </div>
              <button
                onClick={() => navigateTo('/agent?tab=entry')}
                className="w-full py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Launch Smart Entry →
              </button>
            </div>

            {/* Agent Card 2 */}
            <div className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-xs space-y-3 flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-2">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 font-heading">Udhaar & Collection Agent</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Tracks customer credit ledgers, 0–60+ aging buckets, payment promises, and pre-fills WhatsApp click-to-chat links.
                </p>
              </div>
              <button
                onClick={() => navigateTo('/udhaar')}
                className="w-full py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Manage Udhaar & Reminders →
              </button>
            </div>

            {/* Agent Card 3 */}
            <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-xs space-y-3 flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2">
                  <FileCheck className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 font-heading">Profit Leak & Daily Closing</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Reconciles sales vs collections, detects cash variance, audits low margin products, and produces official closing reports.
                </p>
              </div>
              <button
                onClick={() => navigateTo('/closing')}
                className="w-full py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Close Accounts & Audit →
              </button>
            </div>
          </div>
        </div>

        {/* SECTION: RECENT AGENT TASKS COMPLETED */}
        {recentAgentRuns.length > 0 && (
          <div className="w-full bg-white p-5 rounded-2xl border border-purple-100 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 font-heading flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Tasks Recently Completed by Agents
              </h3>
              <Link href="/agent?tab=activity" className="text-xs font-semibold text-purple-700 hover:underline">
                Full Audit History →
              </Link>
            </div>

            <div className="divide-y divide-gray-100 text-xs">
              {recentAgentRuns.map((run) => (
                <div key={run.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        run.status === 'completed'
                          ? 'bg-emerald-500'
                          : run.status === 'awaiting_approval'
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                    />
                    <div className="truncate">
                      <span className="font-semibold text-gray-800">{run.userPrompt}</span>
                      <span className="text-[10px] text-gray-400 ml-2">({run.steps.length} steps)</span>
                    </div>
                  </div>

                  <span
                    className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0 ${
                      run.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : run.status === 'awaiting_approval'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {run.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        </>
        )}
      </main>

      {/* Shared Footer with Product by LyKSpire */}
      <Footer />
    </div>
  );
}
