import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { SESSION_TTL_MS, createSessionToken, hashPassword, hashToken, toPublicUser, verifyPassword } from '../services/auth.js';
import { loginSchema, registerSchema } from '../validators/schemas.js';
const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_ATTEMPTS', message: 'Too many sign-in attempts. Please wait a few minutes and try again.' } }
});

const EMAIL_TAKEN = { error: { code: 'EMAIL_TAKEN', message: 'An account with this email already exists. Please sign in.' } };

async function startSession(user) {
  const token = createSessionToken();
  await prisma.session.create({ data: { tokenHash: hashToken(token), userId: user.id, expiresAt: new Date(Date.now() + SESSION_TTL_MS) } });
  return { token, user: toPublicUser(user) };
}

router.post('/register', authLimiter, async (request, response, next) => {
  try {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) return response.status(422).json({ error: { code: 'INVALID_ACCOUNT', message: 'Check your name, email and password (at least 8 characters).', details: parsed.error.flatten() } });
    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existing) return response.status(409).json(EMAIL_TAKEN);
    const user = await prisma.user.create({ data: { name: parsed.data.name, email: parsed.data.email, passwordHash: await hashPassword(parsed.data.password) } });
    response.status(201).json(await startSession(user));
  } catch (error) {
    if (error?.code === 'P2002') return response.status(409).json(EMAIL_TAKEN);
    next(error);
  }
});

router.post('/login', authLimiter, async (request, response, next) => {
  try {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) return response.status(422).json({ error: { code: 'INVALID_LOGIN', message: 'Enter your email and password.' } });
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    const valid = await verifyPassword(parsed.data.password, user?.passwordHash);
    if (!user || !valid) return response.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'The email or password is incorrect.' } });
    await prisma.session.deleteMany({ where: { userId: user.id, expiresAt: { lte: new Date() } } });
    response.json(await startSession(user));
  } catch (error) { next(error); }
});

router.get('/me', requireAuth, (request, response) => response.json({ user: toPublicUser(request.user) }));

router.post('/logout', requireAuth, async (request, response, next) => {
  try {
    await prisma.session.deleteMany({ where: { id: request.sessionId } });
    response.status(204).end();
  } catch (error) { next(error); }
});

export default router;
