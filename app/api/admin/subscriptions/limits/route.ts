import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/database';
import { requirePlatformAdmin } from '@/lib/auth/rbac';

export async function POST(req: NextRequest) {
  try {
    const { context, errorResponse } = requirePlatformAdmin(req);
    if (errorResponse) return errorResponse;

    const { user: adminUser } = context!;
    const body = await req.json();
    const { businessId, maxAiRuns, maxExtractions, maxStorageMb } = body;

    if (!businessId || typeof businessId !== 'string') {
      return NextResponse.json({ error: 'businessId is required.' }, { status: 400 });
    }

    const business = db.getBusiness(businessId);
    if (!business) {
      return NextResponse.json({ error: 'Business account not found.' }, { status: 404 });
    }

    const parsedAiRuns = Number(maxAiRuns);
    const parsedExtractions = Number(maxExtractions);
    const parsedStorage = Number(maxStorageMb);

    if (isNaN(parsedAiRuns) || parsedAiRuns < 1 || isNaN(parsedExtractions) || parsedExtractions < 1) {
      return NextResponse.json(
        { error: 'Quota limits must be positive integers.' },
        { status: 400 }
      );
    }

    const updatedQuota = db.updateQuota(businessId, {
      maxAiRuns: parsedAiRuns,
      maxExtractions: parsedExtractions,
      maxStorageMb: !isNaN(parsedStorage) && parsedStorage > 0 ? parsedStorage : undefined,
    });

    db.createAdminAuditLog({
      adminUserId: adminUser.id,
      adminEmail: adminUser.email,
      action: 'update_subscription_limits',
      targetEntity: 'subscription',
      targetId: businessId,
      details: {
        businessName: business.name,
        maxAiRuns: parsedAiRuns,
        maxExtractions: parsedExtractions,
        maxStorageMb: updatedQuota.maxStorageMb,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Quota limits for "${business.name}" updated successfully.`,
      quota: updatedQuota,
    });
  } catch (err: any) {
    console.error('Admin quota update error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update subscription limits.' }, { status: 500 });
  }
}
