import crypto from 'crypto';

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

/**
 * Hash a plaintext password using Node.js scrypt with a random 16-byte salt
 */
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
    crypto.scrypt(password, salt, KEY_LENGTH, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

/**
 * Constant-time verification of a plaintext password against a stored salt:hash
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!storedHash || !storedHash.includes(':')) {
      return resolve(false);
    }

    const [salt, key] = storedHash.split(':');
    const keyBuffer = Buffer.from(key, 'hex');

    crypto.scrypt(password, salt, KEY_LENGTH, (err, derivedKey) => {
      if (err) return resolve(false);
      try {
        const matches = crypto.timingSafeEqual(keyBuffer, derivedKey);
        resolve(matches);
      } catch {
        resolve(false);
      }
    });
  });
}

/**
 * Validate password strength
 * Rules: at least 8 characters, at least 1 letter, at least 1 number
 */
export function validatePasswordStrength(password: string): { isValid: boolean; error?: string } {
  if (!password || password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long.' };
  }
  if (!/[A-Za-z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one letter.' };
  }
  if (!/[0-9]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one number.' };
  }
  return { isValid: true };
}

/**
 * Normalize and validate email address
 */
export function normalizeEmail(email: string): string {
  return (email || '').trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}
