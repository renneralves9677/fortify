import jwt, { type SignOptions } from 'jsonwebtoken';

const secret = process.env.JWT_SECRET ?? 'dev-secret';
const accessExpiresIn = (process.env.JWT_ACCESS_EXPIRES_IN ??
  process.env.JWT_EXPIRES_IN ??
  '15m') as SignOptions['expiresIn'];

export interface JwtPayload {
  userId: string;
  companyId: string;
  email: string;
  role: string;
}

/** Access token (curto) — Bearer nas APIs. */
export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, secret, { expiresIn: accessExpiresIn });
}

/** @deprecated Use signAccessToken */
export function signToken(payload: JwtPayload): string {
  return signAccessToken(payload);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, secret) as JwtPayload;
}
