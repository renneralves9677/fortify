import { describe, expect, it } from 'vitest';
import {
  isValidCnpj,
  isValidEmail,
  isValidPhone,
  normalizeCnpj,
  normalizePhone,
} from './br.js';

describe('br validators', () => {
  it('validates email', () => {
    expect(isValidEmail('admin@demo.fortify.local')).toBe(true);
    expect(isValidEmail('invalid')).toBe(false);
  });

  it('validates and normalizes phone', () => {
    expect(isValidPhone('(11) 98765-4321')).toBe(true);
    expect(normalizePhone('(11) 98765-4321')).toBe('5511987654321');
    expect(isValidPhone('123')).toBe(false);
  });

  it('validates and normalizes cnpj', () => {
    expect(isValidCnpj('11.444.777/0001-61')).toBe(true);
    expect(normalizeCnpj('11.444.777/0001-61')).toBe('11444777000161');
    expect(isValidCnpj('11.111.111/1111-11')).toBe(false);
  });
});
