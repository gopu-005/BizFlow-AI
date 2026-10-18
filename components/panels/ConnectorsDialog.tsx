'use client';

import React, { useState } from 'react';
import { Mail, MessageCircle, Database, FileSpreadsheet, CheckCircle2, AlertCircle, ExternalLink, ShieldCheck, X, RefreshCw } from 'lucide-react';
import { ConnectorStatus, Business } from '@/types/erp';

interface ConnectorsDialogProps {
  connectors: ConnectorStatus[];
  business: Business;
  onClose: () => void;
  onUpdateConnector?: () => void;
}

export const ConnectorsDialog: React.FC<ConnectorsDialogProps> = ({
  connectors,
  business,
  onClose,
  onUpdateConnector,
}) => {
  const [selectedType, setSelectedType] = useState<'gmail' | 'whatsapp' | 'postgres' | 'excel'>('gmail');
  const [isUpdating, setIsUpdating] = useState(false);

  const activeConnector = connectors.find((c) => c.type === selectedType) || connectors[0];

  const handleToggleConnection = async (type: string, shouldConnect: boolean) => {
    setIsUpdating(true);
    try {
      await fetch('/api/connectors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          action: shouldConnect ? 'connect' : 'disconnect',
          config: { apiKey: 'demo_authorized_token' },
        }),
      });
      if (onUpdateConnector) onUpdateConnector();
    } catch (e) {
      alert('Failed to update connector');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="w-full glass-card rounded-2xl p-6 shadow-xl border border-purple-200/80 transition-all animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-purple-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700 shadow-sm">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 font-heading">
              Connected Apps & Integrations
            </h3>
            <p className="text-xs text-gray-500">
              Manage live connections for Gmail, WhatsApp Business Cloud, and PostgreSQL
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

      {/* Tabs */}
      <div className="flex items-center gap-2 my-4 border-b border-gray-100 pb-2">
        {connectors.map((conn) => {
          const isSelected = conn.type === selectedType;
          return (
            <button
              key={conn.id}
              onClick={() => setSelectedType(conn.type)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                isSelected
                  ? 'bg-purple-100 text-purple-800 shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {conn.type === 'gmail' && <Mail className="w-4 h-4 text-red-500" />}
              {conn.type === 'whatsapp' && <MessageCircle className="w-4 h-4 text-emerald-500" />}
              {conn.type === 'postgres' && <Database className="w-4 h-4 text-blue-500" />}
              {conn.type === 'excel' && <FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
              <span>{conn.name}</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  conn.connected ? 'bg-emerald-500 ring-2 ring-emerald-200' : 'bg-rose-400'
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Detail panel */}
      {selectedType === 'gmail' && (
        <div className="space-y-4 text-xs">
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-start justify-between">
            <div className="space-y-1">
              <div className="font-bold text-gray-900 flex items-center gap-2">
                Gmail Integration (OAuth 2.0)
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    activeConnector.connected
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {activeConnector.connected ? 'Connected' : 'Setup Required'}
                </span>
              </div>
              <p className="text-gray-500">
                Restricted to metadata only (`gmail.metadata`). We never read personal emails or store passwords.
              </p>
            </div>

            <button
              onClick={() => handleToggleConnection('gmail', !activeConnector.connected)}
              disabled={isUpdating}
              className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all ${
                activeConnector.connected
                  ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                  : 'bg-purple-600 text-white hover:bg-purple-700 shadow-sm'
              }`}
            >
              {activeConnector.connected ? 'Disconnect' : 'Connect Gmail OAuth'}
            </button>
          </div>

          {/* Setup guidance when not connected */}
          {!activeConnector.connected ? (
            <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2">
              <div className="font-bold text-purple-900">How to configure your live Gmail connection:</div>
              <ol className="list-decimal list-inside space-y-1 text-gray-700">
                <li>Create a Google Cloud Project in Google Cloud Console.</li>
                <li>Enable the <strong>Gmail API</strong>.</li>
                <li>Configure OAuth Consent Screen and request <code>https://www.googleapis.com/auth/gmail.metadata</code>.</li>
                <li>Add your <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> to <code>.env.local</code>.</li>
              </ol>
            </div>
          ) : (
            <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-2">
              <div className="font-bold text-gray-800">Recent Order Emails Identified:</div>
              <div className="space-y-1.5">
                {(activeConnector.details?.orderEmails || []).map((m: any, i: number) => (
                  <div key={i} className="p-2 bg-gray-50 rounded-lg flex justify-between items-center text-[11px]">
                    <div>
                      <span className="font-semibold text-gray-900">{m.from}</span> — {m.subject}
                    </div>
                    <span className="text-gray-400">{m.date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {selectedType === 'whatsapp' && (
        <div className="space-y-4 text-xs">
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-start justify-between">
            <div className="space-y-1">
              <div className="font-bold text-gray-900 flex items-center gap-2">
                WhatsApp Business Platform (Cloud API)
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    activeConnector.connected
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {activeConnector.connected ? 'Connected' : 'Setup Required'}
                </span>
              </div>
              <p className="text-gray-500">
                Receives incoming customer inquiries and orders via Meta Graph Webhook API.
              </p>
            </div>

            <button
              onClick={() => handleToggleConnection('whatsapp', !activeConnector.connected)}
              disabled={isUpdating}
              className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all ${
                activeConnector.connected
                  ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
              }`}
            >
              {activeConnector.connected ? 'Disconnect' : 'Connect Meta Cloud API'}
            </button>
          </div>

          {!activeConnector.connected ? (
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
              <div className="font-bold text-emerald-950">How to configure WhatsApp Business Cloud API:</div>
              <ol className="list-decimal list-inside space-y-1 text-emerald-900">
                <li>Register a Meta Developer account and create a WhatsApp Business App.</li>
                <li>Obtain your <strong>Phone Number ID</strong> and <strong>Permanent System User Token</strong>.</li>
                <li>Set Webhook URL to <code>https://your-domain.com/api/webhooks/whatsapp</code>.</li>
                <li>Configure <code>WHATSAPP_PHONE_ID</code> and <code>WHATSAPP_ACCESS_TOKEN</code> in your environment.</li>
              </ol>
            </div>
          ) : (
            <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-2">
              <div className="font-bold text-gray-800">Live Incoming Customer Messages:</div>
              <div className="space-y-1.5">
                {(activeConnector.details?.incomingOrders || []).map((m: any, i: number) => (
                  <div key={i} className="p-2 bg-emerald-50/50 rounded-lg flex justify-between items-center text-[11px]">
                    <div>
                      <span className="font-semibold text-emerald-900">{m.sender}</span>: &quot;{m.message}&quot;
                    </div>
                    <span className="text-gray-400">{m.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {selectedType === 'postgres' && (
        <div className="space-y-3 text-xs">
          <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-950">Application Database: PostgreSQL 16</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Connected
              </span>
            </div>
            <p className="text-blue-900">
              Host: <span className="font-mono">localhost:5432 / Neon PG</span> · Isolation: <span className="font-semibold">Tenant-isolated via businessId filter</span>
            </p>
            <p className="text-gray-600">
              Supports least-privilege connection strings with connection pooling and query limits.
            </p>
          </div>
        </div>
      )}

      {selectedType === 'excel' && (
        <div className="space-y-3 text-xs">
          <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-950">Excel / CSV & OCR Importer</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Ready
              </span>
            </div>
            <p className="text-emerald-900">
              Accepts spreadsheets (.xlsx, .csv) and camera captures (.png, .jpg) of handwritten inventory registers.
            </p>
          </div>
        </div>
      )}

      {/* Done button */}
      <div className="flex justify-end pt-3 border-t border-gray-100">
        <button
          onClick={onClose}
          className="text-xs font-semibold px-4 py-2 bg-gray-900 text-white rounded-xl hover:bg-black transition-all"
        >
          Close
        </button>
      </div>
    </div>
  );
};
