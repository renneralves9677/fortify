import {
  AlertTriangle,
  ArrowUpDown,
  Building2,
  Camera,
  ClipboardList,
  Flag,
  History,
  ListChecks,
  User,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@shared/components/ui/dialog';
import { Badge } from '@shared/components/ui/Badge';
import {
  auditActionGroupLabels,
  getAuditActionGroup,
  getAuditDetailRows,
  obraAuditActionLabels,
  type ObraAuditLog,
} from '@features/obras/types';
import { formatDateTime } from '@shared/lib/format';

function auditActionIcon(action: string): LucideIcon {
  if (action === 'OBRA_CREATE' || action === 'OBRA_CLOSE') return Building2;
  if (action.startsWith('OBRA_STEP_')) {
    return action === 'OBRA_STEP_REORDER' ? ArrowUpDown : ListChecks;
  }
  if (action === 'OBRA_CUSTO_CREATE') return Wallet;
  if (action === 'OBRA_VISTORIA_CREATE') return Camera;
  if (action.startsWith('OBRA_OC_')) return ClipboardList;
  if (action.startsWith('OBRA_OCCURRENCE_')) return AlertTriangle;
  if (action === 'OBRA_NC_CREATE') return Flag;
  return History;
}

type AuditDetailModalProps = {
  log: ObraAuditLog | null;
  open: boolean;
  onClose: () => void;
};

export function AuditDetailModal({ log, open, onClose }: AuditDetailModalProps) {
  if (!log) return null;

  const label = obraAuditActionLabels[log.action] ?? log.action;
  const Icon = auditActionIcon(log.action);
  const rows = getAuditDetailRows(log.action, log.metadata);
  const referenceRows = rows.filter((row) => row.label.startsWith('ID '));
  const detailRows = rows.filter((row) => !row.label.startsWith('ID '));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle>{label}</DialogTitle>
            <Badge
              status="ATIVO"
              label={auditActionGroupLabels[getAuditActionGroup(log.action)]}
            />
          </div>
          <DialogDescription>{formatDateTime(log.createdAt)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-control border border-border bg-surface-sunken/50 px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Icon size={18} aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Executado por</p>
              <p className="mt-0.5 font-medium text-ink">
                {log.user?.name ?? 'Usuário desconhecido'}
              </p>
              {log.user?.email && (
                <p className="text-sm text-ink-muted">{log.user.email}</p>
              )}
            </div>
            <User size={16} className="shrink-0 text-ink-muted" aria-hidden />
          </div>

          {detailRows.length > 0 ? (
            <dl className="space-y-3 text-sm">
              {detailRows.map((row) => (
                <div key={row.label} className="border-b border-border pb-3 last:border-0 last:pb-0">
                  <dt className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                    {row.label}
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap leading-relaxed text-ink">{row.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="rounded-control border border-dashed border-border px-4 py-6 text-center text-sm text-ink-muted">
              Nenhum detalhe adicional registrado para esta ação.
            </p>
          )}

          {referenceRows.length > 0 && (
            <div className="rounded-control bg-muted/40 px-3 py-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
                Referências
              </p>
              <dl className="space-y-1 text-xs">
                {referenceRows.map((row) => (
                  <div key={row.label} className="flex flex-wrap justify-between gap-2">
                    <dt className="text-ink-muted">{row.label}</dt>
                    <dd className="font-mono text-ink">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AuditLogListItem({
  log,
  onOpen,
}: {
  log: ObraAuditLog;
  onOpen: () => void;
}) {
  const label = obraAuditActionLabels[log.action] ?? log.action;
  const Icon = auditActionIcon(log.action);
  const detail = getAuditDetailRows(log.action, log.metadata)
    .filter((row) => !row.label.startsWith('ID '))
    .slice(0, 2)
    .map((row) => row.value)
    .join(' · ');

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-start gap-3 rounded-lg border border-border p-4 text-left transition hover:border-brand/40 hover:bg-muted/30"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
        <Icon size={20} aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-ink">{label}</p>
            {detail && (
              <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{detail}</p>
            )}
            <p className="mt-2 text-xs text-ink-muted">
              {log.user ? `${log.user.name}` : 'Usuário desconhecido'}
            </p>
          </div>
          <time className="shrink-0 text-xs tabular-nums text-ink-muted">
            {formatDateTime(log.createdAt)}
          </time>
        </div>
        <p className="mt-2 text-xs text-brand">Ver detalhes →</p>
      </div>
    </button>
  );
}
