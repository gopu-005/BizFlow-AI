import fs from 'fs';
import path from 'path';
import {
  Business,
  Product,
  Customer,
  Supplier,
  Invoice,
  Purchase,
  Expense,
  FollowUpTask,
  ConnectorStatus,
  ImportPreviewRecord,
} from '@/types/erp';
import { Subscription, BillingInvoice, BillingDetails, BIZFLOW_PLAN } from '@/types/billing';
import {
  AgentRun,
  AgentApproval,
  TransactionDraft,
  DocumentRecord,
  PaymentCommitment,
  PaymentRecord,
  DailyClosingReport,
  MarginAnomaly,
  TenantUsageQuota,
} from '@/types/agent';
import {
  SEED_BUSINESSES,
  SEED_PRODUCTS,
  SEED_CUSTOMERS,
  SEED_INVOICES,
  SEED_PURCHASES,
  SEED_FOLLOW_UPS,
  SEED_CONNECTORS,
  SEED_SUBSCRIPTION,
  SEED_BILLING_INVOICES,
} from './seed';

interface DatabaseSchema {
  businesses: Business[];
  products: Product[];
  customers: Customer[];
  invoices: Invoice[];
  purchases: Purchase[];
  expenses: Expense[];
  followUps: FollowUpTask[];
  connectors: ConnectorStatus[];
  subscriptions: Record<string, Subscription>;
  billingInvoices: BillingInvoice[];
  billingDetails: Record<string, BillingDetails>;
  webhookEvents: string[]; // processed event IDs for idempotency
  agentRuns: AgentRun[];
  transactionDrafts: TransactionDraft[];
  documents: DocumentRecord[];
  paymentCommitments: PaymentCommitment[];
  paymentRecords: PaymentRecord[];
  dailyClosings: DailyClosingReport[];
  quotas: Record<string, TenantUsageQuota>;
}

const DB_FILE = path.join(process.cwd(), 'data', 'bizflow-db.json');

