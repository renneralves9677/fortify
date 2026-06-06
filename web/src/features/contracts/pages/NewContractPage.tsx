import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@shared/lib/api';
import { PageHeader } from '@shared/components/ui/PageHeader';
import { Card } from '@shared/components/ui/Card';
import { Input, Select, Textarea } from '@shared/components/ui/Input';
import { CurrencyInput } from '@shared/components/ui/CurrencyInput';
import { parseCurrencyInput } from '@shared/lib/format';
import { Button } from '@shared/components/ui/Button';
import { useConfirm } from '@shared/components/ConfirmProvider';
import { PageSkeleton } from '@shared/components/ui/PageLoader';
import { DocumentViewer } from '@features/signatures/components/DocumentViewer';
import {
  formatCpfCnpj,
  formatPhone,
  getSignerFieldErrors,
  hasSignerFieldErrors,
  normalizePhone,
  stripDigits,
} from '@shared/lib/br-format';

interface TemplateField {
  key: string;
  label: string;
  fieldType?: string;
  required?: boolean;
}

interface SignerForm {
  name: string;
  role: string;
  email: string;
  phone: string;
}

function signatureRoleFromKey(key: string): string {
  return key.replace('ASSINATURA_', '');
}

function deriveSignerPayload(s: SignerForm) {
  const email = s.email.trim();
  const phone = normalizePhone(s.phone);
  const channel = email && phone ? 'AMBOS' : email ? 'EMAIL' : 'WHATSAPP';
  return {
    name: s.name.trim(),
    role: s.role,
    email: email || undefined,
    phone: phone || undefined,
    channel,
    recipient: email || phone,
  };
}

function channelLabel(email: string, phone: string) {
  if (email && phone) return 'E-mail e WhatsApp (por link)';
  if (email) return 'E-mail';
  return 'WhatsApp (por link)';
}

function usesWhatsapp(phone: string) {
  return stripDigits(phone).length > 0;
}

function buildSignersFromTemplate(fields: TemplateField[] = []): SignerForm[] {
  const signatureFields = fields.filter((f) => f.fieldType === 'signature');
  if (signatureFields.length === 0) {
    return [{ name: '', role: 'signatario', email: '', phone: '' }];
  }
  return signatureFields.map((f) => ({
    name: '',
    role: signatureRoleFromKey(f.key),
    email: '',
    phone: '',
  }));
}

