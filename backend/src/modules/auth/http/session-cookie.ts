import type { Response } from 'express';
import { SESSION_COOKIE } from '../services/session.service.js';

/**
 * Cookie de sessão: `httpOnly` (JavaScript não lê), `SameSite=Lax` (bloqueia
 * navegação cross-site para escrita) e `Secure` em produção.
 */
export function setSessionCookie(res: Response, token: string, expiresAt: Date): void {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    path: '/',
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}
