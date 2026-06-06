import { UserRole } from '@prisma/client';
import { AppError } from '../../core/errors/AppError.js';

export function isAdminRole(role: string): boolean {
  return role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
}

export function isSuperAdminRole(role: string): boolean {
  return role === UserRole.SUPER_ADMIN;
}

type UserTarget = {
  id: string;
  role: UserRole;
  isOwner: boolean;
};

type Actor = {
  userId: string;
  role: string;
};

export function assertCanCreateUser(actor: Actor, targetRole: UserRole) {
  if (!isAdminRole(actor.role)) {
    throw new AppError(403, 'Permissão negada', 'FORBIDDEN');
  }
  if (isSuperAdminRole(actor.role)) return;
  if (targetRole === UserRole.ADMIN || targetRole === UserRole.SUPER_ADMIN) {
    throw new AppError(403, 'Admin não pode criar usuários administradores', 'FORBIDDEN');
  }
}

export function assertCanManageUser(actor: Actor, target: UserTarget) {
  if (!isAdminRole(actor.role)) {
    throw new AppError(403, 'Permissão negada', 'FORBIDDEN');
  }
  if (target.isOwner) {
    throw new AppError(403, 'A conta dona da empresa não pode ser alterada', 'OWNER_IMMUTABLE');
  }
  if (actor.userId === target.id) {
    throw new AppError(403, 'Você não pode alterar ou excluir a própria conta', 'SELF_ACTION_FORBIDDEN');
  }
  if (!isSuperAdminRole(actor.role) && isAdminRole(target.role)) {
    throw new AppError(403, 'Admin não pode alterar usuários administradores', 'FORBIDDEN');
  }
}
