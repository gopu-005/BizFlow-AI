import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/database';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const businessId = searchParams.get('businessId') || 'biz_karthik_textiles';
  const filter = searchParams.get('filter') as 'today' | 'pending' | 'all' | null;

  const tasks = db.getFollowUps(businessId, filter || 'pending');
  return NextResponse.json({ tasks });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { businessId = 'biz_karthik_textiles', customerId, customerName, customerPhone, scheduledDate, notes } = body;

    if (!customerName || !scheduledDate) {
      return NextResponse.json({ error: 'Customer name and scheduled date are required' }, { status: 400 });
    }

    const task = db.createFollowUp(businessId, {
      businessId,
      customerId: customerId || 'cust_manual',
      customerName,
      customerPhone: customerPhone || '',
      scheduledDate,
      notes: notes || 'Follow-up task created via BizFlow AI',
      status: 'pending',
    });

    return NextResponse.json({ success: true, task });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create follow-up' }, { status: 500 });
  }
}
