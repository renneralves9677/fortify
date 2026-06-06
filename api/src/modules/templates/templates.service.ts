import { AppError } from '../../core/errors/AppError.js';
import { withPrismaError } from '../../core/errors/prisma-mapper.js';
import {
  getDefaultTemplateByKey,
  listDefaultTemplateCatalog,
} from '../../domain/contracts/default-templates.js';
import { sanitizeHtml } from '../../domain/contracts/html-sanitizer.js';
import { provisionDefaultTemplates } from './templates-provision.repository.js';
import { previewTemplateHtml } from '../../domain/contracts/template-sample-values.js';
import type {
  CreateFromPresetInput,
  CreateTemplateInput,
  PreviewTemplateInput,
  UpdateTemplateInput,
} from './templates.schema.js';
import { TemplatesRepository } from './templates.repository.js';

function serializeTemplate(
  template: NonNullable<Awaited<ReturnType<TemplatesRepository['findByIdForCompany']>>>,
) {
  const { _count, ...rest } = template;
  return {
    ...rest,
    versionCount: _count?.versions ?? 0,
  };
}

function fieldsToSnapshot(
  fields: Array<{
    key: string;
    label: string;
    fieldType: string;
    required: boolean;
    sortOrder: number;
  }>,
) {
  return fields.map((f) => ({
    key: f.key,
    label: f.label,
    fieldType: f.fieldType,
    required: f.required,
    sortOrder: f.sortOrder,
  }));
}

export class TemplatesService {
  constructor(private readonly templatesRepository: TemplatesRepository) {}

  async listActiveTemplates(companyId: string) {
    const templates = await this.templatesRepository.findActiveByCompany(companyId);
    return templates.map((t) => serializeTemplate(t));
  }

  listDefaultCatalog() {
    return listDefaultTemplateCatalog();
  }

  getDefaultPreset(key: string) {
    const preset = getDefaultTemplateByKey(key);
    if (!preset) {
      throw new AppError(404, 'Modelo padrão não encontrado', 'PRESET_NOT_FOUND');
    }
    return preset;
  }

  previewTemplate(input: PreviewTemplateInput) {
    const html = sanitizeHtml(previewTemplateHtml(sanitizeHtml(input.bodyHtml), input.fields));
    return { html, sampleNote: 'Preview com dados de exemplo para o signatário final' };
  }

  async getTemplateById(id: string, companyId: string) {
    const template = await this.templatesRepository.findByIdForCompany(id, companyId);
    if (!template) {
      throw new AppError(404, 'Template não encontrado', 'TEMPLATE_NOT_FOUND');
    }
    return serializeTemplate(template);
  }

  private async snapshotVersion(
    template: NonNullable<Awaited<ReturnType<TemplatesRepository['findByIdForCompany']>>>,
    changeReason?: string,
    createdById?: string,
  ) {
    const count = await this.templatesRepository.countVersions(template.id);
    const versionNumber = `v${count + 1}`;
    await this.templatesRepository.createVersion({
      template: { connect: { id: template.id } },
      versionNumber,
      name: template.name,
      type: template.type,
      description: template.description,
      bodyHtml: template.bodyHtml,
      fieldsSnapshot: fieldsToSnapshot(template.fields),
      changeReason,
      createdById,
    });
    return versionNumber;
  }

  async createTemplate(companyId: string, input: CreateTemplateInput, createdById?: string) {
    const { fields, ...data } = input;
    const bodyHtml = sanitizeHtml(data.bodyHtml);
    const template = await withPrismaError(() =>
      this.templatesRepository.create({
        ...data,
        bodyHtml,
        company: { connect: { id: companyId } },
        fields: { create: fields },
      }),
    );

    await this.templatesRepository.createVersion({
      template: { connect: { id: template.id } },
      versionNumber: 'v1',
      name: template.name,
      type: template.type,
      description: template.description,
      bodyHtml: template.bodyHtml,
      fieldsSnapshot: fieldsToSnapshot(template.fields),
      changeReason: 'Versão inicial',
      createdById,
    });

    const full = await this.templatesRepository.findByIdForCompany(template.id, companyId);
    return serializeTemplate(full!);
  }

  async createFromPreset(companyId: string, input: CreateFromPresetInput, createdById?: string) {
    const preset = getDefaultTemplateByKey(input.presetKey);
    if (!preset) {
      throw new AppError(404, 'Modelo padrão não encontrado', 'PRESET_NOT_FOUND');
    }

    const exists = await this.templatesRepository.findByNameForCompany(companyId, input.name);
    if (exists) {
      throw new AppError(409, 'Já existe um template com este nome', 'TEMPLATE_NAME_EXISTS');
    }

    return this.createTemplate(
      companyId,
      {
        name: input.name,
        type: preset.type,
        description: input.description ?? preset.description,
        bodyHtml: preset.bodyHtml,
        fields: preset.fields as CreateTemplateInput['fields'],
      },
      createdById,
    );
  }

  async updateTemplate(
    id: string,
    companyId: string,
    input: UpdateTemplateInput,
    userId?: string,
  ) {
    const current = await this.templatesRepository.findByIdForCompany(id, companyId);
    if (!current) {
      throw new AppError(404, 'Template não encontrado', 'TEMPLATE_NOT_FOUND');
    }

    const hasContentChange =
      input.bodyHtml !== undefined ||
      input.fields !== undefined ||
      input.name !== undefined ||
      input.description !== undefined ||
      input.type !== undefined;

    if (hasContentChange) {
      await this.snapshotVersion(current, input.changeReason ?? 'Atualização do modelo', userId);
    }

    const updated = await withPrismaError(() =>
      this.templatesRepository.updateTemplate(
        id,
        {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.type !== undefined ? { type: input.type } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.bodyHtml !== undefined ? { bodyHtml: sanitizeHtml(input.bodyHtml) } : {}),
        },
        input.fields,
      ),
    );

    return serializeTemplate(updated);
  }

  async listTemplateVersions(id: string, companyId: string) {
    const template = await this.templatesRepository.findByIdForCompany(id, companyId);
    if (!template) {
      throw new AppError(404, 'Template não encontrado', 'TEMPLATE_NOT_FOUND');
    }
    return this.templatesRepository.findVersions(id);
  }

  async getTemplateVersion(id: string, versionId: string, companyId: string) {
    const template = await this.templatesRepository.findByIdForCompany(id, companyId);
    if (!template) {
      throw new AppError(404, 'Template não encontrado', 'TEMPLATE_NOT_FOUND');
    }
    const version = await this.templatesRepository.findVersionById(id, versionId);
    if (!version) {
      throw new AppError(404, 'Versão não encontrada', 'TEMPLATE_VERSION_NOT_FOUND');
    }
    const fields = version.fieldsSnapshot as Array<{
      key: string;
      label: string;
      fieldType: string;
      required: boolean;
      sortOrder: number;
    }>;
    return {
      ...version,
      previewHtml: previewTemplateHtml(version.bodyHtml, fields),
    };
  }

  async ensureDefaultTemplates(companyId: string) {
    return provisionDefaultTemplates(companyId);
  }
}
