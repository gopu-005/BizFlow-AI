import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/database';
import { resolveTenantBusinessId } from '@/lib/auth/rbac';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const requestedBusinessId = searchParams.get('businessId');
  const { businessId, errorResponse } = resolveTenantBusinessId(req, requestedBusinessId);
  if (errorResponse) return errorResponse;

  const query = searchParams.get('q');

  if (query) {
    const cust = db.findCustomer(businessId, query);
    return NextResponse.json({ customer: cust });
  }

  const customers = db.getCustomers(businessId);
  return NextResponse.json({ customers });
}
