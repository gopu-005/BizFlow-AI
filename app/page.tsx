'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
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
  Calendar,
  ChevronDown,
  Volume2,
  VolumeX,
  CreditCard,
  Sparkles,
  Database,
  FileSpreadsheet,
  CheckCircle2,
  X,
  Loader2,
  RefreshCw,
  Building,
} from 'lucide-react';
import { AiVoiceOrb } from '@/components/AiVoiceOrb';
import { SalesSummaryPanel } from '@/components/panels/SalesSummaryPanel';
import { LowStockPanel } from '@/components/panels/LowStockPanel';
import { InvoiceDraftPanel } from '@/components/panels/InvoiceDraftPanel';
import { FollowUpsPanel } from '@/components/panels/FollowUpsPanel';
import { ImportDataPanel } from '@/components/panels/ImportDataPanel';
import { ConnectorsDialog } from '@/components/panels/ConnectorsDialog';
import { BillingModal } from '@/components/panels/BillingModal';
import { Business, ConnectorStatus, FollowUpTask, Product } from '@/types/erp';
import { voiceManager, VoiceLanguage } from '@/lib/voice/speech';

export default function BizFlowDashboard() {
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
  const [aiResponse, setAiResponse] = useState<{
    text: string;
    voiceText: string;
    lang: 'en' | 'ta';
  } | null>(null);

  // Contextual Active Panel
  const [activePanel, setActivePanel] = useState<
    'sales_summary' | 'low_stock' | 'create_invoice' | 'follow_ups' | 'connectors' | 'report_preview' | 'import_flow' | 'billing_modal' | null
  >(null);
  const [panelData, setPanelData] = useState<any>(null);

  // Connectors Status
  const [connectors, setConnectors] = useState<ConnectorStatus[]>([]);
  const [followUpsCount, setFollowUpsCount] = useState(3);
  const [lowStockCount, setLowStockCount] = useState(4);

  // Date selection
  const [selectedDateFilter, setSelectedDateFilter] = useState<'today' | 'week' | 'month'>('today');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showBusinessSwitcher, setShowBusinessSwitcher] = useState(false);

  // Workspace reference for smooth scrolling when panel appears
  const workspaceRef = useRef<HTMLDivElement>(null);

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

  // Execute conversational query
  const handleSendCommand = async (commandToRun?: string) => {
    const textToQuery = (commandToRun || inputText).trim();
    if (!textToQuery) return;

    setIsProcessing(true);
    setSpeechError(null);
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

        // Open matched contextual panel
        if (data.actionType) {
          setActivePanel(data.actionType as any);
          setPanelData(data.data);
          setTimeout(() => {
            workspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 150);
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

  const stopSpeaking = () => {
    voiceManager.stopSpeaking();
    setIsSpeaking(false);
  };

  // Direct trigger helpers for left menu & chips
  const triggerQuickAction = async (action: string) => {
    switch (action) {
      case 'sales':
        handleSendCommand("Today's sales");
        break;
      case 'inventory':
        handleSendCommand('Which products are low in stock?');
        break;
      case 'invoice':
        handleSendCommand('Create invoice for Priya');
        break;
      case 'followups':
        handleSendCommand('Show pending customer follow-ups');
        break;
      case 'mails':
        handleSendCommand('Check my emails');
        break;
      case 'whatsapp':
        handleSendCommand('Show WhatsApp orders');
        break;
      case 'report':
        handleSendCommand('Prepare monthly business report');
        break;
      case 'billing':
        setActivePanel('billing_modal');
        break;
      default:
        break;
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-[#fbfbfe] text-[#0f172a] font-sans antialiased overflow-x-hidden">
      {/* Subtle Background Radial Ambient Glows */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-radial-gradient blur-3xl opacity-80" />
      <div className="pointer-events-none absolute top-40 right-10 w-72 h-72 bg-purple-200/40 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute top-48 left-10 w-72 h-72 bg-indigo-200/30 rounded-full blur-3xl" />

      {/* FLOATING EDGE TABS (Desktop and Tablet Side Triggers for Drawers) */}
      <button
        onClick={() => setIsLeftDrawerOpen(true)}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-30 bg-white/95 hover:bg-purple-50 backdrop-blur-md border border-l-0 border-purple-200/90 rounded-r-2xl py-3 px-1.5 shadow-md text-purple-700 hover:text-purple-900 transition-all flex flex-col items-center gap-1.5 group hover:pl-2.5 cursor-pointer"
        title="Quick Business Commands"
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

      {/* LEFT SLIDE-OUT DRAWER — Quick Business Commands */}
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
                <h3 className="text-sm font-bold text-gray-900 font-heading">Quick Actions</h3>
                <p className="text-[11px] text-gray-500">Instant business shortcuts</p>
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
              onClick={() => {
                triggerQuickAction('sales');
                setIsLeftDrawerOpen(false);
              }}
              className="w-full text-left p-2.5 rounded-2xl hover:bg-purple-50/80 flex items-center gap-3 transition-colors group"
            >
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-900">Today&apos;s Sales</div>
                <div className="text-[11px] text-gray-500">Show today&apos;s sales summary</div>
              </div>
            </button>

            {/* 2. Inventory Status */}
            <button
              onClick={() => {
                triggerQuickAction('inventory');
                setIsLeftDrawerOpen(false);
              }}
              className="w-full text-left p-2.5 rounded-2xl hover:bg-amber-50/80 flex items-center gap-3 transition-colors group"
            >
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                  Inventory Status
                  {lowStockCount > 0 && (
                    <span className="bg-amber-100 text-amber-800 text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                      {lowStockCount}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-gray-500">Which products are low in stock?</div>
              </div>
            </button>

            {/* 3. Create Invoice */}
            <button
              onClick={() => {
                triggerQuickAction('invoice');
                setIsLeftDrawerOpen(false);
              }}
              className="w-full text-left p-2.5 rounded-2xl hover:bg-blue-50/80 flex items-center gap-3 transition-colors group"
            >
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-900">Create Invoice</div>
                <div className="text-[11px] text-gray-500">Make a new invoice</div>
              </div>
            </button>

            {/* 4. Customer Follow-ups */}
            <button
              onClick={() => {
                triggerQuickAction('followups');
                setIsLeftDrawerOpen(false);
              }}
              className="w-full text-left p-2.5 rounded-2xl hover:bg-violet-50/80 flex items-center gap-3 transition-colors group"
            >
              <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0 group-hover:bg-violet-600 group-hover:text-white transition-colors">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                  Customer Follow-ups
                  <span className="bg-purple-100 text-purple-800 text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                    {followUpsCount}
                  </span>
                </div>
                <div className="text-[11px] text-gray-500">Show pending follow-ups</div>
              </div>
            </button>

            {/* 5. Check My Mails */}
            <button
              onClick={() => {
                triggerQuickAction('mails');
                setIsLeftDrawerOpen(false);
              }}
              className="w-full text-left p-2.5 rounded-2xl hover:bg-red-50/80 flex items-center gap-3 transition-colors group"
            >
              <div className="w-8 h-8 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0 group-hover:bg-red-600 group-hover:text-white transition-colors">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-900">Check My Mails</div>
                <div className="text-[11px] text-gray-500">How many new emails?</div>
              </div>
            </button>

            {/* 6. WhatsApp Orders */}
            <button
              onClick={() => {
                triggerQuickAction('whatsapp');
                setIsLeftDrawerOpen(false);
              }}
              className="w-full text-left p-2.5 rounded-2xl hover:bg-emerald-50/80 flex items-center gap-3 transition-colors group"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-900">WhatsApp Orders</div>
                <div className="text-[11px] text-gray-500">Show new WhatsApp orders</div>
              </div>
            </button>

            {/* 7. Monthly Report */}
            <button
              onClick={() => {
                triggerQuickAction('report');
                setIsLeftDrawerOpen(false);
              }}
              className="w-full text-left p-2.5 rounded-2xl hover:bg-indigo-50/80 flex items-center gap-3 transition-colors group"
            >
              <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-900">Monthly Report</div>
                <div className="text-[11px] text-gray-500">Generate and download</div>
              </div>
            </button>
          </div>
        </div>

        {/* Hand-drawn annotation note at bottom of drawer */}
        <div className="pt-4 border-t border-purple-100 font-handwritten text-purple-600 text-base rotate-[-1deg] flex items-center gap-1.5 opacity-90 select-none">
          <span>Just ask or click.. Everything in one place.</span>
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
              onClick={() => {
                setIsRightDrawerOpen(false);
                setActivePanel('connectors');
              }}
              className="w-full text-left p-2.5 rounded-2xl hover:bg-gray-50 flex items-center justify-between transition-colors border border-transparent hover:border-gray-200"
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
              onClick={() => {
                setIsRightDrawerOpen(false);
                setActivePanel('connectors');
              }}
              className="w-full text-left p-2.5 rounded-2xl hover:bg-gray-50 flex items-center justify-between transition-colors border border-transparent hover:border-gray-200"
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
              onClick={() => {
                setIsRightDrawerOpen(false);
                setActivePanel('connectors');
              }}
              className="w-full text-left p-2.5 rounded-2xl hover:bg-gray-50 flex items-center justify-between transition-colors border border-transparent hover:border-gray-200"
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
              onClick={() => {
                setIsRightDrawerOpen(false);
                setActivePanel('import_flow');
              }}
              className="w-full text-left p-2.5 rounded-2xl hover:bg-gray-50 flex items-center justify-between transition-colors border border-transparent hover:border-gray-200"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-900">Excel / CSV Import</div>
                  <div className="text-[11px] text-emerald-600 font-medium">Ready</div>
                </div>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </button>
          </div>
        </div>

        {/* Bottom connector settings hint */}
        <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
          <span>Manage integrations</span>
          <button
            onClick={() => {
              setIsRightDrawerOpen(false);
              setActivePanel('connectors');
            }}
            className="font-bold text-purple-700 hover:text-purple-900 transition-colors"
          >
            Configure →
          </button>
        </div>
      </aside>

      {/* TOP HEADER */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-3 sm:px-8 py-3.5 sm:py-5 flex items-center justify-between gap-2 shrink-0">
        {/* Brand Logo & Name (Optimized with responsive font size so BizFlow AI looks proper on mobile) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="relative w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-purple-900 via-purple-600 to-fuchsia-400 p-[2px] shadow-sm">
            <div className="w-full h-full rounded-full bg-[#0a0518] flex items-center justify-center overflow-hidden">
              <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 blur-[2px] animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-base sm:text-xl font-bold tracking-tight text-gray-900 font-heading">
                BizFlow AI
              </span>
              <span className="hidden md:inline-block text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                ERP
              </span>
            </div>
            <div className="text-[10px] sm:text-[11px] text-gray-500 font-medium leading-none">
              Business Assistant
            </div>
          </div>
        </div>

        {/* Top Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3">

          {/* Subscription / Plan Badge (Click opens Billing Modal) */}
          <button
            onClick={() => setActivePanel('billing_modal')}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-50 hover:bg-purple-100 border border-purple-200 text-xs font-semibold text-purple-700 transition-all shadow-sm group"
            title="Subscription & Billing Management"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600 group-hover:rotate-12 transition-transform" />
            <span>Plan</span>
          </button>

          {/* Date Selector Pill (Optimized for mobile) */}
          <div className="relative">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-2xl bg-white/90 border border-purple-100 shadow-card-soft text-xs font-medium text-gray-700 hover:border-purple-300 transition-all"
            >
              <Calendar className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span className="hidden sm:inline">Today 15 Oct 2024</span>
              <span className="sm:hidden text-[11px]">15 Oct</span>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>

            {showDatePicker && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-30 text-xs">
                <button
                  onClick={() => {
                    setSelectedDateFilter('today');
                    setShowDatePicker(false);
                    handleSendCommand("Today's sales");
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-purple-50 text-gray-700 font-medium"
                >
                  Today (15 Oct 2024)
                </button>
                <button
                  onClick={() => {
                    setSelectedDateFilter('week');
                    setShowDatePicker(false);
                    handleSendCommand('Show weekly sales and performance');
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-purple-50 text-gray-700"
                >
                  This Week (09 – 15 Oct)
                </button>
                <button
                  onClick={() => {
                    setSelectedDateFilter('month');
                    setShowDatePicker(false);
                    handleSendCommand('Prepare monthly business report');
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-purple-50 text-gray-700"
                >
                  This Month (Oct 2024)
                </button>
              </div>
            )}
          </div>

          {/* User Avatar & Business Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowBusinessSwitcher(!showBusinessSwitcher)}
              className="flex items-center gap-1.5 p-1 pl-1.5 sm:pl-2 rounded-2xl bg-white/90 border border-purple-100 shadow-card-soft hover:border-purple-300 transition-all"
            >
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 text-white text-xs font-bold flex items-center justify-center shadow-inner">
                {currentBusiness.ownerName.charAt(0)}
              </div>
              <ChevronDown className="w-3 h-3 text-gray-400 mr-0.5" />
            </button>

            {showBusinessSwitcher && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 p-2 z-30 text-xs space-y-1">
                <div className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Switch Business
                </div>
                {businesses.map((biz) => (
                  <button
                    key={biz.id}
                    onClick={() => {
                      setCurrentBusinessId(biz.id);
                      setShowBusinessSwitcher(false);
                    }}
                    className={`w-full text-left p-2 rounded-lg flex items-center justify-between transition-colors ${
                      biz.id === currentBusinessId
                        ? 'bg-purple-50 text-purple-900 font-bold'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div>
                      <div>{biz.name}</div>
                      <div className="text-[10px] text-gray-400 font-normal">{biz.type}</div>
                    </div>
                    {biz.id === currentBusinessId && (
                      <CheckCircle2 className="w-4 h-4 text-purple-600" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER — CLEAN, CENTER-FOCUSED DESKTOP & MOBILE VIEW */}
      <main className="relative z-10 flex-1 w-full max-w-5xl mx-auto px-4 sm:px-8 flex flex-col justify-center items-center py-4 sm:py-6">
        {/* CENTER STAGE: GREETING, REALISTIC NEON SPHERE WITH DYNAMIC AUDIO LINES, AND MAIN CAPSULE INPUT */}
        <div className="w-full max-w-2xl sm:max-w-3xl mx-auto flex flex-col items-center text-center my-auto">
          {/* Greeting */}
          <div className="text-xs font-medium text-gray-500 mb-1">
            Good Morning, {currentBusiness.ownerName.split(' ')[0]}
          </div>

          {/* Main Headline */}
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-gray-900 font-heading mb-1.5">
            Ask anything about{' '}
            <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-fuchsia-600 bg-clip-text text-transparent">
              your business
            </span>
          </h1>

          {/* Scope Subtitle */}
          <div className="text-[11px] sm:text-xs text-gray-400 font-medium mb-3 flex flex-wrap justify-center gap-1">
            <span>Sales</span> · <span>Inventory</span> · <span>Customers</span> ·{' '}
            <span>Invoices</span> · <span>Reports</span> · <span>Mails</span> ·{' '}
            <span>WhatsApp</span> · <span>and more...</span>
          </div>

          {/* 3D GALAXY ORB WITH FLANKING DYNAMIC AUDIO LINES (NO FLOATING SPEECH BUBBLES) */}
          <div className="relative w-full flex items-center justify-center select-none my-0">
            <AiVoiceOrb
              isListening={isListening}
              isSpeaking={isSpeaking}
              isProcessing={isProcessing}
              onClick={toggleListening}
            />
          </div>

          {/* Voice Indicator: Only 1 Voice Used (Removed Male/Female toggle; Stop button shown only when speaking) */}
          {isSpeaking && (
            <div className="flex items-center gap-2 my-2 animate-in fade-in duration-200">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100/90 border border-purple-200 text-purple-800 text-xs font-semibold">
                <Volume2 className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
                <span>BizFlow Voice Responding...</span>
              </div>
              <button
                type="button"
                onClick={stopSpeaking}
                className="flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-full border border-rose-200 transition-colors shadow-sm"
              >
                <VolumeX className="w-3 h-3" /> Stop
              </button>
            </div>
          )}

          {/* Microphone permission or speech error banner */}
          {speechError && (
            <div className="mb-2 text-[11px] text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1 rounded-lg">
              ⚠️ {speechError}
            </div>
          )}

          {/* MAIN PROMINENT CAPSULE INPUT BAR */}
          <div className="w-full max-w-xl relative mt-2">
            <div className="bg-[#0b0819] text-white rounded-full p-2 pl-3 pr-2.5 shadow-capsule border border-purple-500/40 flex items-center gap-2 transition-all focus-within:border-purple-400 focus-within:shadow-[0_0_25px_rgba(168,85,247,0.4)]">
              {/* Glowing Mic Button */}
              <button
                type="button"
                onClick={toggleListening}
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all ${
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
                    : 'Ask anything about your business...'
                }
                className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-gray-400 focus:outline-none px-1"
              />

              {/* Action Icons */}
              <div className="flex items-center gap-1.5 shrink-0 pr-1">
                {/* Paperclip (Excel / CSV Import) */}
                <button
                  type="button"
                  onClick={() => setActivePanel('import_flow')}
                  className="p-1.5 text-gray-400 hover:text-white transition-colors"
                  title="Import CSV or Excel spreadsheet"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                {/* Camera (Handwritten register / bill photo OCR) */}
                <button
                  type="button"
                  onClick={() => setActivePanel('import_flow')}
                  className="p-1.5 text-gray-400 hover:text-white transition-colors"
                  title="Scan photo of handwritten register or receipt"
                >
                  <Camera className="w-4 h-4" />
                </button>

                {/* Send Button */}
                <button
                  type="button"
                  onClick={() => handleSendCommand()}
                  disabled={isProcessing}
                  className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white flex items-center justify-center hover:opacity-95 active:scale-95 transition-all shadow-md"
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

            {/* Bottom Quick Command Chips */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-3.5 text-xs">
              <button
                type="button"
                onClick={() => triggerQuickAction('sales')}
                className="px-3 py-1 bg-white hover:bg-purple-50 border border-purple-100 rounded-full text-gray-700 shadow-sm transition-all"
              >
                📥 Today&apos;s sales
              </button>
              <button
                type="button"
                onClick={() => triggerQuickAction('invoice')}
                className="px-3 py-1 bg-white hover:bg-purple-50 border border-purple-100 rounded-full text-gray-700 shadow-sm transition-all"
              >
                🧾 Create invoice
              </button>
              <button
                type="button"
                onClick={() => triggerQuickAction('inventory')}
                className="px-3 py-1 bg-white hover:bg-purple-50 border border-purple-100 rounded-full text-gray-700 shadow-sm transition-all"
              >
                🔔 Low stock items
              </button>
              <button
                type="button"
                onClick={() => triggerQuickAction('followups')}
                className="px-3 py-1 bg-white hover:bg-purple-50 border border-purple-100 rounded-full text-gray-700 shadow-sm transition-all"
              >
                👥 Follow-up customers
              </button>
              <button
                type="button"
                onClick={() => triggerQuickAction('mails')}
                className="px-3 py-1 bg-white hover:bg-purple-50 border border-purple-100 rounded-full text-gray-700 shadow-sm transition-all"
              >
                ✉️ Check emails
              </button>
              <button
                type="button"
                onClick={() => triggerQuickAction('report')}
                className="px-3 py-1 bg-white hover:bg-purple-50 border border-purple-100 rounded-full text-gray-700 shadow-sm transition-all"
              >
                📊 Generate report
              </button>
              {/* Tamil language switch chip */}
              <button
                type="button"
                onClick={() => setLanguage(language === 'en' ? 'ta' : 'en')}
                className="px-3 py-1 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 font-bold rounded-full shadow-sm transition-all"
                title="Switch speech & text language"
              >
                🌐 {language === 'en' ? 'தமிழ்' : 'English'}
              </button>
            </div>
          </div>
        </div>

        {/* AI CONVERSATIONAL SPOKEN/TEXT RESPONSE BUBBLE (IF AVAILABLE) */}
        {aiResponse && (
          <div className="max-w-3xl mx-auto mt-6 p-4 rounded-2xl bg-white/95 border border-purple-200 shadow-md flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-900">BizFlow Assistant Response</span>
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

        {/* CONTEXTUAL WORKSPACE — INLINE PREVIEWS & ACTION PANELS */}
        <div ref={workspaceRef} className="max-w-4xl mx-auto mt-6">
          {activePanel === 'sales_summary' && (
            <SalesSummaryPanel
              data={panelData}
              business={currentBusiness}
              onClose={() => setActivePanel(null)}
              onAction={(action) => {
                if (action === 'create_invoice') setActivePanel('create_invoice');
              }}
            />
          )}

          {activePanel === 'low_stock' && (
            <LowStockPanel
              products={panelData?.lowStock || []}
              business={currentBusiness}
              onClose={() => setActivePanel(null)}
            />
          )}

          {activePanel === 'create_invoice' && (
            <InvoiceDraftPanel
              initialData={panelData}
              business={currentBusiness}
              onClose={() => setActivePanel(null)}
              onInvoiceCreated={() => {
                loadBadges();
              }}
            />
          )}

          {activePanel === 'follow_ups' && (
            <FollowUpsPanel
              tasks={panelData?.tasks || []}
              business={currentBusiness}
              onClose={() => setActivePanel(null)}
              onRefresh={loadBadges}
            />
          )}

          {activePanel === 'import_flow' && (
            <ImportDataPanel
              business={currentBusiness}
              onClose={() => setActivePanel(null)}
              onImportSuccess={loadBadges}
            />
          )}

          {activePanel === 'connectors' && (
            <ConnectorsDialog
              connectors={connectors}
              business={currentBusiness}
              onClose={() => setActivePanel(null)}
              onUpdateConnector={loadConnectors}
            />
          )}

          {activePanel === 'billing_modal' && (
            <BillingModal
              business={currentBusiness}
              onClose={() => setActivePanel(null)}
            />
          )}

          {activePanel === 'report_preview' && (
            <SalesSummaryPanel
              data={panelData}
              business={currentBusiness}
              onClose={() => setActivePanel(null)}
            />
          )}
        </div>
      </main>

      {/* FOOTER */}
      <footer className="relative z-20 w-full py-4 text-center mt-auto border-t border-purple-100/60 bg-white/40 backdrop-blur-xs text-xs text-gray-500 font-medium shrink-0">
        <div className="flex items-center justify-center gap-1.5">
          <span>Product by</span>
          <span className="font-bold text-gray-800 tracking-wide font-heading">LyKSpire</span>
        </div>
      </footer>
    </div>
  );
}
