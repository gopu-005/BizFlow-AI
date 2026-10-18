import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/database';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const businessId = searchParams.get('businessId') || 'biz_karthik_textiles';
  const query = searchParams.get('q');

  if (query) {
    const cust = db.findCustomer(businessId, query);
    return NextResponse.json({ customer: cust });
  }

  const customers = db.getCustomers(businessId);
  return NextResponse.json({ customers });
}
