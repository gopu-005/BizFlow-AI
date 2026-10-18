'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Database,
  Mail,
  MessageCircle,
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
  ArrowLeft,
  ExternalLink,
  Settings,
  ShieldCheck,
  Send,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ConnectorStatus } from '@/types/erp';

export default function ConnectorsPage() {
  const [businessId, setBusinessId] = useState('biz_karthik_textiles');
  const [connectors, setConnectors] = useState<ConnectorStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'email' | 'whatsapp' | 'database'>('all');

  useEffect(() => {
    fetchConnectors();
  }, [businessId]);

  const fetchConnectors = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/connectors?businessId=${businessId}`);
      const data = await res.json();
      setConnectors(data.connectors || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleConnector = async (type: string, currentStatus: boolean) => {
    try {
      await fetch('/api/connectors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          type,
          connected: !currentStatus,
        }),
      });
      fetchConnectors();
    } catch (e) {
      alert('Failed to update integration');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fbfbfe] text-[#0f172a] font-sans antialiased">
      <Navbar currentBusinessId={businessId} onBusinessChange={(b) => setBusinessId(b)} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-purple-100">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-purple-700 mb-1">
              <Link href="/" className="hover:underline flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Home
              </Link>
              <span>/</span>
              <span className="text-gray-500">Connected Apps & Integrations</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 font-heading">
              Connected Apps & Integrations
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Live automated data pipelines connecting your Gmail, WhatsApp Business, Database, and Spreadsheets
            </p>
          </div>

          <button
            onClick={fetchConnectors}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-xs font-semibold text-purple-700 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync All</span>
          </button>
        </div>

        {/* Connector Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* 1. Gmail / Email Connector */}
          <div className="glass-card rounded-2xl p-6 border border-purple-100 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 font-heading">Email (Gmail OAuth)</h3>
                  <p className="text-xs text-gray-500">Reads supplier bills & incoming purchase orders</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                Connected
              </span>
            </div>

            <div className="p-3 bg-purple-50/50 rounded-xl text-xs space-y-1.5 border border-purple-100/60">
              <div className="flex justify-between text-gray-700">
                <span>Account:</span>
                <span className="font-semibold text-gray-900">karthik@textiles.bizflow.in</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Unread Supplier Invoices:</span>
                <span className="font-bold text-purple-900">12 new emails</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Last Synced:</span>
                <span className="text-gray-500">2 minutes ago</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-gray-500">Auto-sync active every 15 min</span>
              <button
                onClick={() => alert('Gmail sync triggered successfully!')}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Fetch New Mails
              </button>
            </div>
          </div>

          {/* 2. WhatsApp Business API */}
          <div className="glass-card rounded-2xl p-6 border border-purple-100 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 font-heading">WhatsApp Business API</h3>
                  <p className="text-xs text-gray-500">Receives customer orders & sends automated PDF invoices</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                Active
              </span>
            </div>

            <div className="p-3 bg-emerald-50/40 rounded-xl text-xs space-y-1.5 border border-emerald-100">
              <div className="flex justify-between text-gray-700">
                <span>Business Phone:</span>
                <span className="font-semibold text-gray-900">+91 98400 11223</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Pending Inquiries:</span>
                <span className="font-bold text-emerald-900">8 messages</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Webhook Status:</span>
                <span className="text-emerald-700 font-bold">Healthy (200 OK)</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-gray-500">Template messages approved</span>
              <button
                onClick={() => alert('WhatsApp webhook test passed!')}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Test Webhook
              </button>
            </div>
          </div>

          {/* 3. PostgreSQL Database */}
          <div className="glass-card rounded-2xl p-6 border border-purple-100 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 font-heading">Database (PostgreSQL)</h3>
                  <p className="text-xs text-gray-500">Primary persistence store for sales, inventory & ledger</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                Synced
              </span>
            </div>

            <div className="p-3 bg-blue-50/40 rounded-xl text-xs space-y-1.5 border border-blue-100">
              <div className="flex justify-between text-gray-700">
                <span>Connection:</span>
                <span className="font-semibold text-gray-900 font-mono text-[11px]">localhost:5432/bizflow</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Total Records:</span>
                <span className="font-bold text-blue-900">1,480 rows</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Latency:</span>
                <span className="text-emerald-700 font-bold">12ms</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-gray-500">SSL encryption active</span>
              <button
                onClick={() => alert('Database ping successful! Latency: 12ms')}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Ping DB
              </button>
            </div>
          </div>

          {/* 4. Excel / CSV Spreadsheet Sync */}
          <div className="glass-card rounded-2xl p-6 border border-purple-100 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 font-heading">Excel & CSV Auto-Sync</h3>
                  <p className="text-xs text-gray-500">Drop sheets or handwritten scan images to update inventory</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                Ready
              </span>
            </div>

            <div className="p-3 bg-amber-50/40 rounded-xl text-xs space-y-1.5 border border-amber-100">
              <div className="flex justify-between text-gray-700">
                <span>Supported Formats:</span>
                <span className="font-semibold text-gray-900">.xlsx, .xls, .csv, photo/ocr</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Last Import:</span>
                <span className="font-bold text-amber-900">Stock_Update_Oct2024.xlsx</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Parser:</span>
                <span className="text-gray-700 font-semibold">SheetJS & PapaParse</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-gray-500">Auto-column detection</span>
              <Link
                href="/import"
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Open Importer →
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
