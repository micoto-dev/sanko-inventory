import api from './client';
import type { ExtractedEntity, EntityMaster, EntityType, PaginatedResponse } from '../types';

export interface EntityListParams {
  skip?: number;
  limit?: number;
  entity_type?: EntityType;
  is_matched_master?: boolean;
  document_id?: string;
}

export interface CompanyAggregation {
  company_name: string;
  normalized_name: string;
  entities: {
    entity_type: EntityType;
    entity_value: string;
    normalized_value?: string;
    document_id: string;
    filename: string;
  }[];
  related_documents: {
    id: string;
    filename: string;
    created_at: string;
  }[];
}

/** GET /entities – list extracted entities */
export const getEntities = async (
  params: EntityListParams = {}
): Promise<PaginatedResponse<ExtractedEntity & { document_id: string; filename: string }>> => {
  const { data } = await api.get('/entities', { params });
  return data;
};

/** PUT /entities/:id – update normalized_value */
export const updateEntity = async (
  id: string,
  payload: { normalized_value?: string }
): Promise<ExtractedEntity> => {
  const { data } = await api.put(`/entities/${id}`, payload);
  return data;
};

/** GET /entities/companies/:name – aggregate company info */
export const getCompanyInfo = async (
  name: string
): Promise<CompanyAggregation> => {
  const { data } = await api.get(`/entities/companies/${encodeURIComponent(name)}`);
  return data;
};

// ─── Entity Master ────────────────────────────────────────────────────────────

/** GET /entities/entity-master */
export const getEntityMasters = async (): Promise<EntityMaster[]> => {
  const { data } = await api.get('/entities/entity-master');
  return data;
};

/** POST /entities/entity-master */
export const createEntityMaster = async (payload: {
  entity_type: EntityType;
  canonical_value: string;
  aliases?: string[];
}): Promise<EntityMaster> => {
  const { data } = await api.post('/entities/entity-master', payload);
  return data;
};

/** PUT /entities/entity-master/:id */
export const updateEntityMaster = async (
  id: string,
  payload: { canonical_value?: string; aliases?: string[] }
): Promise<EntityMaster> => {
  const { data } = await api.put(`/entities/entity-master/${id}`, payload);
  return data;
};

/** DELETE /entities/entity-master/:id */
export const deleteEntityMaster = async (id: string): Promise<void> => {
  await api.delete(`/entities/entity-master/${id}`);
};
