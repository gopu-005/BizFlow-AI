'use client';

import React from 'react';
import { TrendingUp, ShoppingBag, Receipt, Sparkles, Download, ArrowRight, X } from 'lucide-react';
import { generateReportPDF, downloadCSV } from '@/lib/erp/pdf-generator';
import { Business } from '@/types/erp';

interface SalesSummaryPanelProps {
  data: any;
  business: Business;
  onClose: () => void;
  onAction?: (action: string) => void;
}

export const SalesSummaryPanel: React.FC<SalesSummaryPanelProps> = ({
  data,
  business,
  onClose,
  onAction,
}) => {
  if (!data) return null;

  const handleDownloadPDF = () => {
    const doc = generateReportPDF(data, business);
    doc.save(`BizFlow_SalesReport_${business.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
  };

  const handleDownloadCSV = () => {
    const rows = (data.invoices || []).map((inv: any) => ({
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
    downloadCSV(`Sales_Register_${business.id}.csv`, rows);
  };

  return (
    <div className="w-full glass-card rounded-2xl p-6 shadow-xl border border-purple-200/70 transition-all animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-purple-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700 shadow-sm">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 font-heading">
              Sales & Performance — {data.periodLabel}
            </h3>
            <p className="text-xs text-gray-500">Verified transaction ledger records for {business.name}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5">
        <div className="bg-gradient-to-br from-purple-50/80 to-indigo-50/40 p-4 rounded-xl border border-purple-100/80">
          <div className="text-xs font-medium text-purple-700 mb-1 flex items-center gap-1.5">
            <Receipt className="w-3.5 h-3.5" /> Total Sales
          </div>
          <div className="text-xl sm:text-2xl font-bold text-gray-900">
            {business.currency}{data.totalSales.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">{data.totalInvoices} Invoices Issued</div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50/80 to-teal-50/40 p-4 rounded-xl border border-emerald-100/80">
          <div className="text-xs font-medium text-emerald-700 mb-1 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Est. Gross Profit
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-900">
            {business.currency}{data.estimatedGrossProfit.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-emerald-700 font-medium mt-1">
            {data.profitMarginPercent}% Margin
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50/80 to-indigo-50/40 p-4 rounded-xl border border-blue-100/80">
          <div className="text-xs font-medium text-blue-700 mb-1 flex items-center gap-1.5">
            <ShoppingBag className="w-3.5 h-3.5" /> Avg Order Value
          </div>
          <div className="text-xl sm:text-2xl font-bold text-gray-900">
            {business.currency}{data.avgOrderValue.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">Per customer bill</div>
        </div>

        <div className="bg-gradient-to-br from-amber-50/80 to-orange-50/40 p-4 rounded-xl border border-amber-100/80">
          <div className="text-xs font-medium text-amber-700 mb-1 flex items-center gap-1.5">
            Tax Collected (GST)
          </div>
          <div className="text-xl sm:text-2xl font-bold text-gray-900">
            {business.currency}{data.totalTax.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">Ready for GST return</div>
        </div>
      </div>

      {/* Top Products Breakdown */}
      {data.topSelling && data.topSelling.length > 0 && (
        <div className="mb-5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
            Top Selling Items Today
          </h4>
          <div className="space-y-2">
            {data.topSelling.slice(0, 4).map((item: any, idx: number) => {
              const pct = data.totalSales > 0 ? Math.round((item.revenue / data.totalSales) * 100) : 0;
              return (
                <div key={idx} className="bg-white/90 p-2.5 px-3 rounded-lg border border-gray-100">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-gray-800">{item.name}</span>
                    <span className="font-semibold text-purple-700">
                      {business.currency}{item.revenue.toLocaleString('en-IN')} ({item.quantity} sold)
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-purple-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(12, pct))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-purple-100">
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 shadow-sm transition-all"
          >
            <Download className="w-3.5 h-3.5" /> Download Report (PDF)
          </button>
          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-100 transition-all"
          >
            <Download className="w-3.5 h-3.5" /> Export Ledger (CSV)
          </button>
        </div>

        <button
          onClick={() => onAction && onAction('create_invoice')}
          className="flex items-center gap-1 text-xs font-semibold text-purple-700 hover:text-purple-900 transition-colors"
        >
          Create New Invoice <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
