import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@shared/lib/api';
import { Card } from '@shared/components/ui/Card';
import { Button } from '@shared/components/ui/Button';
import { Input, Select, Textarea } from '@shared/components/ui/Input';
import { Badge } from '@shared/components/ui/Badge';
import { PageHeader } from '@shared/components/ui/PageHeader';
import { Tabs, TabsList, TabsTrigger } from '@shared/components/ui/tabs';
import { ListLoadingOverlay } from '@shared/components/ui/ListLoadingOverlay';
import { PageSkeleton } from '@shared/components/ui/PageLoader';
import { QueryErrorState } from '@shared/components/ui/QueryErrorState';
import NotFoundPage from '@features/errors/pages/NotFoundPage';
import { getQueryErrorMessage, isNotFoundError } from '@shared/lib/query-errors';
import { useIsAdmin } from '@/stores/auth-store';
import { FileDropzone } from '@shared/components/ui/FileDropzone';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@shared/components/ui/dialog';
import { useConfirm } from '@shared/components/ConfirmProvider';
import { VistoriaDetailModal, VistoriaListItem, type ObraVistoria } from '@features/obras/components/VistoriaDetailModal';
import { ObraClosePreview } from '@features/obras/components/ObraClosePreview';
import { ObraPreviewTab } from '@features/obras/components/ObraPreviewTab';
import { ObraReportModal } from '@features/obras/components/ObraReportModal';
import { ContractQuickViewModal } from '@features/contracts/components/ContractQuickViewModal';
import { notify } from '@shared/lib/notify';
import { LancarCustoModal } from '@features/obras/components/LancarCustoModal';
import { EmitirOrdemCompraModal } from '@features/obras/components/EmitirOrdemCompraModal';
import { ObraCustosTab } from '@features/obras/components/ObraCustosTab';
import { ObraOrdensCompraTab } from '@features/obras/components/ObraOrdensCompraTab';
import { ObraRoteiroTab } from '@features/obras/components/ObraRoteiroTab';
import { ObraAuditoriaTab } from '@features/obras/components/ObraAuditoriaTab';
import { ObraBudgetOverview } from '@features/obras/components/ObraBudgetOverview';
import type { ObraPurchaseOrder, ObraStep, ObraTab } from '@features/obras/types';
import { getObraTabs } from '@features/obras/types';
import { formatCurrency, statusLabels } from '@shared/lib/format';
import {
  directCostCategories,
  purchaseOrderCategories,
  useCostCategories,
} from '@features/obras/lib/cost-categories';
import { computeBudgetSummary, getBudgetCompactLabel } from '@features/obras/lib/budget-summary';

function todayInputValue() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function uploadVistoriaPhotos(obraId: string, files: File[]) {
  if (!files.length) return [] as string[];
  const urls: string[] = [];
  for (const file of files) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('entityType', 'Obra');
    fd.append('entityId', obraId);
    const res = await api.post('/uploads', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    urls.push(res.data.url as string);
  }
  return urls;
}

