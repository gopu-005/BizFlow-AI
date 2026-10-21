import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/database';
import { requireBusinessAccess } from '@/lib/auth/rbac';
import { isValidEmail, normalizeEmail } from '@/lib/auth/password';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedBizId = searchParams.get('businessId') || undefined;

    const { context, errorResponse } = requireBusinessAccess(req, requestedBizId);
    if (errorResponse) return errorResponse;

    const { businessId } = context!;

    // Fetch team members belonging to this business tenant only
    const members = db.getUsers({ businessId }).map((u) => {
      const { passwordHash: _, ...sanitized } = u;
      return sanitized;
    });

    const invitations = db.getTeamInvitations(businessId!);

    return NextResponse.json({
      success: true,
      members,
      invitations,
    });
  } catch (err: any) {
    console.error('Team GET error:', err);
    return NextResponse.json({ error: 'Failed to retrieve team members.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Only business_owner or business_manager can invite team members
    const { context, errorResponse } = requireBusinessAccess(req, undefined, ['business_owner', 'business_manager', 'platform_admin']);
    if (errorResponse) return errorResponse;

    const { user, businessId } = context!;
    const body = await req.json();
    const { email, name, role } = body;

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
    }

    // Role Security: Business invitations may ONLY be business_manager or business_staff
    const validRoles = ['business_manager', 'business_staff'];
    if (!role || !validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid team role. Authorized team roles are: business_manager or business_staff.' },
        { status: 400 }
      );
    }

    const cleanEmail = normalizeEmail(email);

    // Check if user already exists
    const existing = db.getUserByEmail(cleanEmail);
    if (existing) {
      if (existing.businessId === businessId) {
        return NextResponse.json({ error: 'This user is already a member of your business team.' }, { status: 409 });
      } else {
        return NextResponse.json(
          { error: 'An account with this email address already belongs to another business tenant.' },
          { status: 409 }
        );
      }
    }

    // Generate secure invitation token
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    const invitation = db.createTeamInvitation({
      businessId: businessId!,
      email: cleanEmail,
      name: name ? String(name).trim() : undefined,
      role,
      invitedByUserId: user.id,
      invitedByName: user.name,
      token,
      status: 'pending',
      expiresAt,
    });

    return NextResponse.json({
      success: true,
      message: `Invitation sent to ${cleanEmail} for the role of ${role.replace('_', ' ')}.`,
      invitation,
    });
  } catch (err: any) {
    console.error('Team POST error:', err);
    return NextResponse.json({ error: 'Failed to create team invitation.' }, { status: 500 });
  }
}
