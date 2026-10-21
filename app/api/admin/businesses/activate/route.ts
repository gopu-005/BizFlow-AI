import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/database';
import { requirePlatformAdmin } from '@/lib/auth/rbac';

export async function POST(req: NextRequest) {
  try {
    const { context, errorResponse } = requirePlatformAdmin(req);
    if (errorResponse) return errorResponse;

    const { user: adminUser } = context!;
    const body = await req.json();
    const { businessId } = body;

    if (!businessId || typeof businessId !== 'string') {
      return NextResponse.json({ error: 'businessId is required.' }, { status: 400 });
    }

    const business = db.getBusiness(businessId);
    if (!business) {
      return NextResponse.json({ error: 'Business account not found.' }, { status: 404 });
    }

    const updated = db.activateBusiness(businessId, adminUser.id);

    return NextResponse.json({
      success: true,
      message: `Business "${business.name}" has been reactivated successfully.`,
      business: updated,
    });
  } catch (err: any) {
    console.error('Admin activate business error:', err);
    return NextResponse.json({ error: err.message || 'Failed to activate business account.' }, { status: 500 });
  }
}
