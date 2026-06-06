import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { AppError } from '../../core/errors/AppError.js';
import { withPrismaError } from '../../core/errors/prisma-mapper.js';
import { paginatedResult, paginationBounds } from '../../shared/pagination.js';
import type { CreateUserInput, ListUsersQuery, UpdateUserInput } from './users.schema.js';
import { assertCanCreateUser, assertCanManageUser } from './users.permissions.js';
import { UsersRepository } from './users.repository.js';

type ActorContext = { userId: string; role: string };

export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async listUsersForCompany(companyId: string, query: ListUsersQuery) {
    const { page, pageSize, search } = query;
    const { skip, take } = paginationBounds(page, pageSize);
    const [items, total] = await Promise.all([
      this.usersRepository.findManyByCompany(companyId, { search, skip, take }),
      this.usersRepository.countByCompany(companyId, search),
    ]);
    return paginatedResult(items, total, page, pageSize);
  }

  async createUserForCompany(companyId: string, actor: ActorContext, input: CreateUserInput) {
    await this.ensureActor(companyId, actor);
    assertCanCreateUser(actor, input.role as UserRole);

    const hash = await bcrypt.hash(input.password, 10);
    return withPrismaError(() =>
      this.usersRepository.create({
        name: input.name,
        email: input.email,
        passwordHash: hash,
        role: input.role as UserRole,
        company: { connect: { id: companyId } },
      }),
    );
  }

  async updateUserForCompany(
    companyId: string,
    actor: ActorContext,
    userId: string,
    input: UpdateUserInput,
  ) {
    await this.ensureActor(companyId, actor);
    const target = await this.usersRepository.findByIdInCompany(userId, companyId);
    if (!target) throw new AppError(404, 'Usuário não encontrado', 'USER_NOT_FOUND');

    assertCanManageUser(actor, target);
    if (input.role) assertCanCreateUser(actor, input.role as UserRole);

    return withPrismaError(() =>
      this.usersRepository.update(userId, {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.role !== undefined ? { role: input.role as UserRole } : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
      }),
    );
  }

  async deleteUserForCompany(companyId: string, actor: ActorContext, userId: string) {
    await this.ensureActor(companyId, actor);
    const target = await this.usersRepository.findByIdInCompany(userId, companyId);
    if (!target) throw new AppError(404, 'Usuário não encontrado', 'USER_NOT_FOUND');

    assertCanManageUser(actor, target);
    return withPrismaError(() => this.usersRepository.softDelete(userId));
  }

  private async ensureActor(companyId: string, actor: ActorContext) {
    const row = await this.usersRepository.findActor(actor.userId, companyId);
    if (!row) throw new AppError(403, 'Permissão negada', 'FORBIDDEN');
    actor.role = row.role;
    return row;
  }
}
