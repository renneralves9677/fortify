import { useEffect, useState } from 'react';
import { Button } from '@shared/components/ui/Button';
import { Select } from '@shared/components/ui/Input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@shared/components/ui/dialog';
import { DatePeriodFilter, isDatePeriodInvalid, type DatePeriodValue } from './DatePeriodFilter';

export type ReportExportFormat = 'csv' | 'xlsx' | 'pdf';

export type ExportReportParams = {
  from?: string;
  to?: string;
  format: ReportExportFormat;
};

type ExportReportModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  defaultFrom?: string;
  defaultTo?: string;
  onExport: (params: ExportReportParams) => Promise<void>;
};

const FORMAT_OPTIONS: { value: ReportExportFormat; label: string }[] = [
  { value: 'csv', label: 'CSV' },
  { value: 'xlsx', label: 'Excel (XLSX)' },
  { value: 'pdf', label: 'PDF' },
];

export function ExportReportModal({
  open,
  onOpenChange,
  title,
  description = 'Escolha o período e o formato do arquivo.',
  defaultFrom = '',
  defaultTo = '',
  onExport,
}: ExportReportModalProps) {
  const [period, setPeriod] = useState<DatePeriodValue>({ from: defaultFrom, to: defaultTo });
  const [format, setFormat] = useState<ReportExportFormat>('csv');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setPeriod({ from: defaultFrom, to: defaultTo });
      setFormat('csv');
    }
  }, [open, defaultFrom, defaultTo]);

  const invalid = isDatePeriodInvalid(period);

  async function handleExport() {
    if (invalid) return;
    setLoading(true);
    try {
      await onExport({
        from: period.from || undefined,
        to: period.to || undefined,
        format,
      });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <DatePeriodFilter value={period} onChange={setPeriod} embedded />
          <Select
            label="Formato"
            value={format}
            onChange={(e) => setFormat(e.target.value as ReportExportFormat)}
          >
            {FORMAT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleExport} loading={loading} disabled={invalid}>
            Exportar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
