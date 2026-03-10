import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import type { AuthTokenPayload } from '../types/express';

interface SignTokenPayload {
  userId: string;
  email: string;
  name: string;
}

export const signToken = (payload: SignTokenPayload): string => {
  const options: SignOptions = {
    subject: payload.userId,
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn']
  };

  return jwt.sign(
    {
      email: payload.email,
      name: payload.name
    },
    env.JWT_SECRET as Secret,
    options
  );
};

export const verifyToken = (token: string): AuthTokenPayload => {
  const decoded = jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
  if (!decoded.sub || !decoded.email || !decoded.name) {
    throw new Error('Invalid token payload');
  }
  return decoded;
};
