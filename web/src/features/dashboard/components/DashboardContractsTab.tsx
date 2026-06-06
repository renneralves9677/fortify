import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardList, FileText } from 'lucide-react';
import { Card } from '@shared/components/ui/Card';
import { formatCurrency } from '@shared/lib/format';
import { cn } from '@shared/lib/cn';
import { MonthlyBarChart } from '@features/dashboard/components/MonthlyBarChart';
import { StatusBreakdownChart } from '@features/dashboard/components/StatusBreakdownChart';
import type { DashboardData } from '@features/dashboard/types';

type Props = {
  data: DashboardData['contracts'];
};

export function DashboardContractsTab({ data }: Props) {
  const monthlyBars = data.monthly.map((row) => ({
    key: row.month,
    label: row.label,
    value: row.value,
    secondary: row.count,
  }));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Carteira ativa</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{formatCurrency(data.totalValueActive)}</p>
          <p className="text-sm text-ink-muted">
            {data.ativos} contrato{data.ativos === 1 ? '' : 's'} na carteira
          </p>
        </Card>
        <Card className="py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">No período</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{data.createdInPeriod}</p>
          <p className="text-sm text-ink-muted">com vigência ou assinatura no período</p>
        </Card>
        <Link to="/contratos/assinaturas">
          <Card className="h-full py-4 transition-colors hover:border-brand/40">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Assinaturas pendentes</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{data.assinaturasPendentes}</p>
            <p className="text-sm text-ink-muted">aguardando assinatura</p>
          </Card>
        </Link>
        <Card className="py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Valor no período</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{formatCurrency(data.totalValueInPeriod)}</p>
          <p className="text-sm text-ink-muted">soma dos contratos do período</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-medium text-ink">Evolução mensal</h3>
          <MonthlyBarChart
            data={monthlyBars}
            primaryLabel="Valor (R$)"
            secondaryLabel="Quantidade"
            valueFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
          />
        </Card>
        <Card>
          <h3 className="mb-4 font-medium text-ink">Por status</h3>
          <StatusBreakdownChart rows={data.byStatus} />
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          to="/contratos"
          className={cn(
            'inline-flex h-8 items-center gap-2 rounded-control border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-muted',
          )}
        >
          <FileText size={16} aria-hidden />
          Ver contratos
        </Link>
        <Link
          to="/contratos/assinaturas"
          className={cn(
            'inline-flex h-8 items-center gap-2 rounded-control border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-muted',
          )}
        >
          <ClipboardList size={16} aria-hidden />
          Assinaturas
          <ArrowRight size={14} className="opacity-60" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
