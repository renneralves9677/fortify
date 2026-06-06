import type { ObrasRepository } from './obras.repository.js';

export type ObrasRepositoryPort = Pick<
  ObrasRepository,
  | 'findManyByCompany'
  | 'findEligibleContracts'
  | 'findContractByIdForCompany'
  | 'findObraByContractId'
  | 'findByIdForCompany'
  | 'findStepForObra'
  | 'create'
  | 'findAuditLogsForObra'
  | 'findUsersByIds'
  | 'closeObra'
  | 'updateBudgetForCompany'
  | 'getMaxStepSortOrder'
  | 'createStep'
  | 'updateStepForObra'
  | 'findStepsForObra'
  | 'reorderSteps'
  | 'deleteStepForObra'
  | 'createVistoria'
  | 'createCusto'
  | 'createOccurrence'
  | 'resolveOccurrence'
  | 'findVistoriaForObra'
  | 'createNonConformity'
>;
