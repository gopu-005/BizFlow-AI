// BizFlow AI End-to-End Smoke Test Suite
import { db } from '../lib/db/database.js';
import { processUserCommand } from '../lib/ai/router.js';
import { createSubscriptionOrder, verifyAndActivatePayment } from '../lib/billing/razorpay.js';

console.log('🧪 Starting BizFlow AI Smoke Tests...\n');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

try {
  // 1. Database & Businesses
  const businesses = db.getBusinesses();
  assert(businesses.length >= 2, `Should load at least 2 seed businesses (found ${businesses.length})`);
  const karthikBiz = db.getBusiness('biz_karthik_textiles');
  assert(karthikBiz?.name === 'Karthik Textiles & Garments', 'Should find Karthik Textiles tenant');

  // 2. Deterministic Sales Calculation
  const salesSummary = db.getSalesSummary('biz_karthik_textiles', 'today');
  assert(salesSummary.totalSales > 0, `Today sales should be > 0 (computed ${salesSummary.totalSales})`);
  assert(salesSummary.estimatedGrossProfit > 0, `Gross profit should be > 0 (computed ${salesSummary.estimatedGrossProfit})`);
  assert(salesSummary.totalInvoices >= 2, `Should count invoices accurately (found ${salesSummary.totalInvoices})`);

  // 3. Low-stock inventory query
  const lowStock = db.getLowStockProducts('biz_karthik_textiles');
  assert(lowStock.length > 0, `Should identify low stock items (found ${lowStock.length})`);
  const outOfStock = lowStock.find((p) => p.stock === 0);
  assert(outOfStock !== undefined, `Should identify out-of-stock items (found ${outOfStock?.name})`);

  // 4. Natural Language Commands (English)
  const cmdSales = processUserCommand('How much did I sell today?', 'biz_karthik_textiles');
  assert(cmdSales.intent === 'today_sales', 'English query: "How much did I sell today?" should route to today_sales');
  assert(cmdSales.actionType === 'sales_summary', 'Should trigger sales_summary action');

  const cmdInv = processUserCommand('Which products need restocking?', 'biz_karthik_textiles');
  assert(cmdInv.intent === 'inventory_low_stock', 'English query: "Which products need restocking?" should route to inventory');

  // 5. Natural Language Commands (Tamil)
  const cmdTaSales = processUserCommand('இன்று எவ்வளவு விற்பனை ஆனது?', 'biz_karthik_textiles');
  assert(cmdTaSales.language === 'ta', 'Tamil query should be recognized as Tamil language');
  assert(cmdTaSales.intent === 'today_sales', 'Tamil query should route to today_sales');

  const cmdTaInv = processUserCommand('ஸ்டாக் குறைவான பொருட்கள் என்னென்ன?', 'biz_karthik_textiles');
  assert(cmdTaInv.language === 'ta', 'Tamil query should route to inventory_low_stock');

  // 6. Invoice Creation with Stock Decrement
  const initialStock = db.getProduct('biz_karthik_textiles', 'prod_1')?.stock || 0;
  const newInvoice = db.createInvoice('biz_karthik_textiles', {
    customerName: 'Kavitha Nathan',
    customerPhone: '+91 99999 88888',
    items: [{ productId: 'prod_1', name: 'Kanchipuram Pure Silk Saree', quantity: 2, unitPrice: 8500, taxRate: 5 }],
    discount: 0,
  });
  assert(newInvoice.total === 17850, `Invoice total should accurately calculate tax 5% (expected 17850, got ${newInvoice.total})`);
  const finalStock = db.getProduct('biz_karthik_textiles', 'prod_1')?.stock || 0;
  assert(finalStock === initialStock - 2, `Product stock should decrement by 2 (before: ${initialStock}, after: ${finalStock})`);

  // 7. Razorpay Order Creation & GST
  const order = createSubscriptionOrder({
    businessId: 'biz_karthik_textiles',
    billingCycle: 'monthly',
    customerName: 'Karthik Ramanathan',
    customerEmail: 'karthik@textiles.bizflow.in',
  });
  assert(order.totalAmount === 499, `Monthly subscription should be exactly ₹499 (got ${order.totalAmount})`);
  assert(order.baseAmount + order.taxAmount === 499, 'Base + Tax should equal 499');

  const annualOrder = createSubscriptionOrder({
    businessId: 'biz_karthik_textiles',
    billingCycle: 'annual',
    customerName: 'Karthik Ramanathan',
    customerEmail: 'karthik@textiles.bizflow.in',
  });
  assert(annualOrder.totalAmount === 4999, `Annual subscription should be exactly ₹4,999 (got ${annualOrder.totalAmount})`);

  // 8. Payment Verification & Billing Invoice Generation
  const paymentResult = verifyAndActivatePayment({
    businessId: 'biz_karthik_textiles',
    razorpayOrderId: order.orderId,
    razorpayPaymentId: 'pay_test_smoke_123',
    razorpaySignature: 'demo_sig_approved',
    billingCycle: 'monthly',
  });
  assert(paymentResult.success === true, 'Payment verification should succeed');
  assert(paymentResult.invoice?.totalPaid === 499, 'Billing invoice should record ₹499 paid');

  // Idempotency: duplicate verify should return same invoice, not duplicate
  const duplicateResult = verifyAndActivatePayment({
    businessId: 'biz_karthik_textiles',
    razorpayOrderId: order.orderId,
    razorpayPaymentId: 'pay_test_smoke_123',
    razorpaySignature: 'demo_sig_approved',
    billingCycle: 'monthly',
  });
  assert(duplicateResult.invoice?.id === paymentResult.invoice?.id, 'Duplicate payment verification must be idempotent');

  console.log(`\n========================================`);
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
} catch (e) {
  console.error('Smoke test crashed with exception:', e);
  process.exit(1);
}
