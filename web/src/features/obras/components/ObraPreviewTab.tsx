import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { api } from '@shared/lib/api';
import { Card } from '@shared/components/ui/Card';
import { Badge } from '@shared/components/ui/Badge';
import { ListLoadingOverlay } from '@shared/components/ui/ListLoadingOverlay';
import { PageSkeleton } from '@shared/components/ui/PageLoader';
import { QueryErrorState } from '@shared/components/ui/QueryErrorState';
import { getQueryErrorMessage } from '@shared/lib/query-errors';
import { formatCurrency, formatDate } from '@shared/lib/format';
import { UploadPreview, uploadIdFromUrl } from '@features/obras/components/VistoriaDetailModal';
import type { ObraReportModel } from '@features/obras/lib/obra-report';

type ObraPreviewTabProps = {
  obraId: string;
};

function GroupCard({ group }: { group: ObraReportModel['groups'][number] }) {
  const [open, setOpen] = useState(true);
  const hasContent =
    group.vistorias.length > 0 || group.custos.length > 0 || group.purchaseOrders.length > 0;
  if (!hasContent) return null;

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/30"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex min-w-0 items-center gap-2">
          {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          <h3 className="font-medium">{group.stepTitle}</h3>
          {group.stepDone !== undefined && (
            <Badge
              status={group.stepDone ? 'COMPLETED' : 'PENDENTE'}
              label={group.stepDone ? 'Concluída' : 'Pendente'}
            />
          )}
        </div>
      </button>

      {open && (
        <div className="space-y-4 border-t border-border px-4 py-4">
          {group.vistorias.length > 0 && (
            <section>
              <h4 className="mb-2 text-sm font-medium text-ink-muted">Vistorias</h4>
              <ul className="space-y-3">
                {group.vistorias.map((v) => {
                  const photoIds = v.photoUrls.map(uploadIdFromUrl).filter((id): id is string => !!id);
                  return (
                    <li key={v.id} className="rounded-control border border-border p-3">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <Badge status="ATIVO" label={v.typeLabel} />
                        <span className="text-sm text-ink-muted">
                          {formatDate(v.startedAt)}
                          {v.startedAt !== v.endedAt && ` — ${formatDate(v.endedAt)}`}
                        </span>
                      </div>
                      <p className="text-sm">{v.description}</p>
                      {photoIds.length > 0 && (
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          {photoIds.slice(0, 3).map((id) => (
                            <UploadPreview key={id} uploadId={id} className="aspect-square w-full" interactive={false} />
                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {group.custos.length > 0 && (
            <section>
              <h4 className="mb-2 text-sm font-medium text-ink-muted">Custos</h4>
              <ul className="space-y-1 text-sm">
                {group.custos.map((c) => (
                  <li key={c.id} className="flex justify-between gap-2">
                    <span className="min-w-0 truncate">
                      {c.categoryLabel} — {c.description}
                    </span>
                    <span className="shrink-0 tabular-nums">{formatCurrency(c.amount)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {group.purchaseOrders.length > 0 && (
            <section>
              <h4 className="mb-2 text-sm font-medium text-ink-muted">Ordens de compra</h4>
              <ul className="space-y-1 text-sm">
                {group.purchaseOrders.map((o) => (
                  <li key={o.id} className="flex justify-between gap-2">
                    <span className="min-w-0 truncate">
                      {o.number} — {o.description}
                    </span>
                    <span className="shrink-0 tabular-nums">{formatCurrency(o.amount)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </Card>
  );
}

export function ObraPreviewTab({ obraId }: ObraPreviewTabProps) {
  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['obra-report-preview', obraId],
    queryFn: async () => {
      const params = new URLSearchParams({
        sections: 'roteiro,vistorias,custos,oc,resumo',
        groupByStep: 'true',
        draft: 'true',
      });
      const res = await api.get<ObraReportModel>(`/obras/${obraId}/report/preview?${params}`);
      return res.data;
    },
  });

  if (isLoading) return <PageSkeleton />;
  if (isError) {
    return (
      <QueryErrorState
        compact
        title="Não foi possível carregar o preview"
        description={getQueryErrorMessage(error)}
        onRetry={() => refetch()}
        retrying={isFetching}
      />
    );
  }
  if (!data) return <PageSkeleton />;

  return (
    <ListLoadingOverlay loading={isFetching && !isLoading} className="space-y-4">
      <Card className="py-3 text-sm">
        <p className="text-ink-muted">Resumo financeiro</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <span className="text-ink-muted">Realizado</span>
            <p className="font-medium">{formatCurrency(data.budget.realized)}</p>
          </div>
          <div>
            <span className="text-ink-muted">Comprometido</span>
            <p className="font-medium">{formatCurrency(data.budget.committed)}</p>
          </div>
          <div>
            <span className="text-ink-muted">Projetado</span>
            <p className="font-medium">{formatCurrency(data.budget.projected)}</p>
          </div>
          {data.budget.planned > 0 && (
            <div>
              <span className="text-ink-muted">Orçamento</span>
              <p className="font-medium">{formatCurrency(data.budget.planned)}</p>
            </div>
          )}
        </div>
      </Card>

      {data.steps.length > 0 && (
        <Card>
          <h3 className="mb-3 font-medium">Roteiro</h3>
          <ul className="space-y-1 text-sm">
            {data.steps.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2">
                <span className={s.done ? 'text-ink-muted line-through' : ''}>{s.title}</span>
                <Badge status={s.done ? 'COMPLETED' : 'PENDENTE'} label={s.done ? 'Concluída' : 'Pendente'} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      {data.groups.map((group) => (
        <GroupCard key={group.stepId ?? 'geral'} group={group} />
      ))}
    </ListLoadingOverlay>
  );
}
