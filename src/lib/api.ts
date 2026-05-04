const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(err.error?.message || res.statusText);
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

  // Products
  getProducts: () => request<any>('/products'),
  getProduct: (id: number) => request<any>(`/products/${id}`),
  createProduct: (data: any) => request<any>('/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id: number, data: any) => request<any>(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Orders
  getOrders: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any>(`/orders${qs}`);
  },
  createOrder: (data: any) => request<any>('/orders', { method: 'POST', body: JSON.stringify(data) }),
  approveOrder: (id: number) => request<any>(`/orders/${id}/approve`, { method: 'POST' }),

  // Receives
  createReceive: (data: any) => request<any>('/receives', { method: 'POST', body: JSON.stringify(data) }),

  // Production Orders
  getProductionOrders: () => request<any>('/production-orders'),
  getProductionOrder: (id: number) => request<any>(`/production-orders/${id}`),
  createProductionOrder: (data: any) => request<any>('/production-orders', { method: 'POST', body: JSON.stringify(data) }),
  issueProductionOrder: (id: number, data: any) => request<any>(`/production-orders/${id}/issue`, { method: 'POST', body: JSON.stringify(data) }),

  // Locations
  getLocations: () => request<any>('/locations'),
  createLocation: (data: any) => request<any>('/locations', { method: 'POST', body: JSON.stringify(data) }),

  // Logs
  getLogs: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any>(`/logs${qs}`);
  },

  // Stocktakes
  getStocktakes: () => request<any>('/stocktakes'),
  createStocktake: (data: any) => request<any>('/stocktakes', { method: 'POST', body: JSON.stringify(data) }),
  approveStocktake: (id: number) => request<any>(`/stocktakes/${id}/approve`, { method: 'POST' }),
};
