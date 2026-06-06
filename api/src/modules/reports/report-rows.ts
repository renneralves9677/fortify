import type { ContractStatus } from '@prisma/client';

export type ContractReportSource = {
  id: string;
  title: string;
  partyName: string;
  status: ContractStatus;
  value: { toString(): string };
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
};

export type ObraReportSource = {
  id: string;
  name: string;
  status: string;
  budgetPlanned: { toString(): string };
  createdAt: Date;
};

export type ContractReportRow = {
  id: string;
  title: string;
  partyName: string;
  status: string;
  value: number;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
};

export type ObraReportRow = {
  id: string;
  name: string;
  status: string;
  budgetPlanned: number;
  createdAt: string;
};

export const CONTRACT_REPORT_COLUMNS = [
  'id',
  'title',
  'partyName',
  'status',
  'value',
  'startDate',
  'endDate',
  'createdAt',
] as const;

export const OBRA_REPORT_COLUMNS = ['id', 'name', 'status', 'budgetPlanned', 'createdAt'] as const;

export const CONTRACT_REPORT_HEADERS = [
  'ID',
  'Título',
  'Parte',
  'Status',
  'Valor',
  'Início vigência',
  'Fim vigência',
  'Criado em',
];

export const OBRA_REPORT_HEADERS = ['ID', 'Nome', 'Status', 'Orçamento', 'Criado em'];

function toIsoDate(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

export function mapContractToReportRow(contract: ContractReportSource): ContractReportRow {
  return {
    id: contract.id,
    title: contract.title,
    partyName: contract.partyName,
    status: contract.status,
    value: Number(contract.value),
    startDate: toIsoDate(contract.startDate),
    endDate: toIsoDate(contract.endDate),
    createdAt: contract.createdAt.toISOString(),
  };
}

export function mapObraToReportRow(obra: ObraReportSource): ObraReportRow {
  return {
    id: obra.id,
    name: obra.name,
    status: obra.status,
    budgetPlanned: Number(obra.budgetPlanned),
    createdAt: obra.createdAt.toISOString(),
  };
}

export function contractRowToCells(row: ContractReportRow): string[] {
  return [
    row.id,
    row.title,
    row.partyName,
    row.status,
    String(row.value),
    row.startDate ?? '',
    row.endDate ?? '',
    row.createdAt,
  ];
}

export function obraRowToCells(row: ObraReportRow): string[] {
  return [row.id, row.name, row.status, String(row.budgetPlanned), row.createdAt];
}
