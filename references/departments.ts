import api from './client';
import type { Department } from '../types';

/** GET /departments – returns tree structure */
export const getDepartments = async (): Promise<Department[]> => {
  const { data } = await api.get('/departments');
  return data;
};

/** POST /departments */
export const createDepartment = async (payload: {
  name: string;
  parent_id?: string | null;
}): Promise<Department> => {
  const { data } = await api.post('/departments', payload);
  return data;
};

/** PUT /departments/:id */
export const updateDepartment = async (
  id: string,
  payload: { name: string; parent_id?: string | null }
): Promise<Department> => {
  const { data } = await api.put(`/departments/${id}`, payload);
  return data;
};

/** DELETE /departments/:id */
export const deleteDepartment = async (id: string): Promise<void> => {
  await api.delete(`/departments/${id}`);
};
