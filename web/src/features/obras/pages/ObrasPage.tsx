import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { HardHat, MapPin, Wallet } from 'lucide-react';
import { api } from '@shared/lib/api';
import { PageHeader } from '@shared/components/ui/PageHeader';
import { Card } from '@shared/components/ui/Card';
import { Button } from '@shared/components/ui/Button';
import { Badge } from '@shared/components/ui/Badge';
import { DataTable } from '@shared/components/ui/DataTable';
import { EmptyState } from '@shared/components/ui/EmptyState';
import { PageSkeleton } from '@shared/components/ui/PageLoader';
import { formatCurrency, statusLabels } from '@shared/lib/format';
import { useIsAdmin } from '@/stores/auth-store';
import { NovaObraModal } from '@features/obras/components/NovaObraModal';

type ObraListItem = {
  id: string;
  name: string;
  address?: string | null;
  budgetPlanned: number;
  status: string;
  contract?: { id: string; title: string } | null;
  _count?: { custos: number };
};

type StatusFilter = 'all' | 'ativa' | 'encerrada';

export default function ObrasPage() {
  const isAdmin = useIsAdmin();
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const { data = [], isLoading } = useQuery({
    queryKey: ['obras'],
    queryFn: async () => (await api.get<ObraListItem[]>('/obras')).data,
  });

  const stats = useMemo(() => {
    const ativas = data.filter((o) => o.status === 'ativa').length;
    const encerradas = data.filter((o) => o.status === 'encerrada').length;
    const orcamentoTotal = data.reduce((sum, o) => sum + (o.budgetPlanned ?? 0), 0);
    return { total: data.length, ativas, encerradas, orcamentoTotal };
  }, [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (!q) return true;
      const haystack = [
        o.name,
        o.address ?? '',
        o.contract?.title ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [data, search, statusFilter]);

  if (isLoading) return <PageSkeleton />;

  return (
    <div>
      <PageHeader
        title="Obras"
        description="Projetos vinculados a contratos assinados — roteiro, vistorias, custos e ordens de compra"
        actions={
          isAdmin ? <Button onClick={() => setModalOpen(true)}>Nova obra</Button> : undefined
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex items-center gap-3 py-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-control bg-accent text-brand">
            <HardHat size={20} aria-hidden />
          </span>
          <div>
            <p className="text-xs text-ink-muted">Total de obras</p>
            <p className="text-xl font-semibold tabular-nums">{stats.total}</p>
          </div>
        </Card>
        <Card className="py-3 text-sm">
          <p className="text-ink-muted">Em execução</p>
          <p className="text-xl font-semibold tabular-nums text-ink">{stats.ativas}</p>
        </Card>
        <Card className="py-3 text-sm">
          <p className="text-ink-muted">Encerradas</p>
          <p className="text-xl font-semibold tabular-nums text-ink">{stats.encerradas}</p>
        </Card>
        <Card className="flex items-center gap-3 py-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-control bg-accent text-brand">
            <Wallet size={20} aria-hidden />
          </span>
          <div>
            <p className="text-xs text-ink-muted">Orçamento previsto</p>
            <p className="text-lg font-semibold tabular-nums">{formatCurrency(stats.orcamentoTotal)}</p>
          </div>
        </Card>
      </div>

      <DataTable
        title="Todas as obras"
        count={filtered.length}
        search={{
          value: search,
          onChange: setSearch,
          placeholder: 'Buscar por nome, endereço ou contrato…',
        }}
        filters={
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: 'all', label: 'Todas' },
                { id: 'ativa', label: 'Em execução' },
                { id: 'encerrada', label: 'Encerradas' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={
                  statusFilter === f.id
                    ? 'rounded-full bg-brand px-3 py-1 text-xs font-medium text-on-brand'
                    : 'rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-ink-muted hover:border-brand/40'
                }
              >
                {f.label}
              </button>
            ))}
          </div>
        }
        columns={[
          { key: 'obra', label: 'Obra' },
          { key: 'contrato', label: 'Contrato' },
          { key: 'status', label: 'Status' },
          { key: 'orcamento', label: 'Orçamento', className: 'text-right' },
          { key: 'custos', label: 'Custos', className: 'text-right' },
          { key: 'acoes', label: '', className: 'text-right' },
        ]}
        rows={filtered.map((o) => ({
          obra: (
            <div className="min-w-0">
              <Link
                to={`/obras/${o.id}`}
                className="font-medium text-ink hover:text-brand"
              >
                {o.name}
              </Link>
              {o.address && (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-muted">
                  <MapPin size={12} aria-hidden />
                  <span className="truncate">{o.address}</span>
                </p>
              )}
            </div>
          ),
          contrato: o.contract ? (
            <Link
              to={`/contratos/${o.contract.id}`}
              className="text-sm text-brand hover:underline"
            >
              {o.contract.title}
            </Link>
          ) : (
            <span className="text-sm text-ink-muted">—</span>
          ),
          status: (
            <Badge status={o.status} label={statusLabels[o.status] ?? o.status} />
          ),
          orcamento: (
            <span className="tabular-nums text-ink">
              {o.budgetPlanned > 0 ? formatCurrency(o.budgetPlanned) : '—'}
            </span>
          ),
          custos: (
            <span className="tabular-nums text-ink-muted">
              {o._count?.custos ?? 0}
            </span>
          ),
          acoes: (
            <Link to={`/obras/${o.id}`} className="text-sm font-medium text-brand hover:underline">
              Abrir →
            </Link>
          ),
        }))}
        empty={
          data.length === 0 ? (
            <EmptyState
              title="Nenhuma obra cadastrada"
              description="Crie uma obra vinculada a um contrato assinado que ainda não esteja em uso."
              action={
                isAdmin ? (
                  <Button onClick={() => setModalOpen(true)}>Nova obra</Button>
                ) : undefined
              }
            />
          ) : (
            <EmptyState
              title="Nenhum resultado"
              description="Ajuste a busca ou o filtro de status."
            />
          )
        }
      />

      <NovaObraModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}
