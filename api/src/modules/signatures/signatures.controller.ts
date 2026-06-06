import type { Response } from 'express';
import fs from 'fs';
import { parseBody, parseParams, parseQuery } from '../../core/errors/zod-mapper.js';
import { logAudit } from '../../middleware/audit.js';
import type { AuthRequest } from '../../middleware/auth.js';
import {
  consentPublicSchema,
  contractIdParamSchema,
  createFlowSchema,
  flowIdParamSchema,
  sendSignatureSchema,
  signFlowPublicSchema,
  signPublicSchema,
  signatureQueueQuerySchema,
  verifyOtpSchema,
} from './signatures.schema.js';
import type { SignaturesService } from './signatures.service.js';

export class SignaturesController {
  constructor(private readonly signaturesService: SignaturesService) {}

  async queue(req: AuthRequest, res: Response): Promise<void> {
    const query = parseQuery(signatureQueueQuerySchema, req.query);
    const result = await this.signaturesService.getPendingQueue(req.companyId!, query);
    res.json(result);
  }

  async send(req: AuthRequest, res: Response): Promise<void> {
    const { contractId } = parseParams(contractIdParamSchema, req.params);
    const input = parseBody(sendSignatureSchema, req.body);
    const request = await this.signaturesService.sendSignatureRequest(
      contractId,
      req.companyId!,
      input,
    );
    await logAudit(req.companyId!, req.user!.userId, 'SIGNATURE_SEND', 'SignatureRequest', request.id, {
      channel: input.channel,
    });
    res.status(201).json(request);
  }

  async createFlow(req: AuthRequest, res: Response): Promise<void> {
    const { contractId } = parseParams(contractIdParamSchema, req.params);
    const input = parseBody(createFlowSchema, req.body);
    const flow = await this.signaturesService.createSignatureFlow(
      contractId,
      req.companyId!,
      input,
    );
    await logAudit(req.companyId!, req.user!.userId, 'SIGNATURE_FLOW_START', 'ContractSignatureFlow', flow.id, {
      signers: flow.signers.length,
    });
    res.status(201).json(flow);
  }

  async getFlow(req: AuthRequest, res: Response): Promise<void> {
    const { flowId } = parseParams(flowIdParamSchema, req.params);
    const flow = await this.signaturesService.getFlow(flowId, req.companyId!);
    res.json(flow);
  }

  async getFlowTimeline(req: AuthRequest, res: Response): Promise<void> {
    const { flowId } = parseParams(flowIdParamSchema, req.params);
    const timeline = await this.signaturesService.getFlowTimeline(flowId, req.companyId!);
    res.json(timeline);
  }

  async getContractFlow(req: AuthRequest, res: Response): Promise<void> {
    const { contractId } = parseParams(contractIdParamSchema, req.params);
    const flow = await this.signaturesService.getContractFlow(contractId, req.companyId!);
    res.json(flow);
  }

  async cancelFlow(req: AuthRequest, res: Response): Promise<void> {
    const { flowId } = parseParams(flowIdParamSchema, req.params);
    await this.signaturesService.cancelFlow(flowId, req.companyId!);
    await logAudit(req.companyId!, req.user!.userId, 'SIGNATURE_FLOW_CANCEL', 'ContractSignatureFlow', flowId);
    res.json({ success: true });
  }

  async getPublic(req: AuthRequest, res: Response): Promise<void> {
    const token = String(req.params.token);
    const data = await this.signaturesService.getPublicSignature(token, req);
    res.json(data);
  }

  async getPublicPdf(req: AuthRequest, res: Response): Promise<void> {
    const token = String(req.params.token);
    const { buffer, contentHash, filename } = await this.signaturesService.getPublicFrozenPdf(token);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('X-Document-Hash', contentHash);
    res.send(buffer);
  }

  async getPublicReceipt(req: AuthRequest, res: Response): Promise<void> {
    const token = String(req.params.token);
    const { buffer, filename } = await this.signaturesService.getPublicReceipt(token);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  async getPublicSignedPdf(req: AuthRequest, res: Response): Promise<void> {
    const token = String(req.params.token);
    const { buffer, filename, contentHash } = await this.signaturesService.getPublicSignedPdf(token);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Document-Hash', contentHash);
    res.send(buffer);
  }

  async consentPublic(req: AuthRequest, res: Response): Promise<void> {
    const token = String(req.params.token);
    const input = parseBody(consentPublicSchema, req.body);
    const result = await this.signaturesService.consentPublic(token, input, req);
    res.json(result);
  }

  async sendOtpPublic(req: AuthRequest, res: Response): Promise<void> {
    const token = String(req.params.token);
    const result = await this.signaturesService.sendOtpPublic(token);
    res.json(result);
  }

  async verifyOtpPublic(req: AuthRequest, res: Response): Promise<void> {
    const token = String(req.params.token);
    const input = parseBody(verifyOtpSchema, req.body);
    const result = await this.signaturesService.verifyOtpPublic(token, input.code);
    res.json(result);
  }

  async signPublic(req: AuthRequest, res: Response): Promise<void> {
    const token = String(req.params.token);
    const body = req.body as Record<string, unknown>;
    if (body.scrollPercent !== undefined) {
      const input = parseBody(signFlowPublicSchema, req.body);
      const result = await this.signaturesService.signFlowPublic(token, input, req);
      res.json(result);
      return;
    }
    const input = parseBody(signPublicSchema, req.body);
    const result = await this.signaturesService.signPublicContract(token, input);
    res.json(result);
  }

  async history(req: AuthRequest, res: Response): Promise<void> {
    const { contractId } = parseParams(contractIdParamSchema, req.params);
    const history = await this.signaturesService.getContractHistory(contractId, req.companyId!);
    res.json(history);
  }

  async downloadSignedDocument(req: AuthRequest, res: Response): Promise<void> {
    const { contractId } = parseParams(contractIdParamSchema, req.params);
    const { document, upload } = await this.signaturesService.getSignedDocument(
      contractId,
      req.companyId!,
    );
    res.setHeader('Content-Type', upload.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${upload.filename}"`);
    res.setHeader('X-Document-Hash', document.contentHash);
    fs.createReadStream(upload.path).pipe(res);
  }
}
