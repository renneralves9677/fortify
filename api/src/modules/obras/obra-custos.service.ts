import { AppError } from '../../core/errors/AppError.js';
import { withPrismaError } from '../../core/errors/prisma-mapper.js';
import { logAudit } from '../../middleware/audit.js';
import {
  getCategoryLabel,
  getPoApprovalThreshold,
  isDirectCostAllowed,
  listCostCategoriesForApi,
} from '../../domain/obras/cost-categories.js';
import type { CreateCustoInput } from './obras.schema.js';
import type { ObrasRepositoryPort } from './obras.repository.port.js';
import { assertObraActive, assertObraStep, getObraOrThrow } from './obras-shared.js';

export class ObraCustosService {
  constructor(private readonly repo: ObrasRepositoryPort) {}

  listCostCategories() {
    return {
      categories: listCostCategoriesForApi(),
      poApprovalThreshold: getPoApprovalThreshold(),
    };
  }

  async addCusto(
    obraId: string,
    companyId: string,
    userId: string | undefined,
    input: CreateCustoInput,
  ) {
    const obra = await getObraOrThrow(this.repo, obraId, companyId);
    assertObraActive(obra);

    if (!isDirectCostAllowed(input.category)) {
      throw new AppError(
        400,
        'Esta categoria exige ordem de compra antes do lançamento',
        'PO_REQUIRED',
      );
    }

    await assertObraStep(this.repo, obraId, companyId, input.obraStepId);

    const custo = await withPrismaError(() =>
      this.repo.createCusto(obra.id, {
        category: input.category,
        description: input.description,
        amount: input.amount,
        date: input.date ? new Date(input.date) : new Date(),
        obraStepId: input.obraStepId ?? null,
      }),
    );

    await logAudit(companyId, userId, 'OBRA_CUSTO_CREATE', 'Obra', obraId, {
      custoId: custo.id,
      category: custo.category,
      description: custo.description,
      amount: Number(custo.amount),
    });

    return {
      ...custo,
      amount: Number(custo.amount),
      categoryLabel: getCategoryLabel(custo.category),
    };
  }
}
