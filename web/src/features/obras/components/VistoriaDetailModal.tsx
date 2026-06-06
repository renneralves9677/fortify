import { useEffect, useState } from 'react';
import { Download, ExternalLink, ImageIcon } from 'lucide-react';
import { api } from '@shared/lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@shared/components/ui/dialog';
import { Button } from '@shared/components/ui/Button';
import { Badge } from '@shared/components/ui/Badge';
import { formatDate } from '@shared/lib/format';
import { RecordCreatorSection } from '@features/obras/components/RecordCreatorSection';
import type { ObraRecordCreator } from '@features/obras/types';

export type ObraVistoria = {
  id: string;
  type: string;
  description: string;
  photoUrls: string[];
  startedAt?: string;
  endedAt?: string;
  stepTitle?: string | null;
  createdAt: string;
  createdBy?: ObraRecordCreator;
};

const vistoriaTypeLabels: Record<string, string> = {
  INICIAL: 'Inicial',
  INTERMEDIARIA: 'Intermediária',
  FINAL: 'Final',
  MANUTENCAO: 'Manutenção',
};

export function uploadIdFromUrl(url: string) {
  const m = url.match(/\/uploads\/([^/?#]+)(?:\/file)?/);
  return m?.[1] ?? null;
}

function useUploadBlob(uploadId: string | null) {
  const [src, setSrc] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!uploadId) return;
    let objectUrl: string | null = null;
    setLoading(true);
    setError(false);
    api
      .get(`/uploads/${uploadId}/file`, { responseType: 'blob' })
      .then((res) => {
        objectUrl = URL.createObjectURL(res.data);
        setSrc(objectUrl);
        setMimeType(res.data.type || null);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setSrc(null);
      setMimeType(null);
    };
  }, [uploadId]);

  return { src, mimeType, loading, error };
}

export function UploadPreview({
  uploadId,
  className,
  onOpen,
  interactive = true,
}: {
  uploadId: string;
  className?: string;
  onOpen?: (src: string) => void;
  interactive?: boolean;
}) {
  const { src, mimeType, loading, error } = useUploadBlob(uploadId);
  const isImage = mimeType?.startsWith('image/');

  if (loading) {
    return <div className={`animate-pulse rounded-lg bg-muted ${className ?? 'h-40 w-full'}`} />;
  }

  if (error || !src) {
    return (
      <div className={`flex items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 text-sm text-muted-foreground ${className ?? 'h-40 w-full'}`}>
        Arquivo indisponível
      </div>
    );
  }

  if (isImage) {
    if (!interactive) {
      return (
        <img
          src={src}
          alt=""
          className={`rounded-lg border border-border object-cover ${className ?? 'h-40 w-full'}`}
        />
      );
    }
    return (
      <button
        type="button"
        className={`group relative overflow-hidden rounded-lg border border-border ${className ?? 'h-40 w-full'}`}
        onClick={() => onOpen?.(src)}
      >
        <img src={src} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
        <span className="absolute inset-x-0 bottom-0 bg-black/50 py-1 text-xs text-white opacity-0 transition group-hover:opacity-100">
          Ampliar
        </span>
      </button>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center gap-2 rounded-lg border border-border bg-muted/30 p-4 ${className ?? ''}`}>
      <ImageIcon className="h-8 w-8 text-muted-foreground" />
      <Button size="sm" variant="secondary" onClick={() => window.open(src, '_blank')}>
        Abrir arquivo
      </Button>
    </div>
  );
}

interface VistoriaDetailModalProps {
  vistoria: ObraVistoria | null;
  open: boolean;
  onClose: () => void;
}

export function VistoriaDetailModal({ vistoria, open, onClose }: VistoriaDetailModalProps) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!open) setLightboxSrc(null);
  }, [open]);

  if (!vistoria) return null;

  const photoIds = (vistoria.photoUrls ?? [])
    .map(uploadIdFromUrl)
    .filter((id): id is string => !!id);

  const typeLabel = vistoriaTypeLabels[vistoria.type] ?? vistoria.type;

  const fetchUploadBlob = (uploadId: string) =>
    api.get(`/uploads/${uploadId}/file`, { responseType: 'blob' });

  const extensionFromMime = (mime: string) => {
    if (mime.includes('png')) return '.png';
    if (mime.includes('jpeg') || mime.includes('jpg')) return '.jpg';
    if (mime.includes('webp')) return '.webp';
    if (mime.includes('pdf')) return '.pdf';
    return '';
  };

  const openFile = async (uploadId: string) => {
    const res = await fetchUploadBlob(uploadId);
    const url = URL.createObjectURL(res.data);
    window.open(url, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const downloadFile = async (uploadId: string) => {
    const res = await fetchUploadBlob(uploadId);
    const ext = extensionFromMime(res.data.type || '');
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vistoria-${vistoria.id.slice(0, 8)}-${uploadId.slice(0, 8)}${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col">
          <DialogHeader>
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle>Vistoria {typeLabel}</DialogTitle>
              <Badge status="ATIVO" label={typeLabel} />
            </div>
            <DialogDescription>
              {vistoria.startedAt ? (
                <>
                  Período: {formatDate(vistoria.startedAt)}
                  {vistoria.endedAt && vistoria.endedAt !== vistoria.startedAt
                    ? ` — ${formatDate(vistoria.endedAt)}`
                    : ''}
                </>
              ) : (
                <>Registrada em {formatDate(vistoria.createdAt)}</>
              )}
              {vistoria.stepTitle ? ` · Etapa: ${vistoria.stepTitle}` : ''}
              {photoIds.length > 0 ? ` · ${photoIds.length} arquivo(s)` : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 space-y-4 overflow-y-auto py-1">
            <RecordCreatorSection creator={vistoria.createdBy} />

            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Descrição</p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{vistoria.description}</p>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Arquivos e fotos
              </p>
              {photoIds.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                  Nenhum arquivo anexado a esta vistoria.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {photoIds.map((uploadId) => (
                    <div key={uploadId} className="space-y-2">
                      <UploadPreview
                        uploadId={uploadId}
                        className="aspect-[4/3] w-full"
                        onOpen={setLightboxSrc}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="gap-1.5"
                          onClick={() => openFile(uploadId)}
                        >
                          <ExternalLink size={15} aria-hidden />
                          Abrir
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="gap-1.5"
                          onClick={() => downloadFile(uploadId)}
                        >
                          <Download size={15} aria-hidden />
                          Baixar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!lightboxSrc} onOpenChange={(v) => !v && setLightboxSrc(null)}>
        <DialogContent className="max-w-4xl border-none bg-black/95 p-2">
          {lightboxSrc && (
            <img
              src={lightboxSrc}
              alt="Foto da vistoria"
              className="max-h-[85vh] w-full object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function VistoriaListItem({
  vistoria,
  onOpen,
}: {
  vistoria: ObraVistoria;
  onOpen: () => void;
}) {
  const photoIds = (vistoria.photoUrls ?? [])
    .map(uploadIdFromUrl)
    .filter((id): id is string => !!id);
  const firstPhotoId = photoIds[0] ?? null;
  const typeLabel = vistoriaTypeLabels[vistoria.type] ?? vistoria.type;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-start gap-3 rounded-lg border border-border p-3 text-left transition hover:border-brand/40 hover:bg-muted/30"
    >
      {firstPhotoId ? (
        <UploadPreview uploadId={firstPhotoId} className="h-16 w-16 shrink-0" interactive={false} />
      ) : (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-border bg-muted/40">
          <ImageIcon className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">
            {typeLabel} ·{' '}
            {vistoria.startedAt ? formatDate(vistoria.startedAt) : formatDate(vistoria.createdAt)}
            {vistoria.stepTitle ? ` · ${vistoria.stepTitle}` : ''}
          </p>
          {photoIds.length > 0 && (
            <Badge status="ATIVO" label={`${photoIds.length} arquivo(s)`} />
          )}
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{vistoria.description}</p>
        <p className="mt-2 text-xs text-brand">Ver detalhes →</p>
      </div>
    </button>
  );
}
