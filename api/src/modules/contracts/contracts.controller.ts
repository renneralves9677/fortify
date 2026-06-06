import type { Response } from 'express';
import { parseBody, parseParams, parseQuery } from '../../core/errors/zod-mapper.js';
import { logAudit } from '../../middleware/audit.js';
import type { AuthRequest } from '../../middleware/auth.js';
import {
  addendumContractSchema,
  compareVersionsQuerySchema,
  contractIdParamSchema,
  createContractSchema,
  listContractsQuerySchema,
  listManagerContractsQuerySchema,
  transitionContractSchema,
  updateContractSchema,
} from './contracts.schema.js';
import type { ContractsService } from './contracts.service.js';

export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  async list(req: AuthRequest, res: Response): Promise<void> {
    const query = parseQuery(listContractsQuerySchema, req.query);
    const contracts = await this.contractsService.listContracts(req.companyId!, query);
    res.json(contracts);
  }

  async listManager(req: AuthRequest, res: Response): Promise<void> {
    const query = parseQuery(listManagerContractsQuerySchema, req.query);
    const contracts = await this.contractsService.listManagerContracts(req.companyId!, query);
    res.json(contracts);
  }

  async getById(req: AuthRequest, res: Response): Promise<void> {
    const { id } = parseParams(contractIdParamSchema, req.params);
    const contract = await this.contractsService.getContractById(id, req.companyId!);
    res.json(contract);
  }

  async preview(req: AuthRequest, res: Response): Promise<void> {
    const { id } = parseParams(contractIdParamSchema, req.params);
    const preview = await this.contractsService.previewContract(id, req.companyId!);
    res.json(preview);
  }

  async create(req: AuthRequest, res: Response): Promise<void> {
    const input = parseBody(createContractSchema, req.body);
    const contract = await this.contractsService.createContract(req.companyId!, input);
    await logAudit(req.companyId!, req.user!.userId, 'CONTRACT_CREATE', 'Contract', contract!.id);
    res.status(201).json(contract);
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    const { id } = parseParams(contractIdParamSchema, req.params);
    const input = parseBody(updateContractSchema, req.body);
    const contract = await this.contractsService.updateContract(id, req.companyId!, input);
    res.json(contract);
  }

  async renew(req: AuthRequest, res: Response): Promise<void> {
    const { id } = parseParams(contractIdParamSchema, req.params);
    const contract = await this.contractsService.renewContract(id, req.companyId!);
    res.status(201).json(contract);
  }

  async close(req: AuthRequest, res: Response): Promise<void> {
    const { id } = parseParams(contractIdParamSchema, req.params);
    const contract = await this.contractsService.closeContract(id, req.companyId!);
    res.json(contract);
  }

  async addendum(req: AuthRequest, res: Response): Promise<void> {
    const { id } = parseParams(contractIdParamSchema, req.params);
    const input = parseBody(addendumContractSchema, req.body);
    const contract = await this.contractsService.createAddendum(id, req.companyId!, input);
    res.status(201).json(contract);
  }

  async transition(req: AuthRequest, res: Response): Promise<void> {
    const { id } = parseParams(contractIdParamSchema, req.params);
    const input = parseBody(transitionContractSchema, req.body);
    const contract = await this.contractsService.transitionStatus(
      id,
      req.companyId!,
      req.user?.userId,
      input,
    );
    res.json(contract);
  }

  async listVersions(req: AuthRequest, res: Response): Promise<void> {
    const { id } = parseParams(contractIdParamSchema, req.params);
    const versions = await this.contractsService.listVersions(id, req.companyId!);
    res.json(versions);
  }

  async compareVersions(req: AuthRequest, res: Response): Promise<void> {
    const { id } = parseParams(contractIdParamSchema, req.params);
    const query = parseQuery(compareVersionsQuerySchema, req.query);
    const diff = await this.contractsService.compareVersions(id, req.companyId!, query);
    res.json(diff);
  }
}
