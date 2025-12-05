import type { StorageArea, PantryItem, AreaColor, AreaIcon, StorageAreaId } from '../domain/types';

// In development, Vite proxy handles /api routes. In production, same origin is used.
const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// Storage Areas API
export const storageAreasApi = {
  getAll: (): Promise<StorageArea[]> => 
    fetchJson(`${API_BASE}/storage-areas`),

  getById: (id: StorageAreaId): Promise<StorageArea> => 
    fetchJson(`${API_BASE}/storage-areas/${id}`),

  create: (data: { name: string; icon: AreaIcon; color: AreaColor }): Promise<StorageArea> =>
    fetchJson(`${API_BASE}/storage-areas`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: StorageAreaId, data: Partial<Omit<StorageArea, 'id'>>): Promise<StorageArea> =>
    fetchJson(`${API_BASE}/storage-areas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: StorageAreaId): Promise<void> =>
    fetchJson(`${API_BASE}/storage-areas/${id}`, {
      method: 'DELETE',
    }),

  reorder: (ids: StorageAreaId[]): Promise<StorageArea[]> =>
    fetchJson(`${API_BASE}/storage-areas/reorder/batch`, {
      method: 'PUT',
      body: JSON.stringify({ ids }),
    }),
};

// Items API
export const itemsApi = {
  getAll: (): Promise<PantryItem[]> => 
    fetchJson(`${API_BASE}/items`),

  getByArea: (storageAreaId: StorageAreaId): Promise<PantryItem[]> => 
    fetchJson(`${API_BASE}/items/area/${storageAreaId}`),

  getById: (id: string): Promise<PantryItem> => 
    fetchJson(`${API_BASE}/items/${id}`),

  create: (data: { 
    name: string; 
    quantity: number; 
    storageAreaId: StorageAreaId; 
    expiryDate?: string;
  }): Promise<PantryItem> =>
    fetchJson(`${API_BASE}/items`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateQuantity: (id: string, quantity: number): Promise<PantryItem | void> =>
    fetchJson(`${API_BASE}/items/${id}/quantity`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    }),

  open: (id: string, quantityToOpen: number): Promise<{ items: PantryItem[] }> =>
    fetchJson(`${API_BASE}/items/${id}/open`, {
      method: 'PUT',
      body: JSON.stringify({ quantityToOpen }),
    }),

  delete: (id: string): Promise<void> =>
    fetchJson(`${API_BASE}/items/${id}`, {
      method: 'DELETE',
    }),
};

