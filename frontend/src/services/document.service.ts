import { api } from './api';
import type { DocumentEntity, VersionEntity } from '../types';

export const documentService = {
  async list() {
    const response = await api.get<{ documents: DocumentEntity[] }>('/documents');
    return response.data.documents;
  },

  async create(payload: { title: string; content?: string }) {
    const response = await api.post<{ document: DocumentEntity }>('/documents', payload);
    return response.data.document;
  },

  async get(documentId: string) {
    const response = await api.get<{ document: DocumentEntity }>(`/documents/${documentId}`);
    return response.data.document;
  },

  async update(documentId: string, payload: { title?: string; content?: string }) {
    const response = await api.put<{ document: DocumentEntity }>(`/documents/${documentId}`, payload);
    return response.data.document;
  },

  async remove(documentId: string) {
    await api.delete(`/documents/${documentId}`);
  },

  async share(documentId: string, payload: { email: string; permission: 'READ' | 'WRITE' }) {
    const response = await api.post<{ document: DocumentEntity }>(
      `/documents/${documentId}/share`,
      payload
    );
    return response.data.document;
  },

  async listVersions(documentId: string) {
    const response = await api.get<{ versions: VersionEntity[] }>(`/documents/${documentId}/versions`);
    return response.data.versions;
  },

  async restoreVersion(documentId: string, versionId: string) {
    const response = await api.post<{ document: DocumentEntity }>(
      `/documents/${documentId}/versions/${versionId}/restore`
    );
    return response.data.document;
  }
};
