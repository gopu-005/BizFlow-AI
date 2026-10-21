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
    const rateCheck = checkRateLimit(`login_${ip}`, 5, 15);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Too many failed login attempts. Please try again after ${rateCheck.retryAfterSeconds} seconds.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { email, password } = body;

    if (!email || !isValidEmail(email) || !password) {
      return NextResponse.json({ error: 'Please provide both a valid email and password.' }, { status: 400 });
    }

    const cleanEmail = normalizeEmail(email);
    const user = db.getUserByEmail(cleanEmail);

    // Generic error to prevent account enumeration
    const GENERIC_AUTH_ERROR = 'Invalid email address or password.';

    if (!user) {
      recordFailedAttempt(`login_${ip}`);
      return NextResponse.json({ error: GENERIC_AUTH_ERROR }, { status: 401 });
    }

    // Verify password with constant-time scrypt verification
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      recordFailedAttempt(`login_${ip}`);
      return NextResponse.json({ error: GENERIC_AUTH_ERROR }, { status: 401 });
    }

    // Check user account status
    if (user.status === 'suspended') {
      return NextResponse.json(
        {
          error: user.suspendedReason
            ? `Your account has been suspended: ${user.suspendedReason}`
            : 'Your account has been suspended. Please contact platform support at support@bizflow.in.',
        },
        { status: 403 }
      );
    }

    // Check business account status if associated
    if (user.businessId) {
      const business = db.getBusiness(user.businessId);
      if (business && business.status === 'suspended') {
        return NextResponse.json(
          {
            error: business.suspendedReason
              ? `Your business workspace is suspended: ${business.suspendedReason}`
              : 'Your business workspace is suspended. Please contact support.',
          },
          { status: 403 }
        );
      }
    }

    // Reset rate limiter on successful authentication
    resetFailedAttempts(`login_${ip}`);

    // Update lastLoginAt
    db.updateUser(user.id, { lastLoginAt: new Date().toISOString() });

    // Create session
    const session = createSession(user, req);

    // Determine appropriate redirect
    const isAdmin = user.role === 'platform_admin';
    const redirectTo = isAdmin ? '/admin' : '/';

    const { passwordHash: _, ...sanitizedUser } = user;

    const res = NextResponse.json({
      success: true,
      message: 'Logged in successfully.',
      user: sanitizedUser,
      redirectTo,
    });

    // Attach user session cookie
    attachSessionCookie(res, session, false);

    // If platform admin, also attach admin session cookie
    if (isAdmin) {
      attachSessionCookie(res, session, true);
    }

    return res;
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred during login. Please try again.' },
      { status: 500 }
    );
  }
}
