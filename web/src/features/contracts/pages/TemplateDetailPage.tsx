import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@shared/components/ui/PageHeader';
import { Card } from '@shared/components/ui/Card';
import { Button } from '@shared/components/ui/Button';
import { Input, Select, Textarea } from '@shared/components/ui/Input';
import { Tabs, TabsList, TabsTrigger } from '@shared/components/ui/tabs';
import { PageSkeleton } from '@shared/components/ui/PageLoader';
import { TemplateEditor } from '@features/contracts/components/TemplateEditor';
import { TemplatePreviewPanel } from '@features/contracts/components/TemplatePreviewPanel';
import { DocumentViewer } from '@features/signatures/components/DocumentViewer';
import {
  fetchTemplate,
  fetchTemplateVersion,
  fetchTemplateVersions,
  updateTemplate,
  type TemplateField,
} from '@features/contracts/api/templates';
import { useIsAdmin } from '@/stores/auth-store';
import { formatDate } from '@shared/lib/format';

const CURRENT_VERSION_TAB = 'current';

const FIELD_TYPES = [
  { value: 'text', label: 'Texto' },
  { value: 'textarea', label: 'Texto longo' },
  { value: 'cpf_cnpj', label: 'CPF/CNPJ' },
  { value: 'currency', label: 'Valor' },
  { value: 'date', label: 'Data' },
  { value: 'auto', label: 'Automático' },
  { value: 'signature', label: 'Assinatura' },
];

