import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/database';
import { requireAuth } from '@/lib/auth/rbac';

export async function GET(req: NextRequest) {
  try {
    const { context, errorResponse } = requireAuth(req);
    if (errorResponse) return errorResponse;

    const { user } = context!;
    const { passwordHash: _, ...sanitizedUser } = user;

    let business = null;
    let quota = null;
    let accessibleBusinesses: any[] = [];

    if (user.role === 'platform_admin') {
      accessibleBusinesses = db.getBusinesses();
      if (user.businessId) {
        business = db.getBusiness(user.businessId) || accessibleBusinesses[0] || null;
        quota = db.getQuota(user.businessId);
      } else {
        business = accessibleBusinesses[0] || null;
      }
    } else if (user.businessId) {
      business = db.getBusiness(user.businessId) || null;
      quota = db.getQuota(user.businessId);
      if (business) {
        accessibleBusinesses = [business];
      }
    }

    return NextResponse.json({
      success: true,
      user: sanitizedUser,
      business,
      quota,
      accessibleBusinesses,
    });
  } catch (err: any) {
    console.error('Auth /me error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching user profile.' },
      { status: 500 }
    );
  }
}
