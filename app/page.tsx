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
} from 'lucide-react';
import { AiVoiceOrb } from '@/components/AiVoiceOrb';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Business, ConnectorStatus } from '@/types/erp';
import { AgentRun } from '@/types/agent';
import { voiceManager, VoiceLanguage } from '@/lib/voice/speech';
import { useBusiness } from '@/components/BusinessProvider';

export default function BizFlowDashboard() {
  const router = useRouter();

  // Business Context from strictly isolated BusinessProvider
  const {
    currentBusiness,
    businessId: currentBusinessId,
    setBusinessId: setCurrentBusinessId,
    accessibleBusinesses: businesses,
  } = useBusiness();

  // Voice Settings (Single unified high-quality voice)
  const [language, setLanguage] = useState<VoiceLanguage>('en');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);

  // Sliding Side Drawers (Hidden by default, displayed only when toggled)
  const [isLeftDrawerOpen, setIsLeftDrawerOpen] = useState(false);
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState(false);

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

  // Initial data loading
  useEffect(() => {
    if (!currentBusinessId) return;
    loadConnectors();
    loadBadges();
    loadAgenticData();
  }, [currentBusinessId]);

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
    setIsLeftDrawerOpen(false);
    setIsRightDrawerOpen(false);
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

      {/* FLOATING EDGE TABS (Side Triggers for Drawers) */}
      <button
        onClick={() => setIsLeftDrawerOpen(true)}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-30 bg-white/95 hover:bg-purple-50 backdrop-blur-md border border-l-0 border-purple-200/90 rounded-r-2xl py-3 px-1.5 shadow-md text-purple-700 hover:text-purple-900 transition-all flex flex-col items-center gap-1.5 group hover:pl-2.5 cursor-pointer"
        title="Quick Business Pages & Agent Workspaces"
      >
        <TrendingUp className="w-3.5 h-3.5 text-purple-600 group-hover:scale-110 transition-transform" />
        <span className="text-[9px] font-bold tracking-wider [writing-mode:vertical-rl] rotate-180 text-gray-500 group-hover:text-purple-700">
          OPERATIONS
        </span>
      </button>

      <button
        onClick={() => setIsRightDrawerOpen(true)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-30 bg-white/95 hover:bg-purple-50 backdrop-blur-md border border-r-0 border-purple-200/90 rounded-l-2xl py-3 px-1.5 shadow-md text-indigo-700 hover:text-indigo-900 transition-all flex flex-col items-center gap-1.5 group hover:pr-2.5 cursor-pointer"
        title="Integrations & Apps Status"
      >
        <Database className="w-3.5 h-3.5 text-indigo-600 group-hover:scale-110 transition-transform" />
        <span className="text-[9px] font-bold tracking-wider [writing-mode:vertical-rl] text-gray-500 group-hover:text-indigo-700">
          CONNECTORS
        </span>
      </button>

      {/* LEFT SLIDE-OUT DRAWER — Agentic OS Destinations */}
      {isLeftDrawerOpen && (
        <div
          onClick={() => setIsLeftDrawerOpen(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity animate-in fade-in duration-200"
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-84 max-w-[85vw] bg-white/95 backdrop-blur-2xl z-50 shadow-2xl border-r border-purple-100 transform transition-transform duration-300 ease-in-out p-5 flex flex-col justify-between overflow-y-auto ${
          isLeftDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 font-heading">Agentic OS Destinations</h3>
                <p className="text-[11px] text-gray-500">Autonomous & Guided Workflows</p>
              </div>
            </div>
            <button
              onClick={() => setIsLeftDrawerOpen(false)}
              className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
              title="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1">
            {/* AGENT 1: Unified Agent Workspace */}
            <button
              onClick={() => navigateTo('/agent')}
              className="w-full text-left p-2.5 rounded-2xl bg-purple-50/70 hover:bg-purple-100 flex items-center gap-3 transition-colors group cursor-pointer border border-purple-200"
            >
              <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                  AI Agent Workspace
                  <span className="bg-purple-200 text-purple-800 text-[9px] px-1.5 rounded-full font-bold">OS</span>
                </div>
                <div className="text-[11px] text-purple-700">Multi-step console & approvals</div>
              </div>
            </button>

            {/* AGENT 2: Udhaar & Collections */}
            <button
              onClick={() => navigateTo('/udhaar')}
              className="w-full text-left p-2.5 rounded-2xl hover:bg-indigo-50/80 flex items-center gap-3 transition-colors group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                  Customer Credit & Udhaar
                  {overdueTotal > 0 && (
                    <span className="bg-rose-100 text-rose-800 text-[9px] px-1.5 rounded-full font-bold">
                      ₹{Math.round(overdueTotal / 1000)}k
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-gray-500">Aging buckets & WhatsApp reminders</div>
              </div>
            </button>

            {/* AGENT 3: Profit Leak & Daily Closing */}
            <button
              onClick={() => navigateTo('/closing')}
              className="w-full text-left p-2.5 rounded-2xl hover:bg-emerald-50/80 flex items-center gap-3 transition-colors group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <FileCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                  Daily Closing & Profit Leaks
                  {unmatchedCount > 0 && (
                    <span className="bg-amber-100 text-amber-800 text-[9px] px-1.5 rounded-full font-bold">
                      {unmatchedCount} unrec
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-gray-500">Reconciliation & margin audit</div>
              </div>
            </button>

            <div className="py-2">
              <div className="h-[1px] bg-gray-100" />
            </div>

            {/* Invoices & Billing */}
            <button
              onClick={() => navigateTo('/invoices?action=create')}
              className="w-full text-left p-2.5 rounded-2xl hover:bg-blue-50/80 flex items-center gap-3 transition-colors group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-900">Invoices & Billing</div>
                <div className="text-[11px] text-gray-500">GST tax bills & PDF export</div>
              </div>
            </button>

            {/* Inventory Status */}
            <button
              onClick={() => navigateTo('/inventory')}
              className="w-full text-left p-2.5 rounded-2xl hover:bg-amber-50/80 flex items-center gap-3 transition-colors group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                  Inventory & Stock
                  {lowStockCount > 0 && (
                    <span className="bg-amber-100 text-amber-800 text-[9px] px-1.5 rounded-full font-bold">
                      {lowStockCount}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-gray-500">Stock thresholds & restock</div>
              </div>
            </button>

            {/* Today's Sales */}
            <button
              onClick={() => navigateTo('/sales')}
              className="w-full text-left p-2.5 rounded-2xl hover:bg-purple-50/80 flex items-center gap-3 transition-colors group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-900">Sales Dashboard</div>
                <div className="text-[11px] text-gray-500">Revenue & cash flow history</div>
              </div>
            </button>

            {/* Smart Import */}
            <button
              onClick={() => navigateTo('/import')}
              className="w-full text-left p-2.5 rounded-2xl hover:bg-emerald-50/80 flex items-center gap-3 transition-colors group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-900">Data & Ledger Import</div>
                <div className="text-[11px] text-gray-500">Excel & Photo OCR ingestion</div>
              </div>
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-purple-100 text-purple-700 text-xs font-semibold flex items-center justify-between">
          <span>₹299/mo Starter Plan</span>
          <button onClick={() => navigateTo('/billing')} className="font-bold underline hover:text-purple-900">
            Usage Meter →
          </button>
        </div>
      </aside>

      {/* RIGHT SLIDE-OUT DRAWER — Truthful Connected Apps Status */}
      {isRightDrawerOpen && (
        <div
          onClick={() => setIsRightDrawerOpen(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity animate-in fade-in duration-200"
        />
      )}

      <aside
        className={`fixed top-0 right-0 h-full w-84 max-w-[85vw] bg-white/95 backdrop-blur-2xl z-50 shadow-2xl border-l border-purple-100 transform transition-transform duration-300 ease-in-out p-5 flex flex-col justify-between overflow-y-auto ${
          isRightDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 font-heading">Integration Status</h3>
                <span className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  1 Connected • Credentials Required
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsRightDrawerOpen(false)}
              className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
              title="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            {/* Database (PostgreSQL) - Genuinely Connected */}
            <button
              onClick={() => navigateTo('/connectors')}
              className="w-full text-left p-2.5 rounded-2xl hover:bg-gray-50 flex items-center justify-between transition-colors border border-transparent hover:border-gray-200 cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-900">Database (PostgreSQL)</div>
                  <div className="text-[11px] text-emerald-600 font-medium">Connected & Isolated</div>
                </div>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </button>

            {/* Excel / Photo OCR - Genuinely Ready */}
            <button
              onClick={() => navigateTo('/agent?tab=entry')}
              className="w-full text-left p-2.5 rounded-2xl hover:bg-gray-50 flex items-center justify-between transition-colors border border-transparent hover:border-gray-200 cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-900">Smart Document OCR</div>
                  <div className="text-[11px] text-emerald-600 font-medium">Ready for Upload</div>
                </div>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </button>

            {/* WhatsApp Business - Truthful Status */}
            <button
              onClick={() => navigateTo('/connectors')}
              className="w-full text-left p-2.5 rounded-2xl hover:bg-gray-50 flex items-center justify-between transition-colors border border-transparent hover:border-gray-200 cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-900">WhatsApp Messaging</div>
                  <div className="text-[10px] text-amber-600 font-medium">Click-to-chat active • API Setup Req</div>
                </div>
              </div>
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            </button>

            {/* Email (Gmail) - Truthful Status */}
            <button
              onClick={() => navigateTo('/connectors')}
              className="w-full text-left p-2.5 rounded-2xl hover:bg-gray-50 flex items-center justify-between transition-colors border border-transparent hover:border-gray-200 cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-900">Email (Gmail API)</div>
                  <div className="text-[10px] text-gray-400 font-medium">Credentials Setup Required</div>
                </div>
              </div>
              <span className="w-2 h-2 rounded-full bg-rose-500" />
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
          <span>Truthful integration status</span>
          <button
            onClick={() => navigateTo('/connectors')}
            className="font-bold text-purple-700 hover:text-purple-900 transition-colors cursor-pointer"
          >
            Configure →
          </button>
        </div>
      </aside>

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
                className="px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold rounded-full shadow-xs transition-all cursor-pointer"
              >
                🤖 AI Agent Console
              </button>
              <button
                type="button"
                onClick={() => navigateTo('/udhaar')}
                className="px-3 py-1 bg-white hover:bg-purple-50 border border-purple-100 rounded-full text-gray-700 shadow-sm transition-all cursor-pointer"
              >
                👥 Udhaar & Collections
              </button>
              <button
                type="button"
                onClick={() => navigateTo('/closing')}
                className="px-3 py-1 bg-white hover:bg-purple-50 border border-purple-100 rounded-full text-gray-700 shadow-sm transition-all cursor-pointer"
              >
                📑 Close Today&apos;s Books
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
      </main>

      {/* Shared Footer with Product by LyKSpire */}
      <Footer />
    </div>
  );
}
