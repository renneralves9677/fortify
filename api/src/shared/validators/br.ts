import { z } from 'zod';

export function stripDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function isValidEmail(value: string): boolean {
  return z.string().email().safeParse(value.trim()).success;
}

export function isValidCnpj(value: string): boolean {
  const digits = stripDigits(value);
  if (digits.length !== 14) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  const calcDigit = (base: string, weights: number[]) => {
    const sum = base.split('').reduce((acc, digit, index) => acc + Number(digit) * weights[index], 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  const first = calcDigit(digits.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = calcDigit(`${digits.slice(0, 12)}${first}`, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return digits.endsWith(`${first}${second}`);
}

export function isValidPhone(value: string): boolean {
  let digits = stripDigits(value);
  if (digits.startsWith('55') && digits.length >= 12) {
    digits = digits.slice(2);
  }
  if (digits.length !== 10 && digits.length !== 11) return false;

  const areaCode = Number(digits.slice(0, 2));
  if (areaCode < 11 || areaCode > 99) return false;
  if (digits.length === 11 && digits[2] !== '9') return false;
  return true;
}

export function normalizePhone(value: string): string {
  const digits = stripDigits(value);
  if (!digits) return '';
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) return digits;
  return digits;
}

export function normalizeCnpj(value: string): string {
  return stripDigits(value);
}

export const optionalEmailSchema = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().email('E-mail inválido').optional(),
);

export const optionalPhoneSchema = z.preprocess(
  (value) => (typeof value === 'string' && stripDigits(value) === '' ? undefined : value),
  z
    .string()
    .transform(normalizePhone)
    .refine((value) => !!value && isValidPhone(value), 'Telefone inválido')
    .optional(),
);

export const cnpjSchema = z
  .string()
  .transform(normalizeCnpj)
  .refine(isValidCnpj, 'CNPJ inválido');

export const optionalCnpjSchema = z.preprocess(
  (value) => (typeof value === 'string' && stripDigits(value) === '' ? undefined : value),
  z
    .string()
    .transform(normalizeCnpj)
    .refine(isValidCnpj, 'CNPJ inválido')
    .optional(),
);
