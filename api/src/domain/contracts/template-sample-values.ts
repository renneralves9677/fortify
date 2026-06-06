import type { TemplateFieldDef } from './template-renderer.js';
import { buildContractHtml } from './template-renderer.js';

const SAMPLE_BY_KEY: Record<string, string> = {
  CONTRATANTE_NOME: 'Empresa ABC Ltda',
  CONTRATANTE_DOCUMENTO: '12.345.678/0001-99',
  CONTRATADO_NOME: 'João Silva ME',
  CONTRATADO_DOCUMENTO: '123.456.789-00',
  OBJETO_CONTRATO:
    'Prestação de serviços de consultoria técnica conforme escopo acordado entre as partes.',
  VALOR_CONTRATO: '25000',
  DATA_INICIO: '2025-06-01',
  DATA_FIM: '2025-12-31',
  FORMA_PAGAMENTO: '50% na assinatura e 50% na entrega',
  CIDADE: 'São Paulo',
  parte: 'Construtora Beta Ltda',
  valor: '150000',
  endereco: 'Rua das Flores, 100 — São Paulo/SP',
};

export function buildSampleFieldValues(fields: TemplateFieldDef[]): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of fields) {
    if (field.fieldType === 'signature' || field.fieldType === 'auto') continue;
    values[field.key] =
      SAMPLE_BY_KEY[field.key] ??
      (field.fieldType === 'currency'
        ? '10000'
        : field.fieldType === 'date'
          ? '2025-06-01'
          : field.fieldType === 'cpf_cnpj'
            ? '12.345.678/0001-99'
            : `Exemplo: ${field.label}`);
  }
  return values;
}

export function previewTemplateHtml(bodyHtml: string, fields: TemplateFieldDef[]): string {
  const sampleValues = buildSampleFieldValues(fields);
  return buildContractHtml(bodyHtml, sampleValues, fields);
}
