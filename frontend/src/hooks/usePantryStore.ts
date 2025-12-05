import { useState, useCallback, useEffect } from 'react';
import type { StorageArea, StorageAreaId, PantryItem, AreaColor, AreaIcon } from '../domain/types';
import { DEFAULT_STORAGE_AREAS } from '../domain/types';
import { storageAreasApi, itemsApi } from '../api';

interface PantryStore {
  // State
  storageAreas: StorageArea[];
  items: PantryItem[];
  isLoading: boolean;
  error: string | null;
  
  // Computed
  getItemsForArea: (storageAreaId: StorageAreaId) => PantryItem[];
  getItemCountForArea: (storageAreaId: StorageAreaId) => number;
  
  // Storage area actions
  addStorageArea: (name: string, icon: AreaIcon, color: AreaColor) => Promise<void>;
  updateStorageArea: (id: StorageAreaId, updates: Partial<Omit<StorageArea, 'id'>>) => Promise<void>;
  deleteStorageArea: (id: StorageAreaId) => Promise<void>;
  reorderStorageAreas: (ids: StorageAreaId[]) => Promise<void>;
  
  // Item actions
  addItem: (name: string, quantity: number, storageAreaId: StorageAreaId, expiryDate?: string) => Promise<void>;
  updateItemQuantity: (id: string, quantity: number) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  openItem: (id: string, quantityToOpen: number) => Promise<void>;
  
  // Refresh data
  refresh: () => Promise<void>;
}

export function usePantryStore(): PantryStore {
  const [storageAreas, setStorageAreas] = useState<StorageArea[]>(DEFAULT_STORAGE_AREAS);
  const [items, setItems] = useState<PantryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data from API on mount
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [areas, allItems] = await Promise.all([
        storageAreasApi.getAll(),
        itemsApi.getAll(),
      ]);
      
      setStorageAreas(areas.length > 0 ? areas : DEFAULT_STORAGE_AREAS);
      setItems(allItems);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
      // Fall back to defaults on error
      setStorageAreas(DEFAULT_STORAGE_AREAS);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getItemsForArea = useCallback(
    (storageAreaId: StorageAreaId): PantryItem[] => {
      return items
        .filter((item) => item.storageAreaId === storageAreaId)
        .sort((a, b) => a.name.localeCompare(b.name));
    },
    [items]
  );

  const getItemCountForArea = useCallback(
    (storageAreaId: StorageAreaId): number => {
      return items
        .filter((item) => item.storageAreaId === storageAreaId)
        .reduce((sum, item) => sum + item.quantity, 0);
    },
    [items]
  );

  const addStorageArea = useCallback(async (name: string, icon: AreaIcon, color: AreaColor) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    try {
      const newArea = await storageAreasApi.create({ name: trimmedName, icon, color });
      setStorageAreas((prev) => [...prev, newArea]);
    } catch (err) {
      console.error('Failed to add storage area:', err);
      setError(err instanceof Error ? err.message : 'Failed to add storage area');
    }
  }, []);

  const updateStorageArea = useCallback(
    async (id: StorageAreaId, updates: Partial<Omit<StorageArea, 'id'>>) => {
      try {
        const updated = await storageAreasApi.update(id, updates);
        setStorageAreas((prev) =>
          prev.map((area) => (area.id === id ? updated : area))
        );
      } catch (err) {
        console.error('Failed to update storage area:', err);
        setError(err instanceof Error ? err.message : 'Failed to update storage area');
      }
    },
    []
  );

  const deleteStorageArea = useCallback(async (id: StorageAreaId) => {
    try {
      await storageAreasApi.delete(id);
      setStorageAreas((prev) => prev.filter((area) => area.id !== id));
      setItems((prev) => prev.filter((item) => item.storageAreaId !== id));
    } catch (err) {
      console.error('Failed to delete storage area:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete storage area');
    }
  }, []);

  const reorderStorageAreas = useCallback(async (ids: StorageAreaId[]) => {
    try {
      const reordered = await storageAreasApi.reorder(ids);
      setStorageAreas(reordered);
    } catch (err) {
      console.error('Failed to reorder storage areas:', err);
      setError(err instanceof Error ? err.message : 'Failed to reorder storage areas');
    }
  }, []);

  const addItem = useCallback(
    async (name: string, quantity: number, storageAreaId: StorageAreaId, expiryDate?: string) => {
      const trimmedName = name.trim();
      if (!trimmedName || quantity < 1) return;

      try {
        const result = await itemsApi.create({ name: trimmedName, quantity, storageAreaId, expiryDate });
        
        // The API handles merging, so we need to update our local state accordingly
        setItems((prev) => {
          const existingIndex = prev.findIndex((item) => item.id === result.id);
          if (existingIndex >= 0) {
            // Item was merged, update existing
            const updated = [...prev];
            updated[existingIndex] = result;
            return updated;
          }
          // New item was created
          return [...prev, result];
        });
      } catch (err) {
        console.error('Failed to add item:', err);
        setError(err instanceof Error ? err.message : 'Failed to add item');
      }
    },
    []
  );

  const updateItemQuantity = useCallback(async (id: string, quantity: number) => {
    try {
      if (quantity < 1) {
        await itemsApi.delete(id);
        setItems((prev) => prev.filter((item) => item.id !== id));
      } else {
        const updated = await itemsApi.updateQuantity(id, quantity);
        if (updated) {
          setItems((prev) =>
            prev.map((item) => (item.id === id ? updated : item))
          );
        }
      }
    } catch (err) {
      console.error('Failed to update item quantity:', err);
      setError(err instanceof Error ? err.message : 'Failed to update item quantity');
    }
  }, []);

  const removeItem = useCallback(async (id: string) => {
    try {
      await itemsApi.delete(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error('Failed to remove item:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove item');
    }
  }, []);

  const openItem = useCallback(async (id: string, quantityToOpen: number) => {
    try {
      const result = await itemsApi.open(id, quantityToOpen);
      
      setItems((prev) => {
        // Remove the original item
        const filtered = prev.filter((item) => item.id !== id);
        // Add the returned items (may be 1 if fully opened, or 2 if split)
        return [...filtered, ...result.items];
      });
    } catch (err) {
      console.error('Failed to open item:', err);
      setError(err instanceof Error ? err.message : 'Failed to open item');
    }
  }, []);

  return {
    storageAreas,
    items,
    isLoading,
    error,
    getItemsForArea,
    getItemCountForArea,
    addStorageArea,
    updateStorageArea,
    deleteStorageArea,
    reorderStorageAreas,
    addItem,
    updateItemQuantity,
    removeItem,
    openItem,
    refresh: loadData,
  };
}
