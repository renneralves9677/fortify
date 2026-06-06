import { api } from '@shared/lib/api';

export interface TemplateField {
  key: string;
  label: string;
  fieldType: string;
  required: boolean;
  sortOrder: number;
}

export interface TemplateSummary {
  id: string;
  name: string;
  type: string;
  description?: string | null;
  bodyHtml?: string;
  fields: TemplateField[];
  versionCount?: number;
}

export interface DefaultPresetSummary {
  key: string;
  name: string;
  type: string;
  description: string | null;
  fieldCount: number;
  signatureFieldCount: number;
}

export interface DefaultPreset extends DefaultPresetSummary {
  bodyHtml: string;
  fields: TemplateField[];
}

export interface TemplateVersion {
  id: string;
  versionNumber: string;
  name: string;
  description?: string | null;
  changeReason?: string | null;
  createdAt: string;
}

export function fetchTemplates() {
  return api.get<TemplateSummary[]>('/templates').then((r) => r.data);
}

export function fetchTemplate(id: string) {
  return api.get<TemplateSummary & { bodyHtml: string }>(`/templates/${id}`).then((r) => r.data);
}

export function fetchDefaultCatalog() {
  return api.get<DefaultPresetSummary[]>('/templates/catalog/defaults').then((r) => r.data);
}

export function fetchDefaultPreset(key: string) {
  return api.get<DefaultPreset>(`/templates/catalog/defaults/${key}`).then((r) => r.data);
}

export function previewTemplate(bodyHtml: string, fields: TemplateField[]) {
  return api.post<{ html: string }>('/templates/preview', { bodyHtml, fields }).then((r) => r.data);
}

export function updateTemplate(
  id: string,
  payload: {
    name?: string;
    description?: string;
    bodyHtml?: string;
    fields?: TemplateField[];
    changeReason?: string;
  },
) {
  return api.patch(`/templates/${id}`, payload).then((r) => r.data);
}

export function createFromPreset(payload: { presetKey: string; name: string; description?: string }) {
  return api.post('/templates/from-preset', payload).then((r) => r.data);
}

export function fetchTemplateVersions(id: string) {
  return api.get<TemplateVersion[]>(`/templates/${id}/versions`).then((r) => r.data);
}

export function fetchTemplateVersion(id: string, versionId: string) {
  return api
    .get<TemplateVersion & { bodyHtml: string; fieldsSnapshot: TemplateField[]; previewHtml: string }>(
      `/templates/${id}/versions/${versionId}`,
    )
    .then((r) => r.data);
}
