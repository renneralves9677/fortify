import { api } from '@shared/lib/api';
import type { UserRole } from '@shared/lib/roles';
import { listQueryString, type ListQueryParams, type PaginatedResponse } from '@shared/types/pagination';

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isOwner: boolean;
  active: boolean;
  createdAt: string;
};

export type CreateUserPayload = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
};

export type UpdateUserPayload = {
  name?: string;
  role?: UserRole;
  active?: boolean;
};

export type ListUsersParams = ListQueryParams & {
  role?: UserRole | '';
  active?: '' | 'true' | 'false';
};

export function usersListQueryString(params: ListUsersParams = {}) {
  const q = new URLSearchParams();
  if (params.page) q.set('page', String(params.page));
  if (params.pageSize) q.set('pageSize', String(params.pageSize));
  if (params.search?.trim()) q.set('search', params.search.trim());
  if (params.role) q.set('role', params.role);
  if (params.active === 'true' || params.active === 'false') q.set('active', params.active);
  const s = q.toString();
  return s ? `?${s}` : '';
}

export async function listUsers(params: ListUsersParams = {}) {
  const { data } = await api.get<PaginatedResponse<UserRow>>(
    `/users${usersListQueryString(params)}`,
  );
  return data;
}

export async function createUser(payload: CreateUserPayload) {
  const { data } = await api.post<UserRow>('/users', payload);
  return data;
}

export async function updateUser(id: string, payload: UpdateUserPayload) {
  const { data } = await api.patch<UserRow>(`/users/${id}`, payload);
  return data;
}

export async function deleteUser(id: string) {
  const { data } = await api.delete<UserRow>(`/users/${id}`);
  return data;
}
