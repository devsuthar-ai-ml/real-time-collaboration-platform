import { Permission, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/httpError';

type RequiredPermission = 'read' | 'write';

interface CreateDocumentInput {
  title: string;
  content?: string;
}

interface UpdateDocumentInput {
  title?: string;
  content?: string;
}

interface ShareDocumentInput {
  email: string;
  permission: Permission;
}

class DocumentService {
  async listDocuments(userId: string) {
    const documents = await prisma.document.findMany({
      where: {
        OR: [{ ownerId: userId }, { collaborators: { some: { userId } } }]
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true }
        },
        collaborators: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    return documents.map((document) => {
      const selfCollab = document.collaborators.find((collaborator) => collaborator.userId === userId);
      const currentUserPermission =
        document.ownerId === userId ? 'OWNER' : (selfCollab?.permission ?? Permission.READ);

      return {
        id: document.id,
        title: document.title,
        content: document.content,
        owner: document.owner,
        currentUserPermission,
        collaborators: document.collaborators.map((collaborator) => ({
          id: collaborator.id,
          permission: collaborator.permission,
          user: collaborator.user
        })),
        createdAt: document.createdAt,
        updatedAt: document.updatedAt
      };
    });
  }

  async getDocumentById(userId: string, documentId: string) {
    const document = await this.getAccessibleDocument(userId, documentId, 'read');
    return this.toDocumentResponse(document);
  }

  async createDocument(userId: string, input: CreateDocumentInput) {
    const content = input.content ?? '';
    const created = await prisma.$transaction(async (tx) => {
      const document = await tx.document.create({
        data: {
          title: input.title.trim(),
          content,
          ownerId: userId
        }
      });

      await tx.version.create({
        data: {
          documentId: document.id,
          content,
          versionNumber: 1,
          createdById: userId
        }
      });

      return document;
    });

    return this.getDocumentById(userId, created.id);
  }

  async updateDocument(userId: string, documentId: string, input: UpdateDocumentInput) {
    const accessibleDocument = await this.getAccessibleDocument(userId, documentId, 'write');

    const nextTitle = input.title?.trim();
    const nextContent = input.content;
    const shouldUpdateContent =
      typeof nextContent === 'string' && nextContent !== accessibleDocument.document.content;

    const updatedDocumentId = await prisma.$transaction(async (tx) => {
      if (nextTitle && nextTitle !== accessibleDocument.document.title) {
        await tx.document.update({
          where: { id: documentId },
          data: { title: nextTitle }
        });
      }

      if (shouldUpdateContent) {
        await this.persistVersionedContent(tx, documentId, userId, nextContent ?? '');
      }

      return documentId;
    });

    return this.getDocumentById(userId, updatedDocumentId);
  }

  async updateContentFromSocket(userId: string, documentId: string, content: string) {
    await this.getAccessibleDocument(userId, documentId, 'write');
    const updatedDocument = await prisma.$transaction((tx) =>
      this.persistVersionedContent(tx, documentId, userId, content)
    );
    return this.getDocumentById(userId, updatedDocument.id);
  }

  async deleteDocument(userId: string, documentId: string) {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { id: true, ownerId: true }
    });

    if (!document) {
      throw new AppError('Document not found', 404);
    }
    if (document.ownerId !== userId) {
      throw new AppError('Only the owner can delete this document', 403);
    }

    await prisma.document.delete({
      where: { id: documentId }
    });
    return { success: true };
  }

  async shareDocument(userId: string, documentId: string, input: ShareDocumentInput) {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { ownerId: true }
    });

    if (!document) {
      throw new AppError('Document not found', 404);
    }
    if (document.ownerId !== userId) {
      throw new AppError('Only the owner can share this document', 403);
    }

    const userToShareWith = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() }
    });
    if (!userToShareWith) {
      throw new AppError('Target user not found', 404);
    }
    if (userToShareWith.id === userId) {
      throw new AppError('Owner already has access', 400);
    }

    await prisma.collaborator.upsert({
      where: {
        documentId_userId: {
          documentId,
          userId: userToShareWith.id
        }
      },
      update: {
        permission: input.permission,
        sharedById: userId
      },
      create: {
        documentId,
        userId: userToShareWith.id,
        permission: input.permission,
        sharedById: userId
      }
    });

    return this.getDocumentById(userId, documentId);
  }

  async listVersions(userId: string, documentId: string) {
    await this.getAccessibleDocument(userId, documentId, 'read');

    const versions = await prisma.version.findMany({
      where: { documentId },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: {
        versionNumber: 'desc'
      }
    });

    return versions.map((version) => ({
      id: version.id,
      versionNumber: version.versionNumber,
      content: version.content,
      createdAt: version.createdAt,
      createdBy: version.createdBy
    }));
  }

  async restoreVersion(userId: string, documentId: string, versionId: string) {
    await this.getAccessibleDocument(userId, documentId, 'write');
    const version = await prisma.version.findFirst({
      where: {
        id: versionId,
        documentId
      }
    });

    if (!version) {
      throw new AppError('Version not found', 404);
    }

    await prisma.$transaction((tx) =>
      this.persistVersionedContent(tx, documentId, userId, version.content, true)
    );

    return this.getDocumentById(userId, documentId);
  }

  async assertReadAccess(userId: string, documentId: string) {
    await this.getAccessibleDocument(userId, documentId, 'read');
  }

  private async getAccessibleDocument(userId: string, documentId: string, permission: RequiredPermission) {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        owner: {
          select: { id: true, name: true, email: true }
        },
        collaborators: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    });

    if (!document) {
      throw new AppError('Document not found', 404);
    }

    const isOwner = document.ownerId === userId;
    const collaborator = document.collaborators.find((entry) => entry.userId === userId);

    if (!isOwner && !collaborator) {
      throw new AppError('Access denied', 403);
    }
    if (
      permission === 'write' &&
      !isOwner &&
      (!collaborator || collaborator.permission !== Permission.WRITE)
    ) {
      throw new AppError('Write access required', 403);
    }

    return { document, collaborator, isOwner };
  }

  private async persistVersionedContent(
    tx: Prisma.TransactionClient,
    documentId: string,
    userId: string,
    content: string,
    force = false
  ): Promise<{ id: string }> {
    const currentDocument = await tx.document.findUnique({
      where: { id: documentId },
      select: { id: true, content: true, title: true, ownerId: true, createdAt: true, updatedAt: true }
    });
    if (!currentDocument) {
      throw new AppError('Document not found', 404);
    }
    if (!force && currentDocument.content === content) {
      return { id: currentDocument.id };
    }

    const latestVersion = await tx.version.aggregate({
      where: { documentId },
      _max: { versionNumber: true }
    });
    const versionNumber = (latestVersion._max.versionNumber ?? 0) + 1;

    const updatedDocument = await tx.document.update({
      where: { id: documentId },
      data: { content }
    });

    await tx.version.create({
      data: {
        documentId,
        content,
        versionNumber,
        createdById: userId
      }
    });

    return { id: updatedDocument.id };
  }

  private toDocumentResponse(payload: {
    document: {
      id: string;
      title: string;
      content: string;
      ownerId: string;
      owner: { id: string; name: string; email: string };
      collaborators: Array<{
        id: string;
        permission: Permission;
        user: { id: string; name: string; email: string };
      }>;
      createdAt: Date;
      updatedAt: Date;
    };
    collaborator?: { permission: Permission } | null;
    isOwner: boolean;
  }) {
    return {
      id: payload.document.id,
      title: payload.document.title,
      content: payload.document.content,
      owner: payload.document.owner,
      currentUserPermission: payload.isOwner
        ? 'OWNER'
        : (payload.collaborator?.permission ?? Permission.READ),
      collaborators: payload.document.collaborators.map((collaborator) => ({
        id: collaborator.id,
        permission: collaborator.permission,
        user: collaborator.user
      })),
      createdAt: payload.document.createdAt,
      updatedAt: payload.document.updatedAt
    };
  }
}

export const documentService = new DocumentService();
