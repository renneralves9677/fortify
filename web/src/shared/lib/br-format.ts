export function stripDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function isValidEmail(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
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

export function formatPhone(value: string): string {
  let digits = stripDigits(value);
  if (digits.startsWith('55') && digits.length > 11) {
    digits = digits.slice(2);
  }
  digits = digits.slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

export function formatCpf(value: string): string {
  const digits = stripDigits(value).slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function formatCpfCnpj(value: string): string {
  const digits = stripDigits(value);
  return digits.length <= 11 ? formatCpf(value) : formatCnpj(value);
}

export function formatCnpj(value: string): string {
  const digits = stripDigits(value).slice(0, 14);
  if (!digits) return '';
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

export function getSignerFieldErrors(input: { name: string; email: string; phone: string }) {
  const errors: { name?: string; email?: string; phone?: string } = {};
  if (input.name.trim().length < 2) {
    errors.name = 'Informe o nome completo';
  }

  const hasEmail = input.email.trim().length > 0;
  const hasPhone = stripDigits(input.phone).length > 0;

  if (!hasEmail && !hasPhone) {
    errors.email = 'Informe e-mail ou telefone';
  } else {
    if (hasEmail && !isValidEmail(input.email)) {
      errors.email = 'E-mail inválido';
    }
    if (hasPhone && !isValidPhone(input.phone)) {
      errors.phone = 'Telefone inválido';
    }
  }

  return errors;
}

export function hasSignerFieldErrors(input: { name: string; email: string; phone: string }) {
  return Object.keys(getSignerFieldErrors(input)).length > 0;
}
