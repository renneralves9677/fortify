import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { DataTable } from '@shared/components/ui/DataTable';
import { Badge } from '@shared/components/ui/Badge';
import { Button } from '@shared/components/ui/Button';
import { EmptyState } from '@shared/components/ui/EmptyState';
import { PageSkeleton } from '@shared/components/ui/PageLoader';
import { ExportReportModal } from '@shared/components/reports/ExportReportModal';
import type { DatePeriodValue } from '@shared/components/reports/DatePeriodFilter';
import { isDatePeriodInvalid } from '@shared/components/reports/DatePeriodFilter';
import { formatCurrency, formatDate, statusLabels } from '@shared/lib/format';
import {
  downloadReportExport,
  fetchReportList,
  type ContractReportRow,
} from '@features/reports/lib/report-api';

const PAGE_SIZE = 10;

type ReportsContractsTabProps = {
  period: DatePeriodValue;
};

export function ReportsContractsTab({ period }: ReportsContractsTabProps) {
  const [page, setPage] = useState(1);
  const [exportOpen, setExportOpen] = useState(false);
  const invalid = isDatePeriodInvalid(period);

  useEffect(() => {
    setPage(1);
  }, [period.from, period.to]);

  const { data, isLoading } = useQuery({
    queryKey: ['report-contracts', page, period.from, period.to],
    queryFn: () =>
      fetchReportList<ContractReportRow>('contracts', {
        page,
        pageSize: PAGE_SIZE,
        from: period.from || undefined,
        to: period.to || undefined,
      }),
    enabled: !invalid,
  });

  if (isLoading && !data) return <PageSkeleton />;

  const items = data?.items ?? [];

  return (
    <>
      <DataTable
        title="Contratos"
        count={data?.total ?? 0}
        actions={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={invalid}
            onClick={() => setExportOpen(true)}
          >
            <Download size={15} className="mr-1.5" />
            Exportar
          </Button>
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
          { key: 'title', label: 'Título' },
          { key: 'party', label: 'Parte' },
          { key: 'value', label: 'Valor', className: 'text-right tabular-nums' },
          { key: 'status', label: 'Status' },
          { key: 'dates', label: 'Vigência' },
          { key: 'createdAt', label: 'Criado em' },
        ]}
        rows={items.map((c) => ({
          title: (
            <Link to={`/contratos/${c.id}`} className="font-medium text-brand hover:underline">
              {c.title}
            </Link>
          ),
          party: c.partyName,
          value: <span className="text-right tabular-nums">{formatCurrency(c.value)}</span>,
          status: <Badge status={c.status} label={statusLabels[c.status] ?? c.status} />,
          dates: `${formatDate(c.startDate)} → ${formatDate(c.endDate)}`,
          createdAt: formatDate(c.createdAt),
        }))}
        empty={
          <EmptyState
            title="Nenhum contrato no período"
            description="Ajuste o filtro de datas ou limpe o período para ver todos os registros."
          />
        }
      />

      <ExportReportModal
        open={exportOpen}
        onOpenChange={setExportOpen}
        title="Exportar contratos"
        defaultFrom={period.from}
        defaultTo={period.to}
        onExport={(params) => downloadReportExport('contracts', params)}
      />
    </>
  );
}
