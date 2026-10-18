'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';
import { AiVoiceOrb } from '@/components/AiVoiceOrb';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Business, ConnectorStatus } from '@/types/erp';
import { voiceManager, VoiceLanguage } from '@/lib/voice/speech';

export default function BizFlowDashboard() {
  const router = useRouter();

  // Business Context
  const [businesses, setBusinesses] = useState<Business[]>([
    {
      id: 'biz_karthik_textiles',
      name: 'Karthik Textiles & Garments',
      type: 'Clothing & Retail',
      currency: '₹',
      ownerName: 'Karthik Ramanathan',
      gstNumber: '33AAAAA0000A1Z5',
      address: '42 Ranganathan Street, T. Nagar, Chennai, Tamil Nadu 600017',
      phone: '+91 98400 11223',
      email: 'karthik@textiles.bizflow.in',
      createdAt: '2024-01-10T10:00:00Z',
    },
    {
      id: 'biz_murugan_bakery',
      name: 'Sri Murugan Bakery & Sweets',
      type: 'Bakery & Food Vendor',
      currency: '₹',
      ownerName: 'Murugan Velayudham',
      gstNumber: '33BBBBB1111B2Z6',
      address: '15 Gandhi Road, Tambaram, Chennai 600045',
      phone: '+91 94441 55667',
      email: 'murugan@bakery.bizflow.in',
      createdAt: '2024-03-01T09:00:00Z',
    },
  ]);
  const [currentBusinessId, setCurrentBusinessId] = useState<string>('biz_karthik_textiles');
  const currentBusiness = businesses.find((b) => b.id === currentBusinessId) || businesses[0];

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

  // Connectors Status & Badges
  const [connectors, setConnectors] = useState<ConnectorStatus[]>([]);
  const [followUpsCount, setFollowUpsCount] = useState(3);
  const [lowStockCount, setLowStockCount] = useState(4);

  // Initial data loading
  useEffect(() => {
    loadConnectors();
    loadBadges();
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

        // Trigger spoken response using single natural voice
        speakResponse(data.voiceText || data.textResponse, data.language || 'en');

        // Route map for dedicated page redirection
        const routeMap: Record<string, { route: string; label: string }> = {
          sales_summary: { route: '/sales', label: 'Sales Ledger & Revenue' },
          low_stock: { route: '/inventory', label: 'Inventory & Low Stock' },
          inventory_low_stock: { route: '/inventory', label: 'Inventory & Low Stock' },
          create_invoice: { route: '/invoices?action=create', label: 'GST Invoice Generator' },
          follow_ups: { route: '/customers', label: 'Customer CRM & Follow-ups' },
          connectors: { route: '/connectors', label: 'Connected Apps & Data Feeds' },
          report_preview: { route: '/reports', label: 'Executive Business Reports' },
          import_flow: { route: '/import', label: 'Smart Data & Ledger Import' },
          billing_modal: { route: '/billing', label: 'Subscription & Invoicing' },
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

  // Voice Interaction Trigger
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

  // Speech Output (Single natural voice)
  const speakResponse = (text: string, lang: VoiceLanguage) => {
    voiceManager.speak(
      text,
      'female',
      lang,
      () => setIsSpeaking(true),
      () => setIsSpeaking(false)
    );
  };

  // Direct route navigation helpers for quick actions
  const navigateTo = (path: string) => {
    setIsLeftDrawerOpen(false);
    setIsRightDrawerOpen(false);
    router.push(path);
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-[#fbfbfe] text-[#0f172a] font-sans antialiased overflow-x-hidden">
      {/* Subtle Background Radial Ambient Glows */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-radial-gradient blur-3xl opacity-80" />
      <div className="pointer-events-none absolute top-40 right-10 w-72 h-72 bg-purple-200/40 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute top-48 left-10 w-72 h-72 bg-indigo-200/30 rounded-full blur-3xl" />

      {/* Shared Navigation Bar across all routes */}
      <Navbar
        currentBusinessId={currentBusinessId}
        onBusinessChange={(id) => setCurrentBusinessId(id)}
      />

      {/* FLOATING EDGE TABS (Side Triggers for Drawers) */}
      <button
        onClick={() => setIsLeftDrawerOpen(true)}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-30 bg-white/95 hover:bg-purple-50 backdrop-blur-md border border-l-0 border-purple-200/90 rounded-r-2xl py-3 px-1.5 shadow-md text-purple-700 hover:text-purple-900 transition-all flex flex-col items-center gap-1.5 group hover:pl-2.5 cursor-pointer"
        title="Quick Business Pages"
      >
        <TrendingUp className="w-3.5 h-3.5 text-purple-600 group-hover:scale-110 transition-transform" />
        <span className="text-[9px] font-bold tracking-wider [writing-mode:vertical-rl] rotate-180 text-gray-500 group-hover:text-purple-700">
          ACTIONS
        </span>
      </button>

      <button
        onClick={() => setIsRightDrawerOpen(true)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-30 bg-white/95 hover:bg-purple-50 backdrop-blur-md border border-r-0 border-purple-200/90 rounded-l-2xl py-3 px-1.5 shadow-md text-indigo-700 hover:text-indigo-900 transition-all flex flex-col items-center gap-1.5 group hover:pr-2.5 cursor-pointer"
        title="Connected Business Apps"
      >
        <Database className="w-3.5 h-3.5 text-indigo-600 group-hover:scale-110 transition-transform" />
        <span className="text-[9px] font-bold tracking-wider [writing-mode:vertical-rl] text-gray-500 group-hover:text-indigo-700">
          APPS
        </span>
      </button>

      {/* LEFT SLIDE-OUT DRAWER — Quick Route Links */}
      {isLeftDrawerOpen && (
        <div
          onClick={() => setIsLeftDrawerOpen(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity animate-in fade-in duration-200"
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-white/95 backdrop-blur-2xl z-50 shadow-2xl border-r border-purple-100 transform transition-transform duration-300 ease-in-out p-5 flex flex-col justify-between overflow-y-auto ${
          isLeftDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 font-heading">ERP Routes</h3>
                <p className="text-[11px] text-gray-500">Go directly to specific page</p>
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
            {/* 1. Today's Sales */}
            <button
              onClick={() => navigateTo('/sales')}
              className="w-full text-left p-2.5 rounded-2xl hover:bg-purple-50/80 flex items-center gap-3 transition-colors group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-900">Sales Dashboard</div>
                <div className="text-[11px] text-gray-500">Revenue, cash flow & invoices</div>
              </div>
            </button>

            {/* 2. Inventory Status */}
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
                    <span className="bg-amber-100 text-amber-800 text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                      {lowStockCount}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-gray-500">Catalog, thresholds & restock</div>
              </div>
            </button>

            {/* 3. Create Invoice */}
            <button
              onClick={() => navigateTo('/invoices?action=create')}
              className="w-full text-left p-2.5 rounded-2xl hover:bg-blue-50/80 flex items-center gap-3 transition-colors group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-900">Invoices & Billing</div>
                <div className="text-[11px] text-gray-500">Generate GST bill & PDF print</div>
              </div>
            </button>

            {/* 4. Customer Follow-ups */}
            <button
              onClick={() => navigateTo('/customers')}
              className="w-full text-left p-2.5 rounded-2xl hover:bg-violet-50/80 flex items-center gap-3 transition-colors group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0 group-hover:bg-violet-600 group-hover:text-white transition-colors">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                  Customers & Follow-ups
                  <span className="bg-purple-100 text-purple-800 text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                    {followUpsCount}
                  </span>
                </div>
                <div className="text-[11px] text-gray-500">CRM ledger & WhatsApp reminders</div>
              </div>
            </button>

            {/* 5. Monthly Report */}
            <button
              onClick={() => navigateTo('/reports')}
              className="w-full text-left p-2.5 rounded-2xl hover:bg-indigo-50/80 flex items-center gap-3 transition-colors group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-900">Reports & Analytics</div>
                <div className="text-[11px] text-gray-500">Profitability & official PDF</div>
              </div>
            </button>

            {/* 6. Smart Import */}
            <button
              onClick={() => navigateTo('/import')}
              className="w-full text-left p-2.5 rounded-2xl hover:bg-emerald-50/80 flex items-center gap-3 transition-colors group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-900">Data & Ledger Import</div>
                <div className="text-[11px] text-gray-500">Photo OCR & Excel ingestion</div>
              </div>
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-purple-100 font-handwritten text-purple-600 text-base rotate-[-1deg] flex items-center gap-1.5 opacity-90 select-none">
          <span>Dedicated routes for each business workflow</span>
        </div>
      </aside>

      {/* RIGHT SLIDE-OUT DRAWER — Connected Apps Status */}
      {isRightDrawerOpen && (
        <div
          onClick={() => setIsRightDrawerOpen(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity animate-in fade-in duration-200"
        />
      )}

      <aside
        className={`fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white/95 backdrop-blur-2xl z-50 shadow-2xl border-l border-purple-100 transform transition-transform duration-300 ease-in-out p-5 flex flex-col justify-between overflow-y-auto ${
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
                <h3 className="text-sm font-bold text-gray-900 font-heading">Connected Apps</h3>
                <span className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  All Connected
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
            {/* Email (Gmail) */}
            <button
              onClick={() => navigateTo('/connectors')}
              className="w-full text-left p-2.5 rounded-2xl hover:bg-gray-50 flex items-center justify-between transition-colors border border-transparent hover:border-gray-200 cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-900">Email (Gmail)</div>
                  <div className="text-[11px] text-gray-500">12 new emails</div>
                </div>
              </div>
              <span className="w-2 h-2 rounded-full bg-rose-500" />
            </button>

            {/* WhatsApp Business */}
            <button
              onClick={() => navigateTo('/connectors')}
              className="w-full text-left p-2.5 rounded-2xl hover:bg-gray-50 flex items-center justify-between transition-colors border border-transparent hover:border-gray-200 cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-900">WhatsApp Business</div>
                  <div className="text-[11px] text-gray-500">8 new messages</div>
                </div>
              </div>
              <span className="w-2 h-2 rounded-full bg-rose-500" />
            </button>

            {/* Database (PostgreSQL) */}
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
                  <div className="text-[11px] text-emerald-600 font-medium">Connected</div>
                </div>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </button>

            {/* Excel / CSV Import */}
            <button
              onClick={() => navigateTo('/import')}
              className="w-full text-left p-2.5 rounded-2xl hover:bg-gray-50 flex items-center justify-between transition-colors border border-transparent hover:border-gray-200 cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-900">Excel / Photo OCR</div>
                  <div className="text-[11px] text-emerald-600 font-medium">Ready</div>
                </div>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
          <span>Manage integrations</span>
          <button
            onClick={() => navigateTo('/connectors')}
            className="font-bold text-purple-700 hover:text-purple-900 transition-colors cursor-pointer"
          >
            Configure →
          </button>
        </div>
      </aside>

      {/* MAIN VIEWPORT: CENTERED 3D VOICE ORB & INTERACTION */}
      <main className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 flex-1 flex flex-col items-center justify-center py-6 sm:py-10">
        <div className="w-full flex flex-col items-center justify-center text-center">
          {/* 3D Realistic Neon Fluid Sphere with dynamic speaking & listening state */}
          <div className="relative mb-3 flex items-center justify-center">
            <AiVoiceOrb isListening={isListening} isSpeaking={isSpeaking} />
          </div>

          {/* Assistant Title & Multilingual Subtitle */}
          <div className="space-y-1 mb-4">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 font-heading">
              How can I assist your business today?
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto">
              Speak or ask in <span className="font-semibold text-purple-700">English</span> or{' '}
              <span className="font-semibold text-purple-700">தமிழ் (Tamil)</span>. I will route and display your business data in dedicated pages.
            </p>
          </div>

          {/* Speech Error Banner */}
          {speechError && (
            <div className="mb-4 px-4 py-2 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium animate-in fade-in">
              {speechError}
            </div>
          )}

          {/* MAIN PROMINENT CAPSULE INPUT BAR */}
          <div className="w-full max-w-xl relative mt-2">
            <div className="bg-[#0b0819] text-white rounded-full p-2 pl-3 pr-2.5 shadow-capsule border border-purple-500/40 flex items-center gap-2 transition-all focus-within:border-purple-400 focus-within:shadow-[0_0_25px_rgba(168,85,247,0.4)]">
              {/* Glowing Mic Button */}
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

              {/* Vertical Divider */}
              <div className="w-[1px] h-6 bg-purple-900/80" />

              {/* Input Text Box */}
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
                    : 'Ask anything about your sales, stock, or invoices...'
                }
                className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-gray-400 focus:outline-none px-1"
              />

              {/* Action Icons */}
              <div className="flex items-center gap-1.5 shrink-0 pr-1">
                {/* Paperclip (Go to Import Page) */}
                <button
                  type="button"
                  onClick={() => navigateTo('/import')}
                  className="p-1.5 text-gray-400 hover:text-white transition-colors cursor-pointer"
                  title="Import CSV or Excel spreadsheet"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                {/* Camera (Handwritten register / bill photo OCR) */}
                <button
                  type="button"
                  onClick={() => navigateTo('/import')}
                  className="p-1.5 text-gray-400 hover:text-white transition-colors cursor-pointer"
                  title="Scan photo of handwritten register or receipt"
                >
                  <Camera className="w-4 h-4" />
                </button>

                {/* Send Button */}
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

            {/* Bottom Quick Command Chips - Redirect to each page */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-3.5 text-xs">
              <button
                type="button"
                onClick={() => navigateTo('/sales')}
                className="px-3 py-1 bg-white hover:bg-purple-50 border border-purple-100 rounded-full text-gray-700 shadow-sm transition-all cursor-pointer"
              >
                📥 Today&apos;s sales
              </button>
              <button
                type="button"
                onClick={() => navigateTo('/invoices?action=create')}
                className="px-3 py-1 bg-white hover:bg-purple-50 border border-purple-100 rounded-full text-gray-700 shadow-sm transition-all cursor-pointer"
              >
                🧾 Create invoice
              </button>
              <button
                type="button"
                onClick={() => navigateTo('/inventory')}
                className="px-3 py-1 bg-white hover:bg-purple-50 border border-purple-100 rounded-full text-gray-700 shadow-sm transition-all cursor-pointer"
              >
                🔔 Low stock items
              </button>
              <button
                type="button"
                onClick={() => navigateTo('/customers')}
                className="px-3 py-1 bg-white hover:bg-purple-50 border border-purple-100 rounded-full text-gray-700 shadow-sm transition-all cursor-pointer"
              >
                👥 Follow-up customers
              </button>
              <button
                type="button"
                onClick={() => navigateTo('/connectors')}
                className="px-3 py-1 bg-white hover:bg-purple-50 border border-purple-100 rounded-full text-gray-700 shadow-sm transition-all cursor-pointer"
              >
                ✉️ Check emails & WhatsApp
              </button>
              <button
                type="button"
                onClick={() => navigateTo('/reports')}
                className="px-3 py-1 bg-white hover:bg-purple-50 border border-purple-100 rounded-full text-gray-700 shadow-sm transition-all cursor-pointer"
              >
                📊 Generate report
              </button>
              {/* Tamil language switch chip */}
              <button
                type="button"
                onClick={() => setLanguage(language === 'en' ? 'ta' : 'en')}
                className="px-3 py-1 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 font-bold rounded-full shadow-sm transition-all cursor-pointer"
                title="Switch speech & text language"
              >
                🌐 {language === 'en' ? 'தமிழ்' : 'English'}
              </button>
            </div>
          </div>
        </div>

        {/* REDIRECT NOTICE TOAST */}
        {redirectNotice && (
          <div className="max-w-md mx-auto mt-4 px-4 py-2.5 rounded-full bg-purple-600 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>{redirectNotice}</span>
          </div>
        )}

        {/* AI CONVERSATIONAL SPOKEN/TEXT RESPONSE BUBBLE */}
        {aiResponse && (
          <div className="max-w-3xl mx-auto mt-5 p-4 rounded-2xl bg-white/95 border border-purple-200 shadow-md flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
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
      </main>

      {/* Shared Footer with Product by LyKSpire */}
      <Footer />
    </div>
  );
}