export default function NewContractPage() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [templateId, setTemplateId] = useState(searchParams.get('templateId') ?? '');
  const [contractId, setContractId] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [form, setForm] = useState({
    title: '',
    partyName: '',
    value: '',
    fieldValues: {} as Record<string, string>,
  });
  const [signers, setSigners] = useState<SignerForm[]>([{ name: '', role: 'signatario', email: '', phone: '' }]);
  const [signerAttempt, setSignerAttempt] = useState(false);
  const navigate = useNavigate();
  const confirm = useConfirm();
  const qc = useQueryClient();

  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => (await api.get('/templates')).data,
  });

  const template = templates.find((t: { id: string; name: string; fields?: TemplateField[] }) => t.id === templateId);

  const manualFields = useMemo(
    () =>
      (template?.fields ?? []).filter(
        (f: TemplateField) => f.fieldType !== 'signature' && f.fieldType !== 'auto',
      ),
    [template],
  );

  const signatureFields = useMemo(
    () => (template?.fields ?? []).filter((f: TemplateField) => f.fieldType === 'signature'),
    [template],
  );

  const usesTemplateParty = manualFields.some((f: TemplateField) => f.key === 'CONTRATANTE_NOME');
  const usesTemplateValue = manualFields.some((f: TemplateField) => f.key === 'VALOR_CONTRATO');
  const templateDrivenSigners = signatureFields.length > 0;

  useEffect(() => {
    if (!template) return;
    setForm((prev) => ({
      ...prev,
      title: prev.title || template.name,
    }));
    setSigners(buildSignersFromTemplate(template.fields));
  }, [templateId, template]);

  const create = useMutation({
    mutationFn: () => {
      const title = form.title || template?.name || 'Contrato';
      const partyName = form.fieldValues.CONTRATANTE_NOME || form.partyName || title;
      const value = form.fieldValues.VALOR_CONTRATO
        ? parseCurrencyInput(form.fieldValues.VALOR_CONTRATO)
        : parseCurrencyInput(form.value);
      return api.post('/contracts', {
        templateId,
        title,
        partyName,
        value,
        fieldValues: form.fieldValues,
      });
    },
    onSuccess: (res) => {
      setContractId(res.data.id);
      qc.invalidateQueries({ queryKey: ['contracts'] });
    },
  });

  const loadPreview = useMutation({
    mutationFn: async (id: string) => (await api.get(`/contracts/${id}/preview`)).data,
    onSuccess: (data) => setPreviewHtml(data.html),
  });

  const startFlow = useMutation({
    mutationFn: () =>
      api.post(`/signatures/contracts/${contractId}/flows`, {
        signMode: 'PARALLEL',
        signers: signers.map(deriveSignerPayload),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['signatures-queue'] });
      navigate(`/contratos/${contractId}`);
    },
    meta: { successMessage: 'Fluxo de assinatura iniciado' },
  });

  useEffect(() => {
    if (step === 4 && contractId && !previewHtml) {
      loadPreview.mutate(contractId);
    }
  }, [step, contractId, previewHtml]);

  const validateFields = () => {
    if (!form.title && !template?.name) return false;
    if (!usesTemplateParty && !form.partyName) return false;
    if (!usesTemplateValue && !form.value) return false;
    for (const f of manualFields) {
      if (f.required && !form.fieldValues[f.key]?.trim()) return false;
    }
    return true;
  };

  const validateSignatureRoles = () => {
    if (!templateDrivenSigners) return signers.length >= 1;
    for (const field of signatureFields) {
      if (!field.required) continue;
      const role = signatureRoleFromKey(field.key);
      const count = signers.filter((s) => s.role.toUpperCase() === role).length;
      if (count !== 1) return false;
    }
    return true;
  };

  const goToSigners = async () => {
    if (!validateFields()) return;
    if (!contractId) {
      const res = await create.mutateAsync();
      setContractId(res.data.id);
    }
    setStep(3);
  };

  const goToPreview = async () => {
    setSignerAttempt(true);
    if (!validateSigners() || !validateSignatureRoles() || !contractId) return;
    setPreviewHtml('');
    await loadPreview.mutateAsync(contractId);
    setStep(4);
  };

  const validateSigners = () =>
    signers.length >= 1 && signers.every((s) => !hasSignerFieldErrors(s)) && validateSignatureRoles();

  const updateSigner = (index: number, patch: Partial<SignerForm>) => {
    setSigners((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const moveSigner = (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= signers.length) return;
    setSigners((prev) => {
      const copy = [...prev];
      [copy[index], copy[next]] = [copy[next], copy[index]];
      return copy;
    });
  };

  const updateFieldValue = (key: string, value: string) => {
    setForm((prev) => {
      const fieldValues = { ...prev.fieldValues, [key]: value };
      const next = { ...prev, fieldValues };
      if (key === 'CONTRATANTE_NOME') next.partyName = value;
      if (key === 'VALOR_CONTRATO') next.value = value;
      return next;
    });
  };

  const renderTemplateField = (f: TemplateField) => {
    const label = `${f.label}${f.required ? ' *' : ''}`;
    const value = form.fieldValues[f.key] ?? '';

    if (f.fieldType === 'textarea') {
      return (
        <Textarea
          key={f.key}
          label={label}
          rows={4}
          value={value}
          onChange={(e) => updateFieldValue(f.key, e.target.value)}
        />
      );
    }

    if (f.fieldType === 'date') {
      return (
        <Input
          key={f.key}
          label={label}
          type="date"
          value={value}
          onChange={(e) => updateFieldValue(f.key, e.target.value)}
        />
      );
    }

    if (f.fieldType === 'currency') {
      return (
        <CurrencyInput
          key={f.key}
          label={label}
          value={value}
          onChange={(next) => updateFieldValue(f.key, next)}
        />
      );
    }

    if (f.fieldType === 'cpf_cnpj') {
      return (
        <Input
          key={f.key}
          label={label}
          inputMode="numeric"
          value={value}
          onChange={(e) => updateFieldValue(f.key, formatCpfCnpj(e.target.value))}
        />
      );
    }

    return (
      <Input
        key={f.key}
        label={label}
        value={value}
        onChange={(e) => updateFieldValue(f.key, e.target.value)}
      />
    );
  };

  const stepLabels = ['Template', 'Campos', 'Signatários', 'Preview'];

  return (
    <div>
      <PageHeader title="Novo contrato" description="Template → campos → signatários → preview" />
      <Card className="mx-auto max-w-3xl">
        <div className="mb-6 flex flex-wrap gap-2 text-sm">
          {stepLabels.map((label, i) => (
            <span
              key={label}
              className={`rounded-full px-3 py-1 ${step === i + 1 ? 'bg-brand text-on-brand' : 'bg-surface text-ink-muted'}`}
            >
              {i + 1}. {label}
            </span>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            {templates.length === 0 ? (
              <Card className="text-center">
                <p className="text-sm text-ink-muted">
                  Nenhum template disponível na sua empresa.
                </p>
                <p className="mt-2 text-sm text-ink-muted">
                  Vá em <strong>Contratos → Templates</strong> e clique em{' '}
                  <strong>Instalar modelos padrão</strong>.
                </p>
              </Card>
            ) : (
              <Select label="Template" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                <option value="">Selecione…</option>
                {templates.map((t: { id: string; name: string }) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </Select>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <Input
              label="Título"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            {!usesTemplateParty && (
              <Input
                label="Parte relacionada"
                value={form.partyName}
                onChange={(e) => setForm({ ...form, partyName: e.target.value })}
              />
            )}
            {!usesTemplateValue && (
              <CurrencyInput
                label="Valor"
                value={form.value}
                onChange={(value) => setForm({ ...form, value })}
              />
            )}
            {manualFields.map(renderTemplateField)}
            {(template?.fields ?? [])
              .filter((f: TemplateField) => f.fieldType === 'auto' || f.fieldType === 'signature')
              .map((f: TemplateField) => (
                <div
                  key={f.key}
                  className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-sm text-ink-muted"
                >
                  <span className="font-medium text-ink">{f.label}</span>
                  {' — '}
                  {f.fieldType === 'signature'
                    ? 'Preenchido na assinatura digital'
                    : 'Preenchido automaticamente'}
                </div>
              ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-ink-muted">
              Todos os signatários recebem o link ao mesmo tempo e podem assinar em qualquer ordem.
            </p>
            {signers.map((s, i) => {
              const errors = getSignerFieldErrors(s);
              const showErrors = signerAttempt;
              const roleField = signatureFields.find(
                (f: TemplateField) => signatureRoleFromKey(f.key) === s.role.toUpperCase(),
              );
              return (
              <div key={i} className="space-y-3 rounded-lg border border-border p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Signatário {i + 1}</span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="secondary" disabled={i === 0} onClick={() => moveSigner(i, -1)}>↑</Button>
                    <Button size="sm" variant="secondary" disabled={i === signers.length - 1} onClick={() => moveSigner(i, 1)}>↓</Button>
                    {!templateDrivenSigners && signers.length > 1 && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={async () => {
                          const ok = await confirm({
                            title: 'Remover signatário?',
                            description: `${s.name || `Signatário ${i + 1}`} será removido da ordem de assinatura.`,
                            confirmLabel: 'Remover',
                            variant: 'destructive',
                          });
                          if (ok) setSigners((p) => p.filter((_, j) => j !== i));
                        }}
                      >
                        Remover
                      </Button>
                    )}
                  </div>
                </div>
                <Input
                  label="Nome"
                  value={s.name}
                  onChange={(e) => updateSigner(i, { name: e.target.value })}
                  error={showErrors ? errors.name : undefined}
                />
                {templateDrivenSigners ? (
                  <Select
                    label="Papel no contrato"
                    value={s.role}
                    onChange={(e) => updateSigner(i, { role: e.target.value })}
                  >
                    {signatureFields.map((f: TemplateField) => {
                      const role = signatureRoleFromKey(f.key);
                      return (
                        <option key={f.key} value={role}>
                          {f.label}
                        </option>
                      );
                    })}
                  </Select>
                ) : (
                  <Input label="Papel" value={s.role} onChange={(e) => updateSigner(i, { role: e.target.value })} />
                )}
                {roleField && (
                  <p className="text-xs text-ink-muted">
                    Assinará o bloco: {roleField.label}
                  </p>
                )}
                <Input
                  label="E-mail"
                  type="email"
                  value={s.email}
                  onChange={(e) => updateSigner(i, { email: e.target.value })}
                  placeholder="nome@empresa.com"
                  error={showErrors ? errors.email : undefined}
                />
                <Input
                  label="Telefone (WhatsApp)"
                  type="tel"
                  inputMode="numeric"
                  value={s.phone}
                  onChange={(e) => updateSigner(i, { phone: formatPhone(e.target.value) })}
                  placeholder="(11) 98765-4321"
                  error={showErrors ? errors.phone : undefined}
                />
                {usesWhatsapp(s.phone) && (
                  <Select label="Envio via WhatsApp" value="LINK" disabled>
                    <option value="LINK">Por link (documento)</option>
                  </Select>
                )}
                <p className="text-xs text-ink-muted">
                  Preencha e-mail, telefone ou ambos. O envio usa {channelLabel(s.email.trim(), s.phone.trim()).toLowerCase()}.
                  {usesWhatsapp(s.phone) && ' O documento não é enviado como anexo no WhatsApp.'}
                </p>
              </div>
            );
            })}
            {!templateDrivenSigners && signers.length < 10 && (
              <Button variant="secondary" onClick={() => setSigners((p) => [...p, { name: '', role: 'signatario', email: '', phone: '' }])}>
                Adicionar signatário
              </Button>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <h3 className="font-medium">Quem vai receber a assinatura</h3>
              <ol className="mt-3 space-y-2 text-sm">
                {signers.map((s, i) => (
                  <li key={i} className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      <span className="font-medium">{i + 1}. {s.name || `Signatário ${i + 1}`}</span>
                      {s.role ? ` · ${s.role}` : ''}
                    </span>
                    <span className="text-ink-muted">
                      {[
                        s.email.trim() && `E-mail: ${s.email.trim()}`,
                        s.phone.trim() && `WhatsApp: ${formatPhone(s.phone)} · por link`,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
            {loadPreview.isPending ? (
              <PageSkeleton />
            ) : (
              <DocumentViewer html={previewHtml} />
            )}
          </div>
        )}

        <div className="mt-6 flex justify-between">
          <Button variant="secondary" disabled={step === 1} onClick={() => setStep((s) => s - 1)}>Voltar</Button>
          <div className="flex gap-2">
            {(step === 3 || step === 4) && (
              <Button variant="secondary" onClick={() => navigate(`/contratos/${contractId}`)} disabled={!contractId}>
                Salvar rascunho
              </Button>
            )}
            {step === 1 ? (
              <Button disabled={!templateId || templates.length === 0} onClick={() => setStep(2)}>
                Próximo
              </Button>
            ) : step === 2 ? (
              <Button
                disabled={!validateFields() || create.isPending}
                loading={create.isPending}
                onClick={() => goToSigners()}
              >
                Próximo
              </Button>
            ) : step === 3 ? (
              <Button
                onClick={() => goToPreview()}
                disabled={!validateSigners()}
                loading={loadPreview.isPending}
              >
                Próximo
              </Button>
            ) : (
              <Button
                onClick={() => startFlow.mutate()}
                disabled={!validateSigners() || !previewHtml}
                loading={startFlow.isPending}
              >
                Iniciar assinatura
              </Button>
            )}
          </div>
        </div>
        {create.isError && step === 2 && (
          <p className="mt-4 text-sm text-danger">
            {(create.error as { response?: { data?: { message?: string } } })?.response?.data?.message
              ?? 'Não foi possível criar o contrato. Verifique os campos obrigatórios.'}
          </p>
        )}
        {startFlow.isError && (
          <p className="mt-4 text-sm text-danger">
            {(startFlow.error as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.message
              ?? (startFlow.error as { response?: { data?: { error?: string } } })?.response?.data?.error
              ?? 'Não foi possível iniciar a assinatura. Tente novamente.'}
          </p>
        )}
      </Card>
    </div>
  );
}
