import { ContractType } from '@prisma/client';

export type DefaultTemplateField = {
  key: string;
  label: string;
  fieldType: string;
  required: boolean;
  sortOrder: number;
};

export type DefaultTemplateDef = {
  name: string;
  type: ContractType;
  description?: string;
  bodyHtml: string;
  fields: DefaultTemplateField[];
};

export const PRESTACAO_SERVICOS_BODY = `
<h1>CONTRATO DE PRESTAÇÃO DE SERVIÇOS</h1>

<h2>CONTRATANTE</h2>
<p><strong>{{CONTRATANTE_NOME}}</strong></p>
<p>CPF/CNPJ: {{CONTRATANTE_DOCUMENTO}}</p>

<h2>CONTRATADO</h2>
<p><strong>{{CONTRATADO_NOME}}</strong></p>
<p>CPF/CNPJ: {{CONTRATADO_DOCUMENTO}}</p>

<h2>OBJETO</h2>
<p>{{OBJETO_CONTRATO}}</p>

<h2>VALOR</h2>
<p>{{VALOR_CONTRATO}}</p>

<h2>PRAZO</h2>
<p>Início: {{DATA_INICIO}}</p>
<p>Término: {{DATA_FIM}}</p>

<h2>FORMA DE PAGAMENTO</h2>
<p>{{FORMA_PAGAMENTO}}</p>

<p>Local e Data: {{CIDADE}}, {{DATA_ASSINATURA}}</p>

<h2>Assinaturas</h2>
{{ASSINATURA_CONTRATANTE}}
{{ASSINATURA_CONTRATADO}}
`.trim();

export const PRESTACAO_SERVICOS_FIELDS: DefaultTemplateField[] = [
  { key: 'CONTRATANTE_NOME', label: 'Contratante', fieldType: 'text', required: true, sortOrder: 1 },
  { key: 'CONTRATANTE_DOCUMENTO', label: 'CPF/CNPJ contratante', fieldType: 'cpf_cnpj', required: true, sortOrder: 2 },
  { key: 'CONTRATADO_NOME', label: 'Contratado', fieldType: 'text', required: true, sortOrder: 3 },
  { key: 'CONTRATADO_DOCUMENTO', label: 'CPF/CNPJ contratado', fieldType: 'cpf_cnpj', required: true, sortOrder: 4 },
  { key: 'OBJETO_CONTRATO', label: 'Objeto do contrato', fieldType: 'textarea', required: true, sortOrder: 5 },
  { key: 'VALOR_CONTRATO', label: 'Valor', fieldType: 'currency', required: true, sortOrder: 6 },
  { key: 'DATA_INICIO', label: 'Data início', fieldType: 'date', required: true, sortOrder: 7 },
  { key: 'DATA_FIM', label: 'Data término', fieldType: 'date', required: true, sortOrder: 8 },
  { key: 'FORMA_PAGAMENTO', label: 'Forma de pagamento', fieldType: 'text', required: true, sortOrder: 9 },
  { key: 'CIDADE', label: 'Cidade', fieldType: 'text', required: false, sortOrder: 10 },
  { key: 'DATA_ASSINATURA', label: 'Data da assinatura', fieldType: 'auto', required: false, sortOrder: 11 },
  { key: 'ASSINATURA_CONTRATANTE', label: 'Assinatura do contratante', fieldType: 'signature', required: true, sortOrder: 12 },
  { key: 'ASSINATURA_CONTRATADO', label: 'Assinatura do contratado', fieldType: 'signature', required: true, sortOrder: 13 },
];

export function defaultTemplateKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function getDefaultTemplateByKey(key: string): DefaultTemplateDef | undefined {
  return DEFAULT_CONTRACT_TEMPLATES.find((t) => defaultTemplateKey(t.name) === key);
}

export function listDefaultTemplateCatalog() {
  return DEFAULT_CONTRACT_TEMPLATES.map((t) => ({
    key: defaultTemplateKey(t.name),
    name: t.name,
    type: t.type,
    description: t.description ?? null,
    fieldCount: t.fields.length,
    signatureFieldCount: t.fields.filter((f) => f.fieldType === 'signature').length,
  }));
}

export const DEFAULT_CONTRACT_TEMPLATES: DefaultTemplateDef[] = [
  {
    name: 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS',
    type: ContractType.SERVICO,
    description: 'Modelo Clicksign com variáveis e blocos de assinatura',
    bodyHtml: PRESTACAO_SERVICOS_BODY,
    fields: PRESTACAO_SERVICOS_FIELDS,
  },
  {
    name: 'Contrato de Obra',
    type: ContractType.OBRA,
    bodyHtml: '<h1>Contrato de Obra</h1><p>Obra em {{endereco}} — {{valor}}</p>',
    fields: [
      { key: 'endereco', label: 'Endereço', fieldType: 'text', required: true, sortOrder: 1 },
      { key: 'valor', label: 'Valor', fieldType: 'text', required: true, sortOrder: 2 },
    ],
  },
  {
    name: 'Contrato de Locação',
    type: ContractType.LOCACAO,
    bodyHtml: '<h1>Locação</h1><p>Locatário {{parte}}</p>',
    fields: [{ key: 'parte', label: 'Locatário', fieldType: 'text', required: true, sortOrder: 1 }],
  },
];
