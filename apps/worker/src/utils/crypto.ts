/**
 * Generate a cryptographically secure random token
 */
export function generateToken(bytes = 32): string {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Hash a token using SHA-256
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate a short unique ID (for database primary keys)
 */
export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = generateToken(8).slice(0, 8);
  return `${timestamp}_${random}`;
}
