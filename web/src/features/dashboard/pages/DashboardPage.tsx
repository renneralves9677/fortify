import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  BarChart3,
  FileText,
  HardHat,
  PenLine,
  Wallet,
} from 'lucide-react';
import { api } from '@shared/lib/api';
import { PageHeader } from '@shared/components/ui/PageHeader';
import { Card } from '@shared/components/ui/Card';
import { PageSkeleton } from '@shared/components/ui/PageLoader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/components/ui/tabs';
import { Select } from '@shared/components/ui/Input';
import { formatCurrency } from '@shared/lib/format';
import { useIsAdmin } from '@/stores/auth-store';
import { DashboardContractsTab } from '@features/dashboard/components/DashboardContractsTab';
import { DashboardObrasTab } from '@features/dashboard/components/DashboardObrasTab';
import {
  buildDashboardPeriod,
  PERIOD_PRESET_LABELS,
  type DashboardPeriodPreset,
} from '@features/dashboard/lib/period';
import type { DashboardData } from '@features/dashboard/types';

const TABS = ['contratos', 'obras'] as const;
type Tab = (typeof TABS)[number];

export default function DashboardPage() {
  const isAdmin = useIsAdmin();
  const [tab, setTab] = useState<Tab>('contratos');
  const [preset, setPreset] = useState<DashboardPeriodPreset>('6m');

  const period = useMemo(() => buildDashboardPeriod(preset), [preset]);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', period.from, period.to, period.months],
    queryFn: async () => {
      const params = new URLSearchParams({
        from: period.from,
        to: period.to,
        months: String(period.months),
      });
      return (await api.get<DashboardData>(`/dashboard?${params}`)).data;
    },
  });

  if (isLoading || !data) return <PageSkeleton />;

  return (
    <div>
      <PageHeader
        title="Início"
        description="Indicadores de contratos e obras"
        breadcrumbs={false}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select
              label="Período"
              value={preset}
              onChange={(e) => setPreset(e.target.value as DashboardPeriodPreset)}
              className="min-w-[11rem]"
            >
              {(Object.keys(PERIOD_PRESET_LABELS) as DashboardPeriodPreset[]).map((key) => (
                <option key={key} value={key}>
                  {PERIOD_PRESET_LABELS[key]}
                </option>
              ))}
            </Select>
            <Link
              to="/relatorios"
              className="inline-flex items-center gap-1.5 rounded-control border border-border px-3 py-2 text-sm text-ink-muted transition-colors hover:border-brand/40 hover:text-ink"
            >
              <BarChart3 size={16} aria-hidden />
              Relatórios
            </Link>
          </div>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="py-3 text-sm">
          <p className="text-ink-muted">Contratos ativos</p>
          <p className="font-medium">{data.contracts.ativos}</p>
        </Card>
        <Card className="py-3 text-sm">
          <p className="text-ink-muted">Assinaturas pendentes</p>
          <p className="font-medium">{data.contracts.assinaturasPendentes}</p>
        </Card>
        <Card className="py-3 text-sm">
          <p className="text-ink-muted">Obras ativas</p>
          <p className="font-medium">{data.obras.ativas}</p>
        </Card>
        <Card className="py-3 text-sm">
          <p className="text-ink-muted">Custos no período</p>
          <p className="font-medium">{formatCurrency(data.obras.custoRealizado)}</p>
        </Card>
      </div>

      {isAdmin && (data.alerts.pendingApprovals > 0 || data.alerts.contractsInWorkflow > 0) && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          {data.alerts.pendingApprovals > 0 && (
            <Link to="/contratos?status=APROVACAO">
              <Card className="flex items-center gap-3 border-warning/30 bg-warning/5 py-3 transition-colors hover:border-warning/50">
                <PenLine size={18} className="text-warning" aria-hidden />
                <div>
                  <p className="text-sm font-medium">
                    {data.alerts.pendingApprovals} aprovação(ões) pendente(s)
                  </p>
                  <p className="text-xs text-ink-muted">Requerem sua ação</p>
                </div>
              </Card>
            </Link>
          )}
          {data.alerts.contractsInWorkflow > 0 && (
            <Link to="/contratos">
              <Card className="flex items-center gap-3 border-brand/20 bg-brand/5 py-3 transition-colors hover:border-brand/40">
                <FileText size={18} className="text-brand" aria-hidden />
                <div>
                  <p className="text-sm font-medium">
                    {data.alerts.contractsInWorkflow} contrato(s) em fluxo
                  </p>
                  <p className="text-xs text-ink-muted">Revisão, aprovação ou envio</p>
                </div>
              </Card>
            </Link>
          )}
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList>
          <TabsTrigger value="contratos">
            <FileText size={16} className="mr-1.5" aria-hidden />
            Contratos
          </TabsTrigger>
          <TabsTrigger value="obras">
            <HardHat size={16} className="mr-1.5" aria-hidden />
            Obras
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contratos" className="mt-4">
          <DashboardContractsTab data={data.contracts} />
        </TabsContent>
        <TabsContent value="obras" className="mt-4">
          <DashboardObrasTab data={data.obras} />
        </TabsContent>
      </Tabs>

      <div className="mt-6 flex flex-wrap gap-3 text-sm text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <Wallet size={14} aria-hidden />
          Custo acumulado: <strong className="text-ink">{formatCurrency(data.obras.custoTotal)}</strong>
        </span>
        {data.obras.ocorrenciasAbertas > 0 && (
          <span className="inline-flex items-center gap-1.5 text-warning">
            <AlertTriangle size={14} aria-hidden />
            {data.obras.ocorrenciasAbertas} ocorrência(s) em aberto
          </span>
        )}
      </div>
    </div>
  );
}
