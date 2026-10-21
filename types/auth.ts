export type UserRole =
  | 'platform_admin'
  | 'business_owner'
  | 'business_manager'
  | 'business_staff';

export type UserStatus = 'active' | 'suspended' | 'pending_verification';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  phone?: string;
  role: UserRole;
  businessId?: string; // null/undefined for platform_admin
  status: UserStatus;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  suspendedReason?: string;
}

export interface UserSession {
  id: string;
  userId: string;
  token: string;
  role: UserRole;
  businessId?: string;
  expiresAt: string;
  createdAt: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface PasswordResetToken {
  id: string;
  userId: string;
  email: string;
  token: string;
  expiresAt: string;
  used: boolean;
  createdAt: string;
}

export interface EmailVerificationToken {
  id: string;
  userId: string;
  email: string;
  token: string;
  expiresAt: string;
  used: boolean;
  createdAt: string;
}

export interface TeamInvitation {
  id: string;
  businessId: string;
  email: string;
  name?: string;
  role: 'business_manager' | 'business_staff';
  invitedByUserId: string;
  invitedByName: string;
  token: string;
  status: 'pending' | 'accepted' | 'revoked';
  expiresAt: string;
  createdAt: string;
}

export interface AdminAuditLog {
  id: string;
  adminUserId: string;
  adminEmail: string;
  action:
    | 'admin_login'
    | 'admin_logout'
    | 'suspend_business'
    | 'activate_business'
    | 'deactivate_user'
    | 'activate_user'
    | 'update_subscription_limits'
    | 'revoke_session'
    | 'provision_admin'
    | 'system_configuration_change';
  targetEntity: 'business' | 'user' | 'subscription' | 'system' | 'session';
  targetId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  timestamp: string;
}

export interface PlatformMetrics {
  totalBusinesses: number;
  activeBusinesses: number;
  suspendedBusinesses: number;
  totalUsers: number;
  activeUsers: number;
  mrr: number;
  paidSubscriptionsCount: number;
  aiWorkflowRunsTotal: number;
  documentExtractionsTotal: number;
  failedAgentRunsCount: number;
  lastUpdated: string;
}

export interface AuthResponse {
  success: boolean;
  user?: Omit<User, 'passwordHash'>;
  token?: string;
  error?: string;
  redirectTo?: string;
}
