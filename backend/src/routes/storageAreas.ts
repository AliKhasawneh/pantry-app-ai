import { Router, Request, Response } from 'express';
import { storageAreaQueries, itemQueries, reorderAreas, mapStorageArea } from '../db';
import { StorageArea, AreaColor, AreaIcon } from '../types';

const router = Router();

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// GET /api/storage-areas - Get all storage areas
router.get('/', (_req: Request, res: Response) => {
  try {
    const rows = storageAreaQueries.getAll.all();
    const areas = rows.map((row) => mapStorageArea(row));
    res.json(areas);
  } catch (error) {
    console.error('Error fetching storage areas:', error);
    res.status(500).json({ error: 'Failed to fetch storage areas' });
  }
});

// GET /api/storage-areas/:id - Get single storage area
router.get('/:id', (req: Request, res: Response) => {
  try {
    const area = storageAreaQueries.getById.get(req.params.id);
    if (!area) {
      res.status(404).json({ error: 'Storage area not found' });
      return;
    }
    res.json(mapStorageArea(area));
  } catch (error) {
    console.error('Error fetching storage area:', error);
    res.status(500).json({ error: 'Failed to fetch storage area' });
  }
});

// POST /api/storage-areas - Create new storage area
router.post('/', (req: Request, res: Response) => {
  try {
    const { name, icon, color } = req.body as {
      name: string;
      icon: AreaIcon;
      color: AreaColor;
    };

    if (!name?.trim()) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const maxOrderResult = storageAreaQueries.getMaxOrder.get() as { maxOrder: number | null };
    const order = (maxOrderResult.maxOrder ?? -1) + 1;

    const newArea: StorageArea = {
      id: generateId(),
      name: name.trim(),
      icon,
      color,
      order,
    };

    storageAreaQueries.insert.run(newArea);
    res.status(201).json(newArea);
  } catch (error) {
    console.error('Error creating storage area:', error);
    res.status(500).json({ error: 'Failed to create storage area' });
  }
});

// PUT /api/storage-areas/:id - Update storage area
router.put('/:id', (req: Request, res: Response) => {
  try {
    const existing = storageAreaQueries.getById.get(req.params.id) as StorageArea | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Storage area not found' });
      return;
    }

    const { name, icon, color, order } = req.body as Partial<StorageArea>;

    const updated: StorageArea = {
      id: req.params.id,
      name: name?.trim() || existing.name,
      icon: icon || existing.icon,
      color: color || existing.color,
      order: order ?? existing.order,
    };

    storageAreaQueries.update.run(updated);
    res.json(updated);
  } catch (error) {
    console.error('Error updating storage area:', error);
    res.status(500).json({ error: 'Failed to update storage area' });
  }
});

// DELETE /api/storage-areas/:id - Delete storage area and its items
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const existing = storageAreaQueries.getById.get(req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Storage area not found' });
      return;
    }

    // Delete items in this area first
    itemQueries.deleteByStorageArea.run(req.params.id);
    storageAreaQueries.delete.run(req.params.id);

    // Reorder remaining areas to fill gaps
    const remaining = storageAreaQueries.getAll.all() as StorageArea[];
    const ids = remaining.map(a => a.id);
    if (ids.length > 0) {
      reorderAreas(ids);
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting storage area:', error);
    res.status(500).json({ error: 'Failed to delete storage area' });
  }
});

// PUT /api/storage-areas/reorder - Reorder storage areas
router.put('/reorder/batch', (req: Request, res: Response) => {
  try {
    const { ids } = req.body as { ids: string[] };

    if (!Array.isArray(ids)) {
      res.status(400).json({ error: 'ids must be an array' });
      return;
    }

    reorderAreas(ids);

    const rows = storageAreaQueries.getAll.all();
    const areas = rows.map((row) => mapStorageArea(row));
    res.json(areas);
  } catch (error) {
    console.error('Error reordering storage areas:', error);
    res.status(500).json({ error: 'Failed to reorder storage areas' });
  }
});

export default router;

