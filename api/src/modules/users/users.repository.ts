import { prisma } from '../../core/database/prisma.js';
import type { Prisma, UserRole } from '@prisma/client';

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isOwner: true,
  active: true,
  createdAt: true,
} as const;

export class UsersRepository {
  private usersWhere(companyId: string, search?: string) {
    return {
      companyId,
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
  }

  findManyByCompany(
    companyId: string,
    options: { search?: string; skip?: number; take?: number } = {},
  ) {
    return prisma.user.findMany({
      where: this.usersWhere(companyId, options.search),
      select: userSelect,
      orderBy: { name: 'asc' },
      ...(options.skip !== undefined ? { skip: options.skip } : {}),
      ...(options.take !== undefined ? { take: options.take } : {}),
    });
  }

  countByCompany(companyId: string, search?: string) {
    return prisma.user.count({ where: this.usersWhere(companyId, search) });
  }

  findByIdInCompany(id: string, companyId: string) {
    return prisma.user.findFirst({
      where: { id, companyId, deletedAt: null },
      select: { ...userSelect, deletedAt: true },
    });
  }

  create(data: Prisma.UserCreateInput) {
    return prisma.user.create({
      data,
      select: userSelect,
    });
  }

  update(id: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({
      where: { id },
      data,
      select: userSelect,
    });
  }

  softDelete(id: string) {
    return prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
      select: userSelect,
    });
  }

  findActor(id: string, companyId: string) {
    return prisma.user.findFirst({
      where: { id, companyId, deletedAt: null, active: true },
      select: { id: true, role: true, isOwner: true },
    });
  }
}