export default function ObraDetailPage() {
  const isAdmin = useIsAdmin();
  const { id } = useParams();
  const [tab, setTab] = useState<ObraTab>('Roteiro');
  const [vistoriaFiles, setVistoriaFiles] = useState<File[]>([]);
  const [selectedVistoria, setSelectedVistoria] = useState<ObraVistoria | null>(null);
  const [custoModalOpen, setCustoModalOpen] = useState(false);
  const [vistoriaModalOpen, setVistoriaModalOpen] = useState(false);
  const [ocModalOpen, setOcModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [closeReportDraft, setCloseReportDraft] = useState(true);
  const [contractInfoOpen, setContractInfoOpen] = useState(false);
  const qc = useQueryClient();
  const confirm = useConfirm();
  const { data: costCatalog } = useCostCategories();
  const directCategories = directCostCategories(costCatalog?.categories);
  const poCategories = purchaseOrderCategories(costCatalog?.categories);
  const poApprovalThreshold = costCatalog?.poApprovalThreshold ?? 5000;
  const tabs = useMemo(() => getObraTabs(isAdmin), [isAdmin]);

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['obra', id],
    queryFn: async () => (await api.get(`/obras/${id}`)).data,
    enabled: !!id,
  });

  function activateTab(next: ObraTab) {
    setTab(next);
    if (!id) return;
    if (next === 'Auditoria') {
      void qc.invalidateQueries({ queryKey: ['obra-audit', id] });
    } else if (next === 'Preview') {
      void qc.invalidateQueries({ queryKey: ['obra-report-preview', id] });
    }
  }

  const addCusto = useMutation({
    mutationFn: (body: object) => api.post(`/obras/${id}/custos`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['obra', id] });
      qc.invalidateQueries({ queryKey: ['obra-audit', id] });
      qc.invalidateQueries({ queryKey: ['obra-report-preview', id] });
      setCustoModalOpen(false);
    },
    meta: { successMessage: 'Custo registrado' },
  });

  const addVistoria = useMutation({
    mutationFn: async (body: {
      type: string;
      description: string;
      startedAt: string;
      endedAt: string;
      obraStepId?: string;
    }) => {
      const photoUrls = await uploadVistoriaPhotos(id!, vistoriaFiles);
      return api.post(`/obras/${id}/vistorias`, { ...body, photoUrls });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['obra', id] });
      qc.invalidateQueries({ queryKey: ['obra-audit', id] });
      qc.invalidateQueries({ queryKey: ['obra-report-preview', id] });
      setVistoriaFiles([]);
      setVistoriaModalOpen(false);
    },
    meta: { successMessage: 'Vistoria registrada' },
  });

  const createOrder = useMutation({
    mutationFn: (body: object) => api.post('/purchase-orders', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['obra', id] });
      qc.invalidateQueries({ queryKey: ['obra-audit', id] });
      qc.invalidateQueries({ queryKey: ['obra-report-preview', id] });
      setOcModalOpen(false);
    },
    meta: { successMessage: 'Ordem de compra emitida' },
  });

  const approveOrder = useMutation({
    mutationFn: (orderId: string) => api.post(`/purchase-orders/${orderId}/approve`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['obra', id] });
      qc.invalidateQueries({ queryKey: ['obra-audit', id] });
    },
    meta: { successMessage: 'Ordem de compra aprovada' },
  });

  const receiveOrder = useMutation({
    mutationFn: ({ orderId, amount }: { orderId: string; amount: number }) =>
      api.post(`/purchase-orders/${orderId}/receive`, { amount }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['obra', id] });
      qc.invalidateQueries({ queryKey: ['obra-audit', id] });
    },
    meta: { successMessage: 'Recebimento registrado' },
  });

  const updateBudget = useMutation({
    mutationFn: (budgetPlanned: number) => api.patch(`/obras/${id}/budget`, { budgetPlanned }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['obra', id] });
    },
    meta: { successMessage: 'Orçamento atualizado' },
  });

  const closeObra = useMutation({
    mutationFn: () => api.post(`/obras/${id}/close`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['obra', id] });
      qc.invalidateQueries({ queryKey: ['obras'] });
      qc.invalidateQueries({ queryKey: ['obra-audit', id] });
    },
    meta: { successMessage: 'Obra encerrada' },
  });

  if (isLoading) return <PageSkeleton />;
  if (isError) {
    if (isNotFoundError(error)) {
      return (
        <NotFoundPage
          compact
          title="Obra não encontrada"
          description="Esta obra não existe ou você não tem permissão para visualizá-la."
        />
      );
    }
    return (
      <QueryErrorState
        description={getQueryErrorMessage(error)}
        onRetry={() => refetch()}
        retrying={isFetching}
      />
    );
  }
  if (!data) return <PageSkeleton />;

  const isClosed = data.status === 'encerrada';
  const canEdit = isAdmin && !isClosed;

  const stepsDone = data.steps?.filter((s: { done: boolean }) => s.done).length ?? 0;
  const stepsTotal = data.steps?.length ?? 0;
  const linkedContractId = data.contract?.id ?? data.contractId ?? null;
  const budgetSummary = computeBudgetSummary({
    budgetPlanned: data.budgetPlanned ?? 0,
    budgetRealized: data.budgetRealized ?? 0,
    purchaseOrders: (data.purchaseOrders ?? []) as ObraPurchaseOrder[],
    custos: data.custos ?? [],
  });

  async function handleCloseObra() {
    const { data: readiness } = await api.get<{
      blockers: string[];
      warnings: string[];
      canClose: boolean;
      complete: boolean;
    }>(`/obras/${id}/close-readiness`);

    if (!readiness.canClose) {
      notify.error('Não é possível encerrar a obra', {
        description: readiness.blockers.join(' · '),
      });
      return;
    }

    const ok = await confirm({
      title: 'Encerrar obra?',
      body: (
        <ObraClosePreview
          obra={{
            name: data.name,
            address: data.address,
            budgetPlanned: data.budgetPlanned,
            budgetRealized: data.budgetRealized,
            contract: data.contract,
            steps: data.steps,
            custos: data.custos,
            vistorias: data.vistorias,
            purchaseOrders: data.purchaseOrders,
          }}
          blockers={readiness.blockers}
          warnings={readiness.warnings}
          canClose={readiness.canClose}
          complete={readiness.complete}
          onOpenReport={() => {
            setCloseReportDraft(false);
            setReportModalOpen(true);
          }}
        />
      ),
      confirmLabel: 'Encerrar obra',
      variant: 'destructive',
    });
    if (ok) closeObra.mutate();
  }

  function openReportPreview(draft: boolean) {
    setCloseReportDraft(draft);
    setReportModalOpen(true);
  }

  return (
    <div>
      <PageHeader
        backTo="/obras"
        backLabel="Obras"
        title={data.name}
        description="Detalhe da obra"
        status={<Badge status={data.status} label={statusLabels[data.status] ?? data.status} />}
        actions={
          linkedContractId || canEdit || id ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" onClick={() => openReportPreview(isClosed ? false : true)}>
                {isClosed ? 'Baixar relatório' : 'Preview relatório'}
              </Button>
              {linkedContractId && (
                <Button variant="secondary" onClick={() => setContractInfoOpen(true)}>
                  Visualizar contrato
                </Button>
              )}
              {canEdit && (
                <Button loading={closeObra.isPending} onClick={() => handleCloseObra()}>
                  Encerrar obra
                </Button>
              )}
            </div>
          ) : undefined
        }
      />

      {isClosed && (
        <Card className="mb-6 border-border bg-surface-sunken py-3 text-sm text-ink-muted">
          Obra encerrada — somente visualização
        </Card>
      )}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="py-3 text-sm">
          <p className="text-ink-muted">Roteiro</p>
          <p className="font-medium">{stepsDone}/{stepsTotal} etapas</p>
        </Card>
        <Card className="py-3 text-sm">
          <p className="text-ink-muted">Orçamento</p>
          <p className="font-medium">
            {getBudgetCompactLabel(budgetSummary)}
            {budgetSummary.planned > 0 && (
              <span className="text-ink-muted">
                {' '}
                · {formatCurrency(data.budgetRealized ?? 0)} / {formatCurrency(budgetSummary.planned)}
              </span>
            )}
          </p>
        </Card>
        <Card className="py-3 text-sm">
          <p className="text-ink-muted">Vistorias</p>
          <p className="font-medium">{data.vistorias?.length ?? 0} registro(s)</p>
        </Card>
        <Card className="py-3 text-sm">
          <p className="text-ink-muted">Ordens de compra</p>
          <p className="font-medium">{data.purchaseOrders?.length ?? 0} O.C.</p>
        </Card>
      </div>

      <div className="mb-6">
        <ObraBudgetOverview
          budgetPlanned={data.budgetPlanned ?? 0}
          budgetRealized={data.budgetRealized ?? 0}
          custos={data.custos ?? []}
          purchaseOrders={(data.purchaseOrders ?? []) as ObraPurchaseOrder[]}
          canEdit={canEdit}
          budgetUpdating={updateBudget.isPending}
          onBudgetUpdate={
            canEdit ? (budgetPlanned) => updateBudget.mutate(budgetPlanned) : undefined
          }
          onGoToCustos={() => activateTab('Custos')}
        />
      </div>

      {linkedContractId && (
        <Card className="mb-6 border-brand/20 bg-brand/5">
          <p className="text-sm">
            <strong>Contrato vinculado:</strong>{' '}
            <button
              type="button"
              className="text-brand hover:underline"
              onClick={() => setContractInfoOpen(true)}
            >
              {data.contract?.title ?? 'Ver contrato'}
            </button>
            {data.contract?.partyName ? ` · ${data.contract.partyName}` : ''}
          </p>
        </Card>
      )}

      <Tabs value={tab} onValueChange={(v) => activateTab(v as ObraTab)} className="mb-6">
        <TabsList>
          {tabs.map((t) => (
            <TabsTrigger key={t} value={t} onClick={() => activateTab(t)}>
              {t}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {tab === 'Roteiro' && (
        <ObraRoteiroTab
          obraId={id!}
          steps={(data.steps ?? []) as ObraStep[]}
          canEdit={canEdit}
          loading={isFetching}
        />
      )}

      {tab === 'Custos' && (
        <ObraCustosTab
          budgetPlanned={data.budgetPlanned}
          custos={data.custos ?? []}
          canEdit={canEdit}
          loading={isFetching}
          onLancarCusto={() => setCustoModalOpen(true)}
        />
      )}

      {tab === 'Preview' && id && <ObraPreviewTab obraId={id} />}

      {tab === 'Vistorias' && (
        <ListLoadingOverlay loading={isFetching}>
        <Card>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="font-medium">Vistorias registradas</h3>
            {canEdit && (
              <Button size="sm" onClick={() => setVistoriaModalOpen(true)}>Nova vistoria</Button>
            )}
          </div>
          <ul className="space-y-3">
            {!data.vistorias?.length && (
              <p className="text-sm text-muted-foreground">Nenhuma vistoria registrada.</p>
            )}
            {data.vistorias?.map((v: ObraVistoria) => (
              <li key={v.id}>
                <VistoriaListItem vistoria={v} onOpen={() => setSelectedVistoria(v)} />
              </li>
            ))}
          </ul>
          <VistoriaDetailModal
            vistoria={selectedVistoria}
            open={!!selectedVistoria}
            onClose={() => setSelectedVistoria(null)}
          />
        </Card>
        </ListLoadingOverlay>
      )}

      {tab === 'O.C.' && (
        <ObraOrdensCompraTab
          orders={(data.purchaseOrders ?? []) as ObraPurchaseOrder[]}
          canEdit={canEdit}
          loading={isFetching}
          onEmitir={() => setOcModalOpen(true)}
          approveLoading={approveOrder.isPending}
          receiveLoading={receiveOrder.isPending}
          onApprove={async (order) => {
            const ok = await confirm({
              title: 'Aprovar ordem de compra?',
              description: `${order.number} — ${formatCurrency(order.amount)}`,
              confirmLabel: 'Aprovar',
            });
            if (ok) approveOrder.mutate(order.id);
          }}
          onReceive={async (order) => {
            const pending = order.amount - (order.receivedAmount ?? 0);
            const ok = await confirm({
              title: 'Registrar recebimento?',
              description: `Valor pendente: ${formatCurrency(pending)}`,
              confirmLabel: 'Confirmar recebimento',
            });
            if (ok) receiveOrder.mutate({ orderId: order.id, amount: pending });
          }}
        />
      )}

      {tab === 'Auditoria' && isAdmin && id && <ObraAuditoriaTab obraId={id} />}

      <LancarCustoModal
        open={custoModalOpen}
        onOpenChange={setCustoModalOpen}
        obraName={data.name}
        budgetPlanned={data.budgetPlanned}
        budgetRealized={data.budgetRealized ?? 0}
        budgetCommitted={budgetSummary.committed}
        categories={directCategories}
        steps={(data.steps ?? []) as ObraStep[]}
        loading={addCusto.isPending}
        onSubmit={(body) => addCusto.mutate(body)}
      />

      <Dialog
        open={vistoriaModalOpen}
        onOpenChange={(open) => {
          setVistoriaModalOpen(open);
          if (!open) setVistoriaFiles([]);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader className="shrink-0">
            <DialogTitle>Nova vistoria</DialogTitle>
            <DialogDescription>Registre uma vistoria com descrição e fotos opcionais.</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto pr-1">
            <form
              id="vistoria-form"
              className="min-w-0 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const startedAt = String(fd.get('startedAt'));
                const endedAt = String(fd.get('endedAt'));
                const obraStepId = String(fd.get('obraStepId') || '');
                addVistoria.mutate({
                  type: String(fd.get('type')),
                  description: String(fd.get('description')),
                  startedAt,
                  endedAt,
                  ...(obraStepId ? { obraStepId } : {}),
                });
              }}
            >
              <Select name="type" label="Tipo" defaultValue="INICIAL">
                <option value="INICIAL">Inicial</option>
                <option value="INTERMEDIARIA">Intermediária</option>
                <option value="FINAL">Final</option>
                <option value="MANUTENCAO">Manutenção</option>
              </Select>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input name="startedAt" label="Data início" type="date" required defaultValue={todayInputValue()} />
                <Input name="endedAt" label="Data fim" type="date" required defaultValue={todayInputValue()} />
              </div>
              {(data.steps?.length ?? 0) > 0 && (
                <Select name="obraStepId" label="Etapa do roteiro (opcional)" defaultValue="">
                  <option value="">Sem vínculo</option>
                  {(data.steps as ObraStep[]).map((s) => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
                </Select>
              )}
              <Textarea name="description" label="Descrição" required />
              <FileDropzone
                label="Fotos (opcional)"
                hint="Arraste as fotos ou clique para selecionar"
                accept="image/*"
                files={vistoriaFiles}
                onFilesChange={setVistoriaFiles}
              />
            </form>
          </div>
          <DialogFooter className="shrink-0">
            <Button variant="secondary" type="button" onClick={() => setVistoriaModalOpen(false)}>Cancelar</Button>
            <Button type="submit" form="vistoria-form" loading={addVistoria.isPending}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EmitirOrdemCompraModal
        open={ocModalOpen}
        onOpenChange={setOcModalOpen}
        obraName={data.name}
        categories={poCategories}
        poApprovalThreshold={poApprovalThreshold}
        steps={(data.steps ?? []) as ObraStep[]}
        loading={createOrder.isPending}
        onSubmit={(body) =>
          createOrder.mutate({
            obraId: id,
            ...body,
          })
        }
      />

      {linkedContractId && (
        <ContractQuickViewModal
          contractId={linkedContractId}
          open={contractInfoOpen}
          onClose={() => setContractInfoOpen(false)}
        />
      )}

      {id && (
        <ObraReportModal
          open={reportModalOpen}
          onOpenChange={setReportModalOpen}
          obraId={id}
          obraName={data.name}
          draft={closeReportDraft}
        />
      )}
    </div>
  );
}
