import type { Request } from 'express';
import type {
  ConsentPublicInput,
  CreateFlowInput,
  SendSignatureInput,
  SignatureQueueQuery,
  SignFlowPublicInput,
  SignPublicInput,
} from './signatures.schema.js';
import type { SignaturesRepositoryPort } from './signatures.repository.port.js';
import { SignaturesDocumentsService } from './signatures-documents.service.js';
import { SignaturesFlowService } from './signatures-flow.service.js';
import { SignaturesPublicActionService } from './signatures-public-action.service.js';
import { SignaturesPublicReadService } from './signatures-public-read.service.js';
import { SignaturesQueueService } from './signatures-queue.service.js';
import { SignaturesSendService } from './signatures-send.service.js';

export class SignaturesService {
  private readonly queue: SignaturesQueueService;
  private readonly send: SignaturesSendService;
  private readonly flow: SignaturesFlowService;
  private readonly publicRead: SignaturesPublicReadService;
  private readonly publicAction: SignaturesPublicActionService;
  private readonly documents: SignaturesDocumentsService;

  constructor(repo: SignaturesRepositoryPort) {
    this.documents = new SignaturesDocumentsService(repo);
    this.queue = new SignaturesQueueService(repo);
    this.send = new SignaturesSendService(repo);
    this.flow = new SignaturesFlowService(repo);
    this.publicRead = new SignaturesPublicReadService(repo, this.documents);
    this.publicAction = new SignaturesPublicActionService(repo, this.documents);
  }

  getPendingQueue(companyId: string, query: SignatureQueueQuery) {
    return this.queue.getPendingQueue(companyId, query);
  }

  sendSignatureRequest(contractId: string, companyId: string, input: SendSignatureInput) {
    return this.send.sendSignatureRequest(contractId, companyId, input);
  }

  createSignatureFlow(contractId: string, companyId: string, input: CreateFlowInput) {
    return this.flow.createSignatureFlow(contractId, companyId, input);
  }

  getFlow(flowId: string, companyId: string) {
    return this.flow.getFlow(flowId, companyId);
  }

  getFlowTimeline(flowId: string, companyId: string) {
    return this.flow.getFlowTimeline(flowId, companyId);
  }

  getContractFlow(contractId: string, companyId: string) {
    return this.flow.getContractFlow(contractId, companyId);
  }

  cancelFlow(flowId: string, companyId: string) {
    return this.flow.cancelFlow(flowId, companyId);
  }

  getPublicSignature(token: string, req: Request) {
    return this.publicRead.getPublicSignature(token, req);
  }

  consentPublic(token: string, input: ConsentPublicInput, req: Request) {
    return this.publicAction.consentPublic(token, input, req);
  }

  sendOtpPublic(token: string) {
    return this.publicAction.sendOtpPublic(token);
  }

  verifyOtpPublic(token: string, code: string) {
    return this.publicAction.verifyOtpPublic(token, code);
  }

  signPublicContract(token: string, input: SignPublicInput) {
    return this.publicAction.signPublicContract(token, input);
  }

  signFlowPublic(token: string, input: SignFlowPublicInput, req: Request) {
    return this.publicAction.signFlowPublic(token, input, req);
  }

  getPublicFrozenPdf(token: string) {
    return this.publicRead.getPublicFrozenPdf(token);
  }

  getPublicReceipt(token: string) {
    return this.publicRead.getPublicReceipt(token);
  }

  getPublicSignedPdf(token: string) {
    return this.publicRead.getPublicSignedPdf(token);
  }

  getSignedDocument(contractId: string, companyId: string) {
    return this.documents.getSignedDocument(contractId, companyId);
  }

  getContractHistory(contractId: string, companyId: string) {
    return this.documents.getContractHistory(contractId, companyId);
  }
}
