export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type ListQueryParams = {
  page?: number;
  pageSize?: number;
  search?: string;
};

export type ReportListQueryParams = ListQueryParams & {
  from?: string;
  to?: string;
};

export function listQueryString(params: ListQueryParams) {
  const q = new URLSearchParams();
  if (params.page) q.set('page', String(params.page));
  if (params.pageSize) q.set('pageSize', String(params.pageSize));
  if (params.search?.trim()) q.set('search', params.search.trim());
  const s = q.toString();
  return s ? `?${s}` : '';
}

export function reportQueryString(params: ReportListQueryParams) {
  const q = new URLSearchParams();
  if (params.page) q.set('page', String(params.page));
  if (params.pageSize) q.set('pageSize', String(params.pageSize));
  if (params.from) q.set('from', params.from);
  if (params.to) q.set('to', params.to);
  const s = q.toString();
  return s ? `?${s}` : '';
}
