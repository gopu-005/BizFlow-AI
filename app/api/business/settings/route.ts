import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/database';
import { requireBusinessAccess } from '@/lib/auth/rbac';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedBizId = searchParams.get('businessId') || undefined;

    const { context, errorResponse } = requireBusinessAccess(req, requestedBizId);
    if (errorResponse) return errorResponse;

    const { businessId } = context!;
    const business = db.getBusiness(businessId!);
    if (!business) {
      return NextResponse.json({ error: 'Business not found.' }, { status: 404 });
    }

    const quota = db.getQuota(businessId!);

    return NextResponse.json({
      success: true,
      business,
      quota,
    });
  } catch (err: any) {
    console.error('Settings GET error:', err);
    return NextResponse.json({ error: 'Failed to retrieve business settings.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { businessId: reqBizId, name, legalName, gstin, phone, email, address, currency, timeZone, invoicePrefix } = body;

    // RBAC: Only business_owner or platform_admin can change business settings
    const { context, errorResponse } = requireBusinessAccess(req, reqBizId, ['business_owner', 'platform_admin']);
    if (errorResponse) return errorResponse;

    const targetBizId = context!.businessId!;
    const existing = db.getBusiness(targetBizId);
    if (!existing) {
      return NextResponse.json({ error: 'Business not found.' }, { status: 404 });
    }

    const updates: Record<string, any> = {};
    if (name) updates.name = String(name).trim();
    if (legalName) updates.legalName = String(legalName).trim();
    if (gstin !== undefined) updates.gstin = String(gstin).trim();
    if (phone) updates.phone = String(phone).trim();
    if (email) updates.email = String(email).trim();
    if (address) updates.address = String(address).trim();
    if (currency) updates.currency = String(currency).trim();

    const updated = db.updateBusiness(targetBizId, updates);

    return NextResponse.json({
      success: true,
      message: 'Business settings updated successfully.',
      business: updated,
    });
  } catch (err: any) {
    console.error('Settings PUT error:', err);
    return NextResponse.json({ error: 'Failed to update business settings.' }, { status: 500 });
  }
}
