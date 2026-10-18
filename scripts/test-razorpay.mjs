import crypto from 'crypto';
import { db } from '../lib/db/database.js';
import {
  createSubscriptionOrder,
  verifyAndActivatePayment,
  RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET,
} from '../lib/billing/razorpay.js';

console.log('💳 ==========================================');
console.log('💳 Razorpay Payment Gateway Integration Test');
console.log('💳 ==========================================\n');

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
  // Test 1: Configuration Verification
  assert(typeof RAZORPAY_KEY_ID === 'string' && RAZORPAY_KEY_ID.length > 0, `Razorpay Key ID configured: ${RAZORPAY_KEY_ID}`);
  assert(typeof RAZORPAY_KEY_SECRET === 'string' && RAZORPAY_KEY_SECRET.length > 0, 'Razorpay Key Secret is present');

  // Test 2: Monthly Order Creation & 18% GST Breakdown
  const monthlyOrder = createSubscriptionOrder({
    businessId: 'biz_karthik_textiles',
    billingCycle: 'monthly',
    customerName: 'Karthik Ramanathan',
    customerEmail: 'karthik@textiles.bizflow.in',
    customerPhone: '+91 98400 11223',
    customerGstin: '33AAAAA0000A1Z5',
  });

  assert(monthlyOrder.orderId && monthlyOrder.orderId.startsWith('order_'), `Monthly Order ID generated: ${monthlyOrder.orderId}`);
  assert(monthlyOrder.id === monthlyOrder.orderId, 'Order contains backward-compatible .id and .orderId');
  assert(monthlyOrder.amount === 29900, `Amount in paise should be 29900 (got ${monthlyOrder.amount})`);
  assert(monthlyOrder.totalAmount === 299, `Total amount should be ₹299 (got ${monthlyOrder.totalAmount})`);
  assert(monthlyOrder.currency === 'INR', 'Currency must be INR');
  assert(monthlyOrder.baseAmount + monthlyOrder.taxAmount === 299, `Base (₹${monthlyOrder.baseAmount}) + 18% GST (₹${monthlyOrder.taxAmount}) equals ₹299`);

  // Test 3: Annual Order Creation
  const annualOrder = createSubscriptionOrder({
    businessId: 'biz_murugan_bakery',
    billingCycle: 'annual',
    customerName: 'Murugan Velayudham',
    customerEmail: 'murugan@bakery.bizflow.in',
  });

  assert(annualOrder.amount === 299900, `Annual amount in paise should be 299900 (got ${annualOrder.amount})`);
  assert(annualOrder.totalAmount === 2999, `Annual total amount should be ₹2,999 (got ${annualOrder.totalAmount})`);
  assert(annualOrder.baseAmount + annualOrder.taxAmount === 2999, `Base (₹${annualOrder.baseAmount}) + 18% GST (₹${annualOrder.taxAmount}) equals ₹2999`);

  // Test 4: HMAC SHA256 Signature Verification
  const testOrderId = `order_test_${Date.now()}`;
  const testPaymentId = `pay_test_${Date.now()}`;
  const validSignature = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${testOrderId}|${testPaymentId}`)
    .digest('hex');

  const validVerification = verifyAndActivatePayment({
    businessId: 'biz_karthik_textiles',
    razorpayOrderId: testOrderId,
    razorpayPaymentId: testPaymentId,
    razorpaySignature: validSignature,
    billingCycle: 'monthly',
  });

  assert(validVerification.success === true, 'Payment verification with valid HMAC SHA256 signature succeeds');
  assert(validVerification.invoice !== undefined, `Billing invoice #${validVerification.invoice?.invoiceNumber} generated`);
  assert(validVerification.invoice?.totalPaid === 299, `Invoice reflects ₹299 payment`);

  // Test 5: Subscription status updated
  const sub = db.getSubscription('biz_karthik_textiles');
  assert(sub.status === 'active', `Subscription status is active`);
  assert(sub.billingCycle === 'monthly', `Subscription billing cycle is monthly`);

  // Test 6: Idempotency Verification (Prevent Double Activation / Charging)
  const duplicateVerification = verifyAndActivatePayment({
    businessId: 'biz_karthik_textiles',
    razorpayOrderId: testOrderId,
    razorpayPaymentId: testPaymentId,
    razorpaySignature: validSignature,
    billingCycle: 'monthly',
  });

  assert(duplicateVerification.success === true, 'Duplicate payment verification returns success');
  assert(
    duplicateVerification.invoice?.id === validVerification.invoice?.id,
    'Duplicate verification returns existing invoice without creating duplicate'
  );

  // Test 7: Sandbox demo signature test
  const demoOrderId = `order_demo_${Date.now()}`;
  const demoPaymentId = `pay_demo_${Date.now()}`;
  const demoVerification = verifyAndActivatePayment({
    businessId: 'biz_murugan_bakery',
    razorpayOrderId: demoOrderId,
    razorpayPaymentId: demoPaymentId,
    razorpaySignature: 'demo_sig_approved',
    billingCycle: 'annual',
  });

  assert(demoVerification.success === true, 'Demo/sandbox mode signature verification succeeds');
  assert(demoVerification.invoice?.totalPaid === 2999, 'Annual demo invoice generated for ₹2,999');

  console.log(`\n========================================`);
  console.log(`Razorpay Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
} catch (e) {
  console.error('❌ Razorpay Test Suite crashed:', e);
  process.exit(1);
}
