import { Permission } from '@prisma/client';
import { z } from 'zod';

export const documentIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid()
  })
});

export const createDocumentSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(140),
    content: z.string().max(50000).optional().default('')
  })
});

export const updateDocumentSchema = z.object({
  params: z.object({
    id: z.string().uuid()
  }),
  body: z
    .object({
      title: z.string().trim().min(1).max(140).optional(),
      content: z.string().max(50000).optional()
    })
    .refine((data) => data.title !== undefined || data.content !== undefined, {
      message: 'At least one field must be provided'
    })
});

export const shareDocumentSchema = z.object({
  params: z.object({
    id: z.string().uuid()
  }),
  body: z.object({
    email: z.string().email(),
    permission: z.nativeEnum(Permission)
  })
});

export const restoreVersionSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
    versionId: z.string().uuid()
  })
});
