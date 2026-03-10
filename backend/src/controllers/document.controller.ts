import type { Request, Response } from 'express';
import { documentService } from '../services/document.service';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/httpError';

const requireUserId = (req: Request): string => {
  if (!req.user) {
    throw new AppError('Unauthorized', 401);
  }
  return req.user.id;
};

export const listDocuments = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const documents = await documentService.listDocuments(userId);
  res.status(200).json({ documents });
});

export const getDocument = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const document = await documentService.getDocumentById(userId, req.params.id);
  res.status(200).json({ document });
});

export const createDocument = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const document = await documentService.createDocument(userId, req.body);
  res.status(201).json({ document });
});

export const updateDocument = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const document = await documentService.updateDocument(userId, req.params.id, req.body);
  res.status(200).json({ document });
});

export const deleteDocument = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const result = await documentService.deleteDocument(userId, req.params.id);
  res.status(200).json(result);
});

export const shareDocument = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const document = await documentService.shareDocument(userId, req.params.id, req.body);
  res.status(200).json({ document });
});

export const listVersions = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const versions = await documentService.listVersions(userId, req.params.id);
  res.status(200).json({ versions });
});

export const restoreVersion = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const document = await documentService.restoreVersion(userId, req.params.id, req.params.versionId);
  res.status(200).json({ document });
});
