export type TemplateFieldDef = {
  key: string;
  label: string;
  fieldType: string;
  required?: boolean;
};

export type SignerDisplayInput = {
  role: string;
  status: string;
  signerName?: string | null;
  signatureImage?: string | null;
  signatureTyped?: string | null;
  signedAt?: Date | null;
};

const SIGNED_STATUSES = new Set(['SIGNED']);

export function signatureRoleFromKey(key: string): string | null {
  if (!key.startsWith('ASSINATURA_')) return null;
  return key.replace('ASSINATURA_', '');
}

export function signatureKeyFromRole(role: string): string {
  return `ASSINATURA_${role.toUpperCase()}`;
}

export function formatDateBr(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) return String(isoOrDate);
  return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

export function formatCurrencyBr(value: string): string {
  const normalized = value.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  const num = Number.parseFloat(normalized);
  if (Number.isNaN(num)) return value;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function mergeAutoFields(
  fieldValues: Record<string, string>,
  fields: TemplateFieldDef[],
): Record<string, string> {
  const merged = { ...fieldValues };
  const today = formatDateBr(new Date());
  for (const f of fields) {
    if (f.fieldType === 'auto' && !merged[f.key]?.trim()) {
      merged[f.key] = today;
    }
  }
  return merged;
}

export function renderManualFields(
  body: string,
  values: Record<string, string>,
  fields: TemplateFieldDef[],
): string {
  const signatureKeys = new Set(
    fields.filter((f) => f.fieldType === 'signature').map((f) => f.key),
  );
  return Object.entries(values).reduce((html, [key, val]) => {
    if (signatureKeys.has(key)) return html;
    let displayVal = val ?? '';
    const field = fields.find((f) => f.key === key);
    if (field?.fieldType === 'currency' && displayVal) {
      displayVal = formatCurrencyBr(displayVal);
    } else if (field?.fieldType === 'date' && displayVal) {
      displayVal = formatDateBr(displayVal);
    }
    return html.replaceAll(`{{${key}}}`, displayVal);
  }, body);
}

export function buildPendingSignatureBlock(key: string, label?: string): string {
  const role = signatureRoleFromKey(key) ?? key;
  const title = label ?? `ASSINATURA DO ${role}`;
  return `<div class="signature-block signature-block--pending" data-signature-key="${key}">
  <hr class="signature-block__divider"/>
  <p class="signature-block__title">${title}</p>
  <p class="signature-block__status">Pendente</p>
</div>`;
}

export function buildSignedSignatureBlock(
  key: string,
  signer: {
    signerName: string | null;
    signatureImage?: string | null;
    signatureTyped?: string | null;
    signedAt: Date | null;
    label?: string;
  },
): string {
  const role = signatureRoleFromKey(key) ?? key;
  const title = signer.label ?? `ASSINATURA DO ${role}`;
  const dateStr = signer.signedAt ? formatDateBr(signer.signedAt) : '';
  const sigContent = signer.signatureImage
    ? `<img class="signature-block__image" src="${signer.signatureImage}" alt="Assinatura de ${signer.signerName ?? ''}"/>`
    : signer.signatureTyped
      ? `<p class="signature-block__typed">${signer.signatureTyped}</p>`
      : '';
  return `<div class="signature-block signature-block--signed" data-signature-key="${key}">
  <hr class="signature-block__divider"/>
  <p class="signature-block__title">${title}</p>
  ${sigContent}
  <p class="signature-block__meta">${signer.signerName ?? ''}${dateStr ? ` · ${dateStr}` : ''}</p>
</div>`;
}

export function renderSignatureBlocks(body: string, signatureFields: TemplateFieldDef[]): string {
  let html = body;
  for (const f of signatureFields.filter((field) => field.fieldType === 'signature')) {
    const placeholder = `{{${f.key}}}`;
    if (html.includes(placeholder)) {
      html = html.replaceAll(placeholder, buildPendingSignatureBlock(f.key, f.label));
    }
  }
  return html;
}

export function buildContractHtml(
  templateBody: string,
  fieldValues: Record<string, string>,
  fields: TemplateFieldDef[],
): string {
  const merged = mergeAutoFields(fieldValues, fields);
  const afterManual = renderManualFields(templateBody, merged, fields);
  return renderSignatureBlocks(afterManual, fields);
}

export function renderDocumentForDisplay(
  frozenBodyHtml: string,
  signers: SignerDisplayInput[],
  signatureFields?: TemplateFieldDef[],
): string {
  let html = frozenBodyHtml;
  for (const signer of signers) {
    if (!SIGNED_STATUSES.has(signer.status)) continue;
    const key = signatureKeyFromRole(signer.role);
    const label = signatureFields?.find((f) => f.key === key)?.label;
    const signedBlock = buildSignedSignatureBlock(key, {
      signerName: signer.signerName ?? null,
      signatureImage: signer.signatureImage,
      signatureTyped: signer.signatureTyped,
      signedAt: signer.signedAt ?? null,
      label,
    });
    const pendingRegex = new RegExp(
      `<div class="signature-block signature-block--pending" data-signature-key="${key}"[^>]*>[\\s\\S]*?</div>`,
      'g',
    );
    html = html.replace(pendingRegex, signedBlock);
  }
  return html;
}

export function validateTemplateFieldValues(
  fields: TemplateFieldDef[],
  fieldValues: Record<string, string>,
): string[] {
  const errors: string[] = [];
  for (const f of fields) {
    if (f.fieldType === 'signature' || f.fieldType === 'auto') continue;
    if (f.required && !fieldValues[f.key]?.trim()) {
      errors.push(f.label || f.key);
    }
  }
  return errors;
}

export function getRequiredSignatureRoles(fields: TemplateFieldDef[]): string[] {
  return fields
    .filter((f) => f.fieldType === 'signature' && f.required)
    .map((f) => signatureRoleFromKey(f.key)!)
    .filter(Boolean);
}

export function getSignatureRolesFromTemplate(fields: TemplateFieldDef[]): Array<{
  role: string;
  key: string;
  label: string;
  required: boolean;
}> {
  return fields
    .filter((f) => f.fieldType === 'signature')
    .map((f) => ({
      role: signatureRoleFromKey(f.key) ?? f.key,
      key: f.key,
      label: f.label,
      required: f.required ?? false,
    }));
}

export function validateSignatureSigners(
  fields: TemplateFieldDef[],
  signers: { role: string }[],
): string | null {
  const required = getRequiredSignatureRoles(fields);
  for (const role of required) {
    const count = signers.filter((s) => s.role.toUpperCase() === role).length;
    if (count !== 1) {
      return `É necessário exatamente 1 signatário com papel ${role}`;
    }
  }
  return null;
}

/** @deprecated Use buildContractHtml for template-aware rendering */
export function renderTemplate(body: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (html, [key, val]) => html.replaceAll(`{{${key}}}`, val ?? ''),
    body,
  );
}
