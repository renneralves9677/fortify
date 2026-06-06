import { describe, it, expect } from 'vitest';
import { hashDocument } from '../signatures/document-hash.js';
import {
  buildContractHtml,
  buildPendingSignatureBlock,
  mergeAutoFields,
  renderDocumentForDisplay,
  renderManualFields,
  signatureKeyFromRole,
  validateSignatureSigners,
  validateTemplateFieldValues,
} from './template-renderer.js';

const fields = [
  { key: 'CONTRATANTE_NOME', label: 'Contratante', fieldType: 'text', required: true },
  { key: 'VALOR_CONTRATO', label: 'Valor', fieldType: 'currency', required: true },
  { key: 'DATA_ASSINATURA', label: 'Data', fieldType: 'auto', required: false },
  { key: 'ASSINATURA_CONTRATANTE', label: 'Assinatura do contratante', fieldType: 'signature', required: true },
  { key: 'ASSINATURA_CONTRATADO', label: 'Assinatura do contratado', fieldType: 'signature', required: true },
];

describe('template-renderer', () => {
  it('renderManualFields replaces only manual keys and formats currency', () => {
    const body = 'Cliente: {{CONTRATANTE_NOME}} · Valor: {{VALOR_CONTRATO}} · {{ASSINATURA_CONTRATANTE}}';
    const html = renderManualFields(
      body,
      { CONTRATANTE_NOME: 'ABC Ltda', VALOR_CONTRATO: '25000' },
      fields,
    );
    expect(html).toContain('ABC Ltda');
    expect(html).toContain('R$');
    expect(html).toContain('{{ASSINATURA_CONTRATANTE}}');
  });

  it('mergeAutoFields fills DATA_ASSINATURA', () => {
    const merged = mergeAutoFields({}, fields);
    expect(merged.DATA_ASSINATURA).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it('buildContractHtml produces pending signature blocks', () => {
    const template = '<p>{{CONTRATANTE_NOME}}</p>{{ASSINATURA_CONTRATANTE}}';
    const html = buildContractHtml(
      template,
      { CONTRATANTE_NOME: 'Empresa X' },
      fields.filter((f) => f.key !== 'ASSINATURA_CONTRATADO'),
    );
    expect(html).toContain('Empresa X');
    expect(html).toContain('signature-block--pending');
    expect(html).toContain('data-signature-key="ASSINATURA_CONTRATANTE"');
    expect(html).not.toContain('{{ASSINATURA_CONTRATANTE}}');
  });

  it('renderDocumentForDisplay overlays signed blocks without changing frozen hash base', () => {
    const frozen = buildContractHtml(
      '<p>Texto</p>{{ASSINATURA_CONTRATANTE}}',
      { CONTRATANTE_NOME: 'A' },
      fields.filter((f) => f.key !== 'ASSINATURA_CONTRATADO' && f.key !== 'VALOR_CONTRATO'),
    );
    const frozenHash = hashDocument(frozen);
    const display = renderDocumentForDisplay(frozen, [
      {
        role: 'CONTRATANTE',
        status: 'SIGNED',
        signerName: 'João Silva',
        signatureTyped: 'João Silva',
        signedAt: new Date('2025-06-05'),
      },
    ]);
    expect(display).toContain('signature-block--signed');
    expect(display).toContain('João Silva');
    expect(hashDocument(frozen)).toBe(frozenHash);
    expect(hashDocument(display)).not.toBe(frozenHash);
  });

  it('validateTemplateFieldValues flags missing required manual fields', () => {
    const errors = validateTemplateFieldValues(fields, {});
    expect(errors).toContain('Contratante');
    expect(errors).toContain('Valor');
  });

  it('validateSignatureSigners requires exactly one signer per role', () => {
    expect(
      validateSignatureSigners(fields, [
        { role: 'CONTRATANTE' },
        { role: 'CONTRATADO' },
      ]),
    ).toBeNull();
    expect(
      validateSignatureSigners(fields, [{ role: 'CONTRATANTE' }]),
    ).toMatch(/CONTRATADO/);
  });

  it('signatureKeyFromRole normalizes role', () => {
    expect(signatureKeyFromRole('contratante')).toBe('ASSINATURA_CONTRATANTE');
  });

  it('buildPendingSignatureBlock uses label when provided', () => {
    const block = buildPendingSignatureBlock('ASSINATURA_CONTRATANTE', 'Assinatura do contratante');
    expect(block).toContain('Assinatura do contratante');
  });
});
