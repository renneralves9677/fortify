const baseTabs = ['Roteiro', 'Custos', 'Vistorias', 'O.C.'] as const;
export type ObraTab = (typeof baseTabs)[number] | 'Auditoria' | 'Preview';

export function getObraTabs(isAdmin: boolean): ObraTab[] {
  if (isAdmin) return [...baseTabs, 'Auditoria', 'Preview'];
  return [...baseTabs, 'Preview'];
}

export function canEditObra(isAdmin: boolean, status: string): boolean {
  return isAdmin && status !== 'encerrada';
}

export type ObraRecordCreator = {
  id: string;
  name: string;
  email: string;
} | null;

export type ObraCusto = {
  id: string;
  category: string;
  categoryLabel?: string;
  description: string;
  amount: number;
  date: string;
  purchaseOrderId?: string | null;
  createdBy?: ObraRecordCreator;
};

export type ObraPurchaseOrder = {
  id: string;
  number: string;
  category?: string;
  categoryLabel?: string;
  payerCnpj: string;
  description: string;
  amount: number;
  receivedAmount?: number;
  status: string;
  requiresApproval?: boolean;
  poApprovalThreshold?: number;
  approvedAt?: string | null;
  createdAt?: string;
  createdBy?: ObraRecordCreator;
};

export type ObraStep = {
  id: string;
  title: string;
  description?: string | null;
  done: boolean;
  sortOrder: number;
};

export type ObraAuditLog = {
  id: string;
  action: string;
  createdAt: string;
  metadata: Record<string, unknown> | null;
  user: { id: string; name: string; email: string } | null;
};

export const obraAuditActionLabels: Record<string, string> = {
  OBRA_CREATE: 'Obra criada',
  OBRA_CLOSE: 'Obra encerrada',
  OBRA_STEP_CREATE: 'Etapa criada',
  OBRA_STEP_UPDATE: 'Etapa atualizada',
  OBRA_STEP_REORDER: 'Etapas reordenadas',
  OBRA_STEP_DELETE: 'Etapa removida',
  OBRA_CUSTO_CREATE: 'Custo lançado',
  OBRA_VISTORIA_CREATE: 'Vistoria registrada',
  OBRA_OC_CREATE: 'Ordem de compra emitida',
  OBRA_OC_APPROVE: 'Ordem de compra aprovada',
  OBRA_OC_RECEIVE: 'Recebimento de O.C. registrado',
  OBRA_OCCURRENCE_CREATE: 'Ocorrência registrada',
  OBRA_OCCURRENCE_RESOLVE: 'Ocorrência resolvida',
  OBRA_NC_CREATE: 'Não conformidade registrada',
};

const vistoriaTypeLabels: Record<string, string> = {
  INICIAL: 'Inicial',
  INTERMEDIARIA: 'Intermediária',
  FINAL: 'Final',
  MANUTENCAO: 'Manutenção',
};

const auditIdLabels: Record<string, string> = {
  stepId: 'ID da etapa',
  custoId: 'ID do custo',
  vistoriaId: 'ID da vistoria',
  orderId: 'ID da ordem',
  occurrenceId: 'ID da ocorrência',
  nonConformityId: 'ID da não conformidade',
};

export type AuditDetailRow = { label: string; value: string };

function formatAuditValue(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map((item) => formatAuditValue(item)).join(', ');
  return String(value ?? '');
}

export function formatAuditDetail(action: string, metadata: Record<string, unknown> | null): string {
  const rows = getAuditDetailRows(action, metadata);
  return rows
    .filter((row) => !row.label.startsWith('ID '))
    .slice(0, 2)
    .map((row) => row.value)
    .join(' · ');
}

