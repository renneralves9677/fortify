import { VistoriaType } from '@prisma/client';
import { getCategoryLabel } from './cost-categories.js';
import { computeBudgetSummary } from './obra-budget.js';
import { resolvePhotoDataUris } from './obra-report-images.js';

export type ObraReportSection = 'roteiro' | 'vistorias' | 'custos' | 'oc' | 'resumo';

export const ALL_OBRA_REPORT_SECTIONS: ObraReportSection[] = [
  'roteiro',
  'vistorias',
  'custos',
  'oc',
  'resumo',
];

const VISTORIA_TYPE_LABELS: Record<VistoriaType, string> = {
  INICIAL: 'Inicial',
  INTERMEDIARIA: 'Intermediária',
  FINAL: 'Final',
  MANUTENCAO: 'Manutenção',
};

const PO_STATUS_LABELS: Record<string, string> = {
  RASCUNHO: 'Rascunho',
  APROVADA: 'Aprovada',
  RECEBIDA_PARCIAL: 'Recebida parcial',
  RECEBIDA: 'Recebida',
  CANCELADA: 'Cancelada',
};

export type ObraReportOptions = {
  sections: ObraReportSection[];
  groupByStep: boolean;
  draft: boolean;
};

type StepRow = {
  id: string;
  title: string;
  description?: string | null;
  done: boolean;
  sortOrder: number;
};

type VistoriaRow = {
  id: string;
  type: VistoriaType;
  description: string;
  photoUrls: string[];
  startedAt: Date;
  endedAt: Date;
  obraStepId?: string | null;
  obraStep?: { id: string; title: string } | null;
};

type CustoRow = {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: Date;
  obraStepId?: string | null;
  obraStep?: { id: string; title: string } | null;
  categoryLabel?: string;
};

type PurchaseOrderRow = {
  id: string;
  number: string;
  category: string;
  description: string;
  amount: number;
  receivedAmount: number;
  status: string;
  obraStepId?: string | null;
  obraStep?: { id: string; title: string } | null;
  categoryLabel?: string;
};

export type ObraReportVistoria = {
  id: string;
  type: string;
  typeLabel: string;
  description: string;
  startedAt: string;
  endedAt: string;
  photoUrls: string[];
  photoDataUris: { url: string; dataUri: string | null }[];
};

export type ObraReportCusto = {
  id: string;
  category: string;
  categoryLabel: string;
  description: string;
  amount: number;
  date: string;
};

export type ObraReportOrder = {
  id: string;
  number: string;
  categoryLabel: string;
  description: string;
  amount: number;
  receivedAmount: number;
  status: string;
  statusLabel: string;
};

export type ObraReportStepGroup = {
  stepId: string | null;
  stepTitle: string;
  stepDone?: boolean;
  stepDescription?: string | null;
  vistorias: ObraReportVistoria[];
  custos: ObraReportCusto[];
  purchaseOrders: ObraReportOrder[];
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
  budget: ReturnType<typeof computeBudgetSummary>;
  groups: ObraReportStepGroup[];
  steps: { id: string; title: string; done: boolean; description?: string | null }[];
};

type ObraInput = {
  id: string;
  name: string;
  address?: string | null;
  status: string;
  budgetPlanned: number;
  contract?: { title: string; partyName?: string } | null;
  steps: StepRow[];
  vistorias: VistoriaRow[];
  custos: CustoRow[];
  purchaseOrders: PurchaseOrderRow[];
};

