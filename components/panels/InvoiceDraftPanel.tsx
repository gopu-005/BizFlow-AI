'use client';

import React, { useState } from 'react';
import { FileText, Download, CheckCircle2, Plus, Trash2, X, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { generateInvoicePDF } from '@/lib/erp/pdf-generator';
import { Business, Invoice } from '@/types/erp';

interface InvoiceDraftPanelProps {
  initialData?: any;
  business: Business;
  onClose: () => void;
  onInvoiceCreated?: (inv: Invoice) => void;
}

export const InvoiceDraftPanel: React.FC<InvoiceDraftPanelProps> = ({
  initialData,
  business,
  onClose,
  onInvoiceCreated,
}) => {
  const [customerName, setCustomerName] = useState(initialData?.customerName || 'Priya Sundaram');
  const [customerPhone, setCustomerPhone] = useState(initialData?.customerPhone || '+91 98401 23456');
  const [customerAddress, setCustomerAddress] = useState(initialData?.customerAddress || '14 Anna Nagar West, Chennai');
  const [customerGstin, setCustomerGstin] = useState(initialData?.customerGstin || '');
  const [paymentMode, setPaymentMode] = useState('UPI (Google Pay / PhonePe)');

  const [items, setItems] = useState<Array<{ name: string; quantity: number; unitPrice: number; taxRate: number }>>(
    initialData?.items || [
      { name: 'Pure Cotton Formal Shirt (White)', quantity: 2, unitPrice: 1299, taxRate: 5 },
    ]
  );
  const [discount, setDiscount] = useState<number>(initialData?.discount || 0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [issuedInvoice, setIssuedInvoice] = useState<Invoice | null>(null);

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice * (item.taxRate / 100), 0);
  const total = Math.max(0, subtotal + taxAmount - discount);

  const handleAddItem = () => {
    setItems([
      ...items,
      { name: 'Kanchipuram Silk Saree', quantity: 1, unitPrice: 8500, taxRate: 5 },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    setItems(updated);
  };

  const handleDownloadPDF = (invData?: Invoice) => {
    const targetInvoice: Invoice =
      invData ||
      issuedInvoice || {
        id: 'draft_preview',
        invoiceNumber: 'INV-DRAFT-PREVIEW',
        businessId: business.id,
        customerId: 'cust_temp',
        customerName,
        customerPhone,
        customerAddress,
        customerGstin,
        items: items.map((it, idx) => ({
          id: `draft_item_${idx}`,
          name: it.name,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          taxRate: it.taxRate,
          total: it.quantity * it.unitPrice,
        })),
        subtotal,
        taxAmount: Math.round(taxAmount * 100) / 100,
        discount,
        total: Math.round(total * 100) / 100,
        status: 'draft',
        dueDate: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        paymentMode,
      };

    const doc = generateInvoicePDF(targetInvoice, business);
    doc.save(`${targetInvoice.invoiceNumber}_${customerName.replace(/\s+/g, '_')}.pdf`);
  };

  const handleConfirmAndIssue = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/erp/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: business.id,
          customerName,
          customerPhone,
          customerAddress,
          customerGstin,
          items,
          discount,
          paymentMode,
        }),
      });

      const data = await res.json();
      if (data.success && data.invoice) {
        setIssuedInvoice(data.invoice);
        if (onInvoiceCreated) onInvoiceCreated(data.invoice);

        // Confetti celebration
        try {
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.65 },
          });
        } catch (e) {
          // ignore
        }
      }
    } catch (e) {
      alert('Failed to record invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full glass-card rounded-2xl p-6 shadow-xl border border-purple-200/80 transition-all animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-purple-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700 shadow-sm">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-gray-900 font-heading">
                {issuedInvoice ? `Invoice Confirmed: ${issuedInvoice.invoiceNumber}` : 'Draft Invoice Preview'}
              </h3>
              <span
                className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                  issuedInvoice ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800'
                }`}
              >
                {issuedInvoice ? 'Issued & Recorded' : 'Draft Pending Approval'}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Tax calculated deterministically on server · Stock decrements automatically upon confirmation
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Success banner if confirmed */}
      {issuedInvoice && (
        <div className="my-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Invoice {issuedInvoice.invoiceNumber} recorded in {business.name} ledger. Stock updated.
          </div>
          <button
            onClick={() => handleDownloadPDF(issuedInvoice)}
            className="flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg shadow-sm transition-all"
          >
            <Download className="w-3.5 h-3.5" /> Download Tax PDF
          </button>
        </div>
      )}

      {/* Customer details row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
        <div>
          <label className="text-[11px] font-semibold text-gray-600 uppercase">Customer Name</label>
          <input
            type="text"
            value={customerName}
            disabled={!!issuedInvoice}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full text-xs font-medium p-2 mt-1 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-gray-600 uppercase">Phone / Contact</label>
          <input
            type="text"
            value={customerPhone}
            disabled={!!issuedInvoice}
            onChange={(e) => setCustomerPhone(e.target.value)}
            className="w-full text-xs font-medium p-2 mt-1 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-gray-600 uppercase">Payment Mode</label>
          <select
            value={paymentMode}
            disabled={!!issuedInvoice}
            onChange={(e) => setPaymentMode(e.target.value)}
            className="w-full text-xs font-medium p-2 mt-1 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            <option>UPI (Google Pay / PhonePe)</option>
            <option>Cash on Counter</option>
            <option>Credit / Debit Card (POS)</option>
            <option>Credit / Due (30 Days)</option>
          </select>
        </div>
      </div>

      {/* Editable Items Table */}
      <div className="my-3 border border-gray-100 rounded-xl overflow-hidden bg-white/70">
        <div className="grid grid-cols-12 gap-2 p-2.5 bg-gray-50/80 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
          <div className="col-span-5">Product / Item Description</div>
          <div className="col-span-2 text-center">Qty</div>
          <div className="col-span-2 text-right">Price ({business.currency})</div>
          <div className="col-span-2 text-right">GST %</div>
          <div className="col-span-1 text-center"></div>
        </div>

        <div className="divide-y divide-gray-100">
          {items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 p-2.5 items-center text-xs">
              <div className="col-span-5">
                <input
                  type="text"
                  value={item.name}
                  disabled={!!issuedInvoice}
                  onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                  className="w-full p-1.5 text-xs font-medium rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-400"
                />
              </div>
              <div className="col-span-2">
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  disabled={!!issuedInvoice}
                  onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value, 10) || 1)}
                  className="w-full p-1.5 text-xs text-center font-bold rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-400"
                />
              </div>
              <div className="col-span-2">
                <input
                  type="number"
                  value={item.unitPrice}
                  disabled={!!issuedInvoice}
                  onChange={(e) => handleItemChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                  className="w-full p-1.5 text-xs text-right font-medium rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-400"
                />
              </div>
              <div className="col-span-2">
                <select
                  value={item.taxRate}
                  disabled={!!issuedInvoice}
                  onChange={(e) => handleItemChange(idx, 'taxRate', parseFloat(e.target.value) || 0)}
                  className="w-full p-1.5 text-xs text-right font-medium rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-400"
                >
                  <option value={0}>0%</option>
                  <option value={5}>5%</option>
                  <option value={12}>12%</option>
                  <option value={18}>18%</option>
                </select>
              </div>
              <div className="col-span-1 text-center">
                {!issuedInvoice && items.length > 1 && (
                  <button
                    onClick={() => handleRemoveItem(idx)}
                    className="p-1 text-gray-400 hover:text-rose-600 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {!issuedInvoice && (
          <div className="p-2 border-t border-gray-100 bg-gray-50/50">
            <button
              onClick={handleAddItem}
              className="flex items-center gap-1 text-xs font-semibold text-purple-700 hover:text-purple-900 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Another Item
            </button>
          </div>
        )}
      </div>

      {/* Totals Summary */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-3 border-t border-purple-100">
        <div className="text-xs text-gray-500 max-w-sm">
          GSTIN: <span className="font-mono font-semibold text-gray-700">{business.gstNumber || 'Unregistered'}</span> · 
          All taxes are itemized and verifiable.
        </div>

        <div className="w-full sm:w-64 space-y-1.5 text-xs">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal:</span>
            <span className="font-medium">{business.currency}{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Estimated GST:</span>
            <span className="font-medium">{business.currency}{taxAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600 items-center">
            <span>Discount:</span>
            <input
              type="number"
              min="0"
              value={discount}
              disabled={!!issuedInvoice}
              onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
              className="w-20 text-right p-1 text-xs rounded border border-gray-200"
            />
          </div>
          <div className="flex justify-between text-base font-bold text-gray-900 pt-1 border-t border-gray-200">
            <span>Total Payable:</span>
            <span className="text-purple-700">{business.currency}{total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Action footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100">
        <button
          onClick={() => handleDownloadPDF()}
          className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all shadow-sm"
        >
          <Download className="w-4 h-4 text-purple-600" /> Download PDF Draft
        </button>

        {!issuedInvoice ? (
          <button
            onClick={handleConfirmAndIssue}
            disabled={isSubmitting}
            className="flex items-center gap-2 text-xs font-bold px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 shadow-md hover:shadow-purple-500/25 transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isSubmitting ? 'Recording...' : 'Confirm & Finalize Invoice'}
          </button>
        ) : (
          <button
            onClick={onClose}
            className="text-xs font-semibold px-4 py-2 bg-gray-900 text-white rounded-xl hover:bg-black transition-all"
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
};
