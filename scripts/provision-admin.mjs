/**
 * BizFlow AI - Platform Administrator Provisioning CLI Command
 *
 * Securely provisions or updates a platform administrator account without relying on public registration.
 * Usage:
 *   node scripts/provision-admin.mjs [email] [password] [fullName]
 *
 * Alternatively, provide via environment variables:
 *   ADMIN_EMAIL=admin@bizflow.in ADMIN_PASSWORD=YourStrongPassword! node scripts/provision-admin.mjs
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(crypto.scrypt);
const DB_FILE = path.join(process.cwd(), 'data', 'bizflow-db.json');

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = await scryptAsync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

function validatePassword(password) {
  if (!password || password.length < 8) return 'Password must be at least 8 characters long.';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number.';
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return 'Password must contain at least one special character.';
  return null;
}

async function main() {
  const email = process.argv[2] || process.env.ADMIN_EMAIL;
  const password = process.argv[3] || process.env.ADMIN_PASSWORD;
  const name = process.argv[4] || process.env.ADMIN_NAME || 'BizFlow Platform Administrator';

  if (!email || !password) {
    console.error('❌ Error: Missing administrative credentials.');
    console.log('\nUsage:');
    console.log('  node scripts/provision-admin.mjs <email> <password> [fullName]');
    console.log('\nExample:');
    console.log('  node scripts/provision-admin.mjs admin@bizflow.in SecureAdminPassword123! "BizFlow SaaS SuperAdmin"\n');
    process.exit(1);
  }

  const pwdError = validatePassword(password);
  if (pwdError) {
    console.error(`❌ Security Error: ${pwdError}`);
    process.exit(1);
  }

  if (!fs.existsSync(DB_FILE)) {
    console.error(`❌ Database file not found at ${DB_FILE}. Please start the application once first.`);
    process.exit(1);
  }

  const raw = fs.readFileSync(DB_FILE, 'utf-8');
  const data = JSON.parse(raw);

  if (!data.users) data.users = [];
  if (!data.adminAuditLogs) data.adminAuditLogs = [];

  const cleanEmail = email.trim().toLowerCase();
  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();

  const existingIdx = data.users.findIndex((u) => u.email.toLowerCase() === cleanEmail);

  let adminUser;
  if (existingIdx !== -1) {
    console.log(`⚠️ User ${cleanEmail} already exists. Elevating/updating to platform_admin...`);
    data.users[existingIdx] = {
      ...data.users[existingIdx],
      role: 'platform_admin',
      name: name.trim(),
      passwordHash,
      status: 'active',
      isEmailVerified: true,
      updatedAt: now,
    };
    adminUser = data.users[existingIdx];
  } else {
    adminUser = {
      id: `usr_admin_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      email: cleanEmail,
      passwordHash,
      name: name.trim(),
      role: 'platform_admin',
      status: 'active',
      isEmailVerified: true,
      createdAt: now,
      updatedAt: now,
    };
    data.users.push(adminUser);
  }

  // Record audit log
  data.adminAuditLogs.unshift({
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    adminUserId: adminUser.id,
    adminEmail: cleanEmail,
    action: 'provision_admin',
    targetEntity: 'user',
    targetId: adminUser.id,
    details: {
      action: existingIdx !== -1 ? 'elevated_to_admin' : 'new_admin_provisioned',
      name: adminUser.name,
      timestamp: now,
    },
    timestamp: now,
  });

  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');

  console.log('====================================================');
  console.log('✅ Platform Administrator Provisioned Successfully!');
  console.log('====================================================');
  console.log(`• ID:       ${adminUser.id}`);
  console.log(`• Name:     ${adminUser.name}`);
  console.log(`• Email:    ${adminUser.email}`);
  console.log(`• Role:     ${adminUser.role}`);
  console.log(`• Status:   ${adminUser.status}`);
  console.log('• Security: Password hashed with scrypt & 16-byte cryptographic salt.');
  console.log('• Audit:    Audit log entry written.');
  console.log('====================================================\n');
}

main().catch((err) => {
  console.error('Fatal error during provisioning:', err);
  process.exit(1);
});
