import crypto from 'crypto';

/**
 * Generate a cryptographically secure random token
 * @param length - Length of the token in bytes (default: 32)
 * @returns Hex-encoded secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a secure session ID
 * @returns 32-byte hex-encoded session ID
 */
export function generateSecureSessionId(): string {
  return generateSecureToken(32);
}

/**
 * Generate a secure access token
 * @returns 32-byte hex-encoded access token
 */
export function generateSecureAccessToken(): string {
  return generateSecureToken(32);
}

/**
 * Generate a secure refresh token
 * @returns 32-byte hex-encoded refresh token
 */
export function generateSecureRefreshToken(): string {
  return generateSecureToken(32);
}

/**
 * Generate a secure nonce for authentication challenges
 * @returns 16-byte hex-encoded nonce
 */
export function generateSecureNonce(): string {
  return generateSecureToken(16);
}

/**
 * Generate a secure challenge ID
 * @returns 24-byte hex-encoded challenge ID
 */
export function generateSecureChallengeId(): string {
  return generateSecureToken(24);
}

/**
 * Hash a string using SHA-256
 * @param input - String to hash
 * @returns Hex-encoded SHA-256 hash
 */
export function hashString(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Generate a secure random password
 * @param length - Length of the password (default: 16)
 * @returns Base64-encoded secure password
 */
export function generateSecurePassword(length: number = 16): string {
  return crypto.randomBytes(length).toString('base64');
}

/**
 * Generate a secure API key
 * @returns 32-byte hex-encoded API key
 */
export function generateSecureApiKey(): string {
  return generateSecureToken(32);
}

/**
 * Constant-time string comparison to prevent timing attacks
 * @param a - First string
 * @param b - Second string
 * @returns True if strings are equal
 */
export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Generate a secure salt for password hashing
 * @param length - Length of the salt in bytes (default: 16)
 * @returns Hex-encoded salt
 */
export function generateSalt(length: number = 16): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash a password with salt using PBKDF2
 * @param password - Plain text password
 * @param salt - Salt (hex-encoded)
 * @param iterations - Number of iterations (default: 100000)
 * @returns Hex-encoded hashed password
 */
export function hashPassword(password: string, salt: string, iterations: number = 100000): string {
  return crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
}

/**
 * Verify a password against its hash
 * @param password - Plain text password
 * @param hash - Stored hash (hex-encoded)
 * @param salt - Salt used for hashing (hex-encoded)
 * @param iterations - Number of iterations used for hashing
 * @returns True if password matches
 */
export function verifyPassword(password: string, hash: string, salt: string, iterations: number = 100000): boolean {
  const hashedPassword = hashPassword(password, salt, iterations);
  return constantTimeCompare(hashedPassword, hash);
}