class DatabaseService {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          ...this.initSeedData(),
          ...parsed,
          businesses: parsed.businesses || [...SEED_BUSINESSES],
          products: parsed.products || [...SEED_PRODUCTS],
          customers: parsed.customers || [...SEED_CUSTOMERS],
          invoices: parsed.invoices || [...SEED_INVOICES],
          purchases: parsed.purchases || [...SEED_PURCHASES],
          expenses: parsed.expenses || this.getInitialExpenses(),
          followUps: parsed.followUps || [...SEED_FOLLOW_UPS],
          connectors: parsed.connectors || [...SEED_CONNECTORS],
          subscriptions: parsed.subscriptions || { biz_karthik_textiles: { ...SEED_SUBSCRIPTION } },
          billingInvoices: parsed.billingInvoices || [...SEED_BILLING_INVOICES],
          billingDetails: parsed.billingDetails || this.getInitialBillingDetails(),
          webhookEvents: parsed.webhookEvents || [],
          agentRuns: parsed.agentRuns || this.getInitialAgentRuns(),
          transactionDrafts: parsed.transactionDrafts || this.getInitialDrafts(),
          documents: parsed.documents || this.getInitialDocuments(),
          paymentCommitments: parsed.paymentCommitments || this.getInitialCommitments(),
          paymentRecords: parsed.paymentRecords || this.getInitialPaymentRecords(),
          dailyClosings: parsed.dailyClosings || this.getInitialClosings(),
          quotas: parsed.quotas || this.getInitialQuotas(),
        };
      }
    } catch (e) {
      console.warn('Failed to read database file, initializing with seed data.', e);
    }
    return this.initSeedData();
  }

  private getInitialExpenses(): Expense[] {
    return [
      {
        id: 'exp_001',
        businessId: 'biz_karthik_textiles',
        category: 'Transportation',
        description: 'Tempo freight delivery from Surat textile supplier',
        amount: 850,
        date: '2024-10-15',
        paymentMode: 'Cash',
        vendorName: 'Murugan Logistics',
        referenceNumber: 'LR-88214',
      },
      {
        id: 'exp_002',
        businessId: 'biz_karthik_textiles',
        category: 'Packaging',
        description: 'Printed cotton shopping bags (500 units)',
        amount: 1400,
        date: '2024-10-14',
        paymentMode: 'UPI',
        vendorName: 'Sri Balaji Poly Packs',
        referenceNumber: 'INV-BLJ-109',
      },
      {
        id: 'exp_003',
        businessId: 'biz_karthik_textiles',
        category: 'Utilities',
        description: 'Electricity bill payment for T.Nagar store',
        amount: 3200,
        date: '2024-10-10',
        paymentMode: 'UPI / NetBanking',
        vendorName: 'TNEB Chennai South',
        referenceNumber: 'EB-2024-10-441',
      },
      {
        id: 'exp_004',
        businessId: 'biz_karthik_textiles',
        category: 'Refreshments',
        description: 'Tea and snacks for showroom staff & visitors',
        amount: 180,
        date: '2024-10-15',
        paymentMode: 'Cash',
        vendorName: 'Ramu Tea Stall',
      },
    ];
  }

  private getInitialBillingDetails(): Record<string, BillingDetails> {
    return {
      biz_karthik_textiles: {
        businessId: 'biz_karthik_textiles',
        legalName: 'Karthik Textiles & Garments',
        gstin: '33AAAAA0000A1Z5',
        billingEmail: 'karthik@textiles.bizflow.in',
        billingPhone: '+91 98400 11223',
        addressLine1: '42 Ranganathan Street',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600017',
        country: 'India',
        isGstRegistered: true,
      },
      biz_murugan_bakery: {
        businessId: 'biz_murugan_bakery',
        legalName: 'Sri Murugan Bakery & Sweets',
        gstin: '33BBBBB1111B2Z6',
        billingEmail: 'murugan@bakery.bizflow.in',
        billingPhone: '+91 94441 55667',
        addressLine1: '15 Gandhi Road, Tambaram',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600045',
        country: 'India',
        isGstRegistered: true,
      },
    };
  }

  private getInitialQuotas(): Record<string, TenantUsageQuota> {
    return {
      biz_karthik_textiles: {
        businessId: 'biz_karthik_textiles',
        planName: 'BizFlow AI Starter',
        billingCycle: 'monthly',
        currentPeriodStart: '2024-10-01T00:00:00Z',
        currentPeriodEnd: '2024-11-01T00:00:00Z',
        maxAiRuns: 100,
        usedAiRuns: 14,
        maxExtractions: 50,
        usedExtractions: 8,
        maxStorageMb: 500,
        usedStorageMb: 24,
      },
      biz_murugan_bakery: {
        businessId: 'biz_murugan_bakery',
        planName: 'BizFlow AI Starter',
        billingCycle: 'monthly',
        currentPeriodStart: '2024-10-01T00:00:00Z',
        currentPeriodEnd: '2024-11-01T00:00:00Z',
        maxAiRuns: 100,
        usedAiRuns: 5,
        maxExtractions: 50,
        usedExtractions: 2,
        maxStorageMb: 500,
        usedStorageMb: 10,
      },
    };
  }

  private getInitialCommitments(): PaymentCommitment[] {
    return [
      {
        id: 'com_001',
        businessId: 'biz_karthik_textiles',
        customerId: 'cust_1',
        customerName: 'Priya Sundaram',
        customerPhone: '+91 98401 23456',
        amountPromised: 3200,
        promisedDate: '2024-10-16',
        invoiceId: 'inv_101',
        status: 'pending',
        followUpCount: 1,
        lastReminderSentAt: '2024-10-14T10:00:00Z',
        notes: 'Promised to clear balance before Deepavali shopping visit',
        createdAt: '2024-10-12T11:00:00Z',
        updatedAt: '2024-10-14T10:00:00Z',
      },
      {
        id: 'com_002',
        businessId: 'biz_karthik_textiles',
        customerId: 'cust_2',
        customerName: 'Rajesh Kumar',
        customerPhone: '+91 98412 87654',
        amountPromised: 4500,
        promisedDate: '2024-10-14',
        invoiceId: 'inv_102',
        status: 'missed',
        followUpCount: 2,
        lastReminderSentAt: '2024-10-14T16:30:00Z',
        notes: 'Commitment date passed. Scheduled for courteous follow-up.',
        createdAt: '2024-10-10T14:00:00Z',
        updatedAt: '2024-10-15T09:00:00Z',
      },
      {
        id: 'com_003',
        businessId: 'biz_karthik_textiles',
        customerId: 'cust_3',
        customerName: 'Lakshmi Wholesale Center',
        customerPhone: '+91 94440 98765',
        amountPromised: 12000,
        promisedDate: '2024-10-15',
        status: 'pending',
        followUpCount: 1,
        lastReminderSentAt: '2024-10-15T09:30:00Z',
        notes: 'Owner promised RTGS transfer by 6:00 PM today',
        createdAt: '2024-10-13T16:00:00Z',
        updatedAt: '2024-10-15T09:30:00Z',
      },
    ];
  }

  private getInitialPaymentRecords(): PaymentRecord[] {
    return [
      {
        id: 'pay_rec_001',
        businessId: 'biz_karthik_textiles',
        customerId: 'cust_1',
        customerName: 'Priya Sundaram',
        invoiceId: 'inv_101',
        invoiceNumber: 'INV-2024-00101',
        amount: 8500,
        paymentDate: '2024-10-15',
        paymentMode: 'UPI',
        referenceNumber: 'UPI-20241015-8841',
        bankTransactionRef: 'HDFC0099412',
        matched: true,
        reconciledAt: '2024-10-15T10:30:00Z',
        createdAt: '2024-10-15T10:30:00Z',
      },
      {
        id: 'pay_rec_002',
        businessId: 'biz_karthik_textiles',
        customerId: 'cust_2',
        customerName: 'Rajesh Kumar',
        invoiceId: 'inv_102',
        invoiceNumber: 'INV-2024-00102',
        amount: 2499,
        paymentDate: '2024-10-15',
        paymentMode: 'GPay',
        referenceNumber: 'GPAY-994102-12',
        bankTransactionRef: 'ICIC8812901',
        matched: true,
        reconciledAt: '2024-10-15T12:00:00Z',
        createdAt: '2024-10-15T12:00:00Z',
      },
      {
        id: 'pay_rec_003',
        businessId: 'biz_karthik_textiles',
        customerName: 'Counter Customer (Unmatched)',
        amount: 1500,
        paymentDate: '2024-10-15',
        paymentMode: 'PhonePe QR',
        referenceNumber: 'PHON-339100-55',
        bankTransactionRef: 'SBI44991029',
        matched: false, // Unmatched payment anomaly for Agent 3 Daily Closing reconciliation!
        createdAt: '2024-10-15T14:45:00Z',
      },
      {
        id: 'pay_rec_004',
        businessId: 'biz_karthik_textiles',
        customerId: 'cust_1',
        customerName: 'Priya Sundaram',
        amount: 3200,
        paymentDate: '2024-10-14',
        paymentMode: 'Cash',
        referenceNumber: 'CSH-REC-441',
        matched: true,
        reconciledAt: '2024-10-14T18:00:00Z',
        createdAt: '2024-10-14T18:00:00Z',
      },
    ];
  }

  private getInitialDrafts(): TransactionDraft[] {
    return [
      {
        id: 'drf_sample_01',
        businessId: 'biz_karthik_textiles',
        transactionType: 'expense',
        status: 'draft',
        date: '2024-10-15',
        referenceNumber: 'LR-88214',
        counterpartyName: 'Murugan Logistics',
        items: [{ name: 'Tempo freight delivery from Surat', quantity: 1, unitPrice: 850, total: 850, confidence: 0.96 }],
        subtotal: 850,
        taxAmount: 0,
        total: 850,
        paymentMode: 'Cash',
        confidence: 0.95,
        warnings: [],
        potentialDuplicates: [],
        notes: 'Extracted from delivery receipt photo',
        createdAt: '2024-10-15T10:14:00Z',
      },
    ];
  }

  private getInitialDocuments(): DocumentRecord[] {
    return [
      {
        id: 'doc_sample_01',
        businessId: 'biz_karthik_textiles',
        fileName: 'Murugan_Logistics_Receipt.jpg',
        fileSize: 245100,
        fileType: 'image/jpeg',
        uploadedAt: '2024-10-15T10:12:00Z',
        ocrExtractedAt: '2024-10-15T10:13:00Z',
        extractedDraftId: 'drf_sample_01',
        status: 'extracted',
        hash: 'hash_murugan_88214',
      },
    ];
  }

  private getInitialAgentRuns(): AgentRun[] {
    return [
      {
        id: 'run_sample_01',
        businessId: 'biz_karthik_textiles',
        agentType: 'smart_entry',
        autonomyMode: 'guarded_autopilot',
        userPrompt: 'Record ₹850 paid for transportation today.',
        status: 'completed',
        plan: [
          'Extract expense classification and amount',
          'Detect existing duplicate payments in ledger',
          'Prepare verified expense draft',
          'Commit transaction to verified accounts',
        ],
        currentStepIndex: 4,
        steps: [
          {
            id: 'stp_1',
            title: 'Classify Entry',
            description: 'Identified expense category "Transportation" with vendor "Murugan Logistics"',
            status: 'completed',
            toolCalls: [],
            timestamp: '2024-10-15T10:14:10Z',
          },
          {
            id: 'stp_2',
            title: 'Duplicate Check',
            description: 'Validated no matching ₹850 expense recorded for today',
            status: 'completed',
            toolCalls: [],
            timestamp: '2024-10-15T10:14:15Z',
          },
          {
            id: 'stp_3',
            title: 'Commit Expense',
            description: 'Recorded verified expense #exp_001 under Transportation',
            status: 'completed',
            toolCalls: [],
            sourceRecords: [{ type: 'expense', id: 'exp_001', label: 'Freight Expense ₹850' }],
            timestamp: '2024-10-15T10:14:25Z',
          },
        ],
        approvals: [],
        summary: 'Successfully verified and committed ₹850 transportation payment to Murugan Logistics.',
        sourceRecords: [{ type: 'expense', id: 'exp_001', label: 'Expense #exp_001 (₹850)' }],
        createdAt: '2024-10-15T10:14:00Z',
        updatedAt: '2024-10-15T10:14:26Z',
        completedAt: '2024-10-15T10:14:26Z',
      },
    ];
  }

  private getInitialClosings(): DailyClosingReport[] {
    return [
      {
        id: 'cls_20241014',
        businessId: 'biz_karthik_textiles',
        date: '2024-10-14',
        totalSales: 18450,
        totalInvoices: 2,
        totalCollections: 15250,
        totalReceivables: 3200,
        totalExpenses: 1400,
        totalTax: 878.57,
        estimatedGrossProfit: 6200,
        profitMarginPercent: 33.6,
        cashExpected: 5200,
        cashRecorded: 5200,
        cashVariance: 0,
        unmatchedPaymentsCount: 0,
        unmatchedPaymentsAmount: 0,
        anomaliesCount: 0,
        status: 'finalized',
        verifiedBy: 'Karthik Ramanathan',
        verifiedAt: '2024-10-14T21:30:00Z',
        summaryText: 'Daily books reconciled with zero cash variance. Invoices and receipts verified.',
        sourceInvoices: ['inv_101', 'inv_102'],
        sourcePayments: ['pay_rec_004'],
        sourceExpenses: ['exp_002'],
        marginAnomalies: [],
        createdAt: '2024-10-14T21:00:00Z',
      },
    ];
  }

  private initSeedData(): DatabaseSchema {
    const initial: DatabaseSchema = {
      businesses: [...SEED_BUSINESSES],
      products: [...SEED_PRODUCTS],
      customers: [...SEED_CUSTOMERS],
      invoices: [...SEED_INVOICES],
      purchases: [...SEED_PURCHASES],
      expenses: this.getInitialExpenses(),
      followUps: [...SEED_FOLLOW_UPS],
      connectors: [...SEED_CONNECTORS],
      subscriptions: {
        biz_karthik_textiles: { ...SEED_SUBSCRIPTION },
      },
      billingInvoices: [...SEED_BILLING_INVOICES],
      billingDetails: this.getInitialBillingDetails(),
      webhookEvents: [],
      agentRuns: this.getInitialAgentRuns(),
      transactionDrafts: this.getInitialDrafts(),
      documents: this.getInitialDocuments(),
      paymentCommitments: this.getInitialCommitments(),
      paymentRecords: this.getInitialPaymentRecords(),
      dailyClosings: this.getInitialClosings(),
      quotas: this.getInitialQuotas(),
    };
    this.saveData(initial);
    return initial;
  }

  private saveData(data: DatabaseSchema) {
    try {
      const dir = path.dirname(DB_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to write database file:', e);
    }
  }

  // --- Tenant Isolation Guard ---
  public assertTenant(businessId: string) {
    if (!businessId || typeof businessId !== 'string') {
      throw new Error('Tenant isolation violation: Valid businessId is strictly required.');
    }
  }

  // --- Quota & Subscription Limits (Server Enforced) ---
  public getQuota(businessId: string): TenantUsageQuota {
    this.assertTenant(businessId);
    if (!this.data.quotas[businessId]) {
      this.data.quotas[businessId] = {
        businessId,
        planName: 'BizFlow AI Starter',
        billingCycle: 'monthly',
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
        maxAiRuns: 100,
        usedAiRuns: 0,
        maxExtractions: 50,
        usedExtractions: 0,
        maxStorageMb: 500,
        usedStorageMb: 5,
      };
      this.saveData(this.data);
    }
    return this.data.quotas[businessId];
  }

  public checkAndIncrementQuota(
    businessId: string,
    type: 'ai_run' | 'extraction'
  ): { allowed: boolean; remaining: number; quota: TenantUsageQuota } {
    const quota = this.getQuota(businessId);

    if (type === 'ai_run') {
      if (quota.usedAiRuns >= quota.maxAiRuns) {
        return { allowed: false, remaining: 0, quota };
      }
      quota.usedAiRuns += 1;
      this.saveData(this.data);
      return { allowed: true, remaining: quota.maxAiRuns - quota.usedAiRuns, quota };
    } else {
      if (quota.usedExtractions >= quota.maxExtractions) {
        return { allowed: false, remaining: 0, quota };
      }
      quota.usedExtractions += 1;
      this.saveData(this.data);
      return { allowed: true, remaining: quota.maxExtractions - quota.usedExtractions, quota };
    }
  }

  // --- Agent Runs & Audit Logging ---
  public getAgentRuns(businessId: string, limit = 50): AgentRun[] {
    this.assertTenant(businessId);
    return this.data.agentRuns
      .filter((r) => r.businessId === businessId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  public getAgentRun(businessId: string, runId: string): AgentRun | undefined {
    this.assertTenant(businessId);
    return this.data.agentRuns.find((r) => r.businessId === businessId && r.id === runId);
  }

  public createAgentRun(run: AgentRun): AgentRun {
    this.assertTenant(run.businessId);
    this.data.agentRuns.unshift(run);
    this.saveData(this.data);
    return run;
  }

  public updateAgentRun(businessId: string, runId: string, updates: Partial<AgentRun>): AgentRun | undefined {
    this.assertTenant(businessId);
    const run = this.data.agentRuns.find((r) => r.businessId === businessId && r.id === runId);
    if (run) {
      Object.assign(run, updates, { updatedAt: new Date().toISOString() });
      this.saveData(this.data);
      return run;
    }
    return undefined;
  }

  public createApproval(approval: AgentApproval): AgentApproval {
    const run = this.data.agentRuns.find((r) => r.id === approval.runId);
    if (run) {
      run.approvals.push(approval);
      run.status = 'awaiting_approval';
      this.saveData(this.data);
    }
    return approval;
  }

  public respondToApproval(
    businessId: string,
    approvalId: string,
    status: 'approved' | 'rejected',
    reason?: string
  ): { approval?: AgentApproval; run?: AgentRun; error?: string } {
    this.assertTenant(businessId);
    for (const run of this.data.agentRuns) {
      if (run.businessId !== businessId) continue;
      const app = run.approvals.find((a) => a.id === approvalId);
      if (app) {
        app.status = status;
        app.respondedAt = new Date().toISOString();
        app.reason = reason;

        if (status === 'rejected') {
          run.status = 'completed';
          run.summary = `Action was rejected by business owner: ${reason || 'Manual override'}`;
        }
        this.saveData(this.data);
        return { approval: app, run };
      }
    }
    return { error: 'Approval request not found or not belonging to tenant.' };
  }

  // --- Expenses ---
  public getExpenses(businessId: string, date?: string): Expense[] {
    this.assertTenant(businessId);
    return this.data.expenses.filter((e) => {
      if (e.businessId !== businessId) return false;
      if (date && e.date !== date) return false;
      return true;
    });
  }

  public createExpense(businessId: string, data: Omit<Expense, 'id' | 'businessId'>): Expense {
    this.assertTenant(businessId);
    const newExp: Expense = {
      ...data,
      id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      businessId,
    };
    this.data.expenses.unshift(newExp);
    this.saveData(this.data);
    return newExp;
  }

  // --- Documents & Smart Entry ---
  public createDocument(doc: DocumentRecord): DocumentRecord {
    this.assertTenant(doc.businessId);
    this.data.documents.unshift(doc);
    this.saveData(this.data);
    return doc;
  }

  public getDocuments(businessId: string): DocumentRecord[] {
    this.assertTenant(businessId);
    return this.data.documents.filter((d) => d.businessId === businessId);
  }

  public createTransactionDraft(draft: TransactionDraft): TransactionDraft {
    this.assertTenant(draft.businessId);
    this.data.transactionDrafts.unshift(draft);
    this.saveData(this.data);
    return draft;
  }

  public getTransactionDrafts(businessId: string): TransactionDraft[] {
    this.assertTenant(businessId);
    return this.data.transactionDrafts.filter((d) => d.businessId === businessId);
  }

  public getTransactionDraft(businessId: string, draftId: string): TransactionDraft | undefined {
    this.assertTenant(businessId);
    return this.data.transactionDrafts.find((d) => d.businessId === businessId && d.id === draftId);
  }

  public updateTransactionDraft(
    businessId: string,
    draftId: string,
    updates: Partial<TransactionDraft>
  ): TransactionDraft | undefined {
    this.assertTenant(businessId);
    const draft = this.data.transactionDrafts.find((d) => d.businessId === businessId && d.id === draftId);
    if (draft) {
      Object.assign(draft, updates);
      this.saveData(this.data);
      return draft;
    }
    return undefined;
  }

  public checkDuplicateTransaction(
    businessId: string,
    type: string,
    amount: number,
    counterparty: string,
    date: string,
    refNumber?: string
  ): { isDuplicate: boolean; matches: Array<{ id: string; date: string; amount: number; description: string }> } {
    this.assertTenant(businessId);
    const matches: Array<{ id: string; date: string; amount: number; description: string }> = [];

    // Check existing expenses
    if (type === 'expense') {
      const dupExp = this.data.expenses.filter(
        (e) =>
          e.businessId === businessId &&
          Math.abs(e.amount - amount) < 0.01 &&
          (e.date === date || (refNumber && e.referenceNumber === refNumber) || e.vendorName?.toLowerCase() === counterparty.toLowerCase())
      );
      dupExp.forEach((e) =>
        matches.push({ id: e.id, date: e.date, amount: e.amount, description: `${e.category}: ${e.description}` })
      );
    }

    // Check existing purchases
    if (type === 'purchase_bill') {
      const dupPurch = this.data.purchases.filter(
        (p) =>
          p.businessId === businessId &&
          Math.abs(p.totalAmount - amount) < 0.01 &&
          p.supplierName.toLowerCase() === counterparty.toLowerCase()
      );
      dupPurch.forEach((p) =>
        matches.push({ id: p.id, date: p.date, amount: p.totalAmount, description: `Purchase #${p.purchaseNumber}` })
      );
    }

    // Check existing customer payments
    if (type === 'customer_payment') {
      const dupPay = this.data.paymentRecords.filter(
        (p) =>
          p.businessId === businessId &&
          Math.abs(p.amount - amount) < 0.01 &&
          (p.paymentDate === date || (refNumber && p.referenceNumber === refNumber))
      );
      dupPay.forEach((p) =>
        matches.push({ id: p.id, date: p.paymentDate, amount: p.amount, description: `Payment Ref ${p.referenceNumber}` })
      );
    }

    return {
      isDuplicate: matches.length > 0,
      matches,
    };
  }

  public commitTransactionDraft(
    businessId: string,
    draftId: string
  ): { success: boolean; committedRecord?: any; error?: string } {
    this.assertTenant(businessId);
    const draft = this.getTransactionDraft(businessId, draftId);
    if (!draft) return { success: false, error: 'Draft not found.' };

    if (draft.status === 'committed') {
      return { success: false, error: 'Draft is already committed.' };
    }

    let record: any = null;

    if (draft.transactionType === 'expense') {
      record = this.createExpense(businessId, {
        category: draft.items[0]?.name || 'General Expense',
        description: draft.notes || `${draft.counterpartyName} payment`,
        amount: draft.total,
        date: draft.date,
        paymentMode: draft.paymentMode || 'Cash',
        vendorName: draft.counterpartyName,
        referenceNumber: draft.referenceNumber,
        taxAmount: draft.taxAmount,
      });
    } else if (draft.transactionType === 'purchase_bill') {
      // Create verified purchase record
      const purchaseCount = this.data.purchases.filter((p) => p.businessId === businessId).length + 1;
      const newPurchase: Purchase = {
        id: `purch_${Date.now()}`,
        purchaseNumber: `PO-${String(purchaseCount).padStart(4, '0')}`,
        businessId,
        supplierId: draft.counterpartyId || `sup_${Date.now()}`,
        supplierName: draft.counterpartyName,
        items: draft.items.map((it) => ({
          name: it.name,
          quantity: it.quantity,
          unitCost: it.unitPrice,
          total: it.total,
          productId: it.matchedProductId,
        })),
        totalAmount: draft.total,
        status: 'pending', // Goods receipt workflow required before stock update as per prompt rules!
        date: draft.date,
      };
      this.data.purchases.unshift(newPurchase);
      record = newPurchase;
    } else if (draft.transactionType === 'customer_payment') {
      const payResult = this.recordVerifiedPayment(businessId, {
        customerId: draft.counterpartyId,
        amount: draft.total,
        paymentMode: draft.paymentMode || 'Cash',
        referenceNumber: draft.referenceNumber || `MAN-${Date.now()}`,
        paymentDate: draft.date,
      });
      record = payResult.payment;
    }

    draft.status = 'committed';
    this.saveData(this.data);
    return { success: true, committedRecord: record };
  }

  // --- Customer Credit & Udhaar Ledger ---
  public getCustomerLedger(
    businessId: string,
    customerId: string
  ): {
    customer: Customer;
    invoices: Invoice[];
    payments: PaymentRecord[];
    commitments: PaymentCommitment[];
    balance: number;
    aging: { current: number; days16to30: number; days31to60: number; daysOver60: number };
  } {
    this.assertTenant(businessId);
    const customer = this.data.customers.find((c) => c.businessId === businessId && c.id === customerId);
    if (!customer) throw new Error('Customer not found');

    const invoices = this.data.invoices.filter((i) => i.businessId === businessId && i.customerId === customerId);
    const payments = this.data.paymentRecords.filter((p) => p.businessId === businessId && p.customerId === customerId);
    const commitments = this.data.paymentCommitments.filter((p) => p.businessId === businessId && p.customerId === customerId);

    // Calculate aging buckets based on unpaid invoices
    const today = new Date('2024-10-15');
    let current = 0;
    let days16to30 = 0;
    let days31to60 = 0;
    let daysOver60 = 0;

    for (const inv of invoices) {
      if (inv.status !== 'cancelled') {
        const invDate = new Date(inv.dueDate || inv.createdAt);
        const ageDays = Math.max(0, Math.floor((today.getTime() - invDate.getTime()) / (1000 * 3600 * 24)));
        if (ageDays <= 15) current += inv.total;
        else if (ageDays <= 30) days16to30 += inv.total;
        else if (ageDays <= 60) days31to60 += inv.total;
        else daysOver60 += inv.total;
      }
    }

    // Offset by recorded payments
    const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
    const calculatedBalance = Math.max(0, customer.balance);

    return {
      customer,
      invoices,
      payments,
      commitments,
      balance: calculatedBalance,
      aging: {
        current: Math.round(current * 100) / 100,
        days16to30: Math.round(days16to30 * 100) / 100,
        days31to60: Math.round(days31to60 * 100) / 100,
        daysOver60: Math.round(daysOver60 * 100) / 100,
      },
    };
  }

  public getAllCustomerCredits(businessId: string): Array<{
    customer: Customer;
    balance: number;
    overdueDays: number;
    lastPaymentDate?: string;
    aging: { current: number; days16to30: number; days31to60: number; daysOver60: number };
    activeCommitment?: PaymentCommitment;
  }> {
    this.assertTenant(businessId);
    const customers = this.data.customers.filter((c) => c.businessId === businessId);
    const today = new Date('2024-10-15');

    return customers.map((cust) => {
      const activeCommitment = this.data.paymentCommitments.find(
        (p) => p.businessId === businessId && p.customerId === cust.id && p.status === 'pending'
      );
      const custPayments = this.data.paymentRecords.filter(
        (p) => p.businessId === businessId && p.customerId === cust.id
      );
      const lastPayment = custPayments.sort(
        (a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
      )[0];

      // Invoices
      const custInvoices = this.data.invoices.filter(
        (i) => i.businessId === businessId && i.customerId === cust.id
      );

      let current = 0;
      let days16to30 = 0;
      let days31to60 = 0;
      let daysOver60 = 0;
      let maxOverdueDays = 0;

      for (const inv of custInvoices) {
        const invDate = new Date(inv.dueDate || inv.createdAt);
        const diffDays = Math.floor((today.getTime() - invDate.getTime()) / (1000 * 3600 * 24));
        if (diffDays > maxOverdueDays) maxOverdueDays = diffDays;

        if (diffDays <= 15) current += inv.total;
        else if (diffDays <= 30) days16to30 += inv.total;
        else if (diffDays <= 60) days31to60 += inv.total;
        else daysOver60 += inv.total;
      }

      return {
        customer: cust,
        balance: cust.balance,
        overdueDays: Math.max(0, maxOverdueDays),
        lastPaymentDate: lastPayment?.paymentDate || cust.lastContactDate,
        aging: {
          current: Math.round(current * 100) / 100,
          days16to30: Math.round(days16to30 * 100) / 100,
          days31to60: Math.round(days31to60 * 100) / 100,
          daysOver60: Math.round(daysOver60 * 100) / 100,
        },
        activeCommitment,
      };
    });
  }

  public createPaymentCommitment(commitment: Omit<PaymentCommitment, 'id' | 'createdAt' | 'updatedAt'>): PaymentCommitment {
    this.assertTenant(commitment.businessId);
    const newCom: PaymentCommitment = {
      ...commitment,
      id: `com_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.paymentCommitments.unshift(newCom);
    this.saveData(this.data);
    return newCom;
  }

  public getPaymentCommitments(businessId: string, status?: string): PaymentCommitment[] {
    this.assertTenant(businessId);
    return this.data.paymentCommitments.filter((c) => {
      if (c.businessId !== businessId) return false;
      if (status && c.status !== status) return false;
      return true;
    });
  }

  public updatePaymentCommitment(
    businessId: string,
    commitmentId: string,
    updates: Partial<PaymentCommitment>
  ): PaymentCommitment | undefined {
    this.assertTenant(businessId);
    const com = this.data.paymentCommitments.find((c) => c.businessId === businessId && c.id === commitmentId);
    if (com) {
      Object.assign(com, updates, { updatedAt: new Date().toISOString() });
      this.saveData(this.data);
      return com;
    }
    return undefined;
  }

  public recordVerifiedPayment(
    businessId: string,
    data: {
      customerId?: string;
      invoiceId?: string;
      amount: number;
      paymentMode: string;
      referenceNumber: string;
      paymentDate?: string;
    }
  ): { success: boolean; payment: PaymentRecord; updatedBalance?: number; error?: string } {
    this.assertTenant(businessId);

    // Prevent duplicate payment entry with identical reference number
    const existing = this.data.paymentRecords.find(
      (p) => p.businessId === businessId && p.referenceNumber === data.referenceNumber
    );
    if (existing) {
      return { success: false, payment: existing, error: 'Payment with this reference number already exists.' };
    }

    let customerName = 'Counter Customer';
    let customer = data.customerId
      ? this.data.customers.find((c) => c.businessId === businessId && c.id === data.customerId)
      : undefined;

    if (customer) {
      customerName = customer.name;
      // Transactional credit balance deduction
      customer.balance = Math.max(0, customer.balance - data.amount);
      customer.lastContactDate = data.paymentDate || '2024-10-15';
    }

    let invoiceNumber: string | undefined;
    if (data.invoiceId) {
      const inv = this.data.invoices.find((i) => i.businessId === businessId && i.id === data.invoiceId);
      if (inv) {
        invoiceNumber = inv.invoiceNumber;
        inv.status = 'paid';
        if (!customer && inv.customerId) {
          customer = this.data.customers.find((c) => c.id === inv.customerId);
          if (customer) {
            customer.balance = Math.max(0, customer.balance - data.amount);
          }
        }
      }
    }

    // Check if customer had active commitment and mark fulfilled if paid
    if (customer) {
      const activeCommitment = this.data.paymentCommitments.find(
        (p) => p.businessId === businessId && p.customerId === customer?.id && p.status === 'pending'
      );
      if (activeCommitment && data.amount >= activeCommitment.amountPromised) {
        activeCommitment.status = 'fulfilled';
        activeCommitment.updatedAt = new Date().toISOString();
      }
    }

    const payment: PaymentRecord = {
      id: `pay_rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      businessId,
      customerId: customer?.id,
      customerName: customer?.name || customerName,
      invoiceId: data.invoiceId,
      invoiceNumber,
      amount: data.amount,
      paymentDate: data.paymentDate || '2024-10-15',
      paymentMode: data.paymentMode,
      referenceNumber: data.referenceNumber,
      matched: true,
      reconciledAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    this.data.paymentRecords.unshift(payment);
    this.saveData(this.data);

    return {
      success: true,
      payment,
      updatedBalance: customer?.balance,
    };
  }

  // --- Payment Reconciliation ---
  public getPaymentRecords(businessId: string, matchedOnly?: boolean): PaymentRecord[] {
    this.assertTenant(businessId);
    return this.data.paymentRecords.filter((p) => {
      if (p.businessId !== businessId) return false;
      if (matchedOnly !== undefined && p.matched !== matchedOnly) return false;
      return true;
    });
  }

  public importPaymentRecords(
    businessId: string,
    records: Array<Omit<PaymentRecord, 'id' | 'businessId' | 'createdAt' | 'matched'>>
  ): { importedCount: number; matchedCount: number; unmatchedCount: number } {
    this.assertTenant(businessId);
    let importedCount = 0;
    let matchedCount = 0;
    let unmatchedCount = 0;

    for (const rec of records) {
      // Check duplicate
      const exists = this.data.paymentRecords.find(
        (p) => p.businessId === businessId && p.referenceNumber === rec.referenceNumber
      );
      if (exists) continue;

      // Try automatic match by invoiceNumber or customer phone/name
      let matched = false;
      let invId = rec.invoiceId;
      let custId = rec.customerId;

      if (rec.invoiceNumber) {
        const inv = this.data.invoices.find(
          (i) => i.businessId === businessId && i.invoiceNumber.toLowerCase() === rec.invoiceNumber?.toLowerCase()
        );
        if (inv) {
          matched = true;
          invId = inv.id;
          custId = inv.customerId;
          inv.status = 'paid';
        }
      }

      if (!matched && rec.customerName) {
        const cust = this.findCustomer(businessId, rec.customerName);
        if (cust) {
          custId = cust.id;
          cust.balance = Math.max(0, cust.balance - rec.amount);
          matched = true;
        }
      }

      const newRec: PaymentRecord = {
        ...rec,
        id: `pay_rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        businessId,
        invoiceId: invId,
        customerId: custId,
        matched,
        reconciledAt: matched ? new Date().toISOString() : undefined,
        createdAt: new Date().toISOString(),
      };

      this.data.paymentRecords.unshift(newRec);
      importedCount++;
      if (matched) matchedCount++;
      else unmatchedCount++;
    }

    this.saveData(this.data);
    return { importedCount, matchedCount, unmatchedCount };
  }

  public reconcilePayment(
    businessId: string,
    paymentId: string,
    invoiceId: string
  ): { success: boolean; payment?: PaymentRecord; invoice?: Invoice; error?: string } {
    this.assertTenant(businessId);
    const payment = this.data.paymentRecords.find((p) => p.businessId === businessId && p.id === paymentId);
    const invoice = this.data.invoices.find((i) => i.businessId === businessId && i.id === invoiceId);

    if (!payment) return { success: false, error: 'Payment record not found.' };
    if (!invoice) return { success: false, error: 'Invoice not found.' };

    payment.invoiceId = invoice.id;
    payment.invoiceNumber = invoice.invoiceNumber;
    payment.customerId = invoice.customerId;
    payment.customerName = invoice.customerName;
    payment.matched = true;
    payment.reconciledAt = new Date().toISOString();

    invoice.status = 'paid';

    // Update customer balance
    const cust = this.data.customers.find((c) => c.businessId === businessId && c.id === invoice.customerId);
    if (cust) {
      cust.balance = Math.max(0, cust.balance - payment.amount);
    }

    this.saveData(this.data);
    return { success: true, payment, invoice };
  }

  // --- Profit Leak & Daily Closing ---
  public detectMarginAnomalies(businessId: string, minMarginPercent = 25): MarginAnomaly[] {
    this.assertTenant(businessId);
    const anomalies: MarginAnomaly[] = [];

    // Inspect invoices
    const invoices = this.data.invoices.filter((i) => i.businessId === businessId);
    for (const inv of invoices) {
      for (const item of inv.items) {
        const prod = this.data.products.find(
          (p) => p.businessId === businessId && (p.id === item.productId || p.name.toLowerCase() === item.name.toLowerCase())
        );

        if (prod && prod.costPrice > 0) {
          const sellingPrice = item.unitPrice;
          const costPrice = prod.costPrice;
          const actualMargin = ((sellingPrice - costPrice) / sellingPrice) * 100;

          if (actualMargin < minMarginPercent) {
            anomalies.push({
              productId: prod.id,
              productName: prod.name,
              sku: prod.sku,
              costPrice,
              sellingPrice,
              actualMarginPercent: Math.round(actualMargin * 10) / 10,
              targetMarginPercent: minMarginPercent,
              severity: actualMargin < 10 ? 'high' : 'medium',
              explanation: `Sold on ${inv.invoiceNumber} at ₹${sellingPrice} vs supplier cost ₹${costPrice} (${actualMargin.toFixed(1)}% margin vs ${minMarginPercent}% target)`,
              invoiceIds: [inv.id],
            });
          }
        }
      }
    }

    return anomalies;
  }

  public generateDailyClosing(businessId: string, date: string): DailyClosingReport {
    this.assertTenant(businessId);

    // Filter day invoices
    const dayInvoices = this.data.invoices.filter(
      (i) => i.businessId === businessId && (i.createdAt.startsWith(date) || i.dueDate === date) && i.status !== 'cancelled'
    );
    const totalSales = Math.round(dayInvoices.reduce((sum, i) => sum + i.total, 0) * 100) / 100;
    const totalTax = Math.round(dayInvoices.reduce((sum, i) => sum + i.taxAmount, 0) * 100) / 100;

    // Filter day payments
    const dayPayments = this.data.paymentRecords.filter(
      (p) => p.businessId === businessId && p.paymentDate === date
    );
    const totalCollections = Math.round(dayPayments.reduce((sum, p) => sum + p.amount, 0) * 100) / 100;

    // Filter day expenses
    const dayExpenses = this.data.expenses.filter(
      (e) => e.businessId === businessId && e.date === date
    );
    const totalExpenses = Math.round(dayExpenses.reduce((sum, e) => sum + e.amount, 0) * 100) / 100;

    // Unmatched payments
    const unmatchedPayments = dayPayments.filter((p) => !p.matched);
    const unmatchedPaymentsAmount = Math.round(unmatchedPayments.reduce((sum, p) => sum + p.amount, 0) * 100) / 100;

    // Cash transactions: Expected vs Recorded
    const cashInvoices = dayInvoices.filter((i) => i.paymentMode === 'Cash');
    const cashExpected = Math.round(cashInvoices.reduce((sum, i) => sum + i.total, 0) * 100) / 100;
    const cashRecordedPayments = dayPayments.filter((p) => p.paymentMode === 'Cash');
    const cashExpenses = dayExpenses.filter((e) => e.paymentMode === 'Cash');
    const cashRecorded = Math.round(
      (cashRecordedPayments.reduce((sum, p) => sum + p.amount, 0) - cashExpenses.reduce((sum, e) => sum + e.amount, 0)) * 100
    ) / 100;
    const cashVariance = Math.round((cashRecorded - cashExpected) * 100) / 100;

    // Gross profit estimation using deterministic item costs
    let totalCost = 0;
    for (const inv of dayInvoices) {
      for (const item of inv.items) {
        const prod = this.data.products.find(
          (p) => p.businessId === businessId && (p.id === item.productId || p.name.toLowerCase() === item.name.toLowerCase())
        );
        totalCost += (prod?.costPrice || item.unitPrice * 0.65) * item.quantity;
      }
    }
    const estimatedGrossProfit = Math.max(0, Math.round((totalSales - totalTax - totalCost) * 100) / 100);
    const profitMarginPercent = totalSales > 0 ? Math.round((estimatedGrossProfit / totalSales) * 100) : 0;

    // Total receivables for active customers
    const totalReceivables = Math.round(
      this.data.customers.filter((c) => c.businessId === businessId).reduce((sum, c) => sum + c.balance, 0) * 100
    ) / 100;

    // Margin anomalies
    const marginAnomalies = this.detectMarginAnomalies(businessId, 25);

    const report: DailyClosingReport = {
      id: `cls_${date.replace(/-/g, '')}`,
      businessId,
      date,
      totalSales,
      totalInvoices: dayInvoices.length,
      totalCollections,
      totalReceivables,
      totalExpenses,
      totalTax,
      estimatedGrossProfit,
      profitMarginPercent,
      cashExpected,
      cashRecorded,
      cashVariance,
      unmatchedPaymentsCount: unmatchedPayments.length,
      unmatchedPaymentsAmount,
      anomaliesCount: marginAnomalies.length + (unmatchedPayments.length > 0 ? 1 : 0),
      status: 'draft',
      summaryText: `Daily closing for ${date}: Total Sales ₹${totalSales.toLocaleString('en-IN')}, Collections ₹${totalCollections.toLocaleString('en-IN')}, Expenses ₹${totalExpenses.toLocaleString('en-IN')}. ${
        cashVariance !== 0 ? `⚠️ Cash variance of ₹${cashVariance}.` : '✓ Cash perfectly reconciled.'
      } ${unmatchedPayments.length > 0 ? `${unmatchedPayments.length} unmatched payment(s) awaiting customer tagging.` : ''}`,
      sourceInvoices: dayInvoices.map((i) => i.id),
      sourcePayments: dayPayments.map((p) => p.id),
      sourceExpenses: dayExpenses.map((e) => e.id),
      marginAnomalies,
      createdAt: new Date().toISOString(),
    };

    // Save or update existing report for date
    const existingIdx = this.data.dailyClosings.findIndex((c) => c.businessId === businessId && c.date === date);
    if (existingIdx >= 0) {
      this.data.dailyClosings[existingIdx] = report;
    } else {
      this.data.dailyClosings.unshift(report);
    }
    this.saveData(this.data);

    return report;
  }

  public getDailyClosing(businessId: string, date: string): DailyClosingReport | undefined {
    this.assertTenant(businessId);
    return this.data.dailyClosings.find((c) => c.businessId === businessId && c.date === date);
  }

  public finalizeDailyClosing(businessId: string, closingId: string, verifiedBy: string): DailyClosingReport | undefined {
    this.assertTenant(businessId);
    const report = this.data.dailyClosings.find((c) => c.businessId === businessId && c.id === closingId);
    if (report) {
      report.status = 'finalized';
      report.verifiedBy = verifiedBy;
      report.verifiedAt = new Date().toISOString();
      this.saveData(this.data);
      return report;
    }
    return undefined;
  }

  // --- Businesses ---
  public getBusinesses(): Business[] {
    return this.data.businesses;
  }

  public getBusiness(id: string): Business | undefined {
    return this.data.businesses.find((b) => b.id === id);
  }

  // --- Products & Inventory ---
  public getProducts(businessId: string): Product[] {
    this.assertTenant(businessId);
    return this.data.products.filter((p) => p.businessId === businessId);
  }

  public getProduct(businessId: string, productId: string): Product | undefined {
    this.assertTenant(businessId);
    return this.data.products.find(
      (p) => p.businessId === businessId && (p.id === productId || p.name.toLowerCase() === productId.toLowerCase())
    );
  }

  public getLowStockProducts(businessId: string): Product[] {
    this.assertTenant(businessId);
    return this.data.products.filter((p) => p.businessId === businessId && p.stock <= p.minStock);
  }

  public getExpiringProducts(businessId: string): Product[] {
    this.assertTenant(businessId);
    const today = new Date('2024-10-15');
    return this.data.products.filter((p) => {
      if (p.businessId !== businessId || !p.expiryDate) return false;
      const exp = new Date(p.expiryDate);
      const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    });
  }

  public updateProductStock(businessId: string, productId: string, newStock: number): Product | undefined {
    this.assertTenant(businessId);
    const prod = this.data.products.find(
      (p) => p.businessId === businessId && (p.id === productId || p.name.toLowerCase() === productId.toLowerCase())
    );
    if (prod) {
      prod.stock = Math.max(0, newStock);
      prod.lastRestocked = new Date().toISOString().split('T')[0];
      this.saveData(this.data);
      return prod;
    }
    return undefined;
  }

  // --- Customers & Follow-ups ---
  public getCustomers(businessId: string): Customer[] {
    this.assertTenant(businessId);
    return this.data.customers.filter((c) => c.businessId === businessId);
  }

  public getCustomer(businessId: string, id: string): Customer | undefined {
    this.assertTenant(businessId);
    return this.data.customers.find((c) => c.businessId === businessId && c.id === id);
  }

  public findCustomer(businessId: string, query: string): Customer | undefined {
    this.assertTenant(businessId);
    const q = query.toLowerCase().trim();
    return this.data.customers.find(
      (c) =>
        c.businessId === businessId &&
        (c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.email && c.email.toLowerCase().includes(q)))
    );
  }

  public getFollowUps(businessId: string, filter?: 'today' | 'pending' | 'all'): FollowUpTask[] {
    this.assertTenant(businessId);
    const tasks = this.data.followUps.filter((f) => f.businessId === businessId);
    if (filter === 'today') {
      return tasks.filter((f) => f.scheduledDate <= '2024-10-15' && f.status === 'pending');
    }
    if (filter === 'pending') {
      return tasks.filter((f) => f.status === 'pending');
    }
    return tasks;
  }

  public createFollowUp(businessId: string, task: Omit<FollowUpTask, 'id' | 'createdAt'>): FollowUpTask {
    this.assertTenant(businessId);
    const newTask: FollowUpTask = {
      ...task,
      businessId,
      id: `tsk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    this.data.followUps.unshift(newTask);
    this.saveData(this.data);
    return newTask;
  }

  // --- Invoices & Sales ---
  public getInvoices(businessId: string): Invoice[] {
    this.assertTenant(businessId);
    return this.data.invoices.filter((i) => i.businessId === businessId);
  }

  public getInvoice(businessId: string, id: string): Invoice | undefined {
    this.assertTenant(businessId);
    return this.data.invoices.find((i) => i.businessId === businessId && (i.id === id || i.invoiceNumber === id));
  }

  public createInvoice(
    businessId: string,
    invoiceData: {
      customerId?: string;
      customerName: string;
      customerPhone?: string;
      customerGstin?: string;
      customerAddress?: string;
      items: Array<{ name: string; quantity: number; unitPrice: number; taxRate?: number; productId?: string }>;
      discount?: number;
      paymentMode?: string;
      notes?: string;
    }
  ): Invoice {
    this.assertTenant(businessId);
    const discount = invoiceData.discount || 0;
    let subtotal = 0;
    let totalTax = 0;

    const formattedItems = invoiceData.items.map((it, idx) => {
      const taxRate = it.taxRate ?? 5;
      const itemSub = it.quantity * it.unitPrice;
      const itemTax = itemSub * (taxRate / 100);
      subtotal += itemSub;
      totalTax += itemTax;

      // Decrement product stock if matching product exists
      const prod = this.data.products.find(
        (p) => p.businessId === businessId && (p.id === it.productId || p.name.toLowerCase() === it.name.toLowerCase())
      );
      if (prod) {
        prod.stock = Math.max(0, prod.stock - it.quantity);
      }

      return {
        id: `item_${Date.now()}_${idx}`,
        productId: prod?.id,
        name: it.name,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        taxRate,
        total: itemSub,
      };
    });

    const total = Math.max(0, subtotal + totalTax - discount);
    const invoiceCount = this.data.invoices.filter((i) => i.businessId === businessId).length + 104;
    const invoiceNumber = `INV-2024-${String(invoiceCount).padStart(5, '0')}`;

    let customer = this.findCustomer(businessId, invoiceData.customerName);
    if (!customer) {
      customer = {
        id: `cust_${Date.now()}`,
        businessId,
        name: invoiceData.customerName,
        phone: invoiceData.customerPhone || '+91 90000 00000',
        email: '',
        address: invoiceData.customerAddress || '',
        gstin: invoiceData.customerGstin,
        totalSpent: total,
        balance: 0,
        status: 'active',
      };
      this.data.customers.push(customer);
    } else {
      customer.totalSpent += total;
    }

    const newInvoice: Invoice = {
      id: `inv_${Date.now()}`,
      invoiceNumber,
      businessId,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: invoiceData.customerPhone || customer.phone,
      customerGstin: invoiceData.customerGstin || customer.gstin,
      customerAddress: invoiceData.customerAddress || customer.address,
      items: formattedItems,
      subtotal: Math.round(subtotal * 100) / 100,
      taxAmount: Math.round(totalTax * 100) / 100,
      discount,
      total: Math.round(total * 100) / 100,
      status: 'paid',
      dueDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      paymentMode: invoiceData.paymentMode || 'UPI / Instant Pay',
      notes: invoiceData.notes || 'Generated by BizFlow AI assistant',
    };

    this.data.invoices.unshift(newInvoice);
    this.saveData(this.data);
    return newInvoice;
  }

  // --- Sales Summary ---
  public getSalesSummary(businessId: string, period: 'today' | 'week' | 'month' = 'today') {
    this.assertTenant(businessId);
    const invoices = this.data.invoices.filter((i) => i.businessId === businessId && i.status !== 'cancelled');

    const targetDate = '2024-10-15';
    let filtered = invoices;
    let periodLabel = 'Today (15 Oct 2024)';

    if (period === 'today') {
      filtered = invoices.filter((i) => i.createdAt.startsWith(targetDate) || i.dueDate === targetDate);
      periodLabel = 'Today (15 Oct 2024)';
    } else if (period === 'week') {
      filtered = invoices.filter((i) => i.createdAt >= '2024-10-09');
      periodLabel = 'Past 7 Days (09 Oct – 15 Oct 2024)';
    } else if (period === 'month') {
      filtered = invoices.filter((i) => i.createdAt >= '2024-10-01');
      periodLabel = 'October 2024 Month-to-Date';
    }

    const totalSales = filtered.reduce((acc, curr) => acc + curr.total, 0);
    const totalTax = filtered.reduce((acc, curr) => acc + curr.taxAmount, 0);
    const totalInvoices = filtered.length;
    const avgOrderValue = totalInvoices > 0 ? Math.round(totalSales / totalInvoices) : 0;

    const productSalesMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
    for (const inv of filtered) {
      for (const item of inv.items) {
        if (!productSalesMap[item.name]) {
          productSalesMap[item.name] = { name: item.name, quantity: 0, revenue: 0 };
        }
        productSalesMap[item.name].quantity += item.quantity;
        productSalesMap[item.name].revenue += item.total;
      }
    }

    const topSelling = Object.values(productSalesMap).sort((a, b) => b.revenue - a.revenue);
    const purchases = this.data.purchases.filter((p) => p.businessId === businessId);
    const totalPurchases = purchases.reduce((acc, curr) => acc + curr.totalAmount, 0);

    let estimatedCost = 0;
    for (const item of topSelling) {
      const prod = this.data.products.find((p) => p.name.toLowerCase() === item.name.toLowerCase());
      if (prod) {
        estimatedCost += prod.costPrice * item.quantity;
      } else {
        estimatedCost += item.revenue * 0.65;
      }
    }
    const estimatedGrossProfit = Math.max(0, totalSales - totalTax - estimatedCost);

    return {
      period,
      periodLabel,
      totalSales: Math.round(totalSales * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      totalInvoices,
      avgOrderValue,
      totalPurchases,
      estimatedGrossProfit: Math.round(estimatedGrossProfit * 100) / 100,
      profitMarginPercent: totalSales > 0 ? Math.round((estimatedGrossProfit / totalSales) * 100) : 0,
      topSelling,
      invoices: filtered,
    };
  }

  // --- Purchases ---
  public getPurchases(businessId: string): Purchase[] {
    this.assertTenant(businessId);
    return this.data.purchases.filter((p) => p.businessId === businessId);
  }

  // --- Connectors ---
  public getConnectors(businessId: string): ConnectorStatus[] {
    this.assertTenant(businessId);
    return this.data.connectors;
  }

  public updateConnector(type: string, status: Partial<ConnectorStatus>): ConnectorStatus | undefined {
    const conn = this.data.connectors.find((c) => c.type === type);
    if (conn) {
      Object.assign(conn, status);
      this.saveData(this.data);
      return conn;
    }
    return undefined;
  }

  // --- Subscriptions & Billing ---
  public getSubscription(businessId: string): Subscription {
    this.assertTenant(businessId);
    if (!this.data.subscriptions[businessId]) {
      this.data.subscriptions[businessId] = {
        ...SEED_SUBSCRIPTION,
        businessId,
      };
      this.saveData(this.data);
    }
    return this.data.subscriptions[businessId];
  }

  public updateSubscription(businessId: string, updates: Partial<Subscription>): Subscription {
    this.assertTenant(businessId);
    const sub = this.getSubscription(businessId);
    Object.assign(sub, updates);
    this.saveData(this.data);
    return sub;
  }

  public getBillingDetails(businessId: string): BillingDetails {
    this.assertTenant(businessId);
    return this.data.billingDetails[businessId] || {
      businessId,
      legalName: 'Business Owner',
      billingEmail: 'billing@bizflow.in',
      billingPhone: '+91 90000 00000',
      addressLine1: 'India',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600001',
      country: 'India',
      isGstRegistered: false,
    };
  }

  public saveBillingDetails(businessId: string, details: Partial<BillingDetails>): BillingDetails {
    this.assertTenant(businessId);
    const current = this.getBillingDetails(businessId);
    const updated = { ...current, ...details, businessId };
    this.data.billingDetails[businessId] = updated;
    this.saveData(this.data);
    return updated;
  }

  public updateBillingDetails(businessId: string, details: Partial<BillingDetails>): BillingDetails {
    return this.saveBillingDetails(businessId, details);
  }

  public getBillingInvoices(businessId: string): BillingInvoice[] {
    this.assertTenant(businessId);
    return this.data.billingInvoices.filter((i) => i.businessId === businessId);
  }

  public createBillingInvoice(
    businessId: string,
    params: {
      planName: string;
      billingCycle: 'monthly' | 'annual';
      baseAmount: number;
      taxRate: number;
      taxAmount: number;
      totalPaid: number;
      paymentMethod: string;
      gatewayTransactionRef?: string;
    }
  ): BillingInvoice {
    this.assertTenant(businessId);
    const business = this.getBusiness(businessId);
    const details = this.getBillingDetails(businessId);

    const now = new Date();
    const periodEnd = new Date(now);
    if (params.billingCycle === 'annual') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    const startStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const endStr = periodEnd.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const invoiceNumber = `BZF-2024-${String(this.data.billingInvoices.length + 1).padStart(4, '0')}`;

    const invoice: BillingInvoice = {
      id: `binv_${Date.now()}`,
      invoiceNumber,
      businessId,
      businessName: details.legalName || business?.name || 'BizFlow Subscriber',
      billingEmail: details.billingEmail || business?.email || '',
      customerGstin: details.gstin,
      billingAddress: `${details.addressLine1 || ''}, ${details.city || ''}, ${details.state || ''} - ${details.pincode || ''}`,
      planName: params.planName,
      billingPeriod: `${startStr} – ${endStr}`,
      billingCycle: params.billingCycle,
      baseAmount: params.baseAmount,
      taxRate: params.taxRate,
      taxAmount: params.taxAmount,
      totalPaid: params.totalPaid,
      currency: 'INR',
      paymentStatus: 'paid',
      paymentMethod: params.paymentMethod,
      gatewayTransactionRef: params.gatewayTransactionRef,
      createdAt: now.toISOString(),
    };

    this.data.billingInvoices.unshift(invoice);
    this.saveData(this.data);
    return invoice;
  }

  public isWebhookProcessed(eventId: string): boolean {
    return this.data.webhookEvents.includes(eventId);
  }

  public markWebhookProcessed(eventId: string) {
    if (!this.data.webhookEvents.includes(eventId)) {
      this.data.webhookEvents.push(eventId);
      this.saveData(this.data);
    }
  }

  // --- Bulk Import ---
  public importProducts(businessId: string, records: ImportPreviewRecord[]): { imported: number; updated: number } {
    this.assertTenant(businessId);
    let imported = 0;
    let updated = 0;

    for (const rec of records) {
      if (rec.status === 'error') continue;
      const existing = this.data.products.find(
        (p) => p.businessId === businessId && p.name.toLowerCase() === (rec.name || rec.productName).toLowerCase()
      );

      if (existing) {
        existing.stock += rec.quantity;
        existing.price = (rec.price ?? rec.unitPrice) > 0 ? (rec.price ?? rec.unitPrice) : existing.price;
        existing.costPrice = rec.costPrice > 0 ? rec.costPrice : existing.costPrice;
        existing.lastRestocked = new Date().toISOString().split('T')[0];
        updated++;
      } else {
        const prodName = rec.name || rec.productName;
        const newProd: Product = {
          id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          businessId,
          name: prodName,
          sku: rec.sku || `SKU-${prodName.substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
          category: rec.category || 'General',
          price: rec.price ?? rec.unitPrice,
          costPrice: rec.costPrice,
          stock: rec.quantity,
          minStock: Math.max(5, Math.floor(rec.quantity * 0.2)),
          unit: rec.unit || 'pcs',
          lastRestocked: new Date().toISOString().split('T')[0],
        };
        this.data.products.push(newProd);
        imported++;
      }
    }

    this.saveData(this.data);
    return { imported, updated };
  }
}

// Singleton database instance
export const db = new DatabaseService();
