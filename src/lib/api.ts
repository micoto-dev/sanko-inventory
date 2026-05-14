const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    const errMsg = typeof err.error === 'string' ? err.error : err.error?.message;
    throw new Error(errMsg || res.statusText);
  }
  return res.json();
}

export const api = {
  // Dashboard
  dashboard: () => request<any>('/dashboard'),

  // Parts
  getParts: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any>(`/parts${qs}`);
  },
  getPart: (id: string) => request<any>(`/parts/${id}`),
  createPart: (data: any) => request<any>('/parts', { method: 'POST', body: JSON.stringify(data) }),
  updatePart: (id: string, data: any) => request<any>(`/parts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deletePart: (id: string) => request<any>(`/parts/${id}`, { method: 'DELETE' }),

  // Products
  getProducts: () => request<any>('/products'),
  getProduct: (id: number) => request<any>(`/products/${id}`),
  createProduct: (data: any) => request<any>('/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id: number, data: any) => request<any>(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteProduct: (id: number) => request<any>(`/products/${id}`, { method: 'DELETE' }),

  // Orders
  getOrders: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any>(`/orders${qs}`);
  },
  createOrder: (data: any) => request<any>('/orders', { method: 'POST', body: JSON.stringify(data) }),
  approveOrder: (id: number) => request<any>(`/orders/${id}/approve`, { method: 'POST', body: JSON.stringify({ approvedById: 1 }) }),
  updateOrder: (id: number, data: any) => request<any>(`/orders/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  markManufacturerShortage: (id: number) => request<any>(`/orders/${id}/manufacturer-shortage`, { method: 'POST' }),
  markItemShortage: (orderId: number, detailId: number) => request<any>(`/orders/${orderId}/details/${detailId}/shortage`, { method: 'POST' }),
  cancelItemShortage: (orderId: number, detailId: number) => request<any>(`/orders/${orderId}/details/${detailId}/shortage`, { method: 'DELETE' }),

  // Parts import
  importParts: (data: any[]) => request<any>('/parts/import', { method: 'POST', body: JSON.stringify({ parts: data }) }),

  // Receives
  createReceive: (data: any) => request<any>('/receives', { method: 'POST', body: JSON.stringify(data) }),

  // Production Orders
  getProductionOrders: () => request<any>('/production-orders'),
  getProductionOrder: (id: number) => request<any>(`/production-orders/${id}`),
  createProductionOrder: (data: any) => request<any>('/production-orders', { method: 'POST', body: JSON.stringify(data) }),
  issueProductionOrder: (id: number, data: any) => request<any>(`/production-orders/${id}/issue`, { method: 'POST', body: JSON.stringify(data) }),
  updateProductionOrder: (id: number, data: any) => request<any>(`/production-orders/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteProductionOrder: (id: number) => request<any>(`/production-orders/${id}`, { method: 'DELETE' }),

  // Locations
  getLocations: () => request<any>('/locations'),
  createLocation: (data: any) => request<any>('/locations', { method: 'POST', body: JSON.stringify(data) }),
  updateLocation: (id: string, data: any) => request<any>(`/locations/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteLocation: (id: string) => request<any>(`/locations/${id}`, { method: 'DELETE' }),

  // Makers
  getMakers: () => request<any>('/makers'),
  createMaker: (data: any) => request<any>('/makers', { method: 'POST', body: JSON.stringify(data) }),
  updateMaker: (id: number, data: any) => request<any>(`/makers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteMaker: (id: number) => request<any>(`/makers/${id}`, { method: 'DELETE' }),
  importMakers: (data: any[]) => request<any>('/makers/import', { method: 'POST', body: JSON.stringify({ makers: data }) }),

  // Suppliers
  getSuppliers: () => request<any>('/suppliers'),
  createSupplier: (data: any) => request<any>('/suppliers', { method: 'POST', body: JSON.stringify(data) }),
  updateSupplier: (id: number, data: any) => request<any>(`/suppliers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteSupplier: (id: number) => request<any>(`/suppliers/${id}`, { method: 'DELETE' }),
  importSuppliers: (data: any[]) => request<any>('/suppliers/import', { method: 'POST', body: JSON.stringify({ suppliers: data }) }),

  // Customers
  getCustomers: () => request<any>('/customers'),
  createCustomer: (data: any) => request<any>('/customers', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (id: number, data: any) => request<any>(`/customers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteCustomer: (id: number) => request<any>(`/customers/${id}`, { method: 'DELETE' }),
  importCustomers: (data: any[]) => request<any>('/customers/import', { method: 'POST', body: JSON.stringify({ customers: data }) }),

  // Logs
  getLogs: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any>(`/logs${qs}`);
  },

  // Stocktakes
  getStocktakes: () => request<any>('/stocktakes'),
  createStocktake: (data: any) => request<any>('/stocktakes', { method: 'POST', body: JSON.stringify(data) }),
  approveStocktake: (id: number) => request<any>(`/stocktakes/${id}/approve`, { method: 'POST' }),

  // Auth
  getMe: () => request<any>('/auth/me'),

  // Users
  getUsers: () => request<any>('/users'),
  createUser: (data: any) => request<any>('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: number, data: any) => request<any>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteUser: (id: number) => request<any>(`/users/${id}`, { method: 'DELETE' }),

  // Departments
  getDepartments: () => request<any>('/departments'),
  createDepartment: (data: any) => request<any>('/departments', { method: 'POST', body: JSON.stringify(data) }),
  updateDepartment: (id: number, data: any) => request<any>(`/departments/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteDepartment: (id: number) => request<any>(`/departments/${id}`, { method: 'DELETE' }),

  // Entities
  getEntities: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any>(`/entities${qs}`);
  },
  createEntity: (data: any) => request<any>('/entities', { method: 'POST', body: JSON.stringify(data) }),
  updateEntity: (id: number, data: any) => request<any>(`/entities/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // AI Chat
  chat: (message: string, sessionId?: string) => request<any>('/chat', { method: 'POST', body: JSON.stringify({ message, sessionId }) }),
  getConversations: () => request<any>('/chat/conversations'),
  getConversation: (id: string) => request<any>(`/chat/conversations/${id}`),
  createConversation: () => request<any>('/chat/conversations', { method: 'POST' }),

  // Knowledge (RAG)
  getKnowledgeDocs: () => request<any>('/knowledge'),
  uploadKnowledgeDoc: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/knowledge', { method: 'POST', body: formData });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || res.statusText); }
    return res.json();
  },
  deleteKnowledgeDoc: (id: number) => request<any>(`/knowledge/${id}`, { method: 'DELETE' }),

  // Users extra
  resetUserPassword: (id: number, newPassword: string) => request<any>(`/users/${id}/reset-password`, { method: 'POST', body: JSON.stringify({ newPassword }) }),

  // Entity Masters
  getEntityMasters: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any>(`/entity-masters${qs}`);
  },
  createEntityMaster: (data: any) => request<any>('/entity-masters', { method: 'POST', body: JSON.stringify(data) }),
  updateEntityMaster: (id: number, data: any) => request<any>(`/entity-masters/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteEntityMaster: (id: number) => request<any>(`/entity-masters/${id}`, { method: 'DELETE' }),
};
