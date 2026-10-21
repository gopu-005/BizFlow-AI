'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Play,
  Upload,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  DollarSign,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Sliders,
  History,
  FileCheck,
  Search,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { AgentRun, AgentApproval, AutonomyMode, AgentType, TransactionDraft, DocumentRecord } from '@/types/agent';

import { useBusiness } from '@/components/BusinessProvider';

export default function AgentWorkspacePage() {
  const { currentBusiness, businessId: activeBusinessId, setBusinessId: setActiveBusinessId } = useBusiness();
  const [activeTab, setActiveTab] = useState<'console' | 'entry' | 'activity'>('console');
  const [agentType, setAgentType] = useState<AgentType>('smart_entry');
  const [autonomyMode, setAutonomyMode] = useState<AutonomyMode>('guarded_autopilot');
  const [prompt, setPrompt] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [currentRun, setCurrentRun] = useState<AgentRun | null>(null);
  const [recentRuns, setRecentRuns] = useState<AgentRun[]>([]);
  const [quota, setQuota] = useState<{ usedAiRuns: number; maxAiRuns: number; usedExtractions: number; maxExtractions: number } | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Smart Entry Workspace State
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [drafts, setDrafts] = useState<TransactionDraft[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [pastedDocText, setPastedDocText] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');

  useEffect(() => {
    if (!activeBusinessId) return;
    loadQuota();
    loadRuns();
    loadEntryData();
  }, [activeBusinessId]);

  const loadQuota = async () => {
    try {
      const res = await fetch(`/api/agent/quota?businessId=${activeBusinessId}`);
      const data = await res.json();
      if (data.quota) setQuota(data.quota);
    } catch (e) {
      console.error(e);
    }
  };

  const loadRuns = async () => {
    try {
      const res = await fetch(`/api/agent/runs?businessId=${activeBusinessId}`);
      const data = await res.json();
      if (data.runs) {
        setRecentRuns(data.runs);
        if (!currentRun && data.runs.length > 0) {
          setCurrentRun(data.runs[0]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadEntryData = async () => {
    try {
      const res = await fetch(`/api/entry?businessId=${activeBusinessId}`);
      const data = await res.json();
      if (data.documents) setDocuments(data.documents);
      if (data.drafts) setDrafts(data.drafts);
    } catch (e) {
      console.error(e);
    }
  };

  // Run the multi-step agent workflow
  const handleExecuteAgent = async (overridePrompt?: string) => {
    const textToRun = (overridePrompt || prompt).trim();
    if (!textToRun) return;

    setIsRunning(true);
    setFeedbackMsg(null);

    try {
      const res = await fetch('/api/agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: activeBusinessId,
          agentType,
          prompt: textToRun,
          autonomyMode,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Execution failed');
      }

      setCurrentRun(data.run);
      setRecentRuns((prev) => [data.run, ...prev.filter((r) => r.id !== data.run.id)]);
      loadQuota();
      loadEntryData();
      setFeedbackMsg({
        type: 'success',
        text: data.run.status === 'awaiting_approval'
          ? 'Agent formulated execution plan. Consequential action paused for your review.'
          : 'Agent workflow finished successfully!',
      });
      setPrompt('');
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Workflow execution failed' });
    } finally {
      setIsRunning(false);
    }
  };

  // Respond to Human-in-the-loop Approval
  const handleApproval = async (approvalId: string, status: 'approved' | 'rejected') => {
    if (!currentRun) return;

    try {
      const res = await fetch('/api/agent/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: activeBusinessId,
          runId: currentRun.id,
          approvalId,
          status,
          reason: status === 'rejected' ? 'Rejected by owner in workspace' : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Approval action failed');

      setCurrentRun(data.run);
      setRecentRuns((prev) => prev.map((r) => (r.id === data.run.id ? data.run : r)));
      loadQuota();
      loadEntryData();
      setFeedbackMsg({
        type: 'success',
        text: status === 'approved' ? 'Action approved and executed on ledger.' : 'Action rejected safely.',
      });
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to process approval.' });
    }
  };

  // Direct Document OCR / Text Extraction
  const handleExtractDocument = async () => {
    if (!pastedDocText.trim()) return;

    setIsExtracting(true);
    setFeedbackMsg(null);

    try {
      const res = await fetch('/api/entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: activeBusinessId,
          action: 'extract',
          payload: {
            rawText: pastedDocText,
            fileName: selectedFileName || 'Bill_Receipt.txt',
            fileType: 'text',
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Extraction failed');

      loadEntryData();
      loadQuota();
      setPastedDocText('');
      setFeedbackMsg({
        type: 'success',
        text: `Extracted ${data.draft?.transactionType || 'transaction'} with ${Math.round((data.draft?.confidence || 0.8) * 100)}% confidence. Review draft below.`,
      });
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Document extraction failed.' });
    } finally {
      setIsExtracting(false);
    }
  };

  // Commit Draft to official ledger
  const handleCommitDraft = async (draftId: string) => {
    try {
      const res = await fetch('/api/entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: activeBusinessId,
          action: 'commit_draft',
          payload: { draftId },
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Commit failed');

      loadEntryData();
      setFeedbackMsg({
        type: 'success',
        text: 'Transaction committed to official records. Note: Goods receipt workflow required before stock update.',
      });
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to commit draft.' });
    }
  };

  // Quick preset sample commands
  const samplePrompts = [
    { type: 'smart_entry', label: 'Record ₹850 transportation expense today', text: 'Record ₹850 paid for transportation today' },
    { type: 'udhaar_collection', label: 'Audit overdue customer udhaar & credit', text: 'Audit all customer credit balances and show aging' },
    { type: 'daily_closing', label: 'Perform daily closing & cash reconciliation', text: "Close today's accounts and reconcile cash" },
    { type: 'daily_closing', label: 'Investigate low margin products & discounts', text: 'Identify margin anomalies and unusual discounts' },
  ];

  return (
    <div className="min-h-screen bg-[#fbfbfe] text-[#0f172a] flex flex-col justify-between">
      <Navbar currentBusinessId={activeBusinessId} onBusinessChange={(id) => setActiveBusinessId(id)} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header & Quota Meter */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-purple-100 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-purple-100 text-purple-700 font-bold">
                <Sparkles className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-bold font-heading text-gray-900">
                Agentic Business Operating System
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Shared multi-step agent orchestrator running bounded business workflows with server-enforced guardrails.
            </p>
          </div>

          {/* Live Quota Bar */}
          {quota && (
            <div className="flex items-center gap-4 bg-purple-50/60 border border-purple-100 p-3 rounded-xl shrink-0">
              <div>
                <div className="text-[11px] font-semibold text-purple-900">AI Workflow Runs</div>
                <div className="text-sm font-bold text-purple-700">
                  {quota.usedAiRuns} <span className="text-gray-400 font-normal">/ {quota.maxAiRuns}</span>
                </div>
                <div className="w-28 h-1.5 bg-purple-200 rounded-full mt-1 overflow-hidden">
                  <div
                    className="h-full bg-purple-600 rounded-full"
                    style={{ width: `${Math.min(100, (quota.usedAiRuns / quota.maxAiRuns) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="border-l border-purple-200 pl-4">
                <div className="text-[11px] font-semibold text-purple-900">Doc Extractions</div>
                <div className="text-sm font-bold text-purple-700">
                  {quota.usedExtractions} <span className="text-gray-400 font-normal">/ {quota.maxExtractions}</span>
                </div>
                <div className="w-28 h-1.5 bg-purple-200 rounded-full mt-1 overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full"
                    style={{ width: `${Math.min(100, (quota.usedExtractions / quota.maxExtractions) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-gray-200 gap-2">
          <button
            onClick={() => setActiveTab('console')}
            className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'console'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Agent Console & Workflow
          </button>
          <button
            onClick={() => setActiveTab('entry')}
            className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'entry'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Upload className="w-4 h-4" />
            Smart Entry & Documents
            {drafts.filter((d) => d.status === 'draft').length > 0 && (
              <span className="bg-purple-100 text-purple-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {drafts.filter((d) => d.status === 'draft').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'activity'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <History className="w-4 h-4" />
            Activity & Audit Log ({recentRuns.length})
          </button>
        </div>

        {/* Feedback Message */}
        {feedbackMsg && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 ${
              feedbackMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <span>{feedbackMsg.text}</span>
            <button onClick={() => setFeedbackMsg(null)} className="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>
        )}

        {/* --- TAB 1: CONSOLE & SHARED ORCHESTRATOR --- */}
        {activeTab === 'console' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Prompt, Policy Mode, and Live Execution Timeline */}
            <div className="lg:col-span-2 space-y-6">
              {/* Agent Configuration Card */}
              <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-xs space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Agent Type */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Target Agent</label>
                    <select
                      value={agentType}
                      onChange={(e) => setAgentType(e.target.value as AgentType)}
                      className="w-full text-xs font-medium p-2.5 rounded-xl border border-gray-200 bg-white focus:outline-purple-600"
                    >
                      <option value="smart_entry">Smart Entry Agent (Bills, Receipts & Expenses)</option>
                      <option value="udhaar_collection">Udhaar & Collection Agent (Credit & Reminders)</option>
                      <option value="daily_closing">Profit Leak & Daily Closing Agent (Reconciliation)</option>
                      <option value="general">General Operating Orchestrator</option>
                    </select>
                  </div>

                  {/* Autonomy Mode */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center justify-between">
                      <span>Server Autonomy Guard</span>
                      <span className="text-[10px] text-purple-600 font-normal">Policy Enforced</span>
                    </label>
                    <select
                      value={autonomyMode}
                      onChange={(e) => setAutonomyMode(e.target.value as AutonomyMode)}
                      className="w-full text-xs font-medium p-2.5 rounded-xl border border-gray-200 bg-white focus:outline-purple-600"
                    >
                      <option value="guarded_autopilot">Guarded Autopilot (Consequential actions need approval)</option>
                      <option value="suggest_only">Suggest Only (Drafts & recommendations only)</option>
                      <option value="trusted_autopilot">Trusted Autopilot (Autonomous within ₹50k limit)</option>
                    </select>
                  </div>
                </div>

                {/* Natural Language Prompt Input */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Business Instruction</label>
                  <div className="relative">
                    <textarea
                      rows={3}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder='e.g., "Record ₹850 paid for transportation today" or "Close today accounts and check cash variance"'
                      className="w-full text-xs sm:text-sm p-3 rounded-xl border border-gray-200 focus:outline-purple-600 bg-white placeholder-gray-400"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex flex-wrap gap-1.5">
                        {samplePrompts.slice(0, 2).map((sp, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setAgentType(sp.type as AgentType);
                              setPrompt(sp.text);
                            }}
                            className="text-[10px] bg-purple-50 hover:bg-purple-100 text-purple-700 px-2 py-1 rounded-lg border border-purple-200"
                          >
                            {sp.label}
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={() => handleExecuteAgent()}
                        disabled={isRunning || !prompt.trim()}
                        className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                      >
                        {isRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                        Execute Workflow
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Run Execution Timeline */}
              {currentRun && (
                <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          currentRun.status === 'completed'
                            ? 'bg-emerald-500'
                            : currentRun.status === 'awaiting_approval'
                            ? 'bg-amber-500 animate-pulse'
                            : currentRun.status === 'failed'
                            ? 'bg-rose-500'
                            : 'bg-indigo-500 animate-pulse'
                        }`}
                      />
                      <span className="text-sm font-bold text-gray-900 font-heading">
                        Workflow Run: {currentRun.id}
                      </span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                        {currentRun.agentType.replace('_', ' ')}
                      </span>
                    </div>

                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                        currentRun.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : currentRun.status === 'awaiting_approval'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : currentRun.status === 'failed'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-indigo-100 text-indigo-800'
                      }`}
                    >
                      {currentRun.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                    <span className="font-bold text-gray-700">User Prompt:</span> "{currentRun.userPrompt}"
                  </div>

                  {/* Planned Execution Steps */}
                  {currentRun.plan && currentRun.plan.length > 0 && (
                    <div>
                      <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                        Synthesized Execution Plan
                      </div>
                      <div className="space-y-1">
                        {currentRun.plan.map((stepDesc, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs text-gray-600">
                            <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <span>{stepDesc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Step Timeline */}
                  <div className="space-y-3 pt-2">
                    <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      Tool Execution Timeline
                    </div>
                    {currentRun.steps.map((step) => (
                      <div key={step.id} className="p-3 rounded-xl border border-gray-100 bg-white hover:border-purple-200 transition-colors space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-bold text-gray-800">
                            {step.status === 'completed' ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            ) : step.status === 'failed' ? (
                              <XCircle className="w-4 h-4 text-rose-600" />
                            ) : (
                              <Clock className="w-4 h-4 text-amber-600" />
                            )}
                            <span>{step.title}</span>
                          </div>
                          <span className="text-[10px] text-gray-400">
                            {new Date(step.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">{step.description}</p>

                        {/* Tool Call Result */}
                        {step.toolCalls.map((tc) => (
                          <div key={tc.id} className="text-[11px] bg-slate-50 p-2 rounded-lg font-mono text-slate-700 overflow-x-auto">
                            <div className="flex items-center justify-between text-slate-500 mb-1">
                              <span>Tool: {tc.toolName}</span>
                              {tc.executionTimeMs && <span>{tc.executionTimeMs}ms</span>}
                            </div>
                            {tc.output && (
                              <div className="text-slate-800 font-sans text-xs">
                                {tc.output.message || JSON.stringify(tc.output).substring(0, 180)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>

                  {/* Human-in-the-loop Pending Approval Card */}
                  {currentRun.approvals && currentRun.approvals.filter((a) => a.status === 'pending').map((approval) => (
                    <div key={approval.id} className="p-4 rounded-xl bg-amber-50 border-2 border-amber-300 space-y-3 animate-in fade-in">
                      <div className="flex items-start gap-2.5">
                        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                            Business Owner Approval Required
                          </div>
                          <div className="text-xs text-amber-800 mt-0.5">{approval.description}</div>
                        </div>
                      </div>

                      <div className="text-xs bg-white/80 p-2.5 rounded-lg border border-amber-200">
                        <div className="font-bold text-gray-700">Action: {approval.toolName}</div>
                        <div className="text-gray-600 mt-0.5">
                          Payload: {JSON.stringify(approval.payload)}
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          onClick={() => handleApproval(approval.id, 'rejected')}
                          className="px-3 py-1.5 rounded-lg bg-white border border-rose-300 hover:bg-rose-50 text-rose-700 text-xs font-bold"
                        >
                          Reject Action
                        </button>
                        <button
                          onClick={() => handleApproval(approval.id, 'approved')}
                          className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs"
                        >
                          Approve & Execute
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Summary / Result */}
                  {currentRun.summary && (
                    <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200 text-xs text-purple-900">
                      <span className="font-bold">Final Workflow Conclusion:</span> {currentRun.summary}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right 1 Col: Quick Links, Workspaces, and Recent History */}
            <div className="space-y-6">
              {/* Specialized Workspaces Navigation Card */}
              <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-xs space-y-3">
                <h3 className="text-sm font-bold text-gray-900 font-heading">Specialized Agent Workspaces</h3>
                <div className="space-y-2">
                  <Link
                    href="/udhaar"
                    className="p-3 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50/50 flex items-center justify-between group transition-all"
                  >
                    <div>
                      <div className="text-xs font-bold text-gray-900 group-hover:text-purple-700">
                        Udhaar & Collections Workspace
                      </div>
                      <div className="text-[11px] text-gray-500">Aging buckets & WhatsApp reminders</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                  </Link>

                  <Link
                    href="/closing"
                    className="p-3 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50/50 flex items-center justify-between group transition-all"
                  >
                    <div>
                      <div className="text-xs font-bold text-gray-900 group-hover:text-purple-700">
                        Daily Closing & Profit Leaks
                      </div>
                      <div className="text-[11px] text-gray-500">Reconciliation & margin audit</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                  </Link>

                  <Link
                    href="/billing"
                    className="p-3 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50/50 flex items-center justify-between group transition-all"
                  >
                    <div>
                      <div className="text-xs font-bold text-gray-900 group-hover:text-purple-700">
                        BizFlow Starter Plan (₹299/mo)
                      </div>
                      <div className="text-[11px] text-gray-500">Manage quotas & subscription</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>

              {/* Recent Runs Mini List */}
              <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 font-heading">Recent Workflow Runs</h3>
                  <button onClick={loadRuns} className="text-purple-600 hover:text-purple-800 text-xs font-semibold">
                    Refresh
                  </button>
                </div>

                <div className="space-y-2">
                  {recentRuns.slice(0, 5).map((run) => (
                    <button
                      key={run.id}
                      onClick={() => setCurrentRun(run)}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all text-xs ${
                        currentRun?.id === run.id
                          ? 'bg-purple-50/80 border-purple-300 font-bold'
                          : 'border-gray-100 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-800 truncate max-w-[140px]">
                          {run.userPrompt}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                            run.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : run.status === 'awaiting_approval'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {run.status}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1 flex items-center justify-between">
                        <span>{run.agentType}</span>
                        <span>{new Date(run.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </button>
                  ))}
                  {recentRuns.length === 0 && (
                    <div className="text-xs text-gray-400 text-center py-4">No recent runs recorded.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 2: SMART ENTRY & DOCUMENT INBOX --- */}
        {activeTab === 'entry' && (
          <div className="space-y-6">
            {/* Upload / OCR Input Box */}
            <div className="bg-white p-6 rounded-2xl border border-purple-100 shadow-xs space-y-4">
              <div>
                <h2 className="text-base font-bold text-gray-900 font-heading">
                  Smart Document Extraction & Invoice Inbox
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Paste OCR invoice text, supplier bills, or receipts. The Smart Entry Agent validates totals, checks duplicates, and prepares drafts for your review.
                </p>
              </div>

              <div className="space-y-2">
                <textarea
                  rows={4}
                  value={pastedDocText}
                  onChange={(e) => setPastedDocText(e.target.value)}
                  placeholder="Paste supplier bill or receipt text, e.g.:&#10;TAX INVOICE #INV-4921&#10;Supplier: Lakshmi Spinning Mills&#10;Date: 2024-10-14&#10;Cotton Yarn 50s x 10 @ 450&#10;GST: 225&#10;Total: ₹4,725"
                  className="w-full text-xs sm:text-sm p-3 rounded-xl border border-gray-200 focus:outline-purple-600 font-mono"
                />

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="File name (e.g. invoice_4921.pdf)"
                      value={selectedFileName}
                      onChange={(e) => setSelectedFileName(e.target.value)}
                      className="text-xs p-2 rounded-lg border border-gray-200 w-48"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setPastedDocText(`TAX INVOICE #INV-8821\nSupplier: Chennai Threads Ltd\nDate: 2024-10-15\nPolyester Thread Spools x 20 @ 180\nGST: 180\nTotal Amount: ₹3,780`);
                        setSelectedFileName('Bill_ChennaiThreads.pdf');
                      }}
                      className="text-[11px] text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2 py-1.5 rounded-lg"
                    >
                      Fill Sample Bill
                    </button>
                  </div>

                  <button
                    onClick={handleExtractDocument}
                    disabled={isExtracting || !pastedDocText.trim()}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    {isExtracting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    Extract & Create Draft
                  </button>
                </div>
              </div>
            </div>

            {/* Extracted Transaction Drafts Awaiting Confirmation */}
            <div className="bg-white p-6 rounded-2xl border border-purple-100 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 font-heading">
                    Transaction Drafts Awaiting Confirmation ({drafts.filter((d) => d.status === 'draft').length})
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Stock is strictly updated only through verified goods receipt, not by invoice upload alone.
                  </p>
                </div>
                <button onClick={loadEntryData} className="text-purple-600 hover:text-purple-800 text-xs font-semibold">
                  Refresh Drafts
                </button>
              </div>

              <div className="space-y-3">
                {drafts.map((draft) => (
                  <div
                    key={draft.id}
                    className={`p-4 rounded-xl border transition-all ${
                      draft.status === 'committed'
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : 'bg-white border-purple-100 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-900">{draft.counterpartyName}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                            Ref: {draft.referenceNumber || draft.id}
                          </span>
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                            {draft.transactionType}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          Date: {draft.date} | Confidence: {Math.round(draft.confidence * 100)}%
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-sm font-bold text-gray-900">
                            ₹{draft.total.toLocaleString('en-IN')}
                          </div>
                          <div className="text-[10px] text-gray-400">Tax: ₹{draft.taxAmount}</div>
                        </div>

                        {draft.status === 'draft' ? (
                          <button
                            onClick={() => handleCommitDraft(draft.id)}
                            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                          >
                            Commit to Ledger
                          </button>
                        ) : (
                          <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 bg-emerald-100 px-2.5 py-1 rounded-lg">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Committed
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Warnings & Duplicate Notice */}
                    {draft.warnings && draft.warnings.length > 0 && (
                      <div className="mt-2.5 p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                        <span>{draft.warnings.join(' | ')}</span>
                      </div>
                    )}

                    {/* Items List */}
                    {draft.items && draft.items.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-gray-50 text-xs text-gray-600">
                        <div className="font-semibold text-gray-700 text-[11px] mb-1">Line Items:</div>
                        <div className="space-y-1">
                          {draft.items.map((it, idx) => (
                            <div key={idx} className="flex items-center justify-between text-[11px]">
                              <span>
                                {it.name} (Qty: {it.quantity} @ ₹{it.unitPrice})
                              </span>
                              <span className="font-semibold">₹{it.total}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {drafts.length === 0 && (
                  <div className="text-xs text-gray-400 text-center py-6">
                    No transaction drafts found. Paste a receipt or bill above to generate one.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 3: ACTIVITY & AUDIT LOG --- */}
        {activeTab === 'activity' && (
          <div className="bg-white p-6 rounded-2xl border border-purple-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900 font-heading">Agent Activity & Audit History</h2>
                <p className="text-xs text-gray-500">
                  Immutable record of every user request, execution plan, validated tool calls, and human approvals.
                </p>
              </div>
              <button onClick={loadRuns} className="text-purple-600 hover:text-purple-800 text-xs font-semibold">
                Refresh Log
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Run ID</th>
                    <th className="py-2.5 px-3">Agent</th>
                    <th className="py-2.5 px-3">Instruction</th>
                    <th className="py-2.5 px-3">Autonomy Mode</th>
                    <th className="py-2.5 px-3">Steps / Tools</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentRuns.map((run) => (
                    <tr
                      key={run.id}
                      onClick={() => {
                        setCurrentRun(run);
                        setActiveTab('console');
                      }}
                      className="hover:bg-purple-50/40 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-gray-700">{run.id}</td>
                      <td className="py-2.5 px-3 font-semibold text-purple-900">
                        {run.agentType.replace('_', ' ')}
                      </td>
                      <td className="py-2.5 px-3 max-w-[200px] truncate text-gray-800">
                        {run.userPrompt}
                      </td>
                      <td className="py-2.5 px-3 text-gray-600">{run.autonomyMode}</td>
                      <td className="py-2.5 px-3 font-medium text-gray-700">
                        {run.steps.length} completed
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                            run.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : run.status === 'awaiting_approval'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {run.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-gray-400">
                        {new Date(run.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {recentRuns.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-6 text-gray-400">
                        No activity recorded yet.
                      </td>
                    </tr>
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
