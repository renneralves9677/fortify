import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Building2, ClipboardList, FileText, Tag } from 'lucide-react';
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
import type { CostCategoryItem, ObraCostCategoryCode } from '@features/obras/lib/cost-categories';
import type { ObraStep } from '@features/obras/types';
import { cn } from '@shared/lib/cn';
import { CurrencyInput } from '@shared/components/ui/CurrencyInput';
import { formatCnpj, isValidCnpj, normalizeCnpj } from '@shared/lib/br-format';
import { formatCurrency, parseCurrencyInput } from '@shared/lib/format';

type OcFormState = {
  category: string;
  payerCnpj: string;
  description: string;
  amount: string;
  obraStepId: string;
};

type OcFormErrors = Partial<Record<keyof OcFormState, string>>;

type EmitirOrdemCompraModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  obraName: string;
  categories: CostCategoryItem[];
  steps?: ObraStep[];
  poApprovalThreshold: number;
  onSubmit: (body: {
    category: ObraCostCategoryCode;
    payerCnpj: string;
    description: string;
    amount: number;
    obraStepId?: string;
  }) => void;
  loading?: boolean;
};

function emptyForm(): OcFormState {
  return { category: '', payerCnpj: '', description: '', amount: '', obraStepId: '' };
}

function validateForm(form: OcFormState): OcFormErrors {
  const errors: OcFormErrors = {};

  if (!form.category) {
    errors.category = 'Selecione o tipo de gasto';
  }

  if (!isValidCnpj(form.payerCnpj)) {
    errors.payerCnpj = 'Informe um CNPJ válido';
  }

  if (form.description.trim().length < 3) {
    errors.description = 'Descreva a ordem (mín. 3 caracteres)';
  }

  const amount = parseCurrencyInput(form.amount);
  if (!amount || amount <= 0) {
    errors.amount = 'Informe um valor maior que zero';
  }

  return errors;
}

export function EmitirOrdemCompraModal({
  open,
  onOpenChange,
  obraName,
  categories,
  steps = [],
  poApprovalThreshold,
  onSubmit,
  loading,
}: EmitirOrdemCompraModalProps) {
  const [form, setForm] = useState<OcFormState>(emptyForm);
  const [errors, setErrors] = useState<OcFormErrors>({});

  useEffect(() => {
    if (!open) {
      setForm(emptyForm());
      setErrors({});
    }
  }, [open]);

  const amount = parseCurrencyInput(form.amount);
  const selectedCategory = categories.find((c) => c.code === form.category);
  const needsApproval = amount > 0 && amount >= poApprovalThreshold;
  const showPreview =
    selectedCategory &&
    isValidCnpj(form.payerCnpj) &&
    form.description.trim().length >= 3 &&
    amount > 0;

  const cnpjDigits = useMemo(
    () => form.payerCnpj.replace(/\D/g, '').length,
    [form.payerCnpj],
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit({
      category: form.category as ObraCostCategoryCode,
      payerCnpj: normalizeCnpj(form.payerCnpj),
      description: form.description.trim(),
      amount,
      ...(form.obraStepId ? { obraStepId: form.obraStepId } : {}),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Emitir ordem de compra</DialogTitle>
          <DialogDescription>
            Materiais, serviços e equipamentos em <strong className="font-medium text-ink">{obraName}</strong>.
            Valores a partir de {formatCurrency(poApprovalThreshold)} exigem aprovação de um administrador.
          </DialogDescription>
        </DialogHeader>

        <form id="oc-form" className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <Select
              label="Tipo de gasto"
              required
              value={form.category}
              className={cn(errors.category && 'border-destructive')}
              onChange={(e) => {
                setForm({ ...form, category: e.target.value });
                setErrors({ ...errors, category: undefined });
              }}
            >
              <option value="">Selecione…</option>
              {categories.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </Select>
            {errors.category && (
              <span className="mt-1 block text-xs text-destructive">{errors.category}</span>
            )}
          </div>

          <Input
            label="CNPJ pagador"
            required
            placeholder="00.000.000/0000-00"
            inputMode="numeric"
            autoComplete="off"
            value={form.payerCnpj}
            onChange={(e) => {
              setForm({ ...form, payerCnpj: formatCnpj(e.target.value) });
              setErrors({ ...errors, payerCnpj: undefined });
            }}
            error={errors.payerCnpj}
          />
          {cnpjDigits > 0 && cnpjDigits < 14 && !errors.payerCnpj && (
            <p className="-mt-2 text-xs text-ink-muted">Digite os 14 dígitos do CNPJ</p>
          )}

          <CurrencyInput
            label="Valor da ordem"
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
            label="Descrição / itens"
            required
            placeholder="Detalhe materiais, serviços, fornecedor, prazo de entrega, condições de pagamento…"
            value={form.description}
            onChange={(e) => {
              setForm({ ...form, description: e.target.value });
              setErrors({ ...errors, description: undefined });
            }}
            rows={4}
          />
          {errors.description && (
            <p className="-mt-2 text-xs text-destructive">{errors.description}</p>
          )}

          {needsApproval && (
            <div className="flex gap-3 rounded-control border border-warning/40 bg-warning/5 px-3 py-3 text-sm">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-warning" aria-hidden />
              <p className="text-ink-muted">
                Esta ordem exigirá <strong className="text-ink">aprovação de administrador</strong> antes do
                recebimento.
              </p>
            </div>
          )}

          <div className="rounded-control border border-border bg-surface-sunken/50 px-3 py-3 text-sm text-ink-muted">
            <p className="font-medium text-ink">Fluxo da ordem</p>
            <ol className="mt-2 list-inside list-decimal space-y-1">
              <li>
                {needsApproval ? 'Emitida — aguarda aprovação' : 'Aprovada automaticamente (valor abaixo do limiar)'}
              </li>
              <li>Recebimento — gera custo na obra</li>
            </ol>
          </div>

          {showPreview && (
            <div className="rounded-control border border-border bg-surface-sunken/50 p-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-muted">
                Resumo da ordem
              </p>
              <dl className="space-y-2 text-sm">
                {selectedCategory && (
                  <div className="flex items-start gap-2">
                    <Tag size={15} className="mt-0.5 shrink-0 text-ink-muted" aria-hidden />
                    <div>
                      <dt className="text-xs text-ink-muted">Tipo</dt>
                      <dd className="font-medium text-ink">{selectedCategory.label}</dd>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <Building2 size={15} className="mt-0.5 shrink-0 text-ink-muted" aria-hidden />
                  <div>
                    <dt className="text-xs text-ink-muted">CNPJ pagador</dt>
                    <dd className="font-medium text-ink">{form.payerCnpj}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <FileText size={15} className="mt-0.5 shrink-0 text-ink-muted" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <dt className="text-xs text-ink-muted">Descrição</dt>
                    <dd className="line-clamp-3 text-ink">{form.description.trim()}</dd>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-border pt-2">
                  <div className="flex items-center gap-2 text-ink-muted">
                    <ClipboardList size={15} aria-hidden />
                    <span>
                      {needsApproval ? 'Aguardará aprovação' : 'Aprovação automática'}
                    </span>
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
          <Button type="submit" form="oc-form" loading={loading}>
            Emitir ordem
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
