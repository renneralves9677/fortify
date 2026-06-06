import { Button } from '@shared/components/ui/Button';

export type DatePeriodValue = {
  from: string;
  to: string;
};

type DatePeriodFilterProps = {
  value: DatePeriodValue;
  onChange: (value: DatePeriodValue) => void;
  /** When true, renders without the outer card (e.g. inside a modal). */
  embedded?: boolean;
};

export function isDatePeriodInvalid(value: DatePeriodValue): boolean {
  return Boolean(value.from && value.to && value.from > value.to);
}

export function DatePeriodFilter({ value, onChange, embedded }: DatePeriodFilterProps) {
  const invalid = isDatePeriodInvalid(value);

  const content = (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-ink">De</span>
          <input
            type="date"
            value={value.from}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
            className="flex h-9 w-full rounded-control border border-input bg-background px-3 text-sm focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 sm:w-44"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-ink">Até</span>
          <input
            type="date"
            value={value.to}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
            className="flex h-9 w-full rounded-control border border-input bg-background px-3 text-sm focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 sm:w-44"
          />
        </label>
        {(value.from || value.to) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange({ from: '', to: '' })}
          >
            Limpar
          </Button>
        )}
      </div>
      {invalid && (
        <p className="mt-2 text-sm text-destructive">
          A data inicial deve ser anterior ou igual à data final.
        </p>
      )}
    </>
  );

  if (embedded) return content;

  return (
    <div className="rounded-card border border-border bg-card p-4 shadow-card">{content}</div>
  );
}
