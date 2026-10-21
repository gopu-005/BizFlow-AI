'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  FileText,
  PlusCircle,
  Download,
  Printer,
  CheckCircle2,
  Trash2,
  Plus,
  ArrowLeft,
  Sparkles,
  Search,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { generateInvoicePDF } from '@/lib/erp/pdf-generator';
import { Business, Invoice, Product } from '@/types/erp';

import { useBusiness } from '@/components/BusinessProvider';

function InvoicesContent() {
  const searchParams = useSearchParams();
  const initialAction = searchParams.get('action');

  const { currentBusiness: activeBusiness, businessId, setBusinessId } = useBusiness();
  const currentBusiness: Business = activeBusiness || {
    id: businessId || '',
    name: 'My Business Workspace',
    type: 'Retail & Commercial',
    currency: '₹',
    ownerName: 'Business Owner',
    gstNumber: '',
    address: 'India',
    phone: '+91 90000 00000',
    email: 'billing@bizflow.in',
    createdAt: new Date().toISOString(),
  };

  const [activeTab, setActiveTab] = useState<'create' | 'history'>(
    initialAction === 'create' ? 'create' : 'history'
  );
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Invoice form state
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Card'>('UPI');
  const [taxRate, setTaxRate] = useState<number>(5);
  const [items, setItems] = useState<
    { productId: string; name: string; quantity: number; unitPrice: number; total: number }[]
  >([]);
  const [selectedProductToAdd, setSelectedProductToAdd] = useState('');
  const [createdInvoice, setCreatedInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    if (!businessId) return;
    fetchInvoices();
    fetchProducts();
  }, [businessId]);

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/erp/invoices?businessId=${businessId}`);
      const data = await res.json();
      setInvoices(data.invoices || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch(`/api/erp/inventory?businessId=${businessId}`);
      const data = await res.json();
      setProducts(data.products || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddItem = () => {
    const prod = products.find((p) => p.id === selectedProductToAdd);
    if (!prod) return;

    const existingIdx = items.findIndex((i) => i.productId === prod.id);
    if (existingIdx >= 0) {
      const updated = [...items];
      updated[existingIdx].quantity += 1;
      updated[existingIdx].total = updated[existingIdx].quantity * updated[existingIdx].unitPrice;
      setItems(updated);
    } else {
      setItems([
        ...items,
        {
          productId: prod.id,
          name: prod.name,
          quantity: 1,
          unitPrice: prod.price ?? (prod as any).sellingPrice ?? 0,
          total: prod.price ?? (prod as any).sellingPrice ?? 0,
        },
      ]);
    }
    setSelectedProductToAdd('');
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleQuantityChange = (index: number, qty: number) => {
    const updated = [...items];
    updated[index].quantity = Math.max(1, qty);
    updated[index].total = updated[index].quantity * updated[index].unitPrice;
    setItems(updated);
  };

  const subtotal = items.reduce((acc, curr) => acc + curr.total, 0);
  const taxAmount = Math.round((subtotal * taxRate) / 100);
  const total = subtotal + taxAmount;

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      alert('Please enter customer name');
      return;
    }
    if (items.length === 0) {
      alert('Please add at least one product item');
      return;
    }

    try {
      const res = await fetch('/api/erp/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          customerName,
          customerPhone,
          customerGstin,
          paymentMode,
          items,
          subtotal,
          taxRate,
          taxAmount,
          total,
          status: 'paid',
        }),
      });

      const data = await res.json();
      if (data.success && data.invoice) {
        setCreatedInvoice(data.invoice);
        fetchInvoices();
        // Reset form
        setCustomerName('');
        setCustomerPhone('');
        setCustomerGstin('');
        setItems([]);
        alert(`Invoice #${data.invoice.invoiceNumber} generated successfully!`);
      }
    } catch (e) {
      alert('Failed to generate invoice');
    }
  };

  const handleDownloadInvoicePDF = (inv: Invoice) => {
    const doc = generateInvoicePDF(inv, currentBusiness);
    doc.save(`${inv.invoiceNumber}_${inv.customerName.replace(/\s+/g, '_')}.pdf`);
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
              <span className="text-gray-500">Invoices & Billing</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 font-heading">
              Invoices & GST Bill Generator
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Draft instant tax invoices, compute CGST/SGST, and print or download official PDFs
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-1.5 p-1 bg-white border border-purple-100 rounded-2xl shadow-xs">
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'history'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-purple-700 hover:bg-purple-50'
              }`}
            >
              Invoice Register ({invoices.length})
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'create'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-purple-700 hover:bg-purple-50'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>New Bill / Invoice</span>
            </button>
          </div>
        </div>

        {/* TAB 1: NEW INVOICE CREATOR */}
        {activeTab === 'create' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Form (Bill Details & Item Entry) */}
            <form onSubmit={handleCreateInvoice} className="lg:col-span-7 glass-card rounded-2xl p-6 border border-purple-100 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-gray-900 font-heading pb-2 border-b border-gray-100">
                Customer & Billing Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Priya Sundaram"
                    className="w-full bg-white border border-purple-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+91 98400 12345"
                    className="w-full bg-white border border-purple-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as any)}
                    className="w-full bg-white border border-purple-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-400 font-medium"
                  >
                    <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">GST Tax Rate</label>
                  <select
                    value={taxRate}
                    onChange={(e) => setTaxRate(parseInt(e.target.value) || 0)}
                    className="w-full bg-white border border-purple-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-400 font-medium"
                  >
                    <option value={5}>5% GST (2.5% CGST + 2.5% SGST)</option>
                    <option value={12}>12% GST (6% CGST + 6% SGST)</option>
                    <option value={18}>18% GST (9% CGST + 9% SGST)</option>
                    <option value={0}>0% (Tax Exempt)</option>
                  </select>
                </div>
              </div>

              {/* Add Item Row */}
              <div className="pt-3 border-t border-gray-100">
                <label className="block text-[11px] font-bold text-gray-600 mb-1">Add Product to Bill</label>
                <div className="flex gap-2">
                  <select
                    value={selectedProductToAdd}
                    onChange={(e) => setSelectedProductToAdd(e.target.value)}
                    className="flex-1 bg-white border border-purple-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-400 font-medium"
                  >
                    <option value="">Select product item...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — ₹{p.price ?? (p as any).sellingPrice} (Stock: {p.stock})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    disabled={!selectedProductToAdd}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-purple-100 rounded-xl overflow-hidden bg-white mt-2">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-purple-50/60 border-b border-purple-100 text-purple-900 font-bold">
                      <th className="p-2.5">Item</th>
                      <th className="p-2.5 w-20 text-center">Qty</th>
                      <th className="p-2.5 text-right">Price</th>
                      <th className="p-2.5 text-right">Total</th>
                      <th className="p-2.5 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-gray-400">
                          No items added yet. Select products above to build invoice.
                        </td>
                      </tr>
                    ) : (
                      items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-2.5 font-semibold text-gray-900">{item.name}</td>
                          <td className="p-2.5 text-center">
                            <input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) => handleQuantityChange(idx, parseInt(e.target.value) || 1)}
                              className="w-14 text-center p-1 bg-white border border-gray-200 rounded-lg text-xs"
                            />
                          </td>
                          <td className="p-2.5 text-right font-medium">₹{item.unitPrice}</td>
                          <td className="p-2.5 text-right font-bold text-gray-900">₹{item.total}</td>
                          <td className="p-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="text-rose-500 hover:text-rose-700 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <button
                type="submit"
                disabled={items.length === 0}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                <span>Generate Official Invoice (₹{total.toLocaleString('en-IN')})</span>
              </button>
            </form>

            {/* Right Live Preview / Breakdown Card */}
            <div className="lg:col-span-5 space-y-4">
              <div className="glass-card rounded-2xl p-5 border border-purple-200 shadow-sm">
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-700 mb-3 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Live Bill Summary
                </h4>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Taxable Subtotal:</span>
                    <span className="font-semibold text-gray-900">₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>GST ({taxRate}%):</span>
                    <span className="font-semibold text-gray-900">₹{taxAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="pt-2 border-t border-purple-100 flex justify-between text-base font-extrabold text-purple-950 font-heading">
                    <span>Grand Total:</span>
                    <span>₹{total.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-500 space-y-1">
                  <div>• Billed by: {currentBusiness.name}</div>
                  <div>• GSTIN: {currentBusiness.gstNumber}</div>
                  <div>• Payment: {paymentMode}</div>
                </div>
              </div>

              {createdInvoice && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Invoice #{createdInvoice.invoiceNumber} Ready!</span>
                  </div>
                  <button
                    onClick={() => handleDownloadInvoicePDF(createdInvoice)}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Tax Invoice PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: INVOICE REGISTER & HISTORY */}
        {activeTab === 'history' && (
          <div className="glass-card rounded-2xl border border-purple-100 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 font-heading">
                All Billed Invoices ({invoices.length})
              </h3>
              <button
                onClick={() => setActiveTab('create')}
                className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> New Bill
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-purple-50/60 border-b border-purple-100 text-purple-900 font-bold">
                    <th className="p-3">Invoice #</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Items</th>
                    <th className="p-3">Payment</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-500">
                        No invoices generated yet.
                      </td>
                    </tr>
                  ) : (
                    invoices.map((inv) => (
                      <tr key={inv.id || inv.invoiceNumber} className="hover:bg-purple-50/25 transition-colors">
                        <td className="p-3 font-bold text-gray-900">{inv.invoiceNumber}</td>
                        <td className="p-3">
                          <div className="font-semibold text-gray-900">{inv.customerName}</div>
                          <div className="text-[10px] text-gray-400">{inv.customerPhone}</div>
                        </td>
                        <td className="p-3 text-gray-600">
                          {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('en-IN') : 'Recent'}
                        </td>
                        <td className="p-3 text-gray-700">
                          {inv.items?.length || 1} items ({inv.items?.[0]?.name || 'Product'})
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-semibold text-[10px] uppercase">
                            {inv.paymentMode || 'UPI'}
                          </span>
                        </td>
                        <td className="p-3 text-right font-extrabold text-gray-900 text-sm">
                          ₹{inv.total.toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleDownloadInvoicePDF(inv)}
                            className="p-1.5 rounded-lg text-purple-700 hover:bg-purple-100 transition-colors inline-flex items-center gap-1 text-xs font-semibold"
                            title="Download PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>PDF</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function InvoicesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col bg-[#fbfbfe] items-center justify-center">
          <div className="text-sm font-semibold text-purple-700 animate-pulse">
            Loading Invoices &amp; Billing...
          </div>
        </div>
      }
    >
      <InvoicesContent />
    </Suspense>
  );
}
