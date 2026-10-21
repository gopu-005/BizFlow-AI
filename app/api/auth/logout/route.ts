import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/database';
import { USER_COOKIE_NAME, ADMIN_COOKIE_NAME, clearSessionCookie } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const userToken = req.cookies.get(USER_COOKIE_NAME)?.value;
    const adminToken = req.cookies.get(ADMIN_COOKIE_NAME)?.value;

    if (userToken) {
      db.deleteSession(userToken);
    }
    if (adminToken && adminToken !== userToken) {
      db.deleteSession(adminToken);
    }

    // Check authorization header fallback
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const headerToken = authHeader.substring(7).trim();
      db.deleteSession(headerToken);
    }

    const res = NextResponse.json({
      success: true,
      message: 'Logged out successfully. All server-side sessions have been terminated.',
    });

    // Clear both user and admin session cookies
    clearSessionCookie(res, false);
    clearSessionCookie(res, true);

    return res;
  } catch (err: any) {
    console.error('Logout error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred during logout.' },
      { status: 500 }
    );
  }
}
