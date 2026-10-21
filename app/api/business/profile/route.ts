import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/database';
import { requireAuth } from '@/lib/auth/rbac';

export async function GET(req: NextRequest) {
  try {
    const { context, errorResponse } = requireAuth(req);
    if (errorResponse) return errorResponse;

    const { user } = context!;
    const { passwordHash: _, ...sanitizedUser } = user;
    const business = user.businessId ? db.getBusiness(user.businessId) : null;

    return NextResponse.json({
      success: true,
      user: sanitizedUser,
      business,
    });
  } catch (err: any) {
    console.error('Profile GET error:', err);
    return NextResponse.json({ error: 'Failed to retrieve profile.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { context, errorResponse } = requireAuth(req);
    if (errorResponse) return errorResponse;

    const { user } = context!;
    const body = await req.json();
    const { name, phone } = body;

    const updates: Record<string, any> = {};
    if (name && typeof name === 'string' && name.trim().length >= 2) {
      updates.name = name.trim();
    }
    if (phone !== undefined) {
      updates.phone = String(phone).trim();
    }

    const updatedUser = db.updateUser(user.id, updates);
    const { passwordHash: _, ...sanitizedUser } = updatedUser;

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully.',
      user: sanitizedUser,
    });
  } catch (err: any) {
    console.error('Profile PUT error:', err);
    return NextResponse.json({ error: 'Failed to update profile.' }, { status: 500 });
  }
}
