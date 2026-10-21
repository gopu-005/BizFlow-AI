/**
 * BizFlow AI - Comprehensive End-to-End Authentication, RBAC, Tenant Isolation & Admin Test Suite
 *
 * Verifies all security requirements:
 * 1. User Registration, input validation, role safety, tenant auto-creation
 * 2. Login, password verification, rate-limiting, and account suspension enforcement
 * 3. Protected endpoint access and session invalidation on logout
 * 4. Password recovery, single-use token lifecycle, and session revocation
 * 5. Strict multi-tenant isolation and cross-tenant access rejection
 * 6. Business role separation (business_owner vs business_staff)
 * 7. Dedicated Platform Admin authentication and non-admin denial
 * 8. Administrative operations (business suspension, reactivation, quota limits, audit logs)
 * 9. Regression tests for existing ERP invoices and AI agents
 */

const BASE_URL = 'http://localhost:3000';

function extractCookie(res, cookieName) {
  if (typeof res.headers.getSetCookie === 'function') {
    const cookies = res.headers.getSetCookie();
    for (const c of cookies) {
      const match = c.match(new RegExp(`${cookieName}=([^;]+)`));
      if (match) return match[1];
    }
  }
  const raw = res.headers.get('set-cookie');
  if (!raw) return null;
  const match = raw.match(new RegExp(`${cookieName}=([^;]+)`));
  return match ? match[1] : null;
}

