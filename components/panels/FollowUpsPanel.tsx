'use client';

import React, { useState } from 'react';
import { Users, Phone, MessageSquare, Plus, Check, Calendar, X, Clock } from 'lucide-react';
import { FollowUpTask, Business } from '@/types/erp';

interface FollowUpsPanelProps {
  tasks: FollowUpTask[];
  business: Business;
  onClose: () => void;
  onRefresh?: () => void;
}

export const FollowUpsPanel: React.FC<FollowUpsPanelProps> = ({
  tasks: initialTasks,
  business,
  onClose,
  onRefresh,
}) => {
  const [tasks, setTasks] = useState<FollowUpTask[]>(initialTasks);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newScheduledDate, setNewScheduledDate] = useState('2024-10-16');
  const [newNotes, setNewNotes] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName) return;
    setIsAdding(true);

    try {
      const res = await fetch('/api/erp/follow-ups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: business.id,
          customerName: newCustomerName,
          customerPhone: newCustomerPhone,
          scheduledDate: newScheduledDate,
          notes: newNotes,
        }),
      });

      const data = await res.json();
      if (data.success && data.task) {
        setTasks([data.task, ...tasks]);
        setShowAddForm(false);
        setNewCustomerName('');
        setNewCustomerPhone('');
        setNewNotes('');
        if (onRefresh) onRefresh();
      }
    } catch (e) {
      alert('Failed to save reminder');
    } finally {
      setIsAdding(false);
    }
  };

  const handleMarkComplete = (taskId: string) => {
    setTasks(tasks.filter((t) => t.id !== taskId));
  };

  return (
    <div className="w-full glass-card rounded-2xl p-6 shadow-xl border border-purple-200/80 transition-all animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-purple-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700 shadow-sm">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 font-heading">
              Customer Follow-Up Reminders
            </h3>
            <p className="text-xs text-gray-500">
              Active scheduled reminders for {business.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> New Reminder
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Add New Reminder Form */}
      {showAddForm && (
        <form onSubmit={handleCreateReminder} className="my-4 p-4 bg-purple-50/70 border border-purple-200 rounded-xl space-y-3">
          <div className="text-xs font-bold text-purple-900">Schedule New Customer Follow-Up</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              required
              placeholder="Customer Name"
              value={newCustomerName}
              onChange={(e) => setNewCustomerName(e.target.value)}
              className="p-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-400 bg-white"
            />
            <input
              type="text"
              placeholder="Phone (e.g. +91 98401 23456)"
              value={newCustomerPhone}
              onChange={(e) => setNewCustomerPhone(e.target.value)}
              className="p-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-400 bg-white"
            />
            <input
              type="date"
              required
              value={newScheduledDate}
              onChange={(e) => setNewScheduledDate(e.target.value)}
              className="p-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-400 bg-white"
            />
          </div>
          <input
            type="text"
            placeholder="Follow-up notes (e.g. Inquire about wedding saree sizes, collect balance)"
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
            className="w-full p-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-400 bg-white"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs px-3 py-1.5 text-gray-600 hover:bg-gray-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isAdding}
              className="text-xs font-bold px-4 py-1.5 bg-purple-600 text-white hover:bg-purple-700 rounded-lg shadow-sm"
            >
              {isAdding ? 'Saving...' : 'Save Reminder'}
            </button>
          </div>
        </form>
      )}

      {/* Task List */}
      <div className="my-4 space-y-2.5">
        {tasks.length === 0 ? (
          <div className="text-center py-6 text-xs text-gray-500">
            No pending follow-ups. You are all caught up!
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className="p-3.5 bg-white/90 rounded-xl border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-purple-200 transition-all"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-gray-900">{task.customerName}</span>
                  {task.customerPhone && (
                    <span className="text-[11px] text-gray-500 font-mono">{task.customerPhone}</span>
                  )}
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                    <Clock className="w-3 h-3" /> Due {task.scheduledDate}
                  </span>
                </div>
                <p className="text-xs text-gray-600">{task.notes}</p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {task.customerPhone && (
                  <>
                    <a
                      href={`https://wa.me/${task.customerPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                        `Hello ${task.customerName}, greeting from ${business.name}! Regarding: ${task.notes}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors"
                      title="Send WhatsApp message"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </a>
                    <a
                      href={`tel:${task.customerPhone.replace(/[^0-9+]/g, '')}`}
                      className="p-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                      title="Call customer"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  </>
                )}
                <button
                  onClick={() => handleMarkComplete(task.id)}
                  className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg border border-gray-200 transition-colors"
                  title="Mark done"
                >
                  <Check className="w-3.5 h-3.5" /> Done
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Truthful delivery label as requested by acceptance criteria */}
      <div className="pt-3 border-t border-gray-100 text-[11px] text-gray-500">
        📌 <strong>Notice:</strong> Saved reminders are stored persistently in your BizFlow database. Outgoing automated WhatsApp/SMS notifications require approved WhatsApp Cloud API authorization.
      </div>
    </div>
  );
};
