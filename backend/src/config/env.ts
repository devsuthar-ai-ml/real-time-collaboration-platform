import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z
    .string()
    .default('4000')
    .transform((value) => Number(value))
    .refine((value) => Number.isInteger(value) && value > 0, { message: 'PORT must be a number' }),
  DATABASE_URL: z
    .string()
    .default('postgresql://postgres:postgres@localhost:5432/collab_db?schema=public'),
  JWT_SECRET: z.string().default('development-secret-change-me').refine((value) => value.length >= 16, {
    message: 'JWT_SECRET must be at least 16 characters'
  }),
  JWT_EXPIRES_IN: z.string().default('1d'),
  CORS_ORIGIN: z.string().default('http://localhost:5173')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment variables: ${parsed.error.flatten().fieldErrors}`);
}

export const env = parsed.data;
