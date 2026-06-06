import { useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { api } from '@shared/lib/api';
import { Badge } from '@shared/components/ui/Badge';
import { Button } from '@shared/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@shared/components/ui/dialog';
import { PageSkeleton } from '@shared/components/ui/PageLoader';
import { contractTypeLabels, type ContractType } from '@features/contracts/api/contracts';
import { SignatureTimeline } from '@features/signatures/components/SignatureTimeline';
import { formatCurrency, formatDate, statusLabels } from '@shared/lib/format';

type ContractDetail = {
  id: string;
  title: string;
  partyName: string;
  partyDocument?: string | null;
  type: string;
  status: string;
  value: number;
  startDate?: string | null;
  endDate?: string | null;
  vigenciaRestanteDias?: number | null;
};

type SignatureFlow = {
  id: string;
  status: string;
  signers: { signOrder: number; name: string; role: string; status: string }[];
};

type ContractQuickViewModalProps = {
  contractId: string | null;
  open: boolean;
  onClose: () => void;
};

export function ContractQuickViewModal({ contractId, open, onClose }: ContractQuickViewModalProps) {
  const { data: contract, isLoading: loadingContract } = useQuery({
    queryKey: ['contract', contractId],
    queryFn: async () => (await api.get<ContractDetail>(`/contracts/${contractId}`)).data,
    enabled: open && !!contractId,
  });

  const { data: flow, isLoading: loadingFlow } = useQuery({
    queryKey: ['contract-flow', contractId],
    queryFn: async () => (await api.get<SignatureFlow>(`/signatures/contracts/${contractId}/flow`)).data,
    enabled: open && !!contractId,
  });

  const loading = loadingContract;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex max-h-[90vh] max-w-lg flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>{contract?.title ?? 'Contrato'}</DialogTitle>
          <DialogDescription>
            Informações do contrato selecionado para vincular à obra.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {loading ? (
            <PageSkeleton />
          ) : contract ? (
            <div className="space-y-4 text-sm">
              <dl className="space-y-3 rounded-control border border-border bg-surface-sunken/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-muted">Status</dt>
                  <dd>
                    <Badge status={contract.status} label={statusLabels[contract.status] ?? contract.status} />
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-muted">Contraparte</dt>
                  <dd className="text-right font-medium text-ink">{contract.partyName}</dd>
                </div>
                {contract.partyDocument && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-muted">Documento</dt>
                    <dd className="text-right text-ink">{contract.partyDocument}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-muted">Tipo</dt>
                  <dd className="text-ink">
                    {contractTypeLabels[contract.type as ContractType] ?? contract.type}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-muted">Valor</dt>
                  <dd className="font-medium tabular-nums text-ink">{formatCurrency(contract.value)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-muted">Vigência</dt>
                  <dd className="text-right text-ink">
                    {contract.startDate ? formatDate(contract.startDate) : '—'}
                    {' → '}
                    {contract.endDate ? formatDate(contract.endDate) : '—'}
                  </dd>
                </div>
                {contract.vigenciaRestanteDias != null && contract.vigenciaRestanteDias >= 0 && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-muted">Dias restantes</dt>
                    <dd className="tabular-nums text-ink">{contract.vigenciaRestanteDias}</dd>
                  </div>
                )}
              </dl>

              {loadingFlow ? (
                <p className="text-ink-muted">Carregando assinaturas…</p>
              ) : flow ? (
                <section>
                  <h3 className="mb-2 font-medium text-ink">Assinaturas</h3>
                  <div className="mb-3">
                    <Badge status={flow.status} label={statusLabels[flow.status] ?? flow.status} />
                  </div>
                  <SignatureTimeline signers={flow.signers} />
                </section>
              ) : (
                <p className="text-ink-muted">Nenhum fluxo de assinatura registrado.</p>
              )}
            </div>
          ) : (
            <p className="text-ink-muted">Contrato não encontrado.</p>
          )}
        </div>

        <DialogFooter className="shrink-0">
          {contract && (
            <a
              href={`/contratos/${contract.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mr-auto inline-flex items-center gap-1 text-xs text-ink-muted hover:text-brand"
            >
              Página completa
              <ExternalLink size={12} aria-hidden />
            </a>
          )}
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
