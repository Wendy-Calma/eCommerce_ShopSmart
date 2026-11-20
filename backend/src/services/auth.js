import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(crypto.scrypt);
const KEY_LENGTH = 64;
const DUMMY_HASH = `scrypt$${'0'.repeat(32)}$${'0'.repeat(KEY_LENGTH * 2)}`;

export const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = await scrypt(password, salt, KEY_LENGTH);
  return `scrypt$${salt}$${derived.toString('hex')}`;
}

export async function verifyPassword(password, storedHash) {
  const target = storedHash ?? DUMMY_HASH;
  const [scheme, salt, hex] = String(target).split('$');
  if (scheme !== 'scrypt' || !salt || !hex) return false;
  const expected = Buffer.from(hex, 'hex');
  const derived = await scrypt(password, salt, expected.length);
  const matches = expected.length === derived.length && crypto.timingSafeEqual(expected, derived);
  return matches && storedHash !== undefined && storedHash !== null;
}

export function createSessionToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function readBearerToken(header) {
  const match = /^Bearer\s+([A-Za-z0-9_-]{20,})$/.exec(String(header ?? '').trim());
  return match ? match[1] : null;
}

export function toPublicUser(user) {
  return { id: user.id, name: user.name, email: user.email };
}
