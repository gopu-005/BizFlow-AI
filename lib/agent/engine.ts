import { db } from '@/lib/db/database';
import {
  AgentType,
  AutonomyMode,
  AgentRun,
  AgentStep,
  AgentApproval,
  AgentToolCall,
  AgentToolName,
  SourceRecordRef,
} from '@/types/agent';
import { AGENT_TOOLS } from './tools';

export interface ExecuteAgentOptions {
  businessId: string;
  agentType: AgentType;
  prompt: string;
  autonomyMode?: AutonomyMode;
  documentId?: string;
  initialContext?: Record<string, any>;
}

export class AgentExecutionEngine {
  private static MAX_ITERATIONS = 5;

  /**
   * Main entry point to launch an agent run
   */
  public static async startRun(options: ExecuteAgentOptions): Promise<AgentRun> {
    const { businessId, agentType, prompt, autonomyMode = 'guarded_autopilot', documentId, initialContext } = options;

    db.assertTenant(businessId);

    // 1. Check and decrement server quota
    const quotaCheck = db.checkAndIncrementQuota(businessId, 'ai_run');
    if (!quotaCheck.allowed) {
      throw new Error(
        `AI workflow quota exceeded. You have reached the monthly limit of ${quotaCheck.quota.maxAiRuns} runs on the BizFlow AI Starter plan.`
      );
    }

    const runId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const initialRun: AgentRun = {
      id: runId,
      businessId,
      agentType,
      userPrompt: prompt,
      autonomyMode,
      status: 'planning',
      plan: [],
      currentStepIndex: 0,
      steps: [],
      approvals: [],
      sourceRecords: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.createAgentRun(initialRun);

    // 2. Synthesize plan and execute multi-step tools
    return await this.orchestrate(initialRun, documentId, initialContext);
  }

  /**
   * Resume an agent run when an approval is granted or rejected
   */
  public static async resumeRunAfterApproval(businessId: string, runId: string, approvalId: string): Promise<AgentRun> {
    db.assertTenant(businessId);
    const run = db.getAgentRun(businessId, runId);
    if (!run) throw new Error(`Agent run ${runId} not found.`);

    const approval = run.approvals.find((a) => a.id === approvalId);
    if (!approval) throw new Error(`Approval ${approvalId} not found.`);

    if (approval.status === 'rejected') {
      run.status = 'completed';
      run.summary = `Action was rejected by business owner: ${approval.reason || 'No reason provided'}. Execution halted safely.`;
      run.updatedAt = new Date().toISOString();
      db.updateAgentRun(businessId, runId, run);
      return run;
    }

    // Execute the approved tool
    const toolName = approval.toolName;
    const tool = AGENT_TOOLS[toolName];
    if (!tool) {
      throw new Error(`Tool ${toolName} requested by approval is not registered.`);
    }

    const startTime = Date.now();
    try {
      const result = await tool.execute(businessId, approval.payload);
      const toolCall: AgentToolCall = {
        id: `tc_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        toolName,
        input: approval.payload,
        output: result,
        status: 'success',
        riskLevel: 'medium',
        timestamp: new Date().toISOString(),
        executionTimeMs: Date.now() - startTime,
      };

      const step: AgentStep = {
        id: `step_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        title: `Execute Approved Action: ${toolName}`,
        description: `Carried out approved ${toolName} action.`,
        status: 'completed',
        toolCalls: [toolCall],
        timestamp: new Date().toISOString(),
      };

      run.steps.push(step);
      run.currentStepIndex = run.steps.length;
      run.status = 'completed';
      run.summary = `Approved action ${toolName} was executed successfully.`;
      run.updatedAt = new Date().toISOString();
      run.completedAt = new Date().toISOString();
      db.updateAgentRun(businessId, runId, run);
      return run;
    } catch (err: any) {
      run.status = 'failed';
      run.error = err.message || 'Execution of approved tool failed';
      run.updatedAt = new Date().toISOString();
      db.updateAgentRun(businessId, runId, run);
      return run;
    }
  }

  /**
   * Internal orchestrator that evaluates intent, selects tools, checks policy, and commits actions
   */
  private static async orchestrate(
    run: AgentRun,
    documentId?: string,
    initialContext?: Record<string, any>
  ): Promise<AgentRun> {
    const { businessId, agentType, userPrompt, autonomyMode } = run;

    // Determine plan based on agentType and prompt
    const plannedActions = this.planWorkflow(agentType, userPrompt, documentId, initialContext);
    run.plan = plannedActions.map((p) => p.description);
    run.status = 'executing';
    db.updateAgentRun(businessId, run.id, { plan: run.plan, status: 'executing' });

    for (let i = 0; i < plannedActions.length; i++) {
      if (i >= this.MAX_ITERATIONS) break;
      const planned = plannedActions[i];
      run.currentStepIndex = i + 1;

      // Policy check: does this action require human approval?
      const requiresApproval = this.checkRequiresApproval(planned.toolName, planned.params, autonomyMode);

      if (requiresApproval) {
        const toolCallId = `tc_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
        const approval: AgentApproval = {
          id: `appr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          runId: run.id,
          toolCallId,
          toolName: planned.toolName,
          actionType: planned.toolName,
          description: planned.description,
          payload: planned.params,
          status: 'pending',
          requestedAt: new Date().toISOString(),
        };

        db.createApproval(approval);
        run.approvals.push(approval);
        run.status = 'awaiting_approval';

        const step: AgentStep = {
          id: `step_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
          title: planned.title || `Awaiting Owner Approval: ${planned.toolName}`,
          description: `Action paused pending business owner approval (${autonomyMode} mode).`,
          status: 'pending',
          toolCalls: [
            {
              id: toolCallId,
              toolName: planned.toolName,
              input: planned.params,
              status: 'requires_approval',
              requiresApproval: true,
              riskLevel: 'high',
              timestamp: new Date().toISOString(),
            },
          ],
          timestamp: new Date().toISOString(),
        };
        run.steps.push(step);
        db.updateAgentRun(businessId, run.id, {
          steps: run.steps,
          status: 'awaiting_approval',
          approvals: run.approvals,
          currentStepIndex: run.currentStepIndex,
        });
        return run;
      }

      // Execute tool
      const tool = AGENT_TOOLS[planned.toolName];
      if (!tool) {
        throw new Error(`Tool ${planned.toolName} not found.`);
      }

      const startTime = Date.now();
      try {
        const result = await tool.execute(businessId, planned.params);
        const execTime = Date.now() - startTime;

        // Collect source record refs
        if (result && (result.id || result.document?.id || result.paymentId)) {
          const refId = result.id || result.document?.id || result.paymentId;
          const refType: SourceRecordRef['type'] = planned.toolName.includes('document')
            ? 'document'
            : planned.toolName.includes('draft')
            ? 'invoice'
            : planned.toolName.includes('payment')
            ? 'payment'
            : 'closing';

          run.sourceRecords.push({
            type: refType,
            id: refId,
            label: result.referenceNumber || result.invoiceNumber || result.fileName || refId,
            amount: result.total || result.amount,
          });
        }

        const toolCall: AgentToolCall = {
          id: `tc_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
          toolName: planned.toolName,
          input: planned.params,
          output: result,
          status: 'success',
          riskLevel: 'low',
          timestamp: new Date().toISOString(),
          executionTimeMs: execTime,
        };

        const summaryText = planned.summaryGenerator
          ? planned.summaryGenerator(result)
          : `Executed ${planned.toolName} successfully.`;

        const step: AgentStep = {
          id: `step_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
          title: planned.title || `Execute: ${planned.toolName}`,
          description: summaryText,
          status: 'completed',
          toolCalls: [toolCall],
          timestamp: new Date().toISOString(),
        };
        run.steps.push(step);

        // Update run state
        db.updateAgentRun(businessId, run.id, {
          steps: run.steps,
          sourceRecords: run.sourceRecords,
          currentStepIndex: run.currentStepIndex,
        });

        // If this is the last step, finalize
        if (i === plannedActions.length - 1) {
          run.status = 'completed';
          run.summary = summaryText;
          run.completedAt = new Date().toISOString();
          db.updateAgentRun(businessId, run.id, {
            status: 'completed',
            summary: run.summary,
            completedAt: run.completedAt,
          });
          return run;
        }
      } catch (err: any) {
        const toolCall: AgentToolCall = {
          id: `tc_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
          toolName: planned.toolName,
          input: planned.params,
          status: 'failed',
          error: err.message || 'Execution failed',
          riskLevel: 'medium',
          timestamp: new Date().toISOString(),
          executionTimeMs: Date.now() - startTime,
        };

        const step: AgentStep = {
          id: `step_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
          title: planned.title || `Failed: ${planned.toolName}`,
          description: `Error executing ${planned.toolName}: ${err.message}`,
          status: 'failed',
          toolCalls: [toolCall],
          timestamp: new Date().toISOString(),
        };
        run.steps.push(step);
        run.status = 'failed';
        run.error = err.message || 'Workflow step failed';
        db.updateAgentRun(businessId, run.id, {
          steps: run.steps,
          status: 'failed',
          error: run.error,
        });
        return run;
      }
    }

    run.status = 'completed';
    run.completedAt = new Date().toISOString();
    db.updateAgentRun(businessId, run.id, { status: 'completed', completedAt: run.completedAt });
    return run;
  }

  /**
   * Determine policy-enforced human approval requirements
   */
  private static checkRequiresApproval(toolName: AgentToolName, params: any, mode: AutonomyMode): boolean {
    const readOnlyTools: AgentToolName[] = [
      'search_customers',
      'search_products',
      'extract_business_document',
      'validate_transaction',
      'detect_duplicate_transaction',
      'get_customer_ledger',
      'prepare_payment_reminder',
      'calculate_business_metrics',
      'identify_margin_anomalies',
      'generate_daily_closing_report',
      'get_task_status',
    ];

    if (readOnlyTools.includes(toolName)) {
      return false;
    }

    if (mode === 'suggest_only') {
      return true;
    }

    if (mode === 'guarded_autopilot') {
      if (toolName === 'create_transaction_draft') return false;
      if (toolName === 'approve_and_commit_transaction') return true;
      if (toolName === 'record_verified_payment') return true;
      if (toolName === 'import_payment_statement') return true;
      return true;
    }

    if (mode === 'trusted_autopilot') {
      if (params?.total && params.total > 50000) return true;
      if (params?.amount && params.amount > 50000) return true;
      return false;
    }

    return false;
  }

  /**
   * Workflow planner: decomposes user requests and documents into multi-step tool pipelines
   */
  private static planWorkflow(
    agentType: AgentType,
    prompt: string,
    documentId?: string,
    context?: Record<string, any>
  ): Array<{
    toolName: AgentToolName;
    title: string;
    description: string;
    params: any;
    summaryGenerator?: (res: any) => string;
  }> {
    const lower = prompt.toLowerCase();
    const actions: Array<any> = [];

    // --- AGENT 1: SMART ENTRY AGENT ---
    if (
      agentType === 'smart_entry' ||
      lower.includes('extract') ||
      lower.includes('receipt') ||
      lower.includes('bill') ||
      lower.includes('record ₹') ||
      lower.includes('paid ₹')
    ) {
      const expenseMatch = prompt.match(
        /(?:record|paid|spent)\s+(?:₹|rs\.?)?\s*(\d+(?:\.\d+)?)\s*(?:for|on)?\s*([a-zA-Z\s]+?)(?:\s+today|\s+yesterday|\s*$)/i
      );
      if (expenseMatch) {
        const amount = parseFloat(expenseMatch[1]);
        const purpose = expenseMatch[2].trim() || 'General Expense';
        const date = lower.includes('yesterday')
          ? new Date(Date.now() - 86400000).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0];

        actions.push({
          toolName: 'detect_duplicate_transaction',
          title: 'Check for Duplicate Transactions',
          description: `Verify if a ₹${amount} expense on ${date} has already been logged.`,
          params: { date, amount, type: 'expense', counterparty: purpose },
          summaryGenerator: (dup: any) =>
            dup.isDuplicate
              ? `⚠️ Potential duplicate detected: matched ${dup.matches.length} record(s).`
              : `✓ No duplicate transaction found for ₹${amount}.`,
        });

        actions.push({
          toolName: 'create_transaction_draft',
          title: 'Prepare Expense Draft',
          description: `Create structured draft for ₹${amount} (${purpose}) on ${date}.`,
          params: {
            transactionType: 'expense',
            date,
            counterpartyName: purpose,
            total: amount,
            taxAmount: 0,
            notes: `Expense recorded via Smart Entry Agent: ${prompt}`,
          },
          summaryGenerator: (draft: any) =>
            `Transaction draft prepared: ${draft.id} for ₹${draft.total} (${draft.counterpartyName}).`,
        });

        return actions;
      }

      // Document Extraction / OCR
      actions.push({
        toolName: 'extract_business_document',
        title: 'Extract Business Document & Items',
        description: 'Analyze document content, detect supplier/customer, item details, tax, and totals.',
        params: {
          documentId,
          rawText: context?.rawText || prompt,
          fileName: context?.fileName || 'document.pdf',
          fileType: context?.fileType || 'pdf',
        },
        summaryGenerator: (res: any) =>
          `Extracted ${res.draft.transactionType.toUpperCase()} for ${res.draft.counterpartyName} (₹${res.draft.total}).`,
      });

      return actions;
    }

    // --- AGENT 2: UDHAAR & COLLECTION AGENT ---
    if (
      agentType === 'udhaar_collection' ||
      lower.includes('udhaar') ||
      lower.includes('overdue') ||
      lower.includes('reminder') ||
      lower.includes('collection') ||
      lower.includes('promise')
    ) {
      if (lower.includes('remind') || lower.includes('whatsapp')) {
        actions.push({
          toolName: 'search_customers',
          title: 'Search Customer Details',
          description: 'Look up customer credit history and phone number.',
          params: { query: context?.customerName || prompt.replace(/(?:remind|send|whatsapp)/gi, '').trim() },
          summaryGenerator: (customers: any[]) =>
            customers.length > 0
              ? `Found customer record: ${customers[0].name} (Balance: ₹${customers[0].balance})`
              : 'Customer search completed.',
        });

        actions.push({
          toolName: 'prepare_payment_reminder',
          title: 'Generate Payment Reminder & WhatsApp Click-to-Chat Link',
          description: 'Prepare personalized polite reminder with verified wa.me link.',
          params: {
            customerId: context?.customerId || 'cust_001',
            reminderType: lower.includes('urgent') ? 'urgent' : 'gentle',
          },
          summaryGenerator: (res: any) =>
            `Reminder draft prepared for ${res.customerName} (₹${res.outstandingBalance}). Click-to-chat WhatsApp link generated.`,
        });

        return actions;
      }

      actions.push({
        toolName: 'search_customers',
        title: 'Scan Overdue Credit Accounts',
        description: 'Scan all customer balances and aging buckets (0-15, 16-30, 31-60, 60+ days).',
        params: { query: '' },
        summaryGenerator: (custs: any[]) =>
          `Audited credit for ${custs.length} customers. Total outstanding: ₹${custs
            .reduce((s, c) => s + (c.balance || 0), 0)
            .toLocaleString('en-IN')}.`,
      });

      return actions;
    }

    // --- AGENT 3: DAILY CLOSING & PROFIT LEAK AGENT ---
    if (
      agentType === 'daily_closing' ||
      lower.includes('closing') ||
      lower.includes('margin') ||
      lower.includes('cash') ||
      lower.includes('profit') ||
      lower.includes('leak')
    ) {
      const targetDate = lower.includes('yesterday')
        ? new Date(Date.now() - 86400000).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      if (lower.includes('margin') || lower.includes('discount')) {
        actions.push({
          toolName: 'identify_margin_anomalies',
          title: 'Investigate Low Margins and Discrepancies',
          description: 'Analyze transactions for items sold below target margin or with unusual discounts.',
          params: { minMarginPercent: 15 },
          summaryGenerator: (anomalies: any[]) =>
            `Detected ${anomalies.length} margin anomalies requiring review.`,
        });
        return actions;
      }

      actions.push({
        toolName: 'calculate_business_metrics',
        title: 'Calculate Financial Day Totals',
        description: `Aggregate confirmed sales, tax, expenses, and collections for ${targetDate}.`,
        params: { date: targetDate },
        summaryGenerator: (m: any) =>
          `Sales: ₹${m.totalSales} | Collections: ₹${m.totalCollections} | Expenses: ₹${m.totalExpenses} | ${m.costReliabilityNote}`,
      });

      actions.push({
        toolName: 'generate_daily_closing_report',
        title: 'Reconcile Accounts & Produce Daily Closing Report',
        description: `Verify cash vs digital payments, unmatched transactions, and generate report for ${targetDate}.`,
        params: { date: targetDate },
        summaryGenerator: (closing: any) =>
          `Daily closing report prepared: ${closing.date}. Cash variance: ₹${closing.cashVariance}. Status: ${closing.status}.`,
      });

      return actions;
    }

    // Default fallback
    actions.push({
      toolName: 'calculate_business_metrics',
      title: 'Analyze Business Activity',
      description: 'Retrieve current operational metrics.',
      params: { date: 'today' },
      summaryGenerator: (m: any) => `Current day sales: ₹${m.totalSales}, collections: ₹${m.totalCollections}.`,
    });

    return actions;
  }
}
