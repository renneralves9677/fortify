import { useState, useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@shared/lib/api';
import { PageHeader } from '@shared/components/ui/PageHeader';
import { Card } from '@shared/components/ui/Card';
import { Badge } from '@shared/components/ui/Badge';
import { Button } from '@shared/components/ui/Button';
import { Tabs, TabsList, TabsTrigger } from '@shared/components/ui/tabs';
import { useConfirm } from '@shared/components/ConfirmProvider';
import { PageSkeleton } from '@shared/components/ui/PageLoader';
import { QueryErrorState } from '@shared/components/ui/QueryErrorState';
import NotFoundPage from '@features/errors/pages/NotFoundPage';
import { getQueryErrorMessage, isNotFoundError } from '@shared/lib/query-errors';
import { formatCurrency, formatDate, formatDateTimeHuman, statusLabels } from '@shared/lib/format';
import { SignatureTimeline } from '@features/signatures/components/SignatureTimeline';
import { DocumentViewer } from '@features/signatures/components/DocumentViewer';
import { useIsAdmin } from '@/stores/auth-store';

const eventLabels: Record<string, string> = {
  FLOW_STARTED: 'Fluxo iniciado',
  DOCUMENT_FROZEN: 'Documento congelado',
  LINK_SENT: 'Link enviado',
  LINK_OPENED: 'Link aberto',
  CONSENT_ACCEPTED: 'Consentimento aceito',
  SIGNATURE_APPLIED: 'Assinatura aplicada',
  SIGNER_ACTIVATED: 'Próximo signatário ativado',
  FLOW_COMPLETED: 'Fluxo concluído',
  FLOW_CANCELLED: 'Fluxo cancelado',
  LINK_EXPIRED: 'Link expirado',
  DOCUMENT_GENERATED: 'PDF gerado',
};

export default function ContractDetailPage() {
  const isAdmin = useIsAdmin();
  const { id } = useParams();
  const { pathname } = useLocation();
  const backTo = pathname.startsWith('/contratos/assinaturas/') ? '/contratos/assinaturas' : '/contratos';
  const qc = useQueryClient();
  const [tab, setTab] = useState<'resumo' | 'rastreabilidade' | 'documento' | 'versoes'>('resumo');

  const { data: contract, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['contract', id],
    queryFn: async () => (await api.get(`/contracts/${id}`)).data,
    enabled: !!id,
  });

  const { data: flow } = useQuery({
    queryKey: ['contract-flow', id],
    queryFn: async () => (await api.get(`/signatures/contracts/${id}/flow`)).data,
    enabled: !!id,
  });

  const { data: timeline = [] } = useQuery({
    queryKey: ['flow-timeline', flow?.id],
    queryFn: async () => (await api.get(`/signatures/flows/${flow.id}/timeline`)).data,
    enabled: !!flow?.id,
  });

  const { data: preview } = useQuery({
    queryKey: ['contract-preview', id],
    queryFn: async () => (await api.get(`/contracts/${id}/preview`)).data,
    enabled: !!id && tab === 'documento',
  });

  const { data: versions = [] } = useQuery({
    queryKey: ['contract-versions', id],
    queryFn: async () => (await api.get(`/contracts/${id}/versions`)).data,
    enabled: !!id && tab === 'versoes',
  });

  const confirm = useConfirm();

  const workflow = useMutation({
    mutationFn: (action: string) => api.post(`/workflow/contracts/${id}/${action}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contract', id] });
    },
    meta: { successMessage: 'Workflow atualizado' },
  });

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  const loadPdfPreview = async () => {
    const res = await api.get(`/signatures/contracts/${id}/documents/signed`, {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(res.data);
    setPdfUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
  };

  useEffect(() => {
    if (tab === 'documento' && flow?.status === 'COMPLETED' && !pdfUrl) {
      loadPdfPreview().catch(() => undefined);
    }
  }, [tab, flow?.status, id, pdfUrl]);

  const downloadPdf = async () => {
    const res = await api.get(`/signatures/contracts/${id}/documents/signed`, {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contrato-${id?.slice(0, 8)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return <PageSkeleton />;
  if (isError) {
    if (isNotFoundError(error)) {
      return (
        <NotFoundPage
          compact
          title="Contrato não encontrado"
          description="Este contrato não existe ou você não tem permissão para visualizá-lo."
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
  if (!contract) return <PageSkeleton />;

  const tabs = [
    { key: 'resumo' as const, label: 'Resumo' },
    { key: 'rastreabilidade' as const, label: 'Rastreabilidade' },
    { key: 'documento' as const, label: 'Documento' },
    { key: 'versoes' as const, label: 'Versões' },
  ];

  return (
    <div>
      <PageHeader
        backTo={backTo}
        title={contract.title}
        description={`Parte: ${contract.partyName}`}
        status={<Badge status={contract.status} label={statusLabels[contract.status]} />}
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mb-4">
        <TabsList>
          {tabs.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {tab === 'resumo' && (
        <Card className="space-y-3">
          <p><strong>Status:</strong> <Badge status={contract.status} label={statusLabels[contract.status]} /></p>
          <p><strong>Valor:</strong> {formatCurrency(Number(contract.value))}</p>
          <p><strong>Vigência:</strong> {formatDate(contract.startDate)} → {formatDate(contract.endDate)}</p>
          {isAdmin && (
            <div className="flex flex-wrap gap-2 pt-2">
              {contract.status === 'RASCUNHO' && (
                <Button size="sm" onClick={() => workflow.mutate('submit-revisao')}>Enviar para revisão</Button>
              )}
              {contract.status === 'REVISAO' && (
                <Button size="sm" onClick={() => workflow.mutate('submit-aprovacao')}>Submeter aprovação</Button>
              )}
              {contract.status === 'APROVACAO' && (
                <>
                  <Button size="sm" onClick={() => workflow.mutate('approve-step')}>Aprovar etapa</Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      const ok = await confirm({
                        title: 'Rejeitar aprovação?',
                        description: 'O contrato voltará para revisão.',
                        confirmLabel: 'Rejeitar',
                        variant: 'destructive',
                      });
                      if (ok) workflow.mutate('reject');
                    }}
                  >
                    Rejeitar
                  </Button>
                </>
              )}
            </div>
          )}
          {flow && (
            <>
              <h3 className="pt-2 font-semibold">Fluxo de assinatura</h3>
              <Badge status={flow.status} label={statusLabels[flow.status] ?? flow.status} />
              <SignatureTimeline signers={flow.signers} />
            </>
          )}
        </Card>
      )}

      {tab === 'rastreabilidade' && (
        <Card>
          {!flow ? (
            <p className="text-ink-muted">Nenhum fluxo de assinatura registrado.</p>
          ) : (
            <ol className="space-y-4">
              {timeline.map((ev: { id: string; eventType: string; createdAt: string; signerName?: string; ip?: string; eventHash: string }) => (
                <li key={ev.id} className="border-l-2 border-brand/30 pl-4">
                  <p className="font-medium">{eventLabels[ev.eventType] ?? ev.eventType}</p>
                  <p className="text-xs text-ink-muted">
                    {formatDateTimeHuman(ev.createdAt)}
                    {ev.signerName ? ` · ${ev.signerName}` : ''}
                    {ev.ip ? ` · IP ${ev.ip}` : ''}
                  </p>
                  <p className="mt-1 truncate font-mono text-[10px] text-ink-muted">{ev.eventHash}</p>
                </li>
              ))}
            </ol>
          )}
        </Card>
      )}

      {tab === 'documento' && (
        <Card className="space-y-4">
          {flow?.status === 'COMPLETED' ? (
            <>
              <p className="text-sm text-success">Contrato assinado — PDF disponível para download.</p>
              <Button onClick={downloadPdf}>Baixar PDF assinado</Button>
              {pdfUrl && (
                <iframe
                  title="PDF assinado"
                  className="h-[70vh] w-full rounded-card border border-border"
                  src={pdfUrl}
                />
              )}
            </>
          ) : preview ? (
            <>
              <p className="text-sm text-ink-muted">Preview do contrato (rascunho ou em assinatura).</p>
              <DocumentViewer html={preview.html} />
            </>
          ) : (
            <PageSkeleton />
          )}
        </Card>
      )}

      {tab === 'versoes' && (
        <Card>
          {versions.length === 0 ? (
            <p className="text-ink-muted">Nenhuma versão registrada.</p>
          ) : (
            <ul className="space-y-3">
              {versions.map((v: { id: string; versionNumber: string; changeReason?: string; createdAt: string }) => (
                <li key={v.id} className="rounded-card border border-border px-4 py-3">
                  <p className="font-medium">Versão {v.versionNumber}</p>
                  <p className="text-sm text-ink-muted">{formatDate(v.createdAt)}</p>
                  {v.changeReason && <p className="mt-1 text-sm">{v.changeReason}</p>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
