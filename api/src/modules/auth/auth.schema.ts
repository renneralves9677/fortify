import { z } from 'zod';
import { cnpjSchema } from '../../shared/validators/br.js';

const acceptLegalSchema = z.literal(true, {
  errorMap: () => ({ message: 'Aceite os Termos e a Política de Privacidade' }),
});

const codeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'Código deve ter 6 dígitos');

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  companyId: z.string().uuid().optional(),
  acceptLegal: acceptLegalSchema.optional(),
});

export const signupSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome'),
  companyName: z.string().trim().min(2, 'Informe o nome da empresa'),
  companyCnpj: cnpjSchema,
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
  password: z.string().min(8, 'A senha deve ter ao menos 8 caracteres'),
  acceptLegal: acceptLegalSchema,
});

export const signupVerifySchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  code: codeSchema,
});

export const resendCodeSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export const verifyResetCodeSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  code: codeSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(10, 'Token inválido'),
  password: z.string().min(8, 'A senha deve ter ao menos 8 caracteres'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type SignupVerifyInput = z.infer<typeof signupVerifySchema>;
export type ResendCodeInput = z.infer<typeof resendCodeSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type VerifyResetCodeInput = z.infer<typeof verifyResetCodeSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
