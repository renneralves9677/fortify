import { useEffect, useMemo, useState } from 'react';
import { Download, Eye } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@shared/components/ui/dialog';
import { Button } from '@shared/components/ui/Button';
import { notify } from '@shared/lib/notify';
import {
  OBRA_REPORT_SECTIONS,
  downloadObraReportPdf,
  fetchObraReportHtml,
  type ObraReportOptions,
  type ObraReportSection,
} from '@features/obras/lib/obra-report';

type ObraReportModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  obraId: string;
  obraName: string;
  draft?: boolean;
  initialSections?: ObraReportSection[];
};

const defaultSections: ObraReportSection[] = ['roteiro', 'vistorias', 'custos', 'oc', 'resumo'];

export function ObraReportModal({
  open,
  onOpenChange,
  obraId,
  obraName,
  draft = true,
  initialSections = defaultSections,
}: ObraReportModalProps) {
  const [sections, setSections] = useState<Set<ObraReportSection>>(new Set(initialSections));
  const [groupByStep, setGroupByStep] = useState(true);
  const [htmlPreview, setHtmlPreview] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);

  useEffect(() => {
    if (open) {
      setSections(new Set(initialSections));
      setHtmlPreview(null);
    }
  }, [open, initialSections]);

  const options: ObraReportOptions = useMemo(
    () => ({
      sections: [...sections],
      groupByStep,
      draft,
    }),
    [sections, groupByStep, draft],
  );

  function toggleSection(id: ObraReportSection) {
    setSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setHtmlPreview(null);
  }

  async function handlePreview() {
    setLoadingPreview(true);
    try {
      const html = await fetchObraReportHtml(obraId, options);
      setHtmlPreview(html);
    } catch (err) {
      notify.fromError(err, 'Erro ao gerar preview');
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleDownload() {
    setLoadingPdf(true);
    try {
      const safeName = obraName.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
      await downloadObraReportPdf(obraId, options, `relatorio-obra-${safeName}.pdf`);
    } catch (err) {
      notify.fromError(err, 'Erro ao baixar PDF');
    } finally {
      setLoadingPdf(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>{draft ? 'Preview do relatório' : 'Relatório da obra'}</DialogTitle>
          <DialogDescription>
            {draft
              ? 'Visualize como o relatório ficará antes de encerrar a obra.'
              : 'Baixe o relatório final com os dados da obra.'}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Seções do relatório</legend>
            <div className="flex flex-wrap gap-2">
              {OBRA_REPORT_SECTIONS.map((s) => (
                <label
                  key={s.id}
                  className="flex cursor-pointer items-center gap-2 rounded-control border border-border px-3 py-1.5 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand/5"
                >
                  <input
                    type="checkbox"
                    checked={sections.has(s.id)}
                    onChange={() => toggleSection(s.id)}
                    className="accent-brand"
                  />
                  {s.label}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={groupByStep}
              onChange={(e) => {
                setGroupByStep(e.target.checked);
                setHtmlPreview(null);
              }}
              className="accent-brand"
            />
            Agrupar por etapa do roteiro
          </label>

          {htmlPreview && (
            <div className="overflow-hidden rounded-control border border-border">
              <iframe
                title="Preview do relatório"
                srcDoc={htmlPreview}
                className="h-[min(50vh,400px)] w-full bg-white"
                sandbox="allow-same-origin"
              />
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="secondary" type="button" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button
            variant="secondary"
            type="button"
            loading={loadingPreview}
            onClick={() => handlePreview()}
          >
            <Eye size={16} className="mr-1.5" aria-hidden />
            Visualizar
          </Button>
          <Button type="button" loading={loadingPdf} onClick={() => handleDownload()}>
            <Download size={16} className="mr-1.5" aria-hidden />
            Baixar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
