'use client';

import React from 'react';
import { AlertTriangle, PackageX, RefreshCw, X, ArrowUpRight } from 'lucide-react';
import { Product, Business } from '@/types/erp';

interface LowStockPanelProps {
  products: Product[];
  business: Business;
  onClose: () => void;
  onReorder?: (product: Product) => void;
}

export const LowStockPanel: React.FC<LowStockPanelProps> = ({
  products,
  business,
  onClose,
  onReorder,
}) => {
  return (
    <div className="w-full glass-card rounded-2xl p-6 shadow-xl border border-amber-200/70 transition-all animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-amber-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shadow-sm">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 font-heading">
              Inventory Restock Alerts
            </h3>
            <p className="text-xs text-gray-500">
              {products.length} products below safety threshold in {business.name}
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

      {/* Table */}
      <div className="my-4 overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-gray-100 text-gray-400 font-medium uppercase tracking-wider">
              <th className="py-2 px-3">Product Name</th>
              <th className="py-2 px-3">Category</th>
              <th className="py-2 px-3 text-center">Current Stock</th>
              <th className="py-2 px-3 text-center">Safety Level</th>
              <th className="py-2 px-3 text-right">Selling Price</th>
              <th className="py-2 px-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {products.map((p) => {
              const isOut = p.stock === 0;
              return (
                <tr key={p.id} className="hover:bg-purple-50/40 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-gray-800 flex items-center gap-2">
                    {isOut ? (
                      <PackageX className="w-4 h-4 text-rose-500 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                    <div>
                      <div>{p.name}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{p.sku}</div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-gray-600">{p.category}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full font-bold ${
                        isOut
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {p.stock} {p.unit}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center text-gray-500">
                    Min {p.minStock} {p.unit}
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold text-gray-800">
                    {business.currency}{p.price.toLocaleString('en-IN')}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {isOut ? (
                      <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-1 rounded-md border border-rose-200">
                        Out of Stock
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                        Restock Needed
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer advice */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs">
        <span className="text-gray-500">
          💡 Reorder suggestions are based on your 30-day velocity.
        </span>
        <button
          onClick={() => alert('Purchase Order draft generated for supplier dispatch!')}
          className="flex items-center gap-1.5 font-semibold text-purple-700 hover:text-purple-900 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-200"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Prepare Bulk Restock PO
        </button>
      </div>
    </div>
  );
};
