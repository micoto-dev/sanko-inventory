import api from './client';
import useAuthStore from '../stores/authStore';
import type { UserInfo, PaginatedResponse } from '../types';

export interface CreateUserRequest {
  email: string;
  password?: string;
  role: 'admin' | 'manager' | 'accountant' | 'user';
  department_ids?: string[];
}

export interface UpdateUserRequest {
  role?: 'admin' | 'manager' | 'accountant' | 'user';
  department_ids?: string[];
  is_active?: boolean;
}

export interface UserListParams {
  skip?: number;
  limit?: number;
  search?: string;
  role?: string;
  department_id?: string;
  is_active?: boolean;
}

/** GET /users */
export const getUsers = async (
  params: UserListParams = {}
): Promise<PaginatedResponse<UserInfo>> => {
  const { data } = await api.get('/users', { params });
  return data;
};

/** GET /users/me */
export const getCurrentUser = async (): Promise<UserInfo> => {
  const { data } = await api.get('/users/me');
  return data;
};

/** POST /users */
export const createUser = async (
  req: CreateUserRequest
): Promise<UserInfo> => {
  const { data } = await api.post('/users', req);
  return data;
};

/** PUT /users/:id */
export const updateUser = async (
  id: string,
  req: UpdateUserRequest
): Promise<UserInfo> => {
  const { data } = await api.put(`/users/${id}`, req);
  return data;
};

/** DELETE /users/:id (soft delete) */
export const deleteUser = async (id: string): Promise<void> => {
  await api.delete(`/users/${id}`);
};

/** PUT /auth/me – update own profile (full_name) */
export const updateMyProfile = async (
  fullName: string
): Promise<void> => {
  await api.put('/auth/me', { full_name: fullName });
};

/** PUT /users/me/password */
export const changePassword = async (
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  await api.put('/users/me/password', {
    current_password: currentPassword,
    new_password: newPassword,
  });
};

/** POST /users/{id}/confirm-password – initial password set (no current password required) */
export const confirmPassword = async (
  userId: string,
  newPassword: string
): Promise<void> => {
  await api.post(`/users/${userId}/confirm-password`, {
    new_password: newPassword,
  });
};

/** POST /users/import */
export const importUsers = (file: File) => {
  const form = new FormData();
  form.append('file', file);
  return api.post('/users/import', form, { headers: { 'Content-Type': 'multipart/form-data' } });
};

/** GET /users/export */
export const exportUsers = (): Promise<Blob> => {
  const token = useAuthStore.getState().user ? `Bearer ${btoa(JSON.stringify({ id: useAuthStore.getState().user?.id }))}` : '';
  return fetch(`${import.meta.env.VITE_API_URL}/users/export`, {
    headers: { Authorization: token },
    credentials: 'include',
  }).then(res => {
    if (!res.ok) throw new Error('Export failed');
    return res.blob();
  });
};
