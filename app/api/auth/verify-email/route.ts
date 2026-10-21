import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/database';
import { requireAuth } from '@/lib/auth/rbac';
import { EmailService } from '@/lib/email/email-service';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token');
    if (!token) {
      return NextResponse.json({ error: 'Verification token is required.' }, { status: 400 });
    }

    const tokenRec = db.getEmailVerificationToken(token);
    if (!tokenRec) {
      return NextResponse.json(
        { error: 'Invalid or expired email verification token.' },
        { status: 400 }
      );
    }

    // Mark token used and update user status
    db.markEmailVerificationTokenUsed(token);
    db.verifyUserEmail(tokenRec.userId);

    // If request accepts HTML, redirect to app with success query
    const acceptHeader = req.headers.get('accept') || '';
    if (acceptHeader.includes('text/html')) {
      return NextResponse.redirect(new URL('/app?verified=true', req.url));
    }

    return NextResponse.json({
      success: true,
      message: 'Email address verified successfully.',
      verified: true,
    });
  } catch (err: any) {
    console.error('Verify email error:', err);
    return NextResponse.json(
      { error: 'Failed to verify email address.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { context, errorResponse } = requireAuth(req);
    if (errorResponse) return errorResponse;

    const { user } = context!;

    if (user.isEmailVerified) {
      return NextResponse.json({
        success: true,
        message: 'Email address is already verified.',
        verified: true,
      });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    db.createEmailVerificationToken(user.id, user.email, token, expiresAt);

    const verifyUrl = `${req.nextUrl.origin}/api/auth/verify-email?token=${token}`;
    const result = await EmailService.sendVerificationEmail(user.email, user.name, verifyUrl);

    return NextResponse.json({
      success: true,
      message: 'A verification link has been sent to your email address.',
      emailConfigured: result.configured,
      ...(process.env.NODE_ENV !== 'production' ? { devVerificationToken: token } : {}),
    });
  } catch (err: any) {
    console.error('Resend verification email error:', err);
    return NextResponse.json(
      { error: 'Failed to send verification link.' },
      { status: 500 }
    );
  }
}
