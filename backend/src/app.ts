import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import apiRoutes from './routes';
import { env } from './config/env';
import { apiLimiter, authLimiter } from './middlewares/rateLimiter.middleware';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true
  })
);
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter);

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'realtime-collab-backend'
  });
});

app.use('/api', apiRoutes);
app.use(notFoundHandler);
app.use(errorHandler);
