import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/database';
import { User, UserSession, UserRole } from '@/types/auth';

export const USER_COOKIE_NAME = 'bizflow_session';
export const ADMIN_COOKIE_NAME = 'bizflow_admin_session';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// In-memory rate limiter for login attempts (15-min lockout after 5 consecutive failures)
interface RateLimitEntry {
  attempts: number;
  lockedUntil: number;
}
const loginRateLimits = new Map<string, RateLimitEntry>();

export function checkRateLimit(key: string, maxAttempts = 5, lockoutMinutes = 15): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const entry = loginRateLimits.get(key);

  if (entry) {
    if (entry.lockedUntil > now) {
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil((entry.lockedUntil - now) / 1000),
      };
    }
    if (entry.lockedUntil <= now && entry.attempts >= maxAttempts) {
      // Lock expired, reset
      loginRateLimits.delete(key);
    }
  }

  return { allowed: true };
}

export function recordFailedAttempt(key: string, maxAttempts = 5, lockoutMinutes = 15) {
  const now = Date.now();
  const entry = loginRateLimits.get(key) || { attempts: 0, lockedUntil: 0 };
  entry.attempts += 1;

  if (entry.attempts >= maxAttempts) {
    entry.lockedUntil = now + lockoutMinutes * 60 * 1000;
  }

  loginRateLimits.set(key, entry);
}

export function resetFailedAttempts(key: string) {
  loginRateLimits.delete(key);
}

/**
 * Generate a cryptographically secure random session token
 */
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create a new user session in database and return session object
 */
export function createSession(user: User, req?: NextRequest): UserSession {
  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  const userAgent = req?.headers.get('user-agent') || undefined;
  const ipAddress = req?.headers.get('x-forwarded-for')?.split(',')[0].trim() || req?.headers.get('x-real-ip') || undefined;

  const session: UserSession = {
    id: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId: user.id,
    token,
    role: user.role,
    businessId: user.businessId,
    expiresAt,
    createdAt: new Date().toISOString(),
    userAgent,
    ipAddress,
  };

  db.createSession(session);
  return session;
}

/**
 * Attach the session cookie to a Next.js response
 */
export function attachSessionCookie(response: NextResponse, session: UserSession, isAdmin = false) {
  const cookieName = isAdmin ? ADMIN_COOKIE_NAME : USER_COOKIE_NAME;
  const isProduction = process.env.NODE_ENV === 'production';

  response.cookies.set({
    name: cookieName,
    value: session.token,
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  });
}

/**
 * Clear session cookie from response
 */
export function clearSessionCookie(response: NextResponse, isAdmin = false) {
  const cookieName = isAdmin ? ADMIN_COOKIE_NAME : USER_COOKIE_NAME;
  response.cookies.set({
    name: cookieName,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}

/**
 * Retrieve session from incoming request via Cookie or Authorization header
 */
export function getSessionFromRequest(req: NextRequest, isAdmin = false): { session?: UserSession; user?: User; error?: string } {
  const cookieName = isAdmin ? ADMIN_COOKIE_NAME : USER_COOKIE_NAME;
  let token = req.cookies.get(cookieName)?.value;

  // Fallback to Bearer token if present
  if (!token) {
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }
  }

  if (!token) {
    return { error: 'No authentication token provided.' };
  }

  const session = db.getSessionByToken(token);
  if (!session) {
    return { error: 'Session not found or expired.' };
  }

  // Check expiry
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    db.deleteSession(session.token);
    return { error: 'Session has expired.' };
  }

  const user = db.getUserById(session.userId);
  if (!user) {
    db.deleteSession(session.token);
    return { error: 'User no longer exists.' };
  }

  if (user.status === 'suspended') {
    return { error: 'Your account has been suspended. Please contact platform support.' };
  }

  return { session, user };
}
