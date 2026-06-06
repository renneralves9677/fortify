import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DataTable } from '@shared/components/ui/DataTable';
import { Badge } from '@shared/components/ui/Badge';
import { Button } from '@shared/components/ui/Button';
import { EmptyState } from '@shared/components/ui/EmptyState';
import { PageSkeleton } from '@shared/components/ui/PageLoader';
import { QueryErrorState } from '@shared/components/ui/QueryErrorState';
import { getQueryErrorMessage } from '@shared/lib/query-errors';
import { useConfirm } from '@shared/components/ConfirmProvider';
import { formatCurrency, formatDate, statusLabels } from '@shared/lib/format';
import { useIsAdmin } from '@/stores/auth-store';
import {
  closeContract,
  listContracts,
  type ContractStatus,
  type ContractType,
  type ContractsFilterValues,
} from '@features/contracts/api/contracts';
import { ContractsFilters } from '@features/contracts/components/ContractsFilters';

const PAGE_SIZE = 10;

const FILTER_KEYS = ['status', 'type', 'title', 'partyName', 'periodFrom', 'periodTo'] as const;

function parseFilters(params: URLSearchParams): ContractsFilterValues {
  const status = params.get('status');
  const type = params.get('type');
  return {
    ...(status ? { status: status as ContractStatus } : {}),
    ...(type ? { type: type as ContractType } : {}),
    ...(params.get('title') ? { title: params.get('title')! } : {}),
    ...(params.get('partyName') ? { partyName: params.get('partyName')! } : {}),
    ...(params.get('periodFrom') ? { periodFrom: params.get('periodFrom')! } : {}),
    ...(params.get('periodTo') ? { periodTo: params.get('periodTo')! } : {}),
  };
}

function filtersToParams(filters: ContractsFilterValues): URLSearchParams {
  const next = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const value = filters[key];
    if (value) next.set(key, value);
  }
  return next;
}

export function ContractsList() {
  const isAdmin = useIsAdmin();
  const confirm = useConfirm();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();

  const page = Math.max(1, Number(params.get('page')) || 1);
  const filters = useMemo(() => parseFilters(params), [params]);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['contracts', page, filters],
    queryFn: () => listContracts({ page, pageSize: PAGE_SIZE, ...filters }),
  });

  const close = useMutation({
    mutationFn: closeContract,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contracts'] });
    },
    meta: { successMessage: 'Contrato encerrado' },
  });

  function setFilters(next: ContractsFilterValues) {
    const search = filtersToParams(next);
    setParams(search, { replace: true });
  }

  function setPage(nextPage: number) {
    const search = new URLSearchParams(params);
    if (nextPage <= 1) {
      search.delete('page');
    } else {
      search.set('page', String(nextPage));
    }
    setParams(search, { replace: true });
  }

  if (isLoading && !data) return <PageSkeleton />;
  if (isError && !data) {
    return (
      <QueryErrorState
        description={getQueryErrorMessage(error)}
        onRetry={() => refetch()}
        retrying={isFetching}
      />
    );
  }

  const items = data?.items ?? [];
  const closableStatuses = new Set(['ATIVO', 'VENCENDO']);

  return (
    <DataTable
      title="Todos os contratos"
      count={data?.total ?? 0}
      filters={<ContractsFilters values={filters} onChange={setFilters} />}
      pagination={
        data
          ? {
              page: data.page,
              totalPages: data.totalPages,
              total: data.total,
              pageSize: data.pageSize,
              onPageChange: setPage,
            }
          : undefined
      }
      columns={[
        { key: 'title', label: 'Título' },
        { key: 'party', label: 'Parte' },
        { key: 'value', label: 'Valor', className: 'text-right tabular-nums' },
        { key: 'status', label: 'Status' },
        { key: 'dates', label: 'Vigência' },
        ...(isAdmin ? [{ key: 'actions', label: 'Ações', className: 'text-right' }] : []),
      ]}
      rows={items.map((c) => ({
        title: (
          <Link to={`/contratos/${c.id}`} className="font-medium text-brand hover:underline">
            {c.title}
          </Link>
        ),
        party: c.partyName,
        value: <span className="text-right tabular-nums">{formatCurrency(Number(c.value))}</span>,
        status: <Badge status={c.status} label={statusLabels[c.status]} />,
        dates: `${formatDate(c.startDate)} → ${formatDate(c.endDate)}`,
        ...(isAdmin
          ? {
              actions: closableStatuses.has(c.status) ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    const ok = await confirm({
                      title: 'Encerrar contrato?',
                      description: `Confirma o encerramento do contrato de ${c.partyName}?`,
                      confirmLabel: 'Encerrar',
                      variant: 'destructive',
                    });
                    if (ok) close.mutate(c.id);
                  }}
                >
                  Encerrar
                </Button>
              ) : null,
            }
          : {}),
      }))}
      empty={
        <EmptyState
          title="Nenhum contrato"
          description="Ajuste os filtros ou crie o primeiro a partir de um template."
          action={
            isAdmin ? (
              <Link to="/contratos/novo">
                <Button>Novo contrato</Button>
              </Link>
            ) : undefined
          }
        />
      }
    />
  );
}
