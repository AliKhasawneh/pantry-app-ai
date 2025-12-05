import { Router, Request, Response } from 'express';
import { dislikedRecipeQueries, DislikedRecipe, getDislikedRecipeNames } from '../db';

const router = Router();

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// GET /api/disliked-recipes - Get all disliked recipes
router.get('/', (_req: Request, res: Response) => {
  try {
    const recipes = dislikedRecipeQueries.getAll.all() as DislikedRecipe[];
    res.json(recipes);
  } catch (error) {
    console.error('Error fetching disliked recipes:', error);
    res.status(500).json({ error: 'Failed to fetch disliked recipes' });
  }
});

// GET /api/disliked-recipes/names - Get just the names of disliked recipes
router.get('/names', (_req: Request, res: Response) => {
  try {
    const names = getDislikedRecipeNames();
    res.json({ names });
  } catch (error) {
    console.error('Error fetching disliked recipe names:', error);
    res.status(500).json({ error: 'Failed to fetch disliked recipe names' });
  }
});

// POST /api/disliked-recipes - Add a disliked recipe
router.post('/', (req: Request, res: Response) => {
  try {
    const { name } = req.body as { name: string };

    if (!name?.trim()) {
      res.status(400).json({ error: 'Recipe name is required' });
      return;
    }

    const trimmedName = name.trim();

    // Check if already disliked
    const existing = dislikedRecipeQueries.getByName.get(trimmedName);
    if (existing) {
      res.json(existing);
      return;
    }

    const newDisliked: DislikedRecipe = {
      id: generateId(),
      name: trimmedName,
      createdAt: Date.now(),
    };

    dislikedRecipeQueries.insert.run(newDisliked);
    res.status(201).json(newDisliked);
  } catch (error) {
    console.error('Error adding disliked recipe:', error);
    res.status(500).json({ error: 'Failed to add disliked recipe' });
  }
});

// DELETE /api/disliked-recipes/:name - Remove a disliked recipe
router.delete('/:name', (req: Request, res: Response) => {
  try {
    const { name } = req.params;

    dislikedRecipeQueries.delete.run(name);
    res.status(204).send();
  } catch (error) {
    console.error('Error removing disliked recipe:', error);
    res.status(500).json({ error: 'Failed to remove disliked recipe' });
  }
});

// POST /api/disliked-recipes/check - Check if a recipe is disliked
router.post('/check', (req: Request, res: Response) => {
  try {
    const { name } = req.body as { name: string };

    if (!name?.trim()) {
      res.status(400).json({ error: 'Recipe name is required' });
      return;
    }

    const existing = dislikedRecipeQueries.getByName.get(name.trim());
    res.json({ isDisliked: !!existing });
  } catch (error) {
    console.error('Error checking disliked recipe:', error);
    res.status(500).json({ error: 'Failed to check disliked recipe' });
  }
});

export default router;

