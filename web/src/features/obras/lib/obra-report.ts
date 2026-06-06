import { api } from '@shared/lib/api';

export type ObraReportSection = 'roteiro' | 'vistorias' | 'custos' | 'oc' | 'resumo';

export const OBRA_REPORT_SECTIONS: { id: ObraReportSection; label: string }[] = [
  { id: 'roteiro', label: 'Roteiro' },
  { id: 'vistorias', label: 'Vistorias' },
  { id: 'custos', label: 'Custos' },
  { id: 'oc', label: 'Ordens de compra' },
  { id: 'resumo', label: 'Resumo financeiro' },
];

export type ObraReportOptions = {
  sections: ObraReportSection[];
  groupByStep: boolean;
  draft: boolean;
};

export type ObraReportModel = {
  obra: {
    id: string;
    name: string;
    address?: string | null;
    status: string;
    contract?: { title: string; partyName?: string } | null;
  };
  generatedAt: string;
  draft: boolean;
  sections: ObraReportSection[];
  groupByStep: boolean;
  budget: {
    planned: number;
    realized: number;
    committed: number;
    projected: number;
    available: number;
  };
  groups: {
    stepId: string | null;
    stepTitle: string;
    stepDone?: boolean;
    vistorias: {
      id: string;
      typeLabel: string;
      description: string;
      startedAt: string;
      endedAt: string;
      photoUrls: string[];
    }[];
    custos: {
      id: string;
      categoryLabel: string;
      description: string;
      amount: number;
      date: string;
    }[];
    purchaseOrders: {
      id: string;
      number: string;
      categoryLabel: string;
      description: string;
      amount: number;
      statusLabel: string;
    }[];
  }[];
  steps: { id: string; title: string; done: boolean; description?: string | null }[];
};

export async function fetchObraReportPreview(
  obraId: string,
  options: ObraReportOptions,
): Promise<ObraReportModel> {
  const res = await api.get<ObraReportModel>(obraReportPreviewPath(obraId, options));
  return res.data;
}

export function obraReportPreviewPath(obraId: string, options: ObraReportOptions): string {
  const params = new URLSearchParams();
  params.set('sections', options.sections.join(','));
  params.set('groupByStep', String(options.groupByStep));
  params.set('draft', String(options.draft));
  return `/obras/${obraId}/report/preview?${params.toString()}`;
}

export function obraReportHtmlPath(obraId: string, options: ObraReportOptions): string {
  const params = new URLSearchParams();
  params.set('sections', options.sections.join(','));
  params.set('groupByStep', String(options.groupByStep));
  params.set('draft', String(options.draft));
  return `/obras/${obraId}/report/html?${params.toString()}`;
}

export function obraReportPdfPath(obraId: string, options: ObraReportOptions): string {
  const params = new URLSearchParams();
  params.set('sections', options.sections.join(','));
  params.set('groupByStep', String(options.groupByStep));
  params.set('draft', String(options.draft));
  return `/obras/${obraId}/report/pdf?${params.toString()}`;
}

export async function downloadObraReportPdf(obraId: string, options: ObraReportOptions, filename: string) {
  const res = await api.get(obraReportPdfPath(obraId, options), { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function fetchObraReportHtml(obraId: string, options: ObraReportOptions): Promise<string> {
  const res = await api.get<string>(obraReportHtmlPath(obraId, options), {
    responseType: 'text' as never,
    transformResponse: [(d) => d],
  });
  return res.data;
}
