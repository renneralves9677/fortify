import { useCallback, useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { cn } from '@shared/lib/utils';

// Worker em /public com a mesma versão do pdfjs usado pelo react-pdf (evita mismatch 5.x vs 6.x)
pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs?v=${pdfjs.version}`;

export interface SignatureFieldOverlay {
  key: string;
  role: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  signed?: boolean;
  signatureImage?: string | null;
  signatureTyped?: string | null;
  signerName?: string | null;
  status?: string;
}

interface PdfDocumentViewerProps {
  /** URL, blob URL ou ArrayBuffer do PDF */
  file: string | Blob | ArrayBuffer;
  signatureFields?: SignatureFieldOverlay[];
  highlightKey?: string;
  onScrollPercent?: (percent: number) => void;
  onSignatureFieldClick?: (key: string) => void;
}

const PAGE_WIDTH = 595;

export function PdfDocumentViewer({
  file,
  signatureFields = [],
  highlightKey,
  onScrollPercent,
  onSignatureFieldClick,
}: PdfDocumentViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [numPages, setNumPages] = useState(0);
  const [scrollPercent, setScrollPercent] = useState(0);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    const percent = max <= 0 ? 100 : Math.min(100, Math.round((el.scrollTop / max) * 100));
    setScrollPercent(percent);
    onScrollPercent?.(percent);
  }, [onScrollPercent]);

  useEffect(() => {
    handleScroll();
  }, [numPages, handleScroll]);

  const fieldsByPage = signatureFields.reduce<Record<number, SignatureFieldOverlay[]>>(
    (acc, field) => {
      const page = field.page ?? 0;
      acc[page] = acc[page] ?? [];
      acc[page].push(field);
      return acc;
    },
    {},
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-ink-muted">
        <span>Leitura do documento (PDF)</span>
        <span>{scrollPercent}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface">
        <div
          className="h-full rounded-full bg-brand transition-all"
          style={{ width: `${scrollPercent}%` }}
        />
      </div>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="max-h-[60vh] overflow-y-auto rounded-lg border border-border bg-card p-2"
      >
        <Document
          file={file}
          onLoadSuccess={({ numPages: pages }) => setNumPages(pages)}
          loading={<p className="p-4 text-sm text-ink-muted">Carregando PDF…</p>}
          error={<p className="p-4 text-sm text-danger">Não foi possível carregar o PDF.</p>}
        >
          {Array.from({ length: numPages }, (_, index) => (
            <div key={`page-${index}`} className="relative mx-auto mb-4 w-full max-w-[595px]">
              <Page pageNumber={index + 1} width={PAGE_WIDTH} renderTextLayer={false} />
              {(fieldsByPage[index] ?? []).map((field) => {
                const isPending = !field.signed && field.status !== 'SIGNED';
                const isHighlight = highlightKey === field.key;
                return (
                  <button
                    key={field.key}
                    type="button"
                    disabled={!isPending || !onSignatureFieldClick}
                    onClick={() => onSignatureFieldClick?.(field.key)}
                    className={cn(
                      'absolute rounded-md border-2 text-left transition',
                      isPending
                        ? 'cursor-pointer border-dashed border-brand/60 bg-brand/5 hover:bg-brand/10'
                        : 'border-success/40 bg-success/5',
                      isHighlight && 'ring-2 ring-brand ring-offset-2',
                    )}
                    style={{
                      left: `${(field.x / PAGE_WIDTH) * 100}%`,
                      top: `${((842 - field.y - field.height) / 842) * 100}%`,
                      width: `${(field.width / PAGE_WIDTH) * 100}%`,
                      height: `${(field.height / 842) * 100}%`,
                    }}
                    title={isPending ? 'Clique para assinar aqui' : field.signerName ?? 'Assinado'}
                  >
                    {field.signed && field.signatureImage ? (
                      <img
                        src={field.signatureImage}
                        alt={field.signerName ?? 'Assinatura'}
                        className="h-full w-full object-contain p-1"
                      />
                    ) : field.signed && field.signatureTyped ? (
                      <span className="block p-1 font-serif text-sm text-ink">{field.signatureTyped}</span>
                    ) : (
                      <span className="block p-1 text-xs text-ink-muted">Assinar aqui</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </Document>
      </div>
    </div>
  );
}
