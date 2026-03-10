import http from 'http';
import { AddressInfo } from 'net';
import { Server } from 'socket.io';
import { io as ioc, Socket as ClientSocket } from 'socket.io-client';
import { registerCollaborationSocket } from '../src/sockets/collaboration.socket';

const waitForConnect = (socket: ClientSocket) =>
  new Promise<void>((resolve, reject) => {
    socket.on('connect', () => resolve());
    socket.on('connect_error', (error: Error) => reject(error));
  });

describe('Socket events', () => {
  let httpServer: http.Server;
  let ioServer: Server;
  let baseUrl: string;

  beforeAll(async () => {
    httpServer = http.createServer();
    ioServer = new Server(httpServer, {
      cors: { origin: '*' }
    });

    registerCollaborationSocket(ioServer, {
      verifyJwt: (token) => {
        if (token === 'invalid') {
          throw new Error('Invalid token');
        }
        return { sub: token, email: `${token}@example.com`, name: token, iat: 1, exp: 999999999 };
      },
      docs: {
        getDocumentById: jest.fn(async (_userId: string, documentId: string) => ({
          id: documentId,
          title: 'Doc',
          content: '',
          owner: { id: 'owner', name: 'Owner', email: 'owner@example.com' },
          currentUserPermission: 'WRITE',
          collaborators: [],
          createdAt: new Date(),
          updatedAt: new Date()
        })),
        updateContentFromSocket: jest.fn(async (_userId: string, documentId: string, content: string) => ({
          id: documentId,
          title: 'Doc',
          content,
          owner: { id: 'owner', name: 'Owner', email: 'owner@example.com' },
          currentUserPermission: 'WRITE',
          collaborators: [],
          createdAt: new Date(),
          updatedAt: new Date()
        })),
        assertReadAccess: jest.fn(async () => undefined),
        listDocuments: jest.fn(),
        createDocument: jest.fn(),
        updateDocument: jest.fn(),
        deleteDocument: jest.fn(),
        shareDocument: jest.fn(),
        listVersions: jest.fn(),
        restoreVersion: jest.fn()
      } as never
    });

    await new Promise<void>((resolve) => {
      httpServer.listen(() => resolve());
    });
    const { port } = httpServer.address() as AddressInfo;
    baseUrl = `http://localhost:${port}`;
  });

  afterAll(async () => {
    ioServer.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  it('should broadcast document updates to collaborators', async () => {
    const alice = ioc(baseUrl, {
      auth: { token: 'alice' },
      transports: ['websocket']
    });
    const bob = ioc(baseUrl, {
      auth: { token: 'bob' },
      transports: ['websocket']
    });

    await Promise.all([waitForConnect(alice), waitForConnect(bob)]);

    await new Promise<void>((resolve) => {
      bob.emit('document:join', { documentId: 'doc-1' }, () => resolve());
    });
    await new Promise<void>((resolve) => {
      alice.emit('document:join', { documentId: 'doc-1' }, () => resolve());
    });

    const updatePromise = new Promise<{ content: string }>((resolve) => {
      bob.on('document:update', (payload: { content: string }) => resolve(payload));
    });

    await new Promise<void>((resolve) => {
      alice.emit('document:update', { documentId: 'doc-1', content: 'Hello world' }, () => resolve());
    });

    const payload = await updatePromise;
    expect(payload.content).toBe('Hello world');

    alice.disconnect();
    bob.disconnect();
  });
});
