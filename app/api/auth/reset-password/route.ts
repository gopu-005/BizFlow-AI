import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/database';
import { hashPassword, validatePasswordStrength } from '@/lib/auth/password';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, password, confirmPassword } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Password reset token is missing.' }, { status: 400 });
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'New password is required.' }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'New password and confirmation password do not match.' }, { status: 400 });
    }

    // 1. Validate password strength
    const validation = validatePasswordStrength(password);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error || 'Password does not meet complexity requirements.' },
        { status: 400 }
      );
    }

    // 2. Validate token from database
    const resetRecord = db.getPasswordResetToken(token);
    if (!resetRecord) {
      return NextResponse.json(
        { error: 'This password reset link is invalid, expired, or has already been used.' },
        { status: 400 }
      );
    }

    const user = db.getUserById(resetRecord.userId);
    if (!user) {
      return NextResponse.json({ error: 'User associated with this reset link no longer exists.' }, { status: 404 });
    }

    // 3. Hash new password
    const newHash = await hashPassword(password);

    // 4. Update user record
    db.updateUser(user.id, { passwordHash: newHash });

    // 5. Mark token as used (single-use guarantee)
    db.markPasswordResetTokenUsed(token);

    // 6. Security requirement: Invalidate ALL active sessions for this user
    db.deleteUserSessions(user.id);

    return NextResponse.json({
      success: true,
      message: 'Your password has been reset successfully. Please sign in with your new password.',
    });
  } catch (err: any) {
    console.error('Reset password error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while resetting password.' },
      { status: 500 }
    );
  }
}
