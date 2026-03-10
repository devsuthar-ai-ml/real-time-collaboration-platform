import type { Server, Socket } from 'socket.io';
import { AppError } from '../utils/httpError';
import { verifyToken } from '../utils/jwt';
import { documentService } from '../services/document.service';

interface SocketUser {
  id: string;
  name: string;
  email: string;
}

interface SocketData {
  user?: SocketUser;
  joinedDocuments?: Set<string>;
}

interface JoinPayload {
  documentId: string;
}

interface UpdatePayload {
  documentId: string;
  content: string;
}

interface CursorPayload {
  documentId: string;
  position: number;
  selectionStart?: number;
  selectionEnd?: number;
}

interface SocketDeps {
  verifyJwt: typeof verifyToken;
  docs: typeof documentService;
}

const defaultDeps: SocketDeps = {
  verifyJwt: verifyToken,
  docs: documentService
};

const getTokenFromSocket = (socket: Socket): string => {
  const authToken = socket.handshake.auth.token as string | undefined;
  if (authToken) {
    return authToken;
  }

  const authHeader = socket.handshake.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.replace('Bearer ', '').trim();
  }

  return '';
};

const ensureSocketUser = (socket: Socket): SocketUser => {
  const data = socket.data as SocketData;
  if (!data.user) {
    throw new AppError('Unauthorized', 401);
  }
  return data.user;
};

const roomName = (documentId: string) => `document:${documentId}`;

export const registerCollaborationSocket = (io: Server, deps: SocketDeps = defaultDeps): void => {
  io.use((socket, next) => {
    try {
      const token = getTokenFromSocket(socket);
      if (!token) {
        throw new AppError('Missing token', 401);
      }

      const payload = deps.verifyJwt(token);
      (socket.data as SocketData).user = {
        id: payload.sub,
        email: payload.email,
        name: payload.name
      };
      (socket.data as SocketData).joinedDocuments = new Set();
      next();
    } catch (_error) {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket: Socket) => {
    socket.on('document:join', async (payload: JoinPayload, callback?: (response: unknown) => void) => {
      try {
        const user = ensureSocketUser(socket);
        const document = await deps.docs.getDocumentById(user.id, payload.documentId);
        socket.join(roomName(payload.documentId));
        (socket.data as SocketData).joinedDocuments?.add(payload.documentId);

        socket.to(roomName(payload.documentId)).emit('notification:collaborator-joined', {
          documentId: payload.documentId,
          user: { id: user.id, name: user.name }
        });

        callback?.({
          ok: true,
          document
        });
      } catch (error) {
        callback?.({
          ok: false,
          message: error instanceof Error ? error.message : 'Join failed'
        });
      }
    });

    socket.on('document:update', async (payload: UpdatePayload, callback?: (response: unknown) => void) => {
      try {
        const user = ensureSocketUser(socket);
        if (!(socket.data as SocketData).joinedDocuments?.has(payload.documentId)) {
          throw new AppError('Join the document first', 400);
        }

        const updatedDocument = await deps.docs.updateContentFromSocket(
          user.id,
          payload.documentId,
          payload.content
        );

        socket.to(roomName(payload.documentId)).emit('document:update', {
          documentId: payload.documentId,
          content: updatedDocument.content,
          updatedAt: updatedDocument.updatedAt,
          updatedBy: {
            id: user.id,
            name: user.name
          }
        });

        callback?.({
          ok: true,
          updatedAt: updatedDocument.updatedAt
        });
      } catch (error) {
        callback?.({
          ok: false,
          message: error instanceof Error ? error.message : 'Update failed'
        });
      }
    });

    socket.on('cursor:update', async (payload: CursorPayload) => {
      try {
        const user = ensureSocketUser(socket);
        if (!(socket.data as SocketData).joinedDocuments?.has(payload.documentId)) {
          return;
        }
        await deps.docs.assertReadAccess(user.id, payload.documentId);

        socket.to(roomName(payload.documentId)).emit('cursor:update', {
          documentId: payload.documentId,
          user: {
            id: user.id,
            name: user.name
          },
          position: payload.position,
          selectionStart: payload.selectionStart,
          selectionEnd: payload.selectionEnd
        });
      } catch (_error) {
        // Ignore cursor errors to keep the realtime channel resilient.
      }
    });

    socket.on('disconnect', () => {
      (socket.data as SocketData).joinedDocuments?.clear();
    });
  });
};
