import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePantryStore } from './usePantryStore';
import { DEFAULT_STORAGE_AREAS } from '../domain/types';

describe('usePantryStore', () => {
  it('initializes with default storage areas', () => {
    const { result } = renderHook(() => usePantryStore());

    expect(result.current.storageAreas).toEqual(DEFAULT_STORAGE_AREAS);
    expect(result.current.items).toHaveLength(0);
  });

  it('adds a new storage area', () => {
    const { result } = renderHook(() => usePantryStore());

    act(() => {
      result.current.addStorageArea('Basement', 'box', 'violet');
    });

    const newArea = result.current.storageAreas.find((a) => a.name === 'Basement');
    expect(newArea).toBeDefined();
    expect(newArea?.icon).toBe('box');
    expect(newArea?.color).toBe('violet');
  });

  it('deletes a storage area and its items', () => {
    const { result } = renderHook(() => usePantryStore());
    const areaId = result.current.storageAreas[0].id;

    act(() => {
      result.current.addItem('Milk', 2, areaId);
      result.current.deleteStorageArea(areaId);
    });

    expect(result.current.storageAreas.find((a) => a.id === areaId)).toBeUndefined();
    expect(result.current.items).toHaveLength(0);
  });

  it('adds an item to an area', () => {
    const { result } = renderHook(() => usePantryStore());
    const areaId = result.current.storageAreas[0].id;

    act(() => {
      result.current.addItem('Milk', 2, areaId);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].name).toBe('Milk');
    expect(result.current.items[0].quantity).toBe(2);
  });

  it('merges duplicate items in the same area', () => {
    const { result } = renderHook(() => usePantryStore());
    const areaId = result.current.storageAreas[0].id;

    act(() => {
      result.current.addItem('Milk', 2, areaId);
      result.current.addItem('milk', 3, areaId); // same item, different case
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(5);
  });

  it('updates item quantity', () => {
    const { result } = renderHook(() => usePantryStore());
    const areaId = result.current.storageAreas[0].id;

    act(() => {
      result.current.addItem('Eggs', 6, areaId);
    });

    const itemId = result.current.items[0].id;

    act(() => {
      result.current.updateItemQuantity(itemId, 12);
    });

    expect(result.current.items[0].quantity).toBe(12);
  });

  it('removes item when quantity reaches 0', () => {
    const { result } = renderHook(() => usePantryStore());
    const areaId = result.current.storageAreas[0].id;

    act(() => {
      result.current.addItem('Juice', 2, areaId);
    });

    const itemId = result.current.items[0].id;

    act(() => {
      result.current.updateItemQuantity(itemId, 0);
    });

    expect(result.current.items).toHaveLength(0);
  });

  it('removes an item', () => {
    const { result } = renderHook(() => usePantryStore());
    const areaId = result.current.storageAreas[0].id;

    act(() => {
      result.current.addItem('Apple', 3, areaId);
    });

    const itemId = result.current.items[0].id;

    act(() => {
      result.current.removeItem(itemId);
    });

    expect(result.current.items).toHaveLength(0);
  });

  it('filters items by area', () => {
    const { result } = renderHook(() => usePantryStore());
    const area1 = result.current.storageAreas[0].id;
    const area2 = result.current.storageAreas[1].id;

    act(() => {
      result.current.addItem('Milk', 1, area1);
      result.current.addItem('Ice Cream', 1, area2);
    });

    const area1Items = result.current.getItemsForArea(area1);
    expect(area1Items).toHaveLength(1);
    expect(area1Items[0].name).toBe('Milk');
  });
});
