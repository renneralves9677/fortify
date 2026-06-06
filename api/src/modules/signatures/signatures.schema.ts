import { z } from 'zod';
import { SignatureChannel, SignatureFlowMode, SignatureFlowStatus } from '@prisma/client';
import { paginationQuerySchema } from '../../shared/pagination.js';
import { contractIdParamSchema, flowIdParamSchema } from '../../shared/params.js';

export { contractIdParamSchema, flowIdParamSchema };
import { optionalEmailSchema, optionalPhoneSchema } from '../../shared/validators/br.js';

export const signatureQueueStatusFilterSchema = z.enum([
  'ALL',
  ...Object.values(SignatureFlowStatus),
] as [string, ...string[]]);

export const signatureQueueProgressFilterSchema = z.enum(['PENDING', 'PARTIAL']);

export const signatureQueueQuerySchema = paginationQuerySchema.extend({
  status: signatureQueueStatusFilterSchema.optional(),
  progress: signatureQueueProgressFilterSchema.optional(),
});

export type SignatureQueueQuery = z.infer<typeof signatureQueueQuerySchema>;

export const sendSignatureSchema = z.object({
  channel: z.nativeEnum(SignatureChannel),
  recipient: z.string().min(3),
});

export type SendSignatureInput = z.infer<typeof sendSignatureSchema>;

export const signPublicSchema = z.object({
  signerName: z.string().min(2),
});

export type SignPublicInput = z.infer<typeof signPublicSchema>;

export const flowSignerSchema = z
  .object({
    name: z.string().min(2),
    role: z.string().min(1).default('signatario'),
    email: optionalEmailSchema,
    phone: optionalPhoneSchema,
    channel: z.nativeEnum(SignatureChannel),
    recipient: z.string().min(3),
  })
  .refine((s) => !!(s.email || s.phone), {
    message: 'Informe e-mail ou telefone',
  });

export const createFlowSchema = z.object({
  signMode: z.nativeEnum(SignatureFlowMode).default(SignatureFlowMode.PARALLEL),
  signers: z.array(flowSignerSchema).min(1).max(10),
});

export type CreateFlowInput = z.infer<typeof createFlowSchema>;

export const consentPublicSchema = z.object({
  acceptTerms: z.literal(true),
  termsVersion: z.string().min(1),
  privacyVersion: z.string().min(1),
});

export type ConsentPublicInput = z.infer<typeof consentPublicSchema>;

export const signFlowPublicSchema = z.object({
  signerName: z.string().min(2),
  scrollPercent: z.number().min(95).max(100),
  acceptTerms: z.literal(true),
  signatureImage: z.string().min(20).optional(),
  signatureTyped: z.string().min(2).optional(),
}).refine((d) => d.signatureImage || d.signatureTyped, {
  message: 'Informe assinatura desenhada ou digitada',
});

export type SignFlowPublicInput = z.infer<typeof signFlowPublicSchema>;

export const verifyOtpSchema = z.object({
  code: z.string().length(6),
});

export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
