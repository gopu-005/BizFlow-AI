import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/database';
import { ADMIN_COOKIE_NAME, clearSessionCookie, getSessionFromRequest } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const auth = getSessionFromRequest(req, true);
    if (auth.session && auth.user) {
      db.createAdminAuditLog({
        adminUserId: auth.user.id,
        adminEmail: auth.user.email,
        action: 'admin_logout',
        targetEntity: 'system',
        details: { outcome: 'success' },
      });
      db.deleteSession(auth.session.token);
    }

    const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
    if (token) {
      db.deleteSession(token);
    }

    const res = NextResponse.json({
      success: true,
      message: 'Platform administrator logged out successfully.',
    });

    clearSessionCookie(res, true);
    return res;
  } catch (err: any) {
    console.error('Admin logout error:', err);
    return NextResponse.json({ error: 'Failed to complete administrator logout.' }, { status: 500 });
  }
}
