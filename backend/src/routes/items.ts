import { Router, Request, Response } from 'express';
import { itemQueries, mapItem } from '../db';
import { PantryItem } from '../types';

const router = Router();

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// GET /api/items - Get all items
router.get('/', (_req: Request, res: Response) => {
  try {
    const rows = itemQueries.getAll.all();
    const items = rows.map((row) => mapItem(row));
    res.json(items);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// GET /api/items/area/:storageAreaId - Get items for a specific area
router.get('/area/:storageAreaId', (req: Request, res: Response) => {
  try {
    const rows = itemQueries.getByStorageArea.all(req.params.storageAreaId);
    const items = rows.map((row) => mapItem(row));
    res.json(items);
  } catch (error) {
    console.error('Error fetching items for area:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// GET /api/items/:id - Get single item
router.get('/:id', (req: Request, res: Response) => {
  try {
    const item = itemQueries.getById.get(req.params.id);
    if (!item) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    res.json(mapItem(item));
  } catch (error) {
    console.error('Error fetching item:', error);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

// POST /api/items - Create new item (with auto-merge for duplicates)
router.post('/', (req: Request, res: Response) => {
  try {
    const { name, quantity, storageAreaId, expiryDate } = req.body as {
      name: string;
      quantity: number;
      storageAreaId: string;
      expiryDate?: string;
    };

    const trimmedName = name?.trim();
    if (!trimmedName) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    if (!quantity || quantity < 1) {
      res.status(400).json({ error: 'Quantity must be at least 1' });
      return;
    }

    if (!storageAreaId) {
      res.status(400).json({ error: 'Storage area ID is required' });
      return;
    }

    // Check for existing mergeable item
    const existing = itemQueries.findMergeable.get({
      storageAreaId,
      name: trimmedName,
      expiryDate: expiryDate || null,
    });

    if (existing) {
      // Merge with existing item
      const existingItem = mapItem(existing);
      const newQuantity = existingItem.quantity + quantity;
      itemQueries.updateQuantity.run({ id: existingItem.id, quantity: newQuantity });
      
      const updated = itemQueries.getById.get(existingItem.id);
      res.json(mapItem(updated));
      return;
    }

    // Create new item
    const newItem: PantryItem = {
      id: generateId(),
      name: trimmedName,
      quantity,
      storageAreaId,
      createdAt: Date.now(),
      isOpened: false,
      expiryDate,
    };

    itemQueries.insert.run({
      ...newItem,
      isOpened: newItem.isOpened ? 1 : 0,
      openedAt: null,
    });

    res.status(201).json(newItem);
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// PUT /api/items/:id/quantity - Update item quantity
router.put('/:id/quantity', (req: Request, res: Response) => {
  try {
    const { quantity } = req.body as { quantity: number };
    const { id } = req.params;

    const existing = itemQueries.getById.get(id);
    if (!existing) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    if (quantity < 1) {
      // Delete item if quantity reaches 0
      itemQueries.delete.run(id);
      res.status(204).send();
      return;
    }

    itemQueries.updateQuantity.run({ id, quantity });
    
    const updated = itemQueries.getById.get(id);
    res.json(mapItem(updated));
  } catch (error) {
    console.error('Error updating item quantity:', error);
    res.status(500).json({ error: 'Failed to update item quantity' });
  }
});

// PUT /api/items/:id/open - Open item (with optional split)
router.put('/:id/open', (req: Request, res: Response) => {
  try {
    const { quantityToOpen } = req.body as { quantityToOpen: number };
    const { id } = req.params;

    const existing = itemQueries.getById.get(id);
    if (!existing) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    const item = mapItem(existing);

    // Calculate new expiry date (halve the days remaining, minimum 1 day)
    let newExpiryDate = item.expiryDate;
    if (item.expiryDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiry = new Date(item.expiryDate);
      const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (daysLeft > 1) {
        const newDaysLeft = Math.max(1, Math.floor(daysLeft / 2));
        const newExpiryTime = today.getTime() + newDaysLeft * 24 * 60 * 60 * 1000;
        newExpiryDate = new Date(newExpiryTime).toISOString().split('T')[0];
      }
    }

    // If opening all items, just mark the existing item as opened
    if (quantityToOpen >= item.quantity) {
      itemQueries.update.run({
        id,
        name: item.name,
        quantity: item.quantity,
        isOpened: 1,
        openedAt: Date.now(),
        expiryDate: newExpiryDate || null,
      });

      const updated = itemQueries.getById.get(id);
      res.json({ items: [mapItem(updated)] });
      return;
    }

    // Split the item: reduce quantity of unopened, create new opened item
    itemQueries.updateQuantity.run({ id, quantity: item.quantity - quantityToOpen });

    const openedItem: PantryItem = {
      id: generateId(),
      name: item.name,
      quantity: quantityToOpen,
      storageAreaId: item.storageAreaId,
      createdAt: item.createdAt,
      isOpened: true,
      openedAt: Date.now(),
      expiryDate: newExpiryDate,
    };

    itemQueries.insert.run({
      ...openedItem,
      isOpened: 1,
    });

    const updatedOriginal = itemQueries.getById.get(id);
    res.json({
      items: [
        mapItem(updatedOriginal),
        openedItem,
      ],
    });
  } catch (error) {
    console.error('Error opening item:', error);
    res.status(500).json({ error: 'Failed to open item' });
  }
});

// DELETE /api/items/:id - Delete item
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const existing = itemQueries.getById.get(req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    itemQueries.delete.run(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

export default router;

