import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useIsAdmin } from '@/stores/auth-store';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PageHeader } from '@shared/components/ui/PageHeader';
import { Card } from '@shared/components/ui/Card';
import { Button } from '@shared/components/ui/Button';
import { Input, Textarea } from '@shared/components/ui/Input';
import { PageSkeleton } from '@shared/components/ui/PageLoader';
import { QueryErrorState } from '@shared/components/ui/QueryErrorState';
import { getQueryErrorMessage } from '@shared/lib/query-errors';
import { TemplatePreviewPanel } from '@features/contracts/components/TemplatePreviewPanel';
import {
  createFromPreset,
  fetchDefaultCatalog,
  fetchDefaultPreset,
  type TemplateField,
} from '@features/contracts/api/templates';

export default function NewTemplatePage() {
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();
  const [presetKey, setPresetKey] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [fields, setFields] = useState<TemplateField[]>([]);

  const { data: catalog = [], isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['template-catalog'],
    queryFn: fetchDefaultCatalog,
  });

  const { data: preset, isLoading: loadingPreset } = useQuery({
    queryKey: ['template-preset', presetKey],
    queryFn: () => fetchDefaultPreset(presetKey),
    enabled: !!presetKey,
  });

  useEffect(() => {
    if (!preset) return;
    setBodyHtml(preset.bodyHtml);
    setFields(preset.fields);
    if (!name) setName(preset.name);
    if (!description && preset.description) setDescription(preset.description);
  }, [preset]);

  const save = useMutation({
    mutationFn: () => createFromPreset({ presetKey, name, description: description || undefined }),
    onSuccess: (data: { id: string }) => navigate(`/contratos/templates/${data.id}`),
    meta: { successMessage: 'Template criado' },
  });

  if (!isAdmin) {
    return (
      <Card className="mx-auto max-w-lg text-center">
        <p className="text-ink-muted">Somente administradores podem criar templates.</p>
        <Link to="/contratos/templates" className="mt-4 inline-block">
          <Button variant="secondary">Voltar</Button>
        </Link>
      </Card>
    );
  }

  if (isLoading) return <PageSkeleton />;
  if (isError) {
    return (
      <QueryErrorState
        description={getQueryErrorMessage(error)}
        onRetry={() => refetch()}
        retrying={isFetching}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Novo template"
        description="Escolha um modelo padrão, visualize o preview e salve na sua biblioteca"
        actions={
          <Link to="/contratos/templates">
            <Button variant="secondary">Voltar</Button>
          </Link>
        }
      />

      {!presetKey ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {catalog.map((p) => (
            <Card
              key={p.key}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => setPresetKey(p.key)}
            >
              <p className="text-xs font-medium uppercase tracking-wider text-brand">{p.type}</p>
              <h3 className="mt-2 font-semibold text-ink">{p.name}</h3>
              {p.description && <p className="mt-1 text-sm text-ink-muted">{p.description}</p>}
              <p className="mt-2 text-sm text-ink-muted">
                {p.fieldCount} campos · {p.signatureFieldCount} assinaturas
              </p>
              <Button className="mt-4" size="sm" variant="secondary">
                Ver preview e personalizar
              </Button>
            </Card>
          ))}
        </div>
      ) : loadingPreset ? (
        <PageSkeleton />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-ink">Personalizar</h2>
              <Button variant="secondary" size="sm" onClick={() => setPresetKey('')}>
                Trocar modelo
              </Button>
            </div>
            <Input
              label="Nome do template na sua biblioteca *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Contrato de consultoria 2025"
            />
            <Textarea
              label="Descrição"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <p className="text-sm text-ink-muted">
              Base: <strong>{preset?.name}</strong> — o conteúdo pode ser ajustado depois na tela de
              edição.
            </p>
            <Button
              className="w-full"
              disabled={!name.trim() || save.isPending}
              loading={save.isPending}
              onClick={() => save.mutate()}
            >
              Salvar na biblioteca
            </Button>
            {save.isError && (
              <p className="text-sm text-danger">
                {(save.error as { response?: { data?: { message?: string } } })?.response?.data
                  ?.message ?? 'Não foi possível criar o template.'}
              </p>
            )}
          </Card>

          <div className="sticky top-4 min-h-[60vh]">
            <TemplatePreviewPanel bodyHtml={bodyHtml} fields={fields} />
          </div>
        </div>
      )}
    </div>
  );
}
