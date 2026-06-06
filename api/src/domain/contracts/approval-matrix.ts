import type { ContractType } from '@prisma/client';

export interface ApprovalStepDefinition {
  stepOrder: number;
  requiredRole: string;
}

const THRESHOLD_LOW = 10_000;
const THRESHOLD_HIGH = 100_000;

/**
 * Matriz de alçada v1.0 — faixas simplificadas por valor e tipo.
 */
export function getApprovalSteps(value: number, type: ContractType): ApprovalStepDefinition[] {
  if (value <= THRESHOLD_LOW) {
    return [{ stepOrder: 1, requiredRole: 'GESTOR' }];
  }

  if (value <= THRESHOLD_HIGH) {
    if (type === 'OBRA') {
      return [
        { stepOrder: 1, requiredRole: 'GESTOR' },
        { stepOrder: 2, requiredRole: 'DIRETOR' },
        { stepOrder: 3, requiredRole: 'ENGENHARIA' },
      ];
    }
    return [
      { stepOrder: 1, requiredRole: 'GESTOR' },
      { stepOrder: 2, requiredRole: 'DIRETOR' },
    ];
  }

  return [
    { stepOrder: 1, requiredRole: 'JURIDICO' },
    { stepOrder: 2, requiredRole: 'DIRETOR' },
    { stepOrder: 3, requiredRole: 'FINANCEIRO' },
  ];
}

export function buildStepsFromValue(value: number, type: ContractType): ApprovalStepDefinition[] {
  return getApprovalSteps(value, type);
}
