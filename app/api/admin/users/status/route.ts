import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/database';
import { requirePlatformAdmin } from '@/lib/auth/rbac';

export async function POST(req: NextRequest) {
  try {
    const { context, errorResponse } = requirePlatformAdmin(req);
    if (errorResponse) return errorResponse;

    const { user: adminUser } = context!;
    const body = await req.json();
    const { userId, status, reason } = body;

    if (!userId || !['active', 'suspended'].includes(status)) {
      return NextResponse.json({ error: 'Valid userId and status (active | suspended) are required.' }, { status: 400 });
    }

    const targetUser = db.getUserById(userId);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    // Protection rule: Prevent deactivating the primary platform administrator
    if (targetUser.email === 'admin@bizflow.in' && status === 'suspended') {
      return NextResponse.json(
        { error: 'Security restriction: Primary platform administrator cannot be suspended.' },
        { status: 403 }
      );
    }

    // Update user
    const updated = db.updateUser(userId, {
      status,
      suspendedReason: status === 'suspended' ? reason || 'Administrative suspension' : undefined,
    });

    // If suspended, invalidate all user's active sessions immediately
    if (status === 'suspended') {
      db.deleteUserSessions(userId);
    }

    // Audit log
    db.createAdminAuditLog({
      adminUserId: adminUser.id,
      adminEmail: adminUser.email,
      action: status === 'suspended' ? 'deactivate_user' : 'activate_user',
      targetEntity: 'user',
      targetId: userId,
      details: {
        userName: targetUser.name,
        userEmail: targetUser.email,
        status,
        reason,
      },
    });

    const { passwordHash: _, ...sanitized } = updated;

    return NextResponse.json({
      success: true,
      message: `User status changed to ${status}.`,
      user: sanitized,
    });
  } catch (err: any) {
    console.error('Admin user status error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update user status.' }, { status: 500 });
  }
}
