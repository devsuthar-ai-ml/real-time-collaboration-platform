export interface User {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
}

export type Permission = 'READ' | 'WRITE' | 'OWNER';

export interface Collaborator {
  id: string;
  permission: 'READ' | 'WRITE';
  user: User;
}

export interface DocumentEntity {
  id: string;
  title: string;
  content: string;
  owner: User;
  currentUserPermission: Permission;
  collaborators: Collaborator[];
  createdAt: string;
  updatedAt: string;
}

export interface VersionEntity {
  id: string;
  versionNumber: number;
  content: string;
  createdAt: string;
  createdBy: User;
}

export interface CursorEventPayload {
  documentId: string;
  user: {
    id: string;
    name: string;
  };
  position: number;
  selectionStart?: number;
  selectionEnd?: number;
}
