import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Calendar, Receipt, Tag } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@shared/components/ui/dialog';
import { Button } from '@shared/components/ui/Button';
import { Input, Select, Textarea } from '@shared/components/ui/Input';
import { CurrencyInput } from '@shared/components/ui/CurrencyInput';
import { formatCurrency, parseCurrencyInput } from '@shared/lib/format';
import { cn } from '@shared/lib/cn';
import type { CostCategoryItem, ObraCostCategoryCode } from '@features/obras/lib/cost-categories';
import type { ObraStep } from '@features/obras/types';

type CustoFormState = {
  categoryPreset: string;
  description: string;
  amount: string;
  date: string;
  obraStepId: string;
};

type CustoFormErrors = Partial<Record<keyof CustoFormState | 'category', string>>;

type LancarCustoModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  obraName: string;
  budgetPlanned?: number;
  budgetRealized?: number;
  budgetCommitted?: number;
  categories: CostCategoryItem[];
  steps?: ObraStep[];
  onSubmit: (body: {
    category: ObraCostCategoryCode;
    description: string;
    amount: number;
    date: string;
    obraStepId?: string;
  }) => void;
  loading?: boolean;
};

function todayInputValue() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function emptyForm(): CustoFormState {
  return {
    categoryPreset: '',
    description: '',
    amount: '',
    date: todayInputValue(),
    obraStepId: '',
  };
}

function dateInputToIso(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0).toISOString();
}

function validateForm(form: CustoFormState): CustoFormErrors {
  const errors: CustoFormErrors = {};

  if (!form.categoryPreset) {
    errors.categoryPreset = 'Selecione uma categoria';
  }

  if (form.description.trim().length < 10) {
    errors.description = 'Descreva a justificativa (mín. 10 caracteres)';
  }

  const amount = parseCurrencyInput(form.amount);
  if (!amount || amount <= 0) {
    errors.amount = 'Informe um valor maior que zero';
  }

  if (!form.date) {
    errors.date = 'Informe a data do lançamento';
  }

  return errors;
}

export function LancarCustoModal({
  open,
  onOpenChange,
  obraName,
  budgetPlanned = 0,
  budgetRealized = 0,
  budgetCommitted = 0,
  categories,
  steps = [],
  onSubmit,
  loading,
}: LancarCustoModalProps) {
  const [form, setForm] = useState<CustoFormState>(emptyForm);
  const [errors, setErrors] = useState<CustoFormErrors>({});

  useEffect(() => {
    if (!open) {
      setForm(emptyForm());
      setErrors({});
    }
  }, [open]);

  const selectedCategory = categories.find((c) => c.code === form.categoryPreset);
  const amount = parseCurrencyInput(form.amount);

  const budgetWarning = useMemo(() => {
    if (!budgetPlanned || amount <= 0) return null;
    const projected = budgetRealized + budgetCommitted + amount;
    if (projected <= budgetPlanned) return null;
    const over = projected - budgetPlanned;
    return { projected, over };
  }, [amount, budgetPlanned, budgetRealized, budgetCommitted]);

  const showPreview =
    selectedCategory &&
    form.description.trim().length >= 10 &&
    amount > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !selectedCategory) return;

    onSubmit({
      category: selectedCategory.code,
      description: form.description.trim(),
      amount,
      date: dateInputToIso(form.date),
      ...(form.obraStepId ? { obraStepId: form.obraStepId } : {}),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Lançar custo direto</DialogTitle>
          <DialogDescription>
            Despesas pequenas ou emergenciais em <strong className="font-medium text-ink">{obraName}</strong>.
            Materiais e serviços relevantes exigem ordem de compra.
            {budgetPlanned > 0 && (
              <>
                {' '}
                Projetado: {formatCurrency(budgetRealized + budgetCommitted)} de{' '}
                {formatCurrency(budgetPlanned)} (realizado + comprometido).
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <form id="custo-form" className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Select
                label="Categoria"
                required
                value={form.categoryPreset}
                className={cn(errors.categoryPreset && 'border-destructive')}
                onChange={(e) => {
                  setForm({ ...form, categoryPreset: e.target.value });
                  setErrors({ ...errors, categoryPreset: undefined });
                }}
              >
                <option value="">Selecione…</option>
                {categories.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </Select>
              {errors.categoryPreset && (
                <span className="mt-1 block text-xs text-destructive">{errors.categoryPreset}</span>
              )}
            </div>

            <Input
              label="Data do lançamento"
              type="date"
              required
              value={form.date}
              max={todayInputValue()}
              onChange={(e) => {
                setForm({ ...form, date: e.target.value });
                setErrors({ ...errors, date: undefined });
              }}
              error={errors.date}
            />
          </div>

          <CurrencyInput
            label="Valor"
            required
            value={form.amount}
            onChange={(value) => {
              setForm({ ...form, amount: value });
              setErrors({ ...errors, amount: undefined });
            }}
            error={errors.amount}
          />

          {steps.length > 0 && (
            <Select
              label="Etapa do roteiro (opcional)"
              value={form.obraStepId}
              onChange={(e) => setForm({ ...form, obraStepId: e.target.value })}
            >
              <option value="">Sem vínculo</option>
              {steps.map((s) => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </Select>
          )}

          <Textarea
            label="Justificativa"
            required
            placeholder="Detalhe o motivo do gasto — posto, trecho, funcionário, nota de reembolso…"
            value={form.description}
            onChange={(e) => {
              setForm({ ...form, description: e.target.value });
              setErrors({ ...errors, description: undefined });
            }}
            rows={3}
          />
          {errors.description && (
            <p className="-mt-2 text-xs text-destructive">{errors.description}</p>
          )}

          {budgetWarning && (
            <div className="flex gap-3 rounded-control border border-danger/30 bg-danger/5 px-3 py-3 text-sm">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-danger" aria-hidden />
              <p className="text-ink-muted">
                Este lançamento eleva o total para{' '}
                <strong className="text-ink">{formatCurrency(budgetWarning.projected)}</strong>,{' '}
                <strong className="text-danger">{formatCurrency(budgetWarning.over)}</strong> acima do orçamento
                previsto.
              </p>
            </div>
          )}

          {showPreview && selectedCategory && (
            <div className="rounded-control border border-border bg-surface-sunken/50 p-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-muted">
                Resumo do lançamento
              </p>
              <dl className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <Tag size={15} className="mt-0.5 shrink-0 text-ink-muted" aria-hidden />
                  <div>
                    <dt className="text-xs text-ink-muted">Categoria</dt>
                    <dd className="font-medium text-ink">{selectedCategory.label}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Receipt size={15} className="mt-0.5 shrink-0 text-ink-muted" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <dt className="text-xs text-ink-muted">Justificativa</dt>
                    <dd className="line-clamp-2 text-ink">{form.description.trim()}</dd>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-border pt-2">
                  <div className="flex items-center gap-2 text-ink-muted">
                    <Calendar size={15} aria-hidden />
                    <span>{new Intl.DateTimeFormat('pt-BR').format(new Date(form.date + 'T12:00:00'))}</span>
                  </div>
                  <dd className="text-base font-semibold tabular-nums text-ink">{formatCurrency(amount)}</dd>
                </div>
              </dl>
            </div>
          )}
        </form>

        <DialogFooter>
          <Button variant="secondary" type="button" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="custo-form" loading={loading}>
            Salvar lançamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
