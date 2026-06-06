import type { Response } from 'express';
import { parseBody, parseParams, parseQuery } from '../../core/errors/zod-mapper.js';
import type { AuthRequest } from '../../middleware/auth.js';
import {
  createCustoSchema,
  createNonConformitySchema,
  createObraSchema,
  createOccurrenceSchema,
  createStepSchema,
  createVistoriaSchema,
  obraIdParamSchema,
  obraOccurrenceParamsSchema,
  obraReportQuerySchema,
  obraStepParamsSchema,
  reorderStepsSchema,
  updateStepSchema,
} from './obras.schema.js';
import type { ObrasService } from './obras.service.js';

export class ObrasController {
  constructor(private readonly obrasService: ObrasService) {}

  async list(req: AuthRequest, res: Response): Promise<void> {
    const obras = await this.obrasService.listObras(req.companyId!);
    res.json(obras);
  }

  async listEligibleContracts(req: AuthRequest, res: Response): Promise<void> {
    const contracts = await this.obrasService.listEligibleContracts(req.companyId!);
    res.json(contracts);
  }

  async listCostCategories(_req: AuthRequest, res: Response): Promise<void> {
    res.json(this.obrasService.listCostCategories());
  }

  async create(req: AuthRequest, res: Response): Promise<void> {
    const input = parseBody(createObraSchema, req.body);
    const obra = await this.obrasService.createObra(req.companyId!, req.user?.userId, input);
    res.status(201).json(obra);
  }

  async getById(req: AuthRequest, res: Response): Promise<void> {
    const { id } = parseParams(obraIdParamSchema, req.params);
    const obra = await this.obrasService.getObraById(id, req.companyId!);
    res.json(obra);
  }

  async createStep(req: AuthRequest, res: Response): Promise<void> {
    const { id: obraId } = parseParams(obraIdParamSchema, req.params);
    const input = parseBody(createStepSchema, req.body);
    const step = await this.obrasService.createStep(
      obraId,
      req.companyId!,
      req.user?.userId,
      input,
    );
    res.status(201).json(step);
  }

  async updateStep(req: AuthRequest, res: Response): Promise<void> {
    const { id: obraId, stepId } = parseParams(obraStepParamsSchema, req.params);
    const input = parseBody(updateStepSchema, req.body);
    const result = await this.obrasService.updateStep(
      obraId,
      stepId,
      req.companyId!,
      req.user?.userId,
      input,
    );
    res.json(result);
  }

  async reorderSteps(req: AuthRequest, res: Response): Promise<void> {
    const { id: obraId } = parseParams(obraIdParamSchema, req.params);
    const input = parseBody(reorderStepsSchema, req.body);
    const result = await this.obrasService.reorderSteps(
      obraId,
      req.companyId!,
      req.user?.userId,
      input,
    );
    res.json(result);
  }

  async deleteStep(req: AuthRequest, res: Response): Promise<void> {
    const { id: obraId, stepId } = parseParams(obraStepParamsSchema, req.params);
    const result = await this.obrasService.deleteStep(
      obraId,
      stepId,
      req.companyId!,
      req.user?.userId,
    );
    res.json(result);
  }

  async addVistoria(req: AuthRequest, res: Response): Promise<void> {
    const { id } = parseParams(obraIdParamSchema, req.params);
    const input = parseBody(createVistoriaSchema, req.body);
    const vistoria = await this.obrasService.addVistoria(
      id,
      req.companyId!,
      req.user?.userId,
      input,
    );
    res.status(201).json(vistoria);
  }

  async addCusto(req: AuthRequest, res: Response): Promise<void> {
    const { id } = parseParams(obraIdParamSchema, req.params);
    const input = parseBody(createCustoSchema, req.body);
    const custo = await this.obrasService.addCusto(id, req.companyId!, req.user?.userId, input);
    res.status(201).json(custo);
  }

  async addOccurrence(req: AuthRequest, res: Response): Promise<void> {
    const { id } = parseParams(obraIdParamSchema, req.params);
    const input = parseBody(createOccurrenceSchema, req.body);
    const occurrence = await this.obrasService.addOccurrence(
      id,
      req.companyId!,
      req.user?.userId,
      input,
    );
    res.status(201).json(occurrence);
  }

  async resolveOccurrence(req: AuthRequest, res: Response): Promise<void> {
    const { id, occurrenceId } = parseParams(obraOccurrenceParamsSchema, req.params);
    const result = await this.obrasService.resolveOccurrence(
      id,
      occurrenceId,
      req.companyId!,
      req.user?.userId,
    );
    res.json(result);
  }

  async addNonConformity(req: AuthRequest, res: Response): Promise<void> {
    const { id } = parseParams(obraIdParamSchema, req.params);
    const input = parseBody(createNonConformitySchema, req.body);
    const nc = await this.obrasService.addNonConformity(
      id,
      req.companyId!,
      req.user?.userId,
      input,
    );
    res.status(201).json(nc);
  }

  async getCloseReadiness(req: AuthRequest, res: Response): Promise<void> {
    const { id } = parseParams(obraIdParamSchema, req.params);
    const readiness = await this.obrasService.getCloseReadiness(id, req.companyId!);
    res.json(readiness);
  }

  async getReportPreview(req: AuthRequest, res: Response): Promise<void> {
    const { id } = parseParams(obraIdParamSchema, req.params);
    const query = parseQuery(obraReportQuerySchema, req.query);
    const model = await this.obrasService.getObraReportPreview(id, req.companyId!, query);
    res.json(model);
  }

  async getReportHtml(req: AuthRequest, res: Response): Promise<void> {
    const { id } = parseParams(obraIdParamSchema, req.params);
    const query = parseQuery(obraReportQuerySchema, req.query);
    const html = await this.obrasService.getObraReportHtml(id, req.companyId!, query);
    res.type('html').send(html);
  }

  async getReportPdf(req: AuthRequest, res: Response): Promise<void> {
    const { id } = parseParams(obraIdParamSchema, req.params);
    const query = parseQuery(obraReportQuerySchema, req.query);
    const pdf = await this.obrasService.getObraReportPdf(id, req.companyId!, query);
    const obra = await this.obrasService.getObraById(id, req.companyId!);
    const safeName = obra.name.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
    res
      .type('application/pdf')
      .set('Content-Disposition', `attachment; filename="relatorio-obra-${safeName}.pdf"`)
      .send(pdf);
  }

  async close(req: AuthRequest, res: Response): Promise<void> {
    const { id } = parseParams(obraIdParamSchema, req.params);
    const result = await this.obrasService.closeObra(id, req.companyId!, req.user?.userId);
    res.json(result);
  }

  async getAudit(req: AuthRequest, res: Response): Promise<void> {
    const { id } = parseParams(obraIdParamSchema, req.params);
    const logs = await this.obrasService.getObraAudit(id, req.companyId!);
    res.json(logs);
  }
}
