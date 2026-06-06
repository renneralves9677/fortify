import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { cn } from '@shared/lib/utils';
import { sanitizeForDisplay } from '@shared/lib/sanitize-html';

interface DocumentViewerProps {
  html: string;
  onScrollPercent?: (percent: number) => void;
  highlightKey?: string;
  onSignatureFieldClick?: (key: string) => void;
}

const DOCUMENT_STYLES = `
  body { font-family: system-ui, sans-serif; font-size: 14px; line-height: 1.5; color: #1a1a1a; margin: 0; padding: 16px; }
  .signature-block { border: 1px dashed #94a3b8; border-radius: 8px; padding: 12px; margin: 16px 0; }
  .signature-block--pending { background: #f8fafc; cursor: pointer; }
  .signature-block--pending:hover { border-color: #3b82f6; background: #eff6ff; }
  .signature-block--highlight { outline: 2px solid #3b82f6; outline-offset: 2px; }
  .signature-block--signed { border-style: solid; background: #f0fdf4; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #e2e8f0; padding: 8px; }
`;

export function DocumentViewer({
  html,
  onScrollPercent,
  highlightKey,
  onSignatureFieldClick,
}: DocumentViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [scrollPercent, setScrollPercent] = useState(0);
  const safeHtml = useMemo(() => sanitizeForDisplay(html), [html]);

  const srcDoc = useMemo(
    () =>
      `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${DOCUMENT_STYLES}</style></head><body>${safeHtml}</body></html>`,
    [safeHtml],
  );

  const updateScroll = useCallback(
    (doc: Document) => {
      const scrollEl = doc.documentElement;
      const max = scrollEl.scrollHeight - scrollEl.clientHeight;
      const percent = max <= 0 ? 100 : Math.min(100, Math.round((scrollEl.scrollTop / max) * 100));
      setScrollPercent(percent);
      onScrollPercent?.(percent);
    },
    [onScrollPercent],
  );

  useEffect(() => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!doc) return;

    const onScroll = () => updateScroll(doc);
    doc.addEventListener('scroll', onScroll);
    onScroll();

    const onClick = (event: MouseEvent) => {
      if (!onSignatureFieldClick) return;
      const target = (event.target as HTMLElement).closest<HTMLElement>(
        '[data-signature-key].signature-block--pending',
      );
      if (!target) return;
      const key = target.getAttribute('data-signature-key');
      if (key) onSignatureFieldClick(key);
    };
    doc.addEventListener('click', onClick);

    return () => {
      doc.removeEventListener('scroll', onScroll);
      doc.removeEventListener('click', onClick);
    };
  }, [srcDoc, updateScroll, onSignatureFieldClick]);

  useEffect(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    doc.querySelectorAll('.signature-block--highlight').forEach((el) => {
      el.classList.remove('signature-block--highlight');
    });
    if (!highlightKey) return;
    const target = doc.querySelector<HTMLElement>(`[data-signature-key="${highlightKey}"]`);
    if (!target) return;
    target.classList.add('signature-block--highlight');
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [srcDoc, highlightKey]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-ink-muted">
        <span>Leitura do documento</span>
        <span>{scrollPercent}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface">
        <div
          className="h-full rounded-full bg-brand transition-all"
          style={{ width: `${scrollPercent}%` }}
        />
      </div>
      <iframe
        ref={iframeRef}
        title="Documento do contrato"
        sandbox=""
        srcDoc={srcDoc}
        className={cn('document-viewer h-[60vh] w-full rounded-lg border border-border bg-card')}
      />
    </div>
  );
}
