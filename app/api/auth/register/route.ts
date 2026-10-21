import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/database';
import { hashPassword, validatePasswordStrength, normalizeEmail, isValidEmail } from '@/lib/auth/password';
import { createSession, attachSessionCookie, checkRateLimit, recordFailedAttempt } from '@/lib/auth/session';
import { EmailService } from '@/lib/email/email-service';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
    const rateCheck = checkRateLimit(`reg_${ip}`, 10, 15);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Too many registration attempts. Please try again after ${rateCheck.retryAfterSeconds} seconds.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { name, businessName, email, phone, password, confirmPassword, agreeToTerms } = body;

    // 1. Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: 'Please enter a valid full name (minimum 2 characters).' }, { status: 400 });
    }

    if (!businessName || typeof businessName !== 'string' || businessName.trim().length < 2) {
      return NextResponse.json({ error: 'Please enter a valid business name (minimum 2 characters).' }, { status: 400 });
    }

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Password is required.' }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Password and confirmation password do not match.' }, { status: 400 });
    }

    if (!agreeToTerms) {
      return NextResponse.json({ error: 'You must agree to the BizFlow AI Terms of Service and Privacy Policy.' }, { status: 400 });
    }

    // 2. Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { error: passwordValidation.error || 'Password does not meet security requirements.' },
        { status: 400 }
      );
    }

    const cleanEmail = normalizeEmail(email);

    // 3. Enforce email uniqueness
    const existingUser = db.getUserByEmail(cleanEmail);
    if (existingUser) {
      recordFailedAttempt(`reg_${ip}`);
      return NextResponse.json(
        { error: 'An account with this email address already exists. Please sign in or use password recovery.' },
        { status: 409 }
      );
    }

    // 4. Create new Business Tenant (Tenant Isolation)
    const newTenant = db.createBusiness({
      name: businessName.trim(),
      legalName: businessName.trim(),
      ownerName: name.trim(),
      type: 'Retail & Commercial Services',
      email: cleanEmail,
      phone: phone ? String(phone).trim() : '+91 90000 00000',
      address: 'Business Registered Address',
      currency: 'INR',
      createdAt: new Date().toISOString(),
      status: 'active',
    });

    // 5. Hash password with scrypt + 16-byte random salt
    const passwordHash = await hashPassword(password);

    // 6. Security Rule: Strictly assign business_owner role (never allow platform_admin through public registration)
    const newUser = db.createUser({
      email: cleanEmail,
      passwordHash,
      name: name.trim(),
      phone: phone ? String(phone).trim() : undefined,
      role: 'business_owner',
      businessId: newTenant.id,
      status: 'active',
      isEmailVerified: false,
    });

    // 7. Create authenticated session
    const session = createSession(newUser, req);

    // 7b. Issue single-use email verification token
    const verToken = crypto.randomBytes(32).toString('hex');
    const verExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    db.createEmailVerificationToken(newUser.id, newUser.email, verToken, verExpires);

    const verifyUrl = `${req.nextUrl.origin}/api/auth/verify-email?token=${verToken}`;
    const emailResult = await EmailService.sendVerificationEmail(newUser.email, newUser.name, verifyUrl);

    // 8. Prepare sanitized user response (never return passwordHash)
    const { passwordHash: _, ...sanitizedUser } = newUser;

    const res = NextResponse.json({
      success: true,
      message: 'Account and business workspace registered successfully.',
      user: sanitizedUser,
      business: newTenant,
      emailConfigured: emailResult.configured,
      redirectTo: '/',
    });

    // 9. Attach HttpOnly SameSite=Lax Secure session cookie
    attachSessionCookie(res, session, false);

    return res;
  } catch (err: any) {
    console.error('Registration error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred during registration. Please try again.' },
      { status: 500 }
    );
  }
}
