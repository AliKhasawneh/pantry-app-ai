import { Router, Request, Response } from 'express';

const router = Router();

// TheMealDB API base URL
const MEALDB_API = 'https://www.themealdb.com/api/json/v1/1';

interface MealDBMeal {
  idMeal: string;
  strMeal: string;
  strMealThumb: string;
}

interface MealDBResponse {
  meals: MealDBMeal[] | null;
}

// GET /api/recipes/search?ingredient={ingredient} - Search recipes by ingredient
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { ingredient } = req.query;

    if (!ingredient || typeof ingredient !== 'string') {
      res.status(400).json({ error: 'Ingredient query parameter is required' });
      return;
    }

    const cleanIngredient = ingredient.trim().toLowerCase();
    
    const response = await fetch(
      `${MEALDB_API}/filter.php?i=${encodeURIComponent(cleanIngredient)}`
    );

    if (!response.ok) {
      throw new Error(`MealDB API error: ${response.status}`);
    }

    const data = (await response.json()) as MealDBResponse;

    // MealDB returns { meals: null } when no results found
    const meals = data.meals || [];

    res.json({
      ingredient: cleanIngredient,
      count: meals.length,
      meals: meals.map((meal) => ({
        id: meal.idMeal,
        name: meal.strMeal,
        thumbnail: meal.strMealThumb,
      })),
    });
  } catch (error) {
    console.error('Error searching recipes:', error);
    const message = error instanceof Error ? error.message : 'Failed to search recipes';
    res.status(500).json({ error: message });
  }
});

// POST /api/recipes/search - Search recipes by ingredient (POST version)
router.post('/search', async (req: Request, res: Response) => {
  try {
    const { ingredient } = req.body as { ingredient: string };

    if (!ingredient?.trim()) {
      res.status(400).json({ error: 'Ingredient is required' });
      return;
    }

    const cleanIngredient = ingredient.trim().toLowerCase();

    const response = await fetch(
      `${MEALDB_API}/filter.php?i=${encodeURIComponent(cleanIngredient)}`
    );

    if (!response.ok) {
      throw new Error(`MealDB API error: ${response.status}`);
    }

    const data = (await response.json()) as MealDBResponse;
    const meals = data.meals || [];

    res.json({
      ingredient: cleanIngredient,
      count: meals.length,
      meals: meals.map((meal) => ({
        id: meal.idMeal,
        name: meal.strMeal,
        thumbnail: meal.strMealThumb,
      })),
    });
  } catch (error) {
    console.error('Error searching recipes:', error);
    const message = error instanceof Error ? error.message : 'Failed to search recipes';
    res.status(500).json({ error: message });
  }
});

interface MealDBDetailResponse {
  meals: Array<Record<string, string>> | null;
}

// GET /api/recipes/:id - Get full recipe details by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const response = await fetch(`${MEALDB_API}/lookup.php?i=${id}`);

    if (!response.ok) {
      throw new Error(`MealDB API error: ${response.status}`);
    }

    const data = (await response.json()) as MealDBDetailResponse;

    if (!data.meals || data.meals.length === 0) {
      res.status(404).json({ error: 'Recipe not found' });
      return;
    }

    const meal = data.meals[0];

    // Extract ingredients and measurements
    const ingredients: Array<{ ingredient: string; measure: string }> = [];
    for (let i = 1; i <= 20; i++) {
      const ingredient = meal[`strIngredient${i}`];
      const measure = meal[`strMeasure${i}`];
      if (ingredient && ingredient.trim()) {
        ingredients.push({
          ingredient: ingredient.trim(),
          measure: measure?.trim() || '',
        });
      }
    }

    res.json({
      id: meal.idMeal,
      name: meal.strMeal,
      category: meal.strCategory,
      area: meal.strArea,
      instructions: meal.strInstructions,
      thumbnail: meal.strMealThumb,
      youtube: meal.strYoutube,
      ingredients,
    });
  } catch (error) {
    console.error('Error fetching recipe details:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch recipe';
    res.status(500).json({ error: message });
  }
});

export default router;