function formatDateBr(d: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

function formatCurrencyBr(n: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

function mapVistoria(v: VistoriaRow, photos: ObraReportVistoria['photoDataUris']): ObraReportVistoria {
  return {
    id: v.id,
    type: v.type,
    typeLabel: VISTORIA_TYPE_LABELS[v.type] ?? v.type,
    description: v.description,
    startedAt: v.startedAt.toISOString(),
    endedAt: v.endedAt.toISOString(),
    photoUrls: v.photoUrls,
    photoDataUris: photos,
  };
}

function mapCusto(c: CustoRow): ObraReportCusto {
  return {
    id: c.id,
    category: c.category,
    categoryLabel: c.categoryLabel ?? getCategoryLabel(c.category as never),
    description: c.description,
    amount: c.amount,
    date: c.date.toISOString(),
  };
}

function mapOrder(o: PurchaseOrderRow): ObraReportOrder {
  return {
    id: o.id,
    number: o.number,
    categoryLabel: o.categoryLabel ?? getCategoryLabel(o.category as never),
    description: o.description,
    amount: o.amount,
    receivedAmount: o.receivedAmount,
    status: o.status,
    statusLabel: PO_STATUS_LABELS[o.status] ?? o.status,
  };
}

export async function buildObraReportModel(
  obra: ObraInput,
  companyId: string,
  options: ObraReportOptions,
): Promise<ObraReportModel> {
  const budgetRealized = obra.custos.reduce((s, c) => s + c.amount, 0);
  const budget = computeBudgetSummary({
    budgetPlanned: obra.budgetPlanned,
    budgetRealized,
    purchaseOrders: obra.purchaseOrders,
  });

  const show = (section: ObraReportSection) => options.sections.includes(section);

  const vistoriaPhotos = new Map<string, ObraReportVistoria['photoDataUris']>();
  if (show('vistorias')) {
    for (const v of obra.vistorias) {
      vistoriaPhotos.set(v.id, await resolvePhotoDataUris(v.photoUrls, companyId));
    }
  }

  const groups: ObraReportStepGroup[] = [];

  if (options.groupByStep) {
    const stepGroups: ObraReportStepGroup[] = obra.steps.map((step) => ({
      stepId: step.id,
      stepTitle: step.title,
      stepDone: step.done,
      stepDescription: step.description,
      vistorias: show('vistorias')
        ? obra.vistorias
            .filter((v) => v.obraStepId === step.id)
            .map((v) => mapVistoria(v, vistoriaPhotos.get(v.id) ?? []))
        : [],
      custos: show('custos')
        ? obra.custos.filter((c) => c.obraStepId === step.id).map(mapCusto)
        : [],
      purchaseOrders: show('oc')
        ? obra.purchaseOrders.filter((o) => o.obraStepId === step.id).map(mapOrder)
        : [],
    }));

    const generalGroup: ObraReportStepGroup = {
      stepId: null,
      stepTitle: 'Geral',
      vistorias: show('vistorias')
        ? obra.vistorias
            .filter((v) => !v.obraStepId)
            .map((v) => mapVistoria(v, vistoriaPhotos.get(v.id) ?? []))
        : [],
      custos: show('custos')
        ? obra.custos.filter((c) => !c.obraStepId).map(mapCusto)
        : [],
      purchaseOrders: show('oc')
        ? obra.purchaseOrders.filter((o) => !o.obraStepId).map(mapOrder)
        : [],
    };

    groups.push(...stepGroups);
    if (
      generalGroup.vistorias.length ||
      generalGroup.custos.length ||
      generalGroup.purchaseOrders.length
    ) {
      groups.push(generalGroup);
    }
  } else {
    groups.push({
      stepId: null,
      stepTitle: obra.name,
      vistorias: show('vistorias')
        ? obra.vistorias.map((v) => mapVistoria(v, vistoriaPhotos.get(v.id) ?? []))
        : [],
      custos: show('custos') ? obra.custos.map(mapCusto) : [],
      purchaseOrders: show('oc') ? obra.purchaseOrders.map(mapOrder) : [],
    });
  }

  return {
    obra: {
      id: obra.id,
      name: obra.name,
      address: obra.address,
      status: obra.status,
      contract: obra.contract ?? null,
    },
    generatedAt: new Date().toISOString(),
    draft: options.draft,
    sections: options.sections,
    groupByStep: options.groupByStep,
    budget,
    groups,
    steps: show('roteiro')
      ? obra.steps.map((s) => ({
          id: s.id,
          title: s.title,
          done: s.done,
          description: s.description,
        }))
      : [],
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildObraReportHtml(model: ObraReportModel): string {
  const { obra, draft, sections, budget } = model;
  const show = (section: ObraReportSection) => sections.includes(section);

  const draftWatermark = draft
    ? `<div class="watermark">Rascunho</div>`
    : '';

  const cover = `
    <header class="cover">
      <h1>${escapeHtml(obra.name)}</h1>
      ${obra.address ? `<p class="muted">${escapeHtml(obra.address)}</p>` : ''}
      ${obra.contract ? `<p><strong>Contrato:</strong> ${escapeHtml(obra.contract.title)}${obra.contract.partyName ? ` · ${escapeHtml(obra.contract.partyName)}` : ''}</p>` : ''}
      <p class="muted">Gerado em ${formatDateBr(new Date(model.generatedAt))}${draft ? ' · Rascunho' : ''}</p>
    </header>
  `;

  const resumo = show('resumo')
    ? `
    <section class="section">
      <h2>Resumo financeiro</h2>
      <table>
        <tr><th>Orçamento previsto</th><td>${formatCurrencyBr(budget.planned)}</td></tr>
        <tr><th>Realizado (custos)</th><td>${formatCurrencyBr(budget.realized)}</td></tr>
        <tr><th>Comprometido (O.C.)</th><td>${formatCurrencyBr(budget.committed)}</td></tr>
        <tr><th>Projetado total</th><td>${formatCurrencyBr(budget.projected)}</td></tr>
        ${budget.planned > 0 ? `<tr><th>Disponível</th><td>${formatCurrencyBr(budget.available)}</td></tr>` : ''}
      </table>
    </section>
  `
    : '';

  const roteiro = show('roteiro') && model.steps.length
    ? `
    <section class="section">
      <h2>Roteiro</h2>
      <ul class="step-list">
        ${model.steps
          .map(
            (s) =>
              `<li class="${s.done ? 'done' : ''}"><strong>${escapeHtml(s.title)}</strong> — ${s.done ? 'Concluída' : 'Pendente'}${s.description ? `<br/><span class="muted">${escapeHtml(s.description)}</span>` : ''}</li>`,
          )
          .join('')}
      </ul>
    </section>
  `
    : '';

  const groupSections = model.groups
    .map((group) => {
      const hasContent =
        group.vistorias.length || group.custos.length || group.purchaseOrders.length;
      if (!hasContent && model.groupByStep) return '';

      const stepHeader = model.groupByStep
        ? `<h2 class="group-title">${escapeHtml(group.stepTitle)}${group.stepDone !== undefined ? ` <span class="badge">${group.stepDone ? 'Concluída' : 'Pendente'}</span>` : ''}</h2>`
        : '';

      const vistoriasHtml =
        show('vistorias') && group.vistorias.length
          ? `
        <h3>Vistorias</h3>
        ${group.vistorias
          .map(
            (v) => `
          <article class="vistoria">
            <h4>${escapeHtml(v.typeLabel)} <span class="muted">${formatDateBr(new Date(v.startedAt))}${v.startedAt !== v.endedAt ? ` — ${formatDateBr(new Date(v.endedAt))}` : ''}</span></h4>
            <p>${escapeHtml(v.description)}</p>
            ${
              v.photoDataUris.length
                ? `<div class="photo-grid">${v.photoDataUris
                    .map(
                      (p) =>
                        p.dataUri
                          ? `<img src="${p.dataUri}" alt="Foto da vistoria" />`
                          : '',
                    )
                    .join('')}</div>`
                : ''
            }
          </article>
        `,
          )
          .join('')}
      `
          : '';

      const custosHtml =
        show('custos') && group.custos.length
          ? `
        <h3>Custos</h3>
        <table>
          <thead><tr><th>Categoria</th><th>Descrição</th><th>Data</th><th>Valor</th></tr></thead>
          <tbody>
            ${group.custos
              .map(
                (c) =>
                  `<tr><td>${escapeHtml(c.categoryLabel)}</td><td>${escapeHtml(c.description)}</td><td>${formatDateBr(new Date(c.date))}</td><td class="num">${formatCurrencyBr(c.amount)}</td></tr>`,
              )
              .join('')}
          </tbody>
        </table>
      `
          : '';

      const ocHtml =
        show('oc') && group.purchaseOrders.length
          ? `
        <h3>Ordens de compra</h3>
        <table>
          <thead><tr><th>Número</th><th>Categoria</th><th>Descrição</th><th>Status</th><th>Valor</th></tr></thead>
          <tbody>
            ${group.purchaseOrders
              .map(
                (o) =>
                  `<tr><td>${escapeHtml(o.number)}</td><td>${escapeHtml(o.categoryLabel)}</td><td>${escapeHtml(o.description)}</td><td>${escapeHtml(o.statusLabel)}</td><td class="num">${formatCurrencyBr(o.amount)}</td></tr>`,
              )
              .join('')}
          </tbody>
        </table>
      `
          : '';

      if (!vistoriasHtml && !custosHtml && !ocHtml && !model.groupByStep) return '';

      return `<section class="group">${stepHeader}${vistoriasHtml}${custosHtml}${ocHtml}</section>`;
    })
    .join('');

  return `
    ${draftWatermark}
    ${cover}
    ${resumo}
    ${roteiro}
    ${groupSections}
  `;
}

export const OBRA_REPORT_CSS = `
  * { box-sizing: border-box; }
  body {
    font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
    font-size: 11pt;
    line-height: 1.45;
    color: #0f172a;
    margin: 0;
    padding: 32px 40px;
    position: relative;
  }
  .watermark {
    position: fixed;
    top: 40%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-35deg);
    font-size: 72pt;
    font-weight: 700;
    color: rgba(148, 163, 184, 0.25);
    pointer-events: none;
    z-index: 0;
  }
  .cover { margin-bottom: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; }
  .cover h1 { margin: 0 0 8px; font-size: 22pt; }
  .muted { color: #64748b; }
  .section, .group { margin: 24px 0; page-break-inside: avoid; }
  h2 { font-size: 14pt; margin: 0 0 12px; color: #1e40af; }
  h3 { font-size: 12pt; margin: 16px 0 8px; }
  h4 { font-size: 11pt; margin: 0 0 6px; }
  .group-title { border-left: 4px solid #3b82f6; padding-left: 12px; }
  .badge { font-size: 9pt; background: #e2e8f0; padding: 2px 8px; border-radius: 4px; color: #475569; }
  .step-list { margin: 0; padding-left: 20px; }
  .step-list li { margin-bottom: 6px; }
  .step-list li.done { color: #64748b; text-decoration: line-through; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0 16px; font-size: 10pt; }
  th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
  th { background: #f1f5f9; }
  td.num { text-align: right; white-space: nowrap; }
  .vistoria { margin-bottom: 16px; padding: 12px; background: #f8fafc; border-radius: 8px; }
  .photo-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    margin-top: 10px;
  }
  .photo-grid img {
    width: 100%;
    max-height: 200px;
    object-fit: cover;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
  }
`;

export function wrapObraReportDocument(bodyHtml: string): string {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"/><style>${OBRA_REPORT_CSS}</style></head><body>${bodyHtml}</body></html>`;
}
