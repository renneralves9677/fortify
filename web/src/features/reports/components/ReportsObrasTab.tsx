import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { DataTable } from '@shared/components/ui/DataTable';
import { Button } from '@shared/components/ui/Button';
import { EmptyState } from '@shared/components/ui/EmptyState';
import { PageSkeleton } from '@shared/components/ui/PageLoader';
import { ExportReportModal } from '@shared/components/reports/ExportReportModal';
import type { DatePeriodValue } from '@shared/components/reports/DatePeriodFilter';
import { isDatePeriodInvalid } from '@shared/components/reports/DatePeriodFilter';
import { formatCurrency, formatDate } from '@shared/lib/format';
import {
  downloadReportExport,
  fetchReportList,
  type ObraReportRow,
} from '@features/reports/lib/report-api';

const PAGE_SIZE = 10;

type ReportsObrasTabProps = {
  period: DatePeriodValue;
};

export function ReportsObrasTab({ period }: ReportsObrasTabProps) {
  const [page, setPage] = useState(1);
  const [exportOpen, setExportOpen] = useState(false);
  const invalid = isDatePeriodInvalid(period);

  useEffect(() => {
    setPage(1);
  }, [period.from, period.to]);

  const { data, isLoading } = useQuery({
    queryKey: ['report-obras', page, period.from, period.to],
    queryFn: () =>
      fetchReportList<ObraReportRow>('obras', {
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
        title="Obras"
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
          { key: 'name', label: 'Nome' },
          { key: 'status', label: 'Status' },
          { key: 'budget', label: 'Orçamento', className: 'text-right tabular-nums' },
          { key: 'createdAt', label: 'Criado em' },
        ]}
        rows={items.map((o) => ({
          name: o.name,
          status: o.status,
          budget: (
            <span className="text-right tabular-nums">{formatCurrency(o.budgetPlanned)}</span>
          ),
          createdAt: formatDate(o.createdAt),
        }))}
        empty={
          <EmptyState
            title="Nenhuma obra no período"
            description="Ajuste o filtro de datas ou limpe o período para ver todos os registros."
          />
        }
      />

      <ExportReportModal
        open={exportOpen}
        onOpenChange={setExportOpen}
        title="Exportar obras"
        defaultFrom={period.from}
        defaultTo={period.to}
        onExport={(params) => downloadReportExport('obras', params)}
      />
    </>
  );
}
