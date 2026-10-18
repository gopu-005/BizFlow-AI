'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  UploadCloud,
  FileSpreadsheet,
  Camera,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  X,
  Loader2,
  Sparkles,
  Package,
  FileText,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ImportPreviewRecord, Business } from '@/types/erp';

export default function ImportPage() {
  const [businessId, setBusinessId] = useState('biz_karthik_textiles');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [records, setRecords] = useState<ImportPreviewRecord[]>([]);
  const [extractedSource, setExtractedSource] = useState<string>('');
  const [importSummary, setImportSummary] = useState<{
    imported: number;
    updated: number;
    total: number;
  } | null>(null);

  const currentBusiness: Business = {
    id: businessId,
    name:
      businessId === 'biz_karthik_textiles'
        ? 'Karthik Textiles & Garments'
        : 'Sri Murugan Bakery & Sweets',
    type:
      businessId === 'biz_karthik_textiles' ? 'Clothing & Retail' : 'Bakery & Sweets',
    currency: '₹',
    ownerName:
      businessId === 'biz_karthik_textiles'
        ? 'Karthik Ramanathan'
        : 'Murugan Velayudham',
    gstNumber:
      businessId === 'biz_karthik_textiles'
        ? '33AAAAA0000A1Z5'
        : '33BBBBB1111B2Z6',
    address: 'Chennai, Tamil Nadu',
    phone: '+91 98400 11223',
    email: 'karthik@textiles.bizflow.in',
    createdAt: '2024-01-10T10:00:00Z',
  };

  const handleSimulateSample = async (type: 'photo' | 'excel') => {
    setIsExtracting(true);
    setRecords([]);
    setImportSummary(null);

    const sampleFileName =
      type === 'photo'
        ? 'Handwritten_Stock_Register_Page_04.jpg'
        : 'Textiles_Bulk_Stock_Update_Oct2024.xlsx';
    setExtractedSource(sampleFileName);

    const formData = new FormData();
    const blob = new Blob(['mock content'], { type: 'text/plain' });
    const file = new File(
      [blob],
      sampleFileName,
      {
        type:
          type === 'photo' ? 'image/jpeg' : 'application/vnd.ms-excel',
      }
    );
    formData.append('file', file);
    formData.append('fileType', type === 'photo' ? 'image' : 'excel');

    try {
      const res = await fetch('/api/ocr/extract', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.records) {
        setRecords(data.records);
      }
    } catch (e) {
      alert('Extraction failed');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsExtracting(true);
    setRecords([]);
    setImportSummary(null);
    setExtractedSource(file.name);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/ocr/extract', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.records) {
        setRecords(data.records);
      }
    } catch (e) {
      alert('Extraction error');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleRecordChange = (index: number, field: string, value: any) => {
    const updated = [...records];
    (updated[index] as any)[field] = value;
    setRecords(updated);
  };

  const handleCommitImport = async () => {
    if (records.length === 0) return;
    setIsCommitting(true);

    try {
      const res = await fetch('/api/erp/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: currentBusiness.id,
          records,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setImportSummary({
          imported: data.importedCount,
          updated: data.updatedCount,
          total: data.totalCount,
        });

        try {
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.6 },
          });
        } catch (e) {
          // ignore
        }
      }
    } catch (e) {
      alert('Import failed');
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#fbfbfe] text-[#0f172a] font-sans antialiased">
      <Navbar currentBusinessId={businessId} onBusinessChange={(id) => setBusinessId(id)} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Breadcrumb & Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl bg-white border border-gray-200 hover:border-purple-300 text-gray-600 hover:text-purple-700 transition-colors shadow-xs"
              title="Back to Voice Assistant"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">
                  ERP Intelligence
                </span>
                <span className="text-gray-300">•</span>
                <span className="text-xs text-gray-500">{currentBusiness.name}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 font-heading">
                Smart Data & Ledger Import
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/inventory"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-gray-200 hover:border-purple-200 text-xs font-semibold text-gray-700 shadow-xs"
            >
              <Package className="w-4 h-4 text-purple-600" />
              <span>View Inventory</span>
            </Link>
          </div>
        </div>

        {/* Import Banner / Instructions */}
        <div className="glass-card rounded-2xl p-6 shadow-sm border border-purple-100 bg-gradient-to-r from-purple-500/5 via-indigo-500/5 to-transparent">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-bold text-gray-900 font-heading">
                  AI-Assisted Catalog Ingestion
                </h2>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                Seamlessly convert paper bills, handwritten inventory khatas, or wholesale Excel spreadsheets into structured ERP items. Review and edit mapped fields before committing to your live inventory.
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="text-xs px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 font-medium">
                  ✓ Multilingual OCR (English & Tamil)
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 font-medium">
                  ✓ CSV & Excel .xlsx Support
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                  ✓ Instant SKU & Price Matching
                </span>
              </div>
            </div>

            <div className="bg-white/80 rounded-xl p-4 border border-purple-100 flex flex-col justify-center space-y-2 shadow-xs">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                Quick Test Samples
              </span>
              <button
                onClick={() => handleSimulateSample('photo')}
                className="w-full text-left px-3 py-2 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-purple-600" />
                  Handwritten Register (Photo)
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-purple-500" />
              </button>
              <button
                onClick={() => handleSimulateSample('excel')}
                className="w-full text-left px-3 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  Supplier Excel Sheet (.xlsx)
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-emerald-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Upload Dropzones */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Option A: CSV / Excel */}
          <div className="relative group border-2 border-dashed border-purple-200 hover:border-purple-400 rounded-2xl p-6 bg-white/70 hover:bg-purple-50/20 transition-all text-center flex flex-col items-center justify-center cursor-pointer min-h-[220px]">
            <input
              type="file"
              accept=".csv, .xlsx, .xls"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
            />
            <div className="w-14 h-14 rounded-2xl bg-purple-100 group-hover:bg-purple-200 text-purple-700 flex items-center justify-center mb-3 transition-colors shadow-sm">
              <FileSpreadsheet className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">
              Upload CSV or Excel File
            </h3>
            <p className="text-xs text-gray-500 max-w-xs mb-3">
              Drag & drop spreadsheet file (.csv, .xlsx) with Product name, Price, Quantity
            </p>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200">
              Browse Spreadsheet
            </span>
          </div>

          {/* Option B: Photo / OCR */}
          <div className="relative group border-2 border-dashed border-indigo-200 hover:border-indigo-400 rounded-2xl p-6 bg-white/70 hover:bg-indigo-50/20 transition-all text-center flex flex-col items-center justify-center cursor-pointer min-h-[220px]">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
            />
            <div className="w-14 h-14 rounded-2xl bg-indigo-100 group-hover:bg-indigo-200 text-indigo-700 flex items-center justify-center mb-3 transition-colors shadow-sm">
              <Camera className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">
              Snap / Upload Photo of Paper Register
            </h3>
            <p className="text-xs text-gray-500 max-w-xs mb-3">
              Uses high-accuracy Vision AI to digitize handwritten stock notes and supplier slips
            </p>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">
              Take Photo or Upload Image
            </span>
          </div>
        </div>

        {/* Loading / Extracting State */}
        {isExtracting && (
          <div className="glass-card rounded-2xl p-8 border border-purple-200 text-center space-y-3 animate-in fade-in">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto" />
            <h3 className="text-base font-bold text-gray-900">
              Extracting & Structuring ERP Data...
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Scanning columns, recognizing Indian handwritten figures, and normalizing units...
            </p>
          </div>
        )}

        {/* Import Success Alert */}
        {importSummary && (
          <div className="glass-card rounded-2xl p-6 bg-emerald-50/90 border border-emerald-200 shadow-sm animate-in fade-in duration-300">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-emerald-900">
                    Import Completed Successfully!
                  </h4>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    {importSummary.total} total items processed. {importSummary.imported} new products cataloged and {importSummary.updated} existing stocks updated.
                  </p>
                </div>
              </div>
              <Link
                href="/inventory"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all"
              >
                Go to Inventory →
              </Link>
            </div>
          </div>
        )}

        {/* Extracted Records Preview Table */}
        {records.length > 0 && (
          <div className="glass-card rounded-2xl p-6 shadow-sm border border-purple-200/80 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-gray-900 font-heading">
                    Extracted Records Preview ({records.length} items)
                  </h3>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                    Source: {extractedSource}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Review extracted fields. You can edit any value directly in the cells before committing.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setRecords([]);
                    setExtractedSource('');
                  }}
                  className="px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-100 text-xs font-semibold text-gray-600 transition-colors"
                >
                  Clear Table
                </button>
                <button
                  onClick={handleCommitImport}
                  disabled={isCommitting}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-purple-500/20 flex items-center gap-2 transition-all cursor-pointer"
                >
                  {isCommitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving to Database...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Confirm & Import {records.length} Products
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-semibold">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Qty</th>
                    <th className="py-2.5 px-3">Buy Price (₹)</th>
                    <th className="py-2.5 px-3">Sell Price (₹)</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {records.map((rec, i) => (
                    <tr key={i} className="hover:bg-purple-50/30 transition-colors">
                      <td className="py-2.5 px-3 text-gray-400">{i + 1}</td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={rec.name}
                          onChange={(e) => handleRecordChange(i, 'name', e.target.value)}
                          className="w-full bg-white px-2 py-1 rounded border border-gray-200 focus:border-purple-500 focus:outline-none text-xs font-semibold text-gray-800"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={rec.sku}
                          onChange={(e) => handleRecordChange(i, 'sku', e.target.value)}
                          className="w-24 bg-white px-2 py-1 rounded border border-gray-200 focus:border-purple-500 focus:outline-none text-xs font-mono text-gray-600"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={rec.category}
                          onChange={(e) => handleRecordChange(i, 'category', e.target.value)}
                          className="w-28 bg-white px-2 py-1 rounded border border-gray-200 focus:border-purple-500 focus:outline-none text-xs text-gray-700"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          value={rec.quantity}
                          onChange={(e) => handleRecordChange(i, 'quantity', Number(e.target.value))}
                          className="w-16 bg-white px-2 py-1 rounded border border-gray-200 focus:border-purple-500 focus:outline-none text-xs text-center font-bold text-gray-800"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          value={rec.purchasePrice}
                          onChange={(e) => handleRecordChange(i, 'purchasePrice', Number(e.target.value))}
                          className="w-20 bg-white px-2 py-1 rounded border border-gray-200 focus:border-purple-500 focus:outline-none text-xs text-right font-medium text-gray-700"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          value={rec.sellingPrice}
                          onChange={(e) => handleRecordChange(i, 'sellingPrice', Number(e.target.value))}
                          className="w-20 bg-white px-2 py-1 rounded border border-gray-200 focus:border-purple-500 focus:outline-none text-xs text-right font-bold text-emerald-700"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Ready
                        </span>
                      </td>
                    </tr>
                  ))}
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
