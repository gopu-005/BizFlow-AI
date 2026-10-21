import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/database';
import { requirePlatformAdmin } from '@/lib/auth/rbac';

export async function POST(req: NextRequest) {
  try {
    const { context, errorResponse } = requirePlatformAdmin(req);
    if (errorResponse) return errorResponse;

    const { user: adminUser } = context!;
    const body = await req.json();
    const { businessId, reason } = body;

    if (!businessId || typeof businessId !== 'string') {
      return NextResponse.json({ error: 'businessId is required.' }, { status: 400 });
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
      return NextResponse.json(
        { error: 'A specific reason for account suspension is required (minimum 5 characters).' },
        { status: 400 }
      );
    }

    const business = db.getBusiness(businessId);
    if (!business) {
      return NextResponse.json({ error: 'Business account not found.' }, { status: 404 });
    }

    const updated = db.suspendBusiness(businessId, reason.trim(), adminUser.id);

    return NextResponse.json({
      success: true,
      message: `Business "${business.name}" has been suspended.`,
      business: updated,
    });
  } catch (err: any) {
    console.error('Admin suspend business error:', err);
    return NextResponse.json({ error: err.message || 'Failed to suspend business account.' }, { status: 500 });
  }
}
