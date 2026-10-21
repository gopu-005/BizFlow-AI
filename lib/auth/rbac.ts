import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from './session';
import { User, UserRole } from '@/types/auth';

export interface AuthContext {
  user: User;
  businessId?: string;
  role: UserRole;
}

/**
 * Require any authenticated user (business or platform admin)
 */
export function requireAuth(req: NextRequest): { context?: AuthContext; errorResponse?: NextResponse } {
  // Check user session first, then admin session
  let auth = getSessionFromRequest(req, false);
  if (auth.error) {
    auth = getSessionFromRequest(req, true);
  }

  if (auth.error || !auth.user) {
    return {
      errorResponse: NextResponse.json({ error: auth.error || 'Authentication required.' }, { status: 401 }),
    };
  }

  return {
    context: {
      user: auth.user,
      businessId: auth.user.businessId,
      role: auth.user.role,
    },
  };
}

/**
 * Require authenticated business user with strict tenant isolation check
 */
export function requireBusinessAccess(
  req: NextRequest,
  requestedBusinessId?: string,
  allowedRoles?: UserRole[]
): { context?: AuthContext; errorResponse?: NextResponse } {
  const auth = getSessionFromRequest(req, false);

  if (auth.error || !auth.user) {
    return {
      errorResponse: NextResponse.json({ error: auth.error || 'Business authentication required.' }, { status: 401 }),
    };
  }

  const { user } = auth;

  // Platform admin can also access if needed for support, but normal check requires business tenant
  if (user.role === 'platform_admin') {
    return {
      context: {
        user,
        businessId: requestedBusinessId || user.businessId,
        role: user.role,
      },
    };
  }

  // Tenant Isolation Enforcement: user's businessId must match requestedBusinessId if provided
  if (requestedBusinessId && user.businessId !== requestedBusinessId) {
    return {
      errorResponse: NextResponse.json(
        { error: 'Tenant isolation violation: You do not have permission to access another business records.' },
        { status: 403 }
      ),
    };
  }

  if (!user.businessId) {
    return {
      errorResponse: NextResponse.json({ error: 'User is not associated with an active business tenant.' }, { status: 403 }),
    };
  }

  // Role check if specified
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return {
      errorResponse: NextResponse.json(
        { error: `Access denied. Requires one of: ${allowedRoles.join(', ')}.` },
        { status: 403 }
      ),
    };
  }

  return {
    context: {
      user,
      businessId: user.businessId,
      role: user.role,
    },
  };
}

/**
 * Require authenticated platform administrator
 */
export function requirePlatformAdmin(req: NextRequest): { context?: AuthContext; errorResponse?: NextResponse } {
  const auth = getSessionFromRequest(req, true);

  if (auth.error || !auth.user) {
    return {
      errorResponse: NextResponse.json({ error: auth.error || 'Platform administrator authentication required.' }, { status: 401 }),
    };
  }

  if (auth.user.role !== 'platform_admin') {
    return {
      errorResponse: NextResponse.json(
        { error: 'Forbidden: Platform administrator privileges required.' },
        { status: 403 }
      ),
    };
  }

  return {
    context: {
      user: auth.user,
      role: auth.user.role,
    },
  };
}

/**
 * Resolves the businessId for a request with strict tenant isolation.
 * - If user is logged in (business_owner / staff): businessId is ALWAYS forced to user.businessId.
 *   If requestedBusinessId is provided and does not match user.businessId, returns 403 Forbidden.
 * - If user is platform_admin: can access requestedBusinessId or defaults.
 * - If user is not logged in: returns requestedBusinessId || fallbackBusinessId (e.g. for smoke tests / public demo).
 */
export function resolveTenantBusinessId(
  req: NextRequest,
  requestedBusinessId?: string | null,
  fallbackBusinessId = 'biz_karthik_textiles'
): { businessId: string; user?: User; errorResponse?: NextResponse } {
  const cleanRequestedId =
    requestedBusinessId &&
    requestedBusinessId !== 'undefined' &&
    requestedBusinessId !== 'null' &&
    requestedBusinessId.trim() !== ''
      ? requestedBusinessId.trim()
      : undefined;

  // Check user session first
  const auth = getSessionFromRequest(req, false);
  if (auth.user) {
    const { user } = auth;
    if (user.role === 'platform_admin') {
      return { businessId: cleanRequestedId || fallbackBusinessId, user };
    }
    // Strict tenant isolation for business owners and staff:
    if (cleanRequestedId && user.businessId && cleanRequestedId !== user.businessId) {
      return {
        businessId: user.businessId,
        user,
        errorResponse: NextResponse.json(
          { error: 'Tenant isolation violation: You do not have permission to access another business records.' },
          { status: 403 }
        ),
      };
    }
    if (user.businessId) {
      return { businessId: user.businessId, user };
    }
  }

  // Check admin session
  const adminAuth = getSessionFromRequest(req, true);
  if (adminAuth.user && adminAuth.user.role === 'platform_admin') {
    return { businessId: cleanRequestedId || fallbackBusinessId, user: adminAuth.user };
  }

  // Unauthenticated fallback (for tests or demo)
  return { businessId: cleanRequestedId || fallbackBusinessId };
}

/**
 * Strict tenant resolution for Agentic OS features (AI Agent Workspace, Smart Entry,
 * Udhaar & Collections, Daily Closing). Identical to resolveTenantBusinessId, except that
 * unauthenticated visitors are REJECTED with 401 instead of falling back to the public demo tenant.
 */
export function requireAgenticAccess(
  req: NextRequest,
  requestedBusinessId?: string | null
): { businessId: string; user?: User; errorResponse?: NextResponse } {
  const result = resolveTenantBusinessId(req, requestedBusinessId);
  if (result.errorResponse) return result;

  if (!result.user) {
    return {
      businessId: '',
      errorResponse: NextResponse.json(
        { error: 'Sign in required. Agentic features are only available to logged-in users.', code: 'AUTH_REQUIRED' },
        { status: 401 }
      ),
    };
  }

  return result;
}
