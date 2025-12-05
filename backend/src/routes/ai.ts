import { Router, Request, Response } from 'express';
import { 
  generateText, 
  suggestRecipes,
  filterIngredients,
  suggestFromRecipes,
  isMistralAvailable 
} from '../services/mistral';
import { getDislikedRecipeNames } from '../db';

const router = Router();

// GET /api/ai/status - Check if AI is available
router.get('/status', (_req: Request, res: Response) => {
  res.json({ 
    available: isMistralAvailable(),
    provider: 'mistral',
    message: isMistralAvailable() 
      ? 'Mistral AI is configured and ready' 
      : 'Mistral API key not configured'
  });
});

// POST /api/ai/generate - Generate text from a prompt
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body as { prompt: string };

    if (!prompt?.trim()) {
      res.status(400).json({ error: 'Prompt is required' });
      return;
    }

    const result = await generateText(prompt);
    res.json({ result });
  } catch (error) {
    console.error('Error generating text:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate text';
    res.status(500).json({ error: message });
  }
});

// POST /api/ai/recipes - Suggest recipes based on pantry items
router.post('/recipes', async (req: Request, res: Response) => {
  try {
    const { items } = req.body as { items: string[] };

    if (!Array.isArray(items)) {
      res.status(400).json({ error: 'Items must be an array of strings' });
      return;
    }

    const recipes = await suggestRecipes(items);
    res.json({ recipes });
  } catch (error) {
    console.error('Error suggesting recipes:', error);
    const message = error instanceof Error ? error.message : 'Failed to suggest recipes';
    res.status(500).json({ error: message });
  }
});

// POST /api/ai/filter-ingredients - Filter pantry items to find best main ingredient
router.post('/filter-ingredients', async (req: Request, res: Response) => {
  try {
    const { items } = req.body as { items: string[] };

    if (!Array.isArray(items)) {
      res.status(400).json({ error: 'Items must be an array of strings' });
      return;
    }

    if (items.length === 0) {
      res.status(400).json({ error: 'Items array cannot be empty' });
      return;
    }

    const result = await filterIngredients(items);
    res.json({ result: result.trim() });
  } catch (error) {
    console.error('Error filtering ingredients:', error);
    const message = error instanceof Error ? error.message : 'Failed to filter ingredients';
    res.status(500).json({ error: message });
  }
});

// POST /api/ai/suggest-from-recipes - AI chooses from MealDB recipes
router.post('/suggest-from-recipes', async (req: Request, res: Response) => {
  try {
    const { recipes, pantryItems } = req.body as { 
      recipes: string[]; 
      pantryItems: string[];
    };

    if (!Array.isArray(recipes) || recipes.length === 0) {
      res.status(400).json({ error: 'Recipes array is required and cannot be empty' });
      return;
    }

    if (!Array.isArray(pantryItems)) {
      res.status(400).json({ error: 'Pantry items must be an array' });
      return;
    }

    // Get disliked recipes to filter them out
    const dislikedNames = getDislikedRecipeNames();
    
    // Filter out disliked recipes before sending to AI
    const filteredRecipes = recipes.filter(
      recipeName => !dislikedNames.includes(recipeName.toLowerCase())
    );

    if (filteredRecipes.length === 0) {
      res.json({ recipes: [] });
      return;
    }

    const suggestedRecipes = await suggestFromRecipes(filteredRecipes, pantryItems, dislikedNames);
    res.json({ recipes: suggestedRecipes });
  } catch (error) {
    console.error('Error suggesting from recipes:', error);
    const message = error instanceof Error ? error.message : 'Failed to suggest from recipes';
    res.status(500).json({ error: message });
  }
});



export default router;
