import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/database';
import { verifyPassword, normalizeEmail, isValidEmail } from '@/lib/auth/password';
import {
  createSession,
  attachSessionCookie,
  checkRateLimit,
  recordFailedAttempt,
  resetFailedAttempts,
} from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
    const rateCheck = checkRateLimit(`admin_login_${ip}`, 5, 15);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Too many administrative login attempts. Please try again after ${rateCheck.retryAfterSeconds} seconds.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { email, password } = body;

    if (!email || !isValidEmail(email) || !password) {
      return NextResponse.json({ error: 'Please enter valid administrative credentials.' }, { status: 400 });
    }

    const cleanEmail = normalizeEmail(email);
    const user = db.getUserByEmail(cleanEmail);

    const GENERIC_AUTH_ERROR = 'Invalid administrative credentials.';

    if (!user) {
      recordFailedAttempt(`admin_login_${ip}`);
      return NextResponse.json({ error: GENERIC_AUTH_ERROR }, { status: 401 });
    }

    // Verify password with constant-time verification
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      recordFailedAttempt(`admin_login_${ip}`);
      return NextResponse.json({ error: GENERIC_AUTH_ERROR }, { status: 401 });
    }

    // STRICT ROLE CHECK: Only platform_admin may access admin portal
    if (user.role !== 'platform_admin') {
      recordFailedAttempt(`admin_login_${ip}`);
      // Audit non-admin login attempt into admin portal
      db.createAdminAuditLog({
        adminUserId: user.id,
        adminEmail: user.email,
        action: 'admin_login',
        targetEntity: 'system',
        details: { outcome: 'denied', reason: 'Insufficient role - non-admin attempted admin login' },
        ipAddress: ip,
      });

      return NextResponse.json(
        { error: 'Access denied: You do not have platform administrator privileges.' },
        { status: 403 }
      );
    }

    // Check if admin account is active
    if (user.status !== 'active') {
      return NextResponse.json({ error: 'This administrator account has been deactivated.' }, { status: 403 });
    }

    // Reset rate limiter on successful login
    resetFailedAttempts(`admin_login_${ip}`);

    // Update lastLoginAt
    db.updateUser(user.id, { lastLoginAt: new Date().toISOString() });

    // Create session
    const session = createSession(user, req);

    // Audit log successful admin authentication
    db.createAdminAuditLog({
      adminUserId: user.id,
      adminEmail: user.email,
      action: 'admin_login',
      targetEntity: 'system',
      details: { outcome: 'success', userAgent: req.headers.get('user-agent') },
      ipAddress: ip,
    });

    const { passwordHash: _, ...sanitizedUser } = user;

    const res = NextResponse.json({
      success: true,
      message: 'Platform administrator authenticated successfully.',
      user: sanitizedUser,
      redirectTo: '/admin',
    });

    // Attach admin session cookie
    attachSessionCookie(res, session, true);

    return res;
  } catch (err: any) {
    console.error('Admin login error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred during administrative authentication.' },
      { status: 500 }
    );
  }
}
