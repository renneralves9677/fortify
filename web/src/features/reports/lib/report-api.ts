import { api } from '@shared/lib/api';
import type { ExportReportParams } from '@shared/components/reports/ExportReportModal';
import type { PaginatedResponse, ReportListQueryParams } from '@shared/types/pagination';
import { reportQueryString } from '@shared/types/pagination';

export type ReportType = 'contracts' | 'obras';

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

const LIST_PATHS: Record<ReportType, string> = {
  contracts: '/report/contracts',
  obras: '/report/obras',
};

const EXPORT_PATHS: Record<ReportType, string> = {
  contracts: '/export/contracts',
  obras: '/export/obras',
};

const EXPORT_BASE_NAMES: Record<ReportType, string> = {
  contracts: 'contratos',
  obras: 'obras',
};

export async function fetchReportList<T>(
  type: ReportType,
  params: ReportListQueryParams,
): Promise<PaginatedResponse<T>> {
  const res = await api.get<PaginatedResponse<T>>(`${LIST_PATHS[type]}${reportQueryString(params)}`);
  return res.data;
}

function buildExportQuery(params: ExportReportParams) {
  const q = new URLSearchParams();
  q.set('format', params.format);
  if (params.from) q.set('from', params.from);
  if (params.to) q.set('to', params.to);
  return `?${q.toString()}`;
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function filenameFromDisposition(header: string | undefined, fallback: string): string {
  if (!header) return fallback;
  const match = /filename=([^;]+)/i.exec(header);
  if (!match) return fallback;
  return match[1].trim().replace(/^"|"$/g, '');
}

export async function downloadReportExport(type: ReportType, params: ExportReportParams) {
  const res = await api.get(`${EXPORT_PATHS[type]}${buildExportQuery(params)}`, {
    responseType: 'blob',
  });
  const ext = params.format === 'xlsx' ? 'xlsx' : params.format;
  const dateSuffix = new Date().toISOString().slice(0, 10);
  const fallback = `${EXPORT_BASE_NAMES[type]}-${dateSuffix}.${ext}`;
  const filename = filenameFromDisposition(
    res.headers['content-disposition'] as string | undefined,
    fallback,
  );
  triggerBlobDownload(res.data, filename);
}
