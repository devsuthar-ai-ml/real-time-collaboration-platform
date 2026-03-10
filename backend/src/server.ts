import http from 'http';
import { Server } from 'socket.io';
import { app } from './app';
import { env } from './config/env';
import { registerCollaborationSocket } from './sockets/collaboration.socket';
import { prisma } from './lib/prisma';

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: env.CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

registerCollaborationSocket(io);

httpServer.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend running on port ${env.PORT}`);
});

const gracefulShutdown = async () => {
  io.close();
  httpServer.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
