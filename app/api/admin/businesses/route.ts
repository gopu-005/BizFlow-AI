import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/database';
import { requirePlatformAdmin } from '@/lib/auth/rbac';

export async function GET(req: NextRequest) {
  try {
    const { errorResponse } = requirePlatformAdmin(req);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.toLowerCase() || '';
    const statusFilter = searchParams.get('status') || '';

    let businesses = db.getBusinesses();

    if (statusFilter) {
      businesses = businesses.filter((b) => (b.status || 'active') === statusFilter);
    }

    if (search) {
      businesses = businesses.filter(
        (b) =>
          b.name.toLowerCase().includes(search) ||
          (b.legalName && b.legalName.toLowerCase().includes(search)) ||
          b.email.toLowerCase().includes(search) ||
          (b.gstin && b.gstin.toLowerCase().includes(search)) ||
          (b.gstNumber && b.gstNumber.toLowerCase().includes(search))
      );
    }

    // Enhance each business with owner info, quota usage, and subscription
    const enhanced = businesses.map((b) => {
      const owner = db.getUsers({ businessId: b.id, role: 'business_owner' })[0];
      const quota = db.getQuota(b.id);
      const subscription = db.getSubscription(b.id);

      return {
        ...b,
        status: b.status || 'active',
        ownerName: owner?.name || 'Owner Unassigned',
        ownerEmail: owner?.email || b.email,
        subscriptionStatus: subscription?.status || 'active',
        quota,
      };
    });

    return NextResponse.json({
      success: true,
      businesses: enhanced,
    });
  } catch (err: any) {
    console.error('Admin businesses GET error:', err);
    return NextResponse.json({ error: 'Failed to retrieve businesses.' }, { status: 500 });
  }
}
