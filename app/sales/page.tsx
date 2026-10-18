'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Receipt,
  Download,
  CreditCard,
  FileSpreadsheet,
  ArrowRight,
  PlusCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowLeft,
  Search,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { generateReportPDF, downloadCSV } from '@/lib/erp/pdf-generator';
import { Business } from '@/types/erp';

export default function SalesPage() {
  const [businessId, setBusinessId] = useState('biz_karthik_textiles');
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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
    fetchSalesData();
  }, [businessId, period]);

  const fetchSalesData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/erp/sales?businessId=${businessId}&period=${period}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!data) return;
    const doc = generateReportPDF(data, currentBusiness);
    doc.save(`BizFlow_Sales_${period}_${Date.now()}.pdf`);
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
      PaymentMode: inv.paymentMode,
      Status: inv.status,
    }));
    downloadCSV(`Sales_Ledger_${period}.csv`, rows);
  };

  const filteredInvoices = (data?.invoices || []).filter((inv: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      inv.customerName?.toLowerCase().includes(q) ||
      inv.invoiceNumber?.toLowerCase().includes(q) ||
      inv.paymentMode?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#fbfbfe] text-[#0f172a] font-sans antialiased">
      <Navbar currentBusinessId={businessId} onBusinessChange={(b) => setBusinessId(b)} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Top Header & Breadcrumb */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-purple-100">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-purple-700 mb-1">
              <Link href="/" className="hover:underline flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Home
              </Link>
              <span>/</span>
              <span className="text-gray-500">Sales & Revenue</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 font-heading">
              Sales Ledger & Performance
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Verified transaction ledger records for {currentBusiness.name}
            </p>
          </div>

          {/* Period Selector Tabs */}
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
                {p === 'today' ? 'Today' : p === 'week' ? 'This Week' : 'This Month'}
              </button>
            ))}
          </div>
        </div>

        {/* Action Bar (Export & New Invoice) */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search invoice or customer..."
              className="w-full bg-white border border-purple-100 rounded-xl pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:border-purple-400"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleDownloadCSV}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-purple-100 hover:border-purple-300 text-xs font-semibold text-gray-700 shadow-xs transition-all"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-purple-100 hover:border-purple-300 text-xs font-semibold text-gray-700 shadow-xs transition-all"
            >
              <Download className="w-3.5 h-3.5 text-purple-600" />
              <span>Download PDF</span>
            </button>
            <Link
              href="/invoices"
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>New Invoice</span>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Sales */}
          <div className="glass-card rounded-2xl p-5 border border-purple-100">
            <div className="flex items-center justify-between text-xs text-gray-500 font-medium mb-1">
              <span>Total Revenue</span>
              <TrendingUp className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 font-heading">
              ₹{isLoading ? '...' : (data?.totalSales || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
              <span>Verified transactions</span>
            </div>
          </div>

          {/* Gross Profit */}
          <div className="glass-card rounded-2xl p-5 border border-purple-100">
            <div className="flex items-center justify-between text-xs text-gray-500 font-medium mb-1">
              <span>Est. Gross Profit</span>
              <Sparkles className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700 font-heading">
              ₹{isLoading ? '...' : (data?.estimatedGrossProfit || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">~38% operating margin</div>
          </div>

          {/* Invoices Count */}
          <div className="glass-card rounded-2xl p-5 border border-purple-100">
            <div className="flex items-center justify-between text-xs text-gray-500 font-medium mb-1">
              <span>Total Invoices</span>
              <Receipt className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 font-heading">
              {isLoading ? '...' : data?.totalInvoices || 0}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">100% completed & billed</div>
          </div>

          {/* Average Order Value */}
          <div className="glass-card rounded-2xl p-5 border border-purple-100">
            <div className="flex items-center justify-between text-xs text-gray-500 font-medium mb-1">
              <span>Average Order</span>
              <CreditCard className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 font-heading">
              ₹{isLoading ? '...' : data?.totalInvoices ? Math.round(data.totalSales / data.totalInvoices).toLocaleString('en-IN') : 0}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">Per transaction ticket</div>
          </div>
        </div>

        {/* Payment Modes Breakdown */}
        {data?.paymentModes && (
          <div className="glass-card rounded-2xl p-5 border border-purple-100">
            <h3 className="text-sm font-bold text-gray-900 font-heading mb-3">
              Payment Method Breakdown
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {Object.entries(data.paymentModes).map(([mode, amt]: [string, any]) => (
                <div key={mode} className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] uppercase font-bold text-gray-500">{mode}</div>
                    <div className="text-base font-bold text-purple-900">₹{amt.toLocaleString('en-IN')}</div>
                  </div>
                  <div className="text-xs font-semibold text-purple-600">
                    {data.totalSales ? `${Math.round((amt / data.totalSales) * 100)}%` : '0%'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transactions Table */}
        <div className="glass-card rounded-2xl border border-purple-100 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 font-heading">
              Transaction Ledger ({filteredInvoices.length})
            </h3>
            <span className="text-xs text-gray-500">Period: {data?.periodLabel || period}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-purple-50/60 border-b border-purple-100 text-purple-900 font-bold">
                  <th className="p-3">Invoice #</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Payment</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-gray-500">
                      No invoices found for this selection.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv: any) => (
                    <tr key={inv.id || inv.invoiceNumber} className="hover:bg-purple-50/30 transition-colors">
                      <td className="p-3 font-bold text-gray-900">{inv.invoiceNumber}</td>
                      <td className="p-3">
                        <div className="font-semibold text-gray-900">{inv.customerName}</div>
                        <div className="text-[10px] text-gray-500">{inv.customerPhone}</div>
                      </td>
                      <td className="p-3 text-gray-600">
                        {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('en-IN') : 'Today'}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-semibold text-[10px] uppercase">
                          {inv.paymentMode || 'UPI'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Paid</span>
                        </span>
                      </td>
                      <td className="p-3 text-right font-extrabold text-gray-900 text-sm">
                        ₹{(inv.total || 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
