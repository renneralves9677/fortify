import type { ContractsRepository } from './contracts.repository.js';

export type ContractsRepositoryPort = Pick<
  ContractsRepository,
  | 'findManyForCompany'
  | 'countManyForCompany'
  | 'findManagerContracts'
  | 'findByIdForCompany'
  | 'findTemplateByIdForCompany'
  | 'findDisplayFlowForContract'
  | 'findLatestCompletedFlowForContract'
  | 'findInProgressFlowForContract'
  | 'create'
  | 'update'
  | 'closeByIdForCompany'
  | 'updateStatus'
  | 'findVersions'
  | 'findVersionByNumber'
  | 'countVersions'
  | 'createVersion'
>;
