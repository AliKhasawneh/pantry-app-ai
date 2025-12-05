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

// Recipe suggestion type
export interface RecipeSuggestion {
  id: string;
  name: string;
  ingredients: string[];
  instructions: string[];
  optional?: string[];
}

// AI API
export const aiApi = {
  getStatus: (): Promise<{ available: boolean; provider: string; message: string }> =>
    fetchJson(`${API_BASE}/ai/status`),

  suggestRecipes: (items: string[]): Promise<{ recipes: RecipeSuggestion[] }> =>
    fetchJson(`${API_BASE}/ai/recipes`, {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),

  filterIngredients: (items: string[]): Promise<{ result: string }> =>
    fetchJson(`${API_BASE}/ai/filter-ingredients`, {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),

  suggestFromRecipes: (recipes: string[], pantryItems: string[]): Promise<{ recipes: RecipeSuggestion[] }> =>
    fetchJson(`${API_BASE}/ai/suggest-from-recipes`, {
      method: 'POST',
      body: JSON.stringify({ recipes, pantryItems }),
    }),

  getStorageTips: (itemName: string, storageArea: string): Promise<{ result: string }> =>
    fetchJson(`${API_BASE}/ai/storage-tips`, {
      method: 'POST',
      body: JSON.stringify({ itemName, storageArea }),
    }),

  generate: (prompt: string): Promise<{ result: string }> =>
    fetchJson(`${API_BASE}/ai/generate`, {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    }),
};

// Disliked Recipes API
export interface DislikedRecipe {
  id: string;
  name: string;
  createdAt: number;
}

export const dislikedRecipesApi = {
  getAll: (): Promise<DislikedRecipe[]> =>
    fetchJson(`${API_BASE}/disliked-recipes`),

  getNames: (): Promise<{ names: string[] }> =>
    fetchJson(`${API_BASE}/disliked-recipes/names`),

  add: (name: string): Promise<DislikedRecipe> =>
    fetchJson(`${API_BASE}/disliked-recipes`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  remove: (name: string): Promise<void> =>
    fetchJson(`${API_BASE}/disliked-recipes/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    }),

  check: (name: string): Promise<{ isDisliked: boolean }> =>
    fetchJson(`${API_BASE}/disliked-recipes/check`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
};

// Recipes API (TheMealDB)
export interface RecipeMeal {
  id: string;
  name: string;
  thumbnail: string;
}

export interface RecipeSearchResult {
  ingredient: string;
  count: number;
  meals: RecipeMeal[];
}

export interface RecipeDetails {
  id: string;
  name: string;
  category: string;
  area: string;
  instructions: string;
  thumbnail: string;
  youtube?: string;
  ingredients: Array<{ ingredient: string; measure: string }>;
}

export const recipesApi = {
  searchByIngredient: (ingredient: string): Promise<RecipeSearchResult> =>
    fetchJson(`${API_BASE}/recipes/search?ingredient=${encodeURIComponent(ingredient)}`),

  getDetails: (id: string): Promise<RecipeDetails> =>
    fetchJson(`${API_BASE}/recipes/${id}`),
};

