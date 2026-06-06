import { AppError } from '../../core/errors/AppError.js';
import { withPrismaError } from '../../core/errors/prisma-mapper.js';
import { logAudit } from '../../middleware/audit.js';
import type { CreateNonConformityInput, CreateVistoriaInput } from './obras.schema.js';
import { parseDateInput } from './obras.schema.js';
import type { ObrasRepositoryPort } from './obras.repository.port.js';
import { assertObraActive, assertObraStep, getObraOrThrow } from './obras-shared.js';

export class ObraVistoriasService {
  constructor(private readonly repo: ObrasRepositoryPort) {}

  async addVistoria(
    obraId: string,
    companyId: string,
    userId: string | undefined,
    input: CreateVistoriaInput,
  ) {
    const obra = await getObraOrThrow(this.repo, obraId, companyId);
    assertObraActive(obra);

    await assertObraStep(this.repo, obraId, companyId, input.obraStepId);

    const vistoria = await withPrismaError(() =>
      this.repo.createVistoria(obra.id, {
        type: input.type,
        description: input.description,
        photoUrls: input.photoUrls,
        startedAt: parseDateInput(input.startedAt),
        endedAt: parseDateInput(input.endedAt),
        obraStepId: input.obraStepId ?? null,
      }),
    );

    await logAudit(companyId, userId, 'OBRA_VISTORIA_CREATE', 'Obra', obraId, {
      vistoriaId: vistoria.id,
      type: vistoria.type,
      description: vistoria.description,
    });

    return vistoria;
  }

  async addNonConformity(
    obraId: string,
    companyId: string,
    userId: string | undefined,
    input: CreateNonConformityInput,
  ) {
    const obra = await getObraOrThrow(this.repo, obraId, companyId);
    assertObraActive(obra);

    const vistoria = await this.repo.findVistoriaForObra(input.vistoriaId, obraId, companyId);
    if (!vistoria) {
      throw new AppError(404, 'Vistoria não encontrada', 'VISTORIA_NOT_FOUND');
    }

    const nc = await this.repo.createNonConformity({
      vistoria: { connect: { id: input.vistoriaId } },
      description: input.description,
      severity: input.severity,
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
    });

    await logAudit(companyId, userId, 'OBRA_NC_CREATE', 'Obra', obraId, {
      nonConformityId: nc.id,
      vistoriaId: input.vistoriaId,
      description: nc.description,
    });

    return nc;
  }
}
