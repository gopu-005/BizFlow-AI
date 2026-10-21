import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/database';
import { normalizeEmail, isValidEmail } from '@/lib/auth/password';
import { checkRateLimit, recordFailedAttempt } from '@/lib/auth/session';
import { EmailService } from '@/lib/email/email-service';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
    const rateCheck = checkRateLimit(`pwd_reset_${ip}`, 5, 15);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Too many password reset requests. Please wait ${rateCheck.retryAfterSeconds} seconds before trying again.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { email } = body;

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
    }

    const cleanEmail = normalizeEmail(email);
    const user = db.getUserByEmail(cleanEmail);

    // Generic response message to prevent account enumeration
    const GENERIC_SUCCESS_MESSAGE =
      'If an account exists with this email address, you will receive password reset instructions shortly.';

    if (!user) {
      recordFailedAttempt(`pwd_reset_${ip}`);
      // Do NOT reveal that the email doesn't exist
      return NextResponse.json({
        success: true,
        message: GENERIC_SUCCESS_MESSAGE,
      });
    }

    // Generate single-use, cryptographically secure 32-byte token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour expiration

    db.createPasswordResetToken(user.id, user.email, token, expiresAt);

    const resetUrl = `${req.nextUrl.origin}/reset-password?token=${token}`;

    // Dispatch via configured email provider (or log diagnostic if unconfigured)
    const emailResult = await EmailService.sendPasswordResetEmail(user.email, user.name, resetUrl);

    // In local development / test environments, log the reset URL for developer convenience
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[PASSWORD RECOVERY] Generated reset link for ${user.email}: ${resetUrl}`);
    }

    return NextResponse.json({
      success: true,
      message: GENERIC_SUCCESS_MESSAGE,
      // Only include devToken in non-production environments for automated testing
      ...(process.env.NODE_ENV !== 'production' ? { devToken: token } : {}),
      emailConfigured: emailResult.configured,
    });
  } catch (err: any) {
    console.error('Forgot password error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while processing your request.' },
      { status: 500 }
    );
  }
}
