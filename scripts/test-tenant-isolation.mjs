/**
 * BizFlow AI - Multi-Tenant Privacy & Isolation Automated Test Suite
 *
 * Verifies that:
 * 1. New account registration creates an isolated tenant
 * 2. An owner can NEVER see another owner's business, sales, invoices, customers, udhaar, closings, or quota
 * 3. Cross-tenant access attempts return HTTP 403 Forbidden
 * 4. Two distinct owners cannot access each other's workspaces
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

async function runTenantIsolationTests() {
  console.log('================================================================');
  console.log('🔒 BIZFLOW AI - MULTI-TENANT ISOLATION & PRIVACY TEST SUITE');
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

  const timestamp = Date.now();

  // Tenant A: Anand Medicals
  const userA = {
    name: 'Anand Kumar',
    businessName: 'Anand Medicals & Healthcare',
    email: `anand_${timestamp}@medicals.in`,
    password: 'SecurePassword@123!',
  };

  // Tenant B: Devi Sarees
  const userB = {
    name: 'Devi Priya',
    businessName: 'Devi Handloom Sarees',
    email: `devi_${timestamp}@sarees.in`,
    password: 'SecurePassword@123!',
  };

  let sessionA = '';
  let businessIdA = '';
  let sessionB = '';
  let businessIdB = '';

  // 1. Register Owner A
  await test('Register Owner A (Anand Medicals) and create private tenant', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: userA.name,
        businessName: userA.businessName,
        email: userA.email,
        phone: '+91 98401 99881',
        password: userA.password,
        confirmPassword: userA.password,
        agreeToTerms: true,
      }),
    });
    if (!res.ok) throw new Error(`Registration failed with status ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Registration unsuccessful');
    businessIdA = data.business.id;
    if (!businessIdA || businessIdA === 'biz_karthik_textiles') {
      throw new Error(`Owner A assigned demo business ID instead of unique tenant: ${businessIdA}`);
    }
    sessionA = extractCookie(res, 'bizflow_session');
    if (!sessionA) throw new Error('Missing bizflow_session cookie');
  });

  // 2. Owner A Session verification
  await test('/api/auth/me returns strictly Owner A business, not Karthik or Murugan', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: `bizflow_session=${sessionA}` },
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error('Failed to retrieve profile');
    if (data.business.name !== userA.businessName) {
      throw new Error(`Expected business name ${userA.businessName}, got ${data.business.name}`);
    }
    if (data.accessibleBusinesses.length !== 1) {
      throw new Error(`Expected strictly 1 accessible business for non-admin, got ${data.accessibleBusinesses.length}`);
    }
    if (data.accessibleBusinesses[0].id !== businessIdA) {
      throw new Error(`accessibleBusinesses leaked another business: ${data.accessibleBusinesses[0].id}`);
    }
  });

  // 3. Invoices isolation: Owner A has 0 invoices (not Karthik's 3 invoices)
  await test('Owner A sees 0 invoices for their new business', async () => {
    const res = await fetch(`${BASE_URL}/api/erp/invoices?businessId=${businessIdA}`, {
      headers: { Cookie: `bizflow_session=${sessionA}` },
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (data.invoices.length !== 0) {
      throw new Error(`Owner A sees ${data.invoices.length} invoices from another tenant!`);
    }
  });

  // 4. Invoices protection: Owner A passing Karthik's ID is REJECTED with 403
  await test('Reject Owner A attempting to view Karthik Textiles invoices (?businessId=biz_karthik_textiles)', async () => {
    const res = await fetch(`${BASE_URL}/api/erp/invoices?businessId=biz_karthik_textiles`, {
      headers: { Cookie: `bizflow_session=${sessionA}` },
    });
    if (res.status !== 403) {
      throw new Error(`Expected HTTP 403 Forbidden, but received status ${res.status}`);
    }
    const data = await res.json();
    if (!data.error || !data.error.includes('Tenant isolation violation')) {
      throw new Error(`Unexpected error message: ${JSON.stringify(data)}`);
    }
  });

  // 5. Sales protection: Owner A passing Murugan's ID is REJECTED with 403
  await test('Reject Owner A attempting to view Murugan Bakery sales (?businessId=biz_murugan_bakery)', async () => {
    const res = await fetch(`${BASE_URL}/api/erp/sales?businessId=biz_murugan_bakery`, {
      headers: { Cookie: `bizflow_session=${sessionA}` },
    });
    if (res.status !== 403) {
      throw new Error(`Expected HTTP 403 Forbidden, but received status ${res.status}`);
    }
  });

  // 6. Owner A Sales: returns ₹0 for new tenant
  await test('Owner A sales summary returns ₹0 (not Karthik Textiles sales)', async () => {
    const res = await fetch(`${BASE_URL}/api/erp/sales?businessId=${businessIdA}&period=today`, {
      headers: { Cookie: `bizflow_session=${sessionA}` },
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    const totalSales = data.totalSales !== undefined ? data.totalSales : data.summary?.totalSales;
    if (totalSales !== 0) {
      throw new Error(`Owner A saw ₹${totalSales} in sales belonging to another business!`);
    }
  });

  // 7. Udhaar isolation & protection
  await test('Reject Owner A attempting to view Karthik udhaar credit records', async () => {
    const res = await fetch(`${BASE_URL}/api/udhaar?businessId=biz_karthik_textiles`, {
      headers: { Cookie: `bizflow_session=${sessionA}` },
    });
    if (res.status !== 403) {
      throw new Error(`Expected HTTP 403 Forbidden, but received status ${res.status}`);
    }
  });

  // 8. Closing protection
  await test('Reject Owner A attempting to view Karthik daily closing records', async () => {
    const res = await fetch(`${BASE_URL}/api/closing?businessId=biz_karthik_textiles`, {
      headers: { Cookie: `bizflow_session=${sessionA}` },
    });
    if (res.status !== 403) {
      throw new Error(`Expected HTTP 403 Forbidden, but received status ${res.status}`);
    }
  });

  // 9. Quota protection
  await test('Reject Owner A attempting to inspect Karthik AI quota', async () => {
    const res = await fetch(`${BASE_URL}/api/agent/quota?businessId=biz_karthik_textiles`, {
      headers: { Cookie: `bizflow_session=${sessionA}` },
    });
    if (res.status !== 403) {
      throw new Error(`Expected HTTP 403 Forbidden, but received status ${res.status}`);
    }
  });

  // 10. Register Owner B (Devi Sarees)
  await test('Register Owner B (Devi Sarees) and create separate tenant', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: userB.name,
        businessName: userB.businessName,
        email: userB.email,
        phone: '+91 94441 22334',
        password: userB.password,
        confirmPassword: userB.password,
        agreeToTerms: true,
      }),
    });
    if (!res.ok) throw new Error(`Registration failed with status ${res.status}`);
    const data = await res.json();
    businessIdB = data.business.id;
    if (businessIdB === businessIdA) {
      throw new Error('Tenant collision: Owner B assigned same businessId as Owner A!');
    }
    sessionB = extractCookie(res, 'bizflow_session');
  });

  // 11. Cross-Owner Protection: Owner B CANNOT access Owner A's business records
  await test('Reject Owner B accessing Owner A invoices (Cross-tenant breach prevented)', async () => {
    const res = await fetch(`${BASE_URL}/api/erp/invoices?businessId=${businessIdA}`, {
      headers: { Cookie: `bizflow_session=${sessionB}` },
    });
    if (res.status !== 403) {
      throw new Error(`Expected HTTP 403 Forbidden, but received status ${res.status}`);
    }
  });

  // 12. Cross-Owner Protection: Owner A CANNOT access Owner B's business records
  await test('Reject Owner A accessing Owner B sales (Cross-tenant breach prevented)', async () => {
    const res = await fetch(`${BASE_URL}/api/erp/sales?businessId=${businessIdB}`, {
      headers: { Cookie: `bizflow_session=${sessionA}` },
    });
    if (res.status !== 403) {
      throw new Error(`Expected HTTP 403 Forbidden, but received status ${res.status}`);
    }
  });

  // 13. Cross-Owner Team Invitation Protection
  await test('Reject Owner A accessing Owner B team members', async () => {
    const res = await fetch(`${BASE_URL}/api/business/team?businessId=${businessIdB}`, {
      headers: { Cookie: `bizflow_session=${sessionA}` },
    });
    if (res.status !== 403) {
      throw new Error(`Expected HTTP 403 Forbidden, but received status ${res.status}`);
    }
  });

  console.log('\n================================================================');
  console.log(`🏁 TENANT ISOLATION TESTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTenantIsolationTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
