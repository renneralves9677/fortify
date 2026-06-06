import { AppError } from '../../core/errors/AppError.js';
import { withPrismaError } from '../../core/errors/prisma-mapper.js';
import { logAudit } from '../../middleware/audit.js';
import type { CreateStepInput, ReorderStepsInput, UpdateStepInput } from './obras.schema.js';
import type { ObrasRepositoryPort } from './obras.repository.port.js';
import { assertObraActive, getObraOrThrow } from './obras-shared.js';

export class ObraStepsService {
  constructor(private readonly repo: ObrasRepositoryPort) {}

  async createStep(
    obraId: string,
    companyId: string,
    userId: string | undefined,
    input: CreateStepInput,
  ) {
    const obra = await getObraOrThrow(this.repo, obraId, companyId);
    assertObraActive(obra);

    const maxOrder = await this.repo.getMaxStepSortOrder(obraId);
    const sortOrder = (maxOrder._max.sortOrder ?? 0) + 1;

    const step = await withPrismaError(() =>
      this.repo.createStep(obraId, {
        title: input.title,
        description: input.description,
        sortOrder,
      }),
    );

    await logAudit(companyId, userId, 'OBRA_STEP_CREATE', 'Obra', obraId, {
      stepId: step.id,
      title: step.title,
      description: step.description,
    });

    return step;
  }

  async updateStep(
    obraId: string,
    stepId: string,
    companyId: string,
    userId: string | undefined,
    input: UpdateStepInput,
  ) {
    const obra = await getObraOrThrow(this.repo, obraId, companyId);
    assertObraActive(obra);

    const existing = await this.repo.findStepForObra(stepId, obraId, companyId);
    if (!existing) {
      throw new AppError(404, 'Etapa não encontrada', 'STEP_NOT_FOUND');
    }

    const data: { done?: boolean; title?: string; description?: string | null } = {};
    if (input.done !== undefined) data.done = input.done;
    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description;

    if (!Object.keys(data).length) {
      throw new AppError(400, 'Nenhum campo para atualizar', 'VALIDATION_ERROR');
    }

    await this.repo.updateStepForObra(stepId, obraId, companyId, data);

    await logAudit(companyId, userId, 'OBRA_STEP_UPDATE', 'Obra', obraId, {
      stepId,
      title: data.title ?? existing.title,
      done: data.done ?? existing.done,
      description: data.description !== undefined ? data.description : existing.description,
    });

    return { success: true };
  }

  async reorderSteps(
    obraId: string,
    companyId: string,
    userId: string | undefined,
    input: ReorderStepsInput,
  ) {
    const obra = await getObraOrThrow(this.repo, obraId, companyId);
    assertObraActive(obra);

    const steps = await this.repo.findStepsForObra(obraId, companyId);
    if (input.stepIds.length !== steps.length) {
      throw new AppError(400, 'Lista de etapas incompleta', 'STEP_REORDER_INVALID');
    }

    const stepIdSet = new Set(steps.map((s) => s.id));
    if (!input.stepIds.every((id) => stepIdSet.has(id))) {
      throw new AppError(400, 'Etapa inválida na reordenação', 'STEP_REORDER_INVALID');
    }

    await this.repo.reorderSteps(obraId, companyId, input.stepIds);

    await logAudit(companyId, userId, 'OBRA_STEP_REORDER', 'Obra', obraId, {
      stepIds: input.stepIds,
    });

    return { success: true };
  }

  async deleteStep(obraId: string, stepId: string, companyId: string, userId: string | undefined) {
    const obra = await getObraOrThrow(this.repo, obraId, companyId);
    assertObraActive(obra);

    const existing = await this.repo.findStepForObra(stepId, obraId, companyId);
    if (!existing) {
      throw new AppError(404, 'Etapa não encontrada', 'STEP_NOT_FOUND');
    }

    const result = await this.repo.deleteStepForObra(stepId, obraId, companyId);
    if (!result.count) {
      throw new AppError(404, 'Etapa não encontrada', 'STEP_NOT_FOUND');
    }

    await logAudit(companyId, userId, 'OBRA_STEP_DELETE', 'Obra', obraId, {
      stepId,
      title: existing.title,
    });

    return { success: true };
  }
}
