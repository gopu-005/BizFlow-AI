'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  MessageCircle,
  Phone,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowLeft,
  Calendar,
  Send,
  RefreshCw,
  Search,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Business, Customer, FollowUpTask } from '@/types/erp';

export default function CustomersPage() {
  const [businessId, setBusinessId] = useState('biz_karthik_textiles');
  const [tasks, setTasks] = useState<FollowUpTask[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'completed' | 'all'>('pending');
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
    fetchData();
  }, [businessId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const fRes = await fetch(`/api/erp/follow-ups?businessId=${businessId}`);
      const fJson = await fRes.json();
      setTasks(fJson.tasks || []);

      const cRes = await fetch(`/api/erp/customers?businessId=${businessId}`);
      const cJson = await cRes.json();
      setCustomers(cJson.customers || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      await fetch('/api/erp/follow-ups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          taskId,
          status: nextStatus,
        }),
      });
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus as any } : t))
      );
    } catch (e) {
      alert('Failed to update task');
    }
  };

  const handleSendWhatsApp = (task: FollowUpTask) => {
    const text = encodeURIComponent(
      `Hello ${task.customerName}, this is a gentle reminder from ${currentBusiness.name} regarding ${task.title}. ${
        task.amountDue ? `Pending dues: ₹${task.amountDue.toLocaleString('en-IN')}. ` : ''
      }Please feel free to reach out. Thank you!`
    );
    window.open(`https://wa.me/${task.customerPhone.replace(/[^0-9]/g, '')}?text=${text}`, '_blank');
  };

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'pending' && t.status !== 'pending') return false;
    if (filter === 'completed' && t.status !== 'completed') return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.customerName.toLowerCase().includes(q) ||
      t.title.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q)
    );
  });

  const pendingCount = tasks.filter((t) => t.status === 'pending').length;
  const totalDues = tasks
    .filter((t) => t.status === 'pending' && t.amountDue)
    .reduce((sum, t) => sum + (t.amountDue || 0), 0);

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
              <span className="text-gray-500">Customer CRM & Follow-ups</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 font-heading">
              Customer Follow-ups & Dues
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Automate pending dues reminders, order callbacks, and quotation follow-ups via WhatsApp
            </p>
          </div>

          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-xs font-semibold text-purple-700 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-card rounded-2xl p-5 border border-purple-100">
            <div className="flex items-center justify-between text-xs text-gray-500 font-medium mb-1">
              <span>Pending Follow-ups</span>
              <Clock className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 font-heading">
              {pendingCount} Tasks
            </div>
            <div className="text-[11px] text-purple-700 mt-1 font-semibold">Scheduled for action</div>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-purple-100">
            <div className="flex items-center justify-between text-xs text-gray-500 font-medium mb-1">
              <span>Total Dues Outstanding</span>
              <AlertCircle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-700 font-heading">
              ₹{totalDues.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-amber-700 mt-1">Pending payment collection</div>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-purple-100">
            <div className="flex items-center justify-between text-xs text-gray-500 font-medium mb-1">
              <span>Customer Base</span>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 font-heading">
              {customers.length || 18} Customers
            </div>
            <div className="text-[11px] text-gray-500 mt-1">With order histories</div>
          </div>
        </div>

        {/* Filters & Tasks Table */}
        <div className="glass-card rounded-2xl border border-purple-100 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {(['pending', 'completed', 'all'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold capitalize transition-all ${
                    filter === f
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-gray-600 hover:text-purple-700 hover:bg-purple-50'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search follow-up task or customer..."
                className="w-full bg-white border border-purple-100 rounded-xl pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:border-purple-400"
              />
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {filteredTasks.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-xs">
                No follow-up tasks match this filter.
              </div>
            ) : (
              filteredTasks.map((task) => {
                const isDone = task.status === 'completed';

                return (
                  <div
                    key={task.id}
                    className={`p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors ${
                      isDone ? 'bg-gray-50/60 opacity-60' : 'hover:bg-purple-50/20'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => handleToggleTask(task.id, task.status)}
                        className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                          isDone
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-gray-300 hover:border-purple-500'
                        }`}
                        title={isDone ? 'Mark as Pending' : 'Mark as Done'}
                      >
                        {isDone && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </button>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4
                            className={`text-xs font-bold ${
                              isDone ? 'line-through text-gray-500' : 'text-gray-900'
                            }`}
                          >
                            {task.title}
                          </h4>
                          {task.amountDue && (
                            <span className="text-[10px] font-extrabold px-2 py-0.2 rounded-full bg-amber-100 text-amber-800">
                              ₹{task.amountDue.toLocaleString('en-IN')} Due
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-gray-500 mt-0.5">{task.description}</p>

                        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-400">
                          <span className="font-semibold text-purple-700">{task.customerName}</span>
                          <span>•</span>
                          <span>{task.customerPhone}</span>
                          <span>•</span>
                          <span>Due: {task.dueDate}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        onClick={() => handleSendWhatsApp(task)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>WhatsApp</span>
                      </button>

                      <a
                        href={`tel:${task.customerPhone}`}
                        className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
                        title="Call Customer"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