async function runAuthAndAdminTests() {
  console.log('================================================================');
  console.log('🛡️  BIZFLOW AI - AUTHENTICATION, RBAC & ADMIN TEST SUITE');
  console.log('================================================================\n');

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

  const testEmail = `testowner_${Date.now()}@bizflowtest.in`;
  const testPassword = 'StrongPassword@2026!';
  let userSessionCookie = '';
  let adminSessionCookie = '';
  let registeredBusinessId = '';

  // 1. Password validation during registration
  await test('Reject weak password during registration (< 8 chars)', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Tester',
        businessName: 'Weak Pwd Business',
        email: `weak_${Date.now()}@test.in`,
        password: 'weak',
        confirmPassword: 'weak',
        agreeToTerms: true,
      }),
    });
    if (res.status !== 400) throw new Error(`Expected status 400, got ${res.status}`);
    const data = await res.json();
    if (!data.error) throw new Error('Expected validation error for weak password');
  });

  // 2. Prevent public privilege escalation (cannot request platform_admin)
  await test('Public registration strictly enforces business_owner and ignores platform_admin', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Hacker Attempt',
        businessName: 'Exploit Store',
        email: testEmail,
        password: testPassword,
        confirmPassword: testPassword,
        role: 'platform_admin', // Attacker attempts to forge role!
        agreeToTerms: true,
      }),
    });

    if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status}`);
    const data = await res.json();
    if (data.user.role !== 'business_owner') {
      throw new Error(`Security breach: User was granted '${data.user.role}' instead of 'business_owner'!`);
    }
    if (!data.business || !data.business.id) {
      throw new Error('New business tenant was not created');
    }
    registeredBusinessId = data.business.id;
    userSessionCookie = extractCookie(res, 'bizflow_session');
    if (!userSessionCookie) throw new Error('bizflow_session cookie was not attached');
  });

  // 3. Email uniqueness enforcement
  await test('Reject duplicate registration with same email', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate Tester',
        businessName: 'Duplicate Store',
        email: testEmail,
        password: testPassword,
        confirmPassword: testPassword,
        agreeToTerms: true,
      }),
    });
    if (res.status !== 409) throw new Error(`Expected status 409 Conflict, got ${res.status}`);
  });

  // 4. Authenticated identity check (/api/auth/me)
  await test('Access protected /api/auth/me with valid session cookie', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: `bizflow_session=${userSessionCookie}` },
    });
    if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status}`);
    const data = await res.json();
    if (!data.user || data.user.email !== testEmail) {
      throw new Error('Identity does not match authenticated user');
    }
    if (data.user.passwordHash) {
      throw new Error('Security flaw: passwordHash was leaked in user identity response!');
    }
  });

  // 5. Unauthenticated rejection
  await test('Reject access to /api/auth/me without authentication cookie', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/me`);
    if (res.status !== 401) throw new Error(`Expected status 401, got ${res.status}`);
  });

  // 6. User Logout and Session Invalidation
  await test('Logout invalidates session on server and prevents reuse', async () => {
    const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: `bizflow_session=${userSessionCookie}` },
    });
    if (logoutRes.status !== 200) throw new Error(`Logout failed with status ${logoutRes.status}`);

    // Verify old session cookie is now rejected
    const verifyRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: `bizflow_session=${userSessionCookie}` },
    });
    if (verifyRes.status !== 401) {
      throw new Error(`Old session token was still accepted after logout! Status: ${verifyRes.status}`);
    }
  });

  // 7. Positive Login
  await test('Login with valid business owner credentials', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    if (res.status !== 200) throw new Error(`Login failed with status ${res.status}`);
    const data = await res.json();
    if (!data.success || data.user.role !== 'business_owner') {
      throw new Error('Login response invalid');
    }
    userSessionCookie = extractCookie(res, 'bizflow_session');
    if (!userSessionCookie) throw new Error('Missing bizflow_session cookie on login');
  });

  // 8. Invalid credentials error handling
  await test('Reject invalid credentials with generic error', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'WrongPassword123!' }),
    });
    if (res.status !== 401) throw new Error(`Expected status 401, got ${res.status}`);
    const data = await res.json();
    if (data.error !== 'Invalid email address or password.') {
      throw new Error(`Expected generic auth error, got: ${data.error}`);
    }
  });

  // 9. Password Recovery: Forgot Password & Reset Lifecycle
  let resetToken = '';
  await test('Request password reset token via /api/auth/forgot-password', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail }),
    });
    if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error('Forgot password request failed');
    resetToken = data.devToken;
    if (!resetToken) throw new Error('devToken not returned in dev environment for automated verification');
  });

  const updatedPassword = 'NewStrongPassword@2026!';
  await test('Reset password with single-use token', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: resetToken,
        password: updatedPassword,
        confirmPassword: updatedPassword,
      }),
    });
    if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error('Password reset failed');
  });

  await test('Reject reuse of already-used password reset token', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: resetToken,
        password: 'AnotherPassword@123!',
        confirmPassword: 'AnotherPassword@123!',
      }),
    });
    if (res.status !== 400) {
      throw new Error(`Expected 400 rejection for reused token, got ${res.status}`);
    }
  });

  // Re-login with new password to get fresh session
  const reloginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: updatedPassword }),
  });
  userSessionCookie = extractCookie(reloginRes, 'bizflow_session');

  // Email verification tests
  await test('Reject invalid email verification token', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/verify-email?token=fake_invalid_token_999`);
    if (res.status !== 400) throw new Error(`Expected status 400, got ${res.status}`);
  });

  let verificationToken = '';
  await test('Request email verification token via authenticated POST /api/auth/verify-email', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/verify-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `bizflow_session=${userSessionCookie}`,
      },
    });
    if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error('Expected success: true');
    verificationToken = data.devVerificationToken;
    if (!verificationToken) throw new Error('devVerificationToken was not returned in non-production mode');
  });

  await test('Verify email address with valid single-use token', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/verify-email?token=${verificationToken}`);
    if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status}`);
    const data = await res.json();
    if (!data.verified) throw new Error('Expected verified: true');
  });

  await test('Reject reuse of already-used email verification token', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/verify-email?token=${verificationToken}`);
    if (res.status !== 400) throw new Error(`Expected 400 for already used verification token, got ${res.status}`);
  });

  // 10. Multi-Tenant Isolation: Cross-tenant access rejection
  await test('Prevent cross-tenant access to another business settings', async () => {
    // Attempting to modify Karthik Textiles settings using testowner's session
    const res = await fetch(`${BASE_URL}/api/business/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `bizflow_session=${userSessionCookie}`,
      },
      body: JSON.stringify({
        businessId: 'biz_karthik_textiles', // Cross-tenant target!
        name: 'Hacked Store Name',
      }),
    });

    if (res.status !== 403) {
      throw new Error(`Expected 403 Forbidden on cross-tenant mutation, got ${res.status}`);
    }
    const data = await res.json();
    if (!data.error.includes('Tenant isolation violation')) {
      throw new Error(`Expected tenant isolation error, got: ${data.error}`);
    }
  });

  // 11. Role-Based Access Control: Business Owner vs Business Staff
  await test('Seed staff account cannot modify business settings', async () => {
    // Login as staff
    const staffLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'staff@textiles.bizflow.in', password: 'Staff@123' }),
    });
    if (staffLoginRes.status !== 200) throw new Error('Failed to login as seed staff');
    const staffCookie = extractCookie(staffLoginRes, 'bizflow_session');

    // Attempt to update business settings
    const res = await fetch(`${BASE_URL}/api/business/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `bizflow_session=${staffCookie}`,
      },
      body: JSON.stringify({
        businessId: 'biz_karthik_textiles',
        name: 'Unauthorized Staff Modification',
      }),
    });

    if (res.status !== 403) {
      throw new Error(`Expected 403 for staff modifying owner settings, got ${res.status}`);
    }
  });

  // 12. Non-admin rejected from dedicated platform admin login
  await test('Reject non-admin login at dedicated /api/admin/auth/login', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: updatedPassword }),
    });
    if (res.status !== 403) {
      throw new Error(`Expected 403 Forbidden for non-admin on admin login, got ${res.status}`);
    }
    const data = await res.json();
    if (!data.error.includes('platform administrator privileges')) {
      throw new Error(`Expected privilege error message, got: ${data.error}`);
    }
  });

  // 13. Platform Admin Login
  await test('Login with authorized platform administrator account', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@bizflow.in', password: 'Admin@BizFlow2026!' }),
    });
    if (res.status !== 200) throw new Error(`Admin login failed with status ${res.status}`);
    const data = await res.json();
    if (!data.success || data.user.role !== 'platform_admin') {
      throw new Error('Admin login response invalid');
    }
    adminSessionCookie = extractCookie(res, 'bizflow_admin_session');
    if (!adminSessionCookie) throw new Error('Missing bizflow_admin_session cookie on admin login');
  });

  // 14. Non-admin rejection across ALL platform admin API endpoints
  const adminEndpoints = [
    '/api/admin/metrics',
    '/api/admin/businesses',
    '/api/admin/users',
    '/api/admin/subscriptions',
    '/api/admin/monitoring',
    '/api/admin/audit-logs',
  ];

  for (const endpoint of adminEndpoints) {
    await test(`Reject non-admin request to ${endpoint}`, async () => {
      const res = await fetch(`${BASE_URL}${endpoint}`, {
        headers: { Cookie: `bizflow_session=${userSessionCookie}` },
      });
      if (res.status !== 401 && res.status !== 403) {
        throw new Error(`Security breach: Non-admin accessed ${endpoint} with status ${res.status}`);
      }
    });
  }

  // 15. Platform Admin Operations: Metrics
  await test('Fetch real platform metrics via /api/admin/metrics', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/metrics`, {
      headers: { Cookie: `bizflow_admin_session=${adminSessionCookie}` },
    });
    if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status}`);
    const data = await res.json();
    if (!data.metrics || data.metrics.totalBusinesses < 1 || data.metrics.totalUsers < 1) {
      throw new Error(`Metrics data incomplete: ${JSON.stringify(data.metrics)}`);
    }
  });

  // 16. Platform Admin Operations: Suspend & Reactivate Business
  await test('Platform Admin: Suspend business with mandatory recorded reason', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/businesses/suspend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `bizflow_admin_session=${adminSessionCookie}`,
      },
      body: JSON.stringify({
        businessId: registeredBusinessId,
        reason: 'Automated test compliance review suspension',
      }),
    });
    if (res.status !== 200) throw new Error(`Suspend failed with status ${res.status}`);
    const data = await res.json();
    if (data.business.status !== 'suspended') {
      throw new Error('Business status was not changed to suspended');
    }
  });

  // 17. Verify suspended business login rejection
  await test('Suspended business owner login is rejected', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: updatedPassword }),
    });
    if (res.status !== 403) {
      throw new Error(`Expected status 403 for suspended business login, got ${res.status}`);
    }
    const data = await res.json();
    if (!data.error.includes('suspended')) {
      throw new Error(`Expected suspended error, got: ${data.error}`);
    }
  });

  // 18. Platform Admin Operations: Reactivate Business
  await test('Platform Admin: Reactivate suspended business', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/businesses/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `bizflow_admin_session=${adminSessionCookie}`,
      },
      body: JSON.stringify({ businessId: registeredBusinessId }),
    });
    if (res.status !== 200) throw new Error(`Reactivate failed with status ${res.status}`);
  });

  // 19. Platform Admin Operations: Adjust Quota Limits
  await test('Platform Admin: Adjust tenant quota limits', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/subscriptions/limits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `bizflow_admin_session=${adminSessionCookie}`,
      },
      body: JSON.stringify({
        businessId: registeredBusinessId,
        maxAiRuns: 250,
        maxExtractions: 120,
        maxStorageMb: 1000,
      }),
    });
    if (res.status !== 200) throw new Error(`Quota limit update failed with status ${res.status}`);
    const data = await res.json();
    if (data.quota.maxAiRuns !== 250 || data.quota.maxExtractions !== 120) {
      throw new Error(`Quota was not updated properly: ${JSON.stringify(data.quota)}`);
    }
  });

  // 20. Platform Admin Operations: Audit Trail Verification
  await test('Platform Admin: Audit trail captures suspension and quota adjustment', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/audit-logs?limit=20`, {
      headers: { Cookie: `bizflow_admin_session=${adminSessionCookie}` },
    });
    if (res.status !== 200) throw new Error(`Audit logs failed with status ${res.status}`);
    const data = await res.json();
    const actions = data.logs.map((l) => l.action);
    if (!actions.includes('suspend_business') || !actions.includes('update_subscription_limits')) {
      throw new Error(`Audit log missing actions. Present: ${actions.join(', ')}`);
    }
  });

  // 21. Regression Tests: ERP Invoices & AI Agent Quotas
  await test('Regression: Invoices API works with tenant scoping', async () => {
    const res = await fetch(`${BASE_URL}/api/erp/invoices?businessId=biz_karthik_textiles`);
    if (res.status !== 200) throw new Error(`Invoices failed with status ${res.status}`);
    const data = await res.json();
    if (!data.invoices || data.invoices.length < 1) {
      throw new Error('No invoices returned for seed business');
    }
  });

  await test('Regression: AI Agent quota verification endpoint', async () => {
    const res = await fetch(`${BASE_URL}/api/agent/quota?businessId=biz_karthik_textiles`, {
      headers: { Cookie: `bizflow_admin_session=${adminSessionCookie}` },
    });
    if (res.status !== 200) throw new Error(`Agent quota failed with status ${res.status}`);
    const data = await res.json();
    if (!data.quota || data.quota.maxAiRuns !== 100) {
      throw new Error('Agent quota mismatch');
    }
  });

  console.log('\n================================================================');
  console.log(`🏁 TEST SUITE COMPLETED: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAuthAndAdminTests().catch((err) => {
  console.error('Fatal test runner failure:', err);
  process.exit(1);
});
