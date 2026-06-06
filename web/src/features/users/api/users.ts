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

export async function listUsers(params: ListQueryParams = {}) {
  const { data } = await api.get<PaginatedResponse<UserRow>>(
    `/users${listQueryString(params)}`,
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
