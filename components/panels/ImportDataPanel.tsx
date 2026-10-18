'use client';

import React, { useState } from 'react';
import { UploadCloud, FileSpreadsheet, Camera, CheckCircle2, AlertTriangle, ArrowRight, X, Loader2, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { ImportPreviewRecord, Business } from '@/types/erp';

interface ImportDataPanelProps {
  business: Business;
  onClose: () => void;
  onImportSuccess?: () => void;
}

export const ImportDataPanel: React.FC<ImportDataPanelProps> = ({
  business,
  onClose,
  onImportSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [records, setRecords] = useState<ImportPreviewRecord[]>([]);
  const [extractedSource, setExtractedSource] = useState<string>('');
  const [importSummary, setImportSummary] = useState<{ imported: number; updated: number; total: number } | null>(null);

  const handleSimulateSample = async (type: 'photo' | 'excel') => {
    setIsExtracting(true);
    setRecords([]);
    setImportSummary(null);

    // Create virtual sample file
    const sampleFileName =
      type === 'photo'
        ? 'Handwritten_Stock_Register_Page_04.jpg'
        : 'Textiles_Bulk_Stock_Update_Oct2024.xlsx';
    setExtractedSource(sampleFileName);

    const formData = new FormData();
    const blob = new Blob(['mock content'], { type: 'text/plain' });
    const file = new File([blob], sampleFileName, { type: type === 'photo' ? 'image/jpeg' : 'application/vnd.ms-excel' });
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
          businessId: business.id,
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
            particleCount: 70,
            spread: 55,
            origin: { y: 0.6 },
          });
        } catch (e) {
          // ignore
        }

        if (onImportSuccess) onImportSuccess();
      }
    } catch (e) {
      alert('Import failed');
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className="w-full glass-card rounded-2xl p-6 shadow-xl border border-purple-200/80 transition-all animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-purple-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700 shadow-sm">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 font-heading">
              Data & Handwritten Register Import
            </h3>
            <p className="text-xs text-gray-500">
              Extract inventory from CSV, Excel, or photographs of handwritten paper ledgers
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

      {/* Upload area & sample shortcuts */}
      {!importSummary && (
        <div className="my-4 space-y-3">
          <div className="border-2 border-dashed border-purple-200 hover:border-purple-400 rounded-xl p-6 text-center bg-purple-50/30 transition-colors">
            <input
              type="file"
              id="file-upload"
              accept=".csv,.xlsx,.xls,.png,.jpg,.jpeg"
              onChange={handleFileUpload}
              className="hidden"
            />
            <label htmlFor="file-upload" className="cursor-pointer block">
              <UploadCloud className="w-8 h-8 text-purple-500 mx-auto mb-2" />
              <div className="text-xs font-bold text-gray-800">
                Click to browse or drop file here
              </div>
              <div className="text-[11px] text-gray-500 mt-1">
                Supports Excel (.xlsx), CSV, or Photos of handwritten stock registers (.jpg, .png)
              </div>
            </label>
          </div>

          {/* Quick test buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-gray-50 p-2.5 rounded-xl border border-gray-100">
            <span className="text-gray-500 font-medium">Or test with demo sample:</span>
            <div className="flex gap-2">
              <button
                onClick={() => handleSimulateSample('photo')}
                className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-purple-50 text-purple-700 rounded-lg border border-purple-200 font-semibold shadow-sm transition-all"
              >
                <Camera className="w-3.5 h-3.5" /> Sample Handwritten Register Photo
              </button>
              <button
                onClick={() => handleSimulateSample('excel')}
                className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-purple-50 text-purple-700 rounded-lg border border-purple-200 font-semibold shadow-sm transition-all"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Sample Excel Spreadsheet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extraction loader */}
      {isExtracting && (
        <div className="py-8 text-center space-y-2">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto" />
          <div className="text-xs font-bold text-gray-800">
            Scanning document with BizFlow Vision & OCR Engine...
          </div>
          <div className="text-[11px] text-gray-500">
            Parsing handwritten text, validating prices, and identifying entity fields.
          </div>
        </div>
      )}

      {/* Extracted records editable preview table */}
      {records.length > 0 && !importSummary && (
        <div className="my-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-bold text-gray-900">
                Extracted {records.length} items from <span className="font-mono text-purple-700">{extractedSource}</span>
              </span>
            </div>
            <span className="text-[11px] text-gray-500">
              Review & edit any values before saving to inventory
            </span>
          </div>

          <div className="border border-purple-100 rounded-xl overflow-hidden bg-white/90">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-purple-50/70 border-b border-purple-100 text-purple-900 font-bold">
                  <th className="p-2.5">Product Name</th>
                  <th className="p-2.5">Category</th>
                  <th className="p-2.5 text-center">Qty</th>
                  <th className="p-2.5 text-right">Selling Price</th>
                  <th className="p-2.5 text-right">Cost</th>
                  <th className="p-2.5 text-center">OCR Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map((rec, idx) => (
                  <tr key={rec.id} className="hover:bg-purple-50/30">
                    <td className="p-2">
                      <input
                        type="text"
                        value={rec.productName}
                        onChange={(e) => handleRecordChange(idx, 'productName', e.target.value)}
                        className="w-full p-1 text-xs font-medium rounded border border-gray-200"
                      />
                      {rec.validationMessage && (
                        <div className="text-[10px] text-amber-700 flex items-center gap-1 mt-0.5">
                          <AlertTriangle className="w-3 h-3 text-amber-500" /> {rec.validationMessage}
                        </div>
                      )}
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={rec.category}
                        onChange={(e) => handleRecordChange(idx, 'category', e.target.value)}
                        className="w-full p-1 text-xs rounded border border-gray-200"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min="1"
                        value={rec.quantity}
                        onChange={(e) => handleRecordChange(idx, 'quantity', parseInt(e.target.value, 10) || 1)}
                        className="w-16 p-1 text-xs text-center font-bold rounded border border-gray-200 mx-auto block"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={rec.unitPrice}
                        onChange={(e) => handleRecordChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-20 p-1 text-xs text-right font-medium rounded border border-gray-200 ml-auto block"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={rec.costPrice}
                        onChange={(e) => handleRecordChange(idx, 'costPrice', parseFloat(e.target.value) || 0)}
                        className="w-20 p-1 text-xs text-right font-medium rounded border border-gray-200 ml-auto block"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          rec.status === 'warning'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {rec.confidence ? `${Math.round(rec.confidence * 100)}%` : 'Verified'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setRecords([])}
              className="text-xs px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleCommitImport}
              disabled={isCommitting}
              className="flex items-center gap-1.5 text-xs font-bold px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl shadow-md hover:from-purple-700 hover:to-indigo-700 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isCommitting ? 'Importing...' : 'Approve & Save to Database'}
            </button>
          </div>
        </div>
      )}

      {/* Success Summary View */}
      {importSummary && (
        <div className="my-4 p-5 bg-emerald-50/90 border border-emerald-200 rounded-2xl text-center space-y-3">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-gray-900 font-heading">
            Import Completed Successfully!
          </h4>
          <p className="text-xs text-gray-600 max-w-md mx-auto">
            {importSummary.imported} new products added and {importSummary.updated} existing items restocked in {business.name}. Current active catalog size is {importSummary.total} items.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={onClose}
              className="text-xs font-semibold px-5 py-2 bg-gray-900 text-white rounded-xl hover:bg-black transition-all"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