export default function TemplateDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const isAdmin = useIsAdmin();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [changeReason, setChangeReason] = useState('');
  const [viewVersionId, setViewVersionId] = useState('');
  const [readOnly, setReadOnly] = useState(false);

  const { data: template, isLoading } = useQuery({
    queryKey: ['template', id],
    queryFn: () => fetchTemplate(id!),
    enabled: !!id,
  });

  const { data: versions = [] } = useQuery({
    queryKey: ['template-versions', id],
    queryFn: () => fetchTemplateVersions(id!),
    enabled: !!id,
  });

  const { data: versionDetail } = useQuery({
    queryKey: ['template-version', id, viewVersionId],
    queryFn: () => fetchTemplateVersion(id!, viewVersionId),
    enabled: !!id && !!viewVersionId,
  });

  useEffect(() => {
    if (!template || viewVersionId) return;
    setName(template.name);
    setDescription(template.description ?? '');
    setBodyHtml(template.bodyHtml ?? '');
    setFields(template.fields ?? []);
  }, [template, viewVersionId]);

  useEffect(() => {
    if (!versionDetail) return;
    setReadOnly(true);
    setName(versionDetail.name);
    setDescription(versionDetail.description ?? '');
    setBodyHtml(versionDetail.bodyHtml);
    setFields(versionDetail.fieldsSnapshot ?? []);
  }, [versionDetail]);

  const save = useMutation({
    mutationFn: () =>
      updateTemplate(id!, {
        name,
        description,
        bodyHtml,
        fields,
        changeReason: changeReason || 'Atualização do modelo',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['template', id] });
      qc.invalidateQueries({ queryKey: ['template-versions', id] });
      qc.invalidateQueries({ queryKey: ['templates'] });
      setChangeReason('');
      setViewVersionId('');
      setReadOnly(false);
    },
    meta: { successMessage: 'Nova versão salva' },
  });

  const resetToCurrent = () => {
    setViewVersionId('');
    setReadOnly(false);
    if (template) {
      setName(template.name);
      setDescription(template.description ?? '');
      setBodyHtml(template.bodyHtml ?? '');
      setFields(template.fields ?? []);
    }
  };

  const updateField = (index: number, patch: Partial<TemplateField>) => {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  };

  if (isLoading || !template) return <PageSkeleton />;

  const activeVersionTab = viewVersionId || CURRENT_VERSION_TAB;

  function handleVersionTabChange(value: string) {
    if (value === CURRENT_VERSION_TAB) resetToCurrent();
    else setViewVersionId(value);
  }

  return (
    <div>
      <PageHeader
        title={readOnly ? `${template.name} — ${versionDetail?.versionNumber ?? 'versão'}` : template.name}
        description={
          readOnly
            ? `Visualizando versão de ${versionDetail ? formatDate(versionDetail.createdAt) : ''}`
            : `${template.type} · ${template.versionCount ?? 0} versões · edição com preview em tempo real`
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/contratos/templates">
              <Button variant="secondary">Biblioteca</Button>
            </Link>
            <Link to={`/contratos/novo?templateId=${id}`}>
              <Button variant="secondary">Usar em contrato</Button>
            </Link>
          </div>
        }
      />

      {versions.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-sm font-medium text-ink">Histórico de versões</p>
          <Tabs value={activeVersionTab} onValueChange={handleVersionTabChange}>
            <TabsList className="h-auto flex-wrap justify-start gap-1">
              <TabsTrigger value={CURRENT_VERSION_TAB}>Versão atual</TabsTrigger>
              {versions.map((v) => (
                <TabsTrigger
                  key={v.id}
                  value={v.id}
                  title={v.changeReason ?? undefined}
                  className="max-w-[12rem] truncate"
                >
                  {v.versionNumber} · {formatDate(v.createdAt)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <Card className="space-y-4">
          <h2 className="font-semibold text-ink">{readOnly ? 'Conteúdo da versão' : 'Editor do modelo'}</h2>

          <Input
            label="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={readOnly || !isAdmin}
          />
          <Textarea
            label="Descrição"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={readOnly || !isAdmin}
          />
          <div className="space-y-2">
            <p className="text-sm font-medium text-ink">Layout do documento</p>
            {readOnly ? (
              <Textarea
                label="HTML (somente leitura)"
                rows={14}
                value={bodyHtml}
                disabled
                className="font-mono text-xs"
              />
            ) : (
              <TemplateEditor
                value={bodyHtml}
                onChange={setBodyHtml}
                fields={fields}
                disabled={!isAdmin}
              />
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-ink">Campos dinâmicos</p>
            {fields.map((f, i) => (
              <div key={`${f.key}-${i}`} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-2">
                <Input
                  label="Chave"
                  value={f.key}
                  onChange={(e) => updateField(i, { key: e.target.value })}
                  disabled={readOnly || !isAdmin || f.fieldType === 'signature'}
                />
                <Input
                  label="Rótulo"
                  value={f.label}
                  onChange={(e) => updateField(i, { label: e.target.value })}
                  disabled={readOnly || !isAdmin}
                />
                <Select
                  label="Tipo"
                  value={f.fieldType}
                  onChange={(e) => updateField(i, { fieldType: e.target.value })}
                  disabled={readOnly || !isAdmin}
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </Select>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={f.required}
                    onChange={(e) => updateField(i, { required: e.target.checked })}
                    disabled={readOnly || !isAdmin || f.fieldType === 'auto'}
                  />
                  Obrigatório
                </label>
              </div>
            ))}
          </div>

          {!readOnly && isAdmin && (
            <>
              <Input
                label="Motivo da alteração (opcional)"
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                placeholder="Ex: Ajuste de cláusula de pagamento"
              />
              <Button
                className="w-full"
                loading={save.isPending}
                disabled={save.isPending}
                onClick={() => save.mutate()}
              >
                Salvar nova versão
              </Button>
              <p className="text-xs text-ink-muted">
                Contratos já criados não são alterados — cada salvamento gera uma versão rastreável.
              </p>
            </>
          )}

          {!isAdmin && !readOnly && (
            <p className="text-sm text-ink-muted">Somente administradores podem editar templates.</p>
          )}
        </Card>

        <div className="sticky top-4 min-h-[70vh]">
          {readOnly && versionDetail?.previewHtml ? (
            <div className="flex h-full flex-col rounded-lg border border-border bg-card">
              <div className="border-b border-border px-4 py-3">
                <h3 className="font-semibold text-ink">Preview da versão {versionDetail.versionNumber}</h3>
                <p className="text-xs text-ink-muted">Snapshot histórico — somente leitura</p>
              </div>
              <div className="p-4">
                <DocumentViewer html={versionDetail.previewHtml} />
              </div>
            </div>
          ) : (
            <TemplatePreviewPanel bodyHtml={bodyHtml} fields={fields} />
          )}
        </div>
      </div>
    </div>
  );
}
