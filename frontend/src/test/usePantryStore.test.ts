import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePantryStore } from '../hooks/usePantryStore';
import { DEFAULT_STORAGE_AREAS } from '../domain/types';

// Mock the API module
vi.mock('../api', () => ({
  storageAreasApi: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    reorder: vi.fn(),
  },
  itemsApi: {
    getAll: vi.fn(),
    create: vi.fn(),
    updateQuantity: vi.fn(),
    delete: vi.fn(),
    open: vi.fn(),
  },
}));

import { storageAreasApi, itemsApi } from '../api';
import type { Mock } from 'vitest';

const mockStorageAreasApi = storageAreasApi as unknown as {
  getAll: Mock;
  create: Mock;
  update: Mock;
  delete: Mock;
  reorder: Mock;
};

const mockItemsApi = itemsApi as unknown as {
  getAll: Mock;
  create: Mock;
  updateQuantity: Mock;
  delete: Mock;
  open: Mock;
};

describe('usePantryStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementations
    mockStorageAreasApi.getAll.mockResolvedValue(DEFAULT_STORAGE_AREAS);
    mockItemsApi.getAll.mockResolvedValue([]);
  });

  it('initializes with default storage areas', async () => {
    const { result } = renderHook(() => usePantryStore());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.storageAreas).toEqual(DEFAULT_STORAGE_AREAS);
    expect(result.current.items).toHaveLength(0);
  });

  it('adds a new storage area', async () => {
    const newArea = { id: 'new-1', name: 'Basement', icon: 'box' as const, color: 'violet' as const, order: 3 };
    mockStorageAreasApi.create.mockResolvedValue(newArea);

    const { result } = renderHook(() => usePantryStore());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.addStorageArea('Basement', 'box', 'violet');
    });

    expect(mockStorageAreasApi.create).toHaveBeenCalledWith({
      name: 'Basement',
      icon: 'box',
      color: 'violet',
    });

    const basement = result.current.storageAreas.find((a) => a.name === 'Basement');
    expect(basement).toBeDefined();
    expect(basement?.icon).toBe('box');
    expect(basement?.color).toBe('violet');
  });

  it('deletes a storage area and its items', async () => {
    mockStorageAreasApi.delete.mockResolvedValue(undefined);

    const { result } = renderHook(() => usePantryStore());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const areaId = result.current.storageAreas[0].id;

    await act(async () => {
      await result.current.deleteStorageArea(areaId);
    });

    expect(mockStorageAreasApi.delete).toHaveBeenCalledWith(areaId);
    expect(result.current.storageAreas.find((a) => a.id === areaId)).toBeUndefined();
  });

  it('adds an item to an area', async () => {
    const newItem = {
      id: 'item-1',
      name: 'Milk',
      quantity: 2,
      storageAreaId: 'fridge',
      createdAt: Date.now(),
      isOpened: false,
    };
    mockItemsApi.create.mockResolvedValue(newItem);

    const { result } = renderHook(() => usePantryStore());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const areaId = result.current.storageAreas[0].id;

    await act(async () => {
      await result.current.addItem('Milk', 2, areaId);
    });

    expect(mockItemsApi.create).toHaveBeenCalledWith({
      name: 'Milk',
      quantity: 2,
      storageAreaId: areaId,
      expiryDate: undefined,
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].name).toBe('Milk');
    expect(result.current.items[0].quantity).toBe(2);
  });

  it('updates item quantity', async () => {
    const existingItem = {
      id: 'item-1',
      name: 'Eggs',
      quantity: 6,
      storageAreaId: 'fridge',
      createdAt: Date.now(),
      isOpened: false,
    };
    mockItemsApi.getAll.mockResolvedValue([existingItem]);
    mockItemsApi.updateQuantity.mockResolvedValue({ ...existingItem, quantity: 12 });

    const { result } = renderHook(() => usePantryStore());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.items[0].quantity).toBe(6);

    await act(async () => {
      await result.current.updateItemQuantity('item-1', 12);
    });

    expect(mockItemsApi.updateQuantity).toHaveBeenCalledWith('item-1', 12);
    expect(result.current.items[0].quantity).toBe(12);
  });

  it('removes item when quantity reaches 0', async () => {
    const existingItem = {
      id: 'item-1',
      name: 'Juice',
      quantity: 2,
      storageAreaId: 'fridge',
      createdAt: Date.now(),
      isOpened: false,
    };
    mockItemsApi.getAll.mockResolvedValue([existingItem]);
    mockItemsApi.delete.mockResolvedValue(undefined);

    const { result } = renderHook(() => usePantryStore());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.updateItemQuantity('item-1', 0);
    });

    expect(mockItemsApi.delete).toHaveBeenCalledWith('item-1');
    expect(result.current.items).toHaveLength(0);
  });

  it('removes an item', async () => {
    const existingItem = {
      id: 'item-1',
      name: 'Apple',
      quantity: 3,
      storageAreaId: 'fridge',
      createdAt: Date.now(),
      isOpened: false,
    };
    mockItemsApi.getAll.mockResolvedValue([existingItem]);
    mockItemsApi.delete.mockResolvedValue(undefined);

    const { result } = renderHook(() => usePantryStore());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.removeItem('item-1');
    });

    expect(mockItemsApi.delete).toHaveBeenCalledWith('item-1');
    expect(result.current.items).toHaveLength(0);
  });

  it('filters items by area', async () => {
    const items = [
      { id: 'item-1', name: 'Milk', quantity: 1, storageAreaId: 'fridge', createdAt: Date.now(), isOpened: false },
      { id: 'item-2', name: 'Ice Cream', quantity: 1, storageAreaId: 'freezer', createdAt: Date.now(), isOpened: false },
    ];
    mockItemsApi.getAll.mockResolvedValue(items);

    const { result } = renderHook(() => usePantryStore());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const fridgeItems = result.current.getItemsForArea('fridge');
    expect(fridgeItems).toHaveLength(1);
    expect(fridgeItems[0].name).toBe('Milk');
  });

  it('reorders storage areas', async () => {
    const reversedAreas = [...DEFAULT_STORAGE_AREAS].reverse().map((a, idx) => ({ ...a, order: idx }));
    mockStorageAreasApi.reorder.mockResolvedValue(reversedAreas);

    const { result } = renderHook(() => usePantryStore());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const originalOrder = result.current.storageAreas.map((a) => a.id);
    const reversedOrder = [...originalOrder].reverse();

    await act(async () => {
      await result.current.reorderStorageAreas(reversedOrder);
    });

    expect(mockStorageAreasApi.reorder).toHaveBeenCalledWith(reversedOrder);
    expect(result.current.storageAreas.map((a) => a.id)).toEqual(reversedOrder);
  });

  it('opens all items when quantity matches', async () => {
    const existingItem = {
      id: 'item-1',
      name: 'Milk',
      quantity: 2,
      storageAreaId: 'fridge',
      createdAt: Date.now(),
      isOpened: false,
    };
    const openedItem = {
      ...existingItem,
      isOpened: true,
      openedAt: Date.now(),
    };
    mockItemsApi.getAll.mockResolvedValue([existingItem]);
    mockItemsApi.open.mockResolvedValue({ items: [openedItem] });

    const { result } = renderHook(() => usePantryStore());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.items[0].isOpened).toBe(false);

    await act(async () => {
      await result.current.openItem('item-1', 2);
    });

    expect(mockItemsApi.open).toHaveBeenCalledWith('item-1', 2);
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].isOpened).toBe(true);
    expect(result.current.items[0].openedAt).toBeDefined();
  });

  it('splits item when opening partial quantity', async () => {
    const existingItem = {
      id: 'item-1',
      name: 'Milk',
      quantity: 5,
      storageAreaId: 'fridge',
      createdAt: Date.now(),
      isOpened: false,
    };
    const remainingItem = { ...existingItem, quantity: 3 };
    const openedItem = {
      id: 'item-2',
      name: 'Milk',
      quantity: 2,
      storageAreaId: 'fridge',
      createdAt: existingItem.createdAt,
      isOpened: true,
      openedAt: Date.now(),
    };
    mockItemsApi.getAll.mockResolvedValue([existingItem]);
    mockItemsApi.open.mockResolvedValue({ items: [remainingItem, openedItem] });

    const { result } = renderHook(() => usePantryStore());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.openItem('item-1', 2);
    });

    expect(result.current.items).toHaveLength(2);

    const openedMilk = result.current.items.find((item) => item.isOpened);
    const unopenedMilk = result.current.items.find((item) => !item.isOpened);

    expect(openedMilk?.quantity).toBe(2);
    expect(openedMilk?.openedAt).toBeDefined();
    expect(unopenedMilk?.quantity).toBe(3);
  });
});
