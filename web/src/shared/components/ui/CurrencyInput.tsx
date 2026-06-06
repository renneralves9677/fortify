import * as React from 'react';
import { cn } from '@shared/lib/utils';
import { formatCurrencyInput } from '@shared/lib/format';

type CurrencyInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  label?: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
};

export function CurrencyInput({
  className,
  label,
  error,
  value,
  onChange,
  placeholder = '0,00',
  required,
  ...props
}: CurrencyInputProps) {
  return (
    <label className="block space-y-1.5">
      {label && <span className="text-sm font-medium leading-none text-foreground">{label}</span>}
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-ink-muted">
          R$
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(formatCurrencyInput(e.target.value))}
          placeholder={placeholder}
          required={required}
          className={cn(
            'flex h-9 w-full rounded-control border border-input bg-background py-2 pl-10 pr-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-destructive',
            className,
          )}
          {...props}
        />
      </div>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </label>
  );
}
