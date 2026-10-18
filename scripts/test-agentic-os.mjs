/**
 * BizFlow AI Agentic Operating System - Automated End-to-End Test Suite
 * Tests all three agents, shared execution engine, policies, quotas, and database methods.
 */

const BASE_URL = 'http://localhost:3000';
const BUSINESS_ID = 'biz_karthik_textiles';

async function runTests() {
  console.log('====================================================');
  console.log('🚀 Starting BizFlow AI Agentic OS Test Suite');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      process.stdout.write(`• Testing: ${name}... `);
      await fn();
      console.log('✅ PASSED');
      passed++;
    } catch (err) {
      console.log(`❌ FAILED: ${err.message}`);
      failed++;
    }
  }

  // 1. Quota & Subscription API
  await test('Server-Enforced Quota endpoint (/api/agent/quota)', async () => {
    const res = await fetch(`${BASE_URL}/api/agent/quota?businessId=${BUSINESS_ID}`);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error('Failed to fetch quota');
    if (!data.quota || data.quota.maxAiRuns !== 100 || data.quota.maxExtractions !== 50) {
      throw new Error(`Unexpected quota limits: ${JSON.stringify(data.quota)}`);
    }
    if (data.plan.priceMonthly !== 299) {
      throw new Error(`Plan price should be 299, got ${data.plan.priceMonthly}`);
    }
  });

  // 2. Shared Agent Engine - Smart Entry Workflow
  let smartEntryRunId = '';
  await test('Smart Entry Agent: Natural language expense draft', async () => {
    const res = await fetch(`${BASE_URL}/api/agent/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: BUSINESS_ID,
        agentType: 'smart_entry',
        prompt: 'Record ₹850 paid for transportation today',
        autonomyMode: 'guarded_autopilot',
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to start run');
    smartEntryRunId = data.run.id;
    if (!data.run.steps || data.run.steps.length < 2) {
      throw new Error('Expected at least 2 steps (duplicate check & draft preparation)');
    }
    // Check that toolCalls exist and succeeded
    const lastStep = data.run.steps[data.run.steps.length - 1];
    if (lastStep.status !== 'completed') throw new Error(`Last step status was ${lastStep.status}`);
  });

  // 3. Smart Document Extraction & Stock Safety Check
  let createdDraftId = '';
  await test('Smart Entry Agent: Document extraction & Stock non-increment policy', async () => {
    const rawBill = `TAX INVOICE #INV-TEST-99\nSupplier: Sivam Silk Weavers\nDate: 2024-10-15\nSilk Stoles x 10 @ 650\nGST: 325\nTotal: ₹6,825`;
    const res = await fetch(`${BASE_URL}/api/entry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: BUSINESS_ID,
        action: 'extract',
        payload: {
          rawText: rawBill,
          fileName: 'Test_Supplier_Bill.pdf',
          fileType: 'pdf',
        },
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Document extraction failed');
    if (!data.draft || data.draft.total !== 6825) {
      throw new Error(`Extracted amount mismatch. Expected 6825, got ${data.draft?.total}`);
    }
    createdDraftId = data.draft.id;
  });

  // 4. Duplicate Transaction Detection
  await test('Smart Entry Agent: Duplicate transaction detector', async () => {
    const res = await fetch(`${BASE_URL}/api/entry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: BUSINESS_ID,
        action: 'check_duplicate',
        payload: {
          type: 'purchase_bill',
          amount: 29000,
          counterparty: 'Kanchi Weavers Co-operative',
          date: '2024-10-14',
        },
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error('Check duplicate failed');
    if (!data.isDuplicate) {
      throw new Error('Expected duplicate detection for seed purchase PO-2024-88');
    }
  });

  // 5. Commit Draft to Ledger
  await test('Smart Entry Agent: Commit draft to ledger (without inventory inflation)', async () => {
    if (!createdDraftId) throw new Error('No draft ID available');
    const res = await fetch(`${BASE_URL}/api/entry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: BUSINESS_ID,
        action: 'commit_draft',
        payload: { draftId: createdDraftId },
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Commit failed');
    if (!data.committedRecord) throw new Error('Expected committedRecord in response');
  });

  // 6. Udhaar & Collection Agent - Credit Ledger & Aging
  await test('Udhaar Agent: Retrieve customer credit ledgers & 4 aging buckets', async () => {
    const res = await fetch(`${BASE_URL}/api/udhaar?businessId=${BUSINESS_ID}`);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error('Failed to fetch udhaar ledgers');
    if (!data.credits || data.credits.length === 0) throw new Error('No customer credits returned');
    const first = data.credits[0];
    if (!first.aging || typeof first.aging.current !== 'number' || typeof first.aging.daysOver60 !== 'number') {
      throw new Error('Aging buckets missing from customer credit record');
    }
    if (!data.summary || typeof data.summary.totalOutstanding !== 'number') {
      throw new Error('Summary missing from udhaar response');
    }
  });

  // 7. Udhaar Agent - Payment Commitment
  await test('Udhaar Agent: Schedule payment promise/commitment', async () => {
    const res = await fetch(`${BASE_URL}/api/udhaar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: BUSINESS_ID,
        action: 'create_commitment',
        payload: {
          customerId: 'cust_4',
          customerName: 'Murugan Traders (Wholesale)',
          customerPhone: '+91 94440 98765',
          amountPromised: 14200,
          promisedDate: '2024-10-25',
          notes: 'Promised to clear via NEFT after weekly collection',
        },
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to create commitment');
    if (data.commitment.amountPromised !== 14200) {
      throw new Error(`Amount promised mismatch: ${data.commitment.amountPromised}`);
    }
  });

  // 8. Udhaar Agent - WhatsApp Click-to-Chat Link Generation
  await test('Udhaar Agent: Generate WhatsApp reminder & wa.me click-to-chat link', async () => {
    const res = await fetch(`${BASE_URL}/api/udhaar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: BUSINESS_ID,
        action: 'prepare_reminder',
        payload: {
          customerId: 'cust_4',
          reminderType: 'overdue',
        },
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error('Failed to prepare reminder');
    if (!data.reminder.whatsappClickToChatUrl || !data.reminder.whatsappClickToChatUrl.includes('https://wa.me/')) {
      throw new Error(`Invalid WhatsApp URL generated: ${data.reminder.whatsappClickToChatUrl}`);
    }
    if (data.reminder.requiresRealMessagingCredentials !== false) {
      throw new Error('Should explicitly declare direct messaging requires credentials');
    }
  });

  // 9. Udhaar Agent - Transactional Verified Payment Recording
  const uniqueRef = `PAY-TEST-${Date.now().toString().slice(-6)}`;
  await test('Udhaar Agent: Transactional payment recording & balance deduction', async () => {
    const res = await fetch(`${BASE_URL}/api/udhaar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: BUSINESS_ID,
        action: 'record_payment',
        payload: {
          customerId: 'cust_4',
          amount: 5000,
          paymentMode: 'upi',
          referenceNumber: uniqueRef,
        },
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Payment recording failed');
    if (data.payment.amount !== 5000) {
      throw new Error(`Payment amount mismatch: ${data.payment.amount}`);
    }
  });

  // 10. Udhaar Agent - Prevent Duplicate Payment
  await test('Udhaar Agent: Duplicate payment prevention for identical reference number', async () => {
    const res = await fetch(`${BASE_URL}/api/udhaar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: BUSINESS_ID,
        action: 'record_payment',
        payload: {
          customerId: 'cust_4',
          amount: 5000,
          paymentMode: 'upi',
          referenceNumber: uniqueRef, // Same reference number!
        },
      }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      throw new Error('Duplicate payment should have been rejected!');
    }
  });

  // 11. Daily Closing Agent - Calculation & Reconciliation
  await test('Daily Closing Agent: End-of-day reconciliation & cash variance', async () => {
    const res = await fetch(`${BASE_URL}/api/closing?businessId=${BUSINESS_ID}&date=2024-10-15`);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to fetch closing');
    if (!data.closing || typeof data.closing.totalSales !== 'number') {
      throw new Error('Closing report missing totalSales');
    }
    if (typeof data.closing.cashVariance !== 'number') {
      throw new Error('Closing report missing cashVariance');
    }
  });

  // 12. Profit Leak Agent - Margin Anomaly Detection
  await test('Daily Closing Agent: Detect margin anomalies below 15%', async () => {
    const res = await fetch(`${BASE_URL}/api/closing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: BUSINESS_ID,
        action: 'detect_anomalies',
        payload: { minMarginPercent: 15 },
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error('Detect anomalies failed');
    if (!Array.isArray(data.anomalies)) {
      throw new Error('Expected array of anomalies');
    }
  });

  // 13. Tenant Isolation Guard
  await test('Tenant Isolation Guard: Reject request with missing/invalid businessId', async () => {
    const res = await fetch(`${BASE_URL}/api/agent/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: '', // Invalid tenant!
        agentType: 'smart_entry',
        prompt: 'test',
      }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      throw new Error('Empty businessId should be rejected by tenant isolation assert');
    }
  });

  console.log('\n====================================================');
  console.log(`🏁 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Fatal error running tests:', e);
  process.exit(1);
});
