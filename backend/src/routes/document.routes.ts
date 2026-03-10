import { Router } from 'express';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import {
  createDocument,
  deleteDocument,
  getDocument,
  listDocuments,
  listVersions,
  restoreVersion,
  shareDocument,
  updateDocument
} from '../controllers/document.controller';
import {
  createDocumentSchema,
  documentIdParamSchema,
  restoreVersionSchema,
  shareDocumentSchema,
  updateDocumentSchema
} from '../models/document.model';

const router = Router();

router.use(authenticateJWT);
router.get('/', listDocuments);
router.post('/', validate(createDocumentSchema), createDocument);
router.get('/:id', validate(documentIdParamSchema), getDocument);
router.put('/:id', validate(updateDocumentSchema), updateDocument);
router.delete('/:id', validate(documentIdParamSchema), deleteDocument);
router.post('/:id/share', validate(shareDocumentSchema), shareDocument);
router.get('/:id/versions', validate(documentIdParamSchema), listVersions);
router.post('/:id/versions/:versionId/restore', validate(restoreVersionSchema), restoreVersion);

export default router;
