import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ClipboardList,
  Eye,
  FileText,
  HardHat,
  Info,
  MapPin,
  Wallet,
} from 'lucide-react';
import { ContractQuickViewModal } from '@features/contracts/components/ContractQuickViewModal';
import { ContractPreviewModal } from '@features/signatures/components/ContractPreviewModal';
import { api } from '@shared/lib/api';
import { Button } from '@shared/components/ui/Button';
import { Input, Select, Textarea } from '@shared/components/ui/Input';
import { CurrencyInput } from '@shared/components/ui/CurrencyInput';
import { Badge } from '@shared/components/ui/Badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@shared/components/ui/dialog';
import { formatCurrency, parseCurrencyInput, statusLabels } from '@shared/lib/format';
import { cn } from '@shared/lib/cn';

type EligibleContract = {
  id: string;
  title: string;
  partyName: string;
  status: string;
};

type FormState = {
  contractId: string;
  name: string;
  address: string;
  budgetPlanned: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const emptyForm: FormState = {
  contractId: '',
  name: '',
  address: '',
  budgetPlanned: '',
};

const DEFAULT_ROTEIRO_STEPS = [
  'Briefing e escopo',
  'Orçamento baseline',
  'Vistoria inicial',
  'Mobilização',
  'Execução principal',
  'Controle de custos',
  'Vistoria final',
  'Termo de conclusão',
];

function validateForm(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.contractId) errors.contractId = 'Selecione um contrato assinado';
  if (form.name.trim().length < 2) errors.name = 'Informe o nome do projeto (mín. 2 caracteres)';
  return errors;
}

type NovaObraModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function NovaObraModal({ open, onOpenChange }: NovaObraModalProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [previewOpen, setPreviewOpen] = useState(false);
  const [contractInfoOpen, setContractInfoOpen] = useState(false);
  const qc = useQueryClient();

  const { data: eligibleContracts = [], isLoading: loadingContracts } = useQuery({
    queryKey: ['obras-eligible-contracts'],
    queryFn: async () => (await api.get<EligibleContract[]>('/obras/eligible-contracts')).data,
    enabled: open,
  });

  useEffect(() => {
    if (!open) {
      setForm(emptyForm);
      setErrors({});
      setPreviewOpen(false);
      setContractInfoOpen(false);
    }
  }, [open]);

  const { data: contractPreview, isLoading: loadingPreview } = useQuery({
    queryKey: ['contract-preview', form.contractId],
    queryFn: async () =>
      (await api.get<{ html: string }>(`/contracts/${form.contractId}/preview`)).data,
    enabled: previewOpen && !!form.contractId,
  });

  const selectedContract = useMemo(
    () => eligibleContracts.find((c) => c.id === form.contractId) ?? null,
    [eligibleContracts, form.contractId],
  );

  const budget = parseCurrencyInput(form.budgetPlanned);
  const showPreview =
    !!selectedContract && form.name.trim().length >= 2 && Object.keys(validateForm(form)).length === 0;

  const create = useMutation({
    mutationFn: () =>
      api.post('/obras', {
        name: form.name.trim(),
        address: form.address.trim() || undefined,
        budgetPlanned: budget,
        contractId: form.contractId,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['obras'] });
      qc.invalidateQueries({ queryKey: ['obras-eligible-contracts'] });
      onOpenChange(false);
    },
    meta: { successMessage: 'Obra criada' },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    create.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-lg flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>Nova obra</DialogTitle>
          <DialogDescription>
            Vincule a um contrato assinado disponível e defina os dados iniciais do projeto.
          </DialogDescription>
        </DialogHeader>

        <form
          id="nova-obra-form"
          className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1"
          onSubmit={handleSubmit}
        >
          <section className="space-y-3">
            <div>
              <Select
                label="Contrato assinado"
                value={form.contractId}
                required
                disabled={loadingContracts || eligibleContracts.length === 0}
                className={cn(errors.contractId && 'border-destructive')}
                onChange={(e) => {
                  setForm({ ...form, contractId: e.target.value });
                  setErrors({ ...errors, contractId: undefined });
                }}
              >
                <option value="">
                  {loadingContracts
                    ? 'Carregando contratos…'
                    : eligibleContracts.length === 0
                      ? 'Nenhum contrato disponível'
                      : 'Selecione o contrato…'}
                </option>
                {eligibleContracts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} — {c.partyName}
                  </option>
                ))}
              </Select>
              {errors.contractId && (
                <span className="mt-1 block text-xs text-destructive">{errors.contractId}</span>
              )}
            </div>

            {eligibleContracts.length === 0 && !loadingContracts && (
              <div className="rounded-control border border-dashed border-border bg-surface-sunken/50 px-3 py-3 text-sm text-ink-muted">
                <p>Nenhum contrato assinado está livre para vincular.</p>
                <p className="mt-1">
                  <Link to="/contratos/novo" className="font-medium text-brand hover:underline">
                    Criar novo contrato
                  </Link>
                  {' ou assine um contrato existente.'}
                </p>
              </div>
            )}

            {selectedContract && (
              <div className="rounded-control border border-brand/20 bg-brand/5 p-3 text-sm">
                <div className="flex items-start gap-2">
                  <FileText size={16} className="mt-0.5 shrink-0 text-brand" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink">{selectedContract.title}</p>
                    <p className="text-ink-muted">{selectedContract.partyName}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <Badge
                        status={selectedContract.status}
                        label={statusLabels[selectedContract.status] ?? selectedContract.status}
                      />
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
                        onClick={() => setContractInfoOpen(true)}
                      >
                        <Info size={12} aria-hidden />
                        Abrir contrato
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
                        onClick={() => setPreviewOpen(true)}
                      >
                        <Eye size={12} aria-hidden />
                        Preview do contrato
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="space-y-3">
            <Input
              label="Nome do projeto"
              value={form.name}
              required
              placeholder="Ex.: Reforma loja centro"
              error={errors.name}
              onChange={(e) => {
                setForm({ ...form, name: e.target.value });
                setErrors({ ...errors, name: undefined });
              }}
            />
            <Textarea
              label="Endereço da obra"
              value={form.address}
              placeholder="Rua, número, bairro, cidade — facilita vistorias e relatórios"
              rows={2}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
            <CurrencyInput
              label="Orçamento previsto"
              value={form.budgetPlanned}
              onChange={(budgetPlanned) => setForm({ ...form, budgetPlanned })}
            />
            {budget <= 0 && form.name.trim().length >= 2 && (
              <div className="flex gap-2 rounded-control border border-warning/30 bg-warning/5 px-3 py-2 text-sm text-ink-muted">
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-warning" aria-hidden />
                <span>
                  Sem orçamento previsto, o acompanhamento financeiro ficará limitado. Você pode
                  ajustar depois no detalhe da obra.
                </span>
              </div>
            )}
          </section>

          <section className="rounded-control border border-border bg-surface-sunken/40 p-3 text-sm">
            <div className="flex items-center gap-2 font-medium text-ink">
              <ClipboardList size={16} className="text-ink-muted" aria-hidden />
              Roteiro inicial automático
            </div>
            <p className="mt-1 text-ink-muted">
              Ao criar a obra, {DEFAULT_ROTEIRO_STEPS.length} etapas padrão serão adicionadas ao
              roteiro para você acompanhar a execução.
            </p>
            <ul className="mt-2 grid gap-1 text-xs text-ink-muted sm:grid-cols-2">
              {DEFAULT_ROTEIRO_STEPS.map((step) => (
                <li key={step} className="flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-brand" />
                  {step}
                </li>
              ))}
            </ul>
          </section>

          {showPreview && selectedContract && (
            <section className="rounded-control border border-border bg-surface-sunken/50 p-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-muted">
                Resumo do cadastro
              </p>
              <dl className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <HardHat size={15} className="mt-0.5 shrink-0 text-ink-muted" aria-hidden />
                  <div>
                    <dt className="text-xs text-ink-muted">Projeto</dt>
                    <dd className="font-medium text-ink">{form.name.trim()}</dd>
                  </div>
                </div>
                {form.address.trim() && (
                  <div className="flex items-start gap-2">
                    <MapPin size={15} className="mt-0.5 shrink-0 text-ink-muted" aria-hidden />
                    <div>
                      <dt className="text-xs text-ink-muted">Endereço</dt>
                      <dd className="text-ink">{form.address.trim()}</dd>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between gap-3 border-t border-border pt-2">
                  <div className="flex items-center gap-2 text-ink-muted">
                    <Wallet size={15} aria-hidden />
                    <span>Orçamento previsto</span>
                  </div>
                  <dd className="font-semibold tabular-nums text-ink">
                    {budget > 0 ? formatCurrency(budget) : 'Não informado'}
                  </dd>
                </div>
              </dl>
            </section>
          )}
        </form>

        <DialogFooter className="shrink-0">
          <Button variant="secondary" type="button" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="nova-obra-form"
            loading={create.isPending}
            disabled={eligibleContracts.length === 0}
          >
            Criar obra
          </Button>
        </DialogFooter>
      </DialogContent>

      {selectedContract && (
        <>
          <ContractQuickViewModal
            contractId={selectedContract.id}
            open={contractInfoOpen}
            onClose={() => setContractInfoOpen(false)}
          />
          <ContractPreviewModal
            open={previewOpen}
            title={selectedContract.title}
            html={
              loadingPreview
                ? '<p style="padding:1rem;color:#64748b">Carregando preview…</p>'
                : (contractPreview?.html ?? '<p style="padding:1rem;color:#64748b">Preview indisponível.</p>')
            }
            description="Visualize o documento do contrato antes de vincular à obra."
            onClose={() => setPreviewOpen(false)}
          />
        </>
      )}
    </Dialog>
  );
}
