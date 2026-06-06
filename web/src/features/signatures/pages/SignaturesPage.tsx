import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@shared/lib/api';
import { PageHeader } from '@shared/components/ui/PageHeader';
import { DataTable } from '@shared/components/ui/DataTable';
import { Badge } from '@shared/components/ui/Badge';
import { Button } from '@shared/components/ui/Button';
import { Select } from '@shared/components/ui/Input';
import { EmptyState } from '@shared/components/ui/EmptyState';
import { PageSkeleton } from '@shared/components/ui/PageLoader';
import { statusLabels } from '@shared/lib/format';
import type { PaginatedResponse } from '@shared/types/pagination';
import {
  signatureQueueQueryString,
  type SignatureQueueProgressFilter,
  type SignatureQueueStatusFilter,
} from '@features/signatures/lib/signature-queue-query';
import { useIsAdmin } from '@/stores/auth-store';

const PAGE_SIZE = 10;

type SignerRow = {
  name: string;
  status: string;
  signOrder: number;
  role: string;
};

type FlowRow = {
  id: string;
  status: string;
  contract: { id: string; title: string; partyName?: string };
  signers: SignerRow[];
};

const STATUS_OPTIONS: { value: SignatureQueueStatusFilter; label: string }[] = [
  { value: 'IN_PROGRESS', label: 'Em andamento' },
  { value: 'ALL', label: 'Todos os status' },
  { value: 'COMPLETED', label: 'Concluídos' },
  { value: 'CANCELLED', label: 'Cancelados' },
  { value: 'EXPIRED', label: 'Expirados' },
];

const PROGRESS_OPTIONS: { value: '' | SignatureQueueProgressFilter; label: string }[] = [
  { value: '', label: 'Qualquer progresso' },
  { value: 'PENDING', label: 'Sem assinaturas' },
  { value: 'PARTIAL', label: 'Parcialmente assinado' },
];

function signerProgress(signers: SignerRow[]) {
  const signed = signers.filter((s) => s.status === 'SIGNED').length;
  return `${signed}/${signers.length}`;
}

function nextPendingSigner(signers: SignerRow[]) {
  const sorted = [...signers].sort((a, b) => a.signOrder - b.signOrder);
  const pending = sorted.filter((s) => s.status !== 'SIGNED' && s.status !== 'DECLINED');
  if (pending.length === 0) return '—';
  if (pending.length === 1) return pending[0].name;
  return `${pending[0].name} +${pending.length - 1}`;
}

export default function SignaturesPage() {
  const isAdmin = useIsAdmin();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<SignatureQueueStatusFilter>('IN_PROGRESS');
  const [progressFilter, setProgressFilter] = useState<'' | SignatureQueueProgressFilter>('');

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, progressFilter]);

  const { data, isLoading } = useQuery({
    queryKey: ['signatures-queue', page, search, statusFilter, progressFilter],
    queryFn: async () =>
      (
        await api.get<PaginatedResponse<FlowRow>>(
          `/signatures/queue${signatureQueueQueryString({
            page,
            pageSize: PAGE_SIZE,
            search,
            status: statusFilter,
            progress: progressFilter || undefined,
          })}`,
        )
      ).data,
  });

  if (isLoading && !data) return <PageSkeleton />;

  const items = data?.items ?? [];
  const hasActiveFilters =
    statusFilter !== 'IN_PROGRESS' || progressFilter !== '' || search.trim().length > 0;

  return (
    <div>
      <PageHeader
        title="Assinaturas"
        description="Acompanhe fluxos de assinatura por status, progresso e signatário"
        actions={
          isAdmin ? (
            <Link to="/contratos/novo">
              <Button>Novo contrato</Button>
            </Link>
          ) : undefined
        }
      />

      <DataTable
        title="Fluxos de assinatura"
        count={data?.total ?? 0}
        search={{
          value: search,
          onChange: setSearch,
          placeholder: 'Buscar contrato, parte ou signatário…',
        }}
        filters={
          <div className="flex flex-wrap items-end gap-3">
            <Select
              label="Status do fluxo"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as SignatureQueueStatusFilter)}
              className="min-w-[11rem]"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
            <Select
              label="Progresso"
              value={progressFilter}
              onChange={(e) =>
                setProgressFilter(e.target.value as '' | SignatureQueueProgressFilter)
              }
              className="min-w-[11rem]"
            >
              {PROGRESS_OPTIONS.map((opt) => (
                <option key={opt.value || 'all'} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
            {hasActiveFilters && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mb-0.5"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('IN_PROGRESS');
                  setProgressFilter('');
                }}
              >
                Limpar filtros
              </Button>
            )}
          </div>
        }
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
          { key: 'contract', label: 'Contrato' },
          { key: 'status', label: 'Status' },
          { key: 'progress', label: 'Assinaturas' },
          { key: 'next', label: 'Próximo signatário' },
          { key: 'actions', label: 'Ações', className: 'text-right' },
        ]}
        rows={items.map((flow) => ({
          contract: (
            <div className="min-w-0">
              <Link
                to={`/contratos/assinaturas/${flow.contract.id}`}
                className="font-medium text-brand hover:underline"
              >
                {flow.contract.title}
              </Link>
              {flow.contract.partyName && (
                <p className="mt-0.5 truncate text-xs text-ink-muted">{flow.contract.partyName}</p>
              )}
            </div>
          ),
          status: (
            <Badge status={flow.status} label={statusLabels[flow.status] ?? flow.status} />
          ),
          progress: signerProgress(flow.signers),
          next: nextPendingSigner(flow.signers),
          actions: (
            <div className="text-right">
              <Link to={`/contratos/assinaturas/${flow.contract.id}`}>
                <Button size="sm" variant="secondary">
                  Detalhes
                </Button>
              </Link>
            </div>
          ),
        }))}
        empty={
          <EmptyState
            title={hasActiveFilters ? 'Nenhum fluxo encontrado' : 'Nenhum fluxo ativo'}
            description={
              hasActiveFilters
                ? 'Ajuste os filtros ou limpe a busca para ver outros resultados.'
                : 'Inicie a assinatura pelo wizard Novo contrato ou abra um contrato existente.'
            }
            action={
              isAdmin && !hasActiveFilters ? (
                <Link to="/contratos/novo">
                  <Button>Novo contrato</Button>
                </Link>
              ) : undefined
            }
          />
        }
      />
    </div>
  );
}
