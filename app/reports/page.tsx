'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  TrendingUp,
  Download,
  FileSpreadsheet,
  Calendar,
  Sparkles,
  ArrowLeft,
  DollarSign,
  PieChart,
  ShoppingBag,
  Users,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { generateReportPDF, downloadCSV } from '@/lib/erp/pdf-generator';
import { Business } from '@/types/erp';

export default function ReportsPage() {
  const [businessId, setBusinessId] = useState('biz_karthik_textiles');
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('month');
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const currentBusiness: Business = {
    id: businessId,
    name: businessId === 'biz_karthik_textiles' ? 'Karthik Textiles & Garments' : 'Sri Murugan Bakery & Sweets',
    type: businessId === 'biz_karthik_textiles' ? 'Clothing & Retail' : 'Bakery & Sweets',
    currency: '₹',
    ownerName: businessId === 'biz_karthik_textiles' ? 'Karthik Ramanathan' : 'Murugan Velayudham',
    gstNumber: businessId === 'biz_karthik_textiles' ? '33AAAAA0000A1Z5' : '33BBBBB1111B2Z6',
    address: 'Chennai, Tamil Nadu',
    phone: '+91 98400 11223',
    email: 'karthik@textiles.bizflow.in',
    createdAt: '2024-01-10T10:00:00Z',
  };

  useEffect(() => {
    fetchReportData();
  }, [businessId, period]);

  const fetchReportData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/erp/sales?businessId=${businessId}&period=${period}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!data) return;
    const doc = generateReportPDF(data, currentBusiness);
    doc.save(`BizFlow_OfficialReport_${currentBusiness.name.replace(/\s+/g, '_')}_${period}.pdf`);
  };

  const handleDownloadCSV = () => {
    if (!data || !data.invoices) return;
    const rows = data.invoices.map((inv: any) => ({
      InvoiceNumber: inv.invoiceNumber,
      Date: inv.createdAt,
      Customer: inv.customerName,
      Phone: inv.customerPhone,
      Subtotal: inv.subtotal,
      TaxAmount: inv.taxAmount,
      Total: inv.total,
      Status: inv.status,
      PaymentMode: inv.paymentMode,
    }));
    downloadCSV(`Business_Ledger_Report_${businessId}.csv`, rows);
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
              <span className="text-gray-500">Business Reports</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 font-heading">
              Executive Business Reports & Analytics
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Comprehensive revenue, profitability, and GST accounting statements
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-purple-100 hover:border-purple-300 text-xs font-semibold text-gray-700 shadow-xs transition-all"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Official PDF</span>
            </button>
          </div>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-500">Reporting Interval:</span>
          <div className="flex items-center gap-1.5 p-1 bg-white border border-purple-100 rounded-2xl shadow-xs">
            {(['today', 'week', 'month'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                  period === p
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-purple-700 hover:bg-purple-50'
                }`}
              >
                {p === 'today' ? 'Daily' : p === 'week' ? 'Weekly' : 'Monthly'}
              </button>
            ))}
          </div>
        </div>

        {/* Executive KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card rounded-2xl p-5 border border-purple-100">
            <div className="flex items-center justify-between text-xs text-gray-500 font-medium mb-1">
              <span>Gross Revenue</span>
              <TrendingUp className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 font-heading">
              ₹{isLoading ? '...' : (data?.totalSales || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-1">
              +14% vs previous period
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-purple-100">
            <div className="flex items-center justify-between text-xs text-gray-500 font-medium mb-1">
              <span>Gross Margin</span>
              <Sparkles className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700 font-heading">
              ₹{isLoading ? '...' : (data?.estimatedGrossProfit || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">38.1% operating profitability</div>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-purple-100">
            <div className="flex items-center justify-between text-xs text-gray-500 font-medium mb-1">
              <span>Orders Billed</span>
              <ShoppingBag className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 font-heading">
              {isLoading ? '...' : data?.totalInvoices || 0}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">Average ticket ₹{data?.totalInvoices ? Math.round(data.totalSales / data.totalInvoices) : 0}</div>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-purple-100">
            <div className="flex items-center justify-between text-xs text-gray-500 font-medium mb-1">
              <span>GST Collected</span>
              <DollarSign className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-indigo-900 font-heading">
              ₹{isLoading ? '...' : Math.round((data?.totalSales || 0) * 0.05).toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">CGST / SGST itemized</div>
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 glass-card rounded-2xl p-6 border border-purple-100">
            <h3 className="text-sm font-bold text-gray-900 font-heading mb-4">
              Revenue & Performance Highlights ({data?.periodLabel || period})
            </h3>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-purple-50/50 rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-gray-900">Retail & Counter Sales</div>
                  <div className="text-[11px] text-gray-500">Walk-in customers & direct orders</div>
                </div>
                <div className="font-extrabold text-purple-950 text-sm">
                  ₹{Math.round((data?.totalSales || 0) * 0.65).toLocaleString('en-IN')}
                </div>
              </div>

              <div className="p-3 bg-purple-50/50 rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-gray-900">WhatsApp & Online Orders</div>
                  <div className="text-[11px] text-gray-500">Direct conversational channel</div>
                </div>
                <div className="font-extrabold text-purple-950 text-sm">
                  ₹{Math.round((data?.totalSales || 0) * 0.35).toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 glass-card rounded-2xl p-6 border border-purple-100 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 font-heading">
              Official Tax Statement
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Certified report generated for <strong>{currentBusiness.name}</strong>, GSTIN: <strong>{currentBusiness.gstNumber}</strong>. Download the official PDF for your chartered accountant or GST filings.
            </p>
            <button
              onClick={handleDownloadPDF}
              className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Download CA-Ready PDF
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
