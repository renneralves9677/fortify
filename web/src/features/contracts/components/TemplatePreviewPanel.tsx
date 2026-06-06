import { useEffect, useState } from 'react';
import { DocumentViewer } from '@features/signatures/components/DocumentViewer';
import { previewTemplate, type TemplateField } from '@features/contracts/api/templates';
import { PageSkeleton } from '@shared/components/ui/PageLoader';

interface TemplatePreviewPanelProps {
  bodyHtml: string;
  fields: TemplateField[];
  title?: string;
}

export function TemplatePreviewPanel({ bodyHtml, fields, title = 'Preview do documento' }: TemplatePreviewPanelProps) {
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!bodyHtml.trim()) {
      setHtml('');
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const result = await previewTemplate(bodyHtml, fields);
        if (!cancelled) setHtml(result.html);
      } catch {
        if (!cancelled) setHtml('<p class="text-danger">Não foi possível gerar o preview.</p>');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [bodyHtml, fields]);

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h3 className="font-semibold text-ink">{title}</h3>
        <p className="text-xs text-ink-muted">Como o signatário verá o documento (dados de exemplo)</p>
      </div>
      <div className="flex-1 overflow-hidden p-4">
        {loading && !html ? (
          <PageSkeleton />
        ) : html ? (
          <DocumentViewer html={html} />
        ) : (
          <p className="text-sm text-ink-muted">Edite o modelo à esquerda para ver o preview.</p>
        )}
      </div>
    </div>
  );
}
