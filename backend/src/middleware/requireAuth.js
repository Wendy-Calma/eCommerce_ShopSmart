import { prisma } from '../lib/prisma.js';
import { hashToken, readBearerToken } from '../services/auth.js';

export async function requireAuth(request, response, next) {
  try {
    const token = readBearerToken(request.get('authorization'));
    if (!token) return response.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Please sign in to continue.' } });
    const session = await prisma.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
    if (!session || session.expiresAt <= new Date()) {
      return response.status(401).json({ error: { code: 'SESSION_EXPIRED', message: 'Your session has ended. Please sign in again.' } });
    }
    request.user = session.user;
    request.sessionId = session.id;
    next();
  } catch (error) { next(error); }
}
