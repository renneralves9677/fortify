import type { ListQueryParams } from '@shared/types/pagination';

export type SignatureQueueStatusFilter =
  | 'ALL'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED';

export type SignatureQueueProgressFilter = 'PENDING' | 'PARTIAL';

export type SignatureQueueQueryParams = ListQueryParams & {
  status?: SignatureQueueStatusFilter;
  progress?: SignatureQueueProgressFilter;
};

export function signatureQueueQueryString(params: SignatureQueueQueryParams) {
  const q = new URLSearchParams();
  if (params.page) q.set('page', String(params.page));
  if (params.pageSize) q.set('pageSize', String(params.pageSize));
  if (params.search?.trim()) q.set('search', params.search.trim());
  if (params.status && params.status !== 'IN_PROGRESS') q.set('status', params.status);
  if (params.progress) q.set('progress', params.progress);
  const s = q.toString();
  return s ? `?${s}` : '';
}
