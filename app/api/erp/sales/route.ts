import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/database';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const businessId = searchParams.get('businessId') || 'biz_karthik_textiles';
  const period = (searchParams.get('period') as 'today' | 'week' | 'month') || 'today';

  const summary = db.getSalesSummary(businessId, period);
  return NextResponse.json(summary);
}
