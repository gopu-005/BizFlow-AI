import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/database';
import { resolveTenantBusinessId } from '@/lib/auth/rbac';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const requestedBusinessId = searchParams.get('businessId');
  const { businessId, errorResponse } = resolveTenantBusinessId(req, requestedBusinessId);
  if (errorResponse) return errorResponse;

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { businessId: requestedBusinessId, productId, stock } = body;
    const { businessId, errorResponse } = resolveTenantBusinessId(req, requestedBusinessId);
    if (errorResponse) return errorResponse;

    if (!businessId || !productId || stock === undefined) {
      return NextResponse.json({ error: 'Missing businessId, productId, or stock' }, { status: 400 });
    }

    const updated = db.updateProductStock(businessId, productId, Number(stock));
    if (!updated) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, product: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update stock' }, { status: 500 });
  }
}
