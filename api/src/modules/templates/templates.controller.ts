import type { Response } from 'express';
import { parseBody } from '../../core/errors/zod-mapper.js';
import type { AuthRequest } from '../../middleware/auth.js';
import {
  createFromPresetSchema,
  createTemplateSchema,
  previewTemplateSchema,
  updateTemplateSchema,
} from './templates.schema.js';
import type { TemplatesService } from './templates.service.js';

export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  async list(req: AuthRequest, res: Response): Promise<void> {
    const templates = await this.templatesService.listActiveTemplates(req.companyId!);
    res.json(templates);
  }

  async listDefaults(req: AuthRequest, res: Response): Promise<void> {
    res.json(this.templatesService.listDefaultCatalog());
  }

  async getDefaultPreset(req: AuthRequest, res: Response): Promise<void> {
    const preset = this.templatesService.getDefaultPreset(String(req.params.key));
    res.json(preset);
  }

  async preview(req: AuthRequest, res: Response): Promise<void> {
    const input = parseBody(previewTemplateSchema, req.body);
    const result = await this.templatesService.previewTemplate(input);
    res.json(result);
  }

  async getById(req: AuthRequest, res: Response): Promise<void> {
    const id = String(req.params.id);
    const template = await this.templatesService.getTemplateById(id, req.companyId!);
    res.json(template);
  }

  async create(req: AuthRequest, res: Response): Promise<void> {
    const input = parseBody(createTemplateSchema, req.body);
    const template = await this.templatesService.createTemplate(
      req.companyId!,
      input,
      req.user?.userId,
    );
    res.status(201).json(template);
  }

  async createFromPreset(req: AuthRequest, res: Response): Promise<void> {
    const input = parseBody(createFromPresetSchema, req.body);
    const template = await this.templatesService.createFromPreset(
      req.companyId!,
      input,
      req.user?.userId,
    );
    res.status(201).json(template);
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    const input = parseBody(updateTemplateSchema, req.body);
    const template = await this.templatesService.updateTemplate(
      String(req.params.id),
      req.companyId!,
      input,
      req.user?.userId,
    );
    res.json(template);
  }

  async listVersions(req: AuthRequest, res: Response): Promise<void> {
    const versions = await this.templatesService.listTemplateVersions(
      String(req.params.id),
      req.companyId!,
    );
    res.json(versions);
  }

  async getVersion(req: AuthRequest, res: Response): Promise<void> {
    const version = await this.templatesService.getTemplateVersion(
      String(req.params.id),
      String(req.params.versionId),
      req.companyId!,
    );
    res.json(version);
  }

  async ensureDefaults(req: AuthRequest, res: Response): Promise<void> {
    const result = await this.templatesService.ensureDefaultTemplates(req.companyId!);
    res.status(201).json(result);
  }
}
