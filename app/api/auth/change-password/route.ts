import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/database';
import { requireAuth } from '@/lib/auth/rbac';
import { verifyPassword, hashPassword, validatePasswordStrength } from '@/lib/auth/password';

export async function POST(req: NextRequest) {
  try {
    const { context, errorResponse } = requireAuth(req);
    if (errorResponse) return errorResponse;

    const { user } = context!;
    const body = await req.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current password and new password are required.' }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: 'New password and confirmation password do not match.' }, { status: 400 });
    }

    // Verify current password
    const isCurrentValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      return NextResponse.json({ error: 'Incorrect current password.' }, { status: 400 });
    }

    // Validate new password strength
    const validation = validatePasswordStrength(newPassword);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error || 'Password does not meet requirements.' }, { status: 400 });
    }

    // Hash new password and update user
    const newHash = await hashPassword(newPassword);
    db.updateUser(user.id, { passwordHash: newHash });

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (err: any) {
    console.error('Change password error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while changing password.' },
      { status: 500 }
    );
  }
}
