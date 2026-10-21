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

    if (user.businessId) {
      business = db.getBusiness(user.businessId) || null;
      quota = db.getQuota(user.businessId);
    }

    return NextResponse.json({
      success: true,
      user: sanitizedUser,
      business,
      quota,
    });
  } catch (err: any) {
    console.error('Auth /me error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching user profile.' },
      { status: 500 }
    );
  }
}
