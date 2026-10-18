import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/database';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const businessId = searchParams.get('businessId') || 'biz_karthik_textiles';
  const filter = searchParams.get('filter'); // 'low_stock' | 'expiring' | null

  if (filter === 'low_stock') {
    const lowStock = db.getLowStockProducts(businessId);
    return NextResponse.json({ products: lowStock, type: 'low_stock' });
  }

  if (filter === 'expiring') {
    const expiring = db.getExpiringProducts(businessId);
    return NextResponse.json({ products: expiring, type: 'expiring' });
  }

  const all = db.getProducts(businessId);
  return NextResponse.json({ products: all, type: 'all' });
}
