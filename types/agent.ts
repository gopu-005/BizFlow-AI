export type AgentType = 'smart_entry' | 'udhaar_collection' | 'daily_closing' | 'general';

export type AutonomyMode = 'suggest_only' | 'guarded_autopilot' | 'trusted_autopilot';

export type AgentRunStatus =
  | 'planning'
  | 'executing'
  | 'awaiting_approval'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type AgentToolName =
  | 'search_customers'
  | 'search_products'
  | 'extract_business_document'
  | 'validate_transaction'
  | 'detect_duplicate_transaction'
  | 'create_transaction_draft'
  | 'approve_and_commit_transaction'
  | 'get_customer_ledger'
  | 'prepare_payment_reminder'
  | 'record_verified_payment'
  | 'import_payment_statement'
  | 'reconcile_transactions'
  | 'calculate_business_metrics'
  | 'identify_margin_anomalies'
  | 'generate_daily_closing_report'
  | 'get_task_status';

export interface SourceRecordRef {
  type: 'invoice' | 'customer' | 'product' | 'expense' | 'payment' | 'document' | 'closing' | 'commitment';
  id: string;
  label: string;
  url?: string;
  amount?: number;
}

export interface AgentToolCall {
  id: string;
  toolName: AgentToolName;
  input: Record<string, any>;
  output?: any;
  status: 'pending' | 'success' | 'failed' | 'requires_approval';
  requiresApproval?: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  error?: string;
  timestamp: string;
  executionTimeMs?: number;
}

export interface AgentApproval {
  id: string;
  runId: string;
  toolCallId: string;
  toolName: AgentToolName;
  actionType: string;
  description: string;
  payload: Record<string, any>;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  respondedAt?: string;
  respondedBy?: string;
  reason?: string;
}

export interface AgentStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  toolCalls: AgentToolCall[];
  sourceRecords?: SourceRecordRef[];
  timestamp: string;
}

export interface AgentRun {
  id: string;
  businessId: string;
  agentType: AgentType;
  autonomyMode: AutonomyMode;
  userPrompt: string;
  status: AgentRunStatus;
  plan: string[];
  currentStepIndex: number;
  steps: AgentStep[];
  approvals: AgentApproval[];
  summary?: string;
  clarificationQuestion?: string;
  sourceRecords: SourceRecordRef[];
  error?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface TransactionDraft {
  id: string;
  businessId: string;
  transactionType: 'expense' | 'purchase_bill' | 'sales_invoice' | 'customer_payment';
  status: 'draft' | 'approved' | 'committed' | 'rejected';
  date: string;
  referenceNumber?: string;
  counterpartyName: string;
  counterpartyPhone?: string;
  counterpartyGstin?: string;
  counterpartyId?: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    taxRate?: number;
    total: number;
    matchedProductId?: string;
    confidence?: number;
  }>;
  subtotal: number;
  taxAmount: number;
  total: number;
  paymentMode?: string;
  confidence: number;
  warnings: string[];
  potentialDuplicates: string[];
  notes?: string;
  sourceDocumentId?: string;
  createdAt: string;
}

export interface DocumentRecord {
  id: string;
  businessId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
  ocrExtractedAt?: string;
  rawText?: string;
  extractedDraftId?: string;
  status: 'uploaded' | 'extracted' | 'committed' | 'failed';
  hash?: string;
}

export interface PaymentCommitment {
  id: string;
  businessId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  amountPromised: number;
  promisedDate: string;
  invoiceId?: string;
  status: 'pending' | 'fulfilled' | 'missed' | 'rescheduled';
  followUpCount: number;
  lastReminderSentAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRecord {
  id: string;
  businessId: string;
  customerId?: string;
  customerName?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  amount: number;
  paymentDate: string;
  paymentMode: string;
  referenceNumber: string;
  bankTransactionRef?: string;
  matched: boolean;
  reconciledAt?: string;
  createdAt: string;
}

export interface MarginAnomaly {
  productId: string;
  productName: string;
  sku: string;
  costPrice: number;
  sellingPrice: number;
  actualMarginPercent: number;
  targetMarginPercent: number;
  severity: 'low' | 'medium' | 'high';
  explanation: string;
  invoiceIds: string[];
}

export interface DailyClosingReport {
  id: string;
  businessId: string;
  date: string;
  totalSales: number;
  totalInvoices: number;
  totalCollections: number;
  totalReceivables: number;
  totalExpenses: number;
  totalTax: number;
  estimatedGrossProfit: number;
  profitMarginPercent: number;
  cashExpected: number;
  cashRecorded: number;
  cashVariance: number;
  unmatchedPaymentsCount: number;
  unmatchedPaymentsAmount: number;
  anomaliesCount: number;
  status: 'draft' | 'verified' | 'finalized';
  verifiedBy?: string;
  verifiedAt?: string;
  summaryText: string;
  sourceInvoices: string[];
  sourcePayments: string[];
  sourceExpenses: string[];
  marginAnomalies: MarginAnomaly[];
  createdAt: string;
}

export interface TenantUsageQuota {
  businessId: string;
  planName: string;
  billingCycle: 'monthly' | 'annual';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  maxAiRuns: number;
  usedAiRuns: number;
  maxExtractions: number;
  usedExtractions: number;
  maxStorageMb: number;
  usedStorageMb: number;
}
