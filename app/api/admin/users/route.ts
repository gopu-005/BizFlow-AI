import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/database';
import { requirePlatformAdmin } from '@/lib/auth/rbac';
import { UserRole } from '@/types/auth';

export async function GET(req: NextRequest) {
  try {
    const { errorResponse } = requirePlatformAdmin(req);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.toLowerCase() || '';
    const roleFilter = (searchParams.get('role') as UserRole) || undefined;
    const businessId = searchParams.get('businessId') || undefined;

    const users = db.getUsers({ search, role: roleFilter, businessId });

    // Sanitize and enhance with business name
    const sanitized = users.map((u) => {
      const { passwordHash: _, ...safeUser } = u;
      const business = u.businessId ? db.getBusiness(u.businessId) : null;
      return {
        ...safeUser,
        businessName: business?.name || (u.role === 'platform_admin' ? 'BizFlow Platform SaaS' : 'Unassigned'),
      };
    });

    return NextResponse.json({
      success: true,
      users: sanitized,
    });
  } catch (err: any) {
    console.error('Admin users GET error:', err);
    return NextResponse.json({ error: 'Failed to retrieve users.' }, { status: 500 });
  }
}