export function getAuditDetailRows(
  action: string,
  metadata: Record<string, unknown> | null,
): AuditDetailRow[] {
  if (!metadata) return [];

  const rows: AuditDetailRow[] = [];
  const add = (label: string, key: string, format?: (value: unknown) => string) => {
    const raw = metadata[key];
    if (raw === undefined || raw === null || raw === '') return;
    rows.push({ label, value: format ? format(raw) : formatAuditValue(raw) });
  };

  switch (action) {
    case 'OBRA_CREATE':
    case 'OBRA_CLOSE':
      add('Obra', 'name');
      if (Array.isArray(metadata.warnings) && metadata.warnings.length > 0) {
        rows.push({
          label: 'Avisos no encerramento',
          value: (metadata.warnings as unknown[]).map((w) => formatAuditValue(w)).join('; '),
        });
      }
      break;
    case 'OBRA_STEP_CREATE':
    case 'OBRA_STEP_UPDATE':
    case 'OBRA_STEP_DELETE':
      add('Etapa', 'title');
      add('Descrição', 'description');
      if (metadata.done !== undefined) {
        rows.push({ label: 'Status da etapa', value: metadata.done ? 'Concluída' : 'Pendente' });
      }
      break;
    case 'OBRA_STEP_REORDER':
      if (Array.isArray(metadata.stepIds)) {
        rows.push({
          label: 'Etapas reordenadas',
          value: `${metadata.stepIds.length} etapa(s)`,
        });
      }
      break;
    case 'OBRA_CUSTO_CREATE':
      add('Categoria', 'category');
      add('Descrição', 'description');
      add('Valor', 'amount', (value) =>
        typeof value === 'number'
          ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
          : formatAuditValue(value),
      );
      break;
    case 'OBRA_VISTORIA_CREATE':
      add('Tipo', 'type', (value) => vistoriaTypeLabels[String(value)] ?? String(value));
      add('Descrição', 'description');
      break;
    case 'OBRA_OC_CREATE':
      add('Número', 'number');
      add('Descrição', 'description');
      add('Valor', 'amount', (value) =>
        typeof value === 'number'
          ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
          : formatAuditValue(value),
      );
      break;
    case 'OBRA_OC_APPROVE':
      add('Número', 'number');
      add('Valor', 'amount', (value) =>
        typeof value === 'number'
          ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
          : formatAuditValue(value),
      );
      break;
    case 'OBRA_OC_RECEIVE':
      add('Número', 'number');
      add('Valor recebido', 'receivedAmount', (value) =>
        typeof value === 'number'
          ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
          : formatAuditValue(value),
      );
      add('Total recebido', 'totalReceived', (value) =>
        typeof value === 'number'
          ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
          : formatAuditValue(value),
      );
      break;
    case 'OBRA_OCCURRENCE_CREATE':
      add('Título', 'title');
      add('Severidade', 'severity');
      break;
    case 'OBRA_OCCURRENCE_RESOLVE':
      break;
    case 'OBRA_NC_CREATE':
      add('Descrição', 'description');
      break;
    default:
      for (const [key, value] of Object.entries(metadata)) {
        if (value === undefined || value === null || value === '') continue;
        rows.push({ label: key, value: formatAuditValue(value) });
      }
      return rows;
  }

  for (const [key, label] of Object.entries(auditIdLabels)) {
    add(label, key);
  }

  return rows;
}

export type AuditActionGroup = 'etapas' | 'custos' | 'vistorias' | 'oc' | 'outros';

export const auditActionGroupLabels: Record<AuditActionGroup, string> = {
  etapas: 'Etapas',
  custos: 'Custos',
  vistorias: 'Vistorias',
  oc: 'Ordens de compra',
  outros: 'Outras',
};

export function getAuditActionGroup(action: string): AuditActionGroup {
  if (action.startsWith('OBRA_STEP_')) return 'etapas';
  if (action === 'OBRA_CUSTO_CREATE') return 'custos';
  if (action === 'OBRA_VISTORIA_CREATE') return 'vistorias';
  if (action.startsWith('OBRA_OC_')) return 'oc';
  return 'outros';
}
