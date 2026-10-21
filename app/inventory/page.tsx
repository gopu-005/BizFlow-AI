'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Package,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  Plus,
  RefreshCw,
  FileSpreadsheet,
  ArrowLeft,
  ArrowUpDown,
  TrendingDown,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { downloadCSV } from '@/lib/erp/pdf-generator';
import { Product } from '@/types/erp';

import { useBusiness } from '@/components/BusinessProvider';

export default function InventoryPage() {
  const { currentBusiness, businessId, setBusinessId } = useBusiness();
  const [filter, setFilter] = useState<'all' | 'low_stock' | 'out_of_stock'>('all');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [restockQty, setRestockQty] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!businessId) return;
    fetchProducts();
  }, [businessId, filter]);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const url =
        filter === 'low_stock'
          ? `/api/erp/inventory?businessId=${businessId}&filter=low_stock`
          : `/api/erp/inventory?businessId=${businessId}`;
      const res = await fetch(url);
      const data = await res.json();
      setProducts(data.products || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestock = async (product: Product) => {
    const qtyToAdd = restockQty[product.id] || 10;
    try {
      const newStock = product.stock + qtyToAdd;
      await fetch('/api/erp/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          productId: product.id,
          stock: newStock,
        }),
      });
      // update local
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, stock: newStock } : p))
      );
      alert(`Restocked ${product.name} by +${qtyToAdd} units (Total: ${newStock})!`);
    } catch (e) {
      alert('Failed to update stock');
    }
  };

  const handleExportCSV = () => {
    const rows = products.map((p) => ({
      SKU: p.sku,
      Name: p.name,
      Category: p.category,
      Unit: p.unit,
      Stock: p.stock,
      MinThreshold: p.minStock,
      SellingPrice: p.price,
      CostPrice: p.costPrice,
      Status: p.stock === 0 ? 'Out of Stock' : p.stock <= p.minStock ? 'Low Stock' : 'In Stock',
    }));
    downloadCSV(`Inventory_Report_${businessId}.csv`, rows);
  };

  const filteredProducts = products.filter((p) => {
    if (filter === 'out_of_stock' && p.stock > 0) return false;
    if (filter === 'low_stock' && p.stock > p.minStock) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  });

  const lowStockCount = products.filter((p) => p.stock <= p.minStock).length;
  const outOfStockCount = products.filter((p) => p.stock === 0).length;

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
              <span className="text-gray-500">Inventory Management</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 font-heading">
              Product Stock & Inventory
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Live stock audits, minimum reorder alerts, and replenishment controls
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-purple-100 hover:border-purple-300 text-xs font-semibold text-gray-700 shadow-xs transition-all"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export Stock Sheet</span>
            </button>
            <button
              onClick={fetchProducts}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-xs font-semibold text-purple-700 transition-all"
              title="Refresh inventory data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Quick Filter Badges / Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => setFilter('all')}
            className={`p-4 rounded-2xl border text-left transition-all ${
              filter === 'all'
                ? 'bg-purple-50/80 border-purple-300 shadow-sm'
                : 'bg-white border-purple-100 hover:border-purple-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-gray-700">Total Products</span>
              <Package className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-extrabold text-gray-900 font-heading">
              {products.length} Items
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">In active SKU catalog</div>
          </button>

          <button
            onClick={() => setFilter('low_stock')}
            className={`p-4 rounded-2xl border text-left transition-all ${
              filter === 'low_stock'
                ? 'bg-amber-50/80 border-amber-300 shadow-sm'
                : 'bg-white border-purple-100 hover:border-amber-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-amber-800">Low Stock Alerts</span>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-extrabold text-amber-700 font-heading">
              {lowStockCount} Products
            </div>
            <div className="text-[11px] text-amber-600 mt-0.5">Below reorder threshold</div>
          </button>

          <button
            onClick={() => setFilter('out_of_stock')}
            className={`p-4 rounded-2xl border text-left transition-all ${
              filter === 'out_of_stock'
                ? 'bg-rose-50/80 border-rose-300 shadow-sm'
                : 'bg-white border-purple-100 hover:border-rose-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-rose-800">Out of Stock</span>
              <XCircle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-extrabold text-rose-700 font-heading">
              {outOfStockCount} Products
            </div>
            <div className="text-[11px] text-rose-600 mt-0.5">Requires immediate restock</div>
          </button>
        </div>

        {/* Search & Table */}
        <div className="glass-card rounded-2xl border border-purple-100 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by product name, SKU, or category..."
                className="w-full bg-white border border-purple-100 rounded-xl pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:border-purple-400"
              />
            </div>

            <div className="text-xs text-gray-500 font-medium">
              Showing {filteredProducts.length} of {products.length} products
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-purple-50/60 border-b border-purple-100 text-purple-900 font-bold">
                  <th className="p-3">SKU</th>
                  <th className="p-3">Product Name</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Selling Price</th>
                  <th className="p-3 text-center">Stock / Threshold</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Quick Restock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500">
                      No products match your search or filter.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const isOut = p.stock === 0;
                    const isLow = !isOut && p.stock <= p.minStock;

                    return (
                      <tr key={p.id} className="hover:bg-purple-50/25 transition-colors">
                        <td className="p-3 font-mono text-gray-500 font-semibold">{p.sku}</td>
                        <td className="p-3 font-bold text-gray-900">
                          <div>{p.name}</div>
                          <div className="text-[10px] text-gray-400 font-normal">Per {p.unit}</div>
                        </td>
                        <td className="p-3 text-gray-600">{p.category}</td>
                        <td className="p-3 font-bold text-gray-900">₹{(p.price ?? 0).toLocaleString('en-IN')}</td>
                        <td className="p-3 text-center">
                          <span
                            className={`font-extrabold text-sm ${
                              isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-gray-900'
                            }`}
                          >
                            {p.stock}
                          </span>
                          <span className="text-gray-400 text-[10px]"> / min {p.minStock}</span>
                        </td>
                        <td className="p-3">
                          {isOut ? (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                              Out of Stock
                            </span>
                          ) : isLow ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                              Low Stock
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              In Stock
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <input
                              type="number"
                              min={1}
                              defaultValue={10}
                              onChange={(e) =>
                                setRestockQty({
                                  ...restockQty,
                                  [p.id]: parseInt(e.target.value) || 1,
                                })
                              }
                              className="w-14 text-center p-1 bg-white border border-gray-200 rounded-lg text-xs"
                              title="Restock Quantity"
                            />
                            <button
                              onClick={() => handleRestock(p)}
                              className="px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold rounded-lg transition-colors flex items-center gap-1 text-[11px]"
                            >
                              <Plus className="w-3 h-3" /> Add
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
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
