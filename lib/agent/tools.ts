import { db } from '@/lib/db/database';
import {
  TransactionDraft,
  DocumentRecord,
  PaymentRecord,
  AgentToolName,
} from '@/types/agent';

export interface ToolDefinition {
  name: AgentToolName;
  description: string;
  parameters: Record<string, any>;
  execute: (businessId: string, params: any) => Promise<any> | any;
}

export const AGENT_TOOLS: Record<AgentToolName, ToolDefinition> = {
  // 1. search_customers
  search_customers: {
    name: 'search_customers',
    description: 'Find customers by name, phone number, or business name.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Customer name or phone number fragment' },
      },
      required: ['query'],
    },
    execute: (businessId: string, { query }: { query: string }) => {
      const customers = db.getCustomers(businessId);
      const q = (query || '').toLowerCase().trim();
      if (!q) return customers.slice(0, 10);
      return customers.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.email && c.email.toLowerCase().includes(q))
      );
    },
  },

  // 2. search_products
  search_products: {
    name: 'search_products',
    description: 'Find products by name, SKU, or category to match prices and stock.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Product name or SKU fragment' },
      },
      required: ['query'],
    },
    execute: (businessId: string, { query }: { query: string }) => {
      const products = db.getProducts(businessId);
      const q = (query || '').toLowerCase().trim();
      if (!q) return products.slice(0, 10);
      return products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    },
  },

  // 3. extract_business_document
  extract_business_document: {
    name: 'extract_business_document',
    description: 'Extract structured business data (date, supplier/customer, amounts, items) from text, OCR, or CSV inputs.',
    parameters: {
      type: 'object',
      properties: {
        documentId: { type: 'string', description: 'Optional ID of existing document' },
        rawText: { type: 'string', description: 'Raw document text, OCR transcript, or natural language input' },
        fileName: { type: 'string', description: 'Name of the uploaded file' },
        fileType: { type: 'string', description: 'image | pdf | csv | excel | text' },
      },
      required: ['rawText'],
    },
    execute: (
      businessId: string,
      {
        documentId,
        rawText,
        fileName = 'document.txt',
        fileType = 'text',
      }: { documentId?: string; rawText: string; fileName?: string; fileType?: string }
    ) => {
      const text = rawText || '';

      // Check quota for extraction
      const quotaCheck = db.checkAndIncrementQuota(businessId, 'extraction');
      if (!quotaCheck.allowed) {
        throw new Error(`AI document extraction quota exceeded. Current limit: ${quotaCheck.quota.maxExtractions}/month.`);
      }

      // Rule-based and pattern extraction engine
      let transactionType: 'purchase_bill' | 'expense' | 'sales_invoice' = 'expense';
      const lower = text.toLowerCase();

      if (lower.includes('tax invoice') || lower.includes('bill to') || lower.includes('supplier') || lower.includes('purchase')) {
        transactionType = 'purchase_bill';
      } else if (lower.includes('sale') || lower.includes('retail invoice') || lower.includes('customer bill')) {
        transactionType = 'sales_invoice';
      } else {
        transactionType = 'expense';
      }

      // Extract Date (DD/MM/YYYY, YYYY-MM-DD, or DD-MM-YYYY)
      let extractedDate = new Date().toISOString().split('T')[0];
      const dateMatch = text.match(/\b(\d{4}[-/.]\d{2}[-/.]\d{2})\b/) || text.match(/\b(\d{2}[-/.]\d{2}[-/.]\d{4})\b/);
      if (dateMatch) {
        const rawDate = dateMatch[1];
        if (rawDate.includes('-') && rawDate.split('-')[0].length === 4) {
          extractedDate = rawDate;
        } else if (rawDate.includes('/')) {
          const parts = rawDate.split('/');
          if (parts[2]?.length === 4) {
            extractedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          }
        }
      }

      // Extract Reference / Invoice Number
      let invoiceNumber = '';
      const invMatch = text.match(/(?:inv|invoice|bill|receipt|ref|tax inv)[#:\s-]*([A-Z0-9\-_/]+)/i);
      if (invMatch && invMatch[1]) {
        invoiceNumber = invMatch[1].trim();
      } else {
        invoiceNumber = `DOC-${Date.now().toString().slice(-6)}`;
      }

      // Extract Amounts (Look for ₹ or Rs. or Total)
      let totalAmount = 0;
      let taxAmount = 0;
      const totalMatch =
        text.match(/(?:grand total|total amount|total paid|total|net amount)[^\d]*([0-9,]+(?:\.[0-9]{2})?)/i) ||
        text.match(/(?:₹|rs\.?)\s*([0-9,]+(?:\.[0-9]{2})?)/i);
      if (totalMatch && totalMatch[1]) {
        totalAmount = parseFloat(totalMatch[1].replace(/,/g, ''));
      }

      const taxMatch = text.match(/(?:gst|tax|cgst\+sgst|vat)[^\d]*([0-9,]+(?:\.[0-9]{2})?)/i);
      if (taxMatch && taxMatch[1]) {
        taxAmount = parseFloat(taxMatch[1].replace(/,/g, ''));
      }

      // Extract Supplier or Vendor / Counterparty
      let counterpartyName = '';
      const supplierMatch =
        text.match(/(?:from|supplier|vendor|seller|m\/s|received from)[:\s]+([^\n\r,]+)/i) ||
        text.match(/(?:paid to|to)[:\s]+([^\n\r,]+)/i);
      if (supplierMatch && supplierMatch[1]) {
        counterpartyName = supplierMatch[1].trim();
      }

      // Extract line items if detectable
      const items: Array<{
        name: string;
        quantity: number;
        unitPrice: number;
        taxRate?: number;
        total: number;
        confidence?: number;
      }> = [];

      const lines = text.split('\n');
      for (const line of lines) {
        const itemPattern = /([A-Za-z0-9\s-]+?)\s+(?:x|\*|,)\s*(\d+)\s*(?:@|at|,)\s*(?:₹|Rs\.?)?\s*([\d.]+)/i;
        const m = line.match(itemPattern);
        if (m) {
          const qty = parseInt(m[2], 10);
          const price = parseFloat(m[3]);
          items.push({
            name: m[1].trim(),
            quantity: qty,
            unitPrice: price,
            taxRate: 5,
            total: Math.round(qty * price * 1.05 * 100) / 100,
            confidence: 0.9,
          });
        }
      }

      // Fallback line item if none parsed
      if (items.length === 0 && totalAmount > 0) {
        items.push({
          name: counterpartyName ? `Expenses from ${counterpartyName}` : 'Business Expense',
          quantity: 1,
          unitPrice: Math.max(0, totalAmount - taxAmount),
          taxRate: taxAmount > 0 && totalAmount > taxAmount ? Math.round((taxAmount / (totalAmount - taxAmount)) * 100) : 0,
          total: totalAmount,
          confidence: 0.8,
        });
      }

      // Confidence score calculation
      let confidence = 0.7;
      const validationWarnings: string[] = [];
      if (totalAmount <= 0) {
        validationWarnings.push('Could not confidently extract grand total. Please verify the amount.');
        confidence -= 0.2;
      }
      if (!counterpartyName) {
        validationWarnings.push('Supplier or counterparty name was not clearly detected.');
        confidence -= 0.1;
      } else {
        confidence += 0.15;
      }
      if (items.length > 0) confidence += 0.1;
      confidence = Math.min(0.98, Math.max(0.3, Math.round(confidence * 100) / 100));

      const docRecord: DocumentRecord = {
        id: documentId || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        businessId,
        fileName,
        fileSize: text.length,
        fileType,
        uploadedAt: new Date().toISOString(),
        ocrExtractedAt: new Date().toISOString(),
        rawText: text,
        status: 'extracted',
      };

      db.createDocument(docRecord);

      // Also create draft automatically for owner review
      const draft: TransactionDraft = {
        id: `draft_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        businessId,
        sourceDocumentId: docRecord.id,
        transactionType,
        status: 'draft',
        date: extractedDate,
        referenceNumber: invoiceNumber,
        counterpartyName: counterpartyName || 'Unknown Counterparty',
        items,
        subtotal: Math.max(0, totalAmount - taxAmount),
        taxAmount,
        total: totalAmount,
        confidence,
        warnings: validationWarnings,
        potentialDuplicates: [],
        createdAt: new Date().toISOString(),
      };

      db.createTransactionDraft(draft);

      return {
        document: docRecord,
        draft,
        extractedSummary: `${transactionType.toUpperCase()}: ${counterpartyName || 'Supplier'} - ₹${totalAmount} on ${extractedDate}`,
      };
    },
  },

  // 4. validate_transaction
  validate_transaction: {
    name: 'validate_transaction',
    description: 'Validate transaction draft fields, line item totals, tax consistency, and customer/supplier references.',
    parameters: {
      type: 'object',
      properties: {
        draft: { type: 'object', description: 'Transaction draft to validate' },
      },
      required: ['draft'],
    },
    execute: (businessId: string, { draft }: { draft: Partial<TransactionDraft> }) => {
      const warnings: string[] = [];
      const errors: string[] = [];

      if (!draft.date) {
        errors.push('Transaction date is required.');
      } else if (isNaN(new Date(draft.date).getTime())) {
        errors.push('Transaction date format is invalid.');
      }

      if (!draft.total || draft.total <= 0) {
        errors.push('Total amount must be greater than zero.');
      }

      if (draft.transactionType === 'purchase_bill' && !draft.counterpartyName) {
        warnings.push('Supplier name is empty. Recommended to assign a registered supplier.');
      }

      if (draft.transactionType === 'customer_payment' && !draft.counterpartyId && !draft.counterpartyName) {
        errors.push('Customer reference is required for payment transactions.');
      }

      // Check item totals if present
      if (draft.items && draft.items.length > 0) {
        const calculatedItemSum = draft.items.reduce((sum, it) => sum + (it.total || it.quantity * it.unitPrice), 0);
        const difference = Math.abs(calculatedItemSum - (draft.total || 0));
        if (difference > 1.0) {
          warnings.push(`Line items sum (₹${calculatedItemSum}) differs from total amount (₹${draft.total}).`);
        }
      }

      // Check duplicate
      const dup = db.checkDuplicateTransaction(
        businessId,
        draft.transactionType || 'expense',
        draft.total || 0,
        draft.counterpartyName || '',
        draft.date || new Date().toISOString().split('T')[0],
        draft.referenceNumber
      );

      if (dup.isDuplicate) {
        warnings.push(`Possible duplicate detected! Matched ${dup.matches.length} existing record(s).`);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        isDuplicate: dup.isDuplicate,
        duplicateMatches: dup.matches,
      };
    },
  },

  // 5. detect_duplicate_transaction
  detect_duplicate_transaction: {
    name: 'detect_duplicate_transaction',
    description: 'Check if a bill, invoice, or expense has already been recorded.',
    parameters: {
      type: 'object',
      properties: {
        type: { type: 'string' },
        amount: { type: 'number' },
        counterparty: { type: 'string' },
        date: { type: 'string' },
        refNumber: { type: 'string' },
      },
    },
    execute: (businessId: string, params: any) => {
      return db.checkDuplicateTransaction(
        businessId,
        params.type || 'expense',
        params.amount || 0,
        params.counterparty || '',
        params.date || new Date().toISOString().split('T')[0],
        params.refNumber
      );
    },
  },

  // 6. create_transaction_draft
  create_transaction_draft: {
    name: 'create_transaction_draft',
    description: 'Prepare a structured transaction draft for human review and approval.',
    parameters: {
      type: 'object',
      properties: {
        sourceDocumentId: { type: 'string' },
        transactionType: { type: 'string', enum: ['expense', 'purchase_bill', 'sales_invoice', 'customer_payment'] },
        date: { type: 'string' },
        referenceNumber: { type: 'string' },
        counterpartyName: { type: 'string' },
        counterpartyId: { type: 'string' },
        total: { type: 'number' },
        taxAmount: { type: 'number' },
        notes: { type: 'string' },
        items: { type: 'array' },
      },
      required: ['transactionType', 'date', 'total'],
    },
    execute: (businessId: string, draftData: any) => {
      const dup = db.checkDuplicateTransaction(
        businessId,
        draftData.transactionType || 'expense',
        draftData.total || 0,
        draftData.counterpartyName || '',
        draftData.date || new Date().toISOString().split('T')[0],
        draftData.referenceNumber
      );

      const draft: TransactionDraft = {
        id: `draft_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        businessId,
        sourceDocumentId: draftData.sourceDocumentId,
        transactionType: draftData.transactionType || 'expense',
        status: 'draft',
        date: draftData.date,
        referenceNumber: draftData.referenceNumber || `REF-${Date.now().toString().slice(-6)}`,
        counterpartyName: draftData.counterpartyName || 'General',
        counterpartyId: draftData.counterpartyId,
        items: draftData.items || [],
        subtotal: Math.max(0, (draftData.total || 0) - (draftData.taxAmount || 0)),
        taxAmount: draftData.taxAmount || 0,
        total: draftData.total || 0,
        notes: draftData.notes,
        confidence: draftData.confidence || 0.9,
        warnings: dup.isDuplicate ? [`Potential duplicate matched ${dup.matches.length} record(s)`] : [],
        potentialDuplicates: dup.matches.map((m) => m.id),
        createdAt: new Date().toISOString(),
      };

      return db.createTransactionDraft(draft);
    },
  },

  // 7. approve_and_commit_transaction
  approve_and_commit_transaction: {
    name: 'approve_and_commit_transaction',
    description: 'Commit an approved transaction draft to official database records. Stock is NOT auto-incremented on invoice upload without explicit verified goods receipt.',
    parameters: {
      type: 'object',
      properties: {
        draftId: { type: 'string', description: 'ID of transaction draft' },
      },
      required: ['draftId'],
    },
    execute: (businessId: string, { draftId }: { draftId: string }) => {
      const result = db.commitTransactionDraft(businessId, draftId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to commit draft.');
      }
      return {
        success: true,
        committedRecord: result.committedRecord,
        message: 'Transaction committed successfully to ledger. Inventory stock remains unchanged pending verified goods receipt workflow.',
      };
    },
  },

  // 8. get_customer_ledger
  get_customer_ledger: {
    name: 'get_customer_ledger',
    description: 'Retrieve full credit ledger, aging buckets (0-15, 16-30, 31-60, 60+ days), overdue invoices, and payment promises for a customer.',
    parameters: {
      type: 'object',
      properties: {
        customerId: { type: 'string', description: 'ID of customer' },
      },
      required: ['customerId'],
    },
    execute: (businessId: string, { customerId }: { customerId: string }) => {
      return db.getCustomerLedger(businessId, customerId);
    },
  },

  // 9. prepare_payment_reminder
  prepare_payment_reminder: {
    name: 'prepare_payment_reminder',
    description: 'Generate personalized payment reminder text and a verified WhatsApp click-to-chat URL (wa.me) using real invoice and credit details.',
    parameters: {
      type: 'object',
      properties: {
        customerId: { type: 'string' },
        invoiceId: { type: 'string' },
        reminderType: { type: 'string', enum: ['gentle', 'due_today', 'overdue', 'urgent'] },
      },
      required: ['customerId'],
    },
    execute: (
      businessId: string,
      { customerId, invoiceId, reminderType = 'gentle' }: { customerId: string; invoiceId?: string; reminderType?: string }
    ) => {
      const customer = db.getCustomer(businessId, customerId);
      if (!customer) throw new Error(`Customer ${customerId} not found.`);

      const business = db.getBusiness(businessId);
      const bizName = business?.name || 'BizFlow Business';
      const balance = customer.balance || 0;

      let invoiceDetails = '';
      if (invoiceId) {
        const inv = db.getInvoice(businessId, invoiceId);
        if (inv) {
          invoiceDetails = ` (Invoice #${inv.invoiceNumber}, Due date: ${inv.dueDate})`;
        }
      }

      let message = '';
      if (reminderType === 'gentle') {
        message = `Dear ${customer.name}, warm greetings from ${bizName}. This is a polite reminder that an outstanding balance of ₹${balance.toLocaleString('en-IN')}${invoiceDetails} is due. Please settle at your convenience. Thank you!`;
      } else if (reminderType === 'due_today') {
        message = `Dear ${customer.name}, greetings from ${bizName}. Your payment of ₹${balance.toLocaleString('en-IN')}${invoiceDetails} is due today. Kindly share the transaction reference once paid. Thank you!`;
      } else if (reminderType === 'overdue') {
        message = `Dear ${customer.name}, from ${bizName}. Your account shows an overdue balance of ₹${balance.toLocaleString('en-IN')}${invoiceDetails}. Kindly arrange for payment at your earliest convenience or let us know when to expect it. Thank you!`;
      } else {
        message = `URGENT: Dear ${customer.name}, balance of ₹${balance.toLocaleString('en-IN')}${invoiceDetails} from ${bizName} is significantly overdue. Please arrange immediate payment or contact us today.`;
      }

      // Clean phone number for WhatsApp
      let cleanPhone = customer.phone.replace(/[^0-9]/g, '');
      if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;

      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

      return {
        customerId,
        customerName: customer.name,
        phone: customer.phone,
        outstandingBalance: balance,
        reminderType,
        messageText: message,
        whatsappClickToChatUrl: whatsappUrl,
        requiresRealMessagingCredentials: false,
        note: 'WhatsApp click-to-chat URL prepared. Direct API sending requires authenticated WhatsApp Business API credentials.',
      };
    },
  },

  // 10. record_verified_payment
  record_verified_payment: {
    name: 'record_verified_payment',
    description: 'Transactionally record a verified customer payment against an invoice, preventing duplicates and updating balances.',
    parameters: {
      type: 'object',
      properties: {
        customerId: { type: 'string' },
        invoiceId: { type: 'string' },
        amount: { type: 'number' },
        paymentMode: { type: 'string', enum: ['cash', 'upi', 'bank_transfer', 'cheque'] },
        referenceNumber: { type: 'string' },
        paymentDate: { type: 'string' },
        notes: { type: 'string' },
      },
      required: ['customerId', 'amount', 'paymentMode'],
    },
    execute: (businessId: string, paymentData: any) => {
      const result = db.recordVerifiedPayment(businessId, {
        customerId: paymentData.customerId,
        invoiceId: paymentData.invoiceId,
        amount: paymentData.amount,
        paymentMode: paymentData.paymentMode,
        referenceNumber: paymentData.referenceNumber || `PAY-${Date.now().toString().slice(-6)}`,
        paymentDate: paymentData.paymentDate || new Date().toISOString().split('T')[0],
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to record payment');
      }

      return {
        success: true,
        paymentId: result.payment.id,
        amount: result.payment.amount,
        customerId: result.payment.customerId,
        invoiceId: result.payment.invoiceId,
        updatedBalance: result.updatedBalance,
        message: `Verified payment of ₹${result.payment.amount.toLocaleString('en-IN')} recorded successfully.`,
      };
    },
  },

  // 11. import_payment_statement
  import_payment_statement: {
    name: 'import_payment_statement',
    description: 'Import bank or UPI statement entries for reconciliation and identify unmatched payments.',
    parameters: {
      type: 'object',
      properties: {
        records: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string' },
              amount: { type: 'number' },
              paymentMode: { type: 'string' },
              referenceNumber: { type: 'string' },
              counterpartyName: { type: 'string' },
              notes: { type: 'string' },
            },
            required: ['date', 'amount', 'referenceNumber'],
          },
        },
      },
      required: ['records'],
    },
    execute: (businessId: string, { records }: { records: any[] }) => {
      return db.importPaymentRecords(businessId, records);
    },
  },

  // 12. reconcile_transactions
  reconcile_transactions: {
    name: 'reconcile_transactions',
    description: 'Reconcile an imported payment against invoices.',
    parameters: {
      type: 'object',
      properties: {
        paymentId: { type: 'string' },
        invoiceId: { type: 'string' },
      },
      required: ['paymentId', 'invoiceId'],
    },
    execute: (businessId: string, { paymentId, invoiceId }: { paymentId: string; invoiceId: string }) => {
      return db.reconcilePayment(businessId, paymentId, invoiceId);
    },
  },

  // 13. calculate_business_metrics
  calculate_business_metrics: {
    name: 'calculate_business_metrics',
    description: 'Calculate deterministic financial metrics: sales, collections, expenses, taxes, and gross profit.',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'YYYY-MM-DD or timeframe (today, yesterday, this_month)' },
      },
    },
    execute: (businessId: string, { date }: { date?: string }) => {
      const targetDate = !date || date === 'today' ? new Date().toISOString().split('T')[0] : date;
      const invoices = db.getInvoices(businessId).filter((i) => i.createdAt.startsWith(targetDate));
      const expenses = db.getExpenses(businessId, targetDate);
      const payments = db.getPaymentRecords(businessId).filter((p) => p.paymentDate === targetDate);

      const totalSales = invoices.reduce((sum, inv) => sum + inv.total, 0);
      const totalTax = invoices.reduce((sum, inv) => sum + (inv.taxAmount || 0), 0);
      const totalDiscount = invoices.reduce((sum, inv) => sum + (inv.discount || 0), 0);
      const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
      const totalCollections = payments.reduce((sum, p) => sum + p.amount, 0);

      // Deterministic gross profit
      let calculatedCost = 0;
      let itemsWithCost = 0;
      let totalItems = 0;

      for (const inv of invoices) {
        for (const item of inv.items) {
          totalItems++;
          const prod = db.getProducts(businessId).find((p) => p.id === item.productId || p.name === item.name);
          if (prod && prod.costPrice > 0) {
            calculatedCost += prod.costPrice * item.quantity;
            itemsWithCost++;
          }
        }
      }

      const hasCostData = totalItems > 0 && itemsWithCost / totalItems >= 0.7;
      const grossProfit = hasCostData ? Math.max(0, totalSales - totalTax - calculatedCost) : null;
      const grossMarginPercent = hasCostData && totalSales > 0 ? Math.round(((grossProfit || 0) / totalSales) * 1000) / 10 : null;

      return {
        date: targetDate,
        invoicesCount: invoices.length,
        totalSales: Math.round(totalSales * 100) / 100,
        totalTax: Math.round(totalTax * 100) / 100,
        totalDiscount: Math.round(totalDiscount * 100) / 100,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        totalCollections: Math.round(totalCollections * 100) / 100,
        grossProfit: grossProfit !== null ? Math.round(grossProfit * 100) / 100 : null,
        grossMarginPercent,
        hasReliableCostData: hasCostData,
        costReliabilityNote: hasCostData
          ? 'Calculated from verified product purchase costs.'
          : 'Insufficient product cost price data to calculate reliable gross profit without speculation.',
      };
    },
  },

  // 14. identify_margin_anomalies
  identify_margin_anomalies: {
    name: 'identify_margin_anomalies',
    description: 'Audit transactions for low or negative profit margins, high discounts, and supplier cost increases.',
    parameters: {
      type: 'object',
      properties: {
        minMarginPercent: { type: 'number', description: 'Minimum acceptable gross margin percentage (e.g. 15)' },
      },
    },
    execute: (businessId: string, { minMarginPercent = 15 }: { minMarginPercent?: number }) => {
      return db.detectMarginAnomalies(businessId, minMarginPercent);
    },
  },

  // 15. generate_daily_closing_report
  generate_daily_closing_report: {
    name: 'generate_daily_closing_report',
    description: 'Execute end-of-day reconciliation, cash variance audit, and produce official closing report.',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'YYYY-MM-DD' },
      },
      required: ['date'],
    },
    execute: (businessId: string, { date }: { date: string }) => {
      return db.generateDailyClosing(businessId, date);
    },
  },

  // 16. get_task_status
  get_task_status: {
    name: 'get_task_status',
    description: 'Inspect status, execution plan, tool calls, and approvals for an agent run.',
    parameters: {
      type: 'object',
      properties: {
        runId: { type: 'string' },
      },
      required: ['runId'],
    },
    execute: (businessId: string, { runId }: { runId: string }) => {
      const run = db.getAgentRun(businessId, runId);
      if (!run) throw new Error(`Agent run ${runId} not found.`);
      return run;
    },
  },
};
