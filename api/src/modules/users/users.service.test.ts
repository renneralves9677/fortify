import { describe, it, expect, beforeEach } from 'vitest';
import { UserRole } from '@prisma/client';
import { AppError } from '../../core/errors/AppError.js';
import { UsersService } from './users.service.js';

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isOwner: boolean;
  active: boolean;
  deletedAt: Date | null;
  passwordHash?: string;
};

class FakeUsersRepository {
  users: UserRow[] = [
    {
      id: 'owner',
      name: 'Owner',
      email: 'owner@test.com',
      role: UserRole.SUPER_ADMIN,
      isOwner: true,
      active: true,
      deletedAt: null,
    },
    {
      id: 'admin1',
      name: 'Admin',
      email: 'admin@test.com',
      role: UserRole.ADMIN,
      isOwner: false,
      active: true,
      deletedAt: null,
    },
    {
      id: 'viewer1',
      name: 'Viewer',
      email: 'viewer@test.com',
      role: UserRole.VIEWER,
      isOwner: false,
      active: true,
      deletedAt: null,
    },
  ];

  findManyByCompany(_companyId: string) {
    return Promise.resolve(
      this.users
        .filter((u) => !u.deletedAt)
        .map(({ passwordHash: _p, deletedAt: _d, ...u }) => u),
    );
  }

  findByIdInCompany(id: string, _companyId: string) {
    const u = this.users.find((x) => x.id === id && !x.deletedAt);
    return Promise.resolve(u ?? null);
  }

  findActor(id: string, _companyId: string) {
    const u = this.users.find((x) => x.id === id && x.active && !x.deletedAt);
    if (!u) return Promise.resolve(null);
    return Promise.resolve({ id: u.id, role: u.role, isOwner: u.isOwner });
  }

  create(data: { name: string; email: string; role: UserRole }) {
    const user: UserRow = {
      id: `u${this.users.length + 1}`,
      name: data.name,
      email: data.email,
      role: data.role,
      isOwner: false,
      active: true,
      deletedAt: null,
    };
    this.users.push(user);
    return Promise.resolve(user);
  }

  update(id: string, data: Partial<Pick<UserRow, 'name' | 'role' | 'active'>>) {
    const u = this.users.find((x) => x.id === id)!;
    Object.assign(u, data);
    return Promise.resolve(u);
  }

  softDelete(id: string) {
    const u = this.users.find((x) => x.id === id)!;
    u.deletedAt = new Date();
    u.active = false;
    return Promise.resolve(u);
  }
}

describe('UsersService', () => {
  let repo: FakeUsersRepository;
  let service: UsersService;
  const companyId = 'c1';

  beforeEach(() => {
    repo = new FakeUsersRepository();
    service = new UsersService(repo as never);
  });

  it('SUPER_ADMIN creates ADMIN user', async () => {
    const user = await service.createUserForCompany(
      companyId,
      { userId: 'owner', role: UserRole.SUPER_ADMIN },
      { name: 'Novo Admin', email: 'newadmin@test.com', password: 'password1', role: UserRole.ADMIN },
    );
    expect(user.role).toBe(UserRole.ADMIN);
  });

  it('ADMIN cannot create ADMIN', async () => {
    await expect(
      service.createUserForCompany(
        companyId,
        { userId: 'admin1', role: UserRole.ADMIN },
        { name: 'X', email: 'x@test.com', password: 'password1', role: UserRole.ADMIN },
      ),
    ).rejects.toBeInstanceOf(AppError);
  });

  it('ADMIN creates VIEWER user', async () => {
    const user = await service.createUserForCompany(
      companyId,
      { userId: 'admin1', role: UserRole.ADMIN },
      { name: 'Normal', email: 'normal@test.com', password: 'password1', role: UserRole.VIEWER },
    );
    expect(user.role).toBe(UserRole.VIEWER);
  });

  it('ADMIN cannot update another ADMIN', async () => {
    repo.users.push({
      id: 'admin2',
      name: 'Admin2',
      email: 'admin2@test.com',
      role: UserRole.ADMIN,
      isOwner: false,
      active: true,
      deletedAt: null,
    });
    await expect(
      service.updateUserForCompany(
        companyId,
        { userId: 'admin1', role: UserRole.ADMIN },
        'admin2',
        { active: false },
      ),
    ).rejects.toBeInstanceOf(AppError);
  });

  it('cannot inactivate owner', async () => {
    await expect(
      service.updateUserForCompany(
        companyId,
        { userId: 'owner', role: UserRole.SUPER_ADMIN },
        'owner',
        { active: false },
      ),
    ).rejects.toBeInstanceOf(AppError);
  });

  it('soft delete sets deletedAt', async () => {
    const result = await service.deleteUserForCompany(
      companyId,
      { userId: 'admin1', role: UserRole.ADMIN },
      'viewer1',
    );
    expect(result.active).toBe(false);
    expect(repo.users.find((u) => u.id === 'viewer1')?.deletedAt).toBeTruthy();
  });

  it('cannot self-delete', async () => {
    await expect(
      service.deleteUserForCompany(
        companyId,
        { userId: 'admin1', role: UserRole.ADMIN },
        'admin1',
      ),
    ).rejects.toBeInstanceOf(AppError);
  });
});
