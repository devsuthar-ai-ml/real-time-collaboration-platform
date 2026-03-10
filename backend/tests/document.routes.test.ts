import request from 'supertest';
import { app } from '../src/app';
import { signToken } from '../src/utils/jwt';
import { documentService } from '../src/services/document.service';

jest.mock('../src/services/document.service', () => ({
  documentService: {
    listDocuments: jest.fn(),
    getDocumentById: jest.fn(),
    createDocument: jest.fn(),
    updateDocument: jest.fn(),
    deleteDocument: jest.fn(),
    shareDocument: jest.fn(),
    listVersions: jest.fn(),
    restoreVersion: jest.fn(),
    updateContentFromSocket: jest.fn(),
    assertReadAccess: jest.fn()
  }
}));

const mockedDocumentService = documentService as jest.Mocked<typeof documentService>;

describe('Document Routes', () => {
  const token = signToken({
    userId: 'user-1',
    email: 'owner@example.com',
    name: 'Owner User'
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a document for authenticated user', async () => {
    mockedDocumentService.createDocument.mockResolvedValue({
      id: 'doc-1',
      title: 'Team Plan',
      content: '',
      owner: { id: 'user-1', name: 'Owner User', email: 'owner@example.com' },
      currentUserPermission: 'OWNER',
      collaborators: [],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const response = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Team Plan',
        content: ''
      });

    expect(response.status).toBe(201);
    expect(response.body.document.title).toBe('Team Plan');
    expect(mockedDocumentService.createDocument).toHaveBeenCalledWith('user-1', {
      title: 'Team Plan',
      content: ''
    });
  });
});
