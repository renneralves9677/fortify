import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@shared/lib/api';
import { Card } from '@shared/components/ui/Card';
import { Button } from '@shared/components/ui/Button';
import { Input } from '@shared/components/ui/Input';
import { PageLoader } from '@shared/components/ui/PageLoader';
import { DocumentViewer } from '@features/signatures/components/DocumentViewer';
import { PdfDocumentViewer } from '@features/signatures/components/PdfDocumentViewer';
import { SignatureTimeline } from '@features/signatures/components/SignatureTimeline';
import { SignaturePad } from '@features/signatures/components/SignaturePad';
import { ConsentCheckbox } from '@features/signatures/components/ConsentCheckbox';
import { sanitizeForDisplay } from '@shared/lib/sanitize-html';

export default function PublicSignPage() {
  const { token } = useParams();
  const [signerName, setSignerName] = useState('');
  const [typedSignature, setTypedSignature] = useState('');
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [scrollPercent, setScrollPercent] = useState(0);
  const [consented, setConsented] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [done, setDone] = useState(false);
  const [flowCompleted, setFlowCompleted] = useState(false);
  const [receiptEmailSent, setReceiptEmailSent] = useState(false);
  const [signedHtml, setSignedHtml] = useState<string | null>(null);
  const [signPanelOpen, setSignPanelOpen] = useState(false);
  const [activeFieldKey, setActiveFieldKey] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['public-sign', token],
    queryFn: async () => (await api.get(`/signatures/public/${token}`)).data,
    enabled: !!token,
  });

  const { data: pdfBlob, isLoading: pdfLoading, error: pdfError } = useQuery({
    queryKey: ['public-sign-pdf', token],
    queryFn: async () =>
      (
        await api.get(`/signatures/public/${token}/pdf`, {
          responseType: 'blob',
        })
      ).data as Blob,
    enabled: !!token && data?.pdfMode === true,
    staleTime: Infinity,
  });

  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!pdfBlob) {
      setPdfObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(pdfBlob);
    setPdfObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pdfBlob]);

  const consent = useMutation({
    mutationFn: () =>
      api.post(`/signatures/public/${token}/consent`, {
        acceptTerms: true,
        termsVersion: data.legalTermsVersion,
        privacyVersion: data.legalPrivacyVersion,
      }),
    onSuccess: () => setConsented(true),
  });

  const sendOtp = useMutation({
    mutationFn: () => api.post(`/signatures/public/${token}/otp/send`),
  });

  const verifyOtp = useMutation({
    mutationFn: () => api.post(`/signatures/public/${token}/otp/verify`, { code: otpCode }),
    onSuccess: () => setOtpVerified(true),
  });

  const signLegacy = useMutation({
    mutationFn: () => api.post(`/signatures/public/${token}/sign`, { signerName }),
    onSuccess: () => setDone(true),
  });

  const sign = useMutation({
    mutationFn: () =>
      api.post(`/signatures/public/${token}/sign`, {
        signerName,
        scrollPercent,
        acceptTerms: true,
        signatureImage: signatureImage ?? undefined,
        signatureTyped: !signatureImage && typedSignature ? typedSignature : undefined,
      }),
    onSuccess: async (res) => {
      setDone(true);
      setFlowCompleted(Boolean(res.data.flowCompleted));
      setReceiptEmailSent(Boolean(res.data.receiptEmailSent));
      setSignPanelOpen(false);
      if (res.data.displayHtml) {
        setSignedHtml(res.data.displayHtml);
      } else {
        await refetch();
      }
    },
  });

  async function downloadPublicFile(path: string, filename: string) {
    const res = await api.get(path, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data as Blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const handleSignatureFieldClick = (key: string) => {
    if (!data?.canSign || done) return;
    setActiveFieldKey(key);
    setSignPanelOpen(true);
  };

  if (isLoading) return <PageLoader label="Preparando assinatura…" />;
  if (error) {
    const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center text-danger">
        {msg ?? 'Link inválido ou expirado'}
      </div>
    );
  }

  if (data.legacy) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface p-6">
        <Card className="max-w-2xl animate-fade-up">
          {done ? (
            <p className="text-center text-lg text-success">Contrato assinado com sucesso!</p>
          ) : (
            <>
              <h1 className="text-2xl font-semibold text-ink">{data.contract.title}</h1>
              <div
                className="prose prose-sm mt-6 max-w-none rounded-card border border-border bg-surface p-4 dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: sanitizeForDisplay(data.contract.html) }}
              />
              <div className="mt-6 space-y-4">
                <Input label="Seu nome completo" value={signerName} onChange={(e) => setSignerName(e.target.value)} />
                <Button className="w-full" onClick={() => signLegacy.mutate()} disabled={!signerName || signLegacy.isPending}>Assinar contrato</Button>
              </div>
            </>
          )}
        </Card>
      </div>
    );
  }

  const pdfMode = data.pdfMode === true;
  const documentHtml = signedHtml ?? data.contract.html;
  const canSign = data.canSign && !done;
  const highlightKey =
    activeFieldKey ??
    (canSign && data.currentSigner?.signatureKey ? data.currentSigner.signatureKey : undefined);
  const otpRequired = data.otpRequired !== false;
  const readyForConsent = acceptTerms && (!otpRequired || otpVerified);
  const readyToSign =
    consented &&
    signerName.length >= 2 &&
    scrollPercent >= 95 &&
    acceptTerms &&
    (signatureImage || typedSignature.length >= 2);
  const showPdf = pdfMode && pdfObjectUrl;

  return (
    <div className="min-h-screen bg-surface p-4 md:p-6">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <h1 className="text-2xl font-semibold text-ink">{data.contract.title}</h1>
            <p className="mt-1 text-sm text-ink-muted">Parte: {data.contract.partyName}</p>
            {pdfMode && data.documentPdfHash && (
              <p className="mt-1 font-mono text-xs text-ink-muted">
                Hash PDF: {data.documentPdfHash.slice(0, 16)}…
              </p>
            )}
            {done ? (
              <div className="mt-6 space-y-4">
                <p className="text-center text-lg text-success">Assinatura registrada com sucesso!</p>
                {receiptEmailSent && (
                  <p className="text-center text-sm text-ink-muted">
                    Enviamos o comprovante para seu e-mail.
                  </p>
                )}
                {flowCompleted && (
                  <p className="text-center text-sm text-ink-muted">
                    O documento final assinado também foi enviado por e-mail a todas as partes.
                  </p>
                )}
                <div className="flex flex-wrap justify-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      downloadPublicFile(
                        `/signatures/public/${token}/receipt`,
                        'comprovante-assinatura.pdf',
                      )
                    }
                  >
                    Baixar comprovante
                  </Button>
                  {flowCompleted && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        downloadPublicFile(
                          `/signatures/public/${token}/signed-pdf`,
                          'documento-assinado.pdf',
                        )
                      }
                    >
                      Baixar documento assinado
                    </Button>
                  )}
                </div>
                {showPdf ? (
                  <PdfDocumentViewer file={pdfObjectUrl} signatureFields={data.signatureFields} />
                ) : documentHtml ? (
                  <DocumentViewer html={documentHtml} />
                ) : null}
              </div>
            ) : (
              <div className="mt-6">
                {pdfMode && pdfLoading ? (
                  <p className="p-4 text-sm text-ink-muted">Carregando documento PDF…</p>
                ) : pdfError ? (
                  <p className="p-4 text-sm text-danger">Não foi possível carregar o PDF.</p>
                ) : showPdf ? (
                  <PdfDocumentViewer
                    file={pdfObjectUrl}
                    signatureFields={data.signatureFields}
                    onScrollPercent={setScrollPercent}
                    highlightKey={highlightKey}
                    onSignatureFieldClick={canSign ? handleSignatureFieldClick : undefined}
                  />
                ) : documentHtml ? (
                  <DocumentViewer
                    html={documentHtml}
                    onScrollPercent={setScrollPercent}
                    highlightKey={highlightKey}
                    onSignatureFieldClick={canSign ? handleSignatureFieldClick : undefined}
                  />
                ) : null}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <h2 className="font-semibold text-ink">Partes do contrato</h2>
            <div className="mt-4">
              <SignatureTimeline signers={data.signers} />
            </div>
          </Card>

          {canSign && !done && (signPanelOpen || !pdfMode) && (
            <Card className="space-y-4">
              <h2 className="font-semibold text-ink">
                Assinar como {data.currentSigner?.name}
              </h2>
              {highlightKey && (
                <p className="text-sm text-ink-muted">
                  {pdfMode
                    ? 'Clique no campo "Assinar aqui" no PDF ou preencha os dados abaixo.'
                    : 'Role até o seu bloco de assinatura no documento e clique no campo pendente.'}
                </p>
              )}
              <Input
                label="Nome completo (como no documento)"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
              />
              <ConsentCheckbox
                checked={acceptTerms}
                onChange={setAcceptTerms}
                termsVersion={data.legalTermsVersion}
                privacyVersion={data.legalPrivacyVersion}
              />
              {otpRequired && !otpVerified && (
                <div className="space-y-2 rounded-card border border-border p-3">
                  <p className="text-sm font-medium">Verificação de identidade (OTP)</p>
                  <Button variant="secondary" className="w-full" onClick={() => sendOtp.mutate()} disabled={sendOtp.isPending}>
                    Enviar código
                  </Button>
                  <Input label="Código de 6 dígitos" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} maxLength={6} />
                  <Button className="w-full" onClick={() => verifyOtp.mutate()} disabled={otpCode.length !== 6 || verifyOtp.isPending}>
                    Verificar código
                  </Button>
                </div>
              )}
              {!consented ? (
                <Button
                  className="w-full"
                  disabled={!readyForConsent || consent.isPending}
                  onClick={() => consent.mutate()}
                >
                  Registrar consentimento
                </Button>
              ) : (
                <>
                  <SignaturePad
                    onChange={setSignatureImage}
                    typedName={typedSignature}
                    onTypedNameChange={setTypedSignature}
                  />
                  {scrollPercent < 95 && (
                    <p className="text-xs text-warning">Role o documento até o final ({scrollPercent}% / 95%)</p>
                  )}
                  <Button
                    className="w-full"
                    disabled={!readyToSign || sign.isPending}
                    onClick={() => sign.mutate()}
                  >
                    Assinar contrato
                  </Button>
                </>
              )}
            </Card>
          )}

          {canSign && !done && pdfMode && !signPanelOpen && (
            <Card>
              <p className="text-sm text-ink-muted">
                Clique no campo &quot;Assinar aqui&quot; no documento PDF para iniciar a assinatura.
              </p>
            </Card>
          )}

          {!data.canSign && !done && (
            <Card>
              <p className="text-sm text-ink-muted">
                Este link ainda não está disponível para assinatura.
              </p>
              <Button className="mt-3 w-full" variant="secondary" onClick={() => refetch()}>
                Atualizar status
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
