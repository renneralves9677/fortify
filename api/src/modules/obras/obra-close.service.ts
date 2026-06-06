import { AppError } from '../../core/errors/AppError.js';
import { logAudit } from '../../middleware/audit.js';
import { getObraCloseBlockers, getObraCloseWarnings } from '../../domain/obras/obra-close.js';
import type { ObrasRepositoryPort } from './obras.repository.port.js';
import { getObraOrThrow } from './obras-shared.js';

export class ObraCloseService {
  constructor(private readonly repo: ObrasRepositoryPort) {}

  async getCloseReadiness(id: string, companyId: string) {
    const obra = await getObraOrThrow(this.repo, id, companyId);
    const blockers = getObraCloseBlockers(obra);
    const warnings = getObraCloseWarnings(obra);
    return {
      status: obra.status,
      blockers,
      warnings,
      canClose: blockers.length === 0,
      complete: blockers.length === 0 && warnings.length === 0,
    };
  }

  async closeObra(id: string, companyId: string, userId: string | undefined) {
    const obra = await getObraOrThrow(this.repo, id, companyId);
    if (obra.status === 'encerrada') {
      throw new AppError(400, 'Obra já está encerrada', 'OBRA_ALREADY_CLOSED');
    }

    const blockers = getObraCloseBlockers(obra);
    if (blockers.length > 0) {
      throw new AppError(
        400,
        'Não é possível encerrar a obra: ' + blockers.join('; '),
        'OBRA_CLOSE_BLOCKED',
      );
    }

    const warnings = getObraCloseWarnings(obra);
    const result = await this.repo.closeObra(id, companyId);
    if (!result.count) {
      throw new AppError(400, 'Obra já está encerrada', 'OBRA_ALREADY_CLOSED');
    }

    await logAudit(companyId, userId, 'OBRA_CLOSE', 'Obra', id, {
      name: obra.name,
      warnings,
    });

    return { success: true, warnings };
  }
}
