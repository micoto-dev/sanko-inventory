import api from './client';
import type { Conversation, Message } from '../types';

export interface ChatFilters {
  category_ids?: string[];
  entity_type?: string;
  entity_value?: string;
  date_from?: string;
  date_to?: string;
}

export interface SendMessageRequest {
  message: string;
  conversation_id?: string;
  filters?: ChatFilters;
}

export interface SendMessageResponse {
  answer: string;
  conversation_id: string;
  sources: {
    document_id: string;
    filename: string;
    content_preview: string;
    page_number?: number;
    sheet_name?: string;
    score: number;
  }[];
  entities?: unknown[];
  suggestions?: string[];
}

/** POST /chat */
export const sendMessage = async (
  req: SendMessageRequest
): Promise<SendMessageResponse> => {
  // Map frontend fields → backend schema
  const payload: Record<string, unknown> = {
    question: req.message,
    conversation_id: req.conversation_id ?? undefined,
    category_ids: req.filters?.category_ids ?? undefined,
    entity_filters: req.filters?.entity_value ? [req.filters.entity_value] : undefined,
  };
  const { data } = await api.post('/chat', payload);
  return data;
};

/** GET /conversations */
export const getConversations = async (): Promise<Conversation[]> => {
  const { data } = await api.get('/conversations');
  return data;
};

/** GET /conversations/:id */
export const getConversation = async (id: string): Promise<Conversation> => {
  const { data } = await api.get(`/conversations/${id}`);
  return data;
};

/** POST /conversations – create new empty conversation */
export const createConversation = async (): Promise<Conversation> => {
  const { data } = await api.post('/conversations');
  return data;
};

/** DELETE /conversations/:id */
export const deleteConversation = async (id: string): Promise<void> => {
  await api.delete(`/conversations/${id}`);
};

/** GET /conversations/:id/messages */
export const getConversationMessages = async (
  id: string
): Promise<Message[]> => {
  const { data } = await api.get(`/conversations/${id}/messages`);
  return data;
};
