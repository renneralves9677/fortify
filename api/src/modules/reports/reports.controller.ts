import type { Response } from 'express';
import { parseQuery } from '../../core/errors/zod-mapper.js';
import type { AuthRequest } from '../../middleware/auth.js';
import {
  dashboardQuerySchema,
  reportExportQuerySchema,
  reportListQuerySchema,
} from './reports.schema.js';
import type { ReportsService } from './reports.service.js';

export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  async dashboard(req: AuthRequest, res: Response): Promise<void> {
    const query = parseQuery(dashboardQuerySchema, req.query);
    const data = await this.reportsService.getDashboard(req.companyId!, query);
    res.json(data);
  }

  async listContracts(req: AuthRequest, res: Response): Promise<void> {
    const query = parseQuery(reportListQuerySchema, req.query);
    const data = await this.reportsService.listContractsReport(req.companyId!, query);
    res.json(data);
  }

  async listObras(req: AuthRequest, res: Response): Promise<void> {
    const query = parseQuery(reportListQuerySchema, req.query);
    const data = await this.reportsService.listObrasReport(req.companyId!, query);
    res.json(data);
  }

  async exportContracts(req: AuthRequest, res: Response): Promise<void> {
    const query = parseQuery(reportExportQuerySchema, req.query);
    const { buffer, contentType, filename } = await this.reportsService.exportContracts(
      req.companyId!,
      query,
    );
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(buffer);
  }

  async exportObras(req: AuthRequest, res: Response): Promise<void> {
    const query = parseQuery(reportExportQuerySchema, req.query);
    const { buffer, contentType, filename } = await this.reportsService.exportObras(
      req.companyId!,
      query,
    );
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(buffer);
  }

  async executive(req: AuthRequest, res: Response): Promise<void> {
    const data = await this.reportsService.getExecutiveDashboard(req.companyId!);
    res.json(data);
  }
}
