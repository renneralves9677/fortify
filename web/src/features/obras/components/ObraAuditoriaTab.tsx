import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { History } from 'lucide-react';
import { api } from '@shared/lib/api';
import { Card } from '@shared/components/ui/Card';
import { Select } from '@shared/components/ui/Input';
import { EmptyState } from '@shared/components/ui/EmptyState';
import { ListLoadingOverlay } from '@shared/components/ui/ListLoadingOverlay';
import { PageSkeleton } from '@shared/components/ui/PageLoader';
import { formatDateTime } from '@shared/lib/format';
import {
  AuditDetailModal,
  AuditLogListItem,
} from '@features/obras/components/AuditDetailModal';
import {
  auditActionGroupLabels,
  getAuditActionGroup,
  type AuditActionGroup,
  type ObraAuditLog,
} from '@features/obras/types';

type Props = {
  obraId: string;
};

type AuditFilter = AuditActionGroup | 'all';

export function ObraAuditoriaTab({ obraId }: Props) {
  const [selectedLog, setSelectedLog] = useState<ObraAuditLog | null>(null);
  const [filterGroup, setFilterGroup] = useState<AuditFilter>('all');

  const { data = [], isLoading, isFetching } = useQuery({
    queryKey: ['obra-audit', obraId],
    queryFn: async () => (await api.get<ObraAuditLog[]>(`/obras/${obraId}/audit`)).data,
    enabled: !!obraId,
  });

  const summary = useMemo(() => {
    const groups = { etapas: 0, custos: 0, vistorias: 0, oc: 0, outros: 0 };
    for (const log of data) {
      groups[getAuditActionGroup(log.action)] += 1;
    }
    return {
      total: data.length,
      lastAction: data[0]?.createdAt ?? null,
      groups,
    };
  }, [data]);

  const filteredLogs = useMemo(() => {
    if (filterGroup === 'all') return data;
    return data.filter((log) => getAuditActionGroup(log.action) === filterGroup);
  }, [data, filterGroup]);

  if (isLoading) return <PageSkeleton />;

  const filterActive = filterGroup !== 'all';
  const subtitle = filterActive
    ? `${filteredLogs.length} de ${data.length} registro${data.length === 1 ? '' : 's'}`
    : `${data.length} registro${data.length === 1 ? '' : 's'} de auditoria`;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Total de ações</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{summary.total}</p>
        </Card>
        <Card className="py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Última ação</p>
          <p className="mt-1 text-sm font-medium text-ink">
            {summary.lastAction ? formatDateTime(summary.lastAction) : '—'}
          </p>
        </Card>
        <Card className="py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Etapas</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{summary.groups.etapas}</p>
        </Card>
        <Card className="py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Custos e O.C.</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {summary.groups.custos + summary.groups.oc}
          </p>
        </Card>
      </div>

      {(summary.groups.vistorias > 0 || summary.groups.outros > 0) && (
        <Card className="py-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-muted">
            Por tipo de ação
          </p>
          <ul className="flex flex-wrap gap-2 text-sm">
            {summary.groups.etapas > 0 && (
              <li className="rounded-full bg-muted px-3 py-1 text-ink">
                Etapas: <strong>{summary.groups.etapas}</strong>
              </li>
            )}
            {summary.groups.custos > 0 && (
              <li className="rounded-full bg-muted px-3 py-1 text-ink">
                Custos: <strong>{summary.groups.custos}</strong>
              </li>
            )}
            {summary.groups.vistorias > 0 && (
              <li className="rounded-full bg-muted px-3 py-1 text-ink">
                Vistorias: <strong>{summary.groups.vistorias}</strong>
              </li>
            )}
            {summary.groups.oc > 0 && (
              <li className="rounded-full bg-muted px-3 py-1 text-ink">
                Ordens de compra: <strong>{summary.groups.oc}</strong>
              </li>
            )}
            {summary.groups.outros > 0 && (
              <li className="rounded-full bg-muted px-3 py-1 text-ink">
                Outras: <strong>{summary.groups.outros}</strong>
              </li>
            )}
          </ul>
        </Card>
      )}

      <ListLoadingOverlay loading={isFetching && !isLoading}>
      <Card className="flex max-h-[min(32rem,65vh)] flex-col">
        <div className="mb-4 shrink-0 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <History size={18} className="text-ink-muted" aria-hidden />
              <div>
                <h3 className="font-medium text-ink">Histórico de ações</h3>
                <p className="text-sm text-ink-muted">{subtitle}</p>
              </div>
            </div>
            <div className="w-full min-w-[12rem] sm:w-48">
              <Select
                label="Filtrar por tipo"
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value as AuditFilter)}
              >
                <option value="all">Todos os tipos</option>
                {(Object.entries(auditActionGroupLabels) as [AuditActionGroup, string][]).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ),
                )}
              </Select>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {!data.length ? (
            <EmptyState
              title="Nenhuma ação registrada"
              description="Alterações na obra, custos, vistorias e ordens de compra aparecerão aqui."
            />
          ) : !filteredLogs.length ? (
            <EmptyState
              title="Nenhuma ação deste tipo"
              description={`Não há registros de ${auditActionGroupLabels[filterGroup as AuditActionGroup]} nesta obra.`}
            />
          ) : (
            <ul className="space-y-3">
              {filteredLogs.map((log) => (
                <li key={log.id}>
                  <AuditLogListItem log={log} onOpen={() => setSelectedLog(log)} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
      </ListLoadingOverlay>

      <AuditDetailModal
        log={selectedLog}
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
      />
    </div>
  );
}
