import { api } from '@shared/lib/api';
import type { PaginatedResponse } from '@shared/types/pagination';

export type ContractStatus =
  | 'RASCUNHO'
  | 'REVISAO'
  | 'APROVACAO'
  | 'ENVIO'
  | 'AGUARDANDO_ASSINATURA'
  | 'ASSINADO'
  | 'ATIVO'
  | 'VENCENDO'
  | 'RENOVACAO'
  | 'ENCERRADO'
  | 'ARQUIVADO'
  | 'CANCELADO'
  | 'EXPIRADO';

export type ContractType = 'SERVICO' | 'TRABALHO' | 'OBRA' | 'LOCACAO';

export const contractTypeLabels: Record<ContractType, string> = {
  SERVICO: 'Serviço',
  TRABALHO: 'Trabalho',
  OBRA: 'Obra',
  LOCACAO: 'Locação',
};

export const contractStatusOptions: ContractStatus[] = [
  'RASCUNHO',
  'REVISAO',
  'APROVACAO',
  'ENVIO',
  'AGUARDANDO_ASSINATURA',
  'ATIVO',
  'VENCENDO',
  'RENOVACAO',
  'ENCERRADO',
  'ARQUIVADO',
  'CANCELADO',
  'EXPIRADO',
];

export type ContractRow = {
  id: string;
  title: string;
  partyName: string;
  value: number;
  status: string;
  startDate?: string;
  endDate?: string;
};

export type ContractsListParams = {
  page?: number;
  pageSize?: number;
  status?: ContractStatus;
  type?: ContractType;
  title?: string;
  partyName?: string;
  periodFrom?: string;
  periodTo?: string;
};

export type ContractsFilterValues = Omit<ContractsListParams, 'page' | 'pageSize'>;

export function contractsQueryString(params: ContractsListParams) {
  const q = new URLSearchParams();
  if (params.page) q.set('page', String(params.page));
  if (params.pageSize) q.set('pageSize', String(params.pageSize));
  if (params.status) q.set('status', params.status);
  if (params.type) q.set('type', params.type);
  if (params.title?.trim()) q.set('title', params.title.trim());
  if (params.partyName?.trim()) q.set('partyName', params.partyName.trim());
  if (params.periodFrom) q.set('periodFrom', params.periodFrom);
  if (params.periodTo) q.set('periodTo', params.periodTo);
  const s = q.toString();
  return s ? `?${s}` : '';
}

export function listContracts(params: ContractsListParams) {
  return api
    .get<PaginatedResponse<ContractRow>>(`/contracts${contractsQueryString(params)}`)
    .then((r) => r.data);
}

export function closeContract(id: string) {
  return api.post(`/contracts/${id}/close`).then((r) => r.data);
}
